console.log("✅ contentScript.js loaded on page:", window.location.href);

function scrapeStopAndShop() {
  const products = [];
  const tiles = document.querySelectorAll('[data-testid="product-tile"]');
  console.log(`🧱 Found ${tiles.length} product tiles`);
  tiles.forEach((tile, index) => {
    console.log(`🔍 Tile ${index + 1} innerHTML:`, tile.innerHTML);
    const name = tile.querySelector('[data-testid="product-title"]')?.innerText?.trim();

    const priceText = tile.querySelector('.product-pricing__sale-price')?.innerText?.trim() ||
      tile.querySelector('.product-pricing__price')?.innerText?.trim() ||
      tile.querySelector('.product-pricing')?.textContent?.match(/\$[0-9.,]+/)?.[0];

    const perUnitText = tile.querySelector('.product-pricing__price-per-unit')?.innerText?.trim();
    const image = tile.querySelector('.product-image__img')?.src || tile.querySelector('img')?.src || '';

    let unitQty = null;
    let unitType = null;
    if (perUnitText) {
      const match = perUnitText.match(/\$([\d.]+)\/([a-zA-Z]+)/);
      if (match) {
        unitQty = parseFloat(match[1]);
        unitType = match[2];
      }
    }

    if (name && priceText) {
      console.log(`🧾 Tile ${index + 1}`, {
        name,
        priceText,
        perUnit: perUnitText,
        image
      });
      products.push({
        name,
        price: priceText,
        unit: perUnitText || '',
        unitQty,
        unitType,
        image
      });
    }
  });
  return products;
}

function runScrape() {
  const data = scrapeStopAndShop();
  chrome.storage.local.get('currentItemInfo', info => {
    const { item = '', store = 'Stop & Shop' } = info.currentItemInfo || {};
    chrome.runtime.sendMessage({ type: 'scrapedData', item, store, products: data });
  });
}

// Automatically run shortly after load in case the page is ready
setTimeout(runScrape, 1000);

// Listen for manual trigger from extension UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'triggerScrape') {
    runScrape();
  }
});
