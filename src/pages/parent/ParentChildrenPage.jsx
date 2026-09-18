import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listChildren } from '../../api';
import { titleCase } from './parentOptions';

export default function ParentChildrenPage() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listChildren()
      .then((links) => setChildren(links || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Children</h1>
        <Link to="/parent/children/link" className="btn">
          Link child
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="erp-card">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !children.length ? (
          <div className="empty">
            No linked children.{' '}
            <Link to="/parent/children/link">Link your first child</Link>
          </div>
        ) : (
          <table className="erp-data-table table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Relationship</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {children.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.studentUserId?.name || '—'}</strong>
                  </td>
                  <td>{c.studentUserId?.phone || '—'}</td>
                  <td>{titleCase(c.relationship || 'parent')}</td>
                  <td>{titleCase(c.status || 'active')}</td>
                  <td>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => navigate('/parent')}
                    >
                      View dashboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
