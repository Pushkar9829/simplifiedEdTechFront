import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErpThemePicker } from '../components/erp';
import '../components/AppShell.css';
import '../pages/admin/AdminDense.css';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Analytics', end: true }],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/users', label: 'Users' },
      { to: '/admin/verifications', label: 'Verifications' },
      { to: '/admin/tickets', label: 'Support tickets' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/admin/payments', label: 'Payments' },
      { to: '/admin/wallets', label: 'Wallets' },
      { to: '/admin/plans', label: 'Plans' },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/subjects', label: 'Subjects' },
      { to: '/admin/catalog', label: 'Boards & classes' },
      { to: '/admin/resources', label: 'Resources' },
      { to: '/admin/announcements', label: 'Announcements' },
      { to: '/admin/campaigns', label: 'Campaigns' },
      { to: '/admin/configs', label: 'Configs' },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/admin/profile', label: 'Profile' }],
  },
];

const TITLES = {
  '/admin': 'Analytics',
  '/admin/users': 'Users',
  '/admin/verifications': 'Verifications',
  '/admin/payments': 'Payments',
  '/admin/wallets': 'Wallets',
  '/admin/catalog': 'Boards & classes',
  '/admin/subjects': 'Subjects',
  '/admin/resources': 'Resources',
  '/admin/plans': 'Plans',
  '/admin/announcements': 'Announcements',
  '/admin/campaigns': 'Campaigns',
  '/admin/configs': 'Configs',
  '/admin/tickets': 'Support tickets',
  '/admin/profile': 'Profile',
};

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const exact = TITLES[location.pathname];
    if (exact) return exact;
    const match = Object.keys(TITLES)
      .sort((a, b) => b.length - a.length)
      .find((path) => location.pathname.startsWith(path));
    return TITLES[match] || 'Admin';
  }, [location.pathname]);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`erp-shell erp-shell-with-sidebar erp-dense ${navOpen ? 'nav-open' : ''}`}>
      <aside className="erp-sidebar erp-sidebar-fixed" aria-label="Admin navigation">
        <div className="erp-sidebar-glass erp-sidebar-glass-brand erp-brand-block">
          <span className="erp-brand-mark">IB</span>
          <div>
            <strong>IBDP Console</strong>
            <p>Administration</p>
          </div>
        </div>

        <nav className="erp-sidebar-nav" onClick={() => setNavOpen(false)}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="erp-nav-group">
              <p className="erp-nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `erp-nav-item${isActive ? ' erp-nav-item-active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="erp-sidebar-glass erp-sidebar-glass-footer erp-sidebar-foot">
          <div className="erp-user">
            <span className="erp-avatar">{(user?.name || user?.phone || 'A').slice(0, 1)}</span>
            <div>
              <strong>{user?.name || user?.phone}</strong>
              <p>Admin</p>
            </div>
          </div>
          <button type="button" className="erp-icon-btn erp-full" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      {navOpen && (
        <button
          type="button"
          className="erp-drawer-overlay"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="erp-shell-main">
        <header className="erp-header-bar">
          <div className="erp-header-left">
            <button
              type="button"
              className="erp-icon-btn erp-menu-btn"
              aria-label="Toggle navigation"
              onClick={() => setNavOpen((o) => !o)}
            >
              Menu
            </button>
            <div>
              <p className="erp-eyebrow">Admin panel</p>
              <h1>{pageTitle}</h1>
            </div>
          </div>
          <div className="erp-header-actions">
            <ErpThemePicker />
            <span className="erp-status-badge erp-status-shipped">Live</span>
            <span className="muted">{user?.phone}</span>
          </div>
        </header>
        <main className="erp-main-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
