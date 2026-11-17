/**
 * Vocab Vault Extension — Background Service Worker (Manifest V3)
 */

const DEFAULT_VAULT_URL = "https://vocab-vault-six.vercel.app/";

function getMsg(key, fallback) {
  try {
    if (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getMessage) {
      const val = chrome.i18n.getMessage(key);
      if (val) return val;
    }
  } catch {}
  return fallback;
}

chrome.runtime.onInstalled.addListener(() => {
  const registerMenus = () => {
    chrome.contextMenus.create({
      id: "add-to-vocab-vault",
      title: getMsg("menuAdd", "Add to Vocab Vault: '%s'"),
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "lookup-in-vocab-vault",
      title: getMsg("menuLookup", "Look up etymology in Vocab Vault: '%s'"),
      contexts: ["selection"]
    });
  };
  if (chrome.contextMenus?.removeAll) {
    chrome.contextMenus.removeAll(registerMenus);
  } else {
    registerMenus();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = (info.selectionText || "").trim();
  if (!selectedText) return;

  if (info.menuItemId === "add-to-vocab-vault") {
    saveWordToQueue(selectedText, "en", tab?.url || "");
  } else if (info.menuItemId === "lookup-in-vocab-vault") {
    chrome.storage.local.get(["vaultUrl"], (res) => {
      const baseUrl = res.vaultUrl || DEFAULT_VAULT_URL;
      const targetUrl = `${baseUrl}?w=${encodeURIComponent(selectedText)}&lang=en`;
      chrome.tabs.create({ url: targetUrl });
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "ADD_WORD") {
    saveWordToQueue(msg.word, msg.lang || "en", sender?.tab?.url || "")
      .then((count) => sendResponse({ success: true, count }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.action === "GET_QUEUE") {
    chrome.storage.local.get(["collectedWords"], (res) => {
      sendResponse({ queue: res.collectedWords || [] });
    });
    return true;
  }

  if (msg.action === "CLEAR_QUEUE") {
    chrome.storage.local.set({ collectedWords: [] }, () => {
      updateBadge(0);
      sendResponse({ success: true });
    });
    return true;
  }
});

function saveWordToQueue(word, lang = "en", sourceUrl = "") {
  return new Promise((resolve) => {
    const cleanWord = String(word || "").trim().slice(0, 100);
    if (!cleanWord) return resolve(0);

    chrome.storage.local.get(["collectedWords"], (res) => {
      const list = res.collectedWords || [];
      const exists = list.some((item) => item.word.toLowerCase() === cleanWord.toLowerCase() && item.lang === lang);
      if (!exists) {
        list.unshift({
          word: cleanWord,
          lang: lang,
          sourceUrl: sourceUrl,
          addedAt: Date.now()
        });
        chrome.storage.local.set({ collectedWords: list }, () => {
          updateBadge(list.length);
          resolve(list.length);
        });
      } else {
        resolve(list.length);
      }
    });
  });
}

function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}
