import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSubjects, selectSubjects } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { ErpButton, ErpCard, ErpPager, ErpPageHeader, ErpSearch, ErpTabs } from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';

export default function StudentSubjects() {
  const { profile, refresh } = useAuth();
  const { options } = useCatalog();
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('all');

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

  const visible = useMemo(() => {
    if (tab === 'all') return subjects;
    return subjects.filter((s) => (s.category || 'ibdp') === tab);
  }, [subjects, tab]);

  const list = useListFilter(visible, (s) => [s.name, s.code, s.category].filter(Boolean).join(' '), {
    resetKey: tab,
  });

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Select the IBDP and hobby classes you are studying."
        actions={
          <Link to="/student/tutors" className="btn">
            Find tutors
          </Link>
        }
      />

      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${subjects.length})` },
            ...options('subject_category').map((o) => ({ value: o.value, label: o.label })),
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search subjects" />
        <div className="avail-bar-actions">
          <ErpButton onClick={save} disabled={saving}>
            {saving ? 'Saving…' : `Save (${selected.length})`}
          </ErpButton>
        </div>
      </div>

      {loading ? (
        <ErpCard className="empty">Loading subjects…</ErpCard>
      ) : list.noMatch ? (
        <ErpCard className="empty">No subjects match that search.</ErpCard>
      ) : (
        <div className="tutor-card-grid">
          {list.items.map((s) => {
            const on = selected.includes(s._id);
            return (
              <label key={s._id} className={`erp-card tutor-card subject-pick${on ? ' is-on' : ''}`}>
                <div className="tutor-card-top">
                  <div className="tutor-card-identity">
                    <input type="checkbox" checked={on} onChange={() => toggle(s._id)} />
                    <div className="tutor-card-id">
                      <h3>
                        {s.name}
                        {s.category && (
                          <span className="erp-chip erp-chip-open">{s.category === 'ibdp' ? 'IBDP' : 'Hobby'}</span>
                        )}
                      </h3>
                      <p className="muted">{[s.code, (s.levels || []).join(', ')].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
      {list.total > 0 && <ErpPager {...list.pagerProps} noun="subject" />}
    </div>
  );
}
