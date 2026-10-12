/**
 * Vocab Vault — Export, Backup & Import Module (js/export.js)
 * High-fidelity Data Portability: Anki TSV, Obsidian Markdown, Full Multi-Language JSON
 */
(function (global) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const cleanPho = p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim();
  const fmtPho = p => { const c = cleanPho(p); return c ? `[ ${c} ]` : ''; };
  const normRootKey = r => {
    if (global.VocabMorphology && typeof global.VocabMorphology.normRootKey === 'function') {
      return global.VocabMorphology.normRootKey(r);
    }
    let s = String(r || '').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[₁-₉]/g, m => ({ '₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9' }[m] || m));
    s = s.replace(/[hḫḥ]1/g, 'h1').replace(/[hḫḥ]2/g, 'h2').replace(/[hḫḥ]3/g, 'h3');
    s = s.replace(/[\(\)\[\]\{\}]/g, '');
    return s.startsWith('*') ? s : `*${s}`;
  };

  /**
   * ブラウザ上でBlobデータをファイルとして即時ダウンロード
   */
  function dlBlob(parts, type, name) {
    if (typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(parts, { type }));
    a.download = name;
    a.click();
    setTimeout(() => {
      try { URL.revokeObjectURL(a.href); } catch {}
    }, 1000);
  }

  /**
   * 意味・語源・歴史文脈のコンパクト整形
   */
  function formatMeaningAndEty(d) {
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

    const docs = list.map(item => {
      const { meanings, histDigest, compactEty } = formatMeaningAndEty(item);
      const tags = ['vocab', item.lang || lang, item.category, item.folder].filter(Boolean).map(t => String(t).replace(/[\s\/\\]+/g, '_'));
      const roots = (item.etymologyTags || []).map(r => `"[[*${normRootKey(r).replace(/^\*/, '')}]]"`);

      const frontmatter = [
        '---',
        `word: "${(item.word || '').replace(/"/g, '\\"')}"`,
        `lang: "${item.lang || lang}"`,
        item.phonetic ? `phonetic: "${cleanPho(item.phonetic)}"` : null,
        item.grammar_forms ? `grammar: "${(item.grammar_forms || '').replace(/"/g, '\\"')}"` : null,
        `level: "${item.level || 'B2'}"`,
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

  // --- グローバルエクスポート ---
  global.VocabExport = {
    dlBlob,
    formatMeaningAndEty,
    exportAnkiTSV,
    exportObsidianMarkdown,
    exportFullJSON
  };
})(typeof window !== 'undefined' ? window : globalThis);
