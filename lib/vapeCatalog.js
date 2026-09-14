const { getVapeLineLabel } = require('./categories');

const LINE_DEFAULT_PRICES = {
  black_elite: 599,
  black_empire: 499,
  black_space: 499,
};

/** Full product specs per line — shown on sales and when adding inventory. */
const VAPE_LINE_SPECS = {
  black_empire: [
    'Approx 30k puffs',
    'Transparent case',
    '18 MG/ML liquid',
    'Leak-proof',
  ],
  black_elite: [
    'Approx 50k puffs',
    'Transparent case',
    '30 MG/ML freebase',
    'Mesh coil',
  ],
  black_space: ['Approx 30k puffs', '2x mesh coil'],
};

function getVapeLineSpecs(vapeLine) {
  return VAPE_LINE_SPECS[vapeLine] ?? [];
}

function getVapeLineShortName(vapeLine) {
  const label = getVapeLineLabel(vapeLine);
  return label ? label.split(' (')[0] : vapeLine;
}

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
        vapeLineShortName: getVapeLineShortName(line),
        specs: getVapeLineSpecs(line),
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
  VAPE_LINE_SPECS,
  getDefaultPriceForLine,
  getVapeLineSpecs,
  getVapeLineShortName,
  buildVapeProductName,
  groupProductsByVapeLine,
};
