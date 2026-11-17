/**
 * Vocab Vault — Need Validation & User Feedback Module (js/feedback.js)
 */
(function (global) {
  'use strict';

  const FEEDBACK_QUEUE_KEY = 'vv_pending_feedbacks';

  /** @param {any} [categoryOrOpts] */
  function openFeedbackModal(categoryOrOpts = 'opinion') {
    const el = document.getElementById('feedbackModal');
    if (!el) return;
    const catSel = /** @type {any} */ (document.getElementById('fbCategory'));
    const contentEl = /** @type {any} */ (document.getElementById('fbContent'));
    if (typeof categoryOrOpts === 'string') {
      if (catSel) catSel.value = categoryOrOpts;
    } else if (categoryOrOpts && typeof categoryOrOpts === 'object') {
      if (catSel) catSel.value = categoryOrOpts.category || 'bug';
      if (contentEl && categoryOrOpts.initialMessage) {
        contentEl.value = categoryOrOpts.initialMessage;
      }
    }
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

  async function sendFeedbackToSupabase(dbRow) {
    const cfg = global.VocabSync?.getConfig?.();
    if (!cfg || !cfg.configured) return false;
    const sess = global.VocabSync?.getSession?.();
    const token = sess?.access_token;
    const reqHeaders = {
      apikey: cfg.anonKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

    const payload = {
      user_id: sess?.user?.id || null,
      category: String(dbRow.category || 'opinion').slice(0, 50),
      rating: Number(dbRow.rating) || 5,
      content: String(dbRow.content || '').slice(0, 5000),
      email: dbRow.email ? String(dbRow.email).slice(0, 255) : null,
      willingnessToPay: String(dbRow.willingness_to_pay || dbRow.willingnessToPay || '').slice(0, 50),
      appVersion: String(dbRow.app_version || dbRow.appVersion || '2026-10-pwa').slice(0, 50),
      activeLang: String(dbRow.active_lang || dbRow.activeLang || 'en').slice(0, 20)
    };

    try {
      const fnRes = await fetch(`${cfg.url}/functions/v1/feedback`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload)
      });
      if (fnRes.ok) return true;
      if (fnRes.status !== 404) return false;
    } catch {}

    const res = await fetch(`${cfg.url}/rest/v1/user_feedbacks`, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        user_id: payload.user_id,
        category: payload.category,
        rating: payload.rating,
        content: payload.content,
        email: payload.email,
        willingness_to_pay: payload.willingnessToPay,
        app_version: payload.appVersion,
        active_lang: payload.activeLang
      })
    });
    return res.ok;
  }

  async function flushPendingFeedbacks() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      const raw = localStorage.getItem(FEEDBACK_QUEUE_KEY);
      if (!raw) return;
      const q = JSON.parse(raw);
      if (!Array.isArray(q) || !q.length) return;
      const remaining = [];
      for (const item of q) {
        const ok = await sendFeedbackToSupabase(item).catch(() => false);
        if (!ok) remaining.push(item);
      }
      if (remaining.length > 0) {
        localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(remaining.slice(-50)));
      } else {
        localStorage.removeItem(FEEDBACK_QUEUE_KEY);
      }
    } catch {}
  }

  let _isSubmittingFeedback = false;

  async function submitFeedback() {
    if (_isSubmittingFeedback) return;
    const content = /** @type {any} */ (document.getElementById('fbContent'))?.value.trim() || '';
    const category = /** @type {any} */ (document.getElementById('fbCategory'))?.value || 'opinion';
    const email = /** @type {any} */ (document.getElementById('fbEmail'))?.value.trim() || '';
    const willingnessToPay = /** @type {any} */ (document.getElementById('fbWtp'))?.value || '';
    const rating = /** @type {any} */ (document.querySelector('input[name="fbRating"]:checked'))?.value || '5';

    const notify = (msg, type = 'info') => {
      if (global.VocabModal?.showToast) global.VocabModal.showToast(msg, type);
      else if (typeof global.showToast === 'function') global.showToast(msg, type);
    };

    if (!content && category !== 'interview') {
      notify(global.VocabI18n?.t ? global.VocabI18n.t('fb.alert_fill') : 'ご意見・ご感想をご記入ください。', 'warn');
      return;
    }
    if (category === 'interview' && !email) {
      notify(global.VocabI18n?.t ? global.VocabI18n.t('fb.alert_email') : 'ヒアリングにご協力いただける場合は、連絡先メールアドレスをご記入ください。', 'warn');
      return;
    }

    const dbRow = {
      category,
      rating: parseInt(rating, 10) || 5,
      content,
      email: email || null,
      willingness_to_pay: willingnessToPay,
      app_version: '2026-10-pwa',
      active_lang: global.VocabCore?.App?.lang || 'en'
    };

    const btn = /** @type {HTMLButtonElement | null} */ (document.getElementById('btnSubmitFb'));
    _isSubmittingFeedback = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = global.VocabI18n?.t ? global.VocabI18n.t('fb.sending') : '送信中...';
    }

    try {
      let sent = false;
      try {
        sent = await sendFeedbackToSupabase(dbRow);
      } catch {}

      if (!sent) {
        try {
          const q = JSON.parse(localStorage.getItem(FEEDBACK_QUEUE_KEY) || '[]');
          q.push(dbRow);
          localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(q.slice(-50)));
        } catch {}
      }

      notify(global.VocabI18n?.t ? global.VocabI18n.t('fb.alert_thanks') : '貴重なご意見をありがとうございます！今後の機能開発およびサービス向上に活用させていただきます。', 'ok');
      closeFeedbackModal();
      const form = /** @type {HTMLFormElement | null} */ (document.getElementById('feedbackForm'));
      if (form && typeof form.reset === 'function') form.reset();
    } finally {
      _isSubmittingFeedback = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = global.VocabI18n?.t ? global.VocabI18n.t('fb.submit') : 'フィードバックを送信';
      }
    }
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', flushPendingFeedbacks);
    setTimeout(flushPendingFeedbacks, 4000);
  }

  global.VocabFeedback = {
    openFeedbackModal,
    closeFeedbackModal,
    submitFeedback,
    flushPendingFeedbacks
  };
})(typeof window !== 'undefined' ? window : globalThis);

export {};
