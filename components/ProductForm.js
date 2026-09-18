import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCategoryOptions,
  getDepartmentForStore,
  isKnownCategory,
} from '../lib/categories';
import { authFetch } from '../lib/api';
import { NEW_LINE_OPTION, formatSpecsText } from '../lib/vapeLines';
import VapeLineSpecs from './VapeLineSpecs';
import { buildVapeProductName, getDefaultPriceForLine } from '../lib/vapeCatalog';

const emptyForm = {
  name: '',
  price: '',
  sku: '',
  category: '',
  subcategory: '',
  vape_line: '',
  flavor: '',
  description: '',
  cost: '',
  stock_quantity: '0',
};

export default function ProductForm({ product, onSave, onCancel, onError, saving, storeId }) {
  const [form, setForm] = useState(emptyForm);
  const [legacyCategory, setLegacyCategory] = useState(null);
  const [vapeLines, setVapeLines] = useState([]);
  const [lineName, setLineName] = useState('');
  const [lineSpecs, setLineSpecs] = useState('');
  const [loadingLines, setLoadingLines] = useState(false);

  const storeDepartment = useMemo(() => getDepartmentForStore(storeId), [storeId]);
  const isVapeStore = storeDepartment === 'vape';
  const categoryOptions = useMemo(() => getCategoryOptions(), []);
  const isNewLine = form.vape_line === NEW_LINE_OPTION;

  const selectedLine = useMemo(
    () => vapeLines.find((line) => line.lineKey === form.vape_line) || null,
    [vapeLines, form.vape_line]
  );

  const loadVapeLines = useCallback(async () => {
    if (!isVapeStore) return;
    setLoadingLines(true);
    try {
      const data = await authFetch('/api/products/vape-lines');
      setVapeLines(data.lines || []);
    } catch {
      setVapeLines([]);
    } finally {
      setLoadingLines(false);
    }
  }, [isVapeStore]);

  useEffect(() => {
    loadVapeLines();
  }, [loadVapeLines]);

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
        description: product.description || '',
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
      setLineName('');
      setLineSpecs('');
    }
  }, [product, storeDepartment, isVapeStore]);

  useEffect(() => {
    if (!isVapeStore || isNewLine) return;
    if (selectedLine) {
      setLineSpecs(formatSpecsText(selectedLine.specs));
      setLineName(selectedLine.label);
    }
  }, [isVapeStore, isNewLine, selectedLine]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleVapeLineChange(e) {
    const vapeLine = e.target.value;
    const line = vapeLines.find((item) => item.lineKey === vapeLine);
    const defaultPrice = line?.defaultPrice ?? getDefaultPriceForLine(vapeLine);

    if (vapeLine === NEW_LINE_OPTION) {
      setLineName('');
      setLineSpecs('');
    } else if (line) {
      setLineName(line.label);
      setLineSpecs(formatSpecsText(line.specs));
    }

    setForm((prev) => ({
      ...prev,
      vape_line: vapeLine,
      price:
        !product && defaultPrice != null
          ? String(defaultPrice)
          : prev.price,
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

  async function persistVapeLine() {
    if (isNewLine) {
      const data = await authFetch('/api/products/vape-lines', {
        method: 'POST',
        body: JSON.stringify({
          label: lineName.trim(),
          specs: lineSpecs,
          default_price: form.price === '' ? undefined : Number(form.price),
        }),
      });
      return data.line.lineKey;
    }

    const specsChanged = formatSpecsText(selectedLine.specs) !== lineSpecs.trim();
    const labelChanged = lineName.trim() && lineName.trim() !== selectedLine.label;

    if (selectedLine && (specsChanged || labelChanged)) {
      await authFetch(`/api/products/vape-lines/${encodeURIComponent(form.vape_line)}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: lineName.trim() || selectedLine.label,
          specs: lineSpecs,
          default_price: selectedLine.defaultPrice,
        }),
      });
      await loadVapeLines();
    }

    return form.vape_line;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (isVapeStore) {
      const flavor = form.flavor.trim();
      if (isNewLine && !lineName.trim()) {
        return;
      }

      let vapeLineKey = form.vape_line;
      try {
        vapeLineKey = await persistVapeLine();
      } catch (err) {
        onError?.(err.message || 'Could not save product line');
        return;
      }

      const name = buildVapeProductName(vapeLineKey, flavor, lineName.trim() || selectedLine?.label);
      if (!name) {
        return;
      }

      onSave({
        name,
        price: Number(form.price),
        category: 'individual',
        subcategory: storeDepartment,
        vape_line: vapeLineKey,
        flavor,
        description: form.description.trim() || undefined,
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
      description: form.description.trim() || undefined,
      cost: form.cost === '' ? undefined : Number(form.cost),
      stock_quantity: Number(form.stock_quantity),
    });
  }

  if (isVapeStore) {
    return (
      <form className="form-grid" onSubmit={handleSubmit}>
        <p className="text-muted" style={{ margin: 0 }}>
          Add a product by choosing or creating a product line, then entering the flavor and stock
          details.
        </p>
        <label>
          Product line *
          <select
            className="input"
            value={form.vape_line}
            onChange={handleVapeLineChange}
            required
            disabled={loadingLines}
          >
            <option value="">Select product line...</option>
            {vapeLines.map((line) => (
              <option key={line.lineKey} value={line.lineKey}>
                {line.label}
              </option>
            ))}
            <option value={NEW_LINE_OPTION}>+ Add new product line...</option>
          </select>
        </label>

        {isNewLine && (
          <label>
            New product line name *
            <input
              className="input"
              value={lineName}
              onChange={(e) => setLineName(e.target.value)}
              placeholder="e.g. Black Fusion"
              required
            />
          </label>
        )}

        {(form.vape_line || isNewLine) && (
          <label>
            Product description
            <textarea
              className="input"
              rows={4}
              value={lineSpecs}
              onChange={(e) => setLineSpecs(e.target.value)}
              placeholder="One detail per line, e.g.&#10;Approx 30k puffs&#10;Mesh coil"
            />
          </label>
        )}

        {form.vape_line && !isNewLine && (
          <VapeLineSpecs specs={lineSpecs.split('\n').map((line) => line.trim()).filter(Boolean)} />
        )}

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
          <button type="submit" className="btn btn-primary" disabled={saving || loadingLines}>
            {saving ? 'Saving...' : product ? 'Update product' : 'Add product'}
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
        Description
        <textarea
          className="input"
          rows={4}
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Product details shown to staff, e.g. ingredients or bundle contents"
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
