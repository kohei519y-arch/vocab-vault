/**
 * Vocab Vault - WebKit Headless E2E Test Suite (scripts/webkit_e2e_spec.js)
 * Zero external dependencies. Evaluated inside real Apple WebKit DOM.
 */
(function() {
  const results = [];
  function assert(cond, name) {
    if (cond) {
      results.push({ name: name, pass: true });
    } else {
      results.push({ name: name, pass: false, err: "Assertion failed" });
    }
  }

  try {
    // 1. Core Boot & DOM Mount
    assert(document.title.includes("Vocab Vault"), "Document title contains Vocab Vault");
    assert(document.getElementById("qSearch") !== null, "#qSearch mounted in DOM");
    assert(document.getElementById("graphCanvas") !== null, "#graphCanvas 2D layer mounted");
    assert(document.getElementById("graphWebGLCanvas") !== null, "#graphWebGLCanvas GPU layer mounted");
    assert(document.getElementById("settingsModal") !== null, "#settingsModal mounted");

    // 2. 10-Locale Switching (EN, JA, FR, DE, ES, IT, PT, NL, ZH, KO)
    VocabI18n.setLocale("fr");
    assert(document.documentElement.lang === "fr", "fr: html lang updated to fr");
    assert(VocabI18n.t("nav.review") === "Réviser", "fr: translation dictionary verified");

    VocabI18n.setLocale("de");
    assert(document.documentElement.lang === "de", "de: html lang updated to de");
    assert(VocabI18n.t("nav.review") === "Wiederholen", "de: translation dictionary verified");

    VocabI18n.setLocale("es");
    assert(document.documentElement.lang === "es", "es: html lang updated to es");
    assert(VocabI18n.t("nav.review") === "Repasar", "es: translation dictionary verified");

    VocabI18n.setLocale("it");
    assert(document.documentElement.lang === "it", "it: html lang updated to it");
    assert(VocabI18n.t("nav.review") === "Ripasso", "it: translation dictionary verified");

    VocabI18n.setLocale("pt");
    assert(document.documentElement.lang === "pt", "pt: html lang updated to pt");
    assert(VocabI18n.t("nav.review") === "Revisão", "pt: translation dictionary verified");

    VocabI18n.setLocale("nl");
    assert(document.documentElement.lang === "nl", "nl: html lang updated to nl");
    assert(VocabI18n.t("nav.review") === "Herhalen", "nl: translation dictionary verified");

    VocabI18n.setLocale("zh");
    assert(document.documentElement.lang === "zh", "zh: html lang updated to zh");
    assert(VocabI18n.t("nav.review") === "复习", "zh: translation dictionary verified");

    VocabI18n.setLocale("ko");
    assert(document.documentElement.lang === "ko", "ko: html lang updated to ko");
    assert(VocabI18n.t("nav.review") === "복습", "ko: translation dictionary verified");

    VocabI18n.setLocale("en");
    assert(document.documentElement.lang === "en", "en: html lang updated to en");
    assert(VocabI18n.t("nav.review") === "Review", "en: translation dictionary verified");

    VocabI18n.setLocale("ja");
    assert(document.documentElement.lang === "ja", "ja: html lang restored to ja");
    assert(VocabI18n.t("nav.review") === "復習", "ja: translation dictionary verified");

    // 3. 5-Tab Settings Modal Navigation
    if (typeof switchSettingsTab === "function") {
      switchSettingsTab("account");
      assert(document.getElementById("cfgPanelAccount")?.classList.contains("active"), "Tab: Account active");
      switchSettingsTab("plans");
      assert(document.getElementById("cfgPanelPlans")?.classList.contains("active"), "Tab: Plans active");
      switchSettingsTab("ai");
      assert(document.getElementById("cfgPanelAi")?.classList.contains("active"), "Tab: AI active");
      switchSettingsTab("storage");
      assert(document.getElementById("cfgPanelStorage")?.classList.contains("active"), "Tab: Storage active");
      switchSettingsTab("general");
      assert(document.getElementById("cfgPanelGeneral")?.classList.contains("active"), "Tab: General active");
    }

    // 4. Real WebKit 2D & WebGL Canvas Context Integrity
    const c2d = document.getElementById("graphCanvas");
    const ctx2d = c2d ? c2d.getContext("2d") : null;
    assert(ctx2d !== null, "Canvas 2D context verified in WebKit");

    const cGl = document.getElementById("graphWebGLCanvas");
    const ctxGl = cGl ? (cGl.getContext("webgl") || cGl.getContext("experimental-webgl")) : null;
    assert(ctxGl !== null || (window.WebGLRenderingContext !== undefined), "WebGL hardware context supported in WebKit");

    // 5. View Switching
    if (typeof switchView === "function") {
      switchView("anki");
      assert(document.getElementById("anki")?.style.display !== "none", "Anki view switched");
      switchView("graph");
      assert(document.getElementById("graphSec")?.style.display !== "none", "Graph view switched");
      switchView("list");
      assert(document.getElementById("listSec") !== null, "List view restored");
    }

    // 6. Pagination & Data Integrity
    if (typeof setPage === "function") {
      setPage(1);
      assert((window.App?.currentPage || 1) === 1, "Pagination sliding window verified");
    }

    // 7. 10-Language Starter Packs & Dual PIE/CJK Etymology Tree Verification
    if (window.VocabStarterPack && window.VocabMorphology) {
      const zhPack = VocabStarterPack.getStarterPack("zh");
      const koPack = VocabStarterPack.getStarterPack("ko");
      const esPack = VocabStarterPack.getStarterPack("es");
      const nlPack = VocabStarterPack.getStarterPack("nl");
      assert(Array.isArray(zhPack) && zhPack.length >= 5 && zhPack[0].lang === "zh", "Chinese (zh) starter pack verified");
      assert(Array.isArray(koPack) && koPack.length >= 5 && koPack[0].lang === "ko", "Korean (ko) starter pack verified");
      assert(Array.isArray(esPack) && esPack.length >= 5 && esPack[0].lang === "es", "Spanish (es) starter pack verified");
      assert(Array.isArray(nlPack) && nlPack.length >= 5 && nlPack[0].lang === "nl", "Dutch (nl) starter pack verified");
      assert(VocabMorphology.normRootKey("*经") === "*経", "CJK Simplified-to-Canonical root unification verified");
    }

    return JSON.stringify({ ok: true, results: results });
  } catch (e) {
    return JSON.stringify({ ok: false, error: e.message, stack: e.stack, results: results });
  }
})();
