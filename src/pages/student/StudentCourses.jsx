import { useEffect, useState } from 'react';
import { listMyEnrollments } from '../../api';
import {
  ErpCard,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { money, tutorRef } from '../../utils/format';
import { titleCase } from './studentOptions';

export default function StudentCourses() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

  useEffect(() => {
    listMyEnrollments()
      .then((r) => setItems(Array.isArray(r) ? r : r?.items || []))
      .catch((err) => setError(err.message));
  }, []);

  const visible = tab === 'all' ? items : items.filter((e) => e.status === tab);
  const list = useListFilter(
    visible,
    (e) =>
      [e.courseId?.title, e.courseId?.subjectId?.name, e.courseId?.tutorUserId?.refCode, e.status]
        .filter(Boolean)
        .join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Courses you enrolled in from tutors." />
      {error && <div className="error-banner">{error}</div>}
      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search courses" />
      </div>
      <ErpCard className="erp-card-flush">
        {!visible.length && items.length ? (
          <div className="empty">No courses in this view.</div>
        ) : !items.length ? (
          <div className="empty">No enrollments yet. Open a tutor profile to join a course.</div>
        ) : list.noMatch ? (
          <div className="empty">No courses match that search.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {list.items.map((e) => (
              <article key={e._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{e.courseId?.title || 'Course'}</h3>
                  <p className="muted">
                    {e.courseId?.subjectId?.name || 'Subject'} · {tutorRef(e.courseId?.tutorUserId)} ·{' '}
                    {e.courseId?.price ? money(e.courseId.price, e.courseId.currency) : 'Free'}
                  </p>
                  <div className="booking-card-status">
                    <ErpStatusBadge status={e.status}>{titleCase(e.status)}</ErpStatusBadge>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="course" />}
      </ErpCard>
    </div>
  );
}
