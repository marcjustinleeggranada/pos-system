const { getVapeLineLabel } = require('./categories');

const LINE_DEFAULT_PRICES = {
  black_elite: 599,
  black_empire: 499,
  black_space: 499,
};

function getDefaultPriceForLine(vapeLine) {
  return LINE_DEFAULT_PRICES[vapeLine] ?? null;
}

function buildVapeProductName(vapeLine, flavor) {
  const lineLabel = getVapeLineLabel(vapeLine);
  if (!lineLabel || !flavor) return null;
  const shortLine = lineLabel.split(' (')[0];
  return `${shortLine} — ${String(flavor).trim()}`;
}

function groupProductsByVapeLine(products) {
  const map = new Map();

  for (const product of products) {
    const line = product.vapeLine || 'unknown';
    if (!map.has(line)) {
      map.set(line, {
        vapeLine: line,
        vapeLineLabel: product.vapeLineLabel || line,
        price: product.price,
        variants: [],
        totalStock: 0,
      });
    }

    const group = map.get(line);
    group.variants.push(product);
    group.totalStock += product.stockQuantity;
    if (product.price != null) {
      group.price = product.price;
    }
  }

  return [...map.values()]
    .map((group) => ({
      ...group,
      variants: [...group.variants].sort((a, b) =>
        (a.flavor || a.name).localeCompare(b.flavor || b.name)
      ),
      inStockVariants: group.variants.filter((v) => v.stockQuantity > 0),
    }))
    .sort((a, b) => a.vapeLineLabel.localeCompare(b.vapeLineLabel));
}

module.exports = {
  LINE_DEFAULT_PRICES,
  getDefaultPriceForLine,
  buildVapeProductName,
  groupProductsByVapeLine,
};
