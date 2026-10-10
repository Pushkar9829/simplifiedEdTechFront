import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteResource, listResources } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpDataTable,
  ErpEmptyState,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSelect,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
import { useCatalog } from '../../context/CatalogContext';
import { titleCase } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import TutorRowMenu from './TutorRowMenu';
import './tutor.css';

export default function TutorResources() {
  const phone = useIsPhone();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { options } = useCatalog();
  const [items, setItems] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  const me = user?.id ?? user?._id;

  const load = async () => {
    if (!me) return;
    setLoading(true);
    setError('');
    try {
      const r = await listResources({
        createdBy: String(me),
        type: filterType,
        includeInactive: 'true',
      });
      setItems(r.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [me, filterType]);

  const list = useListFilter(
    items,
    (r) => [r.title, r.topic, r.subjectId?.name, r.type, r.level, r.accessType].filter(Boolean).join(' '),
    { resetKey: filterType }
  );

  const typeOptions = options('resource_type', { all: 'All types' }).map((o) => ({
    value: o.value || 'all',
    label: o.label,
  }));
  const typeIcon = (t) =>
    t === 'video' ? 'video' : t === 'past_paper' || t === 'worksheet' ? 'clipboard-check' : 'file-text';
  const accessCell = (r) => (
    <span className="tutor-cell-stack">
      {r.accessType === 'paid' ? (
        <ErpBadge tone="brand">Paid · {money(r.price, r.currency)}</ErpBadge>
      ) : (
        <ErpBadge tone="success">Free</ErpBadge>
      )}
      {r.downloadableUntil && (
        <span className="muted text-erp-xs">until {new Date(r.downloadableUntil).toLocaleDateString()}</span>
      )}
    </span>
  );
  const menuFor = (r) => [
    { label: 'Edit', icon: 'pencil', onClick: () => navigate(`/tutor/resources/${r._id}/edit`) },
    { label: 'Delete', icon: 'trash', danger: true, onClick: () => setPendingDelete(r) },
  ];

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        subtitle="Notes, worksheets and videos you share with students — free or paid."
        actions={
          <Link to="/tutor/resources/new" className="erp-btn-primary">
            <Icon name="plus" size={16} />
            Create resource
          </Link>
        }
      />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}

      <div className="erp-filter-bar tutor-toolbar">
        <div className="tutor-toolbar-left">
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search title, topic or subject" />
        </div>
        <div className="tutor-toolbar-right">
          <ErpSelect
            inline
            aria-label="Resource type"
            value={filterType || 'all'}
            options={typeOptions}
            onChange={(e) => setFilterType(e.target.value === 'all' ? '' : e.target.value)}
          />
        </div>
      </div>

      <ErpCard flush>
        {loading ? (
          <ErpLoadingState message="Loading resources…" />
        ) : !items.length ? (
          <ErpEmptyState
            icon="folder"
            title={filterType ? 'No resources of this type' : 'No resources yet'}
            description="Upload notes, past papers or videos for your students."
            action={
              filterType ? (
                <ErpButton variant="secondary" onClick={() => setFilterType('')}>
                  Show all types
                </ErpButton>
              ) : (
                <Link to="/tutor/resources/new" className="erp-btn-primary">
                  Upload your first resource
                </Link>
              )
            }
          />
        ) : list.noMatch ? (
          <ErpEmptyState icon="search" title="No resources match that search" />
        ) : phone ? (
          <ul className="tutor-booking-cards">
            {list.items.map((r) => (
              <li key={r._id} className="tutor-booking-card">
                <Link to={`/tutor/resources/${r._id}/edit`} className="tutor-booking-card-hit" style={{ textDecoration: 'none' }}>
                  <span className="erp-attention-icon is-brand">
                    <Icon name={typeIcon(r.type)} size={16} />
                  </span>
                  <span className="tutor-booking-card-main">
                    <strong>{r.title}</strong>
                    <span className="muted">
                      {[titleCase(r.type), r.subjectId?.name, r.level].filter(Boolean).join(' · ')}
                    </span>
                    {accessCell(r)}
                  </span>
                </Link>
                <TutorRowMenu items={menuFor(r)} label={`Actions for ${r.title}`} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Level</th>
                  <th>Access</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => (
                  <tr key={r._id} className="erp-row-click" onClick={() => navigate(`/tutor/resources/${r._id}/edit`)}>
                    <td>
                      <span className="tutor-cell-person">
                        <span className="erp-attention-icon is-brand">
                          <Icon name={typeIcon(r.type)} size={16} />
                        </span>
                        <span className="tutor-cell-stack">
                          <strong>{r.title}</strong>
                          {r.topic && <span className="muted text-erp-xs">{r.topic}</span>}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="erp-tag">{titleCase(r.type)}</span>
                    </td>
                    <td>{r.subjectId?.name || <span className="muted">—</span>}</td>
                    <td>{r.level}</td>
                    <td>{accessCell(r)}</td>
                    <td className="tutor-cell-actions">
                      <TutorRowMenu items={menuFor(r)} label={`Actions for ${r.title}`} />
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
        busy={deleting}
        onCancel={() => !deleting && setPendingDelete(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteResource(pendingDelete._id);
            setPendingDelete(null);
            setMsg('Resource deleted');
            load();
          } catch (err) {
            setError(errorMessage(err));
            setPendingDelete(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
