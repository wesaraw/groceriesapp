export function scrapeStopAndShop() {
  const products = [];
  const tiles = document.querySelectorAll('[data-testid="product-tile"], .product-tile');
  tiles.forEach(tile => {
    const name = tile.querySelector('[data-testid="product-name"], .product-name')?.textContent?.trim() || '';
    const price = tile.querySelector('[data-testid="product-price"], .product-price')?.textContent?.trim() || '';
    const unit = tile.querySelector('[data-testid="product-unit"], .product-unit')?.textContent?.trim() || '';
    const image = tile.querySelector('img')?.src || '';
    if (name && price) {
      products.push({ name, price, unit, image });
    }
  });
  return products;
}
