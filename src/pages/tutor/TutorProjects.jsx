import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deliverProject, listProjects, setProjectStatus } from '../../api';
import {
  ErpAvatar,
  ErpBanner,
  ErpButton,
  ErpCalendar,
  ErpCard,
  ErpEmptyState,
  ErpModal,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpStatusBadge,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { errorMessage } from '../../utils/errors';
import { formatDate, money } from '../../utils/format';
import { titleCase } from './tutorOptions';
import TutorRowMenu from './TutorRowMenu';
import './tutor.css';

export default function TutorProjects() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');
  const [error, setError] = useState('');
  const [deliver, setDeliver] = useState(null);
  const [files, setFiles] = useState([]);
  const [deliverBusy, setDeliverBusy] = useState(false);
  const [deliverError, setDeliverError] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const r = await listProjects();
      setItems(Array.isArray(r) ? r : r?.items || []);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const startProject = async (p) => {
    setError('');
    try {
      await setProjectStatus(p._id, 'in_progress');
      setMsg('Project started');
      load();
    } catch (err) {
      setError(errorMessage(err, 'Could not start the project'));
    }
  };

  const openDeliver = (p) => {
    setFiles([]);
    setDeliverError('');
    setDeliver(p);
  };

  const closeDeliver = () => {
    if (deliverBusy) return;
    setDeliver(null);
    setFiles([]);
    setDeliverError('');
  };

  const submitDeliver = async () => {
    if (!deliver || !files.length) {
      setDeliverError('Choose at least one file to deliver');
      return;
    }
    setDeliverBusy(true);
    setDeliverError('');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('deliverables', f));
      await deliverProject(deliver._id, fd);
      setDeliver(null);
      setFiles([]);
      setMsg('Deliverables uploaded');
      load();
    } catch (err) {
      setDeliverError(errorMessage(err, 'Upload failed'));
    } finally {
      setDeliverBusy(false);
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

  const count = (s) => items.filter((p) => p.status === s).length;

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        subtitle="Charge a student a fee for project work (IA, EE, portfolio) and deliver the files here. Students pay you."
        actions={
          <Link to="/tutor/projects/new" className="erp-btn-primary">
            <Icon name="plus" size={16} />
            New project
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
          <ErpTabs
            variant="segmented"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'all', label: 'All', count: items.length },
              { value: 'proposed', label: 'Proposed', count: count('proposed') || null },
              { value: 'in_progress', label: 'In progress', count: count('in_progress') || null },
              { value: 'delivered', label: 'Delivered', count: count('delivered') || null },
            ]}
          />
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search projects or students" />
        </div>
        <div className="tutor-toolbar-right">
          <ErpSegmented
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'Cards', icon: 'layers' },
              { value: 'calendar', label: 'Calendar', icon: 'calendar' },
            ]}
          />
        </div>
      </div>
      {view === 'calendar' ? (
        <ErpCard>
          {!events.length ? (
            <ErpEmptyState icon="calendar" title="No project due dates in this view" />
          ) : (
            <ErpCalendar events={events} />
          )}
        </ErpCard>
      ) : !visible.length ? (
        <ErpCard>
          <ErpEmptyState
            icon="folder"
            title={tab === 'all' ? 'No projects yet' : 'No projects in this view'}
            description="Propose a project with a fee and delivery date. The student accepts and pays before you start."
            action={
              <Link to="/tutor/projects/new" className="erp-btn-primary">
                New project
              </Link>
            }
          />
        </ErpCard>
      ) : list.noMatch ? (
        <ErpCard>
          <ErpEmptyState icon="search" title="No projects match that search" />
        </ErpCard>
      ) : (
        <>
          <div className="tutor-card-grid">
            {list.items.map((p) => {
              const canEdit = ['proposed', 'accepted'].includes(p.status);
              const canDeliver = ['accepted', 'in_progress', 'delivered'].includes(p.status);
              return (
                <article key={p._id} className="erp-card tutor-item-card">
                  <div className="tutor-item-body">
                    <div className="tutor-item-top">
                      <ErpStatusBadge status={p.status} dot>
                        {titleCase(p.status)}
                      </ErpStatusBadge>
                      <TutorRowMenu
                        label={`Actions for ${p.name}`}
                        items={[
                          { label: 'View', icon: 'eye', onClick: () => navigate(`/tutor/projects/${p._id}`) },
                          canEdit && {
                            label: 'Edit',
                            icon: 'pencil',
                            onClick: () => navigate(`/tutor/projects/${p._id}/edit`),
                          },
                        ]}
                      />
                    </div>
                    <Link to={`/tutor/projects/${p._id}`} className="tutor-item-title">
                      {p.name}
                    </Link>
                    <span className="tutor-cell-person text-erp-sm">
                      <ErpAvatar name={p.studentUserId?.name || 'Student'} size="xs" />
                      <span className="muted">{p.studentUserId?.name || 'Student'}</span>
                    </span>
                    <div className="tutor-chips">
                      {p.kind ? <span className="erp-tag">{titleCase(p.kind)}</span> : null}
                      <span className="muted text-erp-xs">
                        <Icon name="calendar" size={12} /> Due {formatDate(p.deliveryDate)}
                      </span>
                    </div>
                  </div>
                  <div className="tutor-item-foot">
                    <strong className="num">{money(p.price, p.currency)}</strong>
                    <span className="tutor-item-foot-actions">
                      {p.status === 'accepted' ? (
                        <ErpButton size="sm" variant="secondary" onClick={() => startProject(p)}>
                          Start
                        </ErpButton>
                      ) : null}
                      {canDeliver ? (
                        <ErpButton size="sm" icon="upload" onClick={() => openDeliver(p)}>
                          Deliver
                        </ErpButton>
                      ) : (
                        <Link to={`/tutor/projects/${p._id}`} className="erp-btn-ghost erp-btn-sm">
                          View
                        </Link>
                      )}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
          {list.pages > 1 && (
            <ErpCard size="sm" flush>
              <ErpPager {...list.pagerProps} noun="project" />
            </ErpCard>
          )}
        </>
      )}
      <ErpModal
        open={Boolean(deliver)}
        title="Upload deliverables"
        onClose={closeDeliver}
        footer={
          <>
            <ErpButton variant="secondary" disabled={deliverBusy} onClick={closeDeliver}>
              Cancel
            </ErpButton>
            <ErpButton icon="upload" disabled={!files.length} loading={deliverBusy} onClick={submitDeliver}>
              {deliverBusy ? 'Uploading…' : 'Upload'}
            </ErpButton>
          </>
        }
      >
        <div className="stack">
          {deliverError && <ErpBanner variant="danger">{deliverError}</ErpBanner>}
          {deliver ? (
            <p className="muted" style={{ margin: 0 }}>
              {deliver.name} · {deliver.studentUserId?.name || 'Student'}
            </p>
          ) : null}
          <label className="erp-file-drop tutor-file-pick" htmlFor="project-deliverables">
            <span className="row" style={{ gap: '0.5rem' }}>
              <Icon name="upload" size={16} />
              <span className="text-erp-sm">
                {files.length ? files.map((f) => f.name).join(', ') : 'Choose the files to send to the student'}
              </span>
            </span>
            <input
              id="project-deliverables"
              key={deliver?._id || 'none'}
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </label>
        </div>
      </ErpModal>
    </div>
  );
}
