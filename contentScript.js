import { scrapeStopAndShop } from './scrapers/stopandshop.js';

function runScrape() {
  const data = scrapeStopAndShop();
  chrome.storage.local.get('currentItemInfo', info => {
    const { item = '', store = 'Stop & Shop' } = info.currentItemInfo || {};
    chrome.runtime.sendMessage({ type: 'scrapedData', item, store, products: data });
  });
}

// Automatically run shortly after load in case the page is ready
setTimeout(runScrape, 1000);

// Listen for manual trigger from extension UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'triggerScrape') {
    runScrape();
  }
});
