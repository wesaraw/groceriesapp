chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'openStoreTab') {
    const { url, item, store } = message;
    chrome.storage.local.set({ currentItemInfo: { item, store } }, () => {
      chrome.tabs.create({ url });
    });
  } else if (message.type === 'scrapedData') {
    const key = `scraped_${encodeURIComponent(message.item)}_${encodeURIComponent(message.store)}`;
    chrome.storage.local.set({ [key]: message.products });
  }
});
