/**
 * Vocab Vault — Native Speech Synthesis Engine (js/speech.js)
 * High-fidelity Multilingual Audio Pronunciation & Voice Optimization (EN, FR, DE, JA)
 */
(function (global) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  const SPK_SVG = `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  const mkSpkBtn = (txt, l, sm = false) => txt ? `<button type="button" class="spk-btn ${sm ? 'sm' : ''}" data-act="speak" data-text="${esc(txt)}" data-lang="${esc(l)}" title="ネイティブ発音" aria-label="発音">${SPK_SVG}</button>` : '';

  const JP_VOICE_TOKENS = ['ja-', 'ja_', 'jpn', 'japan', 'kyoko', 'otoya', 'haruka', 'ayumi', 'ichiro', 'sayaka', 'nanami', 'keita', 'daichi', 'mizuki', 'takumi', '日本', '日本語'];
  const QUALITY_TOKENS = ['natural', 'online', 'neural', 'premium', 'enhanced', 'siri'];
  const PREF_VOICE_NAMES = [
    'samantha', 'ava', 'allison', 'alex', 'victoria', 'daniel', 'karen', 'moira', 'serena', 'thomas',
    'amelie', 'audrey', 'aurelie', 'anna', 'petra', 'marlene', 'viktor',
    'google us english', 'google uk english', 'google français', 'google deutsch',
    'microsoft aria', 'microsoft jenny', 'microsoft guy', 'microsoft ryan', 'microsoft sonia',
    'microsoft denise', 'microsoft henri', 'microsoft katja', 'microsoft conrad'
  ];

  let voicesCache = [];
  let bestVoiceMap = {};
  let speakTimer = null;
  let activeUtter = null;
  const audioCache = new Map();
  let currentAudioEl = null;

  function loadVoices() {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const vs = window.speechSynthesis.getVoices() || [];
        if (vs.length) {
          voicesCache = vs;
          bestVoiceMap = {};
        }
      }
    } catch {}
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    loadVoices();
    try { window.speechSynthesis.onvoiceschanged = loadVoices; } catch {}
  }

  function pickBestVoice(tLang) {
    if (bestVoiceMap[tLang]) return bestVoiceMap[tLang];
    if (!voicesCache.length) loadVoices();
    const pref = tLang === 'fr' ? ['fr-fr', 'fr-ca'] : tLang === 'de' ? ['de-de', 'de-at'] : tLang === 'ja' ? ['ja-jp'] : ['en-us', 'en-gb'];
    const cands = voicesCache.filter(v => {
      const l = String(v.lang || '').replace('_', '-').toLowerCase();
      const full = `${v.name} ${v.voiceURI} ${l}`.toLowerCase();
      if (tLang === 'ja') return l.startsWith('ja') || JP_VOICE_TOKENS.some(tok => full.includes(tok));
      return l.startsWith(tLang) && !JP_VOICE_TOKENS.some(tok => full.includes(tok));
    });
    if (!cands.length) return null;
    const scoreVoice = v => {
      const n = `${v.name} ${v.voiceURI}`.toLowerCase(), l = String(v.lang || '').replace('_', '-').toLowerCase();
      let pt = l === pref[0] ? 100 : l === pref[1] ? 85 : l.startsWith(tLang + '-') ? 70 : 40;
      if (QUALITY_TOKENS.some(tok => n.includes(tok))) pt += 50;
      if (PREF_VOICE_NAMES.some(tok => n.includes(tok))) pt += 40;
      if (n.includes('compact') || n.includes('espeak')) pt -= 30;
      return pt;
    };
    cands.sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return (bestVoiceMap[tLang] = cands[0]);
  }

  function stopSpeech() {
    if (currentAudioEl) {
      try {
        currentAudioEl.pause();
        currentAudioEl.currentTime = 0;
      } catch {}
      currentAudioEl = null;
    }
    if (typeof clearTimeout === 'function') clearTimeout(speakTimer);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }
    activeUtter = null;
  }

  function playSpeechFallback(clean, l, defTag, ttsRate = 0.95) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
      const v = pickBestVoice(l);
      const u = new SpeechSynthesisUtterance(clean);
      activeUtter = u;
      u.onend = u.onerror = () => { if (activeUtter === u) activeUtter = null; };
      if (v) u.voice = v;
      u.lang = v?.lang ? String(v.lang).replace('_', '-') : defTag;
      u.rate = Number(ttsRate) || 0.95;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function speakText(text, tLang = 'en', ttsRate = 0.95) {
    if (!text) return;
    const clean = String(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const l = ['en', 'fr', 'de', 'ja'].includes(tLang) ? tLang : 'en';
    const defTag = l === 'fr' ? 'fr-FR' : l === 'de' ? 'de-DE' : l === 'ja' ? 'ja-JP' : 'en-US';

    if (global.VocabSRS?.triggerHaptic) {
      global.VocabSRS.triggerHaptic('light');
    }

    stopSpeech();

    const cacheKey = `${l}:${clean.toLowerCase()}`;
    const cachedUrl = audioCache.get(cacheKey);
    if (cachedUrl && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(cachedUrl);
        currentAudioEl = audio;
        audio.play().catch(() => playSpeechFallback(clean, l, defTag, ttsRate));
        return;
      } catch {}
    }

    playSpeechFallback(clean, l, defTag, ttsRate);
  }

  // --- グローバルエクスポート ---
  global.VocabSpeech = {
    SPK_SVG,
    mkSpkBtn,
    JP_VOICE_TOKENS,
    QUALITY_TOKENS,
    PREF_VOICE_NAMES,
    loadVoices,
    pickBestVoice,
    speakText,
    stopSpeech,
    audioCache
  };
})(typeof window !== 'undefined' ? window : globalThis);
