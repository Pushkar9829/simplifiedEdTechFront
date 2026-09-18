import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listHomework } from '../../api';
import { formatDate, statusBadge } from '../../utils/format';
import { titleCase } from './studentOptions';

export default function StudentHomework() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHomework()
      .then((d) => setItems(d.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page stack">
      <h1>Homework</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="erp-card">
        {loading ? (
          <div className="empty">Loading homework…</div>
        ) : !items.length ? (
          <div className="empty">No assignments yet.</div>
        ) : (
          <table className="erp-data-table table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Deadline</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h._id}>
                  <td>
                    <strong>{h.title}</strong>
                  </td>
                  <td>{h.subjectId?.name || '—'}</td>
                  <td>{formatDate(h.deadline)}</td>
                  <td>
                    <span className={statusBadge(h.status)}>{titleCase(h.status)}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => navigate(`/student/homework/${h._id}`)}
                    >
                      Open
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
