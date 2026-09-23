import { useEffect, useState } from 'react';
import { listMyEnrollments } from '../../api';
import {
  ErpCard,
  ErpDataTable,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
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
      [e.courseId?.title, e.courseId?.subjectId?.name, e.courseId?.tutorUserId?.name, e.status]
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
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Tutor</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <strong>{e.courseId?.title || '—'}</strong>
                      <div className="muted">{e.courseId?.subjectId?.name}</div>
                    </td>
                    <td>{e.courseId?.tutorUserId?.name || '—'}</td>
                    <td>
                      {e.courseId?.price ? money(e.courseId.price, e.courseId.currency) : 'Free'}
                    </td>
                    <td>
                      <ErpStatusBadge status={e.status}>{titleCase(e.status)}</ErpStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="course" />}
      </ErpCard>
    </div>
  );
}
