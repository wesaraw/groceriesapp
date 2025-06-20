import { loadJSON } from './utils/dataLoader.js';
import { calculatePurchaseNeeds } from './utils/purchaseCalculator.js';
import { initUomTable, convert } from './utils/uomConverter.js';

const YEARLY_NEEDS_PATH = 'Required for grocery app/yearly_needs_with_manual_flags.json';
const STORE_SELECTION_PATH = 'Required for grocery app/store_selection_stopandshop.json';
const CONSUMPTION_PATH = 'Required for grocery app/monthly_consumption_table.json';
const STOCK_PATH = 'Required for grocery app/current_stock_table.json';
const EXPIRATION_PATH = 'Required for grocery app/expiration_times_full.json';
const CONSUMED_PATH = 'consumedThisYear';

function loadArray(key, path) {
  return new Promise(async resolve => {
    chrome.storage.local.get(key, async data => {
      if (data[key]) {
        resolve(data[key]);
      } else {
        const arr = await loadJSON(path);
        resolve(arr);
      }
    });
  });
}

const loadNeeds = () => loadArray('yearlyNeeds', YEARLY_NEEDS_PATH);
const loadMonthlyConsumption = () => loadArray('monthlyConsumption', CONSUMPTION_PATH);
const loadExpiration = () => loadArray('expirationData', EXPIRATION_PATH);

async function loadStock() {
  return new Promise(async resolve => {
    chrome.storage.local.get('currentStock', async data => {
      if (data.currentStock) {
        resolve(data.currentStock);
      } else {
        const stock = await loadJSON(STOCK_PATH);
        resolve(stock);
      }
    });
  });
}

async function loadConsumed() {
  return new Promise(async resolve => {
    chrome.storage.local.get(CONSUMED_PATH, async data => {
      if (data[CONSUMED_PATH]) {
        resolve(data[CONSUMED_PATH]);
      } else {
        const needs = await loadNeeds();
        resolve(
          needs.map(n => ({ name: n.name, amount: 0, unit: n.home_unit }))
        );
      }
    });
  });
}

async function getData() {
  const [needs, selections, consumption, stock, expiration, consumed] =
    await Promise.all([
      loadNeeds(),
      loadJSON(STORE_SELECTION_PATH),
      loadMonthlyConsumption(),
      loadStock(),
      loadExpiration(),
      loadConsumed()
    ]);
  return { needs, selections, consumption, stock, expiration, consumed };
}

const finalMap = new Map();
let needsData = [];
let consumptionData = [];
let expirationData = [];
let stockData = [];
let consumedYearData = [];

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
  await initUomTable();
  const { needs, selections, consumption, stock, expiration, consumed } =
    await getData();
  needsData = needs;
  consumptionData = consumption;
  expirationData = expiration;
  stockData = stock;
  consumedYearData = consumed;
  const purchaseInfo = calculatePurchaseNeeds(
    needs,
    consumption,
    stock,
    expiration,
    consumed
  );
  const purchaseMap = new Map(purchaseInfo.map(p => [p.name, p]));
  const itemsContainer = document.getElementById('items');

  needs.forEach(item => {
    const li = document.createElement('li');
    const info = purchaseMap.get(item.name);
    const needAmt = info ? Math.round(info.toBuy) : null;
    const amountText =
      info && !isNaN(needAmt) ? ` (Need: ${needAmt} ${info.home_unit})` : '';
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
    finalMap.set(item.name, { btn, span: finalSpan, img: finalImg });
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

async function refreshNeeds(stock = stockData, consumed = consumedYearData) {
  stockData = stock;
  const purchaseInfo = calculatePurchaseNeeds(
    needsData,
    consumptionData,
    stock,
    expirationData,
    consumed
  );
  const purchaseMap = new Map(purchaseInfo.map(p => [p.name, p]));
  needsData.forEach(item => {
    const rec = finalMap.get(item.name);
    if (rec && rec.btn) {
      const info = purchaseMap.get(item.name);
      const needAmt = info ? Math.round(info.toBuy) : null;
      const amountText =
        info && !isNaN(needAmt) ? ` (Need: ${needAmt} ${info.home_unit})` : '';
      rec.btn.textContent = item.name + amountText;
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.currentStock) {
    const newStock = changes.currentStock.newValue || [];
    refreshNeeds(newStock, consumedYearData);
  }
  if (area === 'local' && changes[CONSUMED_PATH]) {
    const newConsumed = changes[CONSUMED_PATH].newValue || [];
    consumedYearData = newConsumed;
    refreshNeeds(stockData, newConsumed);
  }
  if (
    area === 'local' &&
    (changes.yearlyNeeds || changes.monthlyConsumption || changes.expirationData)
  ) {
    location.reload();
  }
});

async function loadCommitData(itemName) {
  const [store, product] = await Promise.all([
    getFinal(itemName),
    getFinalProduct(itemName)
  ]);
  return { store, product };
}

function getPackCount(product) {
  let m = product?.name?.match(/(\d+)\s*(?:pack|ct|count)/i);
  if (!m && product?.size) {
    m = product.size.match(/pack\s*of\s*(\d+)/i);
    if (!m) {
      m = product.size.match(/(\d+)\s*(?:pack|ct|count)/i);
    }
  }
  if (!m && product?.unit) {
    m = product.unit.match(/pack\s*of\s*(\d+)/i);
    if (!m) {
      m = product.unit.match(/(\d+)\s*(?:pack|ct|count)/i);
    }
  }
  return m ? parseInt(m[1], 10) : 1;
}

async function saveStock(stock) {
  return new Promise(resolve => {
    chrome.storage.local.set({ currentStock: stock }, () => resolve());
  });
}

async function commitSelections() {
  const stock = await loadStock();
  const stockMap = new Map(stock.map(i => [i.name, i]));
  const commitItems = [];

  for (const item of needsData) {
    const { store, product } = await loadCommitData(item.name);
    if (!product) continue;
    const pack = getPackCount(product);

    let amount = pack;
    if (item.home_unit.toLowerCase() !== 'each') {
      let ozQty = null;
      if (product.convertedQty != null) {
        ozQty = product.convertedQty * pack;
      } else if (product.sizeQty != null && product.sizeUnit) {
        ozQty = convert(product.sizeQty * pack, product.sizeUnit, 'oz');
      }
      if (ozQty != null) {
        amount = convert(ozQty, 'oz', item.home_unit);
      }
    }

    const entry = stockMap.get(item.name);
    if (entry) {
      entry.amount = (parseFloat(entry.amount) || 0) + amount;
    } else {
      stockMap.set(item.name, { name: item.name, amount, unit: item.home_unit });
    }
    commitItems.push({ item: item.name, store, product, amount, unit: item.home_unit });
  }

  await saveStock(Array.from(stockMap.values()));
  chrome.storage.local.set({ lastCommitItems: commitItems });

  const url = chrome.runtime.getURL('shoppingList.html');
  chrome.windows.create({ url, type: 'popup', width: 400, height: 600 });
}

document.getElementById('commit').addEventListener('click', commitSelections);

function openInventory() {
  const url = chrome.runtime.getURL('inventory.html');
  chrome.windows.create({ url, type: 'popup', width: 400, height: 600 });
}

document
  .getElementById('editInventory')
  .addEventListener('click', openInventory);

function openConsumption() {
  const url = chrome.runtime.getURL('consumed.html');
  chrome.windows.create({ url, type: 'popup', width: 400, height: 600 });
}

document
  .getElementById('editConsumption')
  .addEventListener('click', openConsumption);

function openAddItem() {
  const url = chrome.runtime.getURL("addItem.html");
  chrome.windows.create({ url, type: "popup", width: 400, height: 600 });
}

document.getElementById("addItem").addEventListener("click", openAddItem);
