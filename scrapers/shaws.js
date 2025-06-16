export function scrapeShaws() {
  const products = [];
  const tiles = document.querySelectorAll('product-item-al-v2');
  tiles.forEach(tile => {
    const name =
      tile.querySelector('[data-qa="prd-itm-pttl"] a')?.innerText?.trim() ||
      tile.querySelector('[data-qa="prd-itm-pttl"]')?.innerText?.trim();
    const priceText = tile.querySelector('[data-qa="prd-itm-prc"]')?.innerText?.trim();
    const sizeText = tile.querySelector('[data-qa="prd-itm-sqty"]')?.innerText?.trim();
    const image = tile.querySelector('img[data-qa="prd-itm-img"]')?.src || '';

    let priceNumber = null;
    if (priceText) {
      const p = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      if (!isNaN(p)) priceNumber = p;
    }

    let sizeQty = null;
    let sizeUnit = null;
    if (sizeText) {
      const m = sizeText.match(/([\d.]+)\s*(\w+)/);
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
        size: sizeText || '',
        sizeQty,
        sizeUnit,
        unit: '',
        unitQty: null,
        unitType: null,
        convertedQty: null,
        pricePerUnit: null,
        image
      });
    }
  });
  return products;
}
