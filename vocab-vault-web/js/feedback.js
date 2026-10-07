/**
 * Vocab Vault — Need Validation & User Feedback Module (js/feedback.js)
 * ステップ0: 需要検証・ヒアリング収集
 */
(function (global) {
  'use strict';

  const FEEDBACK_QUEUE_KEY = 'vv_pending_feedbacks';

  function openFeedbackModal(categoryDefault = 'opinion') {
    const el = document.getElementById('feedbackModal');
    if (!el) return;
    const catSel = document.getElementById('fbCategory');
    if (catSel && categoryDefault) catSel.value = categoryDefault;
    if (typeof global.toggleModal === 'function') {
      global.toggleModal('feedbackModal', true);
    } else {
      el.classList.add('open');
    }
    setTimeout(() => {
      document.getElementById('fbContent')?.focus();
    }, 50);
  }

  function closeFeedbackModal() {
    if (typeof global.toggleModal === 'function') {
      global.toggleModal('feedbackModal', false);
    } else {
      const el = document.getElementById('feedbackModal');
      if (el) el.classList.remove('open');
    }
  }

  async function submitFeedback() {
    const content = document.getElementById('fbContent')?.value.trim();
    const category = document.getElementById('fbCategory')?.value || 'opinion';
    const email = document.getElementById('fbEmail')?.value.trim();
    const willingnessToPay = document.getElementById('fbWtp')?.value || '';
    const rating = document.querySelector('input[name="fbRating"]:checked')?.value || '5';

    if (!content && category !== 'interview') {
      alert('ご意見・ご感想をご記入ください。');
      return;
    }
    if (category === 'interview' && !email) {
      alert('ヒアリングにご協力いただける場合は、連絡先メールアドレスをご記入ください。');
      return;
    }

    const payload = {
      category,
      rating: parseInt(rating, 10),
      content,
      email: email || null,
      willingnessToPay,
      appVersion: '2026-10-pwa',
      activeLang: global.VocabCore?.App?.lang || 'en',
      createdAt: new Date().toISOString()
    };

    const btn = document.getElementById('btnSubmitFb');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '送信中...';
    }

    let sent = false;
    try {
      if (global.VocabSync?.isCloudReady?.()) {
        const cfg = global.VocabSync.getConfig();
        const sess = global.VocabSync.getSession();
        const token = sess?.access_token;
        const reqHeaders = {
          apikey: cfg.anonKey,
          'Content-Type': 'application/json'
        };
        if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${cfg.url}/functions/v1/feedback`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify(payload)
        });
        if (res.ok) sent = true;
      }
    } catch {}

    if (!sent) {
      // ローカルキューに保存（後で同期）
      try {
        const q = JSON.parse(localStorage.getItem(FEEDBACK_QUEUE_KEY) || '[]');
        q.push(payload);
        localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(q));
        sent = true;
      } catch {}
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'フィードバックを送信';
    }

    alert('貴重なご意見をありがとうございます！今後の機能開発およびサービス向上に活用させていただきます。');
    closeFeedbackModal();
    const form = document.getElementById('feedbackForm');
    if (form) form.reset();
  }

  global.VocabFeedback = {
    openFeedbackModal,
    closeFeedbackModal,
    submitFeedback
  };
})(typeof window !== 'undefined' ? window : globalThis);
