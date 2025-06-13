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

function buildLinkMap(selections) {
  const map = {};
  selections.forEach(sel => {
    map[sel.name] = sel.link;
  });
  return map;
}

async function init() {
  const { needs, selections, consumption, stock, expiration } = await getData();
  const linkMap = buildLinkMap(selections);
  const purchaseInfo = calculatePurchaseNeeds(needs, consumption, stock, expiration);
  const purchaseMap = new Map(purchaseInfo.map(p => [p.name, p]));
  const itemsContainer = document.getElementById('items');

  needs.forEach(item => {
    const li = document.createElement('li');
    const info = purchaseMap.get(item.name);
    const amountText = info ? ` (Need: ${info.toBuy} ${info.home_unit})` : '';
    li.textContent = item.name + amountText;

    const btn = document.createElement('button');
    btn.textContent = 'Open Stop & Shop';
    btn.addEventListener('click', () => {
      const url = linkMap[item.name];
      if (url) {
        chrome.runtime.sendMessage({ type: 'openStoreTab', url, item: item.name });
      }
    });

    li.appendChild(document.createElement('br'));
    li.appendChild(btn);
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
