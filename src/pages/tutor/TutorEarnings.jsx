import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tutorEarnings, tutorEarningsSummary } from '../../api';
import {
  ErpBanner,
  ErpCard,
  ErpDataTable,
  ErpEmptyState,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStat,
  ErpStatusBadge,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { money } from '../../utils/format';
import { localTime } from './tutorOptions';
import './tutor.css';

const PAGE_SIZE = 20;

function tutorShareOf(p, rate) {
  const settled = Number(p.settlement?.tutorAmt);
  if (Number.isFinite(settled) && settled > 0) return settled;
  return (Number(p.amount) || 0) * rate;
}

export default function TutorEarnings() {
  const phone = useIsPhone();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const maxBar = Math.max(1, ...(summary?.monthlySeries || []).map((m) => m.amount));
  const list = useListFilter(items, (p) => [p.description, p.status].filter(Boolean).join(' '), {
    pageSize: 1000,
    resetKey: page,
  });
  const rate = Number(summary?.payoutRate) || 0.75;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    tutorEarningsSummary()
      .then(setSummary)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    setLoading(true);
    tutorEarnings({ page, limit: PAGE_SIZE })
      .then((res) => {
        setItems(res.items || []);
        setTotal(Number(res.total) || 0);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [page]);

  const cur = summary?.currency;
  const billing = summary?.billing;
  const series = summary?.monthlySeries || [];
  const subjectTotal = (summary?.bySubject || []).reduce((s, x) => s + (Number(x.amount) || 0), 0) || 1;
  const monthLabel = (m) => {
    const [y, mo] = String(m).split('-').map(Number);
    if (!y || !mo) return m;
    return new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };
  const show = (v) => (summary ? money(v || 0, cur) : '…');

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        subtitle={`Your ${Math.round(rate * 100)}% share after the platform fee, how it trends, and what you can withdraw.`}
        actions={
          <Link to="/tutor/wallet" className="erp-btn-secondary">
            <Icon name="wallet" size={16} />
            Wallet & withdraw
          </Link>
        }
      />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      {billing ? (
        billing.inWindow ? (
          <ErpBanner
            variant="success"
            icon="wallet"
            title="The withdrawal window is open"
            actions={
              <Link to="/tutor/wallet" className="erp-btn-primary erp-btn-sm">
                Withdraw
              </Link>
            }
          >
            {show(summary?.withdrawable)} is ready. The window closes after day {billing.endDay} of the month.
          </ErpBanner>
        ) : (
          <ErpBanner variant="neutral" icon="clock">
            Withdrawals open on days {billing.startDay}–{billing.endDay} of each month
            {billing.nextWindowStart
              ? ` (next: ${new Date(billing.nextWindowStart).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                })})`
              : ''}
            . Lesson payouts stay locked until then.
          </ErpBanner>
        )
      ) : null}

      <div className="erp-kpis">
        <ErpStat
          label="This month"
          value={show(summary?.thisMonth)}
          hint={summary?.thisMonthGross != null ? `Gross ${money(summary.thisMonthGross, cur)}` : undefined}
          icon="trending-up"
          tone="success"
        />
        <ErpStat
          label="Lifetime share"
          value={show(summary?.lifetime)}
          hint={summary?.lifetimeGross != null ? `Gross ${money(summary.lifetimeGross, cur)}` : undefined}
          icon="award"
        />
        <ErpStat
          label="Pending share"
          value={show(summary?.pendingPayout)}
          hint="Classes not yet settled"
          icon="clock"
          tone="warning"
        />
        <ErpStat
          label="Withdrawable"
          value={show(summary?.withdrawable)}
          hint={summary?.locked ? `${money(summary.locked, cur)} locked` : 'Available at month end'}
          icon="wallet"
          tone="info"
        />
      </div>

      <div className="earnings-split">
        <ErpCard heading="Monthly share" description="What you earned each month, after the platform fee">
          {!series.length ? (
            <ErpEmptyState icon="bar-chart" title="No paid months yet" />
          ) : (
            <div className="erp-bars" role="img" aria-label="Monthly tutor share">
              {series.map((m, i) => (
                <div key={m.month} className="erp-bar" title={`${m.month}: ${money(m.amount, cur)}`}>
                  <span className="tutor-bar-value">{money(m.amount, cur)}</span>
                  <span
                    className={`erp-bar-fill${i === series.length - 1 ? '' : ' erp-bar-fill-muted'}`}
                    style={{ height: `${Math.max(2, (m.amount / maxBar) * 100)}%` }}
                  />
                  <span>{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          )}
        </ErpCard>

        <ErpCard heading="By subject" description="Where your share comes from">
          {!summary?.bySubject?.length ? (
            <ErpEmptyState icon="book-open" title="No subject breakdown yet" />
          ) : (
            <ul className="tutor-plain-list stack" style={{ gap: '0.875rem' }}>
              {summary.bySubject.map((s) => (
                <li key={s.subject}>
                  <div className="tutor-file-row" style={{ padding: 0 }}>
                    <span className="text-erp-sm">{s.subject}</span>
                    <strong className="num text-erp-sm">{money(s.amount, cur)}</strong>
                  </div>
                  <div className="tutor-hbar">
                    <span style={{ width: `${Math.round(((Number(s.amount) || 0) / subjectTotal) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ErpCard>
      </div>

      <ErpCard
        flush
        heading="Payments"
        description="Confirmed lesson payments and your share of each"
        headerActions={
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search payments" />
        }
      >
        {loading && !items.length ? (
          <ErpLoadingState message="Loading earnings…" />
        ) : !items.length ? (
          <ErpEmptyState
            icon="receipt"
            title="No confirmed earnings yet"
            description="Payments appear here once students pay for classes."
          />
        ) : list.noMatch ? (
          <ErpEmptyState icon="search" title="No payments match that search" />
        ) : phone ? (
          <ul className="tutor-booking-cards">
            {list.items.map((p) => (
              <li key={p._id} className="tutor-booking-card">
                <span className="tutor-booking-card-main">
                  <span className="tutor-booking-card-top">
                    <strong>{p.description || 'Payment'}</strong>
                    <strong className="num">{money(tutorShareOf(p, rate), p.currency)}</strong>
                  </span>
                  <span className="tutor-chips text-erp-sm">
                    <span className="muted">{localTime(p.paidAt || p.createdAt)}</span>
                    <ErpStatusBadge status={p.status}>{p.status}</ErpStatusBadge>
                  </span>
                  <span className="muted text-erp-xs">Invoice {money(p.amount, p.currency)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th className="num">Invoice</th>
                  <th className="num">Your share</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p._id}>
                    <td className="erp-tabular">{localTime(p.paidAt || p.createdAt)}</td>
                    <td>{p.description || '—'}</td>
                    <td>
                      <ErpStatusBadge status={p.status} dot>
                        {p.status}
                      </ErpStatusBadge>
                    </td>
                    <td className="num muted">{money(p.amount, p.currency)}</td>
                    <td className="num">
                      <strong>{money(tutorShareOf(p, rate), p.currency)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {total > 0 && (
          <ErpPager
            page={page}
            pages={pages}
            total={total}
            noun="payment"
            onPrev={() => setPage((x) => Math.max(1, x - 1))}
            onNext={() => setPage((x) => Math.min(pages, x + 1))}
          />
        )}
      </ErpCard>
    </div>
  );
}
