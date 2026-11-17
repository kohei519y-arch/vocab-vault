/**
 * Vocab Vault Extension — Popup Controller
 */

const DEFAULT_VAULT_URL = "https://vocab-vault-six.vercel.app/";

function msg(key, fallback, sub) {
  try {
    if (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getMessage) {
      const m = chrome.i18n.getMessage(key, sub);
      if (m) return m;
    }
  } catch {}
  return fallback;
}

document.addEventListener("DOMContentLoaded", () => {
  const manualInput = document.getElementById("manualInput");
  const langSelect = document.getElementById("langSelect");
  const addBtn = document.getElementById("addBtn");
  const openAppBtn = document.getElementById("openAppBtn");
  const queueList = document.getElementById("queueList");
  const queueCount = document.getElementById("queueCount");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const clearBtn = document.getElementById("clearBtn");
  const sectionLabel = document.getElementById("sectionLabel");
  const footerHint = document.getElementById("footerHint");

  const isJa = typeof navigator !== "undefined" && String(navigator.language || "").toLowerCase().startsWith("ja");
  document.documentElement.lang = isJa ? "ja" : "en";

  const labels = {
    openApp: msg("openApp", isJa ? "アプリを開く" : "Open App"),
    addWord: msg("addWord", isJa ? "追加" : "Add"),
    collected: msg("collected", isJa ? "収集した単語" : "Collected Words"),
    copyAll: msg("copyAll", isJa ? "一括コピー" : "Copy All"),
    copied: msg("copied", isJa ? "コピー完了!" : "Copied!"),
    clear: msg("clear", isJa ? "クリア" : "Clear"),
    confirmClear: msg("confirmClear", isJa ? "もう一度押して消去" : "Tap again to clear"),
    emptyQueue: msg("emptyQueue", isJa ? "収集した単語はありません。Web閲覧中に単語を選択すると登録できます。" : "No collected words yet. Select text on any page to add."),
    inputPlaceholder: msg("inputPlaceholder", isJa ? "単語を直接入力 (例: serendipity)" : "Enter word (e.g. serendipity)"),
    footerHint: msg("footerHint", isJa ? "Web閲覧中に単語を選択して1タップ登録" : "Select any word while browsing to save in 1 tap"),
    removeItem: isJa ? "削除" : "Remove",
  };

  if (openAppBtn) { openAppBtn.textContent = labels.openApp; openAppBtn.title = labels.openApp; }
  if (addBtn) addBtn.textContent = labels.addWord;
  if (sectionLabel) sectionLabel.textContent = labels.collected;
  if (copyAllBtn) copyAllBtn.textContent = labels.copyAll;
  if (clearBtn) clearBtn.textContent = labels.clear;
  if (manualInput) manualInput.placeholder = labels.inputPlaceholder;
  if (footerHint) footerHint.textContent = labels.footerHint;

  let clearConfirmPending = false;
  let clearResetTimer = null;

  function resetClearConfirm() {
    clearConfirmPending = false;
    if (clearResetTimer) {
      clearTimeout(clearResetTimer);
      clearResetTimer = null;
    }
    if (clearBtn) {
      clearBtn.textContent = labels.clear;
      clearBtn.classList.remove("confirm-pending");
    }
  }

  function renderQueue() {
    chrome.storage.local.get(["collectedWords"], (res) => {
      const list = res.collectedWords || [];
      if (queueCount) queueCount.textContent = String(list.length);
      if (!queueList) return;
      queueList.replaceChildren();

      if (list.length === 0) {
        const empty = document.createElement("div");
        empty.className = "queue-empty";
        empty.textContent = labels.emptyQueue;
        queueList.appendChild(empty);
        return;
      }

      list.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "queue-item";
        row.dataset.idx = String(idx);

        const info = document.createElement("div");
        const wordSpan = document.createElement("span");
        wordSpan.className = "item-word";
        wordSpan.textContent = String(item.word || "");

        const tagSpan = document.createElement("span");
        tagSpan.className = "item-tag";
        tagSpan.textContent = String(item.lang || "en").toUpperCase();

        info.appendChild(wordSpan);
        info.appendChild(tagSpan);

        const delBtn = document.createElement("button");
        delBtn.className = "item-del";
        delBtn.dataset.idx = String(idx);
        delBtn.title = labels.removeItem;
        delBtn.setAttribute("aria-label", labels.removeItem);
        delBtn.textContent = "\u00d7";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteItem(idx);
        });

        row.appendChild(info);
        row.appendChild(delBtn);
        row.addEventListener("click", () => {
          chrome.storage.local.get(["vaultUrl"], (u) => {
            const url = (u.vaultUrl || DEFAULT_VAULT_URL) + `?w=${encodeURIComponent(item.word)}&lang=${encodeURIComponent(item.lang || "en")}`;
            chrome.tabs.create({ url });
          });
        });

        queueList.appendChild(row);
      });
    });
  }

  function deleteItem(idx) {
    chrome.storage.local.get(["collectedWords"], (res) => {
      const list = res.collectedWords || [];
      list.splice(idx, 1);
      chrome.storage.local.set({ collectedWords: list }, () => {
        chrome.action.setBadgeText({ text: list.length > 0 ? String(list.length) : "" });
        renderQueue();
      });
    });
  }

  addBtn?.addEventListener("click", () => {
    const word = (manualInput?.value || "").trim();
    const lang = langSelect?.value || "en";
    if (!word) return;

    chrome.runtime.sendMessage({ action: "ADD_WORD", word, lang }, (res) => {
      if (res && res.success) {
        if (manualInput) manualInput.value = "";
        renderQueue();
      }
    });
  });

  manualInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn?.click();
  });

  openAppBtn?.addEventListener("click", () => {
    chrome.storage.local.get(["vaultUrl"], (res) => {
      chrome.tabs.create({ url: res.vaultUrl || DEFAULT_VAULT_URL });
    });
  });

  copyAllBtn?.addEventListener("click", () => {
    chrome.storage.local.get(["collectedWords"], (res) => {
      const list = res.collectedWords || [];
      if (list.length === 0) return;
      const text = list.map((i) => i.word).join("\n");
      const done = () => {
        copyAllBtn.textContent = labels.copied;
        setTimeout(() => { copyAllBtn.textContent = labels.copyAll; }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {
          copyFallback(text);
          done();
        });
      } else {
        copyFallback(text);
        done();
      }
    });
  });

  function copyFallback(str) {
    const el = document.createElement("textarea");
    el.value = str;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(el);
  }

  clearBtn?.addEventListener("click", () => {
    if (!clearConfirmPending) {
      clearConfirmPending = true;
      clearBtn.textContent = labels.confirmClear;
      clearBtn.classList.add("confirm-pending");
      clearResetTimer = setTimeout(resetClearConfirm, 3000);
      return;
    }
    resetClearConfirm();
    chrome.runtime.sendMessage({ action: "CLEAR_QUEUE" }, () => {
      chrome.action?.setBadgeText?.({ text: "" });
      renderQueue();
    });
  });

  renderQueue();
});
