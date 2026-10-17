/**
 * Vocab Vault — Export, Backup & Import Module (js/export.js)
 * High-fidelity Data Portability: Anki TSV, Obsidian Markdown, Full Multi-Language JSON
 */
(function (global) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const cleanPho = p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim();
  const fmtPho = p => { const c = cleanPho(p); return c ? `[ ${c} ]` : ''; };
  const normRootKey = r => global.VocabMorphology?.normRootKey?.(r) || global.normRootKey?.(r) || (String(r || '').startsWith('*') ? String(r || '').trim().toLowerCase() : `*${String(r || '').trim().toLowerCase()}`);

  /**
   * ブラウザ上でBlobデータをファイルとして即時ダウンロード（macOSネイティブ保存ダイアログ連動）
   */
  function dlBlob(parts, type, name) {
    if (typeof document === 'undefined') return;
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeSave) {
      try {
        const text = parts.map(p => (p instanceof Uint8Array || ArrayBuffer.isView(p)) ? '' : String(p ?? '')).join('');
        window.webkit.messageHandlers.nativeSave.postMessage({ filename: name, content: text });
        return;
      } catch (e) {
        console.warn('Native save failed, falling back to blob', e);
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(parts, { type }));
    a.download = name;
    a.click();
    setTimeout(() => {
      try { URL.revokeObjectURL(a.href); } catch {}
    }, 1000);
  }

  /**
   * 意味・語源・歴史文脈のコンパクト整形（js/card_view.js へ委譲）
   */
  function formatMeaningAndEty(d) {
    if (global.VocabCardView?.formatMeaningAndEty) {
      return global.VocabCardView.formatMeaningAndEty(d);
    }
    const raw = String(d.etymology || '').trim(), meanings = d.meanings || [];
    const hn = String(d.history_note || '').trim();
    const histDigest = hn ? (hn.startsWith('（') ? hn : `（${hn}）`) : '';
    const compactEty = raw.replace(/[①②③④]?\s*【[^】]+】\s*/g, '').replace(/\s+/g, ' ').trim();
    return { meanings, histDigest, compactEty, isLongEty: compactEty.length > 115 };
  }

  /**
   * Anki用 TSV エクスポート (タブ区切り・HTML対応・タグ出力)
   */
  function exportAnkiTSV(items, lang = 'en') {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      if (typeof alert === 'function') alert('単語がありません。');
      return null;
    }
    const cl = s => esc(String(s || '').replace(/[\t\r\n]+/g, ' ').trim());
    const clAllowBold = s => String(s || '').replace(/[\t\r\n]+/g, ' ').trim().split(/(<b>[\s\S]*?<\/b>)/gi).map(p => /^<b>[\s\S]*<\/b>$/i.test(p) ? `<b>${esc(p.slice(3, -4))}</b>` : esc(p)).join('');
    const sanitizeTag = s => esc(String(s || '').trim().replace(/\s+/g, '_'));

    const lines = ['#separator:tab', '#html:true', '#tags column:3', '#columns:Front\tBack\tTags', ...list.map(i => {
      const { meanings, histDigest, compactEty } = formatMeaningAndEty(i);
      const m = meanings.map((x, idx) => `<b>${cl(x.pos)}</b> <span style="color:#d13438;font-weight:bold">${cl(x.text)}${idx === meanings.length - 1 && histDigest ? cl(histDigest) : ''}</span>`).join(' / ');
      const ex = i.example ? `<br><br>${cl(i.example.foreign)}<br><small>${clAllowBold(i.example.ja)}</small>` : '';
      const gram = i.grammar_forms ? ` <small>[${cl(i.grammar_forms)}]</small>` : '';
      const tags = [i.lang || lang, i.category, i.folder].filter(Boolean).map(sanitizeTag).join(' ');
      return `<b>${cl(i.word)}</b> ${esc(fmtPho(i.phonetic))}${gram}\t${m}${ex}${compactEty ? `<br><small>${cl(compactEty)}</small>` : ''}\t${tags}`;
    })];

    const fileName = `anki_${lang}.tsv`;
    dlBlob([new Uint8Array([0xEF, 0xBB, 0xBF]), lines.join('\n')], 'text/tab-separated-values;charset=utf-8', fileName);
    return fileName;
  }

  /**
   * Obsidian用 Markdown ノート束エクスポート (WikiLinks [[*sta-]], Frontmatter対応)
   */
  function exportObsidianMarkdown(items, lang = 'en') {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      if (typeof alert === 'function') alert('エクスポートする単語がありません。');
      return null;
    }
    const nowIso = new Date().toISOString();
    const safeYamlStr = s => String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');

    const docs = list.map(item => {
      const { meanings, histDigest, compactEty } = formatMeaningAndEty(item);
      const tags = ['vocab', item.lang || lang, item.category, item.folder].filter(Boolean).map(t => safeYamlStr(String(t).replace(/[\s\/\\]+/g, '_')));
      const roots = (item.etymologyTags || []).map(r => `"[[*${safeYamlStr(normRootKey(r).replace(/^\*/, ''))}]]"`);

      const frontmatter = [
        '---',
        `word: "${safeYamlStr(item.word)}"`,
        `lang: "${safeYamlStr(item.lang || lang)}"`,
        item.phonetic ? `phonetic: "${safeYamlStr(cleanPho(item.phonetic))}"` : null,
        item.grammar_forms ? `grammar: "${safeYamlStr(item.grammar_forms)}"` : null,
        `level: "${safeYamlStr(item.level || 'B2')}"`,
        tags.length ? `tags: [${tags.join(', ')}]` : null,
        roots.length ? `roots: [${roots.join(', ')}]` : null,
        `created: "${item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : nowIso.slice(0, 10)}"`,
        '---'
      ].filter(Boolean).join('\n');

      const mLines = meanings.map(m => `- **[${m.pos}]** ${m.text}`).join('\n');
      const histLine = item.history_note ? `\n> [!NOTE] 歴史的・制度的文脈\n> ${item.history_note}\n` : '';
      const exLine = item.example && (item.example.foreign || item.example.ja)
        ? `\n### 例文\n> ${item.example.foreign || ''}\n> *${item.example.ja || ''}*\n`
        : '';
      const coreLine = item.core ? `\n> **コア概念**: ${item.core}\n` : '';
      const etyLine = compactEty ? `\n### 語源・概念史\n${compactEty}\n` : '';

      return `${frontmatter}\n\n# ${item.word}\n\n${coreLine}\n### 意味\n${mLines}\n${histLine}${exLine}${etyLine}\n---\n`;
    });

    const combinedDoc = `# Vocab Vault — Obsidian Export (${lang.toUpperCase()})\n*Exported: ${nowIso.slice(0, 19).replace('T', ' ')}*\n\n` + docs.join('\n\n');
    const fileName = `vocab_obsidian_${lang}_${nowIso.slice(0, 10)}.md`;
    dlBlob([new Uint8Array([0xEF, 0xBB, 0xBF]), combinedDoc], 'text/markdown;charset=utf-8', fileName);
    return fileName;
  }

  /**
   * 全言語・ペアファイル対応 フルJSONバックアップ (Version 5形式)
   */
  function exportFullJSON(pairsOrData, getJsonFn) {
    let data = {};
    if (pairsOrData && typeof pairsOrData === 'object' && !Array.isArray(pairsOrData)) {
      data = pairsOrData;
    } else {
      const pairs = Array.isArray(pairsOrData) ? pairsOrData : [];
      pairs.forEach(p => {
        const items = getJsonFn ? getJsonFn(p.key) : [];
        if (items.length > 0 || p.forceInclude) {
          data[p.key] = items;
        }
      });
    }
    const nowIso = new Date().toISOString();
    const fileName = `vocab_backup_${nowIso.slice(0, 10)}.json`;
    dlBlob([JSON.stringify({ version: 5, exportedAt: nowIso, data }, null, 2)], 'application/json', fileName);
    return fileName;
  }

  /**
   * JSONバックアップファイルの復元 & スマートマージ
   */
  function importJSON(ev, ctx = {}) {
    const f = ev.target?.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      try {
        const defLang = ctx.defaultLang || 'en';
        const parseFn = global.VocabStorage?.parseAnyWords || global.parseAnyWords;
        const ext = parseFn ? parseFn(e.target.result, defLang, true) : JSON.parse(e.target.result);
        let added = 0, updated = 0, skipped = 0;
        const now = Date.now();
        const handledStorageKeys = new Set();
        const langs = global.VocabStorage?.LANGS || { en: { key: 'distinction_entries' } };

        Object.keys(ext).forEach(key => {
          if (['__proto__', 'constructor', 'prototype'].includes(key)) return;
          let incoming = ext[key];
          if (!Array.isArray(incoming) || !incoming.length) return;
          if (incoming.length > 20000) {
            incoming = incoming.slice(0, 20000);
          }

          let storageKey = '';
          let l = 'en';

          if (key.startsWith('distinction_entries')) {
            storageKey = key;
            l = global.VocabStorage ? global.VocabStorage.keyToLang(key) : 'en';
          } else if (langs[key]) {
            storageKey = langs[key].key;
            l = key;
          } else {
            return;
          }

          if (handledStorageKeys.has(storageKey)) return;
          handledStorageKeys.add(storageKey);

          const cur = ctx.getJson ? ctx.getJson(storageKey) : [];
          const makeWordKey = global.VocabMorphology?.makeWordKey || ((word, lang, pos, hIdx) => `${lang}:${word}`);
          const curMap = new Map(cur.map(it => [it.wordKey || makeWordKey(it.word, l, it.meanings?.[0]?.pos, it.homographIndex), it]));
          const tombMap = global.VocabStorage ? global.VocabStorage.getTombstones(storageKey) : new Map();
          const clearedAt = global.VocabStorage ? global.VocabStorage.getClearedAt(storageKey) : 0;

          incoming.forEach(it => {
            if (!it || typeof it !== 'object' || Array.isArray(it)) return;
            if (clearedAt > 0 && (it.updatedAt || 0) <= clearedAt) it.updatedAt = now;
            const k = it.wordKey || makeWordKey(it.word, l, it.meanings?.[0]?.pos, it.homographIndex);
            tombMap.delete(`id:${it.id}`);
            tombMap.delete(`wk:${k}`);
            const normW = String(it.word || '').trim().toLowerCase();
            if (normW) tombMap.delete(`word:${normW}`);
            const ex = curMap.get(k);
            if (!ex) added++;
            else if ((it.updatedAt || 0) > (ex.updatedAt || 0)) updated++;
            else skipped++;
          });

          if (global.VocabStorage) global.VocabStorage.saveTombstones(storageKey, tombMap);
          const mergeFn = global.VocabStorage?.mergeWords || global.mergeWords;
          const merged = mergeFn ? mergeFn(cur, incoming, storageKey, true) : incoming;
          if (ctx.setJson) {
            ctx.setJson(storageKey, merged, true, true);
          } else if (global.VocabStorage) {
            global.VocabStorage.state.mem[storageKey] = merged;
          }
          const finalList = global.VocabStorage?.state?.mem?.[storageKey] || merged;
          if (storageKey === ctx.activePairKey && typeof ctx.setActiveEntries === 'function') {
            ctx.setActiveEntries(finalList);
          }
        });

        if (!added && !updated && !skipped) throw new Error('有効な単語エントリが1件も含まれていません。');
        if (typeof ctx.onComplete === 'function') ctx.onComplete({ added, updated, skipped });
        if (typeof alert === 'function') alert(`JSONインポート完了\n・新規追加: ${added} 語\n・更新: ${updated} 語\n・既存維持(スキップ): ${skipped} 語`);
      } catch (err) {
        if (typeof alert === 'function') alert(`JSON読込失敗: ${err.message}`);
      } finally {
        if (ev.target) ev.target.value = '';
      }
    };
    r.readAsText(f);
  }

  /**
   * Anki エクスポート（TSV / CSV / タブ区切りテキスト）パーサー & FSRS進度マッピング
   */
  function parseAnkiExport(text, options = {}) {
    if (typeof text !== 'string' || !text.trim()) return [];

    const defaultLang = options.defaultLang || global.App?.lang || 'en';
    const defaultFolder = options.defaultFolder || 'Ankiインポート';
    const now = Date.now();

    // 1. ディレクティブヘッダーの解析（#separator, #html, #tags column 等）
    let separator = '\t'; // デフォルトはタブ
    let htmlMode = true;
    let tagsCol = -1;

    const rawLines = text.split(/\r?\n/);
    const contentLines = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        const lower = trimmed.toLowerCase();
        if (lower.startsWith('#separator:')) {
          const sepVal = trimmed.slice(11).trim().toLowerCase();
          if (sepVal === 'comma') separator = ',';
          else if (sepVal === 'semicolon') separator = ';';
          else if (sepVal === 'tab') separator = '\t';
          else if (sepVal === 'space') separator = ' ';
        } else if (lower.startsWith('#html:')) {
          htmlMode = trimmed.slice(6).trim().toLowerCase() === 'true';
        } else if (lower.startsWith('#tags column:')) {
          const col = parseInt(trimmed.slice(13).trim(), 10);
          if (Number.isFinite(col)) tagsCol = col - 1;
        }
        continue;
      }
      contentLines.push(line);
    }

    const joinedSample = contentLines.slice(0, 10).join('\n');
    if (separator === '\t' && !joinedSample.includes('\t') && joinedSample.includes(',')) {
      separator = ',';
    }

    // 2. クォート対応の行・フィールド分割 (TSV / CSV RFC 4180準拠)
    const records = [];
    let curRecord = [];
    let curField = '';
    let inQuotes = false;
    const fullContent = contentLines.join('\n');

    for (let i = 0; i < fullContent.length; i++) {
      const char = fullContent[i];
      const nextChar = fullContent[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          curField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        curRecord.push(curField);
        curField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        curRecord.push(curField);
        if (curRecord.some(f => f.trim().length > 0)) {
          records.push(curRecord);
        }
        curRecord = [];
        curField = '';
      } else {
        curField += char;
      }
    }
    if (curField || curRecord.length > 0) {
      curRecord.push(curField);
      if (curRecord.some(f => f.trim().length > 0)) {
        records.push(curRecord);
      }
    }

    // 3. 各レコードの構造化
    const items = [];
    let autoNum = 1;

    records.forEach(fields => {
      if (fields.length === 0) return;
      const frontRaw = fields[0] || '';
      const backRaw = fields[1] || '';
      if (!frontRaw.trim() && !backRaw.trim()) return;

      const cleanFront = frontRaw.replace(/\[sound:[^\]]+\]/gi, '').trim();
      const cleanBack = backRaw.replace(/\[sound:[^\]]+\]/gi, '').trim();

      const stripHtml = s => s.replace(/<br\s*[\/]?>/gi, '\n')
                               .replace(/<\/p>/gi, '\n')
                               .replace(/<\/div>/gi, '\n')
                               .replace(/<[^>]+>/g, '')
                               .replace(/&nbsp;/g, ' ')
                               .replace(/&amp;/g, '&')
                               .replace(/&lt;/g, '<')
                               .replace(/&gt;/g, '>')
                               .replace(/&quot;/g, '"')
                               .trim();

      let word = stripHtml(cleanFront).split(/[\n\r]/)[0].trim();
      let phonetic = '';
      const phoMatch = word.match(/[\/\[]([^\/\]]+)[\/\]]/);
      if (phoMatch) {
        phonetic = phoMatch[1].trim();
        word = word.replace(/[\/\[][^\/\]]+[\/\]]/, '').trim();
      }

      if (!word) return;

      const backPlain = stripHtml(cleanBack);
      const backLines = backPlain.split(/\n+/).map(l => l.trim()).filter(Boolean);

      const meanings = [];
      let example = null;
      let etymology = '';
      const etymologyTags = [];
      let core = '';

      backLines.forEach(line => {
        if (/^(語源|Ety|Etymology|由来)[:：]/i.test(line)) {
          etymology = line.replace(/^(語源|Ety|Etymology|由来)[:：]\s*/i, '').trim();
          const tagMatches = etymology.match(/\*([a-zāēīōūáéíóúh₁₂₃₂₃h]+(?:-[a-zāēīōūáéíóúh₁₂₃]*)?)/gi);
          if (tagMatches) tagMatches.forEach(t => etymologyTags.push(t.toLowerCase()));
          return;
        }
        if (/^(コア|中核|Core)[:：]/i.test(line)) {
          core = line.replace(/^(コア|中核|Core)[:：]\s*/i, '').trim();
          return;
        }
        if (/^(Ex|例|例文|Example)[:：]/i.test(line)) {
          const exText = line.replace(/^(Ex|例|例文|Example)[:：]\s*/i, '').trim();
          if (!example) example = { foreign: exText, ja: '', trans: '' };
          else example.ja = exText;
          return;
        }

        const posMatch = line.match(/^\[([A-Za-zぁ-んァ-ヶ亜-黑]+)\]\s*(.+)$/);
        if (posMatch) {
          meanings.push({ pos: posMatch[1], text: posMatch[2] });
        } else if (meanings.length < 3) {
          meanings.push({ pos: 'All', text: line });
        }
      });

      if (!meanings.length) {
        meanings.push({ pos: 'All', text: backPlain || word });
      }

      let tags = [];
      if (tagsCol >= 0 && fields[tagsCol]) {
        tags = fields[tagsCol].trim().split(/\s+/).filter(Boolean);
      } else if (fields[2] && !fields[2].includes('http') && fields[2].length < 100) {
        tags = fields[2].trim().split(/\s+/).filter(Boolean);
      }

      // 4. FSRS / SM-2 学習進度パラメータの抽出
      let interval = 0;
      let repetition = 0;
      let efactor = 2.5;
      let nextReview = now;
      let hasScheduleCols = false;

      for (let fIdx = 2; fIdx < fields.length; fIdx++) {
        if (fIdx === tagsCol) continue;
        const val = fields[fIdx].trim();
        const numVal = parseFloat(val);
        if (Number.isFinite(numVal) && String(numVal) === val) {
          if (interval === 0 && numVal >= 1 && numVal <= 3650) {
            interval = Math.round(numVal);
            repetition = Math.max(1, Math.round(Math.log2(interval + 1)));
            nextReview = now + (interval * 86400000);
            hasScheduleCols = true;
          } else if (efactor === 2.5 && numVal >= 1300 && numVal <= 3500) {
            efactor = Number((numVal / 1000).toFixed(2));
            hasScheduleCols = true;
          } else if (efactor === 2.5 && numVal >= 1.3 && numVal <= 3.5) {
            efactor = Number(numVal.toFixed(2));
            hasScheduleCols = true;
          }
        }
      }

      const item = {
        id: `anki_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}_${autoNum}`,
        num: autoNum++,
        word: word,
        homographIndex: 1,
        phonetic: phonetic,
        lang: defaultLang,
        meanings: meanings,
        core: core,
        etymology: etymology,
        etymologyTags: etymologyTags,
        example: example,
        folder: defaultFolder,
        category: tags[0] || 'Anki',
        interval: interval,
        repetition: repetition,
        efactor: efactor,
        nextReview: nextReview,
        hasScheduleCols: hasScheduleCols,
        createdAt: now,
        updatedAt: now,
        reviewUpdatedAt: hasScheduleCols ? now : 0,
        isDeleted: false
      };

      items.push(item);
    });

    return items;
  }

  /**
   * Anki エクスポートデータのインポート実行と単語帳マージ
   */
  function importAnkiText(text, ctx = {}) {
    try {
      const items = parseAnkiExport(text, {
        defaultLang: ctx.lang || global.App?.lang || 'en',
        defaultFolder: ctx.folder || 'Ankiインポート'
      });
      if (!items.length) {
        throw new Error('Ankiデータから有効な単語レコードを検出できませんでした。');
      }

      const targetLang = ctx.lang || global.App?.lang || 'en';
      const curPairKey = global.VocabCore?.getActivePairConfig?.()?.key || 'distinction_entries';
      const cur = ctx.getEntries ? ctx.getEntries() : (global.App?.entries || []);
      const makeLookupKey = global.VocabMorphology?.makeLookupKey || ((w, l, h) => w);
      const makeWordKey = global.VocabMorphology?.makeWordKey || ((w, l) => `${l}:${w.toLowerCase()}`);
      const sanitizeFn = global.VocabStorage?.sanitizeItem || global.sanitizeItem || (x => x);
      const tombMap = global.VocabStorage ? global.VocabStorage.getTombstones(curPairKey) : new Map();
      const clearedAt = global.VocabStorage ? global.VocabStorage.getClearedAt(curPairKey) : 0;
      const now = Math.max(Date.now(), (Number(clearedAt) || 0) + 1);
      const existingMap = new Map(cur.map(x => [makeLookupKey(x.word, x.lang || targetLang, x.homographIndex), x]));

      let added = 0;
      let updated = 0;
      let maxNum = cur.reduce((m, x) => Math.max(m, Number(x.num) || 0), 0);
      const toAdd = [];

      items.forEach((rawItem, idx) => {
        const hasSched = Boolean(rawItem.hasScheduleCols);
        if ((rawItem.updatedAt || 0) <= clearedAt) rawItem.updatedAt = now;
        const item = sanitizeFn(rawItem, maxNum + idx, targetLang);
        if (!item) return;
        item.wordKey = item.wordKey || makeWordKey(item.word, targetLang, item.meanings?.[0]?.pos, item.homographIndex);
        item.updatedAt = Math.max(Number(item.updatedAt) || 0, now);
        item.reviewUpdatedAt = hasSched ? Math.max(Number(item.reviewUpdatedAt) || 0, now) : (Number(rawItem.reviewUpdatedAt) || 0);
        const k = makeLookupKey(item.word, item.lang, item.homographIndex);
        // 過去に削除していた単語を再インポートした場合に墓石を解除
        tombMap.delete(`id:${item.id}`);
        tombMap.delete(`wk:${item.wordKey}`);
        const normW = String(item.word || '').trim().toLowerCase();
        if (normW) tombMap.delete(`word:${normW}`);
        if (existingMap.has(k)) {
          const ex = existingMap.get(k);
          tombMap.delete(`id:${ex.id}`);
          if (ex.wordKey) tombMap.delete(`wk:${ex.wordKey}`);
          Object.assign(ex, {
            meanings: item.meanings?.length ? item.meanings : ex.meanings,
            phonetic: item.phonetic || ex.phonetic,
            etymology: item.etymology || ex.etymology,
            etymologyTags: item.etymologyTags?.length ? item.etymologyTags : ex.etymologyTags,
            core: item.core || ex.core,
            example: item.example || ex.example,
            interval: hasSched ? (item.interval || ex.interval) : ex.interval,
            repetition: hasSched ? (item.repetition || ex.repetition) : ex.repetition,
            efactor: hasSched ? (item.efactor || ex.efactor) : ex.efactor,
            nextReview: hasSched ? (item.nextReview || ex.nextReview) : ex.nextReview,
            reviewUpdatedAt: hasSched ? now : ex.reviewUpdatedAt,
            version: (Number(ex.version) || 1) + 1,
            updatedAt: now,
            isDeleted: false
          });
          updated++;
        } else {
          maxNum++;
          item.num = maxNum;
          toAdd.push(item);
          existingMap.set(k, item);
          added++;
        }
      });

      if (global.VocabStorage) global.VocabStorage.saveTombstones(curPairKey, tombMap);

      const merged = [...cur, ...toAdd];
      if (typeof ctx.saveEntries === 'function') {
        ctx.saveEntries(merged, targetLang);
      } else {
        if (global.setJson) {
          global.setJson(curPairKey, merged, true, true);
        } else if (global.VocabStorage) {
          global.VocabStorage.state.mem[curPairKey] = merged;
        }
        if (global.App) global.App.entries = global.VocabStorage?.state?.mem?.[curPairKey] || merged;
      }

      if (global.load) global.load(1);
      const showToast = ctx.showToast || global.VocabModal?.showToast || (typeof alert === 'function' ? alert : null);
      if (showToast) {
        showToast(`Ankiインポート完了: ${added} 語を新規追加（${updated} 語は既存登録済）`, 'ok');
      }
      return { added, updated, total: items.length };
    } catch (err) {
      const showToast = ctx.showToast || global.VocabModal?.showToast || (typeof alert === 'function' ? alert : null);
      if (showToast) showToast(`Ankiインポート失敗: ${err.message}`, 'err');
      throw err;
    }
  }

  // --- グローバルエクスポート ---
  global.VocabExport = {
    dlBlob,
    formatMeaningAndEty,
    exportAnkiTSV,
    exportObsidianMarkdown,
    exportFullJSON,
    importJSON,
    parseAnkiExport,
    importAnkiText
  };
})(typeof window !== 'undefined' ? window : globalThis);
