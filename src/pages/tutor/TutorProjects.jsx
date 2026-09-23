import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deliverProject, listProjects, setProjectStatus } from '../../api';
import {
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpDataTable,
  ErpModal,
  ErpList,
  ErpListItem,
  ErpOverflow,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, money } from '../../utils/format';
import { titleCase } from './tutorOptions';

export default function TutorProjects() {
  const phone = useIsPhone();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');
  const [error, setError] = useState('');
  const [deliver, setDeliver] = useState(null);
  const [files, setFiles] = useState([]);

  const load = async () => {
    try {
      const r = await listProjects();
      setItems(Array.isArray(r) ? r : r?.items || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = items.filter((p) => (tab === 'all' ? true : p.status === tab));
  const list = useListFilter(
    visible,
    (p) => [p.name, p.studentUserId?.name, p.kind, p.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );
  const events = useMemo(
    () =>
      (list.filtered || visible)
        .filter((p) => p.deliveryDate)
        .map((p) => ({
          id: p._id,
          start: p.deliveryDate,
          title: `${p.name} · ${p.studentUserId?.name || 'Student'}`,
          variant: p.status === 'delivered' || p.status === 'completed' ? 'completed' : 'online',
        })),
    [list.filtered, visible]
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Named work with a price, status, and delivery date." />
      {error && <div className="error-banner">{error}</div>}
      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'proposed', label: 'Proposed' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'delivered', label: 'Delivered' },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search projects" />
        <ErpTabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
        <div className="avail-bar-actions">
          <Link to="/tutor/projects/new" className="erp-btn-primary">
            New project
          </Link>
        </div>
      </div>
      {view === 'calendar' ? (
        <ErpCard>
          {!events.length ? (
            <div className="empty">No project due dates in this view.</div>
          ) : (
            <ErpCalendar events={events} />
          )}
        </ErpCard>
      ) : (
      <ErpCard className="erp-card-flush">
        {!visible.length ? (
          <div className="empty">No projects in this view.</div>
        ) : list.noMatch ? (
          <div className="empty">No projects match that search.</div>
        ) : phone ? (
          <div style={{ padding: '0.65rem' }}>
            <ErpList>
              {list.items.map((p) => (
                <ErpListItem
                  key={p._id}
                  title={p.name}
                  meta={`${p.studentUserId?.name || 'Student'} · ${money(p.price, p.currency)} · ${formatDate(p.deliveryDate)}`}
                  status={p.status}
                  statusLabel={titleCase(p.status)}
                  to={`/tutor/projects/${p._id}`}
                  actions={
                    <ErpOverflow
                      items={[
                        { label: 'View', to: `/tutor/projects/${p._id}` },
                        ['proposed', 'accepted'].includes(p.status) && {
                          label: 'Edit',
                          to: `/tutor/projects/${p._id}/edit`,
                        },
                        p.status === 'accepted' && {
                          label: 'Start',
                          onClick: () => setProjectStatus(p._id, 'in_progress').then(load),
                        },
                        ['accepted', 'in_progress', 'delivered'].includes(p.status) && {
                          label: 'Deliver',
                          onClick: () => setDeliver(p),
                        },
                      ]}
                    />
                  }
                />
              ))}
            </ErpList>
          </div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Student</th>
                  <th>Price</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="muted">{titleCase(p.kind)}</div>
                    </td>
                    <td>{p.studentUserId?.name || '—'}</td>
                    <td>{money(p.price, p.currency)}</td>
                    <td>{formatDate(p.deliveryDate)}</td>
                    <td>
                      <ErpStatusBadge status={p.status}>{titleCase(p.status)}</ErpStatusBadge>
                    </td>
                    <td className="row">
                      <Link to={`/tutor/projects/${p._id}`} className="erp-btn-secondary">
                        View
                      </Link>
                      {['proposed', 'accepted'].includes(p.status) && (
                        <Link to={`/tutor/projects/${p._id}/edit`} className="erp-btn-secondary">
                          Edit
                        </Link>
                      )}
                      {p.status === 'accepted' && (
                        <ErpButton
                          variant="secondary"
                          onClick={() => setProjectStatus(p._id, 'in_progress').then(load)}
                        >
                          Start
                        </ErpButton>
                      )}
                      {['accepted', 'in_progress', 'delivered'].includes(p.status) && (
                        <ErpButton onClick={() => setDeliver(p)}>Deliver</ErpButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </div>
        )}
        {list.total > 0 && <ErpPager {...list.pagerProps} noun="project" />}
      </ErpCard>
      )}
      <ErpModal open={Boolean(deliver)} title="Upload deliverables" onClose={() => setDeliver(null)}>
        <div className="stack">
          <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          <div className="row">
            <ErpButton
              onClick={async () => {
                const fd = new FormData();
                files.forEach((f) => fd.append('deliverables', f));
                await deliverProject(deliver._id, fd);
                setDeliver(null);
                load();
              }}
            >
              Upload
            </ErpButton>
            <ErpButton variant="secondary" onClick={() => setDeliver(null)}>
              Cancel
            </ErpButton>
          </div>
        </div>
      </ErpModal>
    </div>
  );
}
