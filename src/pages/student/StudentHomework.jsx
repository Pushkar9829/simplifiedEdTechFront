import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listHomework } from '../../api';
import {
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate } from '../../utils/format';
import { titleCase } from './studentOptions';

function isOverdue(h) {
  return h.status !== 'graded' && h.deadline && new Date(h.deadline) < new Date();
}

export default function StudentHomework() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');

  useEffect(() => {
    listHomework()
      .then((d) => setItems(d.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(
    () => ({
      assigned: items.filter((h) => h.status === 'assigned').length,
      submitted: items.filter((h) => h.status === 'submitted').length,
      graded: items.filter((h) => h.status === 'graded').length,
      overdue: items.filter(isOverdue).length,
    }),
    [items]
  );

  const visible = items.filter((h) => {
    if (tab === 'assigned') return h.status === 'assigned';
    if (tab === 'submitted') return h.status === 'submitted';
    if (tab === 'graded') return h.status === 'graded';
    if (tab === 'overdue') return isOverdue(h);
    return true;
  });

  const list = useListFilter(
    visible,
    (h) => [h.title, h.subjectId?.name, h.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  const events = useMemo(
    () =>
      (list.filtered || visible)
        .filter((h) => h.deadline)
        .map((h) => ({
          id: h._id,
          start: h.deadline,
          title: h.title,
          variant: h.status === 'graded' ? 'completed' : isOverdue(h) ? 'cancelled' : 'online',
          homework: h,
        })),
    [list.filtered, visible]
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Assignments from your tutors. Open one to submit work." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'assigned', label: `Assigned (${counts.assigned})` },
            { value: 'submitted', label: `Submitted (${counts.submitted})` },
            { value: 'graded', label: `Graded (${counts.graded})` },
            { value: 'overdue', label: `Overdue (${counts.overdue})` },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search homework" />
        <ErpSelect
          inline
          value={view}
          options={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
          onChange={(e) => setView(e.target.value)}
        />
      </div>

      {view === 'calendar' ? (
        <ErpCard>
          {loading ? (
            <div className="empty">Loading homework…</div>
          ) : !events.length ? (
            <div className="empty">No assignments with a deadline in this view.</div>
          ) : (
            <ErpCalendar
              events={events}
              onEventClick={(e) => navigate(`/student/homework/${e.homework._id}`)}
            />
          )}
        </ErpCard>
      ) : (
        <ErpCard className="erp-card-flush">
          {loading ? (
            <div className="empty">Loading homework…</div>
          ) : !items.length ? (
            <div className="empty">No assignments yet.</div>
          ) : !visible.length ? (
            <div className="empty">No assignments in this view.</div>
          ) : list.noMatch ? (
            <div className="empty">No assignments match that search.</div>
          ) : (
            <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
              {list.items.map((h) => (
                <article key={h._id} className="tutor-profile-row booking-card">
                  <div className="booking-card-main">
                    <h3>
                      {h.title}
                      {isOverdue(h) && <span className="erp-chip erp-chip-booked">Overdue</span>}
                    </h3>
                    <p className="muted">
                      {h.subjectId?.name || 'Subject'} · due {formatDate(h.deadline)}
                    </p>
                    <div className="booking-card-status">
                      <ErpStatusBadge status={h.status}>{titleCase(h.status)}</ErpStatusBadge>
                    </div>
                  </div>
                  <ErpButton variant="secondary" onClick={() => navigate(`/student/homework/${h._id}`)}>
                    Open
                  </ErpButton>
                </article>
              ))}
            </div>
          )}
          {list.total > 0 && <ErpPager {...list.pagerProps} noun="assignment" />}
        </ErpCard>
      )}
    </div>
  );
}
