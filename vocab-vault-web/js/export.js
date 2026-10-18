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

  // ==========================================
  // Item 46: VocabZip & Anki (.apkg) Engine
  // ==========================================

  function encodeUtf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    const unescaped = unescape(encodeURIComponent(str));
    const arr = new Uint8Array(unescaped.length);
    for (let i = 0; i < unescaped.length; i++) arr[i] = unescaped.charCodeAt(i);
    return arr;
  }

  function decodeUtf8(u8) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8', { fatal: false }).decode(u8);
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    try { return decodeURIComponent(escape(s)); } catch(e) { return s; }
  }

  function safeBtoa(bin) {
    if (typeof btoa !== 'undefined') return btoa(bin);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = String(bin);
    let output = '';
    for (let block = 0, charCode, idx = 0, map = chars;
      str.charAt(idx | 0) || (map = '=', idx % 1);
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)) {
      charCode = str.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) throw new Error("'btoa' failed: outside Latin1 range");
      block = block << 8 | charCode;
    }
    return output;
  }

  function safeAtob(input) {
    if (typeof atob !== 'undefined') return atob(input);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = String(input).replace(/[=]+$/, '');
    if (str.length % 4 === 1) throw new Error("'atob' failed: invalid base64 length");
    let output = '';
    for (let bc = 0, bs = 0, buffer, idx = 0;
      buffer = str.charAt(idx++);
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  }

  const CRC32_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC32_TABLE[i] = c >>> 0;
  }

  function calcCRC32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c = CRC32_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const VocabZip = {
    createZip(files) {
      const localHeaders = [];
      const centralHeaders = [];
      let offset = 0;

      (files || []).forEach(f => {
        const nameBytes = encodeUtf8(f.name);
        let dataBytes = f.data;
        if (typeof dataBytes === 'string') dataBytes = encodeUtf8(dataBytes);
        else if (dataBytes instanceof ArrayBuffer) dataBytes = new Uint8Array(dataBytes);
        else if (!(dataBytes instanceof Uint8Array)) dataBytes = new Uint8Array(0);

        const crc = calcCRC32(dataBytes);
        const size = dataBytes.length;

        // Local header (30 bytes + name + data)
        const lh = new Uint8Array(30 + nameBytes.length);
        const ldv = new DataView(lh.buffer);
        ldv.setUint32(0, 0x04034b50, true);
        ldv.setUint16(4, 20, true);
        ldv.setUint16(6, 0x0800, true); // UTF-8
        ldv.setUint16(8, 0, true); // Stored (no compression)
        ldv.setUint16(10, 0, true);
        ldv.setUint16(12, 0, true);
        ldv.setUint32(14, crc, true);
        ldv.setUint32(18, size, true);
        ldv.setUint32(22, size, true);
        ldv.setUint16(26, nameBytes.length, true);
        ldv.setUint16(28, 0, true);
        lh.set(nameBytes, 30);

        localHeaders.push({ lh, data: dataBytes, offset });

        // Central directory header (46 bytes + name)
        const cd = new Uint8Array(46 + nameBytes.length);
        const cdv = new DataView(cd.buffer);
        cdv.setUint32(0, 0x02014b50, true);
        cdv.setUint16(4, 20, true);
        cdv.setUint16(6, 20, true);
        cdv.setUint16(8, 0x0800, true);
        cdv.setUint16(10, 0, true);
        cdv.setUint16(12, 0, true);
        cdv.setUint16(14, 0, true);
        cdv.setUint32(16, crc, true);
        cdv.setUint32(20, size, true);
        cdv.setUint32(24, size, true);
        cdv.setUint16(28, nameBytes.length, true);
        cdv.setUint16(30, 0, true);
        cdv.setUint16(32, 0, true);
        cdv.setUint16(34, 0, true);
        cdv.setUint16(36, 0, true);
        cdv.setUint32(38, 0, true);
        cdv.setUint32(42, offset, true);
        cd.set(nameBytes, 46);

        centralHeaders.push(cd);
        offset += lh.length + dataBytes.length;
      });

      const cdOffset = offset;
      const cdSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

      // End of central directory record (22 bytes)
      const eocd = new Uint8Array(22);
      const edv = new DataView(eocd.buffer);
      edv.setUint32(0, 0x06054b50, true);
      edv.setUint16(4, 0, true);
      edv.setUint16(6, 0, true);
      edv.setUint16(8, files.length, true);
      edv.setUint16(10, files.length, true);
      edv.setUint32(12, cdSize, true);
      edv.setUint32(16, cdOffset, true);
      edv.setUint16(20, 0, true);

      const totalSize = offset + cdSize + 22;
      const zipOut = new Uint8Array(totalSize);
      let pos = 0;
      localHeaders.forEach(item => {
        zipOut.set(item.lh, pos);
        pos += item.lh.length;
        zipOut.set(item.data, pos);
        pos += item.data.length;
      });
      centralHeaders.forEach(cd => {
        zipOut.set(cd, pos);
        pos += cd.length;
      });
      zipOut.set(eocd, pos);
      return zipOut;
    },

    extractZip(buffer) {
      const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      const files = [];
      let i = 0;
      while (i < u8.length - 30) {
        if (u8[i] === 0x50 && u8[i+1] === 0x4b && u8[i+2] === 0x03 && u8[i+3] === 0x04) {
          const dv = new DataView(u8.buffer, u8.byteOffset + i, 30);
          const compMethod = dv.getUint16(8, true);
          const compSize = dv.getUint32(18, true);
          const uncompSize = dv.getUint32(22, true);
          const nameLen = dv.getUint16(26, true);
          const extraLen = dv.getUint16(28, true);
          const nameBytes = u8.subarray(i + 30, i + 30 + nameLen);
          const filename = decodeUtf8(nameBytes);
          const dataStart = i + 30 + nameLen + extraLen;
          const dataEnd = dataStart + compSize;
          if (dataEnd <= u8.length) {
            const rawData = u8.subarray(dataStart, dataEnd);
            files.push({ name: filename, method: compMethod, compSize, uncompSize, data: rawData });
          }
          i = dataEnd;
        } else {
          i++;
        }
      }
      return files;
    }
  };

  /**
   * Anki (.apkg) パッケージエクスポート
   */
  function exportAnkiAPKG(items, lang = 'en', options = {}) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      if (typeof alert === 'function') alert('単語がありません。');
      return null;
    }
    const cl = s => esc(String(s || '').replace(/[\t\r\n]+/g, ' ').trim());
    const clAllowBold = s => String(s || '').replace(/[\t\r\n]+/g, ' ').trim().split(/(<b>[\s\S]*?<\/b>)/gi).map(p => /^<b>[\s\S]*<\/b>$/i.test(p) ? `<b>${esc(p.slice(3, -4))}</b>` : esc(p)).join('');
    const sanitizeTag = s => esc(String(s || '').trim().replace(/\s+/g, '_'));

    const tsvLines = ['#separator:tab', '#html:true', '#tags column:3', '#columns:Front\tBack\tTags', ...list.map(i => {
      const { meanings, histDigest, compactEty } = formatMeaningAndEty(i);
      const m = meanings.map((x, idx) => `<b>${cl(x.pos)}</b> <span style="color:#d13438;font-weight:bold">${cl(x.text)}${idx === meanings.length - 1 && histDigest ? cl(histDigest) : ''}</span>`).join(' / ');
      const ex = i.example ? `<br><br>${cl(i.example.foreign)}<br><small>${clAllowBold(i.example.ja)}</small>` : '';
      const gram = i.grammar_forms ? ` <small>[${cl(i.grammar_forms)}]</small>` : '';
      const tags = [i.lang || lang, i.category, i.folder].filter(Boolean).map(sanitizeTag).join(' ');
      return `<b>${cl(i.word)}</b> ${esc(fmtPho(i.phonetic))}${gram}\t${m}${ex}${compactEty ? `<br><small>${cl(compactEty)}</small>` : ''}\t${tags}`;
    })];

    const tsvContent = tsvLines.join('\n');
    const files = [
      { name: 'cards.tsv', data: tsvContent },
      { name: 'media', data: '{}' },
      { name: 'meta.json', data: JSON.stringify({ version: 2, createdBy: 'Vocab Vault', lang, count: list.length }) }
    ];

    const zipBytes = VocabZip.createZip(files);
    const fileName = `anki_deck_${lang}.apkg`;
    dlBlob([zipBytes], 'application/zip', fileName);
    return fileName;
  }

  /**
   * Anki (.apkg / TSV / CSV) ファイル自動認識インポート
   */
  async function importAnkiFile(file, ctx = {}) {
    if (!file) return;

    // 1. ファイルをArrayBufferとして読み込み
    const buffer = await file.arrayBuffer();
    const u8 = new Uint8Array(buffer);

    // 2. ZIPシグネチャ (PK\x03\x04) 判定
    const isZip = u8.length > 4 && u8[0] === 0x50 && u8[1] === 0x4B && u8[2] === 0x03 && u8[3] === 0x04;

    if (isZip) {
      const extracted = VocabZip.extractZip(u8);
      // a) cards.tsv または .tsv / .txt ファイルの探索
      const textFile = extracted.find(f => f.name.endsWith('.tsv') || f.name.endsWith('.txt') || f.name === 'cards.tsv');
      if (textFile) {
        const text = decodeUtf8(textFile.data);
        return importAnkiText(text, ctx);
      }

      // b) collection.anki2 (SQLite) からのノート文字列抽出
      const ankiDb = extracted.find(f => f.name === 'collection.anki2' || f.name === 'collection.anki21');
      if (ankiDb) {
        const dbText = decodeUtf8(ankiDb.data);
        // SQLite 内の flds (0x1f 区切りのフィールド) を走査
        const rawChunks = dbText.split(/\x1f/);
        const pairs = [];
        for (let i = 0; i < rawChunks.length - 1; i += 2) {
          const front = rawChunks[i].replace(/[\x00-\x1e]/g, '').trim();
          const back = rawChunks[i + 1].replace(/[\x00-\x1e]/g, '').trim();
          // 単語らしき文字列（300文字以内、英数字または日本語）を抽出
          if (front && front.length <= 150 && back && back.length <= 2000) {
            pairs.push(`${front}\t${back}`);
          }
        }
        if (pairs.length > 0) {
          const generatedTsv = `#separator:tab\n#html:true\n` + pairs.join('\n');
          return importAnkiText(generatedTsv, ctx);
        }
      }

      throw new Error('APKGファイル内に読み取り可能なカードデータが見つかりませんでした。');
    } else {
      // プレーンテキスト（TSV / CSV）として処理
      const text = textDecoder.decode(u8);
      return importAnkiText(text, ctx);
    }
  }

  // ==========================================
  // Item 47: Obsidian Vault Direct Sync (File System Access API)
  // ==========================================

  function generateObsidianDoc(item, lang = 'en', nowIso = '') {
    const safeYamlStr = s => String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');
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
      `created: "${item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : (nowIso ? nowIso.slice(0, 10) : '')}"`,
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
  }

  async function syncObsidianVault(items, lang = 'en', options = {}) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      if (typeof alert === 'function') alert('同期する単語がありません。');
      return null;
    }

    if (!window.showDirectoryPicker) {
      // File System Access API 非対応環境のフォールバック
      return exportObsidianMarkdown(items, lang);
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      const subfolder = options.subfolder || 'VocabVault';
      let targetDir = dirHandle;
      if (subfolder) {
        targetDir = await dirHandle.getDirectoryHandle(subfolder, { create: true });
      }

      let saved = 0;
      const nowIso = new Date().toISOString();
      for (const item of list) {
        const safeWord = String(item.word || 'word').replace(/[\\/:*?"<>|]/g, '_').trim();
        const filename = `${safeWord}.md`;
        const doc = generateObsidianDoc(item, lang, nowIso);
        const fileHandle = await targetDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(doc);
        await writable.close();
        saved++;
      }

      const msg = `Obsidian Vault同期完了: ${saved} 語のノートを保存しました（フォルダ: ${subfolder}）。`;
      if (options.showToast) options.showToast(msg, 'ok');
      else if (typeof alert === 'function') alert(msg);
      return { saved, folder: subfolder };
    } catch (err) {
      if (err.name === 'AbortError') return null; // ユーザーキャンセル
      console.error('Obsidian Vault sync error:', err);
      if (typeof alert === 'function') alert(`Obsidian Vault同期エラー: ${err.message}`);
      throw err;
    }
  }

  // ==========================================
  // Item 49: Shareable Deck URL Generator & Parser
  // ==========================================

  function generateShareDeckUrl(items, deckTitle = 'Vocab Vault 共有デッキ', lang = 'en') {
    const list = (Array.isArray(items) ? items : []).slice(0, 150);
    if (!list.length) {
      if (typeof alert === 'function') alert('共有する単語がありません。');
      return null;
    }

    const payload = {
      t: String(deckTitle || '共有デッキ').slice(0, 60),
      l: lang || 'en',
      v: 1,
      w: list.map(i => ({
        w: i.word,
        m: i.meanings,
        c: i.core,
        e: i.etymology,
        r: i.etymologyTags,
        p: i.phonetic,
        g: i.grammar_forms,
        ex: i.example
      }))
    };

    const json = JSON.stringify(payload);
    const bytes = encodeUtf8(json);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = safeBtoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const origin = (typeof location !== 'undefined') ? location.origin : 'https://vocabvault.app';
    const path = (typeof location !== 'undefined') ? location.pathname : '/';
    const shareUrl = `${origin}${path}?share=${b64}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }

    return { shareUrl, count: list.length, title: payload.t };
  }

  function parseShareDeckUrl(urlOrQuery) {
    if (!urlOrQuery) return null;
    let query = String(urlOrQuery);
    if (query.includes('?')) query = query.split('?')[1];
    if (query.includes('#')) query = query.split('#')[0];

    let b64 = '';
    if (typeof URLSearchParams !== 'undefined') {
      try {
        const params = new URLSearchParams(query);
        if (params.has('share')) b64 = params.get('share');
      } catch(e) {}
    }
    if (!b64) {
      const match = query.match(/(?:^|[&?])share=([^&]+)/);
      if (match) b64 = decodeURIComponent(match[1]);
      else if (!query.includes('=')) b64 = query;
    }

    if (!b64) return null;

    try {
      let normB64 = b64.replace(/-/g, '+').replace(/_/g, '/');
      while (normB64.length % 4) normB64 += '=';
      const bin = safeAtob(normB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const json = decodeUtf8(bytes);
      const parsed = JSON.parse(json);

      if (!parsed || !Array.isArray(parsed.w)) return null;

      const lang = parsed.l || 'en';
      const items = parsed.w.map((w, idx) => ({
        id: `share_${Date.now().toString(36)}_${idx + 1}`,
        num: idx + 1,
        word: String(w.w || '').trim(),
        lang: lang,
        meanings: Array.isArray(w.m) ? w.m : [{ pos: 'All', text: w.w }],
        core: String(w.c || ''),
        etymology: String(w.e || ''),
        etymologyTags: Array.isArray(w.r) ? w.r : [],
        phonetic: String(w.p || ''),
        grammar_forms: String(w.g || ''),
        example: w.ex || null,
        category: parsed.t || '共有デッキ',
        folder: parsed.t || '共有デッキ',
        interval: 0,
        repetition: 0,
        efactor: 2.5,
        nextReview: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      })).filter(it => it.word.length > 0);

      return {
        title: parsed.t || '共有デッキ',
        lang: lang,
        items: items,
        count: items.length
      };
    } catch (err) {
      console.warn('Failed to parse share deck URL:', err);
      return null;
    }
  }

  // --- グローバルエクスポート ---
  global.VocabExport = {
    dlBlob,
    formatMeaningAndEty,
    exportAnkiTSV,
    exportAnkiAPKG,
    exportObsidianMarkdown,
    exportFullJSON,
    importJSON,
    parseAnkiExport,
    importAnkiText,
    importAnkiFile,
    syncObsidianVault,
    generateShareDeckUrl,
    parseShareDeckUrl,
    VocabZip
  };
})(typeof window !== 'undefined' ? window : globalThis);
