import { useEffect, useState } from 'react';
import { listProjects, setProjectStatus } from '../../api';
import {
  ErpButton,
  ErpCard,
  ErpDataTable,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpStatusBadge,
  ErpTabs,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { formatDate, money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './studentOptions';

export default function StudentProjects() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');

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

  const visible = tab === 'all' ? items : items.filter((p) => p.status === tab);
  const list = useListFilter(
    visible,
    (p) => [p.name, p.description, p.tutorUserId?.name, p.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <ErpPageHeader subtitle="Projects and paid assignments from your tutors." />
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
      </div>
      <ErpCard className="erp-card-flush">
        {!visible.length && items.length ? (
          <div className="empty">No projects in this view.</div>
        ) : !items.length ? (
          <div className="empty">No projects yet.</div>
        ) : list.noMatch ? (
          <div className="empty">No projects match that search.</div>
        ) : (
          <div className="erp-table-scroll">
            <ErpDataTable>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tutor</th>
                  <th>Price</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="muted">{p.description}</div>
                      {!!p.deliverables?.length && (
                        <div>
                          {p.deliverables.map((f) => (
                            <a key={f.url} href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                              {f.name || 'file'}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{p.tutorUserId?.name || '—'}</td>
                    <td>{money(p.price, p.currency)}</td>
                    <td>{formatDate(p.deliveryDate)}</td>
                    <td>
                      <ErpStatusBadge status={p.status}>{titleCase(p.status)}</ErpStatusBadge>
                    </td>
                    <td>
                      {p.status === 'proposed' && (
                        <ErpButton onClick={() => setProjectStatus(p._id, 'accepted').then(load)}>
                          Accept
                        </ErpButton>
                      )}
                      {p.status === 'delivered' && (
                        <ErpButton onClick={() => setProjectStatus(p._id, 'completed').then(load)}>
                          Mark complete
                        </ErpButton>
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
    </div>
  );
}
