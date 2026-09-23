import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteResource, listResources } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpList,
  ErpListItem,
  ErpOverflow,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
import { resourceTypeOptions, titleCase } from './tutorOptions';

export default function TutorResources() {
  const phone = useIsPhone();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    if (!user?._id) return;
    setLoading(true);
    setError('');
    try {
      const r = await listResources({
        createdBy: user._id,
        type: filterType,
        includeInactive: 'true',
      });
      setItems(r.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?._id, filterType]);

  const list = useListFilter(
    items,
    (r) => [r.title, r.topic, r.subjectId?.name, r.type, r.level, r.accessType].filter(Boolean).join(' '),
    { resetKey: filterType }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Files you share with students." />
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={filterType || 'all'}
          onChange={(value) => setFilterType(value === 'all' ? '' : value)}
          tabs={resourceTypeOptions(true).map((o) => ({
            value: o.value || 'all',
            label: o.label,
          }))}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search resources" />
        <div className="avail-bar-actions">
          <Link to="/tutor/resources/new" className="erp-btn-primary">
            Create resource
          </Link>
        </div>
      </div>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading resources…</div>
        ) : !items.length ? (
          <div className="empty">
            No resources yet.{' '}
            <Link to="/tutor/resources/new">Upload your first resource</Link>
          </div>
        ) : list.noMatch ? (
          <div className="empty">No resources match that search.</div>
        ) : phone ? (
          <div style={{ padding: '0.65rem' }}>
            <ErpList>
              {list.items.map((r) => (
                <ErpListItem
                  key={r._id}
                  title={r.title}
                  meta={`${titleCase(r.type)} · ${r.subjectId?.name || 'Resource'} · ${r.level}`}
                  to={`/tutor/resources/${r._id}/edit`}
                  actions={
                    <ErpOverflow
                      items={[
                        { label: 'Edit', to: `/tutor/resources/${r._id}/edit` },
                        { label: 'Delete', danger: true, onClick: () => setPendingDelete(r) },
                      ]}
                    />
                  }
                >
                  <div className="muted">
                    {r.accessType === 'paid' ? `Paid · ${money(r.price, r.currency)}` : 'Free'}
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
                  <th>Title</th>
                  <th>Type</th>
                  <th>Subject</th>
                    <th>Level</th>
                    <th>Access</th>
                    <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.title}</strong>
                      {r.topic && <div className="muted">{r.topic}</div>}
                    </td>
                    <td>{titleCase(r.type)}</td>
                    <td>{r.subjectId?.name || '—'}</td>
                    <td>{r.level}</td>
                    <td>
                      {r.accessType === 'paid' ? `Paid · ${money(r.price, r.currency)}` : 'Free'}
                      {r.downloadableUntil && (
                        <div className="muted">until {new Date(r.downloadableUntil).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="row">
                      <Link to={`/tutor/resources/${r._id}/edit`} className="erp-btn-secondary">
                        Edit
                      </Link>
                      <ErpButton variant="danger" onClick={() => setPendingDelete(r)}>
                        Delete
                      </ErpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="resource" />}
      </ErpCard>

      <ErpConfirm
        open={Boolean(pendingDelete)}
        title="Delete resource"
        message={pendingDelete ? `Delete “${pendingDelete.title}”?` : ''}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await deleteResource(pendingDelete._id);
            setPendingDelete(null);
            load();
          } catch (err) {
            setError(err.message);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
