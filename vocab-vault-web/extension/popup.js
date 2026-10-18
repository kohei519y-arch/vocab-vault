/**
 * Vocab Vault Extension — Popup Controller
 */

const DEFAULT_VAULT_URL = "https://kohei519y-arch.github.io/vocab-vault/";

document.addEventListener("DOMContentLoaded", () => {
  const manualInput = document.getElementById("manualInput");
  const langSelect = document.getElementById("langSelect");
  const addBtn = document.getElementById("addBtn");
  const openAppBtn = document.getElementById("openAppBtn");
  const queueList = document.getElementById("queueList");
  const queueCount = document.getElementById("queueCount");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const clearBtn = document.getElementById("clearBtn");

  function renderQueue() {
    chrome.storage.local.get(["collectedWords"], (res) => {
      const list = res.collectedWords || [];
      queueCount.textContent = String(list.length);

      if (list.length === 0) {
        queueList.innerHTML = '<div class="queue-empty">収集した単語はありません。<br>Web閲覧中に単語を選択すると登録できます。</div>';
        return;
      }

      queueList.innerHTML = list.map((item, idx) => `
        <div class="queue-item" data-idx="${idx}">
          <div>
            <span class="item-word">${escapeHtml(item.word)}</span>
            <span class="item-tag">${escapeHtml(item.lang.toUpperCase())}</span>
          </div>
          <button class="item-del" data-idx="${idx}" title="削除">&times;</button>
        </div>
      `).join("");

      // 削除ボタンイベント
      queueList.querySelectorAll(".item-del").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const delIdx = parseInt(btn.getAttribute("data-idx"), 10);
          deleteItem(delIdx);
        });
      });

      // 単語行クリックでWebアプリ検索
      queueList.querySelectorAll(".queue-item").forEach((row) => {
        row.addEventListener("click", () => {
          const idx = parseInt(row.getAttribute("data-idx"), 10);
          const item = list[idx];
          if (item) {
            chrome.storage.local.get(["vaultUrl"], (u) => {
              const url = (u.vaultUrl || DEFAULT_VAULT_URL) + `?w=${encodeURIComponent(item.word)}&lang=${item.lang}`;
              chrome.tabs.create({ url });
            });
          }
        });
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

  // 手動追加
  addBtn.addEventListener("click", () => {
    const word = manualInput.value.trim();
    const lang = langSelect.value;
    if (!word) return;

    chrome.runtime.sendMessage({ action: "ADD_WORD", word, lang }, (res) => {
      if (res && res.success) {
        manualInput.value = "";
        renderQueue();
      }
    });
  });

  manualInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn.click();
  });

  // アプリを開く
  openAppBtn.addEventListener("click", () => {
    chrome.storage.local.get(["vaultUrl"], (res) => {
      chrome.tabs.create({ url: res.vaultUrl || DEFAULT_VAULT_URL });
    });
  });

  // 一括コピー（Vocab Vault の抽出/インポートに貼り付け可能）
  copyAllBtn.addEventListener("click", () => {
    chrome.storage.local.get(["collectedWords"], (res) => {
      const list = res.collectedWords || [];
      if (list.length === 0) return;
      const text = list.map((i) => i.word).join("\n");
      const done = () => {
        copyAllBtn.textContent = "コピー完了!";
        setTimeout(() => { copyAllBtn.textContent = "一括コピー"; }, 1200);
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
    const el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(el);
  }

  // クリア
  clearBtn.addEventListener("click", () => {
    if (confirm("収集した単語キューを全消去しますか？")) {
      chrome.runtime.sendMessage({ action: "CLEAR_QUEUE" }, () => {
        renderQueue();
      });
    }
  });

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  renderQueue();
});
