import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErpThemePicker } from './erp';
import './AppShell.css';

export default function AppShell({ title, links, dense = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const activeLabel =
    links.find((l) =>
      l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
    )?.label || title;

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      className={`erp-shell erp-shell-with-sidebar${dense ? ' erp-dense' : ''}${
        navOpen ? ' nav-open' : ''
      }`}
    >
      <aside className="erp-sidebar erp-sidebar-fixed" aria-label={`${title} navigation`}>
        <div className="erp-sidebar-glass erp-sidebar-glass-brand erp-brand-block">
          <span className="erp-brand-mark">IB</span>
          <div>
            <strong>IBDP Tutoring</strong>
            <p>{title} workspace</p>
          </div>
        </div>

        <nav className="erp-sidebar-nav" onClick={() => setNavOpen(false)}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `erp-nav-item${isActive ? ' erp-nav-item-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="erp-sidebar-glass erp-sidebar-glass-footer erp-sidebar-foot">
          <div className="erp-user">
            <span className="erp-avatar">{(user?.name || user?.phone || 'U').slice(0, 1)}</span>
            <div>
              <strong>{user?.name || user?.phone}</strong>
              <p>{user?.role}</p>
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
              <p className="erp-eyebrow">{title}</p>
              <h1>{activeLabel}</h1>
            </div>
          </div>
          <div className="erp-header-actions">
            <ErpThemePicker />
            <span className="erp-status-badge erp-status-shipped">{user?.role}</span>
          </div>
        </header>
        <main className="erp-main-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
