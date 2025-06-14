console.log("✅ contentScript.js loaded on page:", window.location.href);

function scrapeStopAndShop() {
  const UNIT_FACTORS = {
    oz: 1,
    lb: 16,
    g: 0.035274,
    kg: 35.274,
    ml: 0.033814,
    l: 33.814,
    gal: 128,
    qt: 32,
    pt: 16,
    cup: 8,
    tbsp: 0.5,
    tsp: 0.1667,
    ea: 1,
    ct: 1,
    pkg: 1,
    box: 1,
    can: 1,
    bag: 1,
    bottle: 1,
    stick: 1,
    roll: 1,
    bar: 1,
    pouch: 1,
    jar: 1,
    packet: 1,
    sleeve: 1,
    slice: 1,
    piece: 1,
    tube: 1,
    tray: 1,
    unit: 1
  };

  const products = [];
  const tiles = document.querySelectorAll('li.tile.product-cell.product-grid-cell');
  console.log(`🧱 Found ${tiles.length} product tiles`);
  tiles.forEach((tile, index) => {
    console.log(`🔍 Tile ${index + 1} innerHTML:`, tile.innerHTML);
    const name = tile.querySelector('.product-grid-cell_price-container > .sr-only')?.innerText?.trim();

    const priceText = tile.querySelector('.product-grid-cell_main-price')?.innerText?.trim();

    const unitSize = tile.querySelector('.product-grid-cell_size')?.innerText?.trim();

    const perUnitText = tile.querySelector('.product-grid-cell_unit')?.innerText?.trim();
    const image = tile.querySelector('img')?.src || '';

    let unitQty = null;
    let unitType = null;
    if (perUnitText) {
      const clean = perUnitText.replace(/[^0-9./a-zA-Z]/g, '');
      const match = clean.match(/([\d.]+)\/([a-zA-Z]+)/);
      if (match) {
        unitQty = parseFloat(match[1]);
        unitType = match[2];
      }
    }

    let priceNumber = null;
    if (priceText) {
      const p = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      if (!isNaN(p)) priceNumber = p;
    }

    let sizeQty = null;
    let sizeUnit = null;
    if (unitSize) {
      const m = unitSize.match(/([\d.]+)\s*([a-zA-Z]+)/);
      if (m) {
        sizeQty = parseFloat(m[1]);
        sizeUnit = m[2];
      }
    }

    let convertedQty = null;
    let pricePerUnit = null;
    if (sizeQty != null && sizeUnit) {
      const factor = UNIT_FACTORS[sizeUnit.toLowerCase()];
      if (factor) {
        convertedQty = sizeQty * factor;
        if (priceNumber != null) {
          pricePerUnit = priceNumber / convertedQty;
        }
      }
    }

    if (name && priceText) {
      console.log(`🧾 Tile ${index + 1}:`, {
        name,
        price: priceText,
        unitSize,
        pricePerUnit: perUnitText,
        image
      });
      products.push({
        name,
        price: priceText,
        priceNumber,
        size: unitSize || '',
        sizeQty,
        sizeUnit,
        unit: perUnitText || '',
        unitQty,
        unitType,
        convertedQty,
        pricePerUnit,
        image
      });
    }
  });
  return products;
}

function scrapeWalmart() {
  const UNIT_FACTORS = {
    oz: 1,
    lb: 16,
    g: 0.035274,
    kg: 35.274,
    ml: 0.033814,
    l: 33.814,
    gal: 128,
    qt: 32,
    pt: 16,
    cup: 8,
    tbsp: 0.5,
    tsp: 0.1667,
    ea: 1,
    ct: 1,
    pkg: 1,
    box: 1,
    can: 1,
    bag: 1,
    bottle: 1,
    stick: 1,
    roll: 1,
    bar: 1,
    pouch: 1,
    jar: 1,
    packet: 1,
    sleeve: 1,
    slice: 1,
    piece: 1,
    tube: 1,
    tray: 1,
    unit: 1
  };

  const products = [];
  const tiles = document.querySelectorAll('[data-testid="list-view"] > div');
  tiles.forEach((tile, i) => {
    const name = tile.querySelector('[data-automation-id="product-title"]')?.innerText?.trim();
    const priceMatch = tile.querySelector('[data-automation-id="product-price"]')?.innerText?.match(/\$?\d+\.\d{2}/);
    const price = priceMatch ? priceMatch[0] : null;
    const perUnitText = tile.querySelector('.gray')?.innerText?.trim();
    let pricePerUnit = null;
    let unitType = null;
    const match = perUnitText?.match(/\$([\d.]+)\/(\w+)/);
    if (match) {
      pricePerUnit = parseFloat(match[1]);
      unitType = match[2].toLowerCase();
      const factor = UNIT_FACTORS[unitType];
      if (factor) {
        pricePerUnit = pricePerUnit / factor;
        unitType = 'oz';
      }
    }
    const image = tile.querySelector('img[data-testid="productTileImage"]')?.src || '';
    let priceNumber = null;
    if (price) {
      const p = parseFloat(price.replace(/[^0-9.]/g, ''));
      if (!isNaN(p)) priceNumber = p;
    }
    if (name && price) {
      products.push({
        name,
        price,
        priceNumber,
        size: '',
        sizeQty: null,
        sizeUnit: null,
        unit: perUnitText || '',
        unitQty: null,
        unitType,
        convertedQty: null,
        pricePerUnit,
        image
      });
    }
  });
  return products;
}

function runScrape() {
  chrome.storage.local.get('currentItemInfo', info => {
    const { item = '', store = 'Stop & Shop' } = info.currentItemInfo || {};
    let data = [];
    if (store === 'Stop & Shop') {
      data = scrapeStopAndShop();
    } else if (store === 'Walmart') {
      data = scrapeWalmart();
    }
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
