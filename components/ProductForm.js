import { useEffect, useMemo, useState } from 'react';
import {
  getCategoryOptions,
  getDepartmentForStore,
  getVapeLineOptions,
  isKnownCategory,
} from '../lib/categories';
import { buildVapeProductName, getDefaultPriceForLine } from '../lib/vapeCatalog';

const emptyForm = {
  name: '',
  price: '',
  sku: '',
  category: '',
  subcategory: '',
  vape_line: '',
  flavor: '',
  cost: '',
  stock_quantity: '0',
};

export default function ProductForm({ product, onSave, onCancel, saving, storeId }) {
  const [form, setForm] = useState(emptyForm);
  const [legacyCategory, setLegacyCategory] = useState(null);

  const storeDepartment = useMemo(() => getDepartmentForStore(storeId), [storeId]);
  const isVapeStore = storeDepartment === 'vape';
  const categoryOptions = useMemo(() => getCategoryOptions(), []);
  const vapeLineOptions = useMemo(() => getVapeLineOptions(), []);

  useEffect(() => {
    if (product) {
      const knownCategory = product.category && isKnownCategory(product.category);
      setLegacyCategory(knownCategory ? null : product.category || null);
      setForm({
        name: product.name || '',
        price: String(product.price ?? ''),
        sku: product.sku || '',
        category: knownCategory ? product.category : isVapeStore ? 'individual' : '',
        subcategory: knownCategory ? product.subcategory || '' : storeDepartment || '',
        vape_line: knownCategory ? product.vapeLine || '' : '',
        flavor: knownCategory ? product.flavor || '' : '',
        cost: product.cost != null ? String(product.cost) : '',
        stock_quantity: String(product.stockQuantity ?? 0),
      });
    } else {
      setLegacyCategory(null);
      setForm({
        ...emptyForm,
        category: isVapeStore ? 'individual' : '',
        subcategory: storeDepartment || '',
      });
    }
  }, [product, storeDepartment, isVapeStore]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleVapeLineChange(e) {
    const vapeLine = e.target.value;
    const defaultPrice = getDefaultPriceForLine(vapeLine);
    setForm((prev) => ({
      ...prev,
      vape_line: vapeLine,
      price: !product && defaultPrice != null ? String(defaultPrice) : prev.price,
    }));
  }

  function handleCategoryChange(e) {
    const category = e.target.value;
    setForm((prev) => ({
      ...prev,
      category,
      subcategory: storeDepartment || '',
      vape_line: '',
      flavor: '',
    }));
    setLegacyCategory(null);
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (isVapeStore) {
      const flavor = form.flavor.trim();
      const name = buildVapeProductName(form.vape_line, flavor);
      if (!name) {
        return;
      }

      onSave({
        name,
        price: Number(form.price),
        category: 'individual',
        subcategory: storeDepartment,
        vape_line: form.vape_line,
        flavor,
        cost: form.cost === '' ? undefined : Number(form.cost),
        stock_quantity: Number(form.stock_quantity),
      });
      return;
    }

    onSave({
      name: form.name.trim(),
      price: Number(form.price),
      sku: form.sku.trim() || undefined,
      category: form.category,
      subcategory: storeDepartment,
      cost: form.cost === '' ? undefined : Number(form.cost),
      stock_quantity: Number(form.stock_quantity),
    });
  }

  if (isVapeStore) {
    return (
      <form className="form-grid" onSubmit={handleSubmit}>
        <p className="text-muted" style={{ margin: 0 }}>
          Each flavor is tracked separately in inventory. Pick a product line, then enter the
          flavor you are stocking.
        </p>
        <label>
          Product line *
          <select
            className="input"
            value={form.vape_line}
            onChange={handleVapeLineChange}
            required
          >
            <option value="">Select product line...</option>
            {vapeLineOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Flavor *
          <input
            className="input"
            value={form.flavor}
            onChange={handleChange('flavor')}
            placeholder="e.g. Mango (Yellow Summer)"
            required
          />
        </label>
        <label>
          Price *
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={handleChange('price')}
            required
          />
        </label>
        <label>
          Cost
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.cost}
            onChange={handleChange('cost')}
          />
        </label>
        <label>
          Stock quantity *
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={form.stock_quantity}
            onChange={handleChange('stock_quantity')}
            required
          />
        </label>
        <div className="panel-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : product ? 'Update flavor' : 'Add flavor'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        Name *
        <input className="input" value={form.name} onChange={handleChange('name')} required />
      </label>
      <label>
        Price *
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={handleChange('price')}
          required
        />
      </label>
      <label>
        Category *
        <select className="input" value={form.category} onChange={handleCategoryChange} required>
          <option value="">Select category...</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {legacyCategory && (
        <p className="summary-note" style={{ gridColumn: '1 / -1', margin: 0 }}>
          This product uses a legacy category (&quot;{legacyCategory}&quot;). Choose a category above
          to update it.
        </p>
      )}
      <label>
        Cost
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={form.cost}
          onChange={handleChange('cost')}
        />
      </label>
      <label>
        Stock quantity
        <input
          className="input"
          type="number"
          min="0"
          step="1"
          value={form.stock_quantity}
          onChange={handleChange('stock_quantity')}
        />
      </label>
      <div className="panel-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : product ? 'Update product' : 'Add product'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
