import { useEffect, useState } from 'react';
import { adminSetUserStatus, adminUsers } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpModal,
  ErpPageHeader,
  ErpPager,
  ErpSearch,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { ROLE_OPTIONS, USER_STATUS_OPTIONS, USER_STATUS_SET_OPTIONS } from './adminOptions';
import { useAdminModalQuery } from './useAdminModalQuery';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { editId, openEdit, close } = useAdminModalQuery();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminUsers({
        role,
        status,
        search,
        page,
        limit: PAGE_SIZE,
      });
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role, status, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = users.find((u) => u._id === editId) || null;

  const setUserStatus = async (id, value) => {
    setError('');
    try {
      await adminSetUserStatus(id, value);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Search, filter by status, and change account status." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={role || 'all'}
          onChange={(value) => {
            setPage(1);
            setRole(value === 'all' ? '' : value);
          }}
          tabs={ROLE_OPTIONS.map((o) => ({
            value: o.value || 'all',
            label: o.label,
          }))}
        />
        <ErpSearch
          value={search}
          onChange={setSearch}
          placeholder="Search name or phone"
        />
        <ErpSelect
          inline
          value={status}
          options={USER_STATUS_OPTIONS}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        />
        <div className="avail-bar-actions">
          <ErpButton
            variant="secondary"
            onClick={() => {
              setPage(1);
              load();
            }}
          >
            Search
          </ErpButton>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading users…</div>
        ) : !users.length ? (
          <div className="empty">No users found.</div>
        ) : (
          <div className="tutor-profile-list" style={{ padding: '0.75rem' }}>
            {users.map((u) => (
              <article key={u._id} className="tutor-profile-row booking-card">
                <div className="booking-card-main">
                  <h3>
                    {u.name || 'User'}
                    <span className="erp-chip">{u.role}</span>
                  </h3>
                  <p className="muted">{u.phone}</p>
                  <div className="booking-card-status">
                    <ErpStatusBadge status={u.status}>{u.status}</ErpStatusBadge>
                  </div>
                </div>
                <div className="booking-card-actions">
                  <ErpButton variant="secondary" onClick={() => openEdit(u._id)}>
                    View
                  </ErpButton>
                </div>
              </article>
            ))}
          </div>
        )}
        <ErpPager
          page={page}
          pages={pages}
          total={total}
          noun="user"
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </ErpCard>

      <ErpModal
        open={Boolean(editId)}
        title="User detail"
        size="sm"
        onClose={close}
        footer={
          <ErpButton variant="secondary" onClick={close}>
            Close
          </ErpButton>
        }
      >
        {!selected ? (
          <div className="empty">User not on this page. Close and search again.</div>
        ) : (
          <div className="stack">
            <dl className="erp-detail-grid">
              <dt>Name</dt>
              <dd>{selected.name || '—'}</dd>
              <dt>Phone</dt>
              <dd>{selected.phone}</dd>
              <dt>Role</dt>
              <dd>{selected.role}</dd>
              <dt>Status</dt>
              <dd>
                <ErpStatusBadge status={selected.status}>{selected.status}</ErpStatusBadge>
              </dd>
            </dl>
            <ErpSelect
              label="Change status"
              value={selected.status}
              options={USER_STATUS_SET_OPTIONS}
              onChange={async (e) => {
                await setUserStatus(selected._id, e.target.value);
              }}
            />
          </div>
        )}
      </ErpModal>
    </div>
  );
}
