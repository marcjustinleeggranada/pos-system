import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import Layout from '../../components/Layout';
import ProductForm from '../../components/ProductForm';
import { authFetch, formatCurrency, getUser } from '../../lib/api';
import { getDepartmentForStore } from '../../lib/categories';
import { buildVapeLineMap, formatSpecsText } from '../../lib/vapeLines';

export default function ProductsPage() {
  const user = getUser();
  const isVapeStore = getDepartmentForStore(user?.storeId) === 'vape';
  const [products, setProducts] = useState([]);
  const [vapeLineMeta, setVapeLineMeta] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFetch('/api/products/manage');
      setProducts(data.products);
      setVapeLineMeta(buildVapeLineMap(data.vapeLines || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.vapeLineLabel && p.vapeLineLabel.toLowerCase().includes(q)) ||
        (isVapeStore && p.flavor && p.flavor.toLowerCase().includes(q)) ||
        (!isVapeStore &&
          p.categoryLabel &&
          p.categoryLabel.toLowerCase().includes(q))
    );
  }, [products, search]);

  function openAddPanel() {
    setEditingProduct(null);
    setPanelOpen(true);
  }

  function openEditPanel(product) {
    setEditingProduct(product);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingProduct(null);
  }

  async function handleSave(formData) {
    setSaving(true);
    setError('');
    try {
      if (editingProduct) {
        await authFetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await authFetch('/api/products/manage', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      closePanel();
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(product) {
    if (!window.confirm(`Deactivate "${product.name}"? It will no longer appear in sales.`)) {
      return;
    }
    setError('');
    try {
      await authFetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false }),
      });
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="page-header">
          <h2>Products</h2>
          <button type="button" className="btn btn-primary" onClick={openAddPanel}>
            Add product
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <input
          className="input search-bar"
          placeholder={
            isVapeStore
              ? 'Search by product line or flavor...'
              : 'Search by name or category...'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="panel table-wrap">
          {loading ? (
            <p>Loading products...</p>
          ) : filtered.length === 0 ? (
            <p>No products found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  {isVapeStore ? (
                    <>
                      <th>Product line</th>
                      <th>Flavor</th>
                    </>
                  ) : (
                    <th>Name</th>
                  )}
                  {!isVapeStore && <th>Category</th>}
                  <th>Description</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    {isVapeStore ? (
                      <>
                        <td>{product.vapeLineLabel || product.vapeLine || '-'}</td>
                        <td>{product.flavor || '-'}</td>
                      </>
                    ) : (
                      <td>{product.name}</td>
                    )}
                    {!isVapeStore && (
                      <td>{product.categoryLabel || product.category || '-'}</td>
                    )}
                    <td className="product-description-cell">
                      {isVapeStore
                        ? formatSpecsText(vapeLineMeta[product.vapeLine]?.specs) || '-'
                        : product.description || '-'}
                    </td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>{product.stockQuantity}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openEditPanel(product)}
                      >
                        Edit
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDeactivate(product)}
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {panelOpen && (
          <div className="overlay-backdrop" onClick={closePanel}>
            <div className="slide-panel" onClick={(e) => e.stopPropagation()}>
              <h3>{editingProduct ? 'Edit product' : 'Add product'}</h3>
              <ProductForm
                product={editingProduct}
                storeId={user?.storeId}
                onSave={handleSave}
                onCancel={closePanel}
                onError={setError}
                saving={saving}
              />
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  );
}
