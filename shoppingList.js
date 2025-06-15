function loadCommitItems() {
  return new Promise(resolve => {
    chrome.storage.local.get('lastCommitItems', data => {
      resolve(data.lastCommitItems || []);
    });
  });
}

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'><rect width='100%' height='100%' fill='%23ccc'/></svg>";

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('list');
  const items = await loadCommitItems();
  if (items.length === 0) {
    container.textContent = 'No items committed.';
    return;
  }
  const byStore = {};
  items.forEach(it => {
    const store = it.store || 'Unknown';
    if (!byStore[store]) byStore[store] = [];
    byStore[store].push(it);
  });
  Object.keys(byStore)
    .sort()
    .forEach(store => {
      const h = document.createElement('h2');
      h.textContent = store;
      container.appendChild(h);
      const ul = document.createElement('ul');
      byStore[store].forEach(it => {
        const li = document.createElement('li');
        const img = new Image();
        img.src = (it.product && it.product.image) || PLACEHOLDER_IMG;
        img.alt = it.product?.name || '';
        li.appendChild(img);
        const span = document.createElement('span');
        let pStr = it.product?.priceNumber != null ? `$${it.product.priceNumber.toFixed(2)}` : it.product?.price || '';
        let qStr = it.product?.convertedQty != null ? `${it.product.convertedQty.toFixed(2)} oz` : it.product?.size || '';
        let uStr = it.product?.pricePerUnit != null ? `$${it.product.pricePerUnit.toFixed(2)}/oz` : it.product?.unit || '';
        const amt = it.amount != null ? `${it.amount.toFixed(2)} ${it.unit}` : '';
        span.textContent = `${it.item} - ${it.product?.name || ''} - ${pStr} - ${qStr} - ${uStr} - ${amt}`;
        li.appendChild(span);
        ul.appendChild(li);
      });
      container.appendChild(ul);
    });
});
