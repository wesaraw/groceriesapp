export function scrapeStopAndShop() {
  const products = [];
  const tiles = document.querySelectorAll('li.tile.product-cell.product-grid-cell');
  tiles.forEach(tile => {
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

    if (name && priceText) {
      products.push({
        name,
        price: priceText,
        size: unitSize || '',
        unit: perUnitText || '',
        unitQty,
        unitType,
        image
      });
    }
  });
  return products;
}
