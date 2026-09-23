import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tutorEarnings, tutorEarningsSummary } from '../../api';
import {
  ErpCard,
  ErpDataTable,
  ErpList,
  ErpListItem,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, money } from '../../utils/format';

export default function TutorEarnings() {
  const phone = useIsPhone();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const maxBar = Math.max(1, ...(summary?.monthlySeries || []).map((m) => m.amount));
  const list = useListFilter(items, (p) => [p.description, p.status].filter(Boolean).join(' '));

  useEffect(() => {
    Promise.all([tutorEarnings(), tutorEarningsSummary()])
      .then(([list, sum]) => {
        setItems(list.items || []);
        setSummary(sum);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Your 75% share after platform fee, monthly trend, and how much you can take out at month end." />
      {error && <div className="error-banner">{error}</div>}
      <div className="avail-bar">
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search payments" />
        <div className="avail-bar-actions">
          <Link to="/tutor/wallet" className="erp-btn-secondary">
            Wallet & withdraw
          </Link>
        </div>
      </div>

      <div className="erp-kpis">
        <div className="stat">
          <div className="label">Your lifetime share</div>
          <div className="value">{money(summary?.lifetime || 0, summary?.currency)}</div>
          {summary?.lifetimeGross != null && (
            <div className="muted">Gross {money(summary.lifetimeGross, summary.currency)}</div>
          )}
        </div>
        <div className="stat">
          <div className="label">This month</div>
          <div className="value">{money(summary?.thisMonth || 0, summary?.currency)}</div>
          {summary?.thisMonthGross != null && (
            <div className="muted">Gross {money(summary.thisMonthGross, summary.currency)}</div>
          )}
        </div>
        <div className="stat">
          <div className="label">Pending share</div>
          <div className="value">{money(summary?.pendingPayout || 0, summary?.currency)}</div>
        </div>
        <div className="stat">
          <div className="label">Withdrawable</div>
          <div className="value">{money(summary?.withdrawable || 0, summary?.currency)}</div>
        </div>
      </div>

      <div className="earnings-split">
        <ErpCard>
          <h3 style={{ marginTop: 0 }}>Monthly tutor share</h3>
          {!summary?.monthlySeries?.length ? (
            <div className="empty">No paid months yet.</div>
          ) : (
            <div className="stack">
              {summary.monthlySeries.map((m) => (
                <div key={m.month}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{m.month}</span>
                    <strong>{money(m.amount, summary.currency)}</strong>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: 'var(--erp-border, #e5e7eb)',
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(m.amount / maxBar) * 100}%`,
                        height: '100%',
                        background: 'var(--erp-accent, #2563eb)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ErpCard>

        <ErpCard>
          <h3 style={{ marginTop: 0 }}>By subject</h3>
          {!summary?.bySubject?.length ? (
            <div className="empty">No subject breakdown yet.</div>
          ) : (
            summary.bySubject.map((s) => (
              <div key={s.subject} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{s.subject}</span>
                <strong>{money(s.amount, summary.currency)}</strong>
              </div>
            ))
          )}
        </ErpCard>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading earnings…</div>
        ) : !items.length ? (
          <div className="empty">No confirmed earnings yet.</div>
        ) : list.noMatch ? (
          <div className="empty">No payments match that search.</div>
        ) : phone ? (
          <div style={{ padding: '0.65rem' }}>
            <ErpList>
              {list.items.map((p) => (
                <ErpListItem
                  key={p._id}
                  title={p.description || 'Payment'}
                  meta={formatDate(p.paidAt || p.createdAt)}
                  status={p.status}
                >
                  <div className="muted">
                    Invoice {money(p.amount, p.currency)} · share{' '}
                    {money((p.amount || 0) * (summary?.payoutRate || 0.75), p.currency)}
                  </div>
                </ErpListItem>
              ))}
            </ErpList>
          </div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Invoice</th>
                  <th>Your share</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDate(p.paidAt || p.createdAt)}</td>
                    <td>{p.description || '—'}</td>
                    <td>{money(p.amount, p.currency)}</td>
                    <td>{money((p.amount || 0) * (summary?.payoutRate || 0.75), p.currency)}</td>
                    <td>
                      <ErpStatusBadge status={p.status}>{p.status}</ErpStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="payment" />}
      </ErpCard>
    </div>
  );
}
