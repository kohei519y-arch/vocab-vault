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
  const retainedUtterances = new Set();
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

  let activeHighlightTarget = null;
  let activeOriginalHtml = null;

  function clearActiveWordHighlight() {
    if (activeHighlightTarget) {
      try {
        const actives = activeHighlightTarget.querySelectorAll?.('.spk-active-word') || [];
        for (let i = 0; i < actives.length; i++) {
          actives[i].classList?.remove?.('spk-active-word');
        }
        if (activeOriginalHtml !== null && typeof activeHighlightTarget.innerHTML === 'string' && activeOriginalHtml !== '') {
          activeHighlightTarget.innerHTML = activeOriginalHtml;
        }
      } catch {}
      activeHighlightTarget = null;
      activeOriginalHtml = null;
    }
  }

  let progressTimer = null;
  let speechStartTime = 0;
  let lastBoundaryTime = 0;
  let currentSpeechSessionId = 0;

  /**
   * テキスト要素を単語/文節スパン分割し、発音位置同期ハイライト用のDOM構造を構築
   * 1. Intl.Segmenter（利用可能な場合）によるブラウザネイティブの形態素/単語分割
   * 2. NFC正規化、œ/Œ/æ/Æ合字、タイポグラフィ用アポストロフィ’、結合文字\p{M}の完全対応
   */
  function prepareWordSpans(element, rawText, tLang = 'en') {
    if (!element || typeof element !== 'object') return null;
    clearActiveWordHighlight();
    activeHighlightTarget = element;
    activeOriginalHtml = element.innerHTML || '';

    const text = String(rawText || element.textContent || '').normalize('NFC').trim();
    if (!text) return null;

    // A. Intl.Segmenter によるネイティブ言語処理（Safari 14.1+, Chrome 87+）
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const segLang = tLang === 'ja' ? 'ja' : tLang === 'fr' ? 'fr' : tLang === 'de' ? 'de' : 'en';
        const segmenter = new Intl.Segmenter(segLang, { granularity: 'word' });
        const rawSegments = Array.from(segmenter.segment(text));

        // フランス語エリジオン（l', d', c', j', n', s', qu' 等）や短縮形（don't, it's）の結合処理
        const mergedWords = [];
        let cur = 0;
        while (cur < rawSegments.length) {
          const seg = rawSegments[cur];
          let wordStr = seg.segment;
          const startIndex = seg.index;
          let endIndex = startIndex + wordStr.length;

          // 短縮前置詞・冠詞（l', d', etc.）と後続語の結合判定
          if (seg.isWordLike && cur + 2 < rawSegments.length) {
            const next1 = rawSegments[cur + 1];
            const next2 = rawSegments[cur + 2];
            if (next1 && (/^['’]$/.test(next1.segment)) && next2 && next2.isWordLike && (next1.index === endIndex)) {
              wordStr = text.slice(startIndex, next2.index + next2.segment.length);
              endIndex = startIndex + wordStr.length;
              cur += 2;
            }
          }

          const isWord = seg.isWordLike || (tLang === 'ja' && wordStr.trim() && !/^[、。！？\s]+$/.test(wordStr));
          mergedWords.push({ word: wordStr, start: startIndex, end: endIndex, isWord });
          cur++;
        }

        const spansHtml = [];
        let curPos = 0;
        let wordIdx = 0;

        for (let i = 0; i < mergedWords.length; i++) {
          const m = mergedWords[i];
          if (m.start > curPos) {
            spansHtml.push(esc(text.slice(curPos, m.start)));
          }
          if (m.isWord) {
            spansHtml.push(`<span class="spk-word" data-word-idx="${wordIdx++}" data-start="${m.start}" data-end="${m.end}">${esc(m.word)}</span>`);
          } else {
            spansHtml.push(esc(m.word));
          }
          curPos = m.end;
        }
        if (curPos < text.length) spansHtml.push(esc(text.slice(curPos)));
        element.innerHTML = spansHtml.join('');
        return element;
      } catch {}
    }

    // B. 正規表現フォールバック（JSC環境やIntl.Segmenter非対応環境）
    const spansHtml = [];
    const wordRegex = tLang === 'ja'
      ? /[\u4E00-\u9FFF]+|[\u30A0-\u30FF]+|[\u3040-\u309F]+|[\p{L}\p{N}\p{M}œŒæÆ'-]+|[、。！？\n]/gu
      : /[\p{L}\p{N}\p{M}œŒæÆ]+(?:['’][\p{L}\p{N}\p{M}œŒæÆ]+)*|[\p{L}\p{N}\p{M}œŒæÆ'-]+/gu;

    let lastIndex = 0;
    let match;
    let fallbackIdx = 0;

    while ((match = wordRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchWord = match[0];
      if (matchIndex > lastIndex) {
        spansHtml.push(esc(text.slice(lastIndex, matchIndex)));
      }
      spansHtml.push(`<span class="spk-word" data-word-idx="${fallbackIdx++}" data-start="${matchIndex}" data-end="${matchIndex + matchWord.length}">${esc(matchWord)}</span>`);
      lastIndex = matchIndex + matchWord.length;
    }
    if (lastIndex < text.length) {
      spansHtml.push(esc(text.slice(lastIndex)));
    }

    element.innerHTML = spansHtml.join('');
    return element;
  }

  /**
   * 指定した文字インデックスまたは単語インデックスの単語スパンをリアルタイムハイライト
   * WebKit (word index) と Chromium (charIndex) の双方に完全適応
   */
  function highlightSpokenWord(container, charIndex) {
    if (!container || typeof container.querySelectorAll !== 'function') return;
    const spans = container.querySelectorAll('.spk-word');
    if (!spans || !spans.length) return;

    let targetSpan = null;
    const numSpans = spans.length;

    // A. WebKit / Safari 単語インデックス適応モード
    // charIndex が小整数 (0 <= charIndex < numSpans) で、末尾単語の文字開始位置と大きく乖離している場合は word-idx と判定
    const lastStart = parseInt(spans[numSpans - 1]?.getAttribute('data-start'), 10) || 0;
    if (charIndex >= 0 && charIndex < numSpans && lastStart > numSpans * 2) {
      targetSpan = spans[charIndex];
    }

    // B. 文字オフセット (UTF-16 offset) による厳密マッチ & 最近傍スナップ
    if (!targetSpan) {
      for (let i = 0; i < numSpans; i++) {
        const s = spans[i];
        const start = parseInt(s.getAttribute('data-start'), 10) || 0;
        const end = parseInt(s.getAttribute('data-end'), 10) || 0;

        if (charIndex >= start && charIndex < end) {
          targetSpan = s;
          break;
        }

        // 単語間の空白・約物にある場合は直前の発話単語を維持
        if (i < numSpans - 1) {
          const nextStart = parseInt(spans[i + 1].getAttribute('data-start'), 10) || 0;
          if (charIndex >= start && charIndex < nextStart) {
            targetSpan = s;
            break;
          }
        } else if (charIndex >= start) {
          targetSpan = s;
        }
      }
    }

    if (!targetSpan) return;

    // 現在すでにアクティブな場合は不要なDOM再描画をスキップ
    const isAlreadyActive = typeof targetSpan.classList?.contains === 'function'
      ? targetSpan.classList.contains('spk-active-word')
      : Boolean(targetSpan.className && targetSpan.className.indexOf('spk-active-word') !== -1);
    if (isAlreadyActive) return;

    for (let i = 0; i < numSpans; i++) {
      const s = spans[i];
      if (s !== targetSpan) {
        if (typeof s.classList?.remove === 'function') {
          s.classList.remove('spk-active-word');
        } else if (s.className) {
          s.className = s.className.replace(/\bspk-active-word\b/g, '').trim();
        }
      }
    }

    if (typeof targetSpan.classList?.add === 'function') {
      targetSpan.classList.add('spk-active-word');
    } else {
      targetSpan.className = ((targetSpan.className || '') + ' spk-active-word').trim();
    }
    if (typeof targetSpan.scrollIntoView === 'function' && container.scrollHeight > container.clientHeight) {
      targetSpan.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }

  function stopSpeech() {
    currentSpeechSessionId++; // 世代トークンをインクリメントし過去発話の遅延イベントを無効化
    clearActiveWordHighlight();
    if (typeof document !== 'undefined') {
      try {
        const residual = document.querySelectorAll('.spk-active-word');
        for (let i = 0; i < residual.length; i++) {
          residual[i].classList?.remove?.('spk-active-word');
        }
      } catch {}
    }
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (currentAudioEl) {
      try {
        currentAudioEl.onended = null;
        currentAudioEl.onerror = null;
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
    retainedUtterances.clear();
    activeUtter = null;
    if (typeof activeOnEnd === 'function') {
      const cb = activeOnEnd;
      activeOnEnd = null;
      try { cb(); } catch {}
    }
  }

  /**
   * ネットワークオーディオ・フォールバック再生
   * Web Speech API が利用不可/失敗した場合のフェイルオーバー (Free Dictionary API & Google TTS)
   */
  function tryPlayExternalAudio(clean, l, onEnd = null, targetEl = null) {
    if (typeof Audio === 'undefined') {
      if (typeof onEnd === 'function') onEnd();
      return;
    }
    const cacheKey = `${l}:${clean.toLowerCase()}`;
    const cachedUrl = audioCache.get(cacheKey);
    const urls = [];
    if (cachedUrl) urls.push(cachedUrl);
    if (l === 'en' && !clean.includes(' ')) {
      urls.push(`https://api.dictionaryapi.dev/media/pronunciations/en/${encodeURIComponent(clean.toLowerCase())}-us.mp3`);
    }
    const cleanQuery = clean.length > 180 ? clean.slice(0, 180) : clean;
    urls.push(`https://translate.google.com/translate_tts?ie=UTF-8&tl=${l}&client=tw-ob&q=${encodeURIComponent(cleanQuery)}`);

    function tryNext(idx) {
      if (idx >= urls.length) {
        if (typeof onEnd === 'function') onEnd();
        return;
      }
      try {
        let settled = false;
        const audio = new Audio(urls[idx]);
        audio.referrerPolicy = 'no-referrer';
        currentAudioEl = audio;
        if (targetEl) {
          prepareWordSpans(targetEl, clean, l);
          audio.ontimeupdate = () => {
            if (audio.duration && targetEl) {
              const p = audio.currentTime / audio.duration;
              const estIndex = Math.floor(p * clean.length);
              highlightSpokenWord(targetEl, estIndex);
            }
          };
        }
        audio.onended = () => {
          if (settled) return;
          settled = true;
          if (currentAudioEl === audio) currentAudioEl = null;
          clearActiveWordHighlight();
          if (typeof onEnd === 'function') onEnd();
        };
        audio.onerror = () => {
          if (settled) return;
          settled = true;
          if (currentAudioEl === audio) currentAudioEl = null;
          tryNext(idx + 1);
        };
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(() => {
            audioCache.set(cacheKey, urls[idx]);
          }).catch(() => {
            if (settled) return;
            settled = true;
            if (currentAudioEl === audio) currentAudioEl = null;
            tryNext(idx + 1);
          });
        }
      } catch {
        tryNext(idx + 1);
      }
    }
    tryNext(0);
  }

  let activeOnEnd = null;

  function playSpeechFallback(clean, l, defTag, ttsRate = 0.95, targetEl = null, onEnd = null) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (activeOnEnd === finish) activeOnEnd = null;
      if (typeof onEnd === 'function') onEnd();
    };
    activeOnEnd = finish;

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      tryPlayExternalAudio(clean, l, finish, targetEl);
      return;
    }
    try {
      if (window.speechSynthesis.paused) {
        try { window.speechSynthesis.resume(); } catch {}
      }
      const v = pickBestVoice(l);
      const u = new SpeechSynthesisUtterance(clean);
      activeUtter = u;
      retainedUtterances.add(u);
      const thisSessionId = ++currentSpeechSessionId;

      if (targetEl) {
        prepareWordSpans(targetEl, clean, l);
      }

      speechStartTime = 0;
      lastBoundaryTime = 0;
      let boundarySeen = false;

      // 1. Boundary イベント（Chrome等の高精度ミリ秒同期 ＆ 発話世代トークン検査 ＆ word境界厳密判定）
      u.onboundary = event => {
        if (thisSessionId !== currentSpeechSessionId) return;
        boundarySeen = true;
        lastBoundaryTime = Date.now();
        if (targetEl && typeof event.charIndex === 'number') {
          highlightSpokenWord(targetEl, event.charIndex);
        }
      };

      u.onstart = () => {
        if (thisSessionId !== currentSpeechSessionId) return;
        speechStartTime = Date.now();
      };

      // 2. 時間補間ハイブリッドフォールバック（Watchdog方式: boundary未発火環境または途絶時のみ介入）
      if (targetEl && typeof setInterval === 'function') {
        const msPerChar = l === 'ja' ? 110 : l === 'fr' ? 52 : l === 'de' ? 68 : 58;
        const totalEstimatedDuration = Math.max(700, (clean.length * msPerChar) / (Number(ttsRate) || 0.95));

        progressTimer = setInterval(() => {
          if (thisSessionId !== currentSpeechSessionId) {
            clearInterval(progressTimer);
            progressTimer = null;
            return;
          }
          if (boundarySeen && (Date.now() - lastBoundaryTime < 400)) return;
          if (!speechStartTime) return;

          const elapsed = Date.now() - speechStartTime;
          const progress = Math.min(0.98, elapsed / totalEstimatedDuration);
          const estIndex = Math.floor(progress * clean.length);
          highlightSpokenWord(targetEl, estIndex);
        }, 80);
      }

      u.onend = () => {
        retainedUtterances.delete(u);
        if (thisSessionId === currentSpeechSessionId) {
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
          }
          activeUtter = null;
          clearActiveWordHighlight();
          finish();
        }
      };

      u.onerror = event => {
        retainedUtterances.delete(u);
        if (thisSessionId === currentSpeechSessionId) {
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
          }
          activeUtter = null;
          clearActiveWordHighlight();
          if (event && event.error !== 'canceled' && event.error !== 'interrupted') {
            tryPlayExternalAudio(clean, l, finish, targetEl);
          } else {
            finish();
          }
        }
      };

      if (v) u.voice = v;
      u.lang = v?.lang ? String(v.lang).replace('_', '-') : defTag;
      u.rate = Number(ttsRate) || 0.95;
      window.speechSynthesis.speak(u);

      // [P1-4 解決] 2段階 Watchdog: Safari等の保留(pending)無音スタック対策 ＆ 1500ms未開始時の安全キャンセル・外部音声フェイルオーバー
      if (typeof setTimeout === 'function') {
        // 第1段階: 250msでスタックしたキューの resume()
        setTimeout(() => {
          if (thisSessionId === currentSpeechSessionId && !speechStartTime && window.speechSynthesis.pending) {
            try { window.speechSynthesis.resume(); } catch {}
          }
        }, 250);

        // 第2段階: 1500ms経過しても音声開始しない場合は永久スタックを遮断しタイマーリークを防ぐ
        setTimeout(() => {
          if (thisSessionId === currentSpeechSessionId && !speechStartTime) {
            if (progressTimer) {
              clearInterval(progressTimer);
              progressTimer = null;
            }
            try { window.speechSynthesis.cancel(); } catch {}
            retainedUtterances.delete(u);
            activeUtter = null;
            clearActiveWordHighlight();
            tryPlayExternalAudio(clean, l, finish, targetEl);
          }
        }, 1500);
      }
    } catch {
      tryPlayExternalAudio(clean, l, finish, targetEl);
    }
  }

  function speakText(text, tLang = 'en', ttsRate = null, targetElement = null, onEnd = null) {
    if (!text) {
      if (typeof onEnd === 'function') onEnd();
      return;
    }
    const clean = String(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').normalize('NFC').trim();
    if (!clean) {
      if (typeof onEnd === 'function') onEnd();
      return;
    }
    const l = ['en', 'fr', 'de', 'ja'].includes(tLang) ? tLang : 'en';
    const defTag = l === 'fr' ? 'fr-FR' : l === 'de' ? 'de-DE' : l === 'ja' ? 'ja-JP' : 'en-US';

    const effectiveRate = Number(ttsRate) || (typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem('vv_tts_rate') || '0.95') : 0.95) || 0.95;

    if (global.VocabSRS?.triggerHaptic) {
      global.VocabSRS.triggerHaptic('light');
    }

    stopSpeech();

    // ターゲット要素の自動解決（未指定時はカードの関連要素を探す）
    let targetEl = targetElement;
    if (!targetEl && typeof document !== 'undefined') {
      const aWord = document.getElementById('aWord');
      const aEx = document.querySelector('.anki-ex-foreign');
      if (aEx && aEx.textContent && aEx.textContent.includes(clean.slice(0, 10))) {
        targetEl = aEx;
      } else if (aWord && aWord.textContent && aWord.textContent.trim().startsWith(clean.slice(0, 5))) {
        targetEl = aWord;
      }
    }

    const cacheKey = `${l}:${clean.toLowerCase()}`;
    const cachedUrl = audioCache.get(cacheKey);
    if (cachedUrl && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(cachedUrl);
        audio.referrerPolicy = 'no-referrer';
        currentAudioEl = audio;
        if (targetEl) {
          prepareWordSpans(targetEl, clean, l);
          audio.ontimeupdate = () => {
            if (audio.duration && targetEl) {
              const p = audio.currentTime / audio.duration;
              const estIndex = Math.floor(p * clean.length);
              highlightSpokenWord(targetEl, estIndex);
            }
          };
        }
        audio.onended = () => {
          if (currentAudioEl === audio) currentAudioEl = null;
          clearActiveWordHighlight();
          if (typeof onEnd === 'function') onEnd();
        };
        audio.onerror = () => {
          if (currentAudioEl === audio) currentAudioEl = null;
          playSpeechFallback(clean, l, defTag, effectiveRate, targetEl, onEnd);
        };
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => playSpeechFallback(clean, l, defTag, effectiveRate, targetEl, onEnd));
        }
        return;
      } catch {}
    }

    playSpeechFallback(clean, l, defTag, effectiveRate, targetEl, onEnd);
  }

  /**
   * 非同期Promise版発話ヘルパー（Audio Playlist等の順次実行用）
   */
  function speakTextAsync(text, tLang = 'en', ttsRate = null, targetElement = null) {
    return new Promise(resolve => {
      let resolved = false;
      const safeResolve = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      // 安全フェイルセーフタイマー (文字数に応じた時間 + 4秒バッファ)
      const cleanLen = String(text || '').length;
      const msPerChar = tLang === 'ja' ? 140 : 85;
      const safeTimeout = Math.max(3000, (cleanLen * msPerChar) + 4000);
      const timer = setTimeout(safeResolve, safeTimeout);

      speakText(text, tLang, ttsRate, targetElement, () => {
        clearTimeout(timer);
        safeResolve();
      });
    });
  }

  // --- 耳学・自動連続再生（Audio Playlist モード） ---
  const playlistState = {
    isRunning: false,
    isPaused: false,
    currentIndex: 0,
    items: [],
    sessionToken: 0,
    stepTimer: null
  };

  function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function updatePlaylistUI() {
    if (typeof document === 'undefined') return;
    const bar = document.getElementById('audioPlaylistBar');
    if (!bar) return;

    if (!playlistState.isRunning) {
      bar.classList.remove('active');
      document.body?.classList.remove('audio-playlist-open');
      const prevActive = document.querySelectorAll('.playlist-active-card');
      prevActive.forEach(el => el.classList.remove('playlist-active-card'));
      return;
    }

    bar.classList.add('active');
    document.body?.classList.add('audio-playlist-open');

    const curItem = playlistState.items[playlistState.currentIndex];
    const apWord = document.getElementById('apWord');
    const apPho = document.getElementById('apPho');
    const apMeta = document.getElementById('apMeta');
    const apProgFill = document.getElementById('apProgFill');
    const apPlayIcon = document.getElementById('apPlayIcon');

    if (curItem) {
      if (apWord) apWord.textContent = curItem.word || '';
      if (apPho) apPho.textContent = curItem.phonetic ? `[ ${curItem.phonetic} ]` : '';
      if (apMeta) {
        const meaning = curItem.meanings?.[0]?.text || '';
        const curNum = playlistState.currentIndex + 1;
        const totalNum = playlistState.items.length;
        const stateTxt = playlistState.isPaused ? '（一時停止中）' : '';
        apMeta.textContent = `${curNum}/${totalNum}語 ${meaning ? '・' + meaning : ''} ${stateTxt}`;
      }
      if (apProgFill) {
        const pct = Math.round(((playlistState.currentIndex + 1) / Math.max(1, playlistState.items.length)) * 100);
        apProgFill.style.width = `${pct}%`;
      }

      // リスト内の対応カードをハイライト＆スクロール
      const prevActive = document.querySelectorAll('.playlist-active-card');
      prevActive.forEach(el => el.classList.remove('playlist-active-card'));
      if (curItem.id || curItem.word) {
        const card = document.querySelector(`.card[data-id="${curItem.id}"]`) ||
                     document.querySelector(`.card[data-raw-word="${curItem.word}"]`) ||
                     document.querySelector(`.card[data-word="${curItem.word}"]`);
        if (card) {
          card.classList.add('playlist-active-card');
          try {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch {
            card.scrollIntoView();
          }
        }
      }
    }

    if (apPlayIcon) {
      if (playlistState.isPaused) {
        // 再生アイコン (三角)
        apPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      } else {
        // 一時停止アイコン (2本線)
        apPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      }
    }
  }

  async function runPlaylistLoop(token) {
    while (playlistState.isRunning && token === playlistState.sessionToken) {
      if (playlistState.currentIndex >= playlistState.items.length) {
        // 全単語再生完了
        stopAudioPlaylist();
        if (global.VocabModal?.showToast) {
          global.VocabModal.showToast('耳学プレイリストの再生が完了しました。', 'ok', 4000);
        }
        break;
      }

      if (playlistState.isPaused) {
        await waitMs(300);
        continue;
      }

      const item = playlistState.items[playlistState.currentIndex];
      if (!item) {
        playlistState.currentIndex++;
        continue;
      }

      updatePlaylistUI();

      const itemLang = item.lang || (global.VocabCore?.App?.lang) || 'en';
      const targetLang = item.targetLang || item.tgtLang || (global.VocabCore?.App?.tgtLang) || 'ja';

      // 1. 単語の発音（外国語）
      if (!playlistState.isRunning || token !== playlistState.sessionToken) break;
      await speakTextAsync(item.word, itemLang);
      if (!playlistState.isRunning || token !== playlistState.sessionToken) break;

      // 2. 想起ポーズ（ユーザーが意味を頭で思い出すインターバル: 1.5秒）
      for (let i = 0; i < 15; i++) {
        if (!playlistState.isRunning || token !== playlistState.sessionToken) break;
        while (playlistState.isPaused && playlistState.isRunning && token === playlistState.sessionToken) {
          await waitMs(200);
        }
        await waitMs(100);
      }
      if (!playlistState.isRunning || token !== playlistState.sessionToken) break;

      // 3. 訳語の発音
      const priMeaning = item.meanings?.[0]?.text;
      if (priMeaning) {
        await speakTextAsync(priMeaning, targetLang, 1.05);
      }
      if (!playlistState.isRunning || token !== playlistState.sessionToken) break;

      // 短い息継ぎ (0.6秒)
      await waitMs(600);
      if (!playlistState.isRunning || token !== playlistState.sessionToken) break;

      // 4. 例文の発音（もしあれば）
      const exForeign = item.example?.foreign || item.example?.en || item.example?.f;
      if (exForeign) {
        await speakTextAsync(exForeign, itemLang, 0.92);
        if (!playlistState.isRunning || token !== playlistState.sessionToken) break;

        // 例文対訳があれば発音、なければ短いポーズ
        const exTrans = item.example?.japanese || item.example?.ja || item.example?.trans;
        if (exTrans) {
          await waitMs(500);
          if (!playlistState.isRunning || token !== playlistState.sessionToken) break;
          await speakTextAsync(exTrans, targetLang, 1.05);
        }
      }

      // 5. 単語間のインターバル (1.2秒)
      for (let i = 0; i < 12; i++) {
        if (!playlistState.isRunning || token !== playlistState.sessionToken) break;
        while (playlistState.isPaused && playlistState.isRunning && token === playlistState.sessionToken) {
          await waitMs(200);
        }
        await waitMs(100);
      }

      if (!playlistState.isRunning || token !== playlistState.sessionToken) break;
      playlistState.currentIndex++;
    }
  }

  function startAudioPlaylist(items = null, startIndex = 0) {
    let playList = Array.isArray(items) && items.length ? items : null;
    if (!playList) {
      // 現在のアプリ状態または表示中リストから取得
      const getFilteredFn = global.VocabCore?.getFiltered || global.getFiltered || (global.VocabSearch?.getFiltered ? () => global.VocabSearch.getFiltered(global.VocabCore?.App || global.App) : null);
      if (typeof getFilteredFn === 'function') {
        const filtered = getFilteredFn();
        if (Array.isArray(filtered) && filtered.length) {
          playList = filtered;
        }
      }
      if (!playList) {
        const app = global.VocabCore?.App || global.App;
        if (app?.entries && app.entries.length) {
          playList = app.entries;
        }
      }
    }

    if (!playList || !playList.length) {
      if (global.VocabModal?.showToast) {
        global.VocabModal.showToast('再生可能な単語が見つかりません。単語を登録またはフィルタを解除してください。', 'warn', 3500);
      }
      return;
    }

    playlistState.items = playList;
    playlistState.currentIndex = Math.max(0, Math.min(startIndex, playList.length - 1));
    playlistState.isRunning = true;
    playlistState.isPaused = false;
    playlistState.sessionToken++;

    updatePlaylistUI();

    if (global.VocabModal?.showToast) {
      global.VocabModal.showToast(`耳学・連続リスニングを開始しました（全${playList.length}語）。`, 'ok', 3000);
    }

    runPlaylistLoop(playlistState.sessionToken);
  }

  function stopAudioPlaylist() {
    playlistState.isRunning = false;
    playlistState.isPaused = false;
    playlistState.sessionToken++;
    stopSpeech();
    updatePlaylistUI();
  }

  function pauseAudioPlaylist() {
    if (!playlistState.isRunning) return;
    playlistState.isPaused = true;
    stopSpeech();
    updatePlaylistUI();
  }

  function resumeAudioPlaylist() {
    if (!playlistState.isRunning) return;
    playlistState.isPaused = false;
    updatePlaylistUI();
  }

  function toggleAudioPlaylist() {
    if (!playlistState.isRunning) {
      startAudioPlaylist();
    } else if (playlistState.isPaused) {
      resumeAudioPlaylist();
    } else {
      pauseAudioPlaylist();
    }
  }

  function nextPlaylistItem() {
    if (!playlistState.isRunning) return;
    if (playlistState.currentIndex < playlistState.items.length - 1) {
      playlistState.currentIndex++;
      playlistState.sessionToken++;
      stopSpeech();
      updatePlaylistUI();
      runPlaylistLoop(playlistState.sessionToken);
    } else {
      stopAudioPlaylist();
    }
  }

  function prevPlaylistItem() {
    if (!playlistState.isRunning) return;
    if (playlistState.currentIndex > 0) {
      playlistState.currentIndex--;
      playlistState.sessionToken++;
      stopSpeech();
      updatePlaylistUI();
      runPlaylistLoop(playlistState.sessionToken);
    }
  }

  function getPlaylistState() {
    return {
      isRunning: playlistState.isRunning,
      isPaused: playlistState.isPaused,
      currentIndex: playlistState.currentIndex,
      totalItems: playlistState.items.length
    };
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
    speakTextAsync,
    stopSpeech,
    prepareWordSpans,
    highlightSpokenWord,
    clearActiveWordHighlight,
    audioCache,
    // 耳学・連続再生
    startAudioPlaylist,
    stopAudioPlaylist,
    pauseAudioPlaylist,
    resumeAudioPlaylist,
    toggleAudioPlaylist,
    nextPlaylistItem,
    prevPlaylistItem,
    getPlaylistState
  };
})(typeof window !== 'undefined' ? window : globalThis);
