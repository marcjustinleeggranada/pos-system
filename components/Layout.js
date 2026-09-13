import Link from 'next/link';
import { useRouter } from 'next/router';
import { clearAuth, getUser } from '../lib/api';

export default function Layout({ children }) {
  const router = useRouter();
  const user = getUser();

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  const navClass = (path) => (router.pathname === path ? 'active' : '');

  return (
    <div className="app-shell">
      <header className="top-nav">
        <h1>POS System</h1>
        <nav className="nav-links">
          <Link href="/sales" className={navClass('/sales')}>
            Sales
          </Link>
          <Link href="/products" className={navClass('/products')}>
            Products
          </Link>
          <Link href="/transactions" className={navClass('/transactions')}>
            History
          </Link>
          <Link href="/insights" className={navClass('/insights')}>
            Insights
          </Link>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </nav>
        {user && (
          <div className="nav-user">
            <div>{user.email}</div>
            <div>
              Store {user.storeId} &middot; {user.role}
            </div>
          </div>
        )}
      </header>
      <main className="page-content">{children}</main>
    </div>
  );
}
