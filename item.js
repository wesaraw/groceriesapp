import { loadJSON } from './utils/dataLoader.js';
import { initUomTable, convert } from './utils/uomConverter.js';
import { pricePerUnit } from './utils/priceComparer.js';

const STORE_SELECTION_PATH = 'Required for grocery app/store_selection_stopandshop.json';

// Grey placeholder used until real product images load
const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%' height='100%' fill='%23ccc'/></svg>";

function key(type, item, store) {
  return `${type}_${encodeURIComponent(item)}_${encodeURIComponent(store)}`;
}

function getStorage(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, data => resolve(data));
  });
}

function setStorage(obj) {
  return new Promise(resolve => {
    chrome.storage.local.set(obj, () => resolve());
  });
}

async function getStoreEntries(itemName) {
  const all = await loadJSON(STORE_SELECTION_PATH);
  return all.filter(e => e.name === itemName);
}

async function loadScraped(item, store) {
  const k = key('scraped', item, store);
  const data = await getStorage([k]);
  return data[k] || null;
}

async function loadSelected(item, store) {
  const k = key('selected', item, store);
  const data = await getStorage([k]);
  return data[k] || null;
}

async function saveSelected(item, store, product) {
  const k = key('selected', item, store);
  await setStorage({ [k]: product });
}

async function loadFinal(item) {
  const k = `final_${encodeURIComponent(item)}`;
  const data = await getStorage([k]);
  return data[k] || null;
}

async function saveFinal(item, store) {
  const k = `final_${encodeURIComponent(item)}`;
  await setStorage({ [k]: store });
}

function createProductOption(prod, onSelect) {
  const wrap = document.createElement('div');
  wrap.className = 'product';

  const img = document.createElement('img');
  img.src = prod.image || PLACEHOLDER_IMG;
  img.width = 200;
  img.height = 200;
  img.alt = prod.name;
  img.onerror = () => {
    img.src = PLACEHOLDER_IMG;
  };
  wrap.appendChild(img);

  const span = document.createElement('span');
  span.textContent = prod.name;
  wrap.appendChild(span);

  const btn = document.createElement('button');
  let priceStr = prod.priceNumber != null ? `$${prod.priceNumber.toFixed(2)}` : prod.price;
  let qtyStr = prod.convertedQty != null ? `${prod.convertedQty.toFixed(2)} oz` : prod.size;
  let unitStr = prod.pricePerUnit != null ? `$${prod.pricePerUnit.toFixed(2)}/oz` : prod.unit;
  btn.textContent = `Select (${priceStr} - ${qtyStr} - ${unitStr})`;
  btn.addEventListener('click', () => onSelect(prod));
  wrap.appendChild(btn);

  return wrap;
}

function addProductList(div, store, products, info, itemName) {
  if (!products || products.length === 0) return;
  // Remove existing list if any
  const existing = div.querySelector('.product-list');
  if (existing) existing.remove();
  const list = document.createElement('div');
  list.className = 'product-list';
  products.forEach(prod => {
    const opt = createProductOption(prod, async p => {
      await saveSelected(itemName, store, p);
      let pStr = p.priceNumber != null ? `$${p.priceNumber.toFixed(2)}` : p.price;
      let qStr = p.convertedQty != null ? `${p.convertedQty.toFixed(2)} oz` : p.size;
      let uStr = p.pricePerUnit != null ? `$${p.pricePerUnit.toFixed(2)}/oz` : p.unit;
      info.textContent = `${p.name} - ${pStr} - ${qStr} - ${uStr}`;
    });
    list.appendChild(opt);
  });
  div.appendChild(list);
}

async function init() {
  await initUomTable();
  const params = new URLSearchParams(location.search);
  const itemName = params.get('item');
  document.getElementById('itemName').textContent = itemName;
  document.getElementById('back').addEventListener('click', () => {
    window.close();
  });

  const stores = await getStoreEntries(itemName);
  const storesContainer = document.getElementById('stores');
  const storeMap = new Map();

  for (const entry of stores) {
    const div = document.createElement('div');
    div.className = 'store';
    const header = document.createElement('div');
    const openBtn = document.createElement('button');
    openBtn.textContent = entry.store;
    openBtn.addEventListener('click', () => {
      let link = entry.link;
      if (entry.store === 'Walmart') {
        link = link.replace(/%2B/g, '+');
      }
      chrome.runtime.sendMessage({
        type: 'openStoreTab',
        url: link,
        item: itemName,
        store: entry.store
      }, response => {
        const rec = storeMap.get(entry.store);
        if (rec) rec.tabId = response.tabId;
      });
    });
    header.appendChild(openBtn);

    const scrapeBtn = document.createElement('button');
    scrapeBtn.textContent = 'Scrape';
    scrapeBtn.addEventListener('click', () => {
      const rec = storeMap.get(entry.store);
      if (rec && rec.tabId) {
        chrome.tabs.sendMessage(rec.tabId, { type: 'triggerScrape' });
      }
      const url = chrome.runtime.getURL(
        `scrapeResults.html?item=${encodeURIComponent(itemName)}&store=${encodeURIComponent(entry.store)}`
      );
      setTimeout(() => {
        chrome.windows.create({ url, type: 'popup', width: 400, height: 600 });
      }, 1000);
    });
    header.appendChild(scrapeBtn);
    div.appendChild(header);

    const info = document.createElement('div');
    info.textContent = 'No item selected';
    div.appendChild(info);

    const selected = await loadSelected(itemName, entry.store);
    if (selected) {
      let pStr = selected.priceNumber != null ? `$${selected.priceNumber.toFixed(2)}` : selected.price;
      let qStr = selected.convertedQty != null ? `${selected.convertedQty.toFixed(2)} oz` : selected.size;
      let uStr = selected.pricePerUnit != null ? `$${selected.pricePerUnit.toFixed(2)}/oz` : selected.unit;
      info.textContent = `${selected.name} - ${pStr} - ${qStr} - ${uStr}`;
    }

    const scraped = await loadScraped(itemName, entry.store);
    addProductList(div, entry.store, scraped, info, itemName);

    storesContainer.appendChild(div);
    storeMap.set(entry.store, { div, info, tabId: null });
  }

  const finalDiv = document.getElementById('final');
  const finalHeader = document.createElement('h2');
  finalHeader.textContent = 'Final Selection';
  finalDiv.appendChild(finalHeader);
  const finalInfo = document.createElement('div');
  const currentFinal = await loadFinal(itemName);
  finalInfo.textContent = currentFinal ? `Selected store: ${currentFinal}` : 'None';
  finalDiv.appendChild(finalInfo);
  const chooseBtn = document.createElement('button');
  chooseBtn.textContent = 'Choose Store';
  chooseBtn.addEventListener('click', async () => {
    const store = prompt('Enter store name exactly as above:');
    if (store) {
      await saveFinal(itemName, store);
      finalInfo.textContent = `Selected store: ${store}`;
    }
  });
  finalDiv.appendChild(chooseBtn);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'scrapedData' && message.item === itemName) {
      const entry = storeMap.get(message.store);
      if (entry) {
        addProductList(entry.div, message.store, message.products, entry.info, itemName);
      }
    }
  });
}

init();
