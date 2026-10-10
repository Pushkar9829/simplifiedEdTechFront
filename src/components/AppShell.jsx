import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { childLabel, useParentChild } from '../context/ParentChildContext';
import { useTheme } from '../context/ThemeContext';
import { useIsPhone } from '../hooks/useIsPhone';
import { mediaUrl } from '../utils/mediaUrl';
import { missingProfileFields } from '../utils/profileCompletion';
import { ErpSelect, ErpThemeToggle } from './erp';
import { Icon } from './Icon';
import './AppShell.css';

const ONBOARD_KEY = 'ibdp_onboard_dismissed';

function readDismissed(userId) {
  try {
    return sessionStorage.getItem(ONBOARD_KEY) === String(userId);
  } catch {
    return false;
  }
}

function initials(user) {
  const name = String(user?.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  return String(user?.phone || 'U').slice(-2);
}

function UserAvatar({ user, size = '' }) {
  const [broken, setBroken] = useState(false);
  const src = user?.avatar && !broken ? mediaUrl(user.avatar) : null;
  const cls = `erp-avatar${size ? ` erp-avatar-${size}` : ''}`;
  if (src) {
    return <img className={`${cls} erp-avatar-img`} src={src} alt="" onError={() => setBroken(true)} />;
  }
  return <span className={cls}>{initials(user)}</span>;
}

function ChildSwitcher() {
  const { enabled, children, selectedChildId, setSelectedChildId, loading } = useParentChild();
  if (!enabled || loading) return null;
  if (!children.length) {
    return (
      <Link className="erp-btn-secondary erp-btn-sm" to="/parent/children/link">
        <Icon name="plus" size={16} />
        Link a child
      </Link>
    );
  }
  const current = children.find(
    (c) => String(c.studentUserId?._id || c.studentUserId || '') === String(selectedChildId || '')
  );
  const letter = (current ? childLabel(current) : '?').trim().slice(0, 1).toUpperCase();
  return (
    <ErpSelect
      inline
      aria-label="Selected child"
      wrapClassName="erp-child-switcher"
      leading={<span className="erp-avatar erp-avatar-xs">{letter}</span>}
      value={selectedChildId || ''}
      onChange={(e) => setSelectedChildId(e.target.value)}
      options={children.map((c) => ({
        value: String(c.studentUserId?._id || c.studentUserId || ''),
        label: childLabel(c),
      }))}
    />
  );
}

/** Account menu: avatar trigger + popover with Profile / theme / Sign out. */
function UserMenu({ user, roleLabel, profilePath, onLogout, variant = 'card' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { isDark, toggleMode } = useTheme();

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = user?.name || user?.phone || 'Account';

  return (
    <div className={`erp-user-menu erp-user-menu-${variant}`} ref={ref}>
      {variant === 'card' ? (
        <button
          type="button"
          className="erp-user-card"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <UserAvatar key={user?.avatar || 'none'} user={user} />
          <span className="erp-user-card-text">
            <strong>{name}</strong>
            <span>{roleLabel}</span>
          </span>
          <Icon name="more-horizontal" size={16} />
        </button>
      ) : (
        <button
          type="button"
          className="erp-avatar-btn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          onClick={() => setOpen((o) => !o)}
        >
          <UserAvatar key={user?.avatar || 'none'} user={user} size="sm" />
        </button>
      )}
      {open ? (
        <div className="erp-menu erp-user-menu-pop" role="menu">
          <div className="erp-user-menu-head">
            <strong>{name}</strong>
            <span>{user?.phone || user?.email || roleLabel}</span>
          </div>
          <div className="erp-menu-sep" />
          {profilePath ? (
            <Link role="menuitem" className="erp-menu-item" to={profilePath} onClick={() => setOpen(false)}>
              <Icon name="user" size={16} />
              Profile
            </Link>
          ) : null}
          <button type="button" role="menuitem" className="erp-menu-item" onClick={toggleMode}>
            <Icon name={isDark ? 'sun' : 'moon'} size={16} />
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="erp-menu-sep" />
          <button
            type="button"
            role="menuitem"
            className="erp-menu-item erp-menu-item-danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <Icon name="log-out" size={16} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function groupLinks(links) {
  const groups = [];
  const byName = new Map();
  for (const link of links) {
    const key = link.group || '';
    if (!byName.has(key)) {
      const g = { label: key, items: [] };
      byName.set(key, g);
      groups.push(g);
    }
    byName.get(key).items.push(link);
  }
  return groups;
}

const COLLAPSE_KEY = 'erp-sidebar-collapsed';
const WIDE_QUERY = '(min-width: 1025px)';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function useMatches(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function NavItem({ link, onNavigate }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      title={link.label}
      onClick={onNavigate}
      className={({ isActive }) => `erp-nav-item${isActive ? ' erp-nav-item-active' : ''}`}
    >
      {link.icon ? <Icon name={link.icon} size={18} /> : null}
      <span className="erp-nav-label-text">{link.label}</span>
      {link.badge ? <span className="erp-nav-badge">{link.badge}</span> : null}
    </NavLink>
  );
}

/**
 * Role workspace shell.
 * links: [{ to, label, end?, icon?, group?, badge? }] — grouped in the sidebar by `group`.
 * phoneNav: up to 4 links for the phone bottom bar (≤900px); the rest go in "More".
 * moreGroups: optional explicit "More" sheet groups (defaults to sidebar groups minus phoneNav).
 */
export default function AppShell({
  title,
  links,
  dense = false,
  phoneNav,
  moreGroups,
  brandName = 'IBDP Tutoring',
  roleLabel,
  className = '',
  notificationsPath,
  profilePath: profilePathProp,
  showOnboarding: onboardingEnabled = true,
}) {
  const { user, profile, logout } = useAuth();
  const { unread } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const phone = useIsPhone();
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const wide = useMatches(WIDE_QUERY);
  const showPhoneChrome = phone && phoneNav?.length;
  const railCollapsed = wide && collapsed;

  // Desktop: the hamburger collapses the sidebar to an icon rail. Smaller screens: it opens the drawer.
  const toggleNav = () => {
    if (wide) {
      setCollapsed((c) => {
        const next = !c;
        try {
          localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
        } catch {
          /* storage unavailable */
        }
        return next;
      });
    } else {
      setNavOpen((o) => !o);
    }
  };
  const userId = user?._id || user?.id;
  const [dismissed, setDismissed] = useState(() => readDismissed(userId));
  const home = homePathFor(user?.role);
  const profilePath = profilePathProp === undefined ? `${home}/profile` : profilePathProp;
  const notifPath = notificationsPath === undefined ? `${home}/notifications` : notificationsPath;
  const missing = onboardingEnabled ? missingProfileFields(user, profile) : [];
  const showOnboarding =
    missing.length > 0 && !dismissed && !(profilePath && location.pathname.startsWith(profilePath));
  const role = roleLabel || title;

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const dismissOnboarding = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(ONBOARD_KEY, String(userId));
    } catch {
      /* storage unavailable */
    }
  };

  const withBadge = (item) =>
    item.to.endsWith('/notifications') && unread > 0 ? { ...item, badge: unread } : item;
  const navLinks = links.map(withBadge);
  const groups = groupLinks(navLinks);
  const iconFor = (to) => links.find((l) => l.to === to)?.icon;
  const bottomLinks = (phoneNav || []).map((l) => withBadge({ icon: iconFor(l.to), ...l }));
  const phoneSet = new Set((phoneNav || []).map((l) => l.to));
  const sheetGroups = (
    moreGroups ||
    groups
      .map((g) => ({ label: g.label || 'Menu', items: g.items.filter((i) => !phoneSet.has(i.to)) }))
      .filter((g) => g.items.length)
  ).map((g) => ({
    ...g,
    items: g.items.map((i) => withBadge({ icon: iconFor(i.to), ...i })),
  }));
  const moreBadge = sheetGroups.some((g) => g.items.some((i) => i.badge));
  const moreActive = sheetGroups.some((g) =>
    g.items.some((i) => location.pathname === i.to || location.pathname.startsWith(`${i.to}/`))
  );

  const activeLabel = useMemo(() => {
    const path = location.pathname;
    const match = [...links]
      .sort((a, b) => b.to.length - a.to.length)
      .find((l) => (l.end ? path === l.to : path === l.to || path.startsWith(`${l.to}/`)));
    return match?.label || title;
  }, [links, location.pathname, title]);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      className={`erp-shell erp-shell-with-sidebar${dense ? ' erp-dense' : ''}${
        navOpen ? ' nav-open' : ''
      }${railCollapsed ? ' sidebar-collapsed' : ''}${showPhoneChrome ? ' erp-shell-phone' : ''}${className ? ` ${className}` : ''}`}
    >
      <aside
          id="erp-sidebar"
          className="erp-sidebar erp-sidebar-fixed"
          aria-label={`${title} navigation`}
        >
          <div className="erp-brand-block">
            <span className="erp-brand-mark" aria-hidden="true">
              <Icon name="graduation-cap" size={18} strokeWidth={2} />
            </span>
            <div className="erp-brand-text">
              <strong>{brandName}</strong>
              <p>{role}</p>
            </div>
            <button
              type="button"
              className="erp-icon-btn erp-sidebar-close"
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <nav className="erp-sidebar-nav">
            {groups.map((group) => (
              <div key={group.label || '_'} className="erp-nav-group">
                {group.label ? <p className="erp-nav-group-label">{group.label}</p> : null}
                {group.items.map((link) => (
                  <NavItem key={link.to} link={link} onNavigate={() => setNavOpen(false)} />
                ))}
              </div>
            ))}
          </nav>

          <div className="erp-sidebar-foot">
            <UserMenu
              user={user}
              roleLabel={role}
              profilePath={profilePath}
              onLogout={onLogout}
              variant="card"
            />
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
              aria-label={wide ? (collapsed ? 'Expand sidebar' : 'Collapse sidebar') : 'Open menu'}
              title={wide ? (collapsed ? 'Expand sidebar' : 'Collapse sidebar') : 'Menu'}
              aria-controls="erp-sidebar"
              aria-expanded={wide ? !collapsed : navOpen}
              onClick={toggleNav}
            >
              <Icon name="menu" size={20} />
            </button>
            <h1 className="erp-topbar-title">{activeLabel}</h1>
          </div>
          <div className="erp-header-actions">
            <ChildSwitcher />
            {notifPath ? (
              <Link
                to={notifPath}
                className="erp-icon-btn erp-bell"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                title="Notifications"
              >
                <Icon name="bell" size={18} />
                {unread > 0 ? (
                  <span className="erp-bell-count">{unread > 99 ? '99+' : unread}</span>
                ) : null}
              </Link>
            ) : null}
            <ErpThemeToggle className="erp-topbar-theme" />
            <UserMenu
              user={user}
              roleLabel={role}
              profilePath={profilePath}
              onLogout={onLogout}
              variant="avatar"
            />
          </div>
        </header>
        <main className="erp-main-area">
          {showOnboarding && (
            <div className="erp-banner erp-banner-info erp-onboarding-banner" role="status">
              <span className="erp-banner-icon">
                <Icon name="sparkles" size={16} />
              </span>
              <div className="erp-banner-body">
                <span className="erp-banner-title">Finish setting up your profile</span>
                <span className="erp-banner-text"> — add your {missing.join(', ')}.</span>
              </div>
              <div className="erp-banner-actions">
                {profilePath ? (
                  <Link className="erp-link" to={profilePath}>
                    Complete profile
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="erp-icon-btn erp-banner-close"
                  onClick={dismissOnboarding}
                  aria-label="Dismiss"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {showPhoneChrome && (
        <nav className="erp-bottom-nav" aria-label={`${title} navigation`}>
          {bottomLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'erp-nav-item-active' : undefined)}
            >
              <span className="erp-bottom-icon">
                {link.icon ? <Icon name={link.icon} size={20} /> : null}
                {link.badge ? <span className="erp-bottom-badge">{link.badge}</span> : null}
              </span>
              <span>{link.label}</span>
            </NavLink>
          ))}
          {sheetGroups.length ? (
            <button
              type="button"
              className={moreActive ? 'erp-nav-item-active' : undefined}
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
            >
              <span className="erp-bottom-icon">
                <Icon name="more-horizontal" size={20} />
                {moreBadge ? <span className="erp-bottom-dot" /> : null}
              </span>
              <span>More</span>
            </button>
          ) : null}
        </nav>
      )}

      {moreOpen && sheetGroups.length ? (
        <div className="erp-more-sheet" onClick={() => setMoreOpen(false)} role="presentation">
          <div
            className="erp-more-panel"
            role="dialog"
            aria-label="More navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="erp-more-grip" aria-hidden="true" />
            <div className="erp-more-head">
              <strong>More</strong>
              <button
                type="button"
                className="erp-icon-btn"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            {sheetGroups.map((group) => (
              <section key={group.label} className="erp-more-group">
                <h3>{group.label}</h3>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `erp-more-link${isActive ? ' erp-nav-item-active' : ''}`
                    }
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.icon ? <Icon name={item.icon} size={18} /> : null}
                    <span>{item.label}</span>
                    {item.badge ? <span className="erp-nav-badge">{item.badge}</span> : null}
                  </NavLink>
                ))}
              </section>
            ))}
            <button type="button" className="erp-more-link erp-more-signout" onClick={onLogout}>
              <Icon name="log-out" size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
