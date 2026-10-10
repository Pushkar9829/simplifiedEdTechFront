import { useEffect, useMemo, useState } from 'react';
import { listSubjects, selectSubjects } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import {
  ErpBanner,
  ErpButton,
  ErpEmptyState,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { LinkButton } from './studentUi';
import './student.css';

export default function StudentSubjects() {
  const { profile, refresh } = useAuth();
  const { options, labelFor } = useCatalog();
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
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const savedIds = useMemo(() => (profile?.subjectIds || []).map((s) => (s._id || s).toString()), [profile]);

  useEffect(() => {
    setSelected(savedIds);
  }, [savedIds]);

  const toggle = (id) => {
    setMsg('');
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const dirty =
    selected.length !== savedIds.length || selected.some((id) => !savedIds.includes(id));

  const save = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await selectSubjects(selected);
      await refresh();
      setMsg('Subjects saved. Tutor search and progress now use this list.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const visible = useMemo(() => {
    if (tab === 'all') return subjects;
    if (tab === 'mine') return subjects.filter((s) => selected.includes(s._id));
    return subjects.filter((s) => (s.category || 'ibdp') === tab);
  }, [subjects, tab, selected]);

  const list = useListFilter(visible, (s) => [s.name, s.code, s.category].filter(Boolean).join(' '), {
    resetKey: tab,
  });

  const countFor = (cat) => subjects.filter((s) => (s.category || 'ibdp') === cat).length;

  return (
    <div className="page stack st-page">
      <ErpPageHeader
        subtitle="Choose the IBDP and hobby classes you are studying. We use them to match tutors and track progress."
        actions={
          <LinkButton to="/student/tutors" variant="secondary" icon="search">
            Find tutors
          </LinkButton>
        }
      />

      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'All', count: subjects.length },
          { value: 'mine', label: 'Selected', count: selected.length },
          ...options('subject_category').map((o) => ({ value: o.value, label: o.label, count: countFor(o.value) })),
        ]}
      />

      <div className="st-filter-bar">
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search subjects" />
      </div>

      {loading ? (
        <ErpLoadingState message="Loading subjects…" />
      ) : list.noMatch ? (
        <div className="erp-card">
          <ErpEmptyState icon="search" title="No subjects match that search" />
        </div>
      ) : !list.total ? (
        <div className="erp-card">
          <ErpEmptyState
            icon="book-open"
            title={tab === 'mine' ? 'No subjects selected yet' : 'No subjects in this category'}
            description={tab === 'mine' ? 'Pick the subjects you study from the All tab.' : undefined}
            action={
              tab === 'mine' ? (
                <ErpButton variant="secondary" onClick={() => setTab('all')}>
                  Browse all subjects
                </ErpButton>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="st-subject-grid">
          {list.items.map((s) => {
            const on = selected.includes(s._id);
            return (
              <label key={s._id} className={`st-subject${on ? ' is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(s._id)} />
                <span className="st-check" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="st-subject-name">{s.name}</span>
                  <span className="st-subject-meta">
                    {[
                      s.category ? labelFor('subject_category', s.category) : null,
                      s.code,
                      (s.levels || []).join(' / '),
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
      {list.total > 0 && (
        <div className="erp-card erp-card-flush">
          <ErpPager {...list.pagerProps} noun="subject" />
        </div>
      )}

      {(dirty || saving) && (
        <div className="st-save-bar" role="region" aria-label="Unsaved changes">
          <span>
            <strong>{selected.length}</strong> subject{selected.length === 1 ? '' : 's'} selected
            <span className="muted"> · unsaved changes</span>
          </span>
          <div className="row">
            <ErpButton variant="ghost" onClick={() => setSelected(savedIds)} disabled={saving}>
              Discard
            </ErpButton>
            <ErpButton onClick={save} loading={saving} icon="check">
              {saving ? 'Saving…' : 'Save subjects'}
            </ErpButton>
          </div>
        </div>
      )}
    </div>
  );
}
