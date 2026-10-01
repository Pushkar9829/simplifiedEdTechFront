import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listChildren } from '../../api';
import { titleCase } from './parentOptions';
import { ErpButton, ErpCard, ErpPager, ErpPageHeader, ErpSearch, ErpStatusBadge, ErpTabs } from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';

export default function ParentChildrenPage() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    listChildren()
      .then((links) => setChildren(links || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visible =
    tab === 'all' ? children : children.filter((c) => (c.status || 'active') === tab);
  const list = useListFilter(
    visible,
    (c) => [c.studentUserId?.name, c.studentUserId?.phone, c.relationship, c.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Linked students you can book, pay, and monitor."
        actions={
          <Link to="/parent/children/link" className="btn">
            Link child
          </Link>
        }
      />

      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${children.length})` },
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending' },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search children" />
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !children.length ? (
          <div className="empty">
            No linked children. <Link to="/parent/children/link">Link your first child</Link>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No children match that search.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {list.items.map((c) => (
              <article key={c._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{c.studentUserId?.name || 'Student'}</h3>
                  <p className="muted">
                    {c.studentUserId?.phone || '—'} · {titleCase(c.relationship || 'parent')}
                  </p>
                  <div className="booking-card-status">
                    <ErpStatusBadge status={c.status || 'active'}>{titleCase(c.status || 'active')}</ErpStatusBadge>
                  </div>
                </div>
                <div className="booking-card-actions">
                  <ErpButton variant="secondary" onClick={() => navigate('/parent')}>
                    Dashboard
                  </ErpButton>
                  <ErpButton onClick={() => navigate('/parent/tutors')}>Find tutor</ErpButton>
                </div>
              </article>
            ))}
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="child" />}
      </ErpCard>
    </div>
  );
}
