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

const finalMap = new Map();

function getFinal(itemName) {
  const key = `final_${encodeURIComponent(itemName)}`;
  return new Promise(resolve => {
    chrome.storage.local.get([key], data => resolve(data[key]));
  });
}

function getFinalProduct(itemName) {
  const key = `final_product_${encodeURIComponent(itemName)}`;
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
    const finalImg = document.createElement('img');
    finalImg.className = 'final-product-img';
    finalImg.width = 50;
    finalImg.height = 50;
    finalImg.style.display = 'none';
    getFinal(item.name).then(async store => {
      const product = await getFinalProduct(item.name);
      if (store) {
        finalSpan.textContent = ` - ${store}`;
      }
      if (product) {
        let pStr =
          product.priceNumber != null
            ? `$${product.priceNumber.toFixed(2)}`
            : product.price;
        let qStr =
          product.convertedQty != null
            ? `${product.convertedQty.toFixed(2)} oz`
            : product.size;
        let uStr =
          product.pricePerUnit != null
            ? `$${product.pricePerUnit.toFixed(2)}/oz`
            : product.unit;
        finalSpan.textContent += ` - ${product.name} - ${pStr} - ${qStr} - ${uStr}`;
        finalImg.src = product.image || '';
        finalImg.alt = product.name || '';
        finalImg.style.display = 'inline';
      }
    });
    li.appendChild(finalSpan);
    li.appendChild(finalImg);
    finalMap.set(item.name, { span: finalSpan, img: finalImg });
    itemsContainer.appendChild(li);
  });
}

init();

// Listen for scraped data sent from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'scrapedData') {
    console.log('Received data for', message.item);
    console.log(message.products);
  } else if (message.type === 'finalSelection') {
    const rec = finalMap.get(message.item);
    if (rec) {
      const { span, img } = rec;
      span.textContent = ` - ${message.store}`;
      if (message.product) {
        const product = message.product;
        let pStr =
          product.priceNumber != null
            ? `$${product.priceNumber.toFixed(2)}`
            : product.price;
        let qStr =
          product.convertedQty != null
            ? `${product.convertedQty.toFixed(2)} oz`
            : product.size;
        let uStr =
          product.pricePerUnit != null
            ? `$${product.pricePerUnit.toFixed(2)}/oz`
            : product.unit;
        span.textContent += ` - ${product.name} - ${pStr} - ${qStr} - ${uStr}`;
        img.src = product.image || '';
        img.alt = product.name || '';
        img.style.display = 'inline';
      }
    }
  }
});
