import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getMyWallet,
  listPayable,
  listPlans,
  payInvoice,
  paymentHistory,
  requestRefund,
  respondRefund,
  subscribePlan,
} from '../../api';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { childLabel, useParentChild } from '../../context/ParentChildContext';
import { formatDate, money } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { titleCase } from '../admin/adminOptions';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpEmptyState,
  ErpLoadingState,
  ErpModal,
  ErpPageHeader,
  ErpPager,
  ErpSearch,
  ErpSelect,
  ErpStat,
  ErpStatusBadge,
  ErpTabs,
  ErpTextarea,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { RowIcon, StatusTrack } from './sharedUi';
import { dateOnly } from './sharedTime';
import './shared.css';

const PAGE_SIZE = 10;
const OPEN_REFUND = ['requested', 'accepted', 'disputed'];
const REFUND_REASONS = [
  { value: 'tutor_no_show', label: 'Tutor did not show up' },
  { value: 'doorstep_mismatch', label: 'Doorstep check-in mismatch' },
  { value: 'quality', label: 'Quality issue' },
  { value: 'cancelled_in_time', label: 'Cancelled in time' },
  { value: 'other', label: 'Other' },
];

const idOf = (v) => String(v?._id ?? v?.id ?? v ?? '');
const pages = (total) => Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

function sumByCurrency(items) {
  const totals = {};
  items.forEach((p) => {
    const cur = p.currency || '';
    const t = totals[cur] || { amount: 0, count: 0 };
    t.amount += Number(p.amount) || 0;
    t.count += 1;
    totals[cur] = t;
  });
  return totals;
}

const statusLabel = (s) => (s === 'awaiting_confirmation' ? 'Awaiting confirmation' : titleCase(s));

export default function PaymentsPage({ showPlans = true }) {
  const phone = useIsPhone();
  const location = useLocation();
  const { user } = useAuth();
  const { byGroup, options, labelFor } = useCatalog();
  const parentCtx = useParentChild();
  const me = String(user?.id ?? user?._id ?? '');
  const isTutor = user?.role === 'tutor' || location.pathname.startsWith('/tutor');
  const isParent = user?.role === 'parent';
  const canRefund = user?.role === 'student' || user?.role === 'parent';
  const plansVisible = showPlans && !isParent;
  const walletPath = location.pathname.replace(/\/payments\/?$/, '/wallet');
  const supportPath = location.pathname.replace(/\/payments\/?$/, '/support');

  const [tab, setTab] = useState(isTutor && plansVisible ? 'plans' : 'due');
  const [payable, setPayable] = useState({ items: [], total: 0 });
  const [duePage, setDuePage] = useState(1);
  const [history, setHistory] = useState({ items: [], total: 0 });
  const [histPage, setHistPage] = useState(1);
  const [refunds, setRefunds] = useState([]);
  const [summary, setSummary] = useState({ count: 0, due: {}, ready: false });
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState(location.state?.msg || '');
  const [loading, setLoading] = useState({ due: true, history: true, refunds: false });
  const [search, setSearch] = useState('');
  const [childFilter, setChildFilter] = useState('all');

  const [payTarget, setPayTarget] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundForm, setRefundForm] = useState({ reason: '', note: '' });
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [disputeTarget, setDisputeTarget] = useState(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [subscribingId, setSubscribingId] = useState('');

  // A "Pay" link from another page passes the invoice id: open its pay dialog once it is listed.
  const pendingPayId = useRef(location.state?.paymentId || null);
  useEffect(() => {
    if (!pendingPayId.current) return;
    const hit = payable.items.find((p) => String(p._id) === String(pendingPayId.current));
    if (hit) {
      pendingPayId.current = null;
      setTab('due');
      setPayTarget(hit);
    }
  }, [payable.items]);

  const refundReasons = byGroup?.refund_reason?.length ? options('refund_reason') : REFUND_REASONS;
  const reasonLabel = (v) =>
    REFUND_REASONS.find((o) => o.value === v)?.label || labelFor('refund_reason', v) || titleCase(v);

  const startAction = () => {
    setMsg('');
    setError('');
  };

  const setLoad = (key, value) => setLoading((l) => ({ ...l, [key]: value }));

  const loadWallet = useCallback(async () => {
    try {
      const w = await getMyWallet();
      setWallet(w?.wallet || null);
    } catch {
      setWallet(null);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const r = await listPayable({ page: 1, limit: 200 });
      const items = r?.items || [];
      const due = items.filter(
        (p) => ['pending', 'failed'].includes(p.status) && p.bookingId?.status !== 'cancelled'
      );
      setSummary({ count: r?.total ?? items.length, due: sumByCurrency(due), ready: true });
    } catch {
      /* summary is best-effort; list errors are surfaced separately */
    }
  }, []);

  const loadDue = useCallback(async () => {
    setLoad('due', true);
    try {
      const r = await listPayable({ page: duePage, limit: PAGE_SIZE });
      setPayable({ items: r?.items || [], total: r?.total ?? 0 });
    } catch (err) {
      setError(errorMessage(err, 'Could not load invoices'));
    } finally {
      setLoad('due', false);
    }
  }, [duePage]);

  const loadHistory = useCallback(async () => {
    setLoad('history', true);
    try {
      const r = await paymentHistory({ page: histPage, limit: PAGE_SIZE });
      setHistory({ items: r?.items || [], total: r?.total ?? 0 });
    } catch (err) {
      setError(errorMessage(err, 'Could not load payment history'));
    } finally {
      setLoad('history', false);
    }
  }, [histPage]);

  const loadRefunds = useCallback(async () => {
    setLoad('refunds', true);
    try {
      const r = await paymentHistory({ page: 1, limit: 200 });
      setRefunds((r?.items || []).filter((p) => p.refundRequest?.status));
    } catch (err) {
      setError(errorMessage(err, 'Could not load refunds'));
    } finally {
      setLoad('refunds', false);
    }
  }, []);

  useEffect(() => {
    loadDue();
  }, [loadDue]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (tab === 'refunds') loadRefunds();
  }, [tab, loadRefunds]);

  useEffect(() => {
    loadSummary();
    loadWallet();
  }, [loadSummary, loadWallet]);

  useEffect(() => {
    if (!plansVisible) return;
    listPlans()
      .then((pl) => setPlans(Array.isArray(pl) ? pl : pl?.items || []))
      .catch((err) => setError(errorMessage(err, 'Could not load plans')));
  }, [plansVisible]);

  const refreshAll = () => {
    loadDue();
    loadHistory();
    loadSummary();
    loadWallet();
    if (tab === 'refunds') loadRefunds();
  };

  const payerId = (p) => idOf(p.payerUserId);
  const beneficiaryId = (p) => idOf(p.beneficiaryUserId);
  const childName = (p) => (isParent && payerId(p) && payerId(p) !== me ? p.payerUserId?.name || 'Child' : '');

  const matchesChild = (p) => {
    if (!isParent || childFilter === 'all') return true;
    return payerId(p) === childFilter || idOf(p.bookingId?.studentUserId) === childFilter;
  };
  const matchesSearch = (p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.description, p.status, p.payerUserId?.name, p.currency]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  };
  const visible = (items) => items.filter((p) => matchesChild(p) && matchesSearch(p));

  const dueItems = visible(payable.items);
  const histItems = visible(history.items);
  const refundItems = refunds
    .filter(matchesChild)
    .filter((p) => !isTutor || beneficiaryId(p) === me);

  const dueEntries = Object.entries(summary.due).filter(([, v]) => v.amount > 0);
  const openInvoices = summary.count || payable.total;

  const confirmPay = async (method) => {
    const p = payTarget;
    if (!p) return;
    startAction();
    setBusyId(p._id);
    try {
      await payInvoice(p._id, method);
      setMsg(method === 'wallet' ? 'Paid from wallet' : 'Submitted — waiting for admin confirmation');
      setPayTarget(null);
      refreshAll();
    } catch (err) {
      setError(errorMessage(err, 'Payment failed'));
      setPayTarget(null);
    } finally {
      setBusyId('');
    }
  };

  const walletBlock = (p) => {
    if (!p) return '';
    if (!wallet) return 'Wallet unavailable';
    if (wallet.currency && p.currency && wallet.currency !== p.currency) {
      return `Your wallet is in ${wallet.currency}; this invoice is in ${p.currency}.`;
    }
    if ((Number(wallet.balance) || 0) < (Number(p.amount) || 0)) return 'Not enough wallet balance.';
    return '';
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    startAction();
    setBusyId(refundTarget._id);
    try {
      await requestRefund(refundTarget._id, {
        reason: refundForm.reason || refundReasons[0]?.value || 'other',
        note: refundForm.note.trim(),
      });
      setMsg('Refund requested — the tutor and admin will review it');
      setRefundTarget(null);
      refreshAll();
      loadRefunds();
    } catch (err) {
      setError(errorMessage(err, 'Could not request refund'));
    } finally {
      setBusyId('');
    }
  };

  const respond = async (p, accept, note = '') => {
    startAction();
    setBusyId(p._id);
    try {
      await respondRefund(p._id, { accept, note });
      setMsg(accept ? 'Refund accepted — admin will complete it' : 'Refund disputed — admin will review');
      setAcceptTarget(null);
      setDisputeTarget(null);
      setDisputeNote('');
      loadRefunds();
      loadHistory();
    } catch (err) {
      setError(errorMessage(err, 'Could not respond to refund'));
    } finally {
      setBusyId('');
    }
  };

  const roleLabel = (p) => {
    if (!isTutor) return null;
    if (payerId(p) === me) return <ErpBadge>You paid</ErpBadge>;
    if (beneficiaryId(p) === me) return <ErpBadge tone="success">Earning</ErpBadge>;
    return null;
  };

  const historyHint = (p) => {
    if (p.status === 'cancelled') return p.bookingId ? 'Voided (class cancelled)' : 'Voided';
    if (p.status === 'refunded') return 'Refunded';
    return '';
  };

  const canRequestRefund = (p) =>
    canRefund && p.status === 'paid' && !OPEN_REFUND.includes(p.refundRequest?.status);

  const openRefund = (p) => {
    startAction();
    setRefundForm({ reason: refundReasons[0]?.value || 'other', note: '' });
    setRefundTarget(p);
  };

  const refundTrack = (p) => {
    const rr = p.refundRequest || {};
    const responded = rr.status === 'accepted' || rr.status === 'disputed' || p.status === 'refunded';
    return [
      { key: 'req', label: 'Requested', state: 'done' },
      {
        key: 'resp',
        label: rr.status === 'disputed' ? 'Disputed' : rr.status === 'accepted' ? 'Tutor accepted' : 'Tutor review',
        state: rr.status === 'disputed' ? 'danger' : responded ? 'done' : 'current',
      },
      {
        key: 'done',
        label: p.status === 'refunded' ? 'Refunded' : 'Admin completes',
        state: p.status === 'refunded' ? 'done' : responded ? 'current' : 'todo',
      },
    ];
  };

  const tabs = [
    { value: 'due', label: 'Pay now', count: openInvoices || null },
    ...(plansVisible ? [{ value: 'plans', label: isTutor ? 'Premium plans' : 'Plans' }] : []),
    { value: 'history', label: 'History', count: history.total || null },
    { value: 'refunds', label: 'Refunds' },
  ];

  const childOptions =
    isParent && parentCtx.children.length > 0
      ? [
          { value: 'all', label: 'All children' },
          ...parentCtx.children.map((link) => ({
            value: idOf(link.studentUserId),
            label: childLabel(link),
          })),
        ]
      : null;

  const showFilters = tab === 'due' || tab === 'history' || (tab === 'refunds' && childOptions);

  const chips = (p) => (
    <>
      {childName(p) ? (
        <ErpBadge tone="brand" icon="user">
          {childName(p)}
        </ErpBadge>
      ) : null}
      {roleLabel(p)}
    </>
  );

  const invoiceAction = (p) => {
    const cancelled = p.bookingId?.status === 'cancelled';
    const busy = busyId === p._id;
    if (cancelled) return <span className="sp-quiet">Class cancelled — nothing to pay</span>;
    if (p.status === 'pending' || p.status === 'failed') {
      return (
        <ErpButton
          loading={busy}
          block={phone}
          onClick={() => {
            startAction();
            setPayTarget(p);
          }}
        >
          {busy ? 'Paying…' : 'Pay now'}
        </ErpButton>
      );
    }
    return (
      <span className="sp-quiet">
        <Icon name="clock" size={14} /> With admin for confirmation
      </span>
    );
  };

  const renderDue = () => {
    if (loading.due) return <ErpLoadingState message="Loading invoices…" />;
    if (!payable.items.length) {
      return (
        <ErpEmptyState
          icon="check-circle"
          title="You're all paid up"
          description="New class and plan invoices will appear here when they are issued."
          action={
            <ErpButton variant="secondary" icon="receipt" onClick={() => setTab('history')}>
              View history
            </ErpButton>
          }
        />
      );
    }
    if (!dueItems.length) {
      return (
        <ErpEmptyState
          icon="search"
          title="No matching invoices"
          description="Nothing on this page matches the current filter."
        />
      );
    }
    return (
      <ul className="sp-rows">
        {dueItems.map((p) => {
          const cancelled = p.bookingId?.status === 'cancelled';
          const payableNow = !cancelled && (p.status === 'pending' || p.status === 'failed');
          return (
            <li key={p._id} className={`sp-invoice${cancelled ? ' is-muted' : ''}`}>
              <RowIcon
                name={p.bookingId ? 'calendar' : 'receipt'}
                tone={p.status === 'failed' ? 'danger' : payableNow ? 'brand' : 'neutral'}
              />
              <div className="sp-invoice-main">
                <div className="sp-invoice-title">{p.description || 'Invoice'}</div>
                <div className="sp-meta">
                  {p.bookingId?.startAt ? (
                    <span>
                      <Icon name="calendar" size={13} /> Class {formatDate(p.bookingId.startAt)}
                    </span>
                  ) : null}
                  <span>Issued {dateOnly(p.createdAt)}</span>
                </div>
                <div className="sp-chips">
                  <ErpStatusBadge status={p.status} dot>
                    {statusLabel(p.status)}
                  </ErpStatusBadge>
                  {chips(p)}
                </div>
              </div>
              <div className="sp-invoice-amount num">{money(p.amount, p.currency)}</div>
              <div className="sp-invoice-action">{invoiceAction(p)}</div>
            </li>
          );
        })}
      </ul>
    );
  };

  const historyStatus = (p) => (
    <div className="sp-chips">
      <ErpStatusBadge status={p.status} dot>
        {statusLabel(p.status)}
      </ErpStatusBadge>
      {p.refundRequest?.status ? (
        <ErpStatusBadge status={p.refundRequest.status}>Refund {p.refundRequest.status}</ErpStatusBadge>
      ) : null}
    </div>
  );

  const refundButton = (p) =>
    canRequestRefund(p) ? (
      <ErpButton variant="ghost" size="sm" icon="refresh" disabled={busyId === p._id} onClick={() => openRefund(p)}>
        Request refund
      </ErpButton>
    ) : null;

  const renderHistory = () => {
    if (loading.history) return <ErpLoadingState message="Loading history…" />;
    if (!history.items.length) {
      return (
        <ErpEmptyState
          icon="receipt"
          title="No payments yet"
          description="Paid, voided and refunded invoices are listed here."
        />
      );
    }
    if (!histItems.length) {
      return (
        <ErpEmptyState icon="search" title="No matching payments" description="Try a different search." />
      );
    }
    if (phone) {
      return (
        <ul className="sp-rows">
          {histItems.map((p) => (
            <li key={p._id} className="sp-invoice">
              <div className="sp-invoice-main">
                <div className="sp-invoice-title">{p.description || 'Payment'}</div>
                <div className="sp-meta">
                  <span>{formatDate(p.createdAt)}</span>
                  {historyHint(p) ? <span>{historyHint(p)}</span> : null}
                </div>
                <div className="sp-chips">
                  {historyStatus(p)}
                  {chips(p)}
                </div>
              </div>
              <div className="sp-invoice-amount num">{money(p.amount, p.currency)}</div>
              {canRequestRefund(p) ? <div className="sp-invoice-action">{refundButton(p)}</div> : null}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="sp-table-wrap">
        <ErpDataTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Status</th>
              <th className="num">Amount</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {histItems.map((p) => (
              <tr key={p._id}>
                <td className="sp-nowrap">{dateOnly(p.createdAt)}</td>
                <td>
                  <strong>{p.description || 'Payment'}</strong>
                  {childName(p) || roleLabel(p) || historyHint(p) || p.bookingId?.startAt ? (
                    <div className="sp-meta">
                      {p.bookingId?.startAt ? <span>Class {formatDate(p.bookingId.startAt)}</span> : null}
                      {historyHint(p) ? <span>{historyHint(p)}</span> : null}
                      {chips(p)}
                    </div>
                  ) : null}
                </td>
                <td>{historyStatus(p)}</td>
                <td className="num">
                  <strong>{money(p.amount, p.currency)}</strong>
                </td>
                <td className="sp-cell-actions">{refundButton(p)}</td>
              </tr>
            ))}
          </tbody>
        </ErpDataTable>
      </div>
    );
  };

  const renderRefunds = () => {
    if (loading.refunds) return <ErpLoadingState message="Loading refunds…" />;
    if (!refundItems.length) {
      return (
        <ErpEmptyState
          icon="refresh"
          title="No refund requests"
          description={
            isTutor
              ? 'Refund requests on classes you were paid for will appear here.'
              : 'Need a refund? Open History and choose “Request refund” on a paid invoice.'
          }
          action={
            !isTutor ? (
              <ErpButton variant="secondary" icon="receipt" onClick={() => setTab('history')}>
                Go to history
              </ErpButton>
            ) : null
          }
        />
      );
    }
    return (
      <ul className="sp-rows">
        {refundItems.map((p) => {
          const rr = p.refundRequest || {};
          const busy = busyId === p._id;
          const canRespond = isTutor && rr.status === 'requested' && beneficiaryId(p) === me;
          return (
            <li key={p._id} className="sp-refund">
              <div className="sp-refund-head">
                <div className="sp-invoice-main">
                  <div className="sp-invoice-title">{p.description || 'Payment'}</div>
                  <div className="sp-meta">
                    {rr.requestedAt ? <span>Requested {formatDate(rr.requestedAt)}</span> : null}
                    {isTutor && p.payerUserId?.name ? <span>by {p.payerUserId.name}</span> : null}
                  </div>
                </div>
                <div className="sp-refund-amount">
                  <span className="num">{money(p.amount, p.currency)}</span>
                  <ErpStatusBadge status={rr.status} dot>
                    {titleCase(rr.status)}
                  </ErpStatusBadge>
                </div>
              </div>
              <StatusTrack steps={refundTrack(p)} />
              <dl className="sp-kv">
                <div>
                  <dt>Reason</dt>
                  <dd>
                    {reasonLabel(rr.reason)}
                    {rr.note ? <span className="sp-quote">“{rr.note}”</span> : null}
                  </dd>
                </div>
                {rr.tutorNote ? (
                  <div>
                    <dt>Tutor note</dt>
                    <dd>{rr.tutorNote}</dd>
                  </div>
                ) : null}
              </dl>
              {childName(p) ? <div className="sp-chips">{chips(p)}</div> : null}
              {canRespond ? (
                <div className="sp-refund-actions">
                  <ErpButton
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      startAction();
                      setDisputeNote('');
                      setDisputeTarget(p);
                    }}
                  >
                    Dispute
                  </ErpButton>
                  <ErpButton
                    icon="check"
                    disabled={busy}
                    onClick={() => {
                      startAction();
                      setAcceptTarget(p);
                    }}
                  >
                    Accept refund
                  </ErpButton>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  const payBlocked = payTarget ? walletBlock(payTarget) : '';

  return (
    <div className="page sp-page">
      <ErpPageHeader
        subtitle={
          isTutor
            ? 'Premium plan invoices, earnings and refund requests on your classes.'
            : 'Pay class and plan invoices, see your history and request refunds.'
        }
        actions={
          <Link to={walletPath} className="erp-btn-secondary">
            <Icon name="wallet" size={16} />
            Open wallet
          </Link>
        }
      />
      {error ? (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      ) : null}
      {msg ? (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      ) : null}

      <div className="sp-stats">
        {dueEntries.length ? (
          dueEntries.slice(0, 2).map(([cur, v]) => (
            <ErpStat
              key={cur || 'none'}
              label={cur ? `Due now · ${cur}` : 'Due now'}
              value={money(v.amount, cur || undefined)}
              hint={`${v.count} invoice${v.count === 1 ? '' : 's'} to pay`}
              icon="receipt"
              tone="warning"
            />
          ))
        ) : (
          <ErpStat
            label="Due now"
            value={summary.ready ? 'None' : '—'}
            hint={summary.ready ? 'All invoices are settled' : 'Checking invoices…'}
            icon="check-circle"
            tone="success"
          />
        )}
        <ErpStat
          label="Open invoices"
          value={openInvoices}
          hint="Including ones awaiting confirmation"
          icon="file-text"
          tone="neutral"
        />
        <ErpStat
          label="Wallet balance"
          value={wallet ? money(wallet.balance || 0, wallet.currency) : '—'}
          hint={isTutor ? 'Earnings and credits' : 'Use it to pay invoices instantly'}
          icon="wallet"
          to={walletPath}
        />
      </div>

      <ErpCard flush className="sp-panel">
        <div className="sp-panel-tabs">
          <ErpTabs value={tab} onChange={setTab} tabs={tabs} />
        </div>
        {showFilters ? (
          <div className="sp-panel-filters">
            {tab !== 'refunds' ? (
              <ErpSearch value={search} onChange={setSearch} placeholder="Filter this page" />
            ) : null}
            {childOptions ? (
              <ErpSelect
                inline
                value={childFilter}
                options={childOptions}
                leading={<Icon name="users" size={15} />}
                onChange={(e) => {
                  setChildFilter(e.target.value);
                  if (e.target.value !== 'all') parentCtx.setSelectedChildId(e.target.value);
                }}
              />
            ) : null}
          </div>
        ) : null}

        {tab === 'due' && (
          <>
            {renderDue()}
            {payable.total > PAGE_SIZE && (
              <ErpPager
                page={duePage}
                pages={pages(payable.total)}
                total={payable.total}
                noun="invoice"
                onPrev={() => setDuePage((n) => Math.max(1, n - 1))}
                onNext={() => setDuePage((n) => Math.min(pages(payable.total), n + 1))}
              />
            )}
          </>
        )}

        {tab === 'plans' && plansVisible && (
          <div className="sp-panel-body">
            <div className="sp-section-intro">
              <h3>{isTutor ? 'Rank higher in student search' : 'Subscription plans'}</h3>
              <p>
                {isTutor
                  ? 'Premium tutors appear first, with a Premium badge. Subscribing creates an invoice — pay it from Pay now.'
                  : 'Subscribing creates an invoice that you pay from Pay now.'}
              </p>
            </div>
            {!plans.length ? (
              <ErpEmptyState icon="sparkles" title="No plans available" description="Check back later." />
            ) : (
              <div className="sp-plan-grid">
                {plans.map((plan) => (
                  <div key={plan._id} className="sp-plan">
                    <div className="sp-plan-head">
                      <h4>{plan.name}</h4>
                      {plan.rankBoost > 0 ? (
                        <ErpBadge tone="brand" icon="trending-up">
                          Rank +{plan.rankBoost}
                        </ErpBadge>
                      ) : null}
                    </div>
                    <div className="sp-plan-price">
                      <span className="num">{money(plan.price, plan.currency)}</span>
                      <span className="sp-quiet">
                        {titleCase(plan.planKind || plan.billingCycle)}
                        {plan.classCount ? ` · ${plan.classCount} classes` : ''}
                      </span>
                    </div>
                    {plan.description ? <p className="sp-plan-desc">{plan.description}</p> : null}
                    <ErpButton
                      variant="secondary"
                      block
                      loading={subscribingId === plan._id}
                      onClick={async () => {
                        startAction();
                        setSubscribingId(plan._id);
                        try {
                          await subscribePlan(plan._id);
                          setMsg('Plan invoice created — pay it from the Pay now tab');
                          refreshAll();
                        } catch (err) {
                          setError(errorMessage(err, 'Could not subscribe'));
                        } finally {
                          setSubscribingId('');
                        }
                      }}
                    >
                      {subscribingId === plan._id ? 'Subscribing…' : 'Subscribe'}
                    </ErpButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <>
            {renderHistory()}
            {history.total > PAGE_SIZE && (
              <ErpPager
                page={histPage}
                pages={pages(history.total)}
                total={history.total}
                noun="payment"
                onPrev={() => setHistPage((n) => Math.max(1, n - 1))}
                onNext={() => setHistPage((n) => Math.min(pages(history.total), n + 1))}
              />
            )}
          </>
        )}

        {tab === 'refunds' && (
          <>
            <p className="sp-panel-note">
              <Icon name="info" size={14} />
              {isTutor
                ? 'Refund requests on classes you were paid for. Accept or dispute — admin completes the refund.'
                : 'Request a refund from a paid invoice in History. The tutor responds and admin completes the refund.'}
            </p>
            {renderRefunds()}
          </>
        )}
      </ErpCard>

      <ErpModal
        open={Boolean(payTarget)}
        title="Pay invoice"
        onClose={() => !busyId && setPayTarget(null)}
        footer={
          payTarget && (
            <>
              <ErpButton variant="ghost" disabled={Boolean(busyId)} onClick={() => setPayTarget(null)}>
                Cancel
              </ErpButton>
              <ErpButton
                variant="secondary"
                disabled={Boolean(busyId)}
                onClick={() => confirmPay('manual')}
              >
                {busyId ? 'Working…' : 'Submit for confirmation'}
              </ErpButton>
              <ErpButton
                icon="wallet"
                disabled={Boolean(busyId) || Boolean(payBlocked)}
                onClick={() => confirmPay('wallet')}
              >
                Pay from wallet
              </ErpButton>
            </>
          )
        }
      >
        {payTarget && (
          <div className="stack">
            <div className="sp-pay-summary">
              <span className="sp-pay-label">Amount due</span>
              <span className="sp-pay-amount num">{money(payTarget.amount, payTarget.currency)}</span>
              <span className="sp-pay-desc">{payTarget.description || 'Invoice'}</span>
            </div>
            <dl className="sp-kv sp-kv-rows">
              {payTarget.bookingId?.startAt ? (
                <div>
                  <dt>Class</dt>
                  <dd>{formatDate(payTarget.bookingId.startAt)}</dd>
                </div>
              ) : null}
              {childName(payTarget) ? (
                <div>
                  <dt>For</dt>
                  <dd>{childName(payTarget)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Issued</dt>
                <dd>{formatDate(payTarget.createdAt)}</dd>
              </div>
              <div>
                <dt>Wallet balance</dt>
                <dd className="num">{wallet ? money(wallet.balance || 0, wallet.currency) : '—'}</dd>
              </div>
            </dl>
            {payBlocked ? (
              <ErpBanner variant="warning" title="Pay from wallet unavailable">
                {payBlocked}
              </ErpBanner>
            ) : null}
            <p className="sp-quiet" style={{ margin: 0 }}>
              Paid another way? Submit for confirmation — the invoice is marked paid once admin confirms
              your payment.
            </p>
          </div>
        )}
      </ErpModal>

      <ErpModal
        open={Boolean(refundTarget)}
        title="Request refund"
        onClose={() => !busyId && setRefundTarget(null)}
        footer={
          <>
            <ErpButton variant="secondary" disabled={Boolean(busyId)} onClick={() => setRefundTarget(null)}>
              Cancel
            </ErpButton>
            <ErpButton disabled={Boolean(busyId) || !refundForm.reason} onClick={submitRefund}>
              {busyId ? 'Sending…' : 'Submit request'}
            </ErpButton>
          </>
        }
      >
        {refundTarget && (
          <div className="stack">
            <div className="sp-pay-summary is-compact">
              <span className="sp-pay-desc">{refundTarget.description || 'Payment'}</span>
              <span className="sp-pay-amount num">{money(refundTarget.amount, refundTarget.currency)}</span>
            </div>
            <ErpSelect
              label="Reason"
              value={refundForm.reason}
              options={refundReasons}
              onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))}
            />
            <ErpTextarea
              label="Note"
              optional
              rows={3}
              value={refundForm.note}
              onChange={(e) => setRefundForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="What happened?"
              helper="The tutor responds first, then admin completes the refund."
            />
            <p className="sp-quiet" style={{ margin: 0 }}>
              Need help? <Link to={supportPath}>Contact support</Link>.
            </p>
          </div>
        )}
      </ErpModal>

      <ErpConfirm
        open={Boolean(acceptTarget)}
        title="Accept refund"
        message={
          acceptTarget
            ? `Accept the refund of ${money(acceptTarget.amount, acceptTarget.currency)} for "${
                acceptTarget.description || 'this payment'
              }"? Admin will complete it and your earning will be reversed.`
            : ''
        }
        confirmLabel="Accept refund"
        busy={Boolean(busyId)}
        onConfirm={() => acceptTarget && respond(acceptTarget, true)}
        onCancel={() => !busyId && setAcceptTarget(null)}
      />

      <ErpModal
        open={Boolean(disputeTarget)}
        title="Dispute refund"
        onClose={() => !busyId && setDisputeTarget(null)}
        footer={
          <>
            <ErpButton variant="secondary" disabled={Boolean(busyId)} onClick={() => setDisputeTarget(null)}>
              Cancel
            </ErpButton>
            <ErpButton
              variant="danger"
              disabled={Boolean(busyId) || !disputeNote.trim()}
              onClick={() => disputeTarget && respond(disputeTarget, false, disputeNote.trim())}
            >
              {busyId ? 'Sending…' : 'Dispute'}
            </ErpButton>
          </>
        }
      >
        <ErpTextarea
          label="Why are you disputing?"
          rows={3}
          value={disputeNote}
          helper="Required. Admin reads this before deciding."
          onChange={(e) => setDisputeNote(e.target.value)}
        />
      </ErpModal>
    </div>
  );
}
