import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getToken, setAuth } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace('/sales');
    }
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setAuth(data.token, data.user);
      router.push('/sales');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-gate">
      <section className="register-gate-intro" aria-hidden="true">
        <p className="register-gate-kicker">Point of sale</p>
        <h1>Sign in to your store</h1>
        <p className="register-gate-lede">
          Sign in with your store account to ring up sales, adjust stock, and review
          transactions.
        </p>
      </section>

      <section className="register-gate-panel">
        <h2 className="register-gate-heading">Sign in</h2>
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="btn btn-till btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </div>
  );
}
