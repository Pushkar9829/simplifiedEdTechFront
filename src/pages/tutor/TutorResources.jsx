import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteResource, listResources } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpPageHeader,
  ErpSelect,
  ErpToolbar,
} from '../../components/erp';
import { resourceTypeOptions, titleCase } from './tutorOptions';

export default function TutorResources() {
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

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Files you share with students." />
      {error && <div className="error-banner">{error}</div>}

      <ErpToolbar
        actions={
          <Link to="/tutor/resources/new" className="erp-btn-primary">
            Create resource
          </Link>
        }
      >
        <ErpSelect
          inline
          value={filterType}
          options={resourceTypeOptions(true)}
          onChange={(e) => setFilterType(e.target.value)}
        />
        <ErpButton variant="secondary" onClick={load}>
          Refresh
        </ErpButton>
      </ErpToolbar>

      <ErpCard className="erp-card-flush">
        {loading ? (
          <div className="empty">Loading resources…</div>
        ) : !items.length ? (
          <div className="empty">
            No resources yet.{' '}
            <Link to="/tutor/resources/new">Upload your first resource</Link>
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.title}</strong>
                      {r.topic && <div className="muted">{r.topic}</div>}
                    </td>
                    <td>{titleCase(r.type)}</td>
                    <td>{r.subjectId?.name || '—'}</td>
                    <td>{r.level}</td>
                    <td>
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
