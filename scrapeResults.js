function storageKey(type, item, store) {
  return `${type}_${encodeURIComponent(item)}_${encodeURIComponent(store)}`;
}

function loadProducts(item, store) {
  return new Promise(resolve => {
    const key = storageKey('scraped', item, store);
    chrome.storage.local.get([key], data => resolve(data[key] || []));
  });
}

function saveSelected(item, store, product) {
  return new Promise(resolve => {
    const key = storageKey('selected', item, store);
    chrome.storage.local.set({ [key]: product }, () => resolve());
  });
}

const params = new URLSearchParams(location.search);
const item = params.get('item');
const store = params.get('store');

const title = document.getElementById('title');
const container = document.getElementById('products');

title.textContent = `${item} - ${store}`;

loadProducts(item, store).then(products => {
  if (products.length === 0) {
    container.textContent = 'No products found.';
    return;
  }
  products.forEach(prod => {
    const div = document.createElement('div');
    div.className = 'product';
    let pStr = prod.priceNumber != null ? `$${prod.priceNumber.toFixed(2)}` : prod.price;
    let qStr = prod.convertedQty != null ? `${prod.convertedQty.toFixed(2)} oz` : prod.size;
    let uStr = prod.pricePerUnit != null ? `$${prod.pricePerUnit.toFixed(2)}/oz` : prod.unit;
    div.textContent = `${prod.name} - ${pStr} - ${qStr} - ${uStr}`;
    const btn = document.createElement('button');
    btn.textContent = 'Select';
    btn.addEventListener('click', async () => {
      await saveSelected(item, store, prod);
      window.close();
    });
    div.appendChild(document.createElement('br'));
    div.appendChild(btn);
    container.appendChild(div);
  });
});
