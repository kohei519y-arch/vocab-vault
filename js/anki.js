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
  function getReviewHistoryLog() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(REVIEW_HISTORY_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) return arr;
        }
      }
    } catch {}
    return [];
  }

  function saveReviewHistoryLog(logs) {
    try {
      if (typeof localStorage !== 'undefined') {
        const capped = Array.isArray(logs) ? logs.slice(-MAX_REVIEW_HISTORY) : [];
        localStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(capped));
        if (global.VocabStorage?.idbPut) {
          global.VocabStorage.idbPut(REVIEW_HISTORY_KEY, capped);
        }
      }
    } catch {}
  }

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

    // ログが一定件数以上のとき、バックグラウンドでマイクロ最適化を自動発火
    if (capped.length >= 20 && capped.length % 10 === 0) {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => { optimizeFSRSWeights(capped); });
      } else if (typeof setTimeout === 'function') {
        setTimeout(() => { optimizeFSRSWeights(capped); }, 50);
      }
    }
  }

  function clearReviewHistoryLog() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(REVIEW_HISTORY_KEY);
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
    if (isUnlearned) return 0.0;

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
    const lastReview = Number.isFinite(rawLast) ? rawLast : nowTs;
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
  function predStability(e, rating, customWeights = null) {
    const weights = customWeights || getUserFSRSWeights() || DEFAULT_FSRS_WEIGHTS;
    const rawS = Number(e?.stability) || Number(e?.interval) || 1.0;
    const s = Number.isFinite(rawS) && rawS > 0 ? Math.max(0.1, rawS) : 1.0;
    const rawD = Number(e?.difficulty);
    const d = Number.isFinite(rawD) ? Math.max(1.0, Math.min(10.0, rawD)) : 5.0;
    const anchorBonus = Number.isFinite(getEtymologyAnchorBonus(e)) ? getEtymologyAnchorBonus(e) : 1.0;
    const sScale = (Number.isFinite(Number(weights?.sScale)) && Number(weights.sScale) > 0) ? Number(weights.sScale) : 1.0;

    if (rating === 0) {
      return Math.max(0.2, s * 0.3 * sScale);
    }

    let nextS = s;
    if (rating === 1) { // Hard (難しい): 最低でも前回の 1.05倍〜1.2倍は維持・微増させる
      const wHard = (Number.isFinite(Number(weights?.wHard)) && Number(weights.wHard) > 0) ? Number(weights.wHard) : 0.8;
      const hardGain = Math.max(0.05, (0.25 - 0.015 * d) * wHard * anchorBonus);
      nextS = s * (1 + hardGain);
    } else if (rating === 2) { // Good (普通): 増分項に対して wGood と anchorBonus を適用
      const wGood = (Number.isFinite(Number(weights?.wGood)) && Number(weights.wGood) > 0) ? Number(weights.wGood) : 1.2;
      const initS = (Number(weights?.w2) || 2.5) * sScale;
      if (!e?.repetition) {
        nextS = initS * anchorBonus;
      } else {
        const gain = Math.exp(1.1) * Math.pow(d, -0.4) * Math.pow(s, -0.15) * wGood * anchorBonus;
        nextS = s * (1 + Math.max(0.2, gain));
      }
    } else { // Easy (簡単): 増分項に対して wEasy と anchorBonus を適用
      const wEasy = (Number.isFinite(Number(weights?.wEasy)) && Number(weights.wEasy) > 0) ? Number(weights.wEasy) : 1.6;
      const initEasyS = (Number(weights?.w3) || 5.0) * sScale;
      if (!e?.repetition) {
        nextS = initEasyS * anchorBonus;
      } else {
        const gain = Math.exp(1.4) * Math.pow(d, -0.4) * Math.pow(s, -0.15) * wEasy * anchorBonus;
        nextS = s * (1 + Math.max(0.5, gain));
      }
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
  function predictIntervals(e) {
    return [0, 1, 2, 3].map(r => {
      const days = predDays(e, r);
      if (days === 0) return '1分後';
      if (days < 1) return `${Math.round(days * 24)}時間後`;
      if (days < 30) return `${Math.round(days)}日後`;
      if (days < 365) return `${(days / 30).toFixed(1)}ヶ月後`;
      return `${(days / 365).toFixed(1)}年後`;
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

    if (rating === 0) {
      // 忘却時: Stabilityを減衰させ、即座にリラーニングキューへ
      nextRepetition = 0;
      nextInterval = 0;
      curStability = Number(predStability(e, 0).toFixed(2));
      nextReviewDate = now + 60000; // 1分後
    } else {
      const pureStability = predStability(e, rating);
      curStability = Number(pureStability.toFixed(2));
      // 目標定着率 90% において FSRS 理論式上 I = S と完全に一致
      nextInterval = Number(Math.min(MAX_INTERVAL_DAYS, Math.max(1.0, curStability)).toFixed(2));

      // SM-2 互換パラメータの同期
      nextEfactor = Math.max(1.3, Math.min(3.5, nextEfactor + (rating === 1 ? -0.15 : rating === 3 ? 0.15 : 0)));
      if (rating >= 2) nextRepetition++;
      nextReviewDate = now + Math.round(nextInterval * 86400000);
    }

    if (!Number.isFinite(nextReviewDate)) nextReviewDate = now + 86400000;

    const currentR = getRetrievability({ ...e, stability: curStability, interval: nextInterval, nextReview: nextReviewDate }, now);

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
      retrievability: Number((Number.isFinite(currentR) ? currentR : 1.0).toFixed(3)),
      nextReview: nextReviewDate,
      version: (Number(e?.version) || 1) + 1,
      updatedAt: now,
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
      const simulatedPrevEntry = {
        stability: Number(prev.lastStability ?? 1.0),
        difficulty: Number(prev.lastDifficulty ?? 5.0),
        interval: Number(prev.lastInterval ?? 1.0),
        repetition: 1
      };
      // ラベル漏洩完全排除: next.rating ではなく前回の復習評価 prev.rating で安定度を推計
      const nextS = predStability(simulatedPrevEntry, prev.rating, weights);
      const elapsedDays = Math.max(0, (Number(curr.timestamp) - Number(prev.timestamp)) / 86400000);
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
      const actual = l.rating >= 1 ? 1.0 : 0.0;
      const rawS = ((Number(l.lastStability) > 0 ? Number(l.lastStability) : 1.0)) * sScale;
      const rawElapsed = l.elapsedDays ?? l.lastInterval ?? 1.0;
      const elapsedDays = Math.max(0, Number.isFinite(Number(rawElapsed)) ? Number(rawElapsed) : 1.0);
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

    // L2正則化 (MAP: データ数 n に応じて λ/n スケーリング、中心を妥当な事前値 [1.0, -0.5, 0.8, 1.2, 1.6] に設定)
    const lambda = 1.0 / n;
    const l2Penalty = (
      Math.pow(sScale - 1.0, 2) +
      Math.pow(decayFactor - (-0.5), 2) +
      Math.pow(wHard - 0.8, 2) +
      Math.pow(wGood - 1.2, 2) +
      Math.pow(wEasy - 1.6, 2)
    ) * lambda;

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
    const topWord = targetBatch[0]?.item?.word || '重要単語';
    const count = targetBatch.length;
    const estMinutes = Math.max(1, Math.round(count * 0.25)); // 1語あたり約15秒換算
    const title = '【Vocab Vault】忘却防止ダイジェスト';
    const body = `「${topWord}」など ${count} 語が復習のベストタイミングです（目安: 約${estMinutes}分）。今すぐ消化して長期記憶へ定着させましょう！`;

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
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
      if (global.VocabStorage?.idbPut) {
        global.VocabStorage.idbPut(OFFLINE_QUEUE_KEY, q);
      }
      updateOfflineBadgeUI();
    } catch {}
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
        await syncFn(false);
        // 同期完了時に、同期開始時点のスナップショット以降に追加された未同期アイテムを保護
        const currentQ = getOfflineQueue();
        const syncedTimestamps = new Set(qSnapshot.map(r => r.queuedAt));
        const remainingQ = currentQ.filter(r => !syncedTimestamps.has(r.queuedAt));
        saveOfflineQueue(remainingQ);
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

    if (typeof window !== 'undefined') {
      window.addEventListener('blur', resetCardState, { passive: true });
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
    queueOfflineReview,
    flushOfflineReviews,
    recoverOfflineQueueFromIdb,
    updateOfflineBadgeUI,
    attachSwipeGesture,
    triggerHaptic
  };

  if (typeof window !== 'undefined' && typeof setTimeout === 'function') {
    setTimeout(recoverOfflineQueueFromIdb, 400);
  }
})(typeof window !== 'undefined' ? window : globalThis);
