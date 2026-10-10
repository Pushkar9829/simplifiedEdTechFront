import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  adminTopUp,
  adminUsers,
  adminWithdrawals,
  platformWallet,
  reviewWithdrawal,
} from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpInput,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpStat,
  ErpTabs,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { formatDate, money } from '../../utils/format';
import { titleCase } from './adminOptions';
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
import { useAdminModalQuery } from './useAdminModalQuery';

function userLabel(u) {
  if (!u) return '—';
  return [u.name, u.phone].filter(Boolean).join(' · ') || '—';
}

export default function AdminWalletsPage() {
  const [params] = useSearchParams();
  const { editId, openEdit, close } = useAdminModalQuery();
  const [tab, setTab] = useState(() =>
    ['overview', 'topup', 'withdrawals'].includes(params.get('tab')) ? params.get('tab') : 'overview'
  );
  const [wStatus, setWStatus] = useState(() =>
    ['pending', 'approved', 'rejected'].includes(params.get('status')) ? params.get('status') : ''
  );
  const [platform, setPlatform] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [target, setTarget] = useState(null);
  const [amount, setAmount] = useState('');
  const [confirmTopUp, setConfirmTopUp] = useState(false);
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpError, setTopUpError] = useState('');

  const [review, setReview] = useState('view');
  const [rejectNote, setRejectNote] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [p, w] = await Promise.all([platformWallet(), adminWithdrawals()]);
      setPlatform(p);
      setWithdrawals(Array.isArray(w) ? w : w?.items || []);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setReview('view');
    setRejectNote('');
    setReviewError('');
  }, [editId]);

  const visibleWithdrawals = useMemo(
    () => (wStatus ? withdrawals.filter((w) => w.status === wStatus) : withdrawals),
    [withdrawals, wStatus]
  );
  const list = useListFilter(
    visibleWithdrawals,
    (w) =>
      [w.tutorUserId?.name, w.tutorUserId?.phone, w.status, w.cycle, w.adminNote].filter(Boolean).join(' '),
    { resetKey: wStatus }
  );
  const selected = withdrawals.find((w) => w._id === editId) || null;

  const searchUsers = async () => {
    const q = userSearch.trim();
    if (!q) return;
    setSearchingUsers(true);
    setTopUpError('');
    try {
      const data = await adminUsers({ search: q, limit: 20 });
      setUserResults(data?.items || []);
    } catch (err) {
      setTopUpError(errorMessage(err));
    } finally {
      setSearchingUsers(false);
    }
  };

  const amountNum = Number(amount);
  const canCredit = Boolean(target) && Number.isFinite(amountNum) && amountNum > 0;

  const credit = async () => {
    setTopUpBusy(true);
    setTopUpError('');
    setMsg('');
    try {
      await adminTopUp({ userId: target._id, amount: amountNum });
      setMsg(`Credited ${amountNum.toFixed(2)} to ${userLabel(target)}.`);
      setConfirmTopUp(false);
      setAmount('');
      load();
    } catch (err) {
      setConfirmTopUp(false);
      setTopUpError(errorMessage(err));
    } finally {
      setTopUpBusy(false);
    }
  };

  const submitReview = async (status) => {
    if (!selected) return;
    if (status === 'rejected' && !rejectNote.trim()) {
      setReviewError('Enter a reason for rejecting this withdrawal.');
      return;
    }
    setReviewBusy(true);
    setReviewError('');
    try {
      await reviewWithdrawal(selected._id, {
        status,
        adminNote: status === 'rejected' ? rejectNote.trim() : '',
      });
      setMsg(status === 'approved' ? 'Withdrawal approved.' : 'Withdrawal rejected.');
      close();
      load();
    } catch (err) {
      setReview('view');
      setReviewError(errorMessage(err));
      load();
    } finally {
      setReviewBusy(false);
    }
  };

  const wallet = platform?.wallet;
  const txRows = Array.isArray(platform?.transactions)
    ? platform.transactions
    : platform?.transactions?.items || [];
  const walletCurrency = wallet?.currency || 'USD';
  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const credits = txRows.filter((t) => t.type !== 'debit').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const debits = txRows.filter((t) => t.type === 'debit').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Platform commission balance, manual wallet credits, and tutor payout requests." />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}

      <ErpTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Platform wallet', icon: 'wallet' },
          { value: 'withdrawals', label: 'Withdrawals', icon: 'arrow-right', count: pendingCount || null },
          { value: 'topup', label: 'Manual top-up', icon: 'plus' },
        ]}
      />

      {tab === 'overview' && (
        <>
          <div className="adm-kpis adm-kpis-3">
            <ErpStat
              label="Platform balance"
              icon="wallet"
              value={money(wallet?.balance || 0, walletCurrency)}
              hint="25% commission on paid sessions"
            />
            <ErpStat
              label="Recent credits"
              icon="trending-up"
              tone="success"
              value={money(credits, walletCurrency)}
              hint={`Across the last ${txRows.length} transactions`}
            />
            <ErpStat
              label="Pending withdrawals"
              icon="clock"
              tone={pendingCount ? 'warning' : 'neutral'}
              value={pendingCount}
              hint={debits ? `${money(debits, walletCurrency)} debited recently` : 'Tutor payout requests'}
            />
          </div>

          <AdminTableCard
            tabs={
              <div className="erp-card-header" style={{ margin: 0 }}>
                <div className="erp-card-header-text">
                  <h3 className="erp-card-title">Recent transactions</h3>
                  <p className="erp-card-description">Commission credits and platform debits</p>
                </div>
                <div className="erp-card-actions">
                  <ErpButton variant="ghost" size="sm" icon="refresh" onClick={load}>
                    Refresh
                  </ErpButton>
                </div>
              </div>
            }
          >
            {!platform && !error ? (
              <AdminListState loading />
            ) : !txRows.length ? (
              <AdminListState
                empty
                emptyProps={{
                  icon: 'receipt',
                  title: 'No transactions yet',
                  description: 'Commission is credited here when sessions are paid.',
                }}
              />
            ) : (
              <div className="erp-table-scroll">
                <table className="erp-data-table adm-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>When</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txRows.map((t) => (
                      <tr key={t._id}>
                        <td className="adm-primary">
                          <AdminCell title={t.description || titleCase(t.type)} />
                        </td>
                        <td data-label="Type">
                          <ErpBadge tone={t.type === 'debit' ? 'danger' : 'success'}>
                            {titleCase(t.type)}
                          </ErpBadge>
                        </td>
                        <td data-label="Reference" className="muted">
                          {t.refType ? titleCase(t.refType) : '—'}
                        </td>
                        <td data-label="When" className="muted adm-nowrap">
                          {formatDate(t.createdAt)}
                        </td>
                        <td className="num" data-label="Amount">
                          <span className={`adm-money ${t.type === 'debit' ? 'adm-debit' : 'adm-credit'}`}>
                            {t.type === 'debit' ? '−' : '+'}
                            {money(t.amount, walletCurrency)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminTableCard>
        </>
      )}

      {tab === 'topup' && (
        <div className="adm-overview-grid">
          <ErpCard
            heading="Credit a wallet"
            description="Add funds to any user's wallet, in that user's wallet currency."
          >
            {topUpError && (
              <div style={{ marginBottom: '1rem' }}>
                <ErpBanner variant="danger">{topUpError}</ErpBanner>
              </div>
            )}
            <div className="stack" style={{ gap: '1rem' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="erp-label" htmlFor="topup-user-search">
                  1. Find the user
                </label>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <ErpSearch
                    id="topup-user-search"
                    value={userSearch}
                    onChange={setUserSearch}
                    placeholder="Name or phone"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchUsers();
                      }
                    }}
                  />
                  <ErpButton
                    variant="secondary"
                    onClick={searchUsers}
                    loading={searchingUsers}
                    disabled={!userSearch.trim()}
                  >
                    Search
                  </ErpButton>
                </div>
              </div>
              {userResults.length ? (
                <div className="adm-pick-list" role="list">
                  {userResults.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      className="adm-pick"
                      aria-pressed={target?._id === u._id}
                      onClick={() => setTarget(u)}
                    >
                      <AdminCell
                        avatarName={u.name || u.phone || 'User'}
                        title={u.name || u.phone}
                        sub={[u.phone, titleCase(u.role)].filter(Boolean).join(' · ')}
                      />
                      {target?._id === u._id ? (
                        <span className="adm-pick-check">
                          <Icon name="check-circle" size={18} />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
              <ErpInput
                id="topup-amount"
                label="2. Amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                helper="Credited in the user's wallet currency."
              />
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <ErpButton
                  icon="plus"
                  onClick={() => setConfirmTopUp(true)}
                  disabled={!canCredit || topUpBusy}
                >
                  Credit wallet
                </ErpButton>
              </div>
            </div>
          </ErpCard>
          <ErpCard heading="Selected user">
            {target ? (
              <>
                <AdminSummary
                  avatarName={target.name || target.phone || 'User'}
                  eyebrow={titleCase(target.role)}
                  title={target.name || target.phone}
                  meta={target.phone}
                  side={<AdminStatus status={target.status || 'active'} />}
                />
                <AdminKV
                  items={[
                    { label: 'Amount to credit', value: canCredit ? amountNum.toFixed(2) : '—' },
                    { label: 'Currency', value: "User's wallet currency" },
                  ]}
                />
              </>
            ) : (
              <AdminListState
                empty
                emptyProps={{
                  icon: 'user',
                  title: 'No user selected',
                  description: 'Search and pick the account to credit.',
                }}
              />
            )}
          </ErpCard>
        </div>
      )}

      {tab === 'withdrawals' && (
        <AdminTableCard
          toolbar={
            <AdminToolbar
              right={
                <>
                  <span className="adm-result-count">
                    {list.total} withdrawal{list.total === 1 ? '' : 's'}
                  </span>
                  <ErpButton variant="ghost" size="sm" icon="refresh" onClick={load}>
                    Refresh
                  </ErpButton>
                </>
              }
            >
              <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search tutor, cycle or note" />
              <ErpSegmented
                value={wStatus}
                onChange={setWStatus}
                options={[
                  { value: '', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
            </AdminToolbar>
          }
          footer={list.pages > 1 ? <ErpPager {...list.pagerProps} noun="withdrawal" /> : null}
        >
          {!platform && !error ? (
            <AdminListState loading />
          ) : !visibleWithdrawals.length || list.noMatch ? (
            <AdminListState
              empty={!visibleWithdrawals.length}
              noMatch={list.noMatch}
              emptyProps={{
                icon: wStatus === 'pending' ? 'check-circle' : 'wallet',
                title: wStatus === 'pending' ? 'No pending withdrawals' : 'No withdrawals',
                description:
                  wStatus === 'pending'
                    ? 'Tutor payout requests will appear here for approval.'
                    : 'Tutors have not requested any payouts yet.',
              }}
            />
          ) : (
            <div className="erp-table-scroll">
              <table className="erp-data-table adm-table">
                <thead>
                  <tr>
                    <th>Tutor</th>
                    <th className="num">Amount</th>
                    <th>Bank account</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th className="adm-actions" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((w) => (
                    <tr
                      key={w._id}
                      className={w.status === 'pending' ? 'erp-row-click' : ''}
                      onClick={() => w.status === 'pending' && openEdit(w._id)}
                    >
                      <td className="adm-primary">
                        <AdminCell
                          avatarName={w.tutorUserId?.name || w.tutorUserId?.phone || 'Tutor'}
                          title={w.tutorUserId?.name || w.tutorUserId?.phone || 'Tutor'}
                          sub={[w.cycle ? `Cycle ${w.cycle}` : null, w.adminNote].filter(Boolean).join(' · ') || null}
                        />
                      </td>
                      <td className="num" data-label="Amount">
                        <span className="adm-money">{money(w.amount, w.currency)}</span>
                      </td>
                      <td data-label="Bank account">
                        {w.bankAccountId ? (
                          <AdminCell
                            title={`${w.bankAccountId.holderName || 'Account'} •••• ${w.bankAccountId.last4 || ''}`}
                            sub={w.bankAccountId.status ? titleCase(w.bankAccountId.status) : null}
                          />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td data-label="Status">
                        <AdminStatus status={w.status} />
                      </td>
                      <td data-label="Requested" className="muted adm-nowrap">
                        {formatDate(w.createdAt)}
                      </td>
                      <AdminRowActions>
                        {w.status === 'pending' ? (
                          <ErpButton
                            variant="secondary"
                            size="sm"
                            iconRight="chevron-right"
                            onClick={() => openEdit(w._id)}
                          >
                            Review
                          </ErpButton>
                        ) : null}
                      </AdminRowActions>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminTableCard>
      )}

      <ErpModal
        open={Boolean(editId) && review !== 'approve'}
        title={review === 'reject' ? 'Reject withdrawal' : 'Withdrawal request'}
        size="md"
        onClose={close}
        footer={
          selected?.status === 'pending' ? (
            review === 'reject' ? (
              <>
                <ErpButton variant="secondary" onClick={() => setReview('view')} disabled={reviewBusy}>
                  Back
                </ErpButton>
                <ErpButton
                  variant="danger"
                  onClick={() => submitReview('rejected')}
                  loading={reviewBusy}
                  disabled={!rejectNote.trim()}
                >
                  Reject withdrawal
                </ErpButton>
              </>
            ) : (
              <>
                <ErpButton variant="secondary" onClick={close} disabled={reviewBusy}>
                  Cancel
                </ErpButton>
                <ErpButton variant="danger" onClick={() => setReview('reject')} disabled={reviewBusy}>
                  Reject
                </ErpButton>
                <ErpButton icon="check" onClick={() => setReview('approve')} disabled={reviewBusy}>
                  Approve payout
                </ErpButton>
              </>
            )
          ) : null
        }
      >
        {reviewError && <ErpBanner variant="danger">{reviewError}</ErpBanner>}
        {!selected ? (
          <AdminListState
            empty
            emptyProps={{ icon: 'wallet', title: 'Withdrawal not found', description: 'It may already be processed.' }}
          />
        ) : (
          <>
            <AdminSummary
              avatarName={selected.tutorUserId?.name || selected.tutorUserId?.phone || 'Tutor'}
              eyebrow={`Payout to ${selected.tutorUserId?.name || 'tutor'}`}
              title={money(selected.amount, selected.currency)}
              meta={`Requested ${formatDate(selected.createdAt)}`}
              side={<AdminStatus status={selected.status} />}
            />
            <AdminSection title="Details">
              <AdminKV
                items={[
                  { label: 'Tutor', value: userLabel(selected.tutorUserId) },
                  selected.cycle && { label: 'Cycle', value: selected.cycle },
                  selected.bankAccountId && {
                    label: 'Bank account',
                    value: `${selected.bankAccountId.holderName || ''} •••• ${
                      selected.bankAccountId.last4 || ''
                    }${selected.bankAccountId.status ? ` (${titleCase(selected.bankAccountId.status)})` : ''}`,
                  },
                  selected.adminNote && { label: 'Admin note', value: selected.adminNote, full: true },
                ]}
              />
            </AdminSection>
            {review === 'reject' ? (
              <AdminSection title="Reason">
                <ErpTextarea
                  id="withdrawal-reject-note"
                  label="Reason (shown to the tutor)"
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
              </AdminSection>
            ) : null}
          </>
        )}
      </ErpModal>

      <ErpConfirm
        open={review === 'approve' && Boolean(selected)}
        title="Approve withdrawal"
        busy={reviewBusy}
        confirmLabel="Approve and pay out"
        message={
          selected
            ? `Pay out ${money(selected.amount, selected.currency)} to ${userLabel(
                selected.tutorUserId
              )}? The amount is debited from the tutor wallet and sent to their bank account.`
            : ''
        }
        onCancel={() => setReview('view')}
        onConfirm={() => submitReview('approved')}
      />

      <ErpConfirm
        open={confirmTopUp && canCredit}
        title="Confirm top-up"
        busy={topUpBusy}
        confirmLabel="Credit wallet"
        message={
          target ? `Credit ${amountNum.toFixed(2)} to ${userLabel(target)} (${target.role})?` : ''
        }
        onCancel={() => setConfirmTopUp(false)}
        onConfirm={credit}
      />
    </div>
  );
}
