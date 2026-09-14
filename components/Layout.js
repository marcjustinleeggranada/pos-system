import Link from 'next/link';
import { useRouter } from 'next/router';
import { clearAuth, getUser } from '../lib/api';

const NAV = [
  { href: '/sales', label: 'Sales' },
  { href: '/products', label: 'Products' },
  { href: '/transactions', label: 'History' },
  { href: '/insights', label: 'Insights' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const user = getUser();

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  const navClass = (path) => (router.pathname === path ? 'is-active' : '');

  return (
    <div className="app-shell">
      <aside className="register-rail" aria-label="Main navigation">
        <div className="register-brand">
          <span className="register-brand-mark">POS</span>
          <span className="register-brand-text">Store register</span>
        </div>

        <nav className="register-nav">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={navClass(href)}>
              {label}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="register-session">
            <p className="register-session-email">{user.email}</p>
            <p className="register-session-meta">
              Store {user.storeId}, {user.role}
            </p>
            <button type="button" className="btn btn-ghost btn-block" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        )}
      </aside>

      <div className="register-main">
        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-tab-bar" aria-label="Mobile navigation">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} className={navClass(href)}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
