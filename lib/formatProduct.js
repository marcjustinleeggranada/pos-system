const {
  getCategoryLabel,
  getSubcategoryLabel,
  getVapeLineLabel,
  formatCategoryDisplay,
} = require('./categories');

function formatProduct(row) {
  const category = row.category;
  const subcategory = row.subcategory ?? null;
  const vapeLine = row.vape_line ?? null;
  const flavor = row.flavor ?? null;

  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    sku: row.sku,
    category,
    subcategory,
    vapeLine,
    flavor,
    categoryLabel: getCategoryLabel(category) || category || null,
    subcategoryLabel: getSubcategoryLabel(category, subcategory) || subcategory || null,
    vapeLineLabel: getVapeLineLabel(vapeLine),
    categoryDisplay: formatCategoryDisplay(category, subcategory, vapeLine, flavor),
    description: row.description ?? null,
    price: Number(row.price),
    cost: row.cost != null ? Number(row.cost) : null,
    stockQuantity: row.stock_quantity,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = { formatProduct };
