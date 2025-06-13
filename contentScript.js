import { scrapeStopAndShop } from './scrapers/stopandshop.js';

(async () => {
  const data = scrapeStopAndShop();
  chrome.storage.local.get('currentItemInfo', info => {
    const { item = '', store = 'Stop & Shop' } = info.currentItemInfo || {};
    chrome.runtime.sendMessage({ type: 'scrapedData', item, store, products: data });
  });
})();
