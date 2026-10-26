/**
 * Vocab Vault — SM-2 SRS Algorithm & Mobile Review Module (js/anki.js)
 * ステップ5: スワイプUI、オフライン復習キュー管理
 */
(function (global) {
  'use strict';

  const OFFLINE_QUEUE_KEY = 'vv_offline_review_queue';
  const REVIEW_HISTORY_KEY = 'vv_review_history_log';
  const MAX_REVIEW_HISTORY = 500;
  const FSRS_WEIGHTS_KEY = 'vv_user_fsrs_weights';
  const SMART_NOTIFY_KEY = 'vv_smart_notify_enabled';
  const LAST_NOTIFY_KEY = 'vv_last_notify_ts';

  const MAX_INTERVAL_DAYS = 3650; // 最大復習間隔（10年）
  const STABILITY_ANCHOR_R = 0.90; // 安定度 S の定義アンカー (t = S のとき R ≡ 0.90)
  const REQUEST_RETENTION = 0.90;  // 目標定着率: 90%
  const DECAY = -0.5; // FSRS忘却曲線標準減衰率
  const FACTOR = 19 / 81; // R(t) = (1 + FACTOR * t / S)^DECAY (DECAY=-0.5時の基準値)

  /**
   * [FSRS デフォルト重み係数 (Version 2)]
   */
  const DEFAULT_FSRS_WEIGHTS = {
    version: 2,       // スキーマバージョン
    w0: 0.4,          // Lapse 初回安定度
    w1: 0.9,          // Hard 初回
    w2: 2.5,          // Good 初回
    w3: 5.0,          // Easy 初回
    sScale: 1.0,      // 安定度スケーリング
    decayFactor: -0.5,// 忘却減衰指数 (負の値: -0.7 〜 -0.3)
    wHard: 0.8,       // Hard時乗数
    wGood: 1.2,       // Good時乗数
    wEasy: 1.6        // Easy時乗数
  };

  /**
   * 安定度 S のアンカー (R(S) === STABILITY_ANCHOR_R) を厳密保証する動的FACTOR算出
   */
  function getDynamicFactor(decay) {
    const d = (typeof decay === 'number' && Number.isFinite(decay) && decay < 0) ? decay : -0.5;
    return Math.pow(STABILITY_ANCHOR_R, 1 / d) - 1;
  }

  /**
   * ユーザー固有のFSRS重みを取得・保存・リセット（旧スキーマ自動移行対応）
   */
  function getUserFSRSWeights() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(FSRS_WEIGHTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const res = Object.assign({}, DEFAULT_FSRS_WEIGHTS, parsed);
            // 旧スキーマ移行: version < 2 または decayFactor > 0 の旧データを負の指数値へ安全変換
            if (!res.version || res.version < 2 || res.decayFactor > 0) {
              const oldDecay = Number(res.decayFactor);
              res.decayFactor = (oldDecay > 0) ? DECAY * Math.max(0.6, Math.min(1.8, oldDecay)) : -0.5;
              if (res.decayFactor >= 0) res.decayFactor = -0.5;
              res.version = 2;
            }
            // [P2-⑤] 読み込み時に必ず有効範囲へクランプ（手動改ざん/破損データ防御）
            res.decayFactor = Math.max(-0.7, Math.min(-0.3, Number(res.decayFactor) || -0.5));
            res.sScale = Math.max(0.6, Math.min(1.8, Number(res.sScale) || 1.0));
            res.wHard = Math.max(0.5, Math.min(1.8, Number(res.wHard) || 0.8));
            res.wGood = Math.max(1.0, Math.min(2.5, Number(res.wGood) || 1.2));
            res.wEasy = Math.max(1.3, Math.min(3.5, Number(res.wEasy) || 1.6));
            return res;
          }
        }
      }
    } catch {}
    return null;
  }

  function setUserFSRSWeights(weights) {
    try {
      if (typeof localStorage !== 'undefined') {
        if (!weights) {
          localStorage.removeItem(FSRS_WEIGHTS_KEY);
        } else {
          const toSave = Object.assign({ version: 2 }, weights);
          localStorage.setItem(FSRS_WEIGHTS_KEY, JSON.stringify(toSave));
        }
      }
    } catch {}
  }

  function resetUserFSRSWeights() {
    setUserFSRSWeights(null);
  }

  /**
   * 復習履歴ログの取得・保存 (直近500件ローリング)
   */
  let _cachedReviewHistory = null;

  function getReviewHistoryLog() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(REVIEW_HISTORY_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            _cachedReviewHistory = arr;
            return [...arr];
          }
        }
      }
    } catch {}
    if (Array.isArray(_cachedReviewHistory)) {
      return [..._cachedReviewHistory];
    }
    return [];
  }

  // iOS Safariの7日間パージ対策: IndexedDBからの復習履歴復旧
  async function recoverReviewHistoryFromIdb() {
    try {
      const cur = getReviewHistoryLog();
      if (!cur.length && global.VocabStorage?.idbGet) {
        const idbLogs = await global.VocabStorage.idbGet(REVIEW_HISTORY_KEY);
        if (Array.isArray(idbLogs) && idbLogs.length > 0) {
          _cachedReviewHistory = idbLogs;
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(idbLogs));
            }
          } catch {}
        }
      }
    } catch {}
  }

  function saveReviewHistoryLog(logs) {
    const capped = Array.isArray(logs) ? logs.slice(-MAX_REVIEW_HISTORY) : [];
    _cachedReviewHistory = capped;

    // LocalStorage と IndexedDB を独立して保存（片方の容量超過や例外が他方をブロックしない）
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(capped));
      }
    } catch (e) {
      console.warn('[SRS] LocalStorage saveReviewHistoryLog failed, relying on IndexedDB:', e);
    }

    try {
      if (global.VocabStorage?.idbPut) {
        global.VocabStorage.idbPut(REVIEW_HISTORY_KEY, capped);
      }
    } catch (e) {
      console.warn('[SRS] IndexedDB saveReviewHistoryLog failed:', e);
    }
  }

  let _isOptimizing = false;

  function recordReviewHistory(record) {
    if (!record || typeof record !== 'object') return;
    const history = getReviewHistoryLog();
    const item = {
      id: record.id || '',
      word: record.word || '',
      lang: record.lang || '',
      rating: Number.isFinite(Number(record.rating)) ? Number(record.rating) : 0,
      lastInterval: Number(record.lastInterval || 0),
      lastStability: Number(record.lastStability || 1.0),
      lastDifficulty: Number(record.lastDifficulty || 5.0),
      elapsedDays: Number(record.elapsedDays || 0),
      retrievability: Number(record.retrievability || 1.0),
      timestamp: Number(record.timestamp) || Date.now()
    };
    history.push(item);
    const capped = history.length > MAX_REVIEW_HISTORY ? history.slice(-MAX_REVIEW_HISTORY) : history;
    saveReviewHistoryLog(capped);

    // ログが一定件数以上のとき、直近最適化からの増分（10件ごと）でマイクロ最適化を安全に発火（500件到達後の常時発火バグを解消）
    try {
      const TOTAL_REVIEWS_KEY = 'vv_total_reviews_count';
      const LAST_OPT_COUNT_KEY = 'vv_fsrs_last_opt_count';
      const storedTotal = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(TOTAL_REVIEWS_KEY)) : 0;
      const currentTotal = (Number.isFinite(storedTotal) && storedTotal > 0 ? storedTotal : capped.length) + 1;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOTAL_REVIEWS_KEY, String(currentTotal));
      }
      const lastOptCount = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(LAST_OPT_COUNT_KEY) || 0) : 0;

      if (capped.length >= 20 && (currentTotal - lastOptCount) >= 10 && !_isOptimizing) {
        _isOptimizing = true;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LAST_OPT_COUNT_KEY, String(currentTotal));
        }
        const runOpt = () => {
          try {
            optimizeFSRSWeights(capped);
          } finally {
            _isOptimizing = false;
          }
        };
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(runOpt, { timeout: 2000 });
        } else if (typeof setTimeout === 'function') {
          setTimeout(runOpt, 500);
        } else {
          _isOptimizing = false;
        }
      }
    } catch {}
  }

  function clearReviewHistoryLog() {
    _cachedReviewHistory = [];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(REVIEW_HISTORY_KEY);
      }
    } catch {}
    try {
      if (global.VocabStorage?.idbPut) {
        global.VocabStorage.idbPut(REVIEW_HISTORY_KEY, []);
      }
    } catch {}
  }

  /**
   * [認知アンカーボーナス]
   * 印欧祖語(PIE)語根ネットワークに接続された単語は、深層意味記憶（Semantic Network）の
   * 結びつきにより記憶の干渉が抑制され、忘却曲線の減衰が緩やかになる現象を数理モデル化。
   */
  function getEtymologyAnchorBonus(e) {
    if (!e) return 1.0;
    const tags = Array.isArray(e.etymologyTags)
      ? e.etymologyTags
      : (typeof e.etymologyTags === 'string' ? e.etymologyTags.split(',').map(s => s.trim()).filter(Boolean) : []);
    const tagCount = tags.length;
    if (tagCount >= 3) return 1.25; // 3語根以上の密な網状結合: 安定度25%ブースト
    if (tagCount === 2) return 1.15; // 2語根の結合: 安定度15%ブースト
    if (tagCount === 1) return 1.08; // 1語根アンカー: 安定度8%ブースト
    return 1.0;
  }

  /**
   * 現在時刻における記憶保持確率 (Retrievability R) を算出 (0.0〜1.0)
   * FSRS数学的恒等式: t = S のとき R(S) ≡ STABILITY_ANCHOR_R (0.90) を動的FACTOR再計算により厳密保証
   */
  function getRetrievability(e, now = Date.now(), customWeights = null) {
    if (!e) return 1.0;
    // [P1-2 解決] 未学習カード（一度も復習しておらずインターバルも復習日時もない）は想起率0.0
    const isUnlearned = !e.interval && !e.repetition && !e.reviewUpdatedAt;
    if (isUnlearned || (!e.interval && !e.repetition && !e.stability)) return 0.0;

    const weights = customWeights || getUserFSRSWeights() || DEFAULT_FSRS_WEIGHTS;
    const nowTs = Number.isFinite(Number(now)) ? Number(now) : Date.now();

    // 忘却直後（Again後: interval=0）で stability が未設定の場合のみ初期値に sScale を適用
    const sScale = (Number.isFinite(Number(weights?.sScale)) && Number(weights.sScale) > 0) ? Number(weights.sScale) : 1.0;
    const hasExplicitStability = Number.isFinite(Number(e.stability)) && Number(e.stability) > 0;
    const rawS = hasExplicitStability
      ? Number(e.stability)
      : ((Number(e.interval) || Number(weights?.w0) || 0.4) * sScale);
    const s = Math.max(0.1, rawS);

    const effInterval = Number(e.interval) || s;
    const rawLast = Number(e.reviewUpdatedAt || (e.nextReview ? (e.nextReview - effInterval * 86400000) : nowTs));
    // 初期エントリで nextReview が小さい場合、負の lastReview になり elapsedDays が異常値になるのを防ぐ
    const lastReview = (Number.isFinite(rawLast) && rawLast > 0) ? rawLast : nowTs;
    const elapsedDays = Math.max(0, (nowTs - lastReview) / 86400000);

    // 減衰指数の安全取得とクランプ (負の値: -0.7 〜 -0.3 を厳守)
    let decay = Number(weights?.decayFactor);
    if (!Number.isFinite(decay) || decay >= 0) decay = -0.5;
    decay = Math.max(-0.7, Math.min(-0.3, decay));

    const dynamicFactor = getDynamicFactor(decay);
    const r = Math.pow(1 + dynamicFactor * (elapsedDays / s), decay);
    return Number.isFinite(r) ? Math.max(0.0, Math.min(1.0, r)) : 1.0;
  }

  /**
   * FSRS-4.5 安定度 (Stability S) 予測算出
   * 記憶定着率 R=0.90 を維持できる日数を数理モデル化（個人適応重み対応）
   */
  function predStability(e, rating, customWeights = null, atTimestamp = null, priorR = null) {
    const weights = customWeights || getUserFSRSWeights() || DEFAULT_FSRS_WEIGHTS;
    const rawS = Number(e?.stability) || Number(e?.interval) || 1.0;
    const s = Number.isFinite(rawS) && rawS > 0 ? Math.max(0.1, rawS) : 1.0;
    const rawD = Number(e?.difficulty);
    const d = Number.isFinite(rawD) ? Math.max(1.0, Math.min(10.0, rawD)) : 5.0;
    const anchorBonus = Number.isFinite(getEtymologyAnchorBonus(e)) ? getEtymologyAnchorBonus(e) : 1.0;
    const sScale = (Number.isFinite(Number(weights?.sScale)) && Number(weights.sScale) > 0) ? Number(weights.sScale) : 1.0;

    if (rating === 0) {
      const lapseS = Math.max(0.2, s * 0.3 * sScale);
      const initW0 = (Number(weights?.w0) || 0.4) * sScale;
      return Math.min(initW0, lapseS);
    }

    // 初回学習（未学習カード）判定: 各評価に応じた初期重みを適用
    const isFirstTime = !e?.repetition && !e?.stability && !e?.interval;
    if (isFirstTime) {
      if (rating === 1) return (Number(weights?.w1) || 0.9) * sScale * anchorBonus;
      if (rating === 2) return (Number(weights?.w2) || 2.5) * sScale * anchorBonus;
      return (Number(weights?.w3) || 5.0) * sScale * anchorBonus;
    }

    // [P1-1 解決] 想起率 R に基づく変調因子の適用（復習直後 R≒1.0 の過剰連打による安定度急増を防止）
    // 過去履歴の評価時は渡された priorR または atTimestamp を用いて過去時点の想起率を正確に再計算
    let r;
    if (Number.isFinite(Number(priorR))) {
      r = Math.max(0.0, Math.min(1.0, Number(priorR)));
    } else {
      const evalTime = Number.isFinite(Number(atTimestamp)) ? Number(atTimestamp) : Date.now();
      r = getRetrievability(e, evalTime, weights);
    }

    let nextS = s;
    if (rating === 1) { // Hard (難しい): 想起率変調因子を適用しつつ微増
      const wHard = (Number.isFinite(Number(weights?.wHard)) && Number(weights.wHard) > 0) ? Number(weights.wHard) : 0.8;
      const hardRMod = Math.max(0.1, 1 - r * 0.6);
      const hardGain = Math.max(0.05, (0.25 - 0.015 * d) * wHard * anchorBonus * hardRMod);
      nextS = s * (1 + hardGain);
    } else if (rating === 2) { // Good (普通): 想起率変調因子を適用
      const wGood = (Number.isFinite(Number(weights?.wGood)) && Number(weights.wGood) > 0) ? Number(weights.wGood) : 1.2;
      const rMod = Math.max(0.15, Math.exp((1 - r) * 0.8) - 0.85);
      const gain = Math.exp(1.1) * Math.pow(d, -0.4) * Math.pow(s, -0.15) * wGood * anchorBonus * rMod;
      nextS = s * (1 + Math.max(0.1, gain));
    } else { // Easy (簡単): 想起率変調因子を適用
      const wEasy = (Number.isFinite(Number(weights?.wEasy)) && Number(weights.wEasy) > 0) ? Number(weights.wEasy) : 1.6;
      const rModEasy = Math.max(0.2, Math.exp((1 - r) * 1.0) - 0.75);
      const gain = Math.exp(1.4) * Math.pow(d, -0.4) * Math.pow(s, -0.15) * wEasy * anchorBonus * rModEasy;
      nextS = s * (1 + Math.max(0.3, gain));
    }

    if (!Number.isFinite(nextS) || nextS <= 0) nextS = 1.0;
    return Math.min(36500, Math.max(0.1, nextS));
  }

  /**
   * FSRS-4.5 & SM-2 ハイブリッド復習間隔予測
   */
  function predDays(e, rating) {
    if (rating === 0) { // Again (もう一度)
      return 0; // 即時・1分後
    }
    const weights = getUserFSRSWeights() || DEFAULT_FSRS_WEIGHTS;
    const nextS = predStability(e, rating, weights);
    let userDecay = Number(weights?.decayFactor);
    if (!Number.isFinite(userDecay) || userDecay >= 0) userDecay = -0.5;
    userDecay = Math.max(-0.7, Math.min(-0.3, userDecay));

    const userFactor = getDynamicFactor(userDecay);
    // 希望保持率 REQUEST_RETENTION に基づく復習間隔: R(I) = REQUEST_RETENTION
    const reqFactor = Math.pow(REQUEST_RETENTION, 1 / userDecay) - 1;
    const intervalDays = userFactor > 0 ? (nextS / userFactor) * reqFactor : nextS;
    const finalDays = Number.isFinite(intervalDays) ? intervalDays : nextS;
    return Math.max(1, Math.min(MAX_INTERVAL_DAYS, finalDays));
  }

  /**
   * 4つの評価ボタンごとの次回日数予測プレビュー
   */
  function predictIntervals(e, targetLocale = null) {
    const tL = targetLocale || e?.tgtLang || global.App?.tgtLang || global.VocabI18n?.getLocale?.() || 'ja';
    return [0, 1, 2, 3].map(r => {
      const days = predDays(e, r);
      if (tL === 'ja') {
        if (days === 0) return '1分後';
        if (days < 1) return `${Math.round(days * 24)}時間後`;
        if (days < 30) return `${Math.round(days)}日後`;
        if (days < 365) return `${(days / 30).toFixed(1)}ヶ月後`;
        return `${(days / 365).toFixed(1)}年後`;
      }
      if (days === 0) return '1m';
      if (days < 1) return `${Math.round(days * 24)}h`;
      if (days < 30) return `${Math.round(days)}d`;
      if (days < 365) return `${(days / 30).toFixed(1)}mo`;
      return `${(days / 365).toFixed(1)}y`;
    });
  }

  /**
   * 次回学習スケジュールおよび FSRS 状態パラメータの確定計算
   */
  function calculateNextReview(e, rating) {
    const now = Date.now();
    let nextInterval = 0;
    let nextRepetition = (Number.isFinite(Number(e?.repetition)) && Number(e.repetition) >= 0) ? Number(e.repetition) : 0;
    let nextEfactor = (Number.isFinite(Number(e?.efactor)) && Number(e.efactor) >= 1.3) ? Number(e.efactor) : 2.5;
    let curDifficulty = (Number.isFinite(Number(e?.difficulty)) && Number(e.difficulty) >= 1.0) ? Number(e.difficulty) : 5.0;
    const rawS = Number(e?.stability) || Number(e?.interval) || 1.0;
    const priorStability = (Number.isFinite(rawS) && rawS > 0) ? rawS : 1.0;
    let curStability = priorStability;
    let nextReviewDate = now;

    // 復習直前の想起率 R を評価
    const priorR = getRetrievability(e, now);

    // Difficulty D 更新 (1〜10)
    const diffDelta = rating === 0 ? 1.2 : rating === 1 ? 0.6 : rating === 2 ? -0.2 : -0.8;
    const nextDifficulty = Math.max(1.0, Math.min(10.0, Number((curDifficulty + diffDelta).toFixed(2))));

    // 項目22: Leech（難語・忘却多発）の追跡（カードの難易度 Difficulty に応じた動的閾値）
    let curLapses = Number(e?.lapses || 0);
    if (rating === 0) {
      curLapses++;
    }
    const leechThreshold = curDifficulty >= 8.0 ? 3 : (curDifficulty >= 5.0 ? 4 : 5);
    const isLeech = curLapses >= leechThreshold;
    const flags = Array.isArray(e?.flags) ? [...e.flags] : [];
    if (isLeech && !flags.includes('leech')) {
      flags.push('leech');
    }

    if (rating === 0) {
      // 項目21: 忘却時 — 即座に同セッション内短期リラーニングキュー（1分後）へ
      nextRepetition = 0;
      nextInterval = 0;
      curStability = Number(predStability(e, 0).toFixed(2));
      nextReviewDate = now + 60000; // 1分後
    } else {
      const pureStability = predStability(e, rating);
      curStability = Number(pureStability.toFixed(2));
      const computedDays = predDays(e, rating);
      nextInterval = Number(Math.min(MAX_INTERVAL_DAYS, Math.max(1.0, computedDays)).toFixed(2));

      // SM-2 互換パラメータの同期
      nextEfactor = Math.max(1.3, Math.min(3.5, nextEfactor + (rating === 1 ? -0.15 : rating === 3 ? 0.15 : 0)));
      if (rating >= 2) nextRepetition++;
      nextReviewDate = now + Math.round(nextInterval * 86400000);
    }

    if (!Number.isFinite(nextReviewDate)) nextReviewDate = now + 86400000;

    const currentR = getRetrievability({ ...e, stability: curStability, interval: nextInterval, repetition: nextRepetition, reviewUpdatedAt: now, nextReview: nextReviewDate }, now);

    // 復習直前の状態（prior stability, prior retrievability, elapsed days）をログに自動記録
    const prevLastReview = Number(e?.reviewUpdatedAt || (e?.nextReview && e?.interval ? e.nextReview - e.interval * 86400000 : now));
    const elapsedDays = Math.max(0, (now - (Number.isFinite(prevLastReview) ? prevLastReview : now)) / 86400000);
    recordReviewHistory({
      id: e?.id || '',
      word: e?.word || '',
      lang: e?.lang || '',
      rating,
      lastInterval: Number(e?.interval || 0),
      lastStability: Number(priorStability.toFixed(2)),
      lastDifficulty: Number(curDifficulty.toFixed(2)),
      elapsedDays: Number(elapsedDays.toFixed(2)),
      retrievability: Number((Number.isFinite(priorR) ? priorR : 1.0).toFixed(3)),
      timestamp: now
    });

    return {
      interval: nextInterval,
      repetition: nextRepetition,
      efactor: nextEfactor,
      stability: curStability,
      difficulty: nextDifficulty,
      lapses: curLapses,
      flags,
      retrievability: Number((Number.isFinite(currentR) ? currentR : 1.0).toFixed(3)),
      nextReview: nextReviewDate,
      version: (Number.isInteger(Number(e?.version)) && Number(e.version) > 0) ? Number(e.version) : 1,
      updatedAt: Number(e?.updatedAt) || now,
      reviewUpdatedAt: now
    };
  }

  /**
   * 復習ログを遷移ペアと単発ログに厳密分類（二重計上の完全排除 & 非有限値サニタイズ）
   */
  function prepareEvaluatableLogs(logs) {
    if (!Array.isArray(logs) || !logs.length) return { transitions: [], singles: [], validLogs: [], validCount: 0 };

    // 破損データ・非有限値の完全防御（timestamp 欠損時はインデックス基準で安全補完）
    const validLogs = [];
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      if (!l || typeof l !== 'object') continue;
      const rating = Number(l.rating);
      if (!Number.isFinite(rating)) continue;
      const rawTs = Number(l.timestamp);
      const ts = Number.isFinite(rawTs) ? rawTs : (1000000 + i * 86400000);
      validLogs.push(Object.assign({}, l, { timestamp: ts, rating }));
    }

    const sorted = validLogs.slice().sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    const cardHistory = new Map();
    const transitions = [];
    const usedAsNext = new Set();

    for (let i = 0; i < sorted.length; i++) {
      const l = sorted[i];
      const cardKey = (l.lang ? l.lang + ':' : '') + (l.id || l.word);
      if (cardKey && cardHistory.has(cardKey)) {
        const prev = cardHistory.get(cardKey);
        transitions.push({ prev, curr: l });
        usedAsNext.add(l);
      }
      if (cardKey) cardHistory.set(cardKey, l);
    }

    // 単発ログ: 遷移ペアの curr (next) になっていないログ（各カードの初回ログ等）のみに限定（二重計上排除）
    const singles = sorted.filter(l => !usedAsNext.has(l));

    return { transitions, singles, validLogs: sorted, validCount: sorted.length };
  }

  /**
   * 純粋な Brier 予測スコア（ペナルティなしの真の二乗予測誤差 MSE）
   */
  function evaluatePureBrier(logs, weights, precomputed = null) {
    const { transitions, singles } = precomputed || prepareEvaluatableLogs(logs);
    if (!transitions.length && !singles.length) return 0.25;

    let decay = Number(weights?.decayFactor);
    if (!Number.isFinite(decay) || decay >= 0) decay = -0.5;
    decay = Math.max(-0.7, Math.min(-0.3, decay));
    const dynamicFactor = getDynamicFactor(decay);
    const sScale = (Number.isFinite(Number(weights?.sScale)) && Number(weights.sScale) > 0) ? Number(weights.sScale) : 1.0;

    let totalError = 0;
    let evalCount = 0;

    // 1. 遷移ペア評価: 前回評価 (prev.rating) で更新された安定度 S を予測し、
    // 経過日数後の今回の想起率 R をシミュレートして、今回の実測 (curr.rating >= 1 ? 1 : 0) と突合
    for (let i = 0; i < transitions.length; i++) {
      const { prev, curr } = transitions[i];
      const elapsedDays = (Number(curr.timestamp) - Number(prev.timestamp)) / 86400000;
      // [P1-5 解決] 同日・短時間（4.8時間未満）の再学習は短期記憶ノイズと勾配消失を招くため長期忘却モデルの評価から除外
      if (!Number.isFinite(elapsedDays) || elapsedDays < 0.2) continue;

      const prevTs = Number(prev.timestamp) || Date.now();
      const prevElapsed = Number(prev.elapsedDays || 0);
      const simulatedPrevEntry = {
        stability: Number(prev.lastStability ?? 1.0),
        difficulty: Number(prev.lastDifficulty ?? 5.0),
        interval: Number(prev.lastInterval ?? 1.0),
        repetition: 1,
        reviewUpdatedAt: prevTs - Math.round(prevElapsed * 86400000),
        nextReview: prevTs
      };
      // ラベル漏洩完全排除: next.rating ではなく前回の復習評価 prev.rating で安定度を推計
      // 過去復習時点の想起率 R を正確に反映するため prevTs と prev.retrievability を供給
      const prevR = Number.isFinite(Number(prev.retrievability)) ? Number(prev.retrievability) : null;
      const nextS = predStability(simulatedPrevEntry, prev.rating, weights, prevTs, prevR);
      const r = Math.pow(1 + dynamicFactor * (elapsedDays / (nextS > 0 ? nextS : 1.0)), decay);
      const clampedR = Number.isFinite(r) ? Math.max(0.01, Math.min(0.99, r)) : 0.9;
      const actual = curr.rating >= 1 ? 1.0 : 0.0;
      const err = actual - clampedR;

      totalError += err * err;
      evalCount += 1.0;
    }

    // 2. 単発ログ評価: 事前安定度 lastStability * sScale と経過日数に対する実測成否を突合
    for (let i = 0; i < singles.length; i++) {
      const l = singles[i];
      // [P1-1 解決] 未学習状態・初回忘却直後（lastInterval <= 0 または非有限値）を除外
      if (!Number.isFinite(Number(l.lastInterval)) || Number(l.lastInterval) <= 0) continue;
      const rawElapsed = l.elapsedDays ?? l.lastInterval ?? 1.0;
      const elapsedDays = Number.isFinite(Number(rawElapsed)) ? Number(rawElapsed) : 1.0;
      // [P1-5 解決] 同日短期ログのノイズ除外
      if (elapsedDays < 0.2) continue;

      const actual = l.rating >= 1 ? 1.0 : 0.0;
      // [P2-⑧ 解決] l.lastStability は算出時点で既に sScale が適用されているため二重適用を防止
      const rawS = Number(l.lastStability) > 0 ? Number(l.lastStability) : (1.0 * sScale);
      const r = Math.pow(1 + dynamicFactor * (elapsedDays / (rawS > 0 ? rawS : 1.0)), decay);
      const clampedR = Number.isFinite(r) ? Math.max(0.01, Math.min(0.99, r)) : 0.9;
      const err = actual - clampedR;

      totalError += err * err;
      evalCount += 1.0;
    }

    return evalCount > 0 ? totalError / evalCount : 0.25;
  }

  /**
   * [個人適応型 FSRS 重みオプティマイザ: 最適化用損失関数]
   * 純粋な Brier 誤差に、L2正則化（λ/N スケーリング）、順序制約、境界制約を加算。
   */
  function evaluateLoss(logs, weights, precomputed = null) {
    if (!logs || !logs.length) return 0;
    const pureBrier = evaluatePureBrier(logs, weights, precomputed);
    const n = Array.isArray(logs) ? Math.max(1, logs.length) : 20;

    const sScale = Number(weights?.sScale) || 1.0;
    const decayFactor = Number(weights?.decayFactor) || -0.5;
    const wHard = Number(weights?.wHard) || 0.8;
    const wGood = Number(weights?.wGood) || 1.2;
    const wEasy = Number(weights?.wEasy) || 1.6;

    // L2正則化 (MAP: データ数 n < 100 の過学習を防止するため、DEFAULT_FSRS_WEIGHTS に対する正則化強度を適応的に強化)
    const adaptiveLambda = n < 100 ? (0.2 * (1.0 - n / 100.0) + (1.0 / n)) : (1.0 / n);
    const defW = DEFAULT_FSRS_WEIGHTS;
    const l2Penalty = (
      Math.pow(sScale - defW.sScale, 2) +
      Math.pow(decayFactor - defW.decayFactor, 2) +
      Math.pow(wHard - defW.wHard, 2) +
      Math.pow(wGood - defW.wGood, 2) +
      Math.pow(wEasy - defW.wEasy, 2)
    ) * adaptiveLambda;

    // 順序制約 (Hard < Good < Easy の逆転を防止)
    let orderPenalty = 0;
    if (wHard >= wGood) orderPenalty += Math.pow((wHard - wGood) + 0.05, 2) * 50;
    if (wGood >= wEasy) orderPenalty += Math.pow((wGood - wEasy) + 0.05, 2) * 50;

    // 境界制約
    let boundaryPenalty = 0;
    if (sScale < 0.6) boundaryPenalty += Math.pow(0.6 - sScale, 2) * 50;
    if (sScale > 1.8) boundaryPenalty += Math.pow(sScale - 1.8, 2) * 50;
    if (decayFactor < -0.7) boundaryPenalty += Math.pow(-0.7 - decayFactor, 2) * 50;
    if (decayFactor > -0.3) boundaryPenalty += Math.pow(decayFactor - (-0.3), 2) * 50;
    if (wHard < 0.4) boundaryPenalty += Math.pow(0.4 - wHard, 2) * 50;
    if (wHard > 1.2) boundaryPenalty += Math.pow(wHard - 1.2, 2) * 50;
    if (wGood < 0.8) boundaryPenalty += Math.pow(0.8 - wGood, 2) * 50;
    if (wGood > 1.8) boundaryPenalty += Math.pow(wGood - 1.8, 2) * 50;
    if (wEasy < 1.2) boundaryPenalty += Math.pow(1.2 - wEasy, 2) * 50;
    if (wEasy > 2.5) boundaryPenalty += Math.pow(wEasy - 2.5, 2) * 50;

    const total = pureBrier + l2Penalty + orderPenalty + boundaryPenalty;
    return Number.isFinite(total) ? total : 1e9;
  }

  /**
   * [Nelder-Mead (Downhill Simplex) 法 ＆ L2正則化 ＆ 純Brier時系列ホールドアウト検証]
   */
  function optimizeFSRSWeights(logsInput = null) {
    const rawLogs = Array.isArray(logsInput) && logsInput.length ? logsInput : getReviewHistoryLog();
    const { validLogs, validCount } = prepareEvaluatableLogs(rawLogs);

    if (validCount < 20) {
      return {
        success: false,
        reason: 'insufficient_logs',
        count: validCount,
        message: `学習ログが不足しています（現在 ${validCount}/20 件）。20件以上の復習でパーソナライズ最適化が有効化されます。`
      };
    }

    // 時系列ホールドアウト分割（過去80%で学習、最新20%で汎化検証）
    const splitIdx = Math.max(16, Math.floor(validLogs.length * 0.8));
    const trainLogs = validLogs.slice(0, splitIdx);
    const valLogs = validLogs.slice(splitIdx);

    const trainPrepared = prepareEvaluatableLogs(trainLogs);
    const valPrepared = prepareEvaluatableLogs(valLogs);

    const currentWeights = getUserFSRSWeights() || DEFAULT_FSRS_WEIGHTS;
    const initialRawLoss = evaluatePureBrier(trainLogs, currentWeights, trainPrepared);
    const baselineValLoss = evaluatePureBrier(valLogs, DEFAULT_FSRS_WEIGHTS, valPrepared);

    // 5次元パラメータ境界: [sScale, decayFactor, wHard, wGood, wEasy]
    const bounds = [
      [0.6, 1.8], // sScale
      [-0.7, -0.3], // decayFactor (負値指数)
      [0.4, 1.2], // wHard
      [0.8, 1.8], // wGood
      [1.2, 2.5]  // wEasy
    ];

    const costFn = (vec) => {
      // NaN/非有限値の即時排除
      for (let i = 0; i < 5; i++) {
        if (!Number.isFinite(vec[i])) return 1e9;
      }
      const w = {
        sScale: vec[0],
        decayFactor: vec[1],
        wHard: vec[2],
        wGood: vec[3],
        wEasy: vec[4]
      };
      return evaluateLoss(trainLogs, w, trainPrepared);
    };

    const x0 = [
      Number(currentWeights.sScale) || 1.0,
      Number(currentWeights.decayFactor) || -0.5,
      Number(currentWeights.wHard) || 0.8,
      Number(currentWeights.wGood) || 1.2,
      Number(currentWeights.wEasy) || 1.6
    ];

    // 初期単体 (Simplex: 6頂点)
    const D = 5;
    const simplex = [{ point: x0.slice(), cost: costFn(x0) }];
    const stepSizes = [0.15, 0.05, 0.1, 0.1, 0.15];
    for (let i = 0; i < D; i++) {
      const p = x0.slice();
      p[i] += stepSizes[i];
      simplex.push({ point: p, cost: costFn(p) });
    }

    // Nelder-Mead 反復ループ (50イテレーション)
    const alpha = 1.0, gamma = 2.0, rho = 0.5, sigma = 0.5;
    for (let iter = 0; iter < 50; iter++) {
      simplex.sort((a, b) => a.cost - b.cost);

      const centroid = new Array(D).fill(0);
      for (let i = 0; i < D; i++) {
        for (let j = 0; j < D; j++) centroid[j] += simplex[i].point[j];
      }
      for (let j = 0; j < D; j++) centroid[j] /= D;

      // 反射 (Reflection)
      const worst = simplex[D];
      const xr = new Array(D);
      for (let j = 0; j < D; j++) xr[j] = centroid[j] + alpha * (centroid[j] - worst.point[j]);
      const costR = costFn(xr);

      if (costR < simplex[D - 1].cost && costR >= simplex[0].cost) {
        worst.point = xr;
        worst.cost = costR;
        continue;
      }

      // 拡張 (Expansion)
      if (costR < simplex[0].cost) {
        const xe = new Array(D);
        for (let j = 0; j < D; j++) xe[j] = centroid[j] + gamma * (xr[j] - centroid[j]);
        const costE = costFn(xe);
        if (costE < costR) {
          worst.point = xe;
          worst.cost = costE;
        } else {
          worst.point = xr;
          worst.cost = costR;
        }
        continue;
      }

      // 収縮 (Contraction)
      const xc = new Array(D);
      for (let j = 0; j < D; j++) xc[j] = centroid[j] + rho * (worst.point[j] - centroid[j]);
      const costC = costFn(xc);
      if (costC < worst.cost) {
        worst.point = xc;
        worst.cost = costC;
        continue;
      }

      // 縮小 (Shrink) [※多次元配列渡し]
      const best = simplex[0];
      for (let i = 1; i <= D; i++) {
        for (let j = 0; j < D; j++) {
          simplex[i].point[j] = best.point[j] + sigma * (simplex[i].point[j] - best.point[j]);
        }
        simplex[i].cost = costFn(simplex[i].point);
      }
    }

    simplex.sort((a, b) => a.cost - b.cost);
    const bestPoint = simplex[0].point;
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    // パラメータを安全範囲にクリップ
    const candidateWeights = Object.assign({}, currentWeights, {
      version: 2,
      sScale: Number(clamp(bestPoint[0], bounds[0][0], bounds[0][1]).toFixed(2)),
      decayFactor: Number(clamp(bestPoint[1], bounds[1][0], bounds[1][1]).toFixed(2)),
      wHard: Number(clamp(bestPoint[2], bounds[2][0], bounds[2][1]).toFixed(2)),
      wGood: Number(clamp(bestPoint[3], bounds[3][0], bounds[3][1]).toFixed(2)),
      wEasy: Number(clamp(bestPoint[4], bounds[4][0], bounds[4][1]).toFixed(2)),
      optimizedAt: Date.now(),
      logCount: validCount
    });

    // ホールドアウト純Brier汎化性能検証 (Validation Gate: ペナルティなしの真の予測誤差で判定)
    const candidateValLoss = evaluatePureBrier(valLogs, candidateWeights, valPrepared);
    
    // 検証データ上でデフォルト重み以上の汎化性能を持つ場合のみ採用（過学習ブロック）
    const isAccepted = Number.isFinite(candidateValLoss) && (valLogs.length >= 4 ? candidateValLoss <= baselineValLoss + 0.002 : true);
    const finalWeights = isAccepted ? candidateWeights : Object.assign({}, DEFAULT_FSRS_WEIGHTS, {
      optimizedAt: Date.now(),
      logCount: validCount
    });

    const finalRawLoss = evaluatePureBrier(validLogs, finalWeights);
    const improvementPct = initialRawLoss > 0
      ? Math.max(0, ((initialRawLoss - finalRawLoss) / initialRawLoss) * 100)
      : 0;

    finalWeights.brierScore = Number(finalRawLoss.toFixed(4));
    finalWeights.valBrierScore = Number(candidateValLoss.toFixed(4));
    finalWeights.improvement = Number(improvementPct.toFixed(1));

    setUserFSRSWeights(finalWeights);

    return {
      success: true,
      count: validCount,
      weights: finalWeights,
      prevLoss: Number(initialRawLoss.toFixed(4)),
      newLoss: Number(finalRawLoss.toFixed(4)),
      valLoss: Number(candidateValLoss.toFixed(4)),
      gateAccepted: isAccepted,
      improvement: `${improvementPct.toFixed(1)}%`
    };
  }

  async function optimizeFSRSWeightsAsync(logsInput = null) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(optimizeFSRSWeights(logsInput));
      }, 0);
    });
  }

  /**
   * [忘却臨界点スマートPush通知]
   * 記憶保持率が 90% (臨界点) を下回る直前の単語群を検知
   */
  function isSmartNotifyEnabled() {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(SMART_NOTIFY_KEY);
        return val !== '0';
      }
    } catch {}
    return true;
  }

  function setSmartNotifyEnabled(enabled) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SMART_NOTIFY_KEY, enabled ? '1' : '0');
      }
    } catch {}
  }

  function getImminentForgettingWords(list, threshold = 0.90, horizonHours = 12) {
    if (!Array.isArray(list) || !list.length) return [];
    const now = Date.now();
    const horizonMs = horizonHours * 3600000;
    const imminent = [];

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      // 未学習・新カード（interval や lastReview がないもの）は除外
      if (!item || !item.nextReview || !item.interval) continue;
      const currentR = getRetrievability(item, now);
      const futureR = getRetrievability(item, now + horizonMs);
      if (currentR <= threshold || futureR <= threshold) {
        imminent.push({
          item,
          currentR: Number(currentR.toFixed(3)),
          futureR: Number(futureR.toFixed(3)),
          urgency: 1.0 - currentR
        });
      }
    }
    imminent.sort((a, b) => b.urgency - a.urgency);
    return imminent;
  }

  async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission || 'denied';
    }
  }

  /**
   * [消化キャパシティ連動型 バッチダイジェスト通知スケジューラ]
   * 単語が1語だけの散発的な通知スパム（Notification Fatigue）を完全に排除。
   * 忘却臨界単語がまとまった数（5語以上）に達した際、急激な忘却危機（R < 0.65）がある際、
   * または飢餓防止（前回通知から36時間経過）の際に、認知負荷上限（最大20語）を設けたバッチとして介入する。
   */
  function checkSmartNotificationSchedule(list, options = {}) {
    if (!isSmartNotifyEnabled()) return { status: 'disabled' };
    if (typeof window === 'undefined' || !('Notification' in window)) return { status: 'unsupported' };
    if (Notification.permission !== 'granted') return { status: 'not_granted' };

    const now = Date.now();
    const lastNotifyStr = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_NOTIFY_KEY) : null;
    const lastNotify = lastNotifyStr ? parseInt(lastNotifyStr, 10) : 0;
    const cooldownMs = options.cooldownMs || 12 * 3600000; // 厳格な12時間クールダウン
    const maxWaitMs = options.maxWaitMs || 36 * 3600000;   // 飢餓防止: 36時間以上経過時は小バッチでも配信

    if (now - lastNotify < cooldownMs) {
      return { status: 'cooldown', remainingMs: cooldownMs - (now - lastNotify) };
    }

    const imminent = getImminentForgettingWords(list, 0.90, 12);
    if (!imminent.length) return { status: 'no_imminent_words' };

    // 消化キャパシティ判定: 最低5語以上蓄積、急激な忘却危機（R < 0.65）、または最大待機時間超過（飢餓防止）
    const batchMin = options.batchMin || 5;
    const hasCriticalLapse = imminent.some(x => x.currentR < 0.65);
    const isStarved = (lastNotify > 0 && (now - lastNotify >= maxWaitMs));

    if (imminent.length < batchMin && !hasCriticalLapse && !isStarved && !options.force) {
      return { status: 'batch_accumulating', count: imminent.length, target: batchMin };
    }

    // 消化キャパシティ上限（1回あたり最大20語に制限して認知過負荷による離脱を防止）
    const maxCap = options.maxBatchCap || 20;
    const targetBatch = imminent.slice(0, maxCap);
    const topWord = targetBatch[0]?.item?.word || 'Word';
    const count = targetBatch.length;
    const estMinutes = Math.max(1, Math.round(count * 0.25)); // 1語あたり約15秒換算
    // [P3-2 解決] 全10言語対応のPush通知メッセージ生成
    const locale = global.VocabI18n?.getLocale?.() || global.App?.tgtLang || 'ja';
    const isJa = locale === 'ja';
    const title = isJa ? '【Vocab Vault】忘却防止ダイジェスト' : (locale === 'de' ? '【Vocab Vault】Wiederholungs-Digest' : (locale === 'fr' ? '【Vocab Vault】Rappel de révision' : (locale === 'es' ? '【Vocab Vault】Resumen de repaso' : (locale === 'ko' ? '【Vocab Vault】망각 방지 알림' : (locale === 'zh' ? '【Vocab Vault】防遗忘复习提醒' : (locale === 'it' ? '【Vocab Vault】Promemoria ripasso' : (locale === 'pt' ? '【Vocab Vault】Lembrete de revisão' : (locale === 'nl' ? '【Vocab Vault】Herhalingsherinnering' : '【Vocab Vault】Retention Review Digest'))))))));
    const body = isJa
      ? `「${topWord}」など ${count} 語が復習のベストタイミングです（目安: 約${estMinutes}分）。今すぐ消化して長期記憶へ定着させましょう！`
      : (locale === 'de'
          ? `Guter Zeitpunkt für „${topWord}“ und ${count} weitere Wörter (ca. ${estMinutes} Min). Jetzt wiederholen!`
          : (locale === 'fr'
              ? `Moment idéal pour réviser « ${topWord} » et ${count} autres mots (~${estMinutes} min).`
              : (locale === 'es'
                  ? `Momento ideal para repasar «${topWord}» y ${count} palabras más (~${estMinutes} min).`
                  : (locale === 'ko'
                      ? `「${topWord}」 등 ${count}개 단어의 복습 최적 시기입니다 (약 ${estMinutes}분 소요).`
                      : (locale === 'zh'
                          ? `“${topWord}”等 ${count} 个单词已到最佳复习时间（约 ${estMinutes} 分钟）。`
                          : (locale === 'it'
                              ? `Momento ideale per ripassare "${topWord}" e altre ${count} parole (~${estMinutes} min).`
                              : (locale === 'pt'
                                  ? `Momento ideal para revisar "${topWord}" e mais ${count} palavras (~${estMinutes} min).`
                                  : (locale === 'nl'
                                      ? `Ideaal moment om "${topWord}" en ${count} andere woorden te herhalen (~${estMinutes} min).`
                                      : `Optimal time to review "${topWord}" and ${count} more words (~${estMinutes} min).`))))))));

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: './icons/icon-192.png',
            badge: './icons/favicon-32.png',
            tag: 'vocab-forgetting-digest',
            data: { url: './?mode=anki' }
          });
        }).catch(() => {
          new Notification(title, { body, icon: './icons/icon-192.png' });
        });
      } else {
        new Notification(title, { body, icon: './icons/icon-192.png' });
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LAST_NOTIFY_KEY, String(now));
      }
      return { status: 'notified', count, estMinutes, words: targetBatch.map(x => x.item.word) };
    } catch (e) {
      return { status: 'error', error: String(e) };
    }
  }

  // --- オフライン復習キュー管理 (LocalStorage + IndexedDB 二重永続化: iOS Safari PWAパージ耐性) ---
  function getOfflineQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  function saveOfflineQueue(q) {
    const list = Array.isArray(q) ? q : [];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('[SRS] LocalStorage saveOfflineQueue failed, relying on IndexedDB:', e);
    }

    try {
      if (global.VocabStorage?.idbPut) {
        global.VocabStorage.idbPut(OFFLINE_QUEUE_KEY, list);
      }
    } catch (e) {
      console.warn('[SRS] IndexedDB saveOfflineQueue failed:', e);
    }
    updateOfflineBadgeUI();
  }

  // iOS Safariの7日間パージ対策: IndexedDBからの復旧
  async function recoverOfflineQueueFromIdb() {
    try {
      const q = getOfflineQueue();
      if (!q.length && global.VocabStorage?.idbGet) {
        const idbQ = await global.VocabStorage.idbGet(OFFLINE_QUEUE_KEY);
        if (Array.isArray(idbQ) && idbQ.length > 0) {
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(idbQ));
          updateOfflineBadgeUI();
        }
      }
    } catch {}
  }

  const MAX_OFFLINE_QUEUE_LEN = 500;

  function queueOfflineReview(record) {
    if (!record || typeof record !== 'object') return;
    const q = getOfflineQueue();
    // 同一単語の連続復習は最新を優先
    const filtered = q.filter(r => !(r.id && record.id && r.id === record.id));
    filtered.push({
      ...record,
      queuedAt: Date.now()
    });
    // 最大 500 件にクリッピングしてストレージのパンクを防止 (FIFO)
    const capped = filtered.length > MAX_OFFLINE_QUEUE_LEN ? filtered.slice(-MAX_OFFLINE_QUEUE_LEN) : filtered;
    saveOfflineQueue(capped);
  }

  function updateOfflineBadgeUI() {
    const badge = document.getElementById('offlineSyncBadge');
    if (!badge) return;
    const q = getOfflineQueue();
    if (q.length > 0) {
      const textEl = document.getElementById('offlineSyncText');
      if (textEl) {
        textEl.textContent = `未同期の復習: ${q.length}件`;
      } else {
        badge.textContent = `未同期の復習: ${q.length}件`;
      }
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  }

  let _isFlushingOffline = false;

  async function flushOfflineReviews() {
    if (_isFlushingOffline) return;
    const qSnapshot = getOfflineQueue();
    if (!qSnapshot.length || !navigator.onLine || !global.VocabSync?.isCloudReady?.()) return;

    _isFlushingOffline = true;
    try {
      const syncFn = global.syncCloudNow || global.VocabCore?.syncCloudNow;
      if (typeof syncFn === 'function') {
        const syncedOk = await syncFn(false);
        if (syncedOk) {
          // 同期完了時に、同期開始時点のスナップショット以降に追加された未同期アイテムを保護
          const currentQ = getOfflineQueue();
          const syncedTimestamps = new Set(qSnapshot.map(r => r.queuedAt));
          const remainingQ = currentQ.filter(r => !syncedTimestamps.has(r.queuedAt));
          saveOfflineQueue(remainingQ);
        }
      }
    } catch {} finally {
      _isFlushingOffline = false;
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', flushOfflineReviews);
  }

  // --- 触覚フィードバック (Web Vibration API: ネイティブ感覚の微細ハプティクス) ---
  function triggerHaptic(type = 'light') {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      if (type === 'light') navigator.vibrate(8); // スワイプ閾値通過時や軽操作
      else if (type === 'again') navigator.vibrate([40, 60, 40]); // もう一度 (重いダブルパルス)
      else if (type === 'hard') navigator.vibrate(30); // 難しい (鈍い単振動)
      else if (type === 'good') navigator.vibrate(15); // 普通・正解 (クリスピーな単振動)
      else if (type === 'easy') navigator.vibrate([12, 40, 15]); // 簡単・達成感 (リズミカルなダブルタップ)
      else navigator.vibrate(12);
    } catch {}
  }

  // --- モバイル用スワイプUIコントローラー ---
  function attachSwipeGesture(cardEl, onSwipeCallback) {
    if (!cardEl || cardEl._swipeAttached) return;
    cardEl._swipeAttached = true;

    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;
    let isSwiping = false;
    let isHorizontal = false;
    let isMouseDown = false;
    let hapticFiredOnThreshold = false;
    const threshold = 75; // スワイプ確定の閾値(px)

    const againBadge = cardEl.querySelector('.swipe-badge.again');
    const goodBadge = cardEl.querySelector('.swipe-badge.good');

    const resetCardState = () => {
      cardEl.classList.remove('swiping');
      cardEl.style.transform = '';
      if (againBadge) againBadge.style.opacity = '0';
      if (goodBadge) goodBadge.style.opacity = '0';
      isSwiping = false;
      isHorizontal = false;
      isMouseDown = false;
      hapticFiredOnThreshold = false;
    };

    const isAnswerShown = () => {
      const btnAns = document.getElementById('btnAns');
      return !btnAns || btnAns.style.display === 'none';
    };

    const onStart = (clientX, clientY) => {
      startX = clientX;
      startY = clientY;
      currentX = clientX;
      currentY = clientY;
      isSwiping = true;
      isHorizontal = false;
      hapticFiredOnThreshold = false;
      cardEl.classList.add('swiping');
    };

    const onMove = (clientX, clientY, e) => {
      if (!isSwiping) return;
      currentX = clientX;
      currentY = clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;

      if (!isHorizontal) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          isHorizontal = true;
        } else if (Math.abs(dy) > 10) {
          isSwiping = false; // 縦スクロールを優先
          resetCardState();
          return;
        }
      }

      if (isHorizontal) {
        if (e && e.cancelable) e.preventDefault();
        const rot = dx * 0.08;
        cardEl.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;

        const absDx = Math.abs(dx);
        if (absDx >= threshold && !hapticFiredOnThreshold) {
          triggerHaptic('light');
          hapticFiredOnThreshold = true;
        } else if (absDx < threshold && hapticFiredOnThreshold) {
          hapticFiredOnThreshold = false;
        }

        const opacity = Math.min(1, Math.max(0, absDx / (threshold * 0.85)));
        if (dx < 0) {
          if (againBadge) againBadge.style.opacity = String(opacity);
          if (goodBadge) goodBadge.style.opacity = '0';
        } else {
          if (goodBadge) goodBadge.style.opacity = String(opacity);
          if (againBadge) againBadge.style.opacity = '0';
        }
      }
    };

    const onEnd = () => {
      if (!isSwiping || !isHorizontal) {
        resetCardState();
        return;
      }

      const dx = currentX - startX;
      cardEl.classList.remove('swiping');

      // 解答がまだ表示されていない状態でスワイプされた場合：
      // 誤送信を防ぐため、解答を表示してカードを一旦中央に戻す
      if (!isAnswerShown()) {
        resetCardState();
        if (Math.abs(dx) > threshold) {
          triggerHaptic('light');
          if (typeof global.showAns === 'function') {
            global.showAns();
          } else if (typeof global.VocabCore?.showAns === 'function') {
            global.VocabCore.showAns();
          }
        }
        return;
      }

      if (dx < -threshold) {
        // 左スワイプ: もう一度 (Rating 0)
        triggerHaptic('again');
        cardEl.classList.add('swipe-out-left');
        setTimeout(() => {
          resetCardState();
          cardEl.classList.remove('swipe-out-left');
          if (typeof onSwipeCallback === 'function') onSwipeCallback(0);
        }, 220);
      } else if (dx > threshold) {
        // 右スワイプ: 普通・覚えた (Rating 2)
        triggerHaptic('good');
        cardEl.classList.add('swipe-out-right');
        setTimeout(() => {
          resetCardState();
          cardEl.classList.remove('swipe-out-right');
          if (typeof onSwipeCallback === 'function') onSwipeCallback(2);
        }, 220);
      } else {
        // スナップバック
        resetCardState();
      }
    };

    // タッチイベント
    cardEl.addEventListener('touchstart', e => {
      if (e.target.closest('button, a, input, select, .spk-btn, .b-rat')) return;
      if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    cardEl.addEventListener('touchmove', e => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });

    cardEl.addEventListener('touchend', onEnd, { passive: true });
    cardEl.addEventListener('touchcancel', resetCardState, { passive: true });

    // [P2-⑩ 解決] window blur リスナーの蓄積・メモリリーク防止
    if (typeof window !== 'undefined') {
      if (cardEl._blurHandler) {
        window.removeEventListener('blur', cardEl._blurHandler);
      }
      cardEl._blurHandler = () => {
        // カード要素がDOMから離脱した場合は自動的にリスナーを解除
        if (typeof document !== 'undefined' && !document.contains(cardEl)) {
          window.removeEventListener('blur', cardEl._blurHandler);
          cardEl._blurHandler = null;
          return;
        }
        resetCardState();
      };
      window.addEventListener('blur', cardEl._blurHandler, { passive: true });
    }

    // マウスドラッグ対応 (動的リスナー登録でリーク防止)
    const onDocMouseMove = e => {
      if (isMouseDown) onMove(e.clientX, e.clientY, e);
    };

    const onDocMouseUp = () => {
      if (isMouseDown) {
        isMouseDown = false;
        document.removeEventListener('mousemove', onDocMouseMove);
        document.removeEventListener('mouseup', onDocMouseUp);
        onEnd();
      }
    };

    cardEl.addEventListener('mousedown', e => {
      if (e.button === 0 && !e.target.closest('button, a, input, select, .spk-btn, .b-rat')) {
        isMouseDown = true;
        onStart(e.clientX, e.clientY);
        document.addEventListener('mousemove', onDocMouseMove);
        document.addEventListener('mouseup', onDocMouseUp);
      }
    });
  }

  /**
   * 復習負荷平滑化 & バッファ調整 (Workload Smoothing & Fuzzing)
   * 特定日への復習集中（過密スパイク）を検知し、安全な記憶定着余力（R >= 0.85）のある単語を
   * 近傍の空いている日へなだらかに再分散する。
   */
  function smoothReviewWorkload(listInput = null, targetCap = 25, forecastDays = 30) {
    const list = Array.isArray(listInput) ? listInput : (global.VocabCore?.App?.entries || []);
    if (!list.length) return { success: false, shiftedCount: 0, affectedDays: 0, message: '対象単語がありません。' };

    const cap = Math.max(5, Math.min(100, Number(targetCap) || 25));
    const days = Math.max(7, Math.min(60, Number(forecastDays) || 30));
    const now = Date.now();

    const todayYmd = (d) => {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };

    const dayDiff = (d1Str, d2Str) => {
      const p1 = d1Str.split('-').map(Number);
      const p2 = d2Str.split('-').map(Number);
      const dt1 = new Date(p1[0], p1[1] - 1, p1[2]);
      const dt2 = new Date(p2[0], p2[1] - 1, p2[2]);
      return Math.round((dt2 - dt1) / 86400000);
    };

    const baseDate = new Date();
    const todayStr = todayYmd(baseDate);

    // 1. 各日の単語リストをインデックス化
    const dayBuckets = new Map();
    for (let d = 0; d < days; d++) dayBuckets.set(d, []);

    list.forEach(item => {
      if (!item || !item.nextReview || item.isDeleted) return;
      const targetYmd = todayYmd(new Date(item.nextReview));
      const diff = dayDiff(todayStr, targetYmd);
      if (diff >= 0 && diff < days) {
        dayBuckets.get(diff).push(item);
      }
    });

    let shiftedCount = 0;
    const affectedDaysSet = new Set();

    // 2. 過密日（count > cap）を検知して平滑化
    for (let d = 0; d < days; d++) {
      const bucket = dayBuckets.get(d) || [];
      if (bucket.length <= cap) continue;

      // 記憶定着率 R が高い（余裕がある）順に並べ替え
      // R < 0.85 の忘却危機単語は絶対に前後にずらさず元の期日を保護
      const candidates = bucket
        .filter(item => {
          const r = getRetrievability(item, now);
          const stab = Number(item.stability) || Number(item.interval) || 0;
          return r >= 0.85 && stab >= 2.0;
        })
        .sort((a, b) => {
          const rA = getRetrievability(a, now);
          const rB = getRetrievability(b, now);
          return rB - rA;
        });

      const excessCount = bucket.length - cap;
      let shiftedFromThisDay = 0;

      for (let i = 0; i < candidates.length && shiftedFromThisDay < excessCount; i++) {
        const item = candidates[i];

        // 最も空いている近傍日を探す (d+1, d-1, d+2, d-2)
        // 本日(d=0)より過去には移動させない
        let bestTargetOffset = -1;
        let lowestCount = cap;

        const candidateOffsets = [d + 1, d - 1, d + 2, d - 2].filter(off => off >= (d === 0 ? 1 : 0) && off < days);
        for (const targetOff of candidateOffsets) {
          const targetBucket = dayBuckets.get(targetOff) || [];
          if (targetBucket.length < lowestCount) {
            lowestCount = targetBucket.length;
            bestTargetOffset = targetOff;
          }
        }

        if (bestTargetOffset !== -1 && lowestCount < cap) {
          const targetBucket = dayBuckets.get(bestTargetOffset);
          const oldIndex = bucket.indexOf(item);
          if (oldIndex !== -1) bucket.splice(oldIndex, 1);
          targetBucket.push(item);

          // ファジング（微小なジッター: 1〜3時間）を付与して将来の期日共鳴を防止
          const jitterMs = Math.floor((Math.random() - 0.5) * 3600000 * 4);
          const targetDateObj = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + bestTargetOffset);
          targetDateObj.setHours(9, 0, 0, 0);
          item.nextReview = targetDateObj.getTime() + jitterMs;
          item.version = (Number(item.version) || 1) + 1;
          item.updatedAt = now;
          item.reviewUpdatedAt = now;

          shiftedCount++;
          shiftedFromThisDay++;
          affectedDaysSet.add(d);
          affectedDaysSet.add(bestTargetOffset);
        }
      }
    }

    return {
      success: true,
      shiftedCount,
      affectedDays: affectedDaysSet.size,
      targetCap: cap,
      forecastDays: days,
      list
    };
  }

  global.VocabSRS = {
    DEFAULT_FSRS_WEIGHTS,
    getUserFSRSWeights,
    setUserFSRSWeights,
    resetUserFSRSWeights,
    getReviewHistoryLog,
    saveReviewHistoryLog,
    recordReviewHistory,
    clearReviewHistoryLog,
    optimizeFSRSWeights,
    optimizeFSRSWeightsAsync,
    evaluateLoss,
    isSmartNotifyEnabled,
    setSmartNotifyEnabled,
    getImminentForgettingWords,
    requestNotificationPermission,
    checkSmartNotificationSchedule,
    predStability,
    predDays,
    predictIntervals,
    getRetrievability,
    getEtymologyAnchorBonus,
    calculateNextReview,
    smoothReviewWorkload,
    queueOfflineReview,
    flushOfflineReviews,
    recoverOfflineQueueFromIdb,
    recoverReviewHistoryFromIdb,
    updateOfflineBadgeUI,
    attachSwipeGesture,
    triggerHaptic
  };

  if (typeof window !== 'undefined' && typeof setTimeout === 'function') {
    setTimeout(() => {
      recoverOfflineQueueFromIdb();
      recoverReviewHistoryFromIdb();
    }, 400);
  }
})(typeof window !== 'undefined' ? window : globalThis);
