/**
 * Vocab Vault Extension — Background Service Worker (Manifest V3)
 */

const DEFAULT_VAULT_URL = "https://kohei519y-arch.github.io/vocab-vault/";

// 1. 右クリックコンテキストメニューの生成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-vocab-vault",
    title: "Vocab Vault に追加: '%s'",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "lookup-in-vocab-vault",
    title: "Vocab Vault で語源を検索: '%s'",
    contexts: ["selection"]
  });
});

// 2. コンテキストメニュークリック時の挙動
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = (info.selectionText || "").trim();
  if (!selectedText) return;

  if (info.menuItemId === "add-to-vocab-vault") {
    // キューへ保存
    saveWordToQueue(selectedText, "en", tab?.url || "");
  } else if (info.menuItemId === "lookup-in-vocab-vault") {
    // Webアプリで直接開く
    chrome.storage.local.get(["vaultUrl"], (res) => {
      const baseUrl = res.vaultUrl || DEFAULT_VAULT_URL;
      const targetUrl = `${baseUrl}?w=${encodeURIComponent(selectedText)}&lang=en`;
      chrome.tabs.create({ url: targetUrl });
    });
  }
});

// 3. コンテンツスクリプトやポップアップからのメッセージリスナー
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "ADD_WORD") {
    saveWordToQueue(msg.word, msg.lang || "en", sender?.tab?.url || "")
      .then((count) => sendResponse({ success: true, count }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // 非同期応答
  }

  if (msg.action === "GET_QUEUE") {
    chrome.storage.local.get(["collectedWords"], (res) => {
      sendResponse({ queue: res.collectedWords || [] });
    });
    return true;
  }

  if (msg.action === "CLEAR_QUEUE") {
    chrome.storage.local.set({ collectedWords: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// 4. キュー保存ユーティリティ
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
