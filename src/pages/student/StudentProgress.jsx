import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProgress, listSubjects } from '../../api';

export default function StudentProgress() {
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProgress(), listSubjects()])
      .then(([p, s]) => {
        setData(p);
        setSubjects(s.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const subjectName = (id) => {
    const sid = String(id);
    const found = subjects.find((s) => s._id === sid);
    return found?.name || sid.slice(-6);
  };

  if (loading || !data) {
    return error ? (
      <div className="error-banner">{error}</div>
    ) : (
      <div className="empty">Loading progress…</div>
    );
  }

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Progress</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Subject performance, predicted grades, and badges
          </p>
        </div>
        <Link to="/student/progress/log" className="btn">
          Log study hours
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="grid three">
        <div className="stat">
          <div className="label">Study streak</div>
          <div className="value">{data.studyStreak || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Strong topics</div>
          <div className="value">{data.strongTopics?.length || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Weak topics</div>
          <div className="value">{data.weakTopics?.length || 0}</div>
        </div>
      </div>

      <div className="grid two">
        <section className="erp-card stack">
          <h2>Subject performance</h2>
          {!(data.bySubject || []).length && <div className="empty">No subject scores yet.</div>}
          {(data.bySubject || []).map((row) => (
            <div key={row._id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{subjectName(row._id)}</span>
              <strong>avg {Number(row.avgScore || 0).toFixed(1)}</strong>
            </div>
          ))}

          <h3>Predicted grades</h3>
          {!Object.keys(data.predictedGrades || {}).length ? (
            <div className="empty">No predicted grades yet.</div>
          ) : (
            Object.entries(data.predictedGrades).map(([subject, grade]) => (
              <div key={subject} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{subject}</span>
                <strong>{grade}</strong>
              </div>
            ))
          )}
        </section>

        <section className="erp-card stack">
          <h2>Topics & badges</h2>
          <p>
            <span className="muted">Weak:</span> {(data.weakTopics || []).join(', ') || '—'}
          </p>
          <p>
            <span className="muted">Strong:</span> {(data.strongTopics || []).join(', ') || '—'}
          </p>
          <h3>Badges</h3>
          {!(data.badges || []).length && <div className="empty">No badges yet.</div>}
          {(data.badges || []).map((b) => (
            <div key={b._id} className="badge">
              {b.badgeId?.name || 'Badge'}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
