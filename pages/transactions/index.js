import { useCallback, useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import Layout from '../../components/Layout';
import { authFetch, formatCurrency } from '../../lib/api';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = useCallback(async (page) => {
    setLoading(true);
    setError('');
    try {
      const data = await authFetch(`/api/transactions?page=${page}&limit=10`);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions(pagination.page);
  }, [loadTransactions, pagination.page]);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString();
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="page-header">
          <h2>Transaction history</h2>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="panel panel-flush">
          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="tx-row">
                <button
                  type="button"
                  className="tx-summary"
                  onClick={() => toggleExpand(tx.id)}
                  aria-expanded={expandedId === tx.id}
                >
                  <div>
                    <div className="tx-id">#{tx.id}</div>
                    <div className="tx-meta">
                      {formatDate(tx.createdAt)}
                      <br />
                      {tx.userEmail}, {tx.paymentMethod}
                    </div>
                  </div>
                  <div className="tx-amount">{formatCurrency(tx.totalAmount)}</div>
                </button>
                {expandedId === tx.id && (
                  <div className="tx-details">
                    {tx.items.length === 0 ? (
                      <p>No line items.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tx.items.map((item, idx) => (
                            <tr key={`${tx.id}-${item.productId}-${idx}`}>
                              <td>{item.productName}</td>
                              <td>{item.quantity}</td>
                              <td>{formatCurrency(item.unitPrice)}</td>
                              <td>{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
