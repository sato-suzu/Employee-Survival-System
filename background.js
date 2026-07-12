// ==========================================
// 拡張機能アイコンクリックでサイドパネルを開く設定
// ==========================================
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("サイドパネルの設定に失敗:", error));

// ==========================================
// メッセージレシーバー（タブの偽装工作）
// ==========================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openWorkSite") {
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.update(tabs[0].id, { url: message.url });
        }
        sendResponse({ ok: true });
      })
      .catch(err => {
        console.error("タブの偽装工作に失敗:", err);
        sendResponse({ ok: false, error: err.message });
      });

    return true; // 非同期処理を維持
  }
});

