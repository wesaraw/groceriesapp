function loadCommitItems() {
  return new Promise(resolve => {
    chrome.storage.local.get('lastCommitItems', data => {
      resolve(data.lastCommitItems || []);
    });
  });
}

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
        const amt = it.amount != null ? `${it.amount.toFixed(2)} ${it.unit}` : '';
        li.textContent = `${it.item} ${amt}`;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    });
});
