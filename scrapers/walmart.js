export function scrapeWalmart() {
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
