chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openWorkSite") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { url: message.url });
      }
    });
    sendResponse({ ok: true });
  }
});
