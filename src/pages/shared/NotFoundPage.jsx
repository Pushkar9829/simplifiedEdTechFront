import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';

export default function NotFoundPage() {
  const { user, homePath } = useAuth();
  return (
    <div className="erp-loading-state" style={{ gap: 0, minHeight: user ? '60vh' : '100vh' }}>
      <div className="erp-empty-state" style={{ maxWidth: 440 }}>
        <span className="erp-empty-state-icon">
          <Icon name="map-pin" size={20} />
        </span>
        <p className="erp-overline" style={{ marginTop: '0.25rem' }}>
          Error 404
        </p>
        <h1 className="erp-hero-title" style={{ margin: '0.25rem 0 0.25rem' }}>
          Page not found
        </h1>
        <p className="erp-empty-state-text">
          The page you were looking for doesn&apos;t exist or has moved.
        </p>
        <div className="erp-empty-state-action">
          <Link className="erp-btn-primary" to={user ? homePath : '/login'}>
            <Icon name={user ? 'home' : 'arrow-right'} size={16} />
            {user ? 'Back to dashboard' : 'Go to sign in'}
          </Link>
        </div>
      </div>
    </div>
  );
}
