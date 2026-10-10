import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePathFor, useAuth } from '../context/AuthContext';
import { Icon } from './Icon';

export default function ProtectedRoute({ roles }) {
  const { user, loading, sessionError, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="erp-loading-state is-fullscreen" role="status">
        <span className="erp-brand-mark" aria-hidden="true" style={{ width: 40, height: 40 }}>
          <Icon name="graduation-cap" size={22} strokeWidth={2} />
        </span>
        <span className="erp-spinner" aria-hidden="true" />
        <span>Loading your workspace…</span>
      </div>
    );
  }

  if (!user && sessionError && localStorage.getItem('ibdp_token')) {
    return (
      <div className="erp-loading-state is-fullscreen">
        <div className="erp-card" style={{ width: 'min(420px, 100%)' }}>
          <div className="erp-empty-state" style={{ padding: '1rem 0.5rem' }}>
            <span
              className="erp-empty-state-icon"
              style={{ background: 'var(--erp-danger-bg)', color: 'var(--erp-danger-text)' }}
            >
              <Icon name="alert-triangle" size={20} />
            </span>
            <p className="erp-empty-state-title">We couldn&apos;t load your session</p>
            <p className="erp-empty-state-text">{sessionError}</p>
            <div className="erp-empty-state-action">
              <button type="button" className="erp-btn-primary" onClick={() => refresh()}>
                <Icon name="refresh" size={16} />
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return <Outlet />;
}
