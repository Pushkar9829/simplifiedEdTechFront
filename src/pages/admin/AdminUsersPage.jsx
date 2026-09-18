import { useEffect, useState } from 'react';
import { adminSetUserStatus, adminUsers } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpPageHeader,
  ErpPager,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
  ErpToolbar,
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

      <ErpToolbar>
        <input
          className="erp-search"
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ErpButton
          variant="secondary"
          onClick={() => {
            setPage(1);
            load();
          }}
        >
          Search
        </ErpButton>
        <ErpSelect
          inline
          value={status}
          options={USER_STATUS_OPTIONS}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        />
      </ErpToolbar>

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

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading users…</div>
        ) : !users.length ? (
          <div className="empty">No users found.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="erp-row-click" onClick={() => openEdit(u._id)}>
                    <td>{u.name || '—'}</td>
                    <td>{u.phone}</td>
                    <td>{u.role}</td>
                    <td>
                      <ErpStatusBadge status={u.status}>{u.status}</ErpStatusBadge>
                    </td>
                    <td>
                      <ErpButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(u._id);
                        }}
                      >
                        View
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
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
