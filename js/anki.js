/**
 * Vocab Vault — SM-2 SRS Algorithm & Mobile Review Module (js/anki.js)
 * ステップ5: スワイプUI、オフライン復習キュー管理
 */
(function (global) {
  'use strict';

  const OFFLINE_QUEUE_KEY = 'vv_offline_review_queue';

  function predDays(e, rating) {
    const iv = Number(e.interval) || 0;
    const ef = Number(e.efactor) || 2.5;
    if (rating === 0) return 0; // もう一度: 1分後
    if (rating === 1) return Math.max(1, iv * 1.2); // 難しい
    if (rating === 2) return !e.repetition ? 1 : iv * 2.5; // 普通
    return !e.repetition ? 4 : iv * ef; // 簡単
  }

  function calculateNextReview(e, rating) {
    const now = Date.now();
    let nextInterval = 0;
    let nextRepetition = Number(e.repetition) || 0;
    let nextEfactor = Number(e.efactor) || 2.5;
    let nextReviewDate = now;

    if (rating === 0) {
      nextRepetition = 0;
      nextInterval = 1;
      nextReviewDate = now + 60000; // 1分後
    } else {
      const baseDays = predDays(e, rating);
      const fuzz = baseDays >= 2 ? (0.96 + Math.random() * 0.08) : 1; // 間隔の分散
      nextInterval = Number((baseDays * fuzz).toFixed(2));
      nextEfactor = Math.max(1.3, nextEfactor + (rating === 1 ? -0.15 : rating === 3 ? 0.15 : 0));
      if (rating >= 2) nextRepetition++;
      nextReviewDate = now + Math.round(nextInterval * 86400000);
    }

    return {
      interval: nextInterval,
      repetition: nextRepetition,
      efactor: nextEfactor,
      nextReview: nextReviewDate,
      updatedAt: now,
      reviewUpdatedAt: now
    };
  }

  // --- オフライン復習キュー管理 ---
  function getOfflineQueue() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveOfflineQueue(q) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
      updateOfflineBadgeUI();
    } catch {}
  }

  function queueOfflineReview(record) {
    const q = getOfflineQueue();
    q.push({
      ...record,
      queuedAt: Date.now()
    });
    saveOfflineQueue(q);
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

  async function flushOfflineReviews() {
    const q = getOfflineQueue();
    if (!q.length || !navigator.onLine || !global.VocabSync?.isCloudReady?.()) return;

    try {
      if (global.syncCloudNow) {
        await global.syncCloudNow(false);
        saveOfflineQueue([]);
      }
    } catch {}
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', flushOfflineReviews);
  }

  // --- 触覚フィードバック (Web Vibration API) ---
  function triggerHaptic(type = 'light') {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      if (type === 'light') navigator.vibrate(15);
      else if (type === 'again') navigator.vibrate([40, 50, 40]);
      else if (type === 'good') navigator.vibrate([20, 40, 20]);
      else if (type === 'easy') navigator.vibrate(30);
      else navigator.vibrate(20);
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
    calculateNextReview,
    queueOfflineReview,
    flushOfflineReviews,
    updateOfflineBadgeUI,
    attachSwipeGesture,
    triggerHaptic
  };
})(typeof window !== 'undefined' ? window : globalThis);
