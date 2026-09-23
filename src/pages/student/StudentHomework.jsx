import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listHomework } from '../../api';
import { ErpButton, ErpCalendar, ErpCard, ErpPager, ErpSearch, ErpTabs } from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, statusBadge } from '../../utils/format';
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
      <h1>Homework</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'assigned', label: 'Assigned' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'graded', label: 'Graded' },
            { value: 'overdue', label: 'Overdue' },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search homework" />
        <ErpTabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
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
        <div className="erp-card">
          {loading ? (
            <div className="empty">Loading homework…</div>
          ) : !items.length ? (
            <div className="empty">No assignments yet.</div>
          ) : !visible.length ? (
            <div className="empty">No assignments in this view.</div>
          ) : list.noMatch ? (
            <div className="empty">No assignments match that search.</div>
          ) : (
            <table className="erp-data-table table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((h) => (
                  <tr key={h._id}>
                    <td>
                      <strong>{h.title}</strong>
                    </td>
                    <td>{h.subjectId?.name || '—'}</td>
                    <td>{formatDate(h.deadline)}</td>
                    <td>
                      <span className={statusBadge(h.status)}>{titleCase(h.status)}</span>
                    </td>
                    <td>
                      <ErpButton variant="secondary" onClick={() => navigate(`/student/homework/${h._id}`)}>
                        Open
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {list.total > 0 && <ErpPager {...list.pagerProps} noun="assignment" />}
        </div>
      )}
    </div>
  );
}
