export function scrapeWalmart() {
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
    const packMatch = name?.match(/(\d+)\s*pack/i);
    const packCount = packMatch ? parseInt(packMatch[1], 10) : 1;
    const priceMatch = tile.querySelector('[data-automation-id="product-price"]')?.innerText?.match(/\$?\d+\.\d{2}/);
    const price = priceMatch ? priceMatch[0] : null;
    const perUnitText = tile.querySelector('.gray')?.innerText?.trim();
    let pricePerUnit = null;
    let unitType = null;
    let sizeQty = null;
    let sizeUnit = null;
    let convertedQty = null;

    const sizeMatch = name?.match(/(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|lb|g|kg|ml|l|ct)/i);
    if (sizeMatch) {
      sizeQty = parseFloat(sizeMatch[1]);
      sizeUnit = sizeMatch[2].replace(/\s+/g, '');
      const factor = UNIT_FACTORS[sizeUnit.toLowerCase()];
      if (factor) {
        convertedQty = sizeQty * factor;
        unitType = 'oz';
        if (price) {
          const p = parseFloat(price.replace(/[^0-9.]/g, ''));
          if (!isNaN(p)) {
            const totalConverted = convertedQty * packCount;
            pricePerUnit = p / totalConverted;
          }
        }
      }
    }

    if (pricePerUnit == null) {
      const match = perUnitText?.match(/\$([\d.]+)\/?\s*([\d.]*)\s*(\w+)/);
      if (match) {
        let priceVal = parseFloat(match[1]);
        const qtyVal = parseFloat(match[2]);
        const qty = !isNaN(qtyVal) && qtyVal !== 0 ? qtyVal : 1;
        pricePerUnit = priceVal / qty;
        unitType = match[3].toLowerCase();
        const factor = UNIT_FACTORS[unitType];
        if (factor) {
          pricePerUnit = pricePerUnit / factor;
          unitType = 'oz';
        }
      }
    }
    const image = tile.querySelector('img[data-testid="productTileImage"]')?.src || '';
    const link = tile.querySelector('a[href*="/ip/"]')?.href || '';
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
        sizeQty,
        sizeUnit,
        unit: perUnitText || '',
        unitQty: null,
        unitType,
        convertedQty,
        pricePerUnit,
        image,
        link
      });
    }
  });
  return products;
}
