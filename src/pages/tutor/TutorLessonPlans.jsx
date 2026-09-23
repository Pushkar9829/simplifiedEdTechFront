import { useEffect, useState } from 'react';
import {
  deleteLessonPlan,
  listLessonPlans,
  updateLessonPlan,
} from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpList,
  ErpListItem,
  ErpOverflow,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { Link } from 'react-router-dom';
import { LESSON_STATUS_OPTIONS, titleCase } from './tutorOptions';

export default function TutorLessonPlans() {
  const phone = useIsPhone();
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [tab, setTab] = useState('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await listLessonPlans();
      setPlans(Array.isArray(p) ? p : p?.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = tab === 'all' ? plans : plans.filter((p) => (p.status || 'draft') === tab);
  const list = useListFilter(
    visible,
    (p) => [p.title, p.objectives, p.subjectId?.name, p.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Objectives and status for each lesson plan." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${plans.length})` },
            ...LESSON_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search plans" />
        <div className="avail-bar-actions">
          <Link to="/tutor/lesson-plans/new" className="erp-btn-primary">
            Create plan
          </Link>
          {plans.length > 0 && (
            <Link
              to={`/tutor/courses/new?plans=${plans.map((p) => p._id).join(',')}`}
              className="erp-btn-secondary"
            >
              Launch all as course
            </Link>
          )}
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading plans…</div>
        ) : !visible.length ? (
          <div className="empty">
            No lesson plans yet.{' '}
            <Link to="/tutor/lesson-plans/new">Create your first plan</Link>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No plans match that search.</div>
        ) : phone ? (
          <div style={{ padding: '0.65rem' }}>
            <ErpList>
              {list.items.map((p) => (
                <ErpListItem
                  key={p._id}
                  title={p.title}
                  meta={p.subjectId?.name || 'Lesson plan'}
                  status={p.status || 'draft'}
                  statusLabel={titleCase(p.status)}
                  to={`/tutor/lesson-plans/${p._id}/edit`}
                  actions={
                    <ErpOverflow
                      items={[
                        { label: 'Edit', to: `/tutor/lesson-plans/${p._id}/edit` },
                        { label: 'Launch as course', to: `/tutor/courses/new?plans=${p._id}` },
                        ...LESSON_STATUS_OPTIONS.map((opt) => ({
                          label: `Mark ${opt.label}`,
                          onClick: async () => {
                            try {
                              await updateLessonPlan(p._id, { status: opt.value });
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          },
                        })),
                        { label: 'Delete', danger: true, onClick: () => setPendingDelete(p) },
                      ]}
                    />
                  }
                >
                  {p.objectives ? <div className="muted">{p.objectives}</div> : null}
                </ErpListItem>
              ))}
            </ErpList>
          </div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.title}</strong>
                      {p.objectives && <div className="muted">{p.objectives}</div>}
                    </td>
                    <td>{p.subjectId?.name || '—'}</td>
                    <td>
                      <div className="row">
                        <ErpStatusBadge status={p.status || 'draft'}>
                          {titleCase(p.status)}
                        </ErpStatusBadge>
                        <ErpSelect
                          inline
                          value={p.status || 'draft'}
                          options={LESSON_STATUS_OPTIONS}
                          onChange={async (e) => {
                            try {
                              await updateLessonPlan(p._id, { status: e.target.value });
                              load();
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="row">
                      <Link to={`/tutor/lesson-plans/${p._id}/edit`} className="erp-btn-secondary">
                        Edit
                      </Link>
                      <Link
                        to={`/tutor/courses/new?plans=${p._id}`}
                        className="erp-btn-secondary"
                      >
                        Launch as course
                      </Link>
                      <ErpButton variant="danger" onClick={() => setPendingDelete(p)}>
                        Delete
                      </ErpButton>
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
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await deleteLessonPlan(pendingDelete._id);
            setPendingDelete(null);
            load();
          } catch (err) {
            setError(err.message);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
