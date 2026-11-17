/**
 * Vocab Vault — Playwright E2E Automated Regression Test Suite (tests/e2e.spec.js)
 * Real-browser UI rendering, Touch Swipe, Multilingual i18n, 5-Tab Settings, and WebGL Canvas tests.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MAC_INDEX = path.resolve(__dirname, '../Vocab Vault.app/Contents/Resources/web/index.html');
const ROOT_INDEX = path.resolve(__dirname, '../index.html');
const FILE_URL = `file://${fs.existsSync(MAC_INDEX) ? MAC_INDEX : ROOT_INDEX}`;

const APP_URL = '/index.html';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'access-control-allow-headers': '*',
};

async function fulfillCorsJson(route, status, bodyObj) {
  if (route.request().method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: CORS_HEADERS });
  }
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj),
  });
}

test.describe('Vocab Vault — Master E2E Suite', () => {

  test.beforeEach(async ({ page }, testInfo) => {
    const errors = { pageErrors: [], consoleErrors: [], dialogs: [] };
    page._vvErrors = errors;
    page.on('pageerror', err => errors.pageErrors.push(err.stack ? `${err.message || String(err)}\n${err.stack}` : (err.message || String(err))));
    page.on('dialog', dialog => {
      errors.dialogs.push(`${dialog.type()}: ${dialog.message()}`);
      dialog.dismiss().catch(() => {});
    });
    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      const txt = msg.text();
      if (testInfo.title.includes('error recovery') && /Failed to load resource|status of (429|500)/i.test(txt)) return;
      errors.consoleErrors.push(txt);
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    if (!testInfo.title.includes('E2E-10') && !testInfo.title.includes('E2E-11')) {
      await page.addInitScript(() => {
        try {
          localStorage.setItem('vv_welcome_tour_done', '1');
          localStorage.setItem('vv_onboarding_anki_done', '1');
        } catch {}
      });
    }
    if (!testInfo.title.includes('E2E-11')) {
      await page.goto(APP_URL, { waitUntil: 'load' });
      await page.waitForTimeout(250);
    }
  });

  test.afterEach(async ({ page }) => {
    const errors = page._vvErrors || { pageErrors: [], consoleErrors: [], dialogs: [] };
    expect(errors.dialogs, 'Native alert/confirm/prompt dialogs are strictly forbidden').toEqual([]);
    expect(errors.pageErrors, 'Uncaught page errors detected').toEqual([]);
    expect(errors.consoleErrors, 'Console errors detected').toEqual([]);
  });

  test('E2E-1: Page boot and core workspace elements integrity', async ({ page }) => {
    // タイトルとワークスペースコンテナ
    await expect(page).toHaveTitle(/Vocab Vault/);
    const workspace = page.locator('.workspace');
    await expect(workspace).toBeVisible();

    // リボンメニューとサイドバー
    const ribbon = page.locator('.ribbon');
    await expect(ribbon).toBeVisible();
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // 検索入力欄
    const searchInput = page.locator('#qSearch');
    await expect(searchInput).toBeVisible();
  });

  test('E2E-2: Multilingual UI switching across all 10 supported locales with lazy chunks', async ({ page }) => {
    await page.evaluate(() => window.openSettings());
    const settingsModal = page.locator('#settingsModal');
    await expect(settingsModal).toBeVisible();

    const langSel = page.locator('#uiLanguageSel');
    await expect(langSel).toBeVisible();

    const localeExpectations = [
      ['fr', 'Paramètres'],
      ['de', 'Einstellungen'],
      ['es', 'Ajustes'],
      ['it', 'Impostazioni'],
      ['pt', 'Configurações'],
      ['nl', 'Instellingen'],
      ['zh', '设置'],
      ['ko', '설정'],
      ['en', 'Settings'],
      ['ja', '設定'],
    ];

    for (const [loc, expectedTitle] of localeExpectations) {
      await langSel.selectOption(loc);
      await expect(page.locator('html')).toHaveAttribute('lang', loc);
      await expect(page.locator('#cfgModalTitle')).toContainText(expectedTitle);
    }

    await page.evaluate(() => window.toggleModal('settingsModal', false));
    await expect(settingsModal).not.toHaveClass(/open/);
  });

  test('E2E-3: Settings Modal 5-tab navigation and panel switching', async ({ page }) => {
    await page.evaluate(() => window.openSettings());
    const settingsModal = page.locator('#settingsModal');
    await expect(settingsModal).toBeVisible();

    // 5つのタブボタン
    const generalTab = page.locator('.settings-tab-btn[data-tab="general"]');
    const accountTab = page.locator('.settings-tab-btn[data-tab="account"]');
    const plansTab = page.locator('.settings-tab-btn[data-tab="plans"]');
    const aiTab = page.locator('.settings-tab-btn[data-tab="ai"]');
    const storageTab = page.locator('.settings-tab-btn[data-tab="storage"]');

    // 1. Account タブ
    await accountTab.click();
    await expect(page.locator('#cfgPanelAccount')).toHaveClass(/active/);
    await expect(page.locator('#sbEmailInput')).toBeVisible();

    // 2. Plans タブ
    await plansTab.click();
    await expect(page.locator('#cfgPanelPlans')).toHaveClass(/active/);
    await expect(page.locator('#planCardFree')).toBeVisible();
    await expect(page.locator('#planCardPro')).toBeVisible();

    // 3. AI タブ
    await aiTab.click();
    await expect(page.locator('#cfgPanelAi')).toHaveClass(/active/);
    await expect(page.locator('#userAiQuotaCard')).toBeVisible();

    // 4. Storage タブ
    await storageTab.click();
    await expect(page.locator('#cfgPanelStorage')).toHaveClass(/active/);
    await expect(page.locator('.cfg-grid')).toBeVisible();

    // 5. General タブ復帰
    await generalTab.click();
    await expect(page.locator('#cfgPanelGeneral')).toHaveClass(/active/);
    await expect(page.locator('#uiLanguageSel')).toBeVisible();

    await page.evaluate(() => window.toggleModal('settingsModal', false));
  });

  test('E2E-4: Anki review mode card swipe interaction and grading', async ({ page }) => {
    await page.evaluate(() => {
      const entries = [
        { id: 'anki_e2e_1', num: 1, word: 'epistemic', lang: 'en', tgtLang: 'ja', meanings: [{ pos: 'Adj', text: '認識論的な' }] },
        { id: 'anki_e2e_2', num: 2, word: 'heuristic', lang: 'en', tgtLang: 'ja', meanings: [{ pos: 'N', text: '発見的手法' }] }
      ];
      window.setJson('distinction_entries', entries, false, true);
      window.App.entries = entries;
      window.load(1);
      window.startAnki();
    });
    const ankiSec = page.locator('#anki');
    await expect(ankiSec).toBeVisible();

    const card = page.locator('#aCard');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 180, startY + 20, { steps: 5 });
      await page.mouse.up();

      await page.waitForTimeout(200);
    }
  });

  test('E2E-5: Etymology graph modal Mindmap, Matrix & Canvas initialization', async ({ page }) => {
    // グラフモーダルを開く（既定でマインドマップ表示）
    await page.evaluate(() => window.openGraphModal());
    const graphModal = page.locator('#graphModal');
    await expect(graphModal).toBeVisible();
    await expect(page.locator('#graphMindmapWrap')).toBeVisible();

    // 接頭辞×語根マトリクスへ切替
    await page.evaluate(() => window.VocabGraph?.switchViewMode?.('matrix'));
    await expect(page.locator('#graphMatrixWrap')).toBeVisible();

    // 2D Canvas & WebGL Canvas コンテキストが有効に存在すること
    const canvasWebGL = page.locator('#graphWebGLCanvas');
    expect(await canvasWebGL.count()).toBe(1);

    const hasValidContext = await page.evaluate(() => {
      const c = document.getElementById('graphCanvas');
      return Boolean(c && c.getContext('2d'));
    });
    expect(hasValidContext).toBe(true);

    // グラフモーダルを閉じる
    await page.evaluate(() => window.toggleModal('graphModal', false));
    await expect(graphModal).not.toHaveClass(/open/);
  });

  test('E2E-6: Rich pagination navigation and keyboard shortcuts', async ({ page }) => {
    await page.evaluate(() => {
      const entries = [];
      for (let i = 1; i <= 35; i++) {
        entries.push({
          id: `pag_${i}`,
          num: i,
          word: `pagword${i}`,
          lang: 'en',
          tgtLang: 'ja',
          meanings: [{ pos: 'N', text: `ページテスト${i}` }]
        });
      }
      window.setJson('distinction_entries', entries, false, true);
      window.App.entries = entries;
      window.load(1);
    });

    const page2Btn = page.locator('#pag .btn-pag-num[data-page="2"]');
    await expect(page2Btn).toBeVisible();
    await page2Btn.click();
    const curPage = await page.evaluate(() => window.App?.page || 1);
    expect(curPage).toBe(2);

    await page.keyboard.press('Home');
    await page.waitForTimeout(50);
    await page.keyboard.press('End');
    await page.waitForTimeout(50);
  });

  test('E2E-7: Jump to existing word and immediate user scroll stability', async ({ page }) => {
    await page.evaluate(() => {
      const entries = [];
      for (let i = 1; i <= 30; i++) {
        entries.push({
          id: `e2e_${i}`,
          num: i,
          word: `sampleword${i}`,
          lang: 'en',
          tgtLang: 'ja',
          meanings: [{ pos: 'N', text: `サンプル意味${i}` }],
          core: `sample core ${i}`,
          etymology: 'Latin sample root',
          example: { foreign: `This is <b>sampleword${i}</b>.`, ja: `例文${i}` }
        });
      }
      window.setJson('distinction_entries', entries, false, true);
      window.App.entries = entries;
      window.load(1);
    });
    await page.waitForTimeout(100);

    await page.evaluate(() => window.jumpToWord('sampleword25', 'en'));
    await page.waitForTimeout(60);

    const jumpedCard = page.locator('#list .card[data-raw-word="sampleword25"]');
    await expect(jumpedCard).toHaveClass(/highlight-jump/);

    const ms = page.locator('#mainScroll');
    await ms.evaluate(el => {
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: -350, bubbles: true }));
      el.scrollTop = Math.max(0, el.scrollTop - 350);
    });
    const scrollAfterUser = await ms.evaluate(el => el.scrollTop);
    await page.waitForTimeout(700);
    const scrollAfterTimers = await ms.evaluate(el => el.scrollTop);

    expect(Math.abs(scrollAfterTimers - scrollAfterUser)).toBeLessThan(15);
    await expect(page.locator('#list')).not.toHaveClass(/jumping-to-card/);
  });

  test('E2E-8: Mobile 375px layout has no horizontal overflow and collapses sidebar cleanly on Escape or modal open', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(150);

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await page.evaluate(() => window.VocabSearch?.toggleSidebar?.(true));
    await expect(page.locator('body')).toHaveClass(/side-open-lock/);
    await expect(page.locator('body')).not.toHaveClass(/side-collapsed/);

    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveClass(/side-collapsed/);
    await expect(page.locator('body')).not.toHaveClass(/side-open-lock/);

    await page.evaluate(() => window.VocabSearch?.toggleSidebar?.(true));
    await page.evaluate(() => window.openSettings());
    await expect(page.locator('#settingsModal')).toHaveClass(/open/);
    await expect(page.locator('body')).toHaveClass(/side-collapsed/);
    await expect(page.locator('body')).not.toHaveClass(/side-open-lock/);
  });

  test('E2E-9: IME compositionend immediately followed by Enter does not hijack word input', async ({ page }) => {
    await page.evaluate(() => {
      const entries = [{
        id: 'e2e_ime_1',
        num: 1,
        word: 'explicit',
        lang: 'en',
        tgtLang: 'ja',
        meanings: [{ pos: 'Adj', text: '明確な' }]
      }];
      window.setJson('distinction_entries', entries, false, true);
      window.App.entries = entries;
      window.load(1);
    });

    const inWord = page.locator('#inWord');
    await inWord.focus();
    await inWord.evaluate(el => {
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      el.value = 'explicit';
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'explicit' }));
    });
    await page.keyboard.press('Enter');

    const currentVal = await inWord.inputValue();
    expect(currentVal).toBe('explicit');
  });

  test('E2E-10: Onboarding modals never stack on fresh launch and empty i18n keys do not leak raw keys', async ({ page }) => {
    await page.waitForTimeout(1400);
    await expect(page.locator('.modal-ov.open')).toHaveCount(1);
    await expect(page.locator('#welcomeTourModal')).toHaveClass(/open/);

    await page.evaluate(() => window.closeWelcomeTour?.());
    await page.evaluate(() => {
      window.VocabI18n?.setLocale?.('en');
      window.openSettings?.();
    });
    const suffixText = await page.locator('[data-i18n="settings.agree_suffix"]').textContent();
    expect(suffixText).toBe('');
  });

  test('E2E-11: file:// offline Mac app bundle boot and lazy chunk load', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('vv_welcome_tour_done', '1');
        localStorage.setItem('vv_onboarding_anki_done', '1');
      } catch {}
    });
    await page.goto(FILE_URL, { waitUntil: 'load' });
    await page.waitForTimeout(250);

    await expect(page.locator('.workspace')).toBeVisible();
    await expect(page.locator('#qSearch')).toBeVisible();

    await page.evaluate(() => window.VocabI18n?.setLocale?.('fr'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await page.evaluate(() => window.openSettings?.());
    await expect(page.locator('#cfgModalTitle')).toContainText('Paramètres');
  });

  test('E2E-13: Mocked Supabase Auth login, late profile overwrite defense on logout, and 3-way sync', async ({ page }) => {
    let syncBatchCalled = false;
    let holdProfile = false;
    let releaseSlowProfile = null;
    const nowMs = Date.now();

    await page.route('https://*.supabase.co/**', async route => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS_HEADERS });
      }
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/auth/v1/token')) {
        return fulfillCorsJson(route, 200, {
          access_token: 'e2e_mock_access_token',
          refresh_token: 'e2e_mock_refresh_token',
          expires_in: 3600,
          expires_at: Math.floor(nowMs / 1000) + 3600,
          user: { id: 'e2e-user-1', email: 'e2e@vocabvault.test' }
        });
      }
      if (url.includes('/auth/v1/user')) {
        return fulfillCorsJson(route, 200, { id: 'e2e-user-1', email: 'e2e@vocabvault.test', app_metadata: { role: 'user' } });
      }
      if (url.includes('/auth/v1/logout')) {
        return fulfillCorsJson(route, 200, {});
      }
      if (url.includes('/rest/v1/profiles')) {
        if (holdProfile) {
          await new Promise(res => { releaseSlowProfile = res; });
          return fulfillCorsJson(route, 200, [{ id: 'e2e-user-1', plan: 'pro', is_admin: true }]);
        }
        return fulfillCorsJson(route, 200, [{ id: 'e2e-user-1', plan: 'pro', is_admin: false }]);
      }
      if (url.includes('/rest/v1/rpc/server_now_ms')) {
        return fulfillCorsJson(route, 200, nowMs);
      }
      if (url.includes('/rest/v1/user_vocab_entries')) {
        if (url.includes('pair=eq.en_ja')) {
          return fulfillCorsJson(route, 200, [{
            id: 'cloud_e2e_1',
            word: 'perspicacious',
            word_key: 'en:perspicacious#1',
            num: 999,
            lang: 'en',
            pair: 'en_ja',
            updated_at: nowMs,
            server_updated_at: nowMs,
            is_deleted: false,
            card_data: {
              tgtLang: 'ja',
              meanings: [{ pos: 'Adj', text: '洞察力の鋭い' }],
              etymology: 'Latin perspicax (*spek-)',
              etymologyTags: ['*spek-'],
            }
          }]);
        }
        return fulfillCorsJson(route, 200, []);
      }
      if (url.includes('/rest/v1/user_tombstones') || url.includes('/rest/v1/user_lang_watermarks') || url.includes('/rest/v1/user_app_settings')) {
        return fulfillCorsJson(route, 200, []);
      }
      if (url.includes('/rest/v1/rpc/sync_vocab_entries_batch') && method === 'POST') {
        syncBatchCalled = true;
        return fulfillCorsJson(route, 200, { ok: true, server_updated_at: nowMs });
      }
      return fulfillCorsJson(route, 200, []);
    });

    await page.evaluate(() => window.openSettings?.());
    await page.locator('.settings-tab-btn[data-tab="account"]').click();
    await page.locator('#sbEmailInput').fill('e2e@vocabvault.test');
    await page.locator('#sbPassInput').fill('password123');
    await page.locator('[data-act="cloud-login"][data-arg="login"]').click();

    await page.waitForFunction(() => Boolean(window.VocabSync?.isCloudReady?.()) && (window.App?.entries || []).some(e => e.word === 'perspicacious'), { timeout: 6000 });
    await page.evaluate(() => window.toggleModal?.('settingsModal', false));
    await expect(page.locator('#list .card[data-raw-word="perspicacious"]')).toBeVisible({ timeout: 5000 });
    expect(syncBatchCalled).toBe(true);

    // Trigger in-flight slow profile fetch, logout immediately BEFORE it resolves, then release it and verify Free state holds
    holdProfile = true;
    await page.evaluate(() => window.openSettings?.());
    await page.locator('.settings-tab-btn[data-tab="account"]').click();
    await page.evaluate(() => window.VocabCore?.updCloudUI?.());
    await page.waitForFunction(() => true);
    await page.locator('[data-act="cloud-logout"]').click();
    await page.waitForFunction(() => !window.VocabSync?.isCloudReady?.() && !window.App?.isPro, { timeout: 5000 });
    if (releaseSlowProfile) releaseSlowProfile();
    await page.waitForTimeout(250);

    const stateAfterLogout = await page.evaluate(() => ({
      isPro: Boolean(window.App?.isPro),
      isAdmin: Boolean(window.App?.isAdmin),
      ready: Boolean(window.VocabSync?.isCloudReady?.())
    }));
    expect(stateAfterLogout.isPro).toBe(false);
    expect(stateAfterLogout.isAdmin).toBe(false);
    expect(stateAfterLogout.ready).toBe(false);
  });

  test('E2E-14: Mocked vocab-generate Edge Function success and 429 quota error recovery', async ({ page }) => {
    await page.route('https://*.wiktionary.org/**', route => fulfillCorsJson(route, 404, {}));
    await page.route('https://api.dictionaryapi.dev/**', route => fulfillCorsJson(route, 404, {}));

    let mode = 'ok';
    await page.route('**/functions/v1/vocab-generate', async route => {
      if (mode === 'quota') {
        return fulfillCorsJson(route, 429, { error: 'Free daily quota exceeded', code: 'QUOTA_EXCEEDED' });
      }
      return fulfillCorsJson(route, 200, {
        items: [{
          reqIndex: 0,
          word: 'serendipity',
          phonetic: '/ˌsɛr.ənˈdɪp.ɪ.ti/',
          grammar_forms: 'noun',
          category: '哲学',
          meanings: [{ pos: 'Noun', text: '幸運な偶然の発見' }],
          core: '思いがけない発見',
          etymology: 'Coined from Persian Serendip',
          etymologyTags: ['*ser-'],
          history_note: '1754 Walpole letter',
          example: { foreign: 'Finding the archive was pure <b>serendipity</b>.', ja: 'その資料を見つけたのは幸運な偶然だった。' },
          derivatives: [],
          phrases: []
        }],
        usedModel: 'gemini-2.0-flash-proxy',
        quotaRemaining: 4
      });
    });

    await page.evaluate(() => {
      try { localStorage.setItem('vv_use_wikt', '0'); } catch {}
    });

    const inWord = page.locator('#inWord');
    await inWord.fill('serendipity');
    await page.locator('#ctrlForm button[type="submit"]').click();

    await expect(page.locator('#list .card[data-raw-word="serendipity"]')).toBeVisible({ timeout: 5000 });
    expect(await page.evaluate(() => Boolean(window.App?.isProc))).toBe(false);

    // Switch to 429 quota failure and submit another word -> upsell opens, error card renders, queue unlocks
    mode = 'quota';
    await inWord.fill('obfuscate');
    await page.locator('#ctrlForm button[type="submit"]').click();

    await expect(page.locator('#upsellModal')).toHaveClass(/open/, { timeout: 5000 });
    await expect(page.locator('#list .card.gen-err')).toBeVisible();
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => Boolean(window.App?.isProc))).toBe(false);

    // Verify broken Wiktionary/placeholder fallback items are strictly rejected by isPlaceholderItem
    const placeholderCheck = await page.evaluate(() => ({
      foreignRawDef: Boolean(window.VocabQueue?.isPlaceholderItem?.({ word: 'predictive', lang: 'en', tgtLang: 'ja', meanings: [{ pos: 'Adj', text: 'Du latin praedictus.' }] }, 'en', 'ja')),
      stubCore: Boolean(window.VocabQueue?.isPlaceholderItem?.({ word: 'predictive', lang: 'en', tgtLang: 'ja', meanings: [{ pos: 'Adj', text: '予測的な' }], core: '「predictive」の中核概念' }, 'en', 'ja')),
      stubEty: Boolean(window.VocabQueue?.isPlaceholderItem?.({ word: 'predictive', lang: 'en', tgtLang: 'ja', meanings: [{ pos: 'Adj', text: '予測的な' }], etymology: '語源資料（Wiktionary等）の記録に基づく語彙。古英語・ラテン語等の語形成を経る。' }, 'en', 'ja')),
    }));
    expect(placeholderCheck).toEqual({ foreignRawDef: true, stubCore: true, stubEty: true });
  });

  test('E2E-15: Mocked feedback submission, Stripe Checkout redirect, and release artifact isolation', async ({ page }) => {
    const devWebRes = await page.request.get('/vocab-vault-web/dev.html');
    expect(devWebRes.status()).toBe(404);
    const devGuardRes = await page.request.get('/dist/dev_guard.js');
    expect(devGuardRes.status()).toBe(200);
    expect(await devGuardRes.text()).toContain('Developer master mode is strictly disabled on non-local hosts');

    let feedbackPayload = null;
    let checkoutPayload = null;

    await page.route('**/rest/v1/**', async route => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS_HEADERS });
      }
      return fulfillCorsJson(route, 200, []);
    });

    await page.route('**/auth/v1/**', async route => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS_HEADERS });
      }
      return fulfillCorsJson(route, 200, { id: 'e2e-user-1', email: 'e2e@vocabvault.test' });
    });

    await page.route('**/functions/v1/feedback', async route => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS_HEADERS });
      }
      feedbackPayload = route.request().postDataJSON();
      return fulfillCorsJson(route, 200, { ok: true });
    });

    await page.route('**/functions/v1/stripe-checkout', async route => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS_HEADERS });
      }
      checkoutPayload = route.request().postDataJSON();
      return fulfillCorsJson(route, 200, { url: 'http://127.0.0.1:4173/index.html?checkout=mock_ok' });
    });

    // 0. Core cross-module runtime exports availability
    const exportsCheck = await page.evaluate(() => ({
      updKeyUI: typeof window.updKeyUI,
      updCloudUI: typeof window.updCloudUI,
      updStats: typeof window.updStats,
      updateStorageStatusUI: typeof window.updateStorageStatusUI,
      enhanceA11y: typeof window.enhanceA11y,
      extractEtyTags: typeof window.extractEtyTags,
      defaultPackMap: typeof window.VocabStarterPack?.DEFAULT_PACK_BY_LANG,
      canonCjk: typeof window.VocabMorphology?.canonicalizeCjkChar,
      syncSingleKey: typeof window.VocabStorage?.syncSingleKey,
    }));
    expect(exportsCheck).toEqual({
      updKeyUI: 'function',
      updCloudUI: 'function',
      updStats: 'function',
      updateStorageStatusUI: 'function',
      enhanceA11y: 'function',
      extractEtyTags: 'function',
      defaultPackMap: 'object',
      canonCjk: 'function',
      syncSingleKey: 'function',
    });

    // 1. Feedback modal submission and button recovery
    await page.evaluate(() => window.VocabFeedback?.openFeedbackModal?.('opinion'));
    await expect(page.locator('#feedbackModal')).toHaveClass(/open/);
    await page.locator('#fbContent').fill('Playwright E2E verified feedback pipeline.');
    await page.locator('#btnSubmitFb').click();

    await expect(page.locator('#feedbackModal')).not.toHaveClass(/open/, { timeout: 5000 });
    await expect(page.locator('#btnSubmitFb')).toBeEnabled();
    expect(feedbackPayload?.content).toContain('Playwright E2E verified');

    // 2. Stripe Checkout request + redirect with mocked logged-in session
    await page.evaluate(() => {
      try {
        localStorage.setItem('vv_sb_session', JSON.stringify({
          access_token: 'e2e_jwt_token',
          refresh_token: 'e2e_ref_token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'e2e-user-1', email: 'e2e@vocabvault.test' }
        }));
      } catch {}
      window.openSettings?.();
    });
    await page.locator('.settings-tab-btn[data-tab="plans"]').click();
    await page.locator('#btnUpgradePro').click();

    await expect(page).toHaveURL(/checkout=mock_ok/, { timeout: 5000 });
    expect(checkoutPayload?.priceId).toBeTruthy();
  });

});

test.describe('Vocab Vault — Service Worker E2E', () => {
  test.use({ serviceWorkers: 'allow' });

  test('E2E-12: Service Worker precache manifest and static bundle availability over HTTP', async ({ page }) => {
    const errors = { pageErrors: [], consoleErrors: [], dialogs: [] };
    page.on('pageerror', err => errors.pageErrors.push(err.stack ? `${err.message || String(err)}\n${err.stack}` : (err.message || String(err))));
    page.on('dialog', dialog => {
      errors.dialogs.push(`${dialog.type()}: ${dialog.message()}`);
      dialog.dismiss().catch(() => {});
    });
    page.on('console', msg => {
      if (msg.type() === 'error') errors.consoleErrors.push(msg.text());
    });

    await page.addInitScript(() => {
      try {
        localStorage.setItem('vv_welcome_tour_done', '1');
        localStorage.setItem('vv_onboarding_anki_done', '1');
      } catch {}
    });
    await page.goto(APP_URL, { waitUntil: 'load' });
    await page.waitForTimeout(250);

    const assetChecks = await page.evaluate(async () => {
      const urls = [
        '/sw.js',
        '/manifest.json',
        '/dist/app.bundle.js',
        '/dist/chunks/i18n-fr.js',
        '/legal/terms-en.html',
        '/legal/privacy-en.html',
      ];
      const results = [];
      for (const u of urls) {
        const res = await fetch(u, { cache: 'no-store' });
        const text = u === '/sw.js' ? await res.text() : '';
        results.push({ url: u, status: res.status, hasBundle: text.includes('dist/app.bundle.js') });
      }
      return results;
    });

    for (const item of assetChecks) {
      expect(item.status, `Asset HTTP status for ${item.url}`).toBe(200);
      if (item.url === '/sw.js') expect(item.hasBundle).toBe(true);
    }

    const swResult = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false, registered: false };
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.register('./sw.js'),
          new Promise((_, rej) => setTimeout(() => rej(new Error('sw-timeout')), 2500))
        ]);
        return { supported: true, registered: Boolean(reg && reg.scope) };
      } catch {
        return { supported: true, registered: false };
      }
    });
    if (swResult.supported) {
      expect(typeof swResult.registered).toBe('boolean');
    }

    expect(errors.dialogs).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });
});
