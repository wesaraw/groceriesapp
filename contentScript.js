import { scrapeStopAndShop } from './scrapers/stopandshop.js';

(async () => {
  const data = scrapeStopAndShop();
  const itemName = new URLSearchParams(window.location.search).get('q') || '';
  chrome.runtime.sendMessage({ type: 'scrapedData', item: itemName, products: data });
})();
