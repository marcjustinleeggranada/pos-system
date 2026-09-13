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
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {loading ? (
              <p>Loading products...</p>
            ) : (
              <div className="product-grid">
                {filtered.map((product) => {
                  const outOfStock = product.stockQuantity <= 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={`product-card${outOfStock ? ' out-of-stock' : ''}`}
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                    >
                      <div>{product.name}</div>
                      <div className="price">{formatCurrency(product.price)}</div>
                      <div className="stock">Stock: {product.stockQuantity}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Cart</h3>
            {cart.length === 0 ? (
              <p style={{ color: '#64748b' }}>Tap a product to add it.</p>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="cart-item">
                  <div>
                    <div>{item.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {formatCurrency(item.price)} each
                    </div>
                  </div>
                  <div className="cart-item-controls">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => updateQuantity(item.productId, -1)}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => updateQuantity(item.productId, 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      x
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="cart-total">Total: {formatCurrency(cartTotal)}</div>

            <label style={{ display: 'grid', gap: '0.25rem', marginBottom: '0.75rem' }}>
              Payment method
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
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={cart.length === 0 || checkingOut}
              onClick={handleCheckout}
            >
              {checkingOut ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>

        {receipt && (
          <div className="receipt-modal" onClick={() => setReceipt(null)}>
            <div className="receipt-card" onClick={(e) => e.stopPropagation()}>
              <h3>Sale complete</h3>
              <p>Transaction #{receipt.transactionId}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {formatCurrency(receipt.totalAmount)}
              </p>
              <p style={{ color: '#64748b' }}>Paid via {receipt.paymentMethod}</p>
              <button type="button" className="btn btn-primary" onClick={() => setReceipt(null)}>
                Done
              </button>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  );
}
