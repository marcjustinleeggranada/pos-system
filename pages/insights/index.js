import { useEffect, useRef, useState } from 'react';
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
  const [resetting, setResetting] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [error, setError] = useState('');
  const resultsRef = useRef(null);
  const user = getUser();
  const isOwner = user?.role === 'owner';
  const hasSparseHistory = summary?.totals?.totalTransactions < 10;
  const missingCosts = (summary?.totals?.productsMissingCost || 0) > 0;

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

  useEffect(() => {
    if (runResult && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [runResult]);

  async function resetCostsAndDemoSales() {
    setResetting(true);
    setError('');
    setSeedMessage('');
    setRunResult(null);
    try {
      const data = await authFetch('/api/admin/reset-insights-data', { method: 'POST' });
      setSeedMessage(
        `${data.message} (${data.productsUpdated} product costs, ${data.transactionsCreated} transactions)`
      );
      await loadSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  }

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
    setSeedMessage('');
    try {
      const data = await authFetch('/api/recommendations/run', { method: 'POST' });
      if (!data || !Array.isArray(data.validatedRecommendations) || !Array.isArray(data.iterations)) {
        throw new Error('Analysis finished but returned an unexpected response. Try again.');
      }
      setRunResult(data);
      if (!summary) {
        const summaryData = await authFetch('/api/analytics/summary');
        setSummary(summaryData.summary);
      }
    } catch (err) {
      const message =
        err?.message ||
        'Analysis failed. On Render free tier this can take up to 60 seconds — keep this page open and try again.';
      setError(message);
      setRunResult(null);
    } finally {
      setRunning(false);
    }
  }

  function renderAnalysisResults() {
    if (!runResult) return null;

    const validatedCount = runResult.validatedRecommendations?.length ?? 0;
    const iterationCount = runResult.iterationCount ?? runResult.iterations?.length ?? 0;
    const maxIterations = runResult.maxIterations ?? 4;

    return (
      <div ref={resultsRef} id="analysis-results" className="analysis-results">
        <div className="success-banner analysis-complete-banner">
          Analysis complete — {validatedCount} validated recommendation
          {validatedCount === 1 ? '' : 's'} after {iterationCount} of {maxIterations} iteration
          {iterationCount === 1 ? '' : 's'}.
        </div>

        <div className="panel section-block">
          <h3 className="section-title">Validated recommendations ({validatedCount})</h3>
          {validatedCount === 0 ? (
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
                  {rec.validation?.test}
                  {rec.validation?.pValue != null && ` · p=${rec.validation.pValue}`}
                  {rec.validation?.iterationValidated != null &&
                    ` · iteration ${rec.validation.iterationValidated}`}
                </div>
                <div className="insight-stats">{rec.validation?.message}</div>
              </div>
            ))
          )}
        </div>

        <div className="panel loop-log">
          <h3 className="section-title">Validation log</h3>
          <p className="text-muted">
            {iterationCount} of {maxIterations} iterations completed
          </p>
          {(runResult.iterations || []).map((iter) => (
            <details key={iter.iteration}>
              <summary>
                Iteration {iter.iteration}: {iter.allPassed ? 'all passed' : 'revisions needed'}
              </summary>
              <ul>
                {(iter.validationResults || []).map((vr) => (
                  <li key={vr.id}>
                    {vr.id}: {vr.passed ? 'pass' : 'fail'} ({vr.test}
                    {vr.pValue != null ? `, p=${vr.pValue}` : ''})
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    );
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

        {running && (
          <div className="panel section-block analysis-running-panel">
            <p className="text-muted">
              Running Gemini + statistical validation (up to 4 iterations). This usually takes 30–60
              seconds on Render free tier — keep this page open.
            </p>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
        {seedMessage && <div className="success-banner">{seedMessage}</div>}

        {isOwner && (hasSparseHistory || missingCosts) && (
          <div className="panel section-block insights-seed-panel">
            <h3 className="section-title">Demo data tools</h3>
            <p className="text-muted">
              Apply catalog costs (vape ₱195; cosmetic bundles at ₱133.33 per item), clear all sales
              history, and reload ~25 days of demo transactions for both stores. Use this when gross
              margin shows 100% because costs were missing.
            </p>
            <div className="page-header-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetCostsAndDemoSales}
                disabled={resetting || seeding || running}
              >
                {resetting ? 'Resetting…' : 'Reset costs & demo sales'}
              </button>
              {hasSparseHistory && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => loadDemoSales({ replace: false })}
                    disabled={resetting || seeding || running}
                  >
                    {seeding ? 'Loading…' : 'Add demo sales (this store)'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => loadDemoSales({ replace: true })}
                    disabled={resetting || seeding || running}
                  >
                    Replace demo sales (this store)
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {renderAnalysisResults()}

        {loadingSummary && !summary && <p>Loading sales summary...</p>}
        <SalesSummary summary={summary} />
      </Layout>
    </AuthGuard>
  );
}
