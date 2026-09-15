const VAPE_UNIT_COST = 195;
const BUNDLE_ITEM_COST = 133.33;
/** When item_count × 133.33 exceeds price, cap COGS at this share of retail. */
const BUNDLE_COST_PRICE_RATIO = 0.72;
/** Standalone cosmetics: target ~45% COGS when price allows. */
const INDIVIDUAL_COSMETIC_COST_RATIO = 0.45;

/** Items inside each bundle SKU (from catalog names). */
const BUNDLE_ITEM_COUNTS = {
  'BUNDLE-B1': 3,
  'BUNDLE-B2': 3,
  'BUNDLE-B3': 2,
  'BUNDLE-B4': 2,
  'BUNDLE-B5': 2,
  'BUNDLE-B6': 2,
  'BUNDLE-B7': 2,
  'BUNDLE-B8': 2,
  'BUNDLE-B9': 3,
  'BUNDLE-B10': 3,
};

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function bundleCost(price, itemCount) {
  const retail = Number(price);
  const raw = itemCount * BUNDLE_ITEM_COST;
  if (raw <= retail) {
    return round2(raw);
  }
  return round2(retail * BUNDLE_COST_PRICE_RATIO);
}

function individualCosmeticCost(price) {
  const retail = Number(price);
  const target = retail * INDIVIDUAL_COSMETIC_COST_RATIO;
  const capped = Math.min(target, retail - 1);
  const floor = retail * 0.35;
  return round2(Math.max(capped, floor));
}

function costForProduct({ storeId, category, sku, price }) {
  if (Number(storeId) === 1) {
    return VAPE_UNIT_COST;
  }

  if (category === 'bundle' || String(sku || '').startsWith('BUNDLE-')) {
    const itemCount = BUNDLE_ITEM_COUNTS[sku] || 2;
    return bundleCost(price, itemCount);
  }

  return individualCosmeticCost(price);
}

module.exports = {
  VAPE_UNIT_COST,
  BUNDLE_ITEM_COST,
  BUNDLE_ITEM_COUNTS,
  bundleCost,
  individualCosmeticCost,
  costForProduct,
};
