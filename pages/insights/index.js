import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import Layout from '../../components/Layout';
import SalesSummary from '../../components/SalesSummary';
import { authFetch, getUser } from '../../lib/api';

const TYPE_LABELS = {
  restock: 'Restock',
  discontinue: 'Discontinue',
  bundle: 'Bundle',
  promote: 'Promote',
};

export default function InsightsPage() {
  const [summary, setSummary] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [running, setRunning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [error, setError] = useState('');
  const user = getUser();
  const isOwner = user?.role === 'owner';
  const hasSparseHistory = summary?.totals?.totalTransactions < 10;

  async function loadSummary() {
    setLoadingSummary(true);
    setError('');
    try {
      const data = await authFetch('/api/analytics/summary');
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadDemoSales({ replace = false } = {}) {
    setSeeding(true);
    setError('');
    setSeedMessage('');
    try {
      const data = await authFetch('/api/admin/seed-insights-sales', {
        method: 'POST',
        body: JSON.stringify({ replace }),
      });
      setSeedMessage(
        `${data.message} (${data.transactionsCreated} transaction${data.transactionsCreated === 1 ? '' : 's'})`
      );
      await loadSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  }

  async function runAnalysis() {
    setRunning(true);
    setError('');
    setRunResult(null);
    try {
      const data = await authFetch('/api/recommendations/run', { method: 'POST' });
      setRunResult(data);
      if (!summary) {
        const summaryData = await authFetch('/api/analytics/summary');
        setSummary(summaryData.summary);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="page-header">
          <h2>Insights</h2>
          <div className="page-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadSummary}
              disabled={loadingSummary || running}
            >
              {loadingSummary ? 'Refreshing…' : 'Refresh summary'}
            </button>
            <button
              type="button"
              className="btn btn-till"
              onClick={runAnalysis}
              disabled={running}
            >
              {running ? 'Running analysis…' : 'Run analysis'}
            </button>
          </div>
        </div>

        <p className="page-lede">
          Review sales patterns and run validated stock recommendations. Each suggestion is checked
          against your transaction history before it appears here.
        </p>

        {error && <div className="error-banner">{error}</div>}
        {seedMessage && <div className="success-banner">{seedMessage}</div>}

        {isOwner && hasSparseHistory && (
          <div className="panel section-block insights-seed-panel">
            <h3 className="section-title">Need demo sales history?</h3>
            <p className="text-muted">
              AI Insights needs about 25 days of transaction patterns. Load demo sales for this
              store to try the analysis flow without recording every sale manually.
            </p>
            <div className="page-header-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => loadDemoSales({ replace: false })}
                disabled={seeding || running}
              >
                {seeding ? 'Loading demo sales…' : 'Add demo sales'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => loadDemoSales({ replace: true })}
                disabled={seeding || running}
              >
                Replace with demo sales
              </button>
            </div>
          </div>
        )}

        {loadingSummary && !summary && <p>Loading sales summary...</p>}
        <SalesSummary summary={summary} />

        {runResult && (
          <>
            <div className="panel section-block">
              <h3 className="section-title">
                Validated recommendations ({runResult.validatedRecommendations.length})
              </h3>
              {runResult.validatedRecommendations.length === 0 ? (
                <p className="text-muted">
                  Nothing passed validation yet. Record more sales, then run analysis again.
                </p>
              ) : (
                runResult.validatedRecommendations.map((rec) => (
                  <div key={rec.id} className="insight-card">
                    <div className="insight-type">{TYPE_LABELS[rec.type] || rec.type}</div>
                    <h4 className="insight-title">{rec.title}</h4>
                    <p className="insight-rationale">{rec.rationale}</p>
                    <div className="insight-stats">
                      {rec.validation.test}
                      {rec.validation.pValue != null && ` · p=${rec.validation.pValue}`}
                      {` · iteration ${rec.validation.iterationValidated}`}
                    </div>
                    <div className="insight-stats">{rec.validation.message}</div>
                  </div>
                ))
              )}
            </div>

            <div className="panel loop-log">
              <h3 className="section-title">Validation log</h3>
              <p className="text-muted">
                {runResult.iterationCount} of {runResult.maxIterations} iterations completed
              </p>
              {runResult.iterations.map((iter) => (
                <details key={iter.iteration}>
                  <summary>
                    Iteration {iter.iteration}: {iter.allPassed ? 'all passed' : 'revisions needed'}
                  </summary>
                  <ul>
                    {iter.validationResults.map((vr) => (
                      <li key={vr.id}>
                        {vr.id}: {vr.passed ? 'pass' : 'fail'} ({vr.test}
                        {vr.pValue != null ? `, p=${vr.pValue}` : ''})
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </>
        )}
      </Layout>
    </AuthGuard>
  );
}
