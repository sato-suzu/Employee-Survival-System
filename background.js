// ==========================================
// 拡張機能アイコンクリックでサイドパネルを開く設定
// ==========================================
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("サイドパネルの設定に失敗:", error));
