import { loadJSON } from './utils/dataLoader.js';
import { calculatePurchaseNeeds } from './utils/purchaseCalculator.js';

const YEARLY_NEEDS_PATH = 'Required for grocery app/yearly_needs_with_manual_flags.json';
const STORE_SELECTION_PATH = 'Required for grocery app/store_selection_stopandshop.json';
const CONSUMPTION_PATH = 'Required for grocery app/monthly_consumption_table.json';
const STOCK_PATH = 'Required for grocery app/current_stock_table.json';
const EXPIRATION_PATH = 'Required for grocery app/expiration_times_full.json';

async function getData() {
  const [needs, selections, consumption, stock, expiration] = await Promise.all([
    loadJSON(YEARLY_NEEDS_PATH),
    loadJSON(STORE_SELECTION_PATH),
    loadJSON(CONSUMPTION_PATH),
    loadJSON(STOCK_PATH),
    loadJSON(EXPIRATION_PATH)
  ]);
  return { needs, selections, consumption, stock, expiration };
}

function getFinal(itemName) {
  const key = `final_${encodeURIComponent(itemName)}`;
  return new Promise(resolve => {
    chrome.storage.local.get([key], data => resolve(data[key]));
  });
}

async function init() {
  const { needs, selections, consumption, stock, expiration } = await getData();
  const purchaseInfo = calculatePurchaseNeeds(needs, consumption, stock, expiration);
  const purchaseMap = new Map(purchaseInfo.map(p => [p.name, p]));
  const itemsContainer = document.getElementById('items');

  needs.forEach(item => {
    const li = document.createElement('li');
    const info = purchaseMap.get(item.name);
    const amountText = info ? ` (Need: ${info.toBuy} ${info.home_unit})` : '';
    const btn = document.createElement('button');
    btn.textContent = item.name + amountText;
    btn.addEventListener('click', () => {
      const url = chrome.runtime.getURL(
        `item.html?item=${encodeURIComponent(item.name)}`
      );
      chrome.windows.create({ url, type: 'popup', width: 400, height: 600 });
    });
    li.appendChild(btn);
    const finalSpan = document.createElement('span');
    getFinal(item.name).then(store => {
      if (store) {
        finalSpan.textContent = ` - ${store}`;
      }
    });
    li.appendChild(finalSpan);
    itemsContainer.appendChild(li);
  });
}

init();

// Listen for scraped data sent from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'scrapedData') {
    console.log('Received data for', message.item);
    console.log(message.products);
  }
});
