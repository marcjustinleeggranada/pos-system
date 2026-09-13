import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import Layout from '../../components/Layout';
import SalesSummary from '../../components/SalesSummary';
import { authFetch } from '../../lib/api';

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
  const [error, setError] = useState('');

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
          <h2>AI Insights</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadSummary}
              disabled={loadingSummary || running}
            >
              {loadingSummary ? 'Loading...' : 'Load sales summary'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={runAnalysis}
              disabled={running}
            >
              {running ? 'Running 4-iteration loop...' : 'Run AI analysis'}
            </button>
          </div>
        </div>

        <p style={{ color: '#64748b', marginTop: 0 }}>
          Gemini generates recommendations from your store&apos;s sales data. A Python module
          statistically validates each one. The loop runs up to 4 iterations and stops early if
          all recommendations pass.
        </p>

        {error && <div className="error-banner">{error}</div>}

        {loadingSummary && !summary && <p>Loading sales summary...</p>}
        <SalesSummary summary={summary} />

        {runResult && (
          <>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>
                Validated recommendations ({runResult.validatedRecommendations.length})
              </h3>
              {runResult.validatedRecommendations.length === 0 ? (
                <p>
                  No recommendations passed statistical validation. Try recording more sales, then
                  run again.
                </p>
              ) : (
                runResult.validatedRecommendations.map((rec) => (
                  <div key={rec.id} className="insight-card">
                    <div className="insight-type">{TYPE_LABELS[rec.type] || rec.type}</div>
                    <h4 style={{ margin: '0.25rem 0' }}>{rec.title}</h4>
                    <p style={{ margin: '0.25rem 0', color: '#475569' }}>{rec.rationale}</p>
                    <div className="insight-stats">
                      Test: {rec.validation.test}
                      {rec.validation.pValue != null && (
                        <> &middot; p-value: {rec.validation.pValue}</>
                      )}
                      <> &middot; Validated in iteration {rec.validation.iterationValidated}</>
                    </div>
                    <div className="insight-stats">{rec.validation.message}</div>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Refinement loop log</h3>
              <p style={{ color: '#64748b' }}>
                Completed {runResult.iterationCount} of {runResult.maxIterations} iteration(s)
              </p>
              {runResult.iterations.map((iter) => (
                <details key={iter.iteration} style={{ marginBottom: '0.75rem' }}>
                  <summary>
                    Iteration {iter.iteration} — {iter.allPassed ? 'all passed' : 'some failed'}
                  </summary>
                  <ul style={{ paddingLeft: '1.25rem' }}>
                    {iter.validationResults.map((vr) => (
                      <li key={vr.id}>
                        {vr.id}: {vr.passed ? 'PASS' : 'FAIL'} ({vr.test}
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
