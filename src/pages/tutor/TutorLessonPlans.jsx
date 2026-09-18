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
  ErpPageHeader,
  ErpSelect,
  ErpStatusBadge,
  ErpToolbar,
} from '../../components/erp';
import { Link } from 'react-router-dom';
import { LESSON_STATUS_OPTIONS, titleCase } from './tutorOptions';

export default function TutorLessonPlans() {
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

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

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Objectives and status for each lesson plan." />
      {error && <div className="error-banner">{error}</div>}

      <ErpToolbar
        actions={
          <Link to="/tutor/lesson-plans/new" className="erp-btn-primary">
            Create plan
          </Link>
        }
      />

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading plans…</div>
        ) : !plans.length ? (
          <div className="empty">
            No lesson plans yet.{' '}
            <Link to="/tutor/lesson-plans/new">Create your first plan</Link>
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
                {plans.map((p) => (
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
                    <td>
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
