import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listProjects, setProjectStatus } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, money, tutorRef } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './studentOptions';

function paymentPending(p) {
  const pay = p.paymentId;
  if (!pay) return false;
  const status = pay.status || '';
  return ['pending', 'failed', 'awaiting_confirmation'].includes(status);
}

export default function StudentProjects() {
  const location = useLocation();
  const navigate = useNavigate();
  const paymentsPath = location.pathname.startsWith('/parent') ? '/parent/payments' : '/student/payments';
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('all');

  const load = async () => {
    try {
      const r = await listProjects();
      setItems(Array.isArray(r) ? r : r?.items || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = tab === 'all' ? items : items.filter((p) => p.status === tab);
  const list = useListFilter(
    visible,
    (p) => [p.name, p.description, p.tutorUserId?.refCode, p.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Your tutor charges a fee for project work. You pay that fee — students are not paid by anyone." />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}
      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'proposed', label: 'Proposed' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'delivered', label: 'Delivered' },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search projects" />
      </div>
      <ErpCard className="erp-card-flush">
        {!visible.length && items.length ? (
          <div className="empty">No projects in this view.</div>
        ) : !items.length ? (
          <div className="empty">No projects yet.</div>
        ) : list.noMatch ? (
          <div className="empty">No projects match that search.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {list.items.map((p) => (
              <article key={p._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>{p.name}</h3>
                  <p className="muted">
                    {tutorRef(p.tutorUserId)} · {money(p.price, p.currency)} · due {formatDate(p.deliveryDate)}
                  </p>
                  {p.description && <p className="muted">{p.description}</p>}
                  {!!p.deliverables?.length && (
                    <p className="muted">
                      {p.deliverables.map((f) => (
                        <a key={f.url} href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                          {f.name || 'file'}
                        </a>
                      ))}
                    </p>
                  )}
                  <div className="booking-card-status">
                    <ErpStatusBadge status={p.status}>{titleCase(p.status)}</ErpStatusBadge>
                  </div>
                </div>
                <div className="booking-card-actions">
                  {p.status === 'proposed' && paymentPending(p) && (
                    <Link to={paymentsPath} className="erp-btn-primary">
                      Pay tutor
                    </Link>
                  )}
                  {p.status === 'proposed' && !paymentPending(p) && (
                    <ErpButton
                      onClick={async () => {
                        try {
                          const result = await setProjectStatus(p._id, 'accepted');
                          if (result?.payNow) {
                            setMsg('Tutor fee invoice created. Pay it so the tutor can start.');
                            navigate(paymentsPath);
                            return;
                          }
                          await load();
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Accept & pay
                    </ErpButton>
                  )}
                  {p.status === 'delivered' && (
                    <ErpButton onClick={() => setProjectStatus(p._id, 'completed').then(load)}>
                      Mark complete
                    </ErpButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="project" />}
      </ErpCard>
    </div>
  );
}
