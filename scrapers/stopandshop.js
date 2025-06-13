export function scrapeStopAndShop() {
  const products = [];
  document.querySelectorAll('[data-testid="product-tile"]').forEach(tile => {
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
