chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'openStoreTab') {
    chrome.tabs.create({ url: message.url });
  } else if (message.type === 'scrapedData') {
    const key = `${message.item}-${Date.now()}`;
    chrome.storage.local.set({ [key]: message.products });
  }
});
