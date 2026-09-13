/**
 * Product classification:
 *   category    → individual (single item) | bundle (2+ items)
 *   subcategory → vape | cosmetics
 *   vape_line   → Black Elite / Empire / Space (individual + vape only)
 *   flavor      → free text (individual + vape only)
 */

const SALE_TYPES = {
  individual: {
    label: 'Individual (single item)',
    departments: ['vape', 'cosmetics'],
  },
  bundle: {
    label: 'Bundle (2+ items)',
    departments: ['vape', 'cosmetics'],
  },
};

const DEPARTMENTS = {
  vape: { label: 'Vape' },
  cosmetics: { label: 'Cosmetics' },
};

const VAPE_LINES = [
  { value: 'black_elite', label: 'Black Elite (~50k puffs)' },
  { value: 'black_empire', label: 'Black Empire (~30k puffs)' },
  { value: 'black_space', label: 'Black Space (~30k puffs)' },
];

function getCategoryOptions() {
  return Object.entries(SALE_TYPES).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));
}

function getSubcategoryOptions(category) {
  const cfg = SALE_TYPES[category];
  if (!cfg) return [];
  return cfg.departments.map((value) => ({
    value,
    label: DEPARTMENTS[value].label,
  }));
}

function getVapeLineOptions() {
  return VAPE_LINES;
}

function getCategoryLabel(category) {
  if (!category) return null;
  return SALE_TYPES[category]?.label || category;
}

function getSubcategoryLabel(_category, subcategory) {
  if (!subcategory) return null;
  return DEPARTMENTS[subcategory]?.label || subcategory;
}

function getVapeLineLabel(vapeLine) {
  if (!vapeLine) return null;
  return VAPE_LINES.find((v) => v.value === vapeLine)?.label || vapeLine;
}

function formatCategoryDisplay(category, subcategory, vapeLine, flavor) {
  const saleLabel = getCategoryLabel(category) || category || 'Uncategorized';
  const deptLabel = getSubcategoryLabel(category, subcategory);

  if (!deptLabel) return saleLabel;

  let display = `${saleLabel.split(' (')[0]} — ${deptLabel}`;

  if (subcategory === 'vape' && category === 'individual') {
    const lineLabel = getVapeLineLabel(vapeLine);
    if (lineLabel) display += ` — ${lineLabel}`;
    if (flavor) display += ` — ${flavor}`;
  }

  return display;
}

function normalizeProductFlavor(subcategory, category, flavor) {
  if (subcategory !== 'vape' || category !== 'individual') {
    return { ok: true, flavor: null };
  }
  if (flavor === undefined || flavor === null || !String(flavor).trim()) {
    return { ok: true, flavor: null };
  }
  const trimmed = String(flavor).trim();
  if (trimmed.length > 100) {
    return { ok: false, error: 'flavor must be 100 characters or less' };
  }
  return { ok: true, flavor: trimmed };
}

function normalizeVapeLine(subcategory, category, vapeLine) {
  if (subcategory !== 'vape' || category !== 'individual') {
    return { ok: true, vape_line: null };
  }
  if (!vapeLine || !String(vapeLine).trim()) {
    return { ok: false, error: 'product line is required for individual vape items' };
  }
  const normalized = String(vapeLine).trim();
  if (!VAPE_LINES.some((v) => v.value === normalized)) {
    return { ok: false, error: 'invalid product line' };
  }
  return { ok: true, vape_line: normalized };
}

function isKnownCategory(category) {
  return Boolean(category && SALE_TYPES[category]);
}

function validateProductCategory(category, subcategory, vapeLine) {
  if (!category || !String(category).trim()) {
    return { ok: false, error: 'category is required' };
  }

  const normalizedCategory = String(category).trim();
  if (!SALE_TYPES[normalizedCategory]) {
    return { ok: false, error: 'invalid category' };
  }

  if (!subcategory || !String(subcategory).trim()) {
    return { ok: false, error: 'subcategory is required' };
  }

  const normalizedSubcategory = String(subcategory).trim();
  if (!SALE_TYPES[normalizedCategory].departments.includes(normalizedSubcategory)) {
    return { ok: false, error: 'invalid subcategory for the selected category' };
  }

  if (normalizedCategory === 'bundle' && normalizedSubcategory === 'vape') {
    return { ok: false, error: 'vape bundles are not supported — use individual items' };
  }

  const vapeLineCheck = normalizeVapeLine(normalizedSubcategory, normalizedCategory, vapeLine);
  if (!vapeLineCheck.ok) {
    return vapeLineCheck;
  }

  return {
    ok: true,
    category: normalizedCategory,
    subcategory: normalizedSubcategory,
    vape_line: vapeLineCheck.vape_line,
  };
}

module.exports = {
  SALE_TYPES,
  DEPARTMENTS,
  VAPE_LINES,
  getCategoryOptions,
  getSubcategoryOptions,
  getVapeLineOptions,
  getCategoryLabel,
  getSubcategoryLabel,
  getVapeLineLabel,
  formatCategoryDisplay,
  normalizeProductFlavor,
  normalizeVapeLine,
  isKnownCategory,
  validateProductCategory,
};
