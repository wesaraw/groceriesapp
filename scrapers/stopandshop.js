export function scrapeStopAndShop() {
  const products = [];
  const tiles = document.querySelectorAll('li[class*="StyledProductCard"]');
  tiles.forEach(tile => {
    const name = tile.querySelector('h3[class^="ProductName__StyledProductName"]')?.innerText?.trim();

    const priceText = tile.querySelector('span.sr-only')?.innerText?.trim();

    const perUnitText = tile.querySelector('span.PricePerUnit')?.innerText?.trim();

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
        unit: perUnitText || '',
        unitQty,
        unitType,
        image
      });
    }
  });
  return products;
}
