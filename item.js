import { loadJSON } from './utils/dataLoader.js';
import { initUomTable, convert } from './utils/uomConverter.js';
import { pricePerUnit } from './utils/priceComparer.js';

const STORE_SELECTION_PATH = 'Required for grocery app/store_selection_stopandshop.json';

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
  const btn = document.createElement('button');
  btn.textContent = `Select (${prod.price} - ${prod.unit})`;
  btn.addEventListener('click', () => onSelect(prod));
  const span = document.createElement('span');
  span.textContent = prod.name;
  wrap.appendChild(span);
  wrap.appendChild(btn);
  return wrap;
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

  for (const entry of stores) {
    const div = document.createElement('div');
    div.className = 'store';
    const header = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = entry.store;
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'openStoreTab',
        url: entry.link,
        item: itemName,
        store: entry.store
      });
    });
    header.appendChild(btn);
    div.appendChild(header);

    const info = document.createElement('div');
    info.textContent = 'No item selected';
    div.appendChild(info);

    const selected = await loadSelected(itemName, entry.store);
    if (selected) {
      info.textContent = `${selected.name} - ${selected.price} (${selected.unit})`;
    }

    const scraped = await loadScraped(itemName, entry.store);
    if (scraped && scraped.length > 0) {
      const list = document.createElement('div');
      list.className = 'product-list';
      scraped.forEach(prod => {
        const opt = createProductOption(prod, async (p) => {
          await saveSelected(itemName, entry.store, p);
          info.textContent = `${p.name} - ${p.price} (${p.unit})`;
        });
        list.appendChild(opt);
      });
      div.appendChild(list);
    }

    storesContainer.appendChild(div);
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
}

init();
