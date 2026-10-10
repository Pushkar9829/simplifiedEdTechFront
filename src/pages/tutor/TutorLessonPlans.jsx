import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteLessonPlan, listLessonPlans, updateLessonPlan } from '../../api';
import {
  ErpBanner,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpEmptyState,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { LESSON_STATUS_OPTIONS, titleCase } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import TutorRowMenu from './TutorRowMenu';
import './tutor.css';

export default function TutorLessonPlans() {
  const phone = useIsPhone();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await listLessonPlans();
      setPlans(Array.isArray(p) ? p : p?.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (p, status) => {
    try {
      await updateLessonPlan(p._id, { status });
      setMsg(`“${p.title}” marked ${titleCase(status).toLowerCase()}`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const visible = tab === 'all' ? plans : plans.filter((p) => (p.status || 'draft') === tab);
  const list = useListFilter(
    visible,
    (p) => [p.title, p.objectives, p.subjectId?.name, p.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );
  const countOf = (s) => plans.filter((p) => (p.status || 'draft') === s).length;

  const menuFor = (p) => [
    { label: 'Edit', icon: 'pencil', onClick: () => navigate(`/tutor/lesson-plans/${p._id}/edit`) },
    { label: 'Launch as course', icon: 'graduation-cap', onClick: () => navigate(`/tutor/courses/new?plans=${p._id}`) },
    ...LESSON_STATUS_OPTIONS.filter((opt) => opt.value !== (p.status || 'draft')).map((opt) => ({
      label: `Mark ${opt.label.toLowerCase()}`,
      icon: opt.value === 'completed' ? 'check-circle' : opt.value === 'ready' ? 'check' : 'file-text',
      onClick: () => setStatus(p, opt.value),
    })),
    { label: 'Delete', icon: 'trash', danger: true, onClick: () => setPendingDelete(p) },
  ];

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        subtitle="Plan each lesson’s objectives and content, then bundle plans into a course."
        actions={
          <>
            {plans.length > 0 && (
              <Link to={`/tutor/courses/new?plans=${plans.map((p) => p._id).join(',')}`} className="erp-btn-secondary">
                Launch all as course
              </Link>
            )}
            <Link to="/tutor/lesson-plans/new" className="erp-btn-primary">
              <Icon name="plus" size={16} />
              Create plan
            </Link>
          </>
        }
      />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}

      <div className="erp-filter-bar tutor-toolbar">
        <div className="tutor-toolbar-left">
          <ErpTabs
            variant="segmented"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'all', label: 'All', count: plans.length },
              ...LESSON_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, count: countOf(o.value) || null })),
            ]}
          />
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search plans" />
        </div>
      </div>

      <ErpCard flush>
        {loading ? (
          <ErpLoadingState message="Loading plans…" />
        ) : !visible.length ? (
          <ErpEmptyState
            icon="list-checks"
            title={tab === 'all' ? 'No lesson plans yet' : `No ${tab} plans`}
            description="Write objectives and content once, reuse them in classes and courses."
            action={
              <Link to="/tutor/lesson-plans/new" className="erp-btn-primary">
                Create your first plan
              </Link>
            }
          />
        ) : list.noMatch ? (
          <ErpEmptyState icon="search" title="No plans match that search" />
        ) : phone ? (
          <ul className="tutor-booking-cards">
            {list.items.map((p) => (
              <li key={p._id} className="tutor-booking-card">
                <Link to={`/tutor/lesson-plans/${p._id}/edit`} className="tutor-booking-card-hit" style={{ textDecoration: 'none' }}>
                  <span className="erp-attention-icon is-brand">
                    <Icon name="file-text" size={16} />
                  </span>
                  <span className="tutor-booking-card-main">
                    <span className="tutor-booking-card-top">
                      <strong>{p.title}</strong>
                      <ErpStatusBadge status={p.status || 'draft'} dot>
                        {titleCase(p.status || 'draft')}
                      </ErpStatusBadge>
                    </span>
                    <span className="muted">{p.subjectId?.name || 'Lesson plan'}</span>
                    {p.objectives ? <span className="tutor-item-desc">{p.objectives}</span> : null}
                  </span>
                </Link>
                <TutorRowMenu items={menuFor(p)} label={`Actions for ${p.title}`} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p._id} className="erp-row-click" onClick={() => navigate(`/tutor/lesson-plans/${p._id}/edit`)}>
                    <td>
                      <span className="tutor-cell-stack">
                        <strong>{p.title}</strong>
                        {p.objectives && <span className="tutor-item-desc">{p.objectives}</span>}
                      </span>
                    </td>
                    <td>{p.subjectId?.name || <span className="muted">—</span>}</td>
                    <td>
                      <ErpStatusBadge status={p.status || 'draft'} dot>
                        {titleCase(p.status || 'draft')}
                      </ErpStatusBadge>
                    </td>
                    <td className="tutor-cell-actions">
                      <TutorRowMenu items={menuFor(p)} label={`Actions for ${p.title}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="plan" />}
      </ErpCard>

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title="Delete lesson plan"
        message={pendingDelete ? `Delete “${pendingDelete.title}”?` : ''}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => !deleting && setPendingDelete(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteLessonPlan(pendingDelete._id);
            setPendingDelete(null);
            setMsg('Lesson plan deleted');
            load();
          } catch (err) {
            setError(errorMessage(err));
            setPendingDelete(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
