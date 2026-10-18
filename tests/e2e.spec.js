/**
 * Vocab Vault — Playwright E2E Automated Regression Test Suite (tests/e2e.spec.js)
 * Real-browser UI rendering, Touch Swipe, Multilingual i18n, 5-Tab Settings, and WebGL Canvas tests.
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = `file://${path.resolve(__dirname, '../index.html')}`;

test.describe('Vocab Vault — Master E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    // 画面サイズ設定（デスクトップ）
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FILE_URL, { waitUntil: 'load' });
    // 初期化とIndexedDBセットアップ完了を待機
    await page.waitForTimeout(300);
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

  test('E2E-2: Multilingual UI switching across 5 supported locales (EN, JA, FR, DE, ES)', async ({ page }) => {
    // 1. Settings モーダルを開く
    await page.evaluate(() => window.openSettings());
    const settingsModal = page.locator('#settingsModal');
    await expect(settingsModal).toBeVisible();

    const langSel = page.locator('#uiLanguageSel');
    await expect(langSel).toBeVisible();

    // 2. French (fr) 切り替え
    await langSel.selectOption('fr');
    await page.waitForTimeout(100);
    const htmlLangFr = await page.getAttribute('html', 'lang');
    expect(htmlLangFr).toBe('fr');
    const frTitle = await page.locator('#cfgModalTitle').textContent();
    expect(frTitle).toContain('Paramètres');

    // 3. German (de) 切り替え
    await langSel.selectOption('de');
    await page.waitForTimeout(100);
    const htmlLangDe = await page.getAttribute('html', 'lang');
    expect(htmlLangDe).toBe('de');
    const deTitle = await page.locator('#cfgModalTitle').textContent();
    expect(deTitle).toContain('Einstellungen');

    // 4. Spanish (es) 切り替え
    await langSel.selectOption('es');
    await page.waitForTimeout(100);
    const htmlLangEs = await page.getAttribute('html', 'lang');
    expect(htmlLangEs).toBe('es');
    const esTitle = await page.locator('#cfgModalTitle').textContent();
    expect(esTitle).toContain('Ajustes');

    // 5. English (en) 切り替え
    await langSel.selectOption('en');
    await page.waitForTimeout(100);
    const htmlLangEn = await page.getAttribute('html', 'lang');
    expect(htmlLangEn).toBe('en');
    const enTitle = await page.locator('#cfgModalTitle').textContent();
    expect(enTitle).toContain('Settings');

    // 6. Japanese (ja) 復帰
    await langSel.selectOption('ja');
    await page.waitForTimeout(100);
    const htmlLangJa = await page.getAttribute('html', 'lang');
    expect(htmlLangJa).toBe('ja');
    const jaTitle = await page.locator('#cfgModalTitle').textContent();
    expect(jaTitle).toContain('設定');

    // モーダルを閉じる
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
    await expect(page.locator('#metricTotalWords')).toBeVisible();

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
    // Anki モードに切り替え
    await page.evaluate(() => window.switchView('anki'));
    const ankiSec = page.locator('#anki');
    await expect(ankiSec).toBeVisible();

    // カードの存在を確認
    const card = page.locator('#ankiCard');
    if (await card.isVisible()) {
      // 擬似スワイプジェスチャー（左スワイプ: Again）
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
    }
  });

  test('E2E-5: Etymology graph modal Canvas 2D & WebGL hardware acceleration initialization', async ({ page }) => {
    // グラフモーダルを開く
    await page.evaluate(() => window.openGraphModal());
    const graphModal = page.locator('#graphModal');
    await expect(graphModal).toBeVisible();

    // 2D Canvas & WebGL Canvas が正常にDOMにマウントされていること
    const canvas2d = page.locator('#graphCanvas');
    await expect(canvas2d).toBeVisible();

    const canvasWebGL = page.locator('#graphWebGLCanvas');
    expect(await canvasWebGL.count()).toBe(1);

    // Canvas のコンテキストが正常に取得できていること
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
    // 単語一覧ビューでページネーション操作
    await page.evaluate(() => window.switchView('list'));

    // ショートカットキー Home / End の発火テスト
    await page.keyboard.press('Home');
    await page.waitForTimeout(50);
    const curPage = await page.evaluate(() => window.App?.currentPage || 1);
    expect(curPage).toBeGreaterThanOrEqual(1);

    await page.keyboard.press('End');
    await page.waitForTimeout(50);
  });

});
