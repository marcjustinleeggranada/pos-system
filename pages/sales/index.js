import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import Layout from '../../components/Layout';
import { authFetch, formatCurrency } from '../../lib/api';

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFetch('/api/products/manage');
      setProducts(data.products);
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
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, search]);

  function addToCart(product) {
    if (product.stockQuantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev;
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          maxStock: product.stockQuantity,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(productId, delta) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.maxStock) return item;
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean)
    );
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function handleCheckout() {
    if (cart.length === 0) return;

    setCheckingOut(true);
    setError('');

    try {
      const data = await authFetch('/api/transactions/create', {
        method: 'POST',
        body: JSON.stringify({
          payment_method: paymentMethod,
          items: cart.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      setReceipt({
        transactionId: data.transaction_id,
        totalAmount: data.total_amount,
        paymentMethod,
        items: [...cart],
      });
      setCart([]);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="page-header">
          <h2>Sales</h2>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="sales-layout">
          <div>
            <input
              className="input search-bar"
              placeholder="Search by name or SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />

            {loading ? (
              <p className="text-muted">Loading products…</p>
            ) : (
              <div className="product-grid">
                {filtered.map((product) => {
                  const outOfStock = product.stockQuantity <= 0;
                  const lowStock = !outOfStock && product.stockQuantity <= 5;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={`product-tile${outOfStock ? ' out-of-stock' : ''}`}
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                    >
                      <span className="product-tile-name">{product.name}</span>
                      <span className="product-tile-price">{formatCurrency(product.price)}</span>
                      <span
                        className={`product-tile-stock${lowStock ? ' is-low' : ''}`}
                      >
                        {outOfStock ? 'Out of stock' : `${product.stockQuantity} in stock`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="till-drawer" aria-label="Current sale">
            <h3 className="section-title">Current sale</h3>
            {cart.length === 0 ? (
              <p className="till-empty">Select a product to start a sale.</p>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="cart-item">
                  <div>
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-unit">{formatCurrency(item.price)} each</div>
                  </div>
                  <div className="cart-item-controls">
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      onClick={() => updateQuantity(item.productId, -1)}
                      aria-label={`Decrease ${item.name}`}
                    >
                      −
                    </button>
                    <span className="amount">{item.quantity}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      onClick={() => updateQuantity(item.productId, 1)}
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-icon"
                      onClick={() => removeFromCart(item.productId)}
                      aria-label={`Remove ${item.name}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="cart-total-row">
              <span className="cart-total-label">Total due</span>
              <span className="cart-total-value">{formatCurrency(cartTotal)}</span>
            </div>

            <label className="field">
              <span className="field-label">Payment method</span>
              <select
                className="select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="gcash">GCash</option>
              </select>
            </label>

            <button
              type="button"
              className="btn btn-till btn-block"
              disabled={cart.length === 0 || checkingOut}
              onClick={handleCheckout}
            >
              {checkingOut ? 'Recording sale…' : 'Complete sale'}
            </button>
          </aside>
        </div>

        {receipt && (
          <div className="receipt-modal" onClick={() => setReceipt(null)} role="dialog" aria-modal="true">
            <div className="receipt-slip" onClick={(e) => e.stopPropagation()}>
              <h3>Sale recorded</h3>
              <p className="receipt-slip-id">Transaction #{receipt.transactionId}</p>
              <p className="receipt-slip-total">{formatCurrency(receipt.totalAmount)}</p>
              <p className="receipt-slip-meta">Paid with {receipt.paymentMethod}</p>
              <button type="button" className="btn btn-till btn-block" onClick={() => setReceipt(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  );
}
