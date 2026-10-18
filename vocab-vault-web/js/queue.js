/**
 * Vocab Vault — Request Queue & Word Registration Engine (js/queue.js)
 * Asynchronous Batch Processing, Multi-word Splitting, Offline Queue Persistence & Self-healing AI Tasks
 */
(function (global) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const cleanPho = p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim();

  const PHRASE_PARTICLES = new Set([
    'up','down','in','out','on','off','away','back','over','under','through','around','about','along','across','apart','aside','ahead','forward','together',
    'to','for','from','with','of','at','by','into','onto','upon','without','within','against','between','among','after','before',
    'a','an','the','one\'s','oneself','somebody','someone','something',
    'de','du','des','à','au','aux','en','sur','sous','avec','sans','pour','par','dans','se','s\'','ne','pas','le','la','les','un','une',
    'der','die','das','den','dem','ein','eine','einen','einem','sich','zu','von','mit','auf','für','an','ab','aus','bei','nach','um','vor'
  ]);

  /**
   * 入力テキストのパース・分割（カンマ区切り、熟語保持、同形異義語指定解決）
   */
  function splitInputWords(raw, lang = 'en') {
    const rawStr = String(raw ?? '').trim();
    if (!rawStr) return [];

    const norm = s => s.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/^["'「『【]+/, '').replace(/["'」』】]+$/, '').trim().normalize('NFC');
    const hasExplicitDelimiter = /[,、，\n\r\t;；/／]/.test(rawStr);

    if (hasExplicitDelimiter) {
      // カンマ、改行、セミコロン等の明示的区切り文字がある場合はそれで分割し、各項目内のスペース（熟語）をそのまま維持
      return rawStr
        .split(/[,、，\n\r\t;；/／]+/)
        .map(norm)
        .filter(Boolean);
    }

    const cleaned = norm(rawStr);
    if (!cleaned) return [];
    if (!cleaned.includes(' ')) return [cleaned];

    // 明示的な同形異義語指定 (#1, #2) 等が全トークンにある場合のみ複数語分割
    const tokens = [];
    const re = /[^\s(（]+(?:\s*[\(（][^\)）]*[\)）])?(?:#\d+)?/g;
    let m;
    while ((m = re.exec(cleaned)) !== null) tokens.push(m[0].trim());

    const allHaveExplicitSpec = tokens.length > 1 && tokens.every(t => /#\d+$|[\(（][^\)）]+[\)）]/.test(t));
    if (allHaveExplicitSpec) return tokens;

    // スペースを含む単一の入力は、熟語・イディオム（例: "wet blanket", "take into account"）としてそのまま1件で保持
    return [cleaned];
  }

  /**
   * 待機中タスクキューのLocalStorageへの安全な退避
   */
  function syncPersistedQueue() {
    try {
      const qList = global.App?.reqQueue || [];
      const activeQueue = qList.filter(q => !q.isCancelled && !q.isDone && !q.isFailed).map(({ items, fName, useHist, useWikt, targetLang, srcLang, tgtLang, pairKey }) => ({ items, fName, useHist, useWikt, targetLang, srcLang, tgtLang, pairKey }));
      if (global.lsSet) global.lsSet('vv_pending_queue', JSON.stringify(activeQueue));
      else if (typeof localStorage !== 'undefined') localStorage.setItem('vv_pending_queue', JSON.stringify(activeQueue));
    } catch {}
  }

  /**
   * 起動時にLocalStorageから退避タスクを自己修復復元
   */
  function restorePersistedQueue() {
    try {
      const raw = global.lsGet ? global.lsGet('vv_pending_queue', '[]') : (typeof localStorage !== 'undefined' ? localStorage.getItem('vv_pending_queue') || '[]' : '[]');
      const saved = JSON.parse(raw);
      if (Array.isArray(saved) && saved.length) {
        if (global.lsSet) global.lsSet('vv_pending_queue', '[]');
        else if (typeof localStorage !== 'undefined') localStorage.setItem('vv_pending_queue', '[]');
        saved.forEach(t => {
          if (t && typeof t === 'object' && Array.isArray(t.items) && t.items.length) {
            const validItems = t.items.filter(it => it && typeof it === 'object' && it.word);
            if (validItems.length) {
              enqueueTask({ ...t, items: validItems });
            }
          }
        });
      }
    } catch {}
  }

  /**
   * 単語リスト登録（既登録チェック、既存カードへの即時スクロール＆ハイライト、バッチ分割 enqueueTask）
   */
  function registerWordsList(rawItems, fName, useHist, useWikt = true) {
    const App = global.App || {};
    const pairCfg = global.getActivePairConfig ? global.getActivePairConfig() : { key: 'distinction_entries' };
    const sLang = App.srcLang || 'en';
    const tLang = App.tgtLang || 'ja';
    const k = pairCfg.key;
    const saved = global.getJson ? global.getJson(k) : [];
    App.entries = (Array.isArray(saved) && saved.length) ? saved : (Array.isArray(App.entries) && App.entries.length ? App.entries : []);

    const makeLkFn = global.VocabMorphology?.makeLookupKey || global.makeLookupKey || ((w, l, h) => h > 1 ? `${w}#${h}` : w);
    const parseSpecFn = global.VocabMorphology?.parseInputWordSpec || global.parseInputWordSpec || (w => ({ cleanWord: w, homographIndex: 1, senseHint: '' }));

    const reqQ = App.reqQueue || [];
    const qSet = new Set(reqQ.filter(q => (q.srcLang || q.targetLang) === sLang && (q.tgtLang || 'ja') === tLang).flatMap(q => q.items.map(x => `${makeLkFn(x.word, sLang, x.homographIndex)}:${x.meaning || ''}`)));

    const lkToEntry = new Map(), baseMaxHomo = new Map();
    let maxNum = 0;
    (App.entries || []).forEach(it => {
      const lk = makeLkFn(it.word, sLang, it.homographIndex);
      const baseLk = makeLkFn(it.word, sLang, 1);
      lkToEntry.set(lk, it);
      baseMaxHomo.set(baseLk, Math.max(baseMaxHomo.get(baseLk) || 1, it.homographIndex || 1));
      if ((it.num || 0) > maxNum) maxNum = it.num;
    });

    const newItems = [], reorderedSet = new Set(), now = Date.now();
    const existingMatches = [];

    rawItems.forEach(raw => {
      const obj = typeof raw === 'string' ? { word: raw } : raw;
      const spec = parseSpecFn(obj.word), w = spec.cleanWord;
      if (!w) return;
      const homoIdx = obj.homographIndex || spec.homographIndex || 1;
      const meaningHint = [obj.meaning, spec.senseHint].filter(Boolean).join(' / ');
      const lk = makeLkFn(w, sLang, homoIdx);
      if (qSet.has(`${lk}:${meaningHint}`)) return;

      const existing = lkToEntry.get(lk);
      if (existing && !spec.senseHint) {
        existingMatches.push(existing);
        if (fName && existing.folder !== fName) {
          existing.folder = fName;
          existing.updatedAt = now;
          reorderedSet.add(existing);
        }
      } else {
        let finalHomo = homoIdx;
        const baseLk = makeLkFn(w, sLang, 1);
        if (existing && spec.senseHint && finalHomo === 1) {
          finalHomo = (baseMaxHomo.get(baseLk) || 1) + 1;
        }
        baseMaxHomo.set(baseLk, Math.max(baseMaxHomo.get(baseLk) || 1, finalHomo));
        qSet.add(`${makeLkFn(w, sLang, finalHomo)}:${meaningHint}`);
        newItems.push({ word: w, homographIndex: finalHomo, pos: obj.pos || '', meaning: meaningHint, sentence: obj.sentence || '' });
      }
    });

    if (App.hasActiveFilters && App.hasActiveFilters()) {
      if (App.resetFilters) App.resetFilters();
      if (fName) App.fol = fName;
    } else if (fName && App.fol !== fName) {
      App.fol = fName;
    }
    if (reorderedSet.size && global.setJson && global.load) {
      global.setJson(k, App.entries, false, true);
      global.load(1);
    }

    if (rawItems.length === 1 && existingMatches.length === 1 && !newItems.length) {
      // 単一の既登録語を入力した場合: 重複AI通信や二重登録を抑止し、該当カードへ瞬時にスクロール・ハイライト
      const inW = typeof document !== 'undefined' ? document.getElementById('inWord') : null;
      if (inW) { inW.value = ''; try { inW.blur(); } catch {} }
      const match = existingMatches[0];
      const jumpKey = match.homographIndex > 1 ? `${match.word}#${match.homographIndex}` : match.word;
      if (global.jumpToWord) global.jumpToWord(jumpKey, sLang);
      if (global.showToast) global.showToast(`「${match.word}」はすでに登録されています（カードに移動しました）`, 'info');
      return;
    }

    if (existingMatches.length > 0 && newItems.length > 0) {
      if (global.showToast) global.showToast(`「${existingMatches.map(x => x.word).join(', ')}」はすでに登録済みのためスキップしました`, 'info');
    }

    const bLim = useHist ? 6 : 10;
    for (let i = 0; i < newItems.length; i += bLim) {
      enqueueTask({ items: newItems.slice(i, i + bLim), fName, useHist, useWikt, targetLang: sLang, srcLang: sLang, tgtLang: tLang, pairKey: k });
    }
  }

  /**
   * フォーム送信イベントハンドラ
   */
  function submitW() {
    const App = global.App || {};
    if (App.isComposing) return;

    const $ = global.$ || (id => typeof document !== 'undefined' ? document.getElementById(id) : null);
    let raw = $('inWord')?.value?.trim() || '';
    if (!raw) return;

    // 同一単語の連続連打（Rapid identical submission）による多重登録レースコンディション防止
    const now = Date.now();
    if (App._lastSubmitWord === raw && App._lastSubmitTs && (now - App._lastSubmitTs < 400)) {
      return;
    }
    App._lastSubmitWord = raw;
    App._lastSubmitTs = now;

    const getKeyFn = global.getKey || (() => '');
    const usageInfo = global.VocabStorage?.getDailyAiUsageInfo ? global.VocabStorage.getDailyAiUsageInfo({ appState: App }) : null;
    if (usageInfo && !usageInfo.isUnlimited && usageInfo.remaining <= 0 && !getKeyFn()) {
      if (global.openUpsellModal) {
        global.openUpsellModal('本日のAI新規生成無料枠（5語/日）に達しました。Proプランにアップグレードすると無制限に生成できます。');
      }
      return;
    }

    // 長大文字列（誤貼付など）のDoS防護
    if (raw.length > 2000) {
      if (global.showToast) global.showToast('入力文字数が上限(2000文字)を超えているため、先頭部分のみ処理します', 'info');
      raw = raw.slice(0, 2000).trim();
    }
    const f = $('inFol')?.value?.trim() || '';

    const makeLkFn = global.VocabMorphology?.makeLookupKey || global.makeLookupKey || ((w, l, h) => h > 1 ? `${w}#${h}` : w);
    const parseSpecFn = global.VocabMorphology?.parseInputWordSpec || global.parseInputWordSpec || (w => ({ cleanWord: w, homographIndex: 1, senseHint: '' }));

    // 現在キューで待機・処理中の同一単語があるか重複チェック
    const reqQ = App.reqQueue || [];
    const isAlreadyQueued = reqQ.some(q => !q.isDone && !q.isCancelled && q.items.some(it => makeLkFn(it.word, App.srcLang, 1) === makeLkFn(raw, App.srcLang, 1)));
    if (isAlreadyQueued) {
      if (global.showToast) global.showToast(`「${raw}」は現在処理中です`, 'info');
      if ($('wordSuggestBox')) $('wordSuggestBox').style.display = 'none';
      return;
    }

    const uMap = new Map();
    splitInputWords(raw, App.lang).forEach(w => {
      const spec = parseSpecFn(w);
      if (!spec.cleanWord) return;
      const key = `${makeLkFn(spec.cleanWord, App.lang, spec.homographIndex)}:${spec.senseHint}`;
      if (!uMap.has(key)) uMap.set(key, { word: w });
    });
    if ($('inWord')) $('inWord').value = '';
    if ($('wordSuggestBox')) $('wordSuggestBox').style.display = 'none';
    $('inWord')?.focus();
    registerWordsList([...uMap.values()], f, $('chkHist')?.checked, $('chkWikt')?.checked);
  }

  /**
   * ローディングカードDOM生成とキューへのタスク投入
   */
  function enqueueTask(task) {
    const App = global.App || {};
    if (!App.reqQueue) App.reqQueue = [];

    const $ = global.$ || (id => typeof document !== 'undefined' ? document.getElementById(id) : null);
    const c = typeof document !== 'undefined' ? document.createElement('div') : { classList: { add(){}, remove(){} } };
    c.className = 'card loading-card';
    c.innerHTML = `<div class="card-acts" style="opacity:1"><button type="button" class="act-icon-btn del-btn" data-act="close-load" aria-label="キャンセル">×</button></div><div class="col-left"><span class="hw">${esc((task.items || []).map(x => x.word).join(', '))}</span></div><div class="right"><div class="load"><div class="spin"></div><span class="st-text">待機中 (${(task.items || []).length}語)...</span></div></div>`;

    const list = $('list');
    if (list) list.prepend(c);
    App.reqQueue.push({ ...task, card: c, isCancelled: false, isDone: false });
    syncPersistedQueue();
    processQueue();
  }

  /**
   * 非同期キュー実行プロセッサ
   */
  async function processQueue() {
    const App = global.App || {};
    const canGenFn = global.canGenerateWords || (() => true);
    if (App.isProcessing || !App.reqQueue?.length || !canGenFn()) return;
    App.isProcessing = true;
    const $ = global.$ || (id => typeof document !== 'undefined' ? document.getElementById(id) : null);

    try {
      while (true) {
        // キャンセルされたタスクのカード除去とキュー掃除
        App.reqQueue = (App.reqQueue || []).filter(q => {
          if (q.isCancelled) {
            q.card?.remove?.();
            return false;
          }
          return true;
        });

        // 次に処理可能なタスク（未キャンセル・未完了・未失敗）を検索
        const nextIdx = App.reqQueue.findIndex(q => !q.isCancelled && !q.isDone && !q.isFailed);
        if (nextIdx === -1) {
          // 実行可能なタスクがない場合は終了
          break;
        }

        const t = App.reqQueue[nextIdx];
        // もしカードがDOM内に見当たらない場合（再描画直後等）は安全に最前面に再アタッチして進捗表示を維持
        if (t.card && typeof document !== 'undefined' && !document.body.contains(t.card) && $('list')) {
          $('list').prepend(t.card);
        }

        let ok = false;
        try {
          ok = await executeBatch(t);
        } catch {
          ok = false;
        }

        if (!ok) {
          t.isFailed = true;
          t.isDone = false;
          syncPersistedQueue();
          // 先頭詰まり(Head-of-Line Blocking)を回避: 失敗タスクは保留にし、後続タスクを継続処理
          continue;
        }

        t.isDone = true;
        if (t.card && !t.card.classList?.contains('gen-err') && !t.card.querySelector?.('[data-act="retry-batch"]')) {
          t.card.remove?.();
        }
        const doneIdx = App.reqQueue.indexOf(t);
        if (doneIdx !== -1) App.reqQueue.splice(doneIdx, 1);
        syncPersistedQueue();

        if (App.reqQueue.some(q => !q.isCancelled && !q.isDone && !q.isFailed)) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
      if (!App.reqQueue.some(q => !q.isDone) && $('list')) {
        $('list').querySelectorAll('.loading-card').forEach(c => {
          if (!c.classList.contains('gen-err') && !c.querySelector('[data-act="retry-batch"]')) c.remove();
        });
      }
    } finally {
      App.isProcessing = false;
    }
  }

  /**
   * 単一バッチ（Wiktionary並行取得、AI通信、エントリ保存）の実行
   */
  async function executeBatch(task) {
    const { items, fName, card, useHist, useWikt, targetLang, srcLang, tgtLang, pairKey } = task;
    const App = global.App || {};
    const LANGS = global.LANGS || {};
    const sLang = srcLang || targetLang || App.srcLang || 'en';
    const tLang = tgtLang || App.tgtLang || 'ja';
    const pairCfg = global.VocabStorage ? global.VocabStorage.getPairConfig(sLang, tLang) : (LANGS[sLang] || LANGS.en);
    const saveKey = pairKey || pairCfg.key;
    const cfg = LANGS[sLang] || LANGS.en || {};
    const sName = cfg.ja || sLang, tCfg = LANGS[tLang] || LANGS.ja || {}, tName = tCfg.ja || tLang;
    const stEl = card?.querySelector ? card.querySelector('.st-text') : null;
    const wiktByIdx = new Map();

    const fetchWiktFn = global.VocabDictionary?.fetchWiktOne || global.fetchWiktOne;
    if (useWikt && fetchWiktFn) {
      if (stEl) stEl.textContent = 'Wiktionaryから対象言語セクションを取得中...';
      await Promise.all(items.map(async (it, idx) => {
        try {
          const res = await fetchWiktFn(it.word, sLang);
          if (res) wiktByIdx.set(idx, res);
        } catch {}
      }));
    }

    const isMono = (sLang === tLang);
    let mInst = '', eInst = '', sys = '';
    const catMap = global.CAT_PROMPT_MAP || '1:日常, 2:学術, 3:ビジネス';

    if (isMono) {
      if (sLang === 'en') {
        mInst = 'Precise English dictionary definition(s) (max 2-3 senses). CRITICAL: If the word has notable historical, political, or institutional usages (e.g. "wet" for anti-prohibitionist / favoring legal alcohol sales, "dry" for prohibitionist, "hawk/dove" for Cold War factions), MUST include that historical sense with a clear context tag like [History/Prohibition]';
        eInst = useHist
          ? 'Provide detailed etymology in English (PIE roots, Latin/Greek origins, semantic shift to modern usage, 40-70 words)'
          : 'Provide root breakdown and morphological origins in English (25-45 words)';
      } else if (sLang === 'fr') {
        mInst = 'Définition(s) précise(s) en français standard académique (max 2-3 acceptions). CRITICAL: Inclure les sens historiques, juridiques ou institutionnels marquants le cas échéant';
        eInst = useHist
          ? 'Étymologie savante en français (étymons latins/grecs/indo-européens, évolution sémantique historique, 40-70 mots)'
          : 'Décomposition morphologique et origine en français (25-45 mots)';
      } else if (sLang === 'de') {
        mInst = 'Präzise deutsche Wörterbuchdefinition(en) (max 2-3 Bedeutungen). WICHTIG: Bedeutende historische oder institutionelle Bedeutungen unbedingt einbeziehen';
        eInst = useHist
          ? 'Wissenschaftliche Etymologie auf Deutsch (Wortwurzeln, historische Bedeutungsverschiebung, 40-70 Wörter)'
          : 'Morphologische Zerlegung und Herkunft auf Deutsch (25-45 Wörter)';
      } else {
        mInst = '日本語での学術的・厳密な語義定義（最大2〜3個）。特定の時代・法制・歴史的文脈における重要語義があれば必ず含めること';
        eInst = useHist
          ? '日本語の語源・原義・漢字の成り立ち・意味の変遷を80〜120字以内で記述'
          : '語根・語源と成り立ちを50〜80字以内で記述';
      }

      sys = `学術的な${sName}モノリンガル辞書・語源辞典として全要求語(${items.length}件すべて漏れなく)のJSON配列を出力せよ。
すべての定義(meanings.text)、コアイメージ(core)、語源解説(etymology)、例文パラフレーズ(example.ja)は【${sName}のみ（同言語解説）】で厳密に出力せよ。
reqIndex/reqWord:入力値をそのまま返せ,
word:辞書見出し語(原形/単数形。独語名詞は語頭大文字、動詞は小文字),
category:分類番号(${catMap}),
phonetic:IPA([]無。wiktionaryIpaがあれば優先採用),
grammar_forms:${cfg.gramHint || ''},
meanings.text:${mInst},
history_note:その単語に特筆すべき歴史的・制度的・文化的用法や時代背景（例: wetなら米国禁酒法下の反禁酒・酒類販売支持派など）がある場合は必ずその背景を具体的に記述(70字以内)。特になければ"",
example:例文と${sName}でのパラフレーズ解説(ja内の見出し語相当箇所を<b>語</b>で囲み、used_formに文中の実際の活用形を記載。歴史的用法が強い語はその文脈を反映した自然な用例を優先),
phrases/derivatives:各0〜2個(derivativesは見出し語と同一語不可),
etymologyTags:0〜3個(【見出し語(word)自身】の語根のみを"*"付きで出力。例:["*sta-"]。例文や派生語に出る別単語の語根は絶対に含めるな。不明は[]),
core:${sName}でのコアイメージ(35字以内),
etymology:${eInst}`;
    } else {
      mInst = `${tName}での正確な訳語・定義${cfg.posHint || ''}(最大2〜3個)。【重要】もしその単語に特定の時代・歴史的出来事（例: wet＝米国禁酒法下の反禁酒・酒類合法化支持派、dry＝禁酒派、dove＝冷戦期ハト派等）における顕著な歴史的・政治的用法がある場合、現代の通常語義に加えて必ずその歴史的用法（【歴史】や【禁酒法】等の文脈ラベル付き）を含めること`;
      eInst = useHist
        ? `wiktionaryRefがあれば最優先根拠とし、語根と歴史・思想的変遷を${tName}で80〜120字(または相当長)で記せ`
        : `wiktionaryRefがあれば根拠とし、語根の分解と成り立ちを${tName}で50〜80字(または相当長)で記せ`;

      sys = `学術的な${sName}から${tName}への対訳語彙・語源辞典として全要求語(${items.length}件すべて漏れなく)のJSON配列を出力せよ。
すべての定義(meanings.text)、コアイメージ(core)、語源解説(etymology)、例文対訳(example.ja)は【${tName}（解説言語）】で出力せよ。
reqIndex/reqWord:入力値をそのまま返せ,
word:辞書見出し語(原形/単数形。独語名詞は語頭大文字、動詞は小文字),
category:分類番号(${catMap}),
phonetic:IPA([]無。wiktionaryIpaがあれば優先採用),
grammar_forms:${cfg.gramHint || ''},
meanings.text:${mInst},
history_note:その単語に特筆すべき歴史的・制度的・文化的用法や時代背景（例: wetなら1920年代米国禁酒法下の反禁酒・酒類販売容認派、dryの対義語など）がある場合は必ずその歴史的背景を具体的に記述(70字以内)。特になければ"",
example:例文と${tName}訳(ja内の見出し語相当箇所を<b>語</b>で囲み、used_formに文中の実際の活用形を記載。歴史的用法が強い語はその文脈を反映した自然な用例を優先),
phrases/derivatives:各0〜2個(derivativesは見出し語と同一語不可),
etymologyTags:0〜3個(【見出し語(word)自身】の語根のみを"*"付きで出力。例:["*sta-"]。例文や派生語に出る別単語の語根は絶対に含めるな。不明は[]),
core:${tName}でのコアイメージ(35字以内),
etymology:${eInst}`;
    }

    const DUMMY_SENSES_LIST = ['文脈上の重要語', '重要語', '文脈語', '重要単語', '語彙', '抽出語', 'OCR抽出'];
    const payload = items.map((x, idx) => {
      const o = { reqIndex: idx, reqWord: x.word, homographIndex: x.homographIndex || 1 };
      if (x.pos) o.contextPos = x.pos;
      if (x.meaning && !DUMMY_SENSES_LIST.includes(x.meaning.trim())) {
        o.targetSenseOrMeaning = x.meaning.trim();
      }
      if (x.sentence) o.contextSentence = x.sentence;
      const wRef = wiktByIdx.get(idx);
      if (wRef) { o.wiktionaryRef = wRef.extract; if (wRef.ipa) o.wiktionaryIpa = wRef.ipa; }
      return o;
    });

    const getKeyFn = global.getKey || (() => '');
    const callGeminiFn = global.VocabDictionary?.callGemini || global.callGemini;
    const parseApiJsonFn = global.VocabDictionary?.parseApiJson || global.parseApiJson || (async res => {
      if (typeof res === 'string') {
        try { return JSON.parse(res); } catch {}
      }
      if (res && typeof res.text === 'function') {
        try {
          const txt = await res.text();
          const json = JSON.parse(txt);
          const cand = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (cand) return JSON.parse(cand.replace(/^```json/i, '').replace(/```$/i, '').trim());
          return json;
        } catch {}
      }
      if (res?.candidates?.[0]?.content?.parts?.[0]?.text) {
        try {
          return JSON.parse(res.candidates[0].content.parts[0].text.replace(/^```json/i, '').replace(/```$/i, '').trim());
        } catch {}
      }
      return Array.isArray(res) ? res : [];
    });
    const genInternalFn = global.VocabDictionary?.generateWithInternalAI || global.generateWithInternalAI;
    const builtinKnowledge = global.VocabDictionary?.BUILTIN_ETYMOLOGY_KNOWLEDGE || global.BUILTIN_ETYMOLOGY_KNOWLEDGE || { roots: {}, historical: {} };
    const schema = global.VocabDictionary?.RESPONSE_SCHEMA || global.RESPONSE_SCHEMA;

    try {
      let returnedList = [], usedModel = '';
      const customKey = getKeyFn();
      if (customKey && callGeminiFn) {
        if (stEl) stEl.textContent = 'カスタムBYOKキーでAI生成中...';
        const res = await callGeminiFn(sys, `対象語(${items.length}件):${JSON.stringify(payload)}${fName ? `\n分野:${fName}` : ''}`, customKey, stEl, schema, useHist);
        const rawArr = await parseApiJsonFn(res);
        returnedList = Array.isArray(rawArr) ? rawArr : [rawArr];
        usedModel = res.usedModel || 'gemini-custom';
      } else if (global.VocabSync?.isProxyReady?.() && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
        try {
          if (stEl) stEl.textContent = 'クラウドAI (Gemini 3.8 Flash) で生成中...';
          const proxyRes = await global.VocabSync.callVocabGenerateProxy({
            lang: sLang,
            srcLang: sLang,
            tgtLang: tLang,
            useHist,
            fName,
            items: payload
          });
          returnedList = Array.isArray(proxyRes.items) ? proxyRes.items : [];
          usedModel = proxyRes.usedModel || 'gemini-3.8-flash-proxy';
          if (proxyRes.quotaRemaining !== undefined && proxyRes.quotaRemaining !== null) {
            App.quotaRemaining = proxyRes.quotaRemaining;
            if (global.updCloudUI) global.updCloudUI();
          }
        } catch (proxyErr) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[Proxy Error]', proxyErr?.message || proxyErr);
          }
          // [P0-4 解決] クォータ上限時は内蔵ダミー生成へ逃げず、直ちにアップセルモーダルを提示して安全に停止
          if (proxyErr.isQuotaExceeded || proxyErr.status === 429) {
            if (typeof global.openUpsellModal === 'function') {
              global.openUpsellModal(proxyErr.message || '本日のAI新規生成無料枠（5語/日）に達しました。Proプランにアップグレードすると無制限に生成できます。');
            }
            if (global.showToast) {
              global.showToast('本日の無料AI新規生成枠の上限に達しました。Proプランで無制限にご利用いただけます。', 'warn', 5000);
            }
            if (card) {
              card.className = 'card gen-err';
              card.dataset.retryItems = JSON.stringify(items);
              card.dataset.fName = fName || '';
              card.dataset.useHist = useHist ? '1' : '0';
              card.dataset.useWikt = useWikt ? '1' : '0';
              card.dataset.srcLang = sLang;
              card.dataset.tgtLang = tLang;
              card.dataset.pairKey = saveKey;
              card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--bg-card);border:1px solid var(--e);border-radius:8px;margin-bottom:8px"><div><div style="font-weight:700;color:var(--e);font-size:13px">AI生成枠上限（${esc(items.map(x=>x.word).join(', '))}）</div><div style="font-size:12px;color:var(--s);margin-top:2px">本日の無料枠(5語/日)に達しました。Proプランで無制限に生成できます。</div></div><div style="display:flex;gap:6px"><button type="button" class="btn-ac btn-xs" data-act="open-upsell" data-reason="無料枠到達">アップグレード</button><button type="button" class="btn-o btn-xs" data-act="close-load">削除</button></div></div>`;
            }
            syncPersistedQueue();
            return false;
          }

          // クラウド一時障害・オフライン時のみ内蔵エンジン (Wiktionary & 組み込み語源ナレッジ & 形態素合成) へフォールバック
          if (genInternalFn) {
            if (stEl) stEl.textContent = '内蔵AIエンジン (完全機密保護) で生成中...';
            const internalRes = await genInternalFn(payload, sLang, tLang, fName, useHist, wiktByIdx);
            returnedList = Array.isArray(internalRes?.items) ? internalRes.items : [];
            usedModel = internalRes?.usedModel || 'builtin-ai-internal';
          }

          if (!returnedList.length) {
            // 万一内蔵エンジンでも1件も生成できなかった場合のみエラーUIを提示
            if (global.showToast) global.showToast(proxyErr.message || 'AI生成エラーが発生しました。「再試行」をお試しください。', 'err', 5000);
            if (card) {
              card.className = 'card gen-err';
              card.dataset.retryItems = JSON.stringify(items);
              card.dataset.fName = fName || '';
              card.dataset.useHist = useHist ? '1' : '0';
              card.dataset.useWikt = useWikt ? '1' : '0';
              card.dataset.srcLang = sLang;
              card.dataset.tgtLang = tLang;
              card.dataset.pairKey = saveKey;
              card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--bg-card);border:1px solid var(--e);border-radius:8px;margin-bottom:8px"><div><div style="font-weight:700;color:var(--e);font-size:13px">AI生成エラー（${esc(items.map(x=>x.word).join(', '))}）</div><div style="font-size:12px;color:var(--s);margin-top:2px">${esc(proxyErr.message || '一時的な通信エラー')}</div></div><div style="display:flex;gap:6px"><button type="button" class="btn-ac btn-xs" data-act="retry-batch">再試行</button><button type="button" class="btn-o btn-xs" data-act="close-load">削除</button></div></div>`;
            }
            syncPersistedQueue();
            return false;
          }
        }
      } else if (genInternalFn) {
        // 内部組み込みAIエンジン (オンデバイスAI / ビルトイン語源ナレッジベース & Wiktionary)
        if (stEl) stEl.textContent = '内蔵AIエンジン (完全機密保護) で生成中...';
        const internalRes = await genInternalFn(payload, sLang, tLang, fName, useHist, wiktByIdx);
        returnedList = internalRes.items;
        usedModel = internalRes.usedModel || 'builtin-ai-internal';
      }

      if (!returnedList || !returnedList.length) {
        if (card) {
          card.className = 'card gen-err';
          card.dataset.retryItems = JSON.stringify(items);
          card.dataset.fName = fName || '';
          card.dataset.useHist = useHist ? '1' : '0';
          card.dataset.useWikt = useWikt ? '1' : '0';
          card.dataset.srcLang = sLang;
          card.dataset.tgtLang = tLang;
          card.dataset.pairKey = saveKey;
          card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--bg-card);border:1px solid var(--e);border-radius:8px;margin-bottom:8px"><div><div style="font-weight:700;color:var(--e);font-size:13px">AI生成エラー（${esc(items.map(x=>x.word).join(', '))}）</div><div style="font-size:12px;color:var(--s);margin-top:2px">エントリの取得に失敗しました</div></div><div style="display:flex;gap:6px"><button type="button" class="btn-ac btn-xs" data-act="retry-batch">再試行</button><button type="button" class="btn-o btn-xs" data-act="close-load">削除</button></div></div>`;
        }
        syncPersistedQueue();
        return false;
      }

      if (useWikt && fetchWiktFn) {
        await Promise.all(returnedList.map(async (raw, rIdx) => {
          if (!raw) return;
          const idx = Number.isInteger(raw.reqIndex) && raw.reqIndex >= 0 && raw.reqIndex < items.length ? raw.reqIndex : rIdx;
          if (!wiktByIdx.has(idx) && raw.word) {
            const postRef = await fetchWiktFn(raw.word, sLang);
            if (postRef) wiktByIdx.set(idx, postRef);
          }
        }));
      }

      const getJsonFn = global.VocabCore?.getJson || global.getJson || global.VocabStorage?.getJson;
      const cur = [...(getJsonFn ? getJsonFn(saveKey) : [])], tombMap = global.VocabStorage ? global.VocabStorage.getTombstones(saveKey) : new Map();
      let maxNum = cur.reduce((m, i) => Math.max(m, i.num || 0), 0);
      const clearedAt = global.VocabStorage?.getClearedAt ? global.VocabStorage.getClearedAt(saveKey) : 0;
      const now = Math.max(Date.now(), (Number(clearedAt) || 0) + 1);
      const gen = { model: usedModel, pv: global.PROMPT_VERSION || 1, at: now }, matchedIndices = new Set();
      const sanitizeItemFn = global.VocabStorage?.sanitizeItem || global.sanitizeItem || (x => x);
      const verifyWiktFn = global.VocabDictionary?.verifyWiktGrounding || global.verifyWiktGrounding;
      const validateEntryFn = global.VocabMorphology?.validateEntry || global.validateEntry || (() => []);
      const makeLkFn = global.VocabMorphology?.makeLookupKey || global.makeLookupKey || ((w, l, h) => h > 1 ? `${w}#${h}` : w);
      const setJsonFn = global.VocabCore?.setJson || global.setJson || global.VocabStorage?.setJson;
      const loadFn = global.VocabCore?.load || global.load || global.VocabListView?.load;

      returnedList.forEach((raw, rIdx) => {
        if (!raw) return;
        let idx = Number.isInteger(raw.reqIndex) && raw.reqIndex >= 0 && raw.reqIndex < items.length ? raw.reqIndex : -1;
        if (idx === -1 || matchedIndices.has(idx)) {
          const reqW = String(raw.reqWord || raw.word || '').trim().normalize('NFC');
          idx = items.findIndex((x, i) => !matchedIndices.has(i) && (makeLkFn(x.word, sLang, 1) === makeLkFn(reqW, sLang, 1) || makeLkFn(x.word, sLang, 1) === makeLkFn(raw.word, sLang, 1)));
        }
        if (idx === -1 && rIdx < items.length && !matchedIndices.has(rIdx)) idx = rIdx;
        const matchedInput = idx !== -1 ? items[idx] : null;
        if (idx !== -1) matchedIndices.add(idx);

        const homoIdx = matchedInput?.homographIndex || 1, wRef = idx !== -1 ? wiktByIdx.get(idx) : null;
        const a = sanitizeItemFn({
          ...raw, phonetic: cleanPho(wRef?.ipa || raw.phonetic), homographIndex: homoIdx,
          wiktGrounded: false, wiktUrl: wRef?.url, contextSentence: matchedInput?.sentence, gen, updatedAt: now,
          tgtLang: tLang
        }, maxNum, sLang);
        if (!a) return;
        if (a.etymologyConfidence === 'unknown') a.etymologyTags = [];
        a.wiktGrounded = Boolean(wRef && verifyWiktFn && verifyWiktFn(a, wRef));
        a.flags = validateEntryFn(a);

        tombMap.delete(`id:${a.id}`);
        tombMap.delete(`wk:${a.wordKey}`);
        const normW = String(a.word || '').trim().toLowerCase();
        if (normW) tombMap.delete(`word:${normW}`);

        const exIdx = cur.findIndex(e => (e.wordKey && e.wordKey === a.wordKey) || makeLkFn(e.word, sLang, e.homographIndex) === makeLkFn(a.word, sLang, homoIdx));
        if (exIdx !== -1) {
          const [ex] = cur.splice(exIdx, 1);
          cur.push({
            ...ex, ...a,
            id: ex.id || a.id,
            num: ++maxNum,
            folder: fName || ex.folder,
            interval: ex.interval,
            repetition: ex.repetition,
            efactor: ex.efactor,
            stability: ex.stability,
            difficulty: ex.difficulty,
            retrievability: ex.retrievability,
            nextReview: ex.nextReview > now ? ex.nextReview : now,
            version: (Number(ex.version) || 1) + 1,
            updatedAt: now,
            reviewUpdatedAt: ex.reviewUpdatedAt || now,
            isDeleted: false
          });
        } else {
          cur.push({ ...a, num: ++maxNum, folder: fName || undefined, version: Number(a.version) || 1, updatedAt: now, reviewUpdatedAt: Number(a.reviewUpdatedAt) || 0, isDeleted: false });
        }
      });

      if (global.VocabStorage) global.VocabStorage.saveTombstones(saveKey, tombMap);
      if (setJsonFn) setJsonFn(saveKey, cur.map((it, i) => ({ ...it, num: i + 1 })), false, true);
      if (saveKey === pairCfg.key && typeof loadFn === 'function') {
        try { loadFn(App.page || 1); } catch {}
      }
      if (global.showToast && matchedIndices.size > 0) {
        global.showToast(`単語カード生成完了: ${items.map(x=>x.word).join(', ')}（${matchedIndices.size}語）を追加しました`, 'ok', 3500);
      }

      if (global.VocabStorage && matchedIndices.size > 0) {
        if (usedModel === 'shared-cache') {
          global.VocabStorage.recordMetricsEvent('cache_hit', matchedIndices.size);
        } else if (usedModel.includes('builtin') || usedModel.includes('on-device')) {
          global.VocabStorage.recordMetricsEvent('on_device', matchedIndices.size);
          global.VocabStorage.recordAiGenerationUsage(matchedIndices.size);
        } else {
          global.VocabStorage.recordMetricsEvent('ai_gen', matchedIndices.size);
          global.VocabStorage.recordAiGenerationUsage(matchedIndices.size);
        }
      }
      if (global.updCloudUI) global.updCloudUI();

      const $ = global.$ || (id => typeof document !== 'undefined' ? document.getElementById(id) : null);
      const missingItems = items.filter((_, i) => !matchedIndices.has(i));
      if (missingItems.length > 0) {
        if (card) {
          card.className = 'card gen-err';
          if (card.dataset) {
            Object.assign(card.dataset, {
              retryItems: JSON.stringify(missingItems),
              fName: fName || '',
              useHist: useHist ? '1' : '0',
              useWikt: useWikt ? '1' : '0',
              srcLang: sLang,
              tgtLang: tLang,
              pairKey: saveKey
            });
          }
          const loadEl = card.querySelector ? card.querySelector('.load') : null;
          if (loadEl) loadEl.innerHTML = `<span style="color:var(--warn)">未取得の語があります (${missingItems.map(x => esc(x.word)).join(', ')})</span><button type="button" class="btn-ac-o btn-xs" data-act="retry-batch">失敗分を再試行</button><button type="button" class="btn-o btn-xs" data-act="close-load">閉じる</button>`;
        }
        if ($('anki')?.style.display !== 'block' && loadFn) loadFn(1);
        return false;
      } else {
        if (task) task.isDone = true;
        if (card) card.remove?.();
        if ($('anki')?.style.display !== 'block' && loadFn) loadFn(1);
        return true;
      }
    } catch (err) {
      if (err.isQuotaExceeded || err.status === 429 || (err.message && (err.message.includes('上限') || err.message.includes('クォータ')))) {
        card?.remove?.();
        if (global.openUpsellModal) global.openUpsellModal(err.message || '本日のAI新規生成無料枠（5語/日）に達しました。');
        if (task) task.isDone = true;
        return true;
      }
      if (err.code === 'MAX_TOKENS' && items.length > 1) {
        const h = Math.ceil(items.length / 2);
        card?.remove?.();
        if (task) task.isDone = true;
        [items.slice(0, h), items.slice(h)].forEach(part => enqueueTask({ items: part, fName, useHist, useWikt, targetLang: sLang, srcLang: sLang, tgtLang: tLang, pairKey: saveKey }));
        return true;
      }
      if (card) {
        card.className = 'card gen-err';
        if (card.dataset) {
          Object.assign(card.dataset, {
            retryItems: JSON.stringify(items),
            fName: fName || '',
            useHist: useHist ? '1' : '0',
            useWikt: useWikt ? '1' : '0',
            srcLang: sLang,
            tgtLang: tLang,
            pairKey: saveKey
          });
        }
        card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--bg-card);border:1px solid var(--e);border-radius:8px;margin-bottom:8px"><div><div style="font-weight:700;color:var(--e);font-size:13px">AI生成エラー（${esc(items.map(x=>x.word).join(', '))}）</div><div style="font-size:12px;color:var(--s);margin-top:2px">${esc(err.message || '一時的な通信エラー')}</div></div><div style="display:flex;gap:6px"><button type="button" class="btn-ac btn-xs" data-act="retry-batch">再試行</button><button type="button" class="btn-o btn-xs" data-act="close-load">削除</button></div></div>`;
      }
      return false;
    }
  }

  // --- グローバルエクスポート ---
  global.VocabQueue = {
    PHRASE_PARTICLES,
    splitInputWords,
    syncPersistedQueue,
    restorePersistedQueue,
    registerWordsList,
    submitW,
    enqueueTask,
    processQueue,
    executeBatch
  };
})(typeof window !== 'undefined' ? window : globalThis);
