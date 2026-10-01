import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProgress, listSubjects } from '../../api';
import { ErpPageHeader, ErpTabs } from '../../components/erp';

export default function StudentProgress() {
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

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
      <ErpPageHeader
        subtitle="Credits, predicted grades, and badges from your work."
        actions={
          <Link to="/student/progress/log" className="btn">
            Log study hours
          </Link>
        }
      />
      {error && <div className="error-banner">{error}</div>}

      <div className="grid three">
        <div className="stat">
          <div className="label">Credits</div>
          <div className="value">{data.credits || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Stars</div>
          <div className="value">{'★'.repeat(data.stars || 0) || '—'}</div>
        </div>
        <div className="stat">
          <div className="label">Level</div>
          <div className="value">{data.level || 'Starter'}</div>
        </div>
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

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Subjects' },
            { value: 'topics', label: 'Topics & badges' },
          ]}
        />
      </div>

      {tab === 'overview' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Subject performance</h2>
          {!(data.bySubject || []).length && <div className="empty">No subject scores yet.</div>}
          <div className="tutor-profile-list">
            {(data.bySubject || []).map((row) => (
              <div key={row._id} className="tutor-profile-row">
                <strong>{subjectName(row._id)}</strong>
                <span>avg {Number(row.avgScore || 0).toFixed(1)}</span>
              </div>
            ))}
          </div>
          <h3>Predicted grades</h3>
          {!Object.keys(data.predictedGrades || {}).length ? (
            <div className="empty">No predicted grades yet.</div>
          ) : (
            <div className="tutor-profile-list">
              {Object.entries(data.predictedGrades).map(([subject, grade]) => (
                <div key={subject} className="tutor-profile-row">
                  <strong>{subject}</strong>
                  <span>{grade}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'topics' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Topics & badges</h2>
          <p>
            <span className="muted">Weak:</span> {(data.weakTopics || []).join(', ') || '—'}
          </p>
          <p>
            <span className="muted">Strong:</span> {(data.strongTopics || []).join(', ') || '—'}
          </p>
          <h3>Badges</h3>
          {!(data.badges || []).length && <div className="empty">No badges yet.</div>}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {(data.badges || []).map((b) => (
              <span key={b._id} className="erp-chip erp-chip-open">
                {b.badgeId?.name || 'Badge'}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
