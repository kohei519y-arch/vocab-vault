/**
 * Vocab Vault — SM-2 SRS Algorithm & Mobile Review Module (js/anki.js)
 * ステップ5: スワイプUI、オフライン復習キュー管理
 */
(function (global) {
  'use strict';

  const OFFLINE_QUEUE_KEY = 'vv_offline_review_queue';

  const MAX_INTERVAL_DAYS = 3650; // 最大復習間隔（10年）
  const REQUEST_RETENTION = 0.90; // 目標定着率: 90%
  const DECAY = -0.5; // FSRS忘却曲線減衰率
  const FACTOR = 19 / 81; // R(t) = (1 + FACTOR * t / S)^DECAY

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
   */
  function getRetrievability(e, now = Date.now()) {
    if (!e || !e.nextReview || !e.interval) return 1.0;
    const nowTs = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const rawLast = Number(e.reviewUpdatedAt || (e.nextReview - e.interval * 86400000));
    const lastReview = Number.isFinite(rawLast) ? rawLast : nowTs;
    const elapsedDays = Math.max(0, (nowTs - lastReview) / 86400000);
    const rawS = Number(e.stability) || Number(e.interval) || 1.0;
    const s = Number.isFinite(rawS) && rawS > 0 ? Math.max(0.1, rawS) : 1.0;
    const r = Math.pow(1 + FACTOR * (elapsedDays / s), DECAY);
    return Number.isFinite(r) ? Math.max(0.0, Math.min(1.0, r)) : 1.0;
  }

  /**
   * FSRS-4.5 & SM-2 ハイブリッド復習間隔予測
   */
  function predDays(e, rating) {
    const rawS = Number(e?.stability) || Number(e?.interval) || 1.0;
    const s = Number.isFinite(rawS) && rawS > 0 ? Math.max(0.1, rawS) : 1.0;
    const rawD = Number(e?.difficulty);
    const d = Number.isFinite(rawD) ? Math.max(1.0, Math.min(10.0, rawD)) : 5.0;
    const anchorBonus = Number.isFinite(getEtymologyAnchorBonus(e)) ? getEtymologyAnchorBonus(e) : 1.0;

    if (rating === 0) { // Again (もう一度)
      return 0; // 即時・1分後
    }

    let nextS = s;
    if (rating === 1) { // Hard (難しい)
      nextS = s * Math.max(1.1, (1.2 - 0.05 * d)) * anchorBonus;
    } else if (rating === 2) { // Good (普通)
      if (!e?.repetition) {
        nextS = 2.5 * anchorBonus;
      } else {
        nextS = s * (1 + Math.exp(1.5) * Math.pow(d, -0.4) * Math.pow(s, -0.1)) * anchorBonus;
      }
    } else { // Easy (簡単)
      if (!e?.repetition) {
        nextS = 5.0 * anchorBonus;
      } else {
        nextS = s * (1 + Math.exp(2.0) * Math.pow(d, -0.4) * Math.pow(s, -0.1) * 1.3) * anchorBonus;
      }
    }

    if (!Number.isFinite(nextS) || nextS <= 0) nextS = 1.0;

    // 目標定着率 90% に基づくインターバル計算
    const intervalDays = (nextS / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
    const finalDays = Number.isFinite(intervalDays) ? intervalDays : 1.0;
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
    let curStability = (Number.isFinite(rawS) && rawS > 0) ? rawS : 1.0;
    let nextReviewDate = now;

    // Difficulty D 更新 (1〜10)
    const diffDelta = rating === 0 ? 1.2 : rating === 1 ? 0.6 : rating === 2 ? -0.2 : -0.8;
    const nextDifficulty = Math.max(1.0, Math.min(10.0, Number((curDifficulty + diffDelta).toFixed(2))));

    if (rating === 0) {
      // 忘却時: Stabilityを減衰させ、即座にリラーニングキューへ
      nextRepetition = 0;
      nextInterval = 0;
      curStability = Math.max(0.2, curStability * 0.3);
      nextReviewDate = now + 60000; // 1分後
    } else {
      const baseDays = predDays(e, rating);
      const fuzz = baseDays >= 2 ? (0.97 + Math.random() * 0.06) : 1; // 間隔の適度な分散
      const computedInterval = Number.isFinite(baseDays * fuzz) ? baseDays * fuzz : 1.0;
      nextInterval = Number(Math.min(MAX_INTERVAL_DAYS, Math.max(1.0, computedInterval)).toFixed(2));
      curStability = Number(nextInterval.toFixed(2));

      // SM-2 互換パラメータの同期
      nextEfactor = Math.max(1.3, Math.min(3.5, nextEfactor + (rating === 1 ? -0.15 : rating === 3 ? 0.15 : 0)));
      if (rating >= 2) nextRepetition++;
      nextReviewDate = now + Math.round(nextInterval * 86400000);
    }

    if (!Number.isFinite(nextReviewDate)) nextReviewDate = now + 86400000;

    const currentR = getRetrievability({ ...e, stability: curStability, interval: nextInterval, nextReview: nextReviewDate }, now);

    return {
      interval: nextInterval,
      repetition: nextRepetition,
      efactor: nextEfactor,
      stability: curStability,
      difficulty: nextDifficulty,
      retrievability: Number((Number.isFinite(currentR) ? currentR : 1.0).toFixed(3)),
      nextReview: nextReviewDate,
      updatedAt: now,
      reviewUpdatedAt: now
    };
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
