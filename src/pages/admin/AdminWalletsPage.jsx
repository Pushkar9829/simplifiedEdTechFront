import { useEffect, useState } from 'react';
import {
  adminTopUp,
  adminUsers,
  adminWithdrawals,
  platformWallet,
  reviewWithdrawal,
} from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, money } from '../../utils/format';
import { useAdminModalQuery } from './useAdminModalQuery';

export default function AdminWalletsPage() {
  const { editId, openEdit, close } = useAdminModalQuery();
  const [tab, setTab] = useState('overview');
  const [platform, setPlatform] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [topUp, setTopUp] = useState({ userId: '', amount: 50 });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [rejecting, setRejecting] = useState(null);

  const load = async () => {
    try {
      const [p, w, u] = await Promise.all([
        platformWallet(),
        adminWithdrawals(),
        adminUsers({ limit: 50 }),
      ]);
      setPlatform(p);
      setWithdrawals(Array.isArray(w) ? w : w.items || []);
      setUsers(u.items || []);
      if (!topUp.userId && u.items?.[0]) {
        setTopUp((f) => ({ ...f, userId: u.items[0]._id }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const list = useListFilter(withdrawals, (w) =>
    [w.tutorUserId?.name, w.tutorUserId?.phone, w.status, w.cycle].filter(Boolean).join(' ')
  );
  const selected = withdrawals.find((w) => w._id === editId) || null;

  const credit = async () => {
    setError('');
    setMsg('');
    try {
      await adminTopUp({ userId: topUp.userId, amount: Number(topUp.amount) });
      setMsg('Top-up saved');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Platform commission balance, manual credits, and tutor withdrawals." />
      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="success-banner">{msg}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'topup', label: 'Top-up' },
            { value: 'withdrawals', label: 'Withdrawals' },
          ]}
        />
        <div className="avail-bar-actions">
          <ErpButton variant="secondary" onClick={load}>
            Refresh
          </ErpButton>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="stat">
          <div className="label">Platform wallet (25% commission)</div>
          <div className="value">{money(platform?.wallet?.balance || 0)}</div>
        </div>
      )}

      {tab === 'topup' && (
        <ErpCard className="stack">
          <h2>Manual top-up</h2>
          <div className="row">
            <ErpSelect
              inline
              value={topUp.userId}
              options={users.map((u) => ({
                value: u._id,
                label: `${u.name || u.phone} (${u.role})`,
              }))}
              onChange={(e) => setTopUp((f) => ({ ...f, userId: e.target.value }))}
            />
            <input
              className="erp-search"
              type="number"
              value={topUp.amount}
              onChange={(e) => setTopUp((f) => ({ ...f, amount: e.target.value }))}
            />
            <ErpButton type="button" onClick={credit}>
              Credit wallet
            </ErpButton>
          </div>
        </ErpCard>
      )}

      {tab === 'withdrawals' && (
        <ErpCard className="erp-card-flush">
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search withdrawals" />
          {!withdrawals.length ? (
            <div className="empty">No withdrawals.</div>
          ) : list.noMatch ? (
            <div className="empty">No withdrawals match that search.</div>
          ) : (
            <div className="erp-table-scroll">
              <ErpDataTable>
                <thead>
                  <tr>
                    <th>Tutor</th>
                    <th>Amount</th>
                    <th>Cycle</th>
                    <th>Bank</th>
                    <th>Status</th>
                    <th>When</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((w) => (
                    <tr
                      key={w._id}
                      className={w.status === 'pending' ? 'erp-row-click' : ''}
                      onClick={() => w.status === 'pending' && openEdit(w._id)}
                    >
                      <td>{w.tutorUserId?.name || w.tutorUserId?.phone}</td>
                      <td>{money(w.amount)}</td>
                      <td>{w.cycle || '—'}</td>
                      <td>
                        {w.bankAccountId
                          ? `${w.bankAccountId.holderName || ''} •••• ${w.bankAccountId.last4 || ''} (${w.bankAccountId.status || ''})`
                          : '—'}
                      </td>
                      <td>
                        <ErpStatusBadge status={w.status}>{w.status}</ErpStatusBadge>
                      </td>
                      <td>{formatDate(w.createdAt)}</td>
                      <td>
                        {w.status === 'pending' && (
                          <ErpButton
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(w._id);
                            }}
                          >
                            Review
                          </ErpButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </div>
          )}
          {list.total > 0 && <ErpPager {...list.pagerProps} noun="withdrawal" />}
        </ErpCard>
      )}

      <ErpModal
        open={Boolean(editId)}
        title="Withdrawal review"
        size="sm"
        onClose={close}
        footer={
          selected?.status === 'pending' ? (
            <>
              <ErpButton variant="secondary" onClick={close}>
                Cancel
              </ErpButton>
              <ErpButton variant="danger" onClick={() => setRejecting(selected)}>
                Reject
              </ErpButton>
              <ErpButton
                onClick={async () => {
                  try {
                    await reviewWithdrawal(selected._id, { status: 'approved' });
                    close();
                    load();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                Approve
              </ErpButton>
            </>
          ) : null
        }
      >
        {!selected ? (
          <div className="empty">Withdrawal not found.</div>
        ) : (
          <dl className="erp-detail-grid">
            <dt>Tutor</dt>
            <dd>{selected.tutorUserId?.name || selected.tutorUserId?.phone}</dd>
            <dt>Amount</dt>
            <dd>{money(selected.amount)}</dd>
            <dt>Status</dt>
            <dd>
              <ErpStatusBadge status={selected.status}>{selected.status}</ErpStatusBadge>
            </dd>
            <dt>When</dt>
            <dd>{formatDate(selected.createdAt)}</dd>
          </dl>
        )}
      </ErpModal>

      <ErpConfirm
        open={Boolean(rejecting)}
        title="Reject withdrawal"
        message={
          rejecting
            ? `Reject withdrawal of ${money(rejecting.amount)} for ${
                rejecting.tutorUserId?.name || rejecting.tutorUserId?.phone || 'tutor'
              }?`
            : ''
        }
        confirmLabel="Reject"
        danger
        onCancel={() => setRejecting(null)}
        onConfirm={async () => {
          try {
            await reviewWithdrawal(rejecting._id, { status: 'rejected' });
            setRejecting(null);
            close();
            load();
          } catch (err) {
            setError(err.message);
            setRejecting(null);
          }
        }}
      />
    </div>
  );
}
