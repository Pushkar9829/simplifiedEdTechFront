import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIsPhone } from '../hooks/useIsPhone';
import { ErpThemePicker } from './erp';
import './AppShell.css';

export default function AppShell({ title, links, dense = false, phoneNav, moreGroups }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const phone = useIsPhone();
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const showPhoneChrome = phone && phoneNav?.length;

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
      }${showPhoneChrome ? ' erp-shell-phone' : ''}`}
    >
      {!showPhoneChrome && (
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
                <span>{link.label}</span>
                {link.badge ? <span className="erp-nav-badge">{link.badge}</span> : null}
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
      )}

      {navOpen && !showPhoneChrome && (
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
            {!showPhoneChrome && (
              <button
                type="button"
                className="erp-icon-btn erp-menu-btn"
                aria-label="Toggle navigation"
                onClick={() => setNavOpen((o) => !o)}
              >
                Menu
              </button>
            )}
            <div>
              <p className="erp-eyebrow">{title}</p>
              <h1>{activeLabel}</h1>
            </div>
          </div>
          <div className="erp-header-actions">
            <ErpThemePicker />
            {!showPhoneChrome && (
              <span className="erp-status-badge erp-status-shipped">{user?.role}</span>
            )}
          </div>
        </header>
        <main className="erp-main-area">
          <Outlet />
        </main>
      </div>

      {showPhoneChrome && (
        <nav className="erp-bottom-nav" aria-label="Tutor">
          {phoneNav.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'erp-nav-item-active' : undefined)}
            >
              {link.label}
              {link.badge ? <span className="erp-nav-badge">{link.badge}</span> : null}
            </NavLink>
          ))}
          {moreGroups?.length ? (
            <button type="button" onClick={() => setMoreOpen(true)}>
              More
            </button>
          ) : null}
        </nav>
      )}

      {moreOpen && moreGroups?.length ? (
        <div className="erp-more-sheet" onClick={() => setMoreOpen(false)} role="presentation">
          <div className="erp-more-panel" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>More</strong>
              <button type="button" className="erp-icon-btn" onClick={() => setMoreOpen(false)}>
                Close
              </button>
            </div>
            {moreGroups.map((group) => (
              <section key={group.label} className="erp-more-group">
                <h3>{group.label}</h3>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="erp-more-link"
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                    {item.badge ? <span className="erp-nav-badge">{item.badge}</span> : null}
                  </NavLink>
                ))}
              </section>
            ))}
            <button type="button" className="erp-icon-btn erp-full" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
