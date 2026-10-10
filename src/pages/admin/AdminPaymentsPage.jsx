import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminGetPayment, adminPayments, adminSetPaymentStatus } from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpConfirm,
  ErpInput,
  ErpLoadingState,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpTabs,
} from '../../components/erp';
import { errorMessage } from '../../utils/errors';
import { formatDate, money } from '../../utils/format';
import {
  AdminCell,
  AdminKV,
  AdminListState,
  AdminRowActions,
  AdminSection,
  AdminStatus,
  AdminSummary,
  AdminTableCard,
  AdminToolbar,
} from './AdminKit';
import {
  PAYMENT_ACTION_LABELS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TRANSITIONS,
  REFUND_OPEN_STATUSES,
  personName,
  titleCase,
} from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

const PAGE_SIZE = 50;
const REFUND_TAB = 'refunds';
/** Footer order: neutral fixes first, the primary decision last (right-most). */
const ACTION_ORDER = ['pending', 'failed', 'refunded', 'paid'];
const TAB_VALUES = [...PAYMENT_STATUS_OPTIONS.map((o) => o.value).filter(Boolean), REFUND_TAB];

function personLabel(u) {
  if (!u) return '—';
  return [u.name, u.phone, u.refCode].filter(Boolean).join(' · ') || '—';
}

export default function AdminPaymentsPage() {
  const [params] = useSearchParams();
  const { editId, openEdit, close } = useAdminModalQuery();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(() => {
    const s = params.get('status') || '';
    return TAB_VALUES.includes(s) ? s : '';
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalError, setModalError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const q = { page, limit: PAGE_SIZE, search };
    if (tab === REFUND_TAB) q.refundStatus = 'open';
    else if (tab) q.status = tab;
    adminPayments(q)
      .then((data) => {
        if (cancelled) return;
        setItems(data?.items || []);
        setTotal(data?.total || 0);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, tab, search, reloadKey]);

  useEffect(() => {
    setModalError('');
    setConfirmRefund(false);
    if (!editId) {
      setSelected(null);
      return undefined;
    }
    const local = items.find((p) => p._id === editId);
    if (local) {
      setSelected(local);
      setNote(local.adminNote || '');
      return undefined;
    }
    let cancelled = false;
    adminGetPayment(editId)
      .then((p) => {
        if (cancelled) return;
        setSelected(p);
        setNote(p?.adminNote || '');
      })
      .catch((err) => !cancelled && setModalError(errorMessage(err, 'Payment not found')));
    return () => {
      cancelled = true;
    };
    // items intentionally excluded: only resolve when the deep link changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const reload = () => setReloadKey((k) => k + 1);

  const setPayStatus = async (next) => {
    if (!selected) return;
    setBusy(true);
    setModalError('');
    setMsg('');
    try {
      await adminSetPaymentStatus(selected._id, { status: next, adminNote: note });
      const who = selected.payerUserId?.name || 'payer';
      setMsg(`Payment from ${who} marked ${titleCase(next)}.`);
      setConfirmRefund(false);
      close();
      reload();
    } catch (err) {
      setConfirmRefund(false);
      setModalError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const actions = selected ? PAYMENT_TRANSITIONS[selected.status] || [] : [];
  const refund = selected?.refundRequest;
  const booking =
    selected?.bookingId && typeof selected.bookingId === 'object' ? selected.bookingId : null;

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Confirm manual payments, resolve refund requests, and correct failed charges." />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}

      <AdminTableCard
        tabs={
          <ErpTabs
            value={tab || 'all'}
            onChange={(value) => {
              setTab(value === 'all' ? '' : value);
              setPage(1);
            }}
            tabs={[
              ...PAYMENT_STATUS_OPTIONS.map((o) => ({
                value: o.value || 'all',
                label: o.value === '' ? 'All' : o.value === 'awaiting_confirmation' ? 'Awaiting' : o.label,
              })),
              { value: REFUND_TAB, label: 'Refund requests', icon: 'receipt' },
            ]}
          />
        }
        toolbar={
          <AdminToolbar
            right={
              <>
                {!loading ? (
                  <span className="adm-result-count">
                    {total} payment{total === 1 ? '' : 's'}
                  </span>
                ) : null}
                <ErpButton variant="ghost" size="sm" icon="refresh" onClick={reload}>
                  Refresh
                </ErpButton>
              </>
            }
          >
            <ErpSearch
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search payer name or phone"
            />
          </AdminToolbar>
        }
        footer={
          total > PAGE_SIZE ? (
            <ErpPager
              page={page}
              pages={pages}
              total={total}
              noun="payment"
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pages, p + 1))}
            />
          ) : null
        }
      >
        {loading || !items.length ? (
          <AdminListState
            loading={loading}
            empty
            emptyProps={{
              icon: search ? 'search' : 'credit-card',
              title: search ? 'No payments match that search' : 'No payments in this view',
              description: search
                ? 'Try a different name or phone number.'
                : tab
                  ? 'Nothing is waiting here right now.'
                  : 'Payments appear once students book or subscribe.',
            }}
          />
        ) : (
          <div className="erp-table-scroll">
            <table className="erp-data-table adm-table">
              <thead>
                <tr>
                  <th>Payer</th>
                  <th>Description</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="adm-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const refundOpen = REFUND_OPEN_STATUSES.includes(p.refundRequest?.status);
                  return (
                    <tr key={p._id} className="erp-row-click" onClick={() => openEdit(p._id)}>
                      <td className="adm-primary">
                        <AdminCell
                          avatarName={personName(p.payerUserId, 'Payer')}
                          title={personName(p.payerUserId)}
                          sub={
                            [
                              p.payerUserId?.role ? titleCase(p.payerUserId.role) : null,
                              p.beneficiaryUserId?.name ? `to ${p.beneficiaryUserId.name}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || null
                          }
                        />
                      </td>
                      <td data-label="Description" className="adm-hide-sm">
                        <AdminCell
                          title={p.description || 'Payment'}
                          sub={p.method ? titleCase(p.method) : null}
                        />
                      </td>
                      <td className="num" data-label="Amount">
                        <span className="adm-money">{money(p.amount, p.currency)}</span>
                      </td>
                      <td data-label="Status">
                        <span className="adm-cell-tags">
                          <AdminStatus status={p.status} />
                          {refundOpen ? (
                            <ErpBadge tone="danger" icon="receipt">
                              Refund {p.refundRequest.status}
                            </ErpBadge>
                          ) : null}
                        </span>
                      </td>
                      <td data-label="Date" className="adm-nowrap muted">
                        {formatDate(p.createdAt)}
                      </td>
                      <AdminRowActions>
                        <ErpButton
                          variant="ghost"
                          size="sm"
                          iconRight="chevron-right"
                          onClick={() => openEdit(p._id)}
                        >
                          {(PAYMENT_TRANSITIONS[p.status] || []).length ? 'Review' : 'View'}
                        </ErpButton>
                      </AdminRowActions>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableCard>

      <ErpModal
        open={Boolean(editId) && !confirmRefund}
        title="Payment"
        size="md"
        onClose={close}
        footer={
          selected ? (
            <>
              <ErpButton variant="secondary" onClick={close} disabled={busy}>
                Close
              </ErpButton>
              {[...actions]
                .sort((a, b) => ACTION_ORDER.indexOf(a) - ACTION_ORDER.indexOf(b))
                .map((next) => (
                <ErpButton
                  key={next}
                  variant={next === 'paid' ? 'primary' : 'secondary'}
                  disabled={busy}
                  onClick={() => (next === 'refunded' ? setConfirmRefund(true) : setPayStatus(next))}
                >
                  {busy ? 'Working…' : PAYMENT_ACTION_LABELS[next] || titleCase(next)}
                </ErpButton>
              ))}
            </>
          ) : null
        }
      >
        {modalError && <ErpBanner variant="danger">{modalError}</ErpBanner>}
        {!selected ? (
          !modalError && <ErpLoadingState message="Loading payment…" />
        ) : (
          <>
            <AdminSummary
              eyebrow={selected.description || 'Payment'}
              title={money(selected.amount, selected.currency)}
              meta={`${formatDate(selected.createdAt)}${
                selected.method ? ` · ${titleCase(selected.method)}` : ''
              }`}
              side={
                <>
                  <AdminStatus status={selected.status} />
                  {REFUND_OPEN_STATUSES.includes(refund?.status) ? (
                    <ErpBadge tone="danger" icon="receipt">
                      Refund {refund.status}
                    </ErpBadge>
                  ) : null}
                </>
              }
            />

            <AdminSection title="Parties">
              <AdminKV
                items={[
                  { label: 'Payer', value: personLabel(selected.payerUserId) },
                  {
                    label: 'Beneficiary',
                    value: selected.beneficiaryUserId
                      ? personLabel(selected.beneficiaryUserId)
                      : 'Platform',
                  },
                ]}
              />
            </AdminSection>

            {booking || selected.planId?.name ? (
              <AdminSection title="Linked to">
                <AdminKV
                  items={[
                    booking && {
                      label: 'Booking',
                      value: `${formatDate(booking.startAt)} · ${titleCase(booking.status)}`,
                    },
                    selected.planId?.name && { label: 'Plan', value: selected.planId.name },
                  ]}
                />
              </AdminSection>
            ) : null}

            {refund?.status ? (
              <AdminSection title="Refund request">
                <AdminKV
                  items={[
                    {
                      label: 'Status',
                      value: (
                        <>
                          {titleCase(refund.status)}
                          {refund.requestedAt ? (
                            <span className="muted"> · {formatDate(refund.requestedAt)}</span>
                          ) : null}
                        </>
                      ),
                    },
                    { label: 'Reason', value: refund.reason ? titleCase(refund.reason) : '—' },
                    refund.note && { label: 'Payer note', value: refund.note, full: true },
                    refund.tutorNote && { label: 'Tutor note', value: refund.tutorNote, full: true },
                  ]}
                />
              </AdminSection>
            ) : null}

            <AdminSection title="Admin">
              {selected.adminNote ? (
                <AdminKV items={[{ label: 'Current note', value: selected.adminNote, full: true }]} />
              ) : null}
              {actions.length ? (
                <div style={{ marginTop: selected.adminNote ? '0.875rem' : 0 }}>
                  <ErpInput
                    id="pay-admin-note"
                    label="Admin note"
                    optional
                    helper="Saved with the status change."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              ) : (
                <p className="muted" style={{ margin: selected.adminNote ? '0.75rem 0 0' : 0 }}>
                  This payment is final; no further status changes are allowed.
                </p>
              )}
            </AdminSection>
          </>
        )}
      </ErpModal>

      <ErpConfirm
        open={confirmRefund && Boolean(selected)}
        title="Refund payment"
        danger
        busy={busy}
        confirmLabel="Refund"
        message={
          selected
            ? `Refund ${money(selected.amount, selected.currency)} paid by ${personLabel(
                selected.payerUserId
              )}${
                selected.beneficiaryUserId ? ` to ${personLabel(selected.beneficiaryUserId)}` : ''
              }? The payout credited for this payment will be reversed.`
            : ''
        }
        onConfirm={() => setPayStatus('refunded')}
        onCancel={() => setConfirmRefund(false)}
      />
    </div>
  );
}
