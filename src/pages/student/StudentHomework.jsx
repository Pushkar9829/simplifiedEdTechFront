import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listHomework } from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpEmptyState,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpStatusBadge,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { errorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { titleCase } from './studentOptions';
import { formatWhen, timeUntil, viewerZone } from './studentTime';
import { LinkButton } from './studentUi';
import './student.css';

const PAGE_SIZE = 25;

// Only unsubmitted work can be overdue; a submission after the deadline is "late", not overdue.
function isOverdue(h) {
  return h.status === 'assigned' && h.deadline && new Date(h.deadline) < new Date();
}

const TAB_STATUS = { assigned: 'assigned', submitted: 'submitted', graded: 'graded', overdue: '' };

export default function StudentHomework() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const zone = viewerZone(user);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const reqId = useRef(0);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    Promise.all([
      listHomework({ status: TAB_STATUS[tab] || '', page, limit: PAGE_SIZE }),
      listHomework({ page: 1, limit: 1 }),
      listHomework({ status: 'assigned', page: 1, limit: 1 }),
      listHomework({ status: 'submitted', page: 1, limit: 1 }),
      listHomework({ status: 'graded', page: 1, limit: 1 }),
    ])
      .then(([d, all, assigned, submitted, graded]) => {
        if (id !== reqId.current) return;
        setItems(d.items || []);
        setTotal(d.total ?? (d.items || []).length);
        setCounts({
          all: all.total ?? 0,
          assigned: assigned.total ?? 0,
          submitted: submitted.total ?? 0,
          graded: graded.total ?? 0,
        });
      })
      .catch((err) => {
        if (id === reqId.current) setError(errorMessage(err));
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [tab, page]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((h) => {
      if (tab === 'overdue' && !isOverdue(h) && h.status !== 'overdue') return false;
      if (!q) return true;
      return [h.title, h.subjectId?.name, h.status].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [items, tab, search]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const events = useMemo(
    () =>
      visible
        .filter((h) => h.deadline)
        .map((h) => ({
          id: h._id,
          start: h.deadline,
          title: h.title,
          variant: h.status === 'graded' ? 'completed' : isOverdue(h) ? 'cancelled' : 'online',
          homework: h,
        })),
    [visible]
  );

  const pager =
    total > PAGE_SIZE || (total > 0 && view === 'list') ? (
      <ErpPager
        page={page}
        pages={pages}
        total={total}
        noun="assignment"
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages, p + 1))}
      />
    ) : null;

  const statusIcon = (h) => {
    if (h.status === 'graded') return { icon: 'award', tone: 'is-success' };
    if (h.status === 'submitted') return { icon: 'check-circle', tone: '' };
    if (isOverdue(h) || h.status === 'overdue') return { icon: 'alert-triangle', tone: 'is-danger' };
    return { icon: 'file-text', tone: 'is-neutral' };
  };

  const emptyState = !counts.all ? (
    <ErpEmptyState
      icon="clipboard-check"
      title="No assignments yet"
      description="When a tutor sets homework after a class, it will appear here."
    />
  ) : !items.length ? (
    <ErpEmptyState icon="check-circle" title="Nothing in this view" description="Try another tab to see the rest of your work." />
  ) : (
    <ErpEmptyState
      icon={tab === 'overdue' ? 'check-circle' : 'search'}
      title={tab === 'overdue' ? 'Nothing overdue on this page' : 'No assignments match that search'}
      action={
        search ? (
          <ErpButton variant="secondary" onClick={() => setSearch('')}>
            Clear search
          </ErpButton>
        ) : null
      }
    />
  );

  return (
    <div className="page stack st-page">
      <ErpPageHeader subtitle="Assignments from your tutors. Open one to read the brief and submit your work." />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'All', count: counts.all ?? 0 },
          { value: 'assigned', label: 'To do', count: counts.assigned ?? 0 },
          { value: 'submitted', label: 'Submitted', count: counts.submitted ?? 0 },
          { value: 'graded', label: 'Graded', count: counts.graded ?? 0 },
          { value: 'overdue', label: 'Overdue' },
        ]}
      />

      <div className="st-filter-bar">
        <ErpSearch value={search} onChange={setSearch} placeholder="Search title or subject" />
        <div className="st-filter-bar-end">
          <ErpSegmented
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List', icon: 'list-checks' },
              { value: 'calendar', label: 'Calendar', icon: 'calendar' },
            ]}
          />
        </div>
      </div>

      {view === 'calendar' ? (
        <ErpCard>
          {loading ? (
            <ErpLoadingState message="Loading homework…" />
          ) : !events.length ? (
            <ErpEmptyState icon="calendar" title="No deadlines in this view" />
          ) : (
            <ErpCalendar events={events} onEventClick={(e) => navigate(`/student/homework/${e.homework._id}`)} />
          )}
          {pager}
        </ErpCard>
      ) : (
        <ErpCard flush>
          {loading ? (
            <ErpLoadingState message="Loading homework…" />
          ) : !visible.length ? (
            emptyState
          ) : (
            <ul className="st-list">
              {visible.map((h) => {
                const si = statusIcon(h);
                const overdue = isOverdue(h) || h.status === 'overdue';
                const todo = h.status === 'assigned' || h.status === 'overdue';
                return (
                  <li key={h._id} className={`st-item${overdue ? ' is-attention' : ''}`}>
                    <span className={`st-leading-icon ${si.tone}`}>
                      <Icon name={si.icon} size={18} />
                    </span>
                    <div className="st-item-body">
                      <p className="st-item-title">
                        <Link to={`/student/homework/${h._id}`}>{h.title}</Link>
                      </p>
                      <p className="st-item-meta">
                        <span>
                          <Icon name="book-open" size={14} />
                          {h.subjectId?.name || 'Subject'}
                        </span>
                        <span className={overdue ? 'erp-text-danger' : undefined}>
                          <Icon name="clock" size={14} />
                          {overdue ? 'Was due' : 'Due'} {formatWhen(h.deadline, zone)}
                          {todo && h.deadline ? ` · ${timeUntil(h.deadline)}` : ''}
                        </span>
                      </p>
                      <div className="st-item-badges">
                        <ErpStatusBadge status={overdue ? 'overdue' : h.status} dot>
                          {overdue ? 'Overdue' : todo ? 'To do' : titleCase(h.status)}
                        </ErpStatusBadge>
                      </div>
                    </div>
                    <div className="st-item-actions">
                      {todo ? (
                        <LinkButton to={`/student/homework/${h._id}`} variant={overdue ? 'primary' : 'secondary'} icon="upload">
                          Submit
                        </LinkButton>
                      ) : (
                        <LinkButton to={`/student/homework/${h._id}`} variant="secondary">
                          {h.status === 'graded' ? 'View grade' : 'Open'}
                        </LinkButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {pager}
        </ErpCard>
      )}
    </div>
  );
}
