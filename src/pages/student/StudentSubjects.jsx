import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSubjects, selectSubjects } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function StudentSubjects() {
  const { profile, refresh } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listSubjects()
      .then((data) => setSubjects(data.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ids = (profile?.subjectIds || []).map((s) => (s._id || s).toString());
    setSelected(ids);
  }, [profile]);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await selectSubjects(selected);
      await refresh();
      setMsg('Subjects saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>My IBDP subjects</h1>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            Select the diploma subjects you are studying
          </p>
        </div>
        <Link to="/student/tutors" className="btn secondary">
          Find tutors
        </Link>
      </div>

      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="erp-card empty">Loading subjects…</div>
      ) : (
        <div className="erp-card grid two">
          {subjects.map((s) => (
            <label key={s._id} className="row" style={{ gap: '0.45rem' }}>
              <input
                type="checkbox"
                checked={selected.includes(s._id)}
                onChange={() => toggle(s._id)}
              />
              <span>
                <strong>{s.name}</strong>
                {s.code && <span className="muted"> · {s.code}</span>}
              </span>
            </label>
          ))}
          {!subjects.length && <div className="empty">No subjects available.</div>}
        </div>
      )}

      <div className="row">
        <button className="btn" type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : `Save selection (${selected.length})`}
        </button>
      </div>
    </div>
  );
}
