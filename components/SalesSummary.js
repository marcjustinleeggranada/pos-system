import { formatCurrency } from '../lib/api';

function Metric({ label, value, sub }) {
  return (
    <div className="summary-metric">
      <div className="summary-metric-label">{label}</div>
      <div className="summary-metric-value">{value}</div>
      {sub && <div className="summary-metric-sub">{sub}</div>}
    </div>
  );
}

function pct(value) {
  if (value == null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

export default function SalesSummary({ summary }) {
  if (!summary) return null;

  const { totals, inventory, period, periodComparison } = summary;

  return (
    <div className="sales-summary">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Sales overview ({period.label})</h3>
        <div className="summary-grid">
          <Metric label="Gross revenue" value={formatCurrency(totals.totalRevenue30d)} />
          <Metric label="Cost of goods sold" value={formatCurrency(totals.totalCogs30d)} />
          <Metric
            label="Gross profit"
            value={formatCurrency(totals.grossProfit30d)}
            sub="Revenue minus product cost only"
          />
          <Metric label="Gross margin" value={pct(totals.grossMarginPct)} sub="On tracked COGS" />
          <Metric label="Transactions" value={totals.totalTransactions} />
          <Metric label="Units sold" value={totals.totalUnitsSold30d} />
          <Metric label="Avg order value" value={formatCurrency(totals.avgOrderValue)} />
          <Metric label="Avg units / order" value={totals.avgUnitsPerOrder} />
        </div>
        {totals.productsMissingCost > 0 && (
          <p className="summary-note">
            {totals.productsMissingCost} product(s) have no cost on file — their COGS is treated as
            0, so gross profit may be overstated until cost is added.
          </p>
        )}
      </div>

      <div className="summary-two-col">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>7-day comparison</h3>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Revenue</th>
                <th>Gross profit</th>
                <th>Orders</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Last 7 days</td>
                <td>{formatCurrency(periodComparison.last7Days.revenue)}</td>
                <td>{formatCurrency(periodComparison.last7Days.grossProfit)}</td>
                <td>{periodComparison.last7Days.transactions}</td>
                <td>{periodComparison.last7Days.unitsSold}</td>
              </tr>
              <tr>
                <td>Previous 7 days</td>
                <td>{formatCurrency(periodComparison.previous7Days.revenue)}</td>
                <td>{formatCurrency(periodComparison.previous7Days.grossProfit)}</td>
                <td>{periodComparison.previous7Days.transactions}</td>
                <td>{periodComparison.previous7Days.unitsSold}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Payment collection</h3>
          {summary.paymentMethods.length === 0 ? (
            <p>No payments recorded.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Collected</th>
                  <th>Orders</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {summary.paymentMethods.map((p) => (
                  <tr key={p.method}>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td>{formatCurrency(p.totalCollected)}</td>
                    <td>{p.transactionCount}</td>
                    <td>{pct(p.sharePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ margin: '1rem 0' }}>
        <h3 style={{ marginTop: 0 }}>Inventory snapshot</h3>
        <div className="summary-grid">
          <Metric label="Units on hand" value={inventory.totalUnitsOnHand} />
          <Metric label="Retail value" value={formatCurrency(inventory.retailValue)} sub="Stock x sell price" />
          <Metric label="Cost value" value={formatCurrency(inventory.costValue)} sub="Stock x product cost" />
          <Metric
            label="Potential gross profit"
            value={formatCurrency(inventory.potentialGrossProfit)}
            sub="If all on-hand stock sold at current price"
          />
          <Metric label="Low-stock SKUs" value={inventory.lowStockCount} />
        </div>
        {summary.lowStockProducts.length > 0 && (
          <p className="summary-note">
            Low stock:{' '}
            {summary.lowStockProducts.map((p) => `${p.name} (${p.stockQuantity})`).join(', ')}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>By category</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Products</th>
                <th>Units sold</th>
                <th>Revenue</th>
                <th>COGS</th>
                <th>Gross profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {summary.categoryStats.map((c) => (
                <tr key={c.category || c.categoryLabel}>
                  <td>{c.categoryLabel || c.category}</td>
                  <td>{c.productCount}</td>
                  <td>{c.unitsSold}</td>
                  <td>{formatCurrency(c.revenue)}</td>
                  <td>{c.cogs != null ? formatCurrency(c.cogs) : 'N/A'}</td>
                  <td>{c.grossProfit != null ? formatCurrency(c.grossProfit) : 'N/A'}</td>
                  <td>{pct(c.profitMarginPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {summary.subcategoryStats?.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>By subcategory</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Subcategory</th>
                  <th>Products</th>
                  <th>Units sold</th>
                  <th>Revenue</th>
                  <th>Gross profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {summary.subcategoryStats.map((s) => (
                  <tr key={`${s.category}-${s.subcategory}`}>
                    <td>{s.categoryLabel || s.category}</td>
                    <td>{s.subcategoryLabel || s.subcategory || '-'}</td>
                    <td>{s.productCount}</td>
                    <td>{s.unitsSold}</td>
                    <td>{formatCurrency(s.revenue)}</td>
                    <td>{s.grossProfit != null ? formatCurrency(s.grossProfit) : 'N/A'}</td>
                    <td>{pct(s.profitMarginPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>By product</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Units sold</th>
                <th>Revenue</th>
                <th>COGS</th>
                <th>Gross profit</th>
                <th>Margin</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {summary.productStats.map((p) => (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td>{p.categoryLabel || p.category}</td>
                  <td>{p.subcategoryLabel || p.subcategory || '-'}</td>
                  <td>{p.totalUnitsSold}</td>
                  <td>{formatCurrency(p.totalRevenue)}</td>
                  <td>{p.totalCogs != null ? formatCurrency(p.totalCogs) : 'N/A'}</td>
                  <td>{p.grossProfit != null ? formatCurrency(p.grossProfit) : 'N/A'}</td>
                  <td>{pct(p.profitMarginPct)}</td>
                  <td>{p.stockQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="summary-two-col">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Daily trend</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Gross profit</th>
                  <th>Units</th>
                </tr>
              </thead>
              <tbody>
                {summary.dailyTrend.slice(-14).map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{formatCurrency(d.totalRevenue)}</td>
                    <td>{formatCurrency(d.totalCogs)}</td>
                    <td>{formatCurrency(d.grossProfit)}</td>
                    <td>{d.unitsSold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Weekly trend</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Week starting</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Gross profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {summary.weeklyTrend.map((w) => (
                  <tr key={w.weekStarting}>
                    <td>{w.weekStarting}</td>
                    <td>{formatCurrency(w.totalRevenue)}</td>
                    <td>{formatCurrency(w.totalCogs)}</td>
                    <td>{formatCurrency(w.grossProfit)}</td>
                    <td>{pct(w.profitMarginPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
