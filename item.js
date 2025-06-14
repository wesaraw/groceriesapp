import { loadJSON } from './utils/dataLoader.js';
import { initUomTable } from './utils/uomConverter.js';

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

async function loadSelected(item, store) {
  const k = key('selected', item, store);
  const data = await getStorage([k]);
  return data[k] || null;
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

function nameMatchesProduct(productName, itemName) {
  const itemWords = itemName
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const prod = productName.toLowerCase();
  return itemWords.some(w => prod.includes(w));
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

    // Previously scraped results are no longer shown in this window

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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'selectedItem' && message.item === itemName) {
      const rec = storeMap.get(message.store);
      if (rec) {
        const selected = message.product;
        let pStr =
          selected.priceNumber != null
            ? `$${selected.priceNumber.toFixed(2)}`
            : selected.price;
        let qStr =
          selected.convertedQty != null
            ? `${selected.convertedQty.toFixed(2)} oz`
            : selected.size;
        let uStr =
          selected.pricePerUnit != null
            ? `$${selected.pricePerUnit.toFixed(2)}/oz`
            : selected.unit;
        rec.info.textContent = `${selected.name} - ${pStr} - ${qStr} - ${uStr}`;
      }
    }
  });

  // Listener updates store info when a product is chosen in the results window
}

init();
