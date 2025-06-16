export function scrapeAmazon() {
  const products = [];
  const tiles = document.querySelectorAll('div[data-asin][data-component-type="s-search-result"]');
  tiles.forEach(tile => {
    const name = tile.querySelector('h2.a-size-base-plus span')?.innerText?.trim();
    const image = tile.querySelector('img.s-image')?.src || '';
    const priceText = tile.querySelector('span.a-price span.a-offscreen')?.innerText?.trim();
    const unitText = tile.querySelector('span.a-size-base.a-color-secondary span.a-price.a-text-price span.a-offscreen')?.innerText?.trim();
    const countText = tile.querySelector('span.a-size-base.a-color-base.s-background-color-platinum')?.innerText?.trim();

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
    if (countText) {
      const m = countText.match(/([\d.]+)\s*(\w+)/);
      if (m) {
        sizeQty = parseFloat(m[1]);
        sizeUnit = m[2];
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
        convertedQty: null,
        pricePerUnit,
        image
      });
    }
  });
  return products;
}
