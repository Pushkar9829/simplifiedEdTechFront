import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { titleCase } from './parentOptions';
import {
  ErpAvatar,
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  Icon,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { useAuth } from '../../context/AuthContext';
import { childLabel, useParentChild } from '../../context/ParentChildContext';
import { formatWhen, viewerZone } from '../student/studentTime';
import { childIdOf, summarize, useChildDashboards } from './parentData';
import './parent.css';

function ChildCard({ link, entry, selected, zone, onGo }) {
  const s = summarize(entry?.data);
  const name = childLabel(link);
  const student = link.studentUserId || {};
  const status = link.status || 'active';
  const next = s?.nextClass;
  const value = (v) => (entry?.error ? '—' : s ? v : '…');

  return (
    <article className={`erp-card pc-card${selected ? ' is-selected' : ''}`}>
      <div className="pc-head">
        <ErpAvatar name={name} src={entry?.data?.student?.avatar} size="xl" />
        <div className="pc-head-text">
          <h3 className="pc-name">
            <span>{name}</span>
            {selected ? (
              <ErpBadge tone="brand" dot>
                Selected
              </ErpBadge>
            ) : null}
          </h3>
          <p className="pc-sub">
            {[entry?.data?.student?.refCode || student.refCode, student.phone, titleCase(link.relationship || 'parent')]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {status !== 'active' ? <ErpStatusBadge status={status}>{titleCase(status)}</ErpStatusBadge> : null}
      </div>

      <div className="pc-stats">
        <div className="pc-stat">
          <span className="pc-stat-label">Upcoming</span>
          <span className="pc-stat-value">{value(s?.upcoming)}</span>
        </div>
        <div className="pc-stat">
          <span className="pc-stat-label">Open homework</span>
          <span className="pc-stat-value">
            {value(s?.homeworkOpen)}
            {s?.overdue ? <span className="erp-text-danger"> · {s.overdue} late</span> : null}
          </span>
        </div>
        <div className="pc-stat">
          <span className="pc-stat-label">Outstanding</span>
          <span className={`pc-stat-value${s?.due.length ? ' is-due' : ''}`} title={s?.due.join(' · ')}>
            {value(s?.due.length ? s.due.join(' · ') : 'None')}
          </span>
        </div>
      </div>

      <div className="pc-next">
        <Icon name="calendar" size={15} />
        <span>
          {entry?.error
            ? 'Summary unavailable'
            : !s
              ? 'Loading summary…'
              : next
                ? `Next: ${next.subjectId?.name || 'Class'} · ${formatWhen(next.startAt, zone)}`
                : 'No upcoming classes'}
        </span>
      </div>

      <div className="pc-actions">
        <ErpButton variant="secondary" icon="layout-dashboard" onClick={() => onGo(link, '/parent')}>
          Dashboard
        </ErpButton>
        <ErpButton variant="secondary" icon="calendar" onClick={() => onGo(link, '/parent/bookings')}>
          Classes
        </ErpButton>
        <ErpButton variant="secondary" icon="search" onClick={() => onGo(link, '/parent/tutors')}>
          Find tutor
        </ErpButton>
      </div>
    </article>
  );
}

export default function ParentChildrenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const zone = viewerZone(user);
  const [flash, setFlash] = useState(location.state?.msg || '');
  const { children, loading, error, refreshChildren, selectedChildId, setSelectedChildId } = useParentChild();

  const list = useListFilter(children, (c) =>
    [c.studentUserId?.name, c.studentUserId?.phone, c.studentUserId?.refCode, c.relationship, c.status]
      .filter(Boolean)
      .join(' ')
  );
  const { byId } = useChildDashboards(list.items.map(childIdOf));

  const go = (c, path) => {
    const id = childIdOf(c);
    setSelectedChildId(id);
    navigate(`${path}?child=${id}`);
  };

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Linked students you can book, pay for and follow."
        actions={
          <Link to="/parent/children/link" className="erp-btn-primary">
            <Icon name="plus" size={16} />
            Link child
          </Link>
        }
      />

      {flash ? (
        <ErpBanner variant="success" onDismiss={() => setFlash('')}>
          {flash}
        </ErpBanner>
      ) : null}
      {error ? (
        <ErpBanner
          variant="danger"
          actions={
            <ErpButton variant="secondary" size="sm" icon="refresh" onClick={() => refreshChildren()}>
              Retry
            </ErpButton>
          }
        >
          {error}
        </ErpBanner>
      ) : null}

      {children.length > 3 || list.search ? (
        <div className="pc-toolbar">
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search by name, phone or ref" />
        </div>
      ) : null}

      {loading && !children.length ? (
        <ErpLoadingState message="Loading your children…" />
      ) : error && !children.length ? (
        <ErpCard>
          <ErpEmptyState icon="alert-triangle" title="Could not load your children" description="Try again in a moment." />
        </ErpCard>
      ) : !children.length ? (
        <ErpCard>
          <ErpEmptyState
            icon="users"
            title="No linked children yet"
            description="Link your child with the phone number they registered with to book classes and follow their progress."
            action={
              <Link to="/parent/children/link" className="erp-btn-primary">
                Link your first child
              </Link>
            }
          />
        </ErpCard>
      ) : list.noMatch ? (
        <ErpCard>
          <ErpEmptyState
            icon="search"
            title="No children match that search"
            action={
              <ErpButton variant="secondary" onClick={() => list.setSearch('')}>
                Clear search
              </ErpButton>
            }
          />
        </ErpCard>
      ) : (
        <>
          <div className="pc-grid">
            {list.items.map((c) => (
              <ChildCard
                key={c._id || childIdOf(c)}
                link={c}
                entry={byId[childIdOf(c)]}
                selected={childIdOf(c) === selectedChildId}
                zone={zone}
                onGo={go}
              />
            ))}
            {!list.search ? (
              <Link to="/parent/children/link" className="pc-add">
                <span className="pc-add-icon">
                  <Icon name="plus" size={20} />
                </span>
                <strong>Link another child</strong>
                <span>Add a sibling with their registered phone number</span>
              </Link>
            ) : null}
          </div>
          {list.pagerProps.pages > 1 ? <ErpPager {...list.pagerProps} noun="child" /> : null}
        </>
      )}
    </div>
  );
}
