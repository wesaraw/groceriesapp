export function scrapeAmazon() {
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
  const tiles = document.querySelectorAll(
    'div[data-asin][data-component-type="s-search-result"]'
  );
  tiles.forEach(tile => {
    const name = tile.querySelector('h2.a-size-base-plus span')?.innerText?.trim();
    const image = tile.querySelector('img.s-image')?.src || '';
    const priceText = tile.querySelector('span.a-price span.a-offscreen')?.innerText?.trim();
    const unitText = tile
      .querySelector('span.a-size-base.a-color-secondary span.a-price.a-text-price span.a-offscreen')
      ?.innerText?.trim();
    const countText = tile
      .querySelector('span.a-size-base.a-color-base.s-background-color-platinum')
      ?.innerText?.trim();

    let packCount = 1;
    let mPack = name?.match(/(\d+)\s*(?:pack|ct|count)/i);
    if (!mPack && countText) {
      mPack = countText.match(/pack\s*of\s*(\d+)/i);
    }
    if (mPack) {
      packCount = parseInt(mPack[1], 10);
    }

    let priceNumber = null;
    if (priceText) {
      const p = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      if (!isNaN(p)) priceNumber = p;
    }

    let pricePerUnit = null;
    let unitType = null;
    if (unitText) {
      const m = unitText.match(/\$([\d.]+)\s*\/\s*(\w+)/);
      if (m) {
        pricePerUnit = parseFloat(m[1]);
        unitType = m[2];
      }
    }

    let sizeQty = null;
    let sizeUnit = null;
    const sizeMatch = (countText || name)?.match(
      /(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|ounce|ounces|lb|pound|g|kg|ml|l)/i
    );
    if (sizeMatch) {
      sizeQty = parseFloat(sizeMatch[1]);
      sizeUnit = sizeMatch[2].toLowerCase();
    }

    if (sizeUnit) {
      const cleaned = sizeUnit.replace(/\s+/g, '');
      if (cleaned === 'ounce' || cleaned === 'ounces') sizeUnit = 'oz';
      else if (cleaned === 'floz') sizeUnit = 'oz';
      else if (cleaned === 'pound') sizeUnit = 'lb';
      else sizeUnit = cleaned;
    }

    let convertedQty = null;
    if (sizeQty != null && sizeUnit && UNIT_FACTORS[sizeUnit]) {
      convertedQty = sizeQty * UNIT_FACTORS[sizeUnit];
      if (priceNumber != null) {
        pricePerUnit = priceNumber / (convertedQty * packCount);
        unitType = 'oz';
      }
    }

    if (name && priceText) {
      products.push({
        name,
        price: priceText,
        priceNumber,
        size: countText || '',
        sizeQty,
        sizeUnit,
        unit: unitText || '',
        unitQty: null,
        unitType,
        convertedQty,
        pricePerUnit,
        image
      });
    }
  });
  return products;
}
