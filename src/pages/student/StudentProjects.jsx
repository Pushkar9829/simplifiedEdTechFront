import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addFavorite,
  joinProject,
  listOpenProjects,
  listProjects,
  listSubjects,
  removeFavorite,
  setProjectStatus,
} from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpEmptyState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { childLabel, useParentChild } from '../../context/ParentChildContext';
import { useAuth } from '../../context/AuthContext';
import { useListFilter } from '../../hooks/useListFilter';
import { money, tutorRef } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './studentOptions';
import { formatDay, idOf, viewerZone } from './studentTime';
import { FavButton, LinkButton } from './studentUi';
import './student.css';

function paymentPending(p) {
  const status = p.paymentId?.status || '';
  return ['pending', 'failed', 'awaiting_confirmation'].includes(status);
}

const STATUS_TABS = ['proposed', 'accepted', 'in_progress', 'delivered', 'completed', 'cancelled'];

export default function StudentProjects() {
  const location = useLocation();
  const navigate = useNavigate();
  const isParent = location.pathname.startsWith('/parent');
  const paymentsPath = isParent ? '/parent/payments' : '/student/payments';
  const { user } = useAuth();
  const zone = viewerZone(user);
  const parent = useParentChild();
  const childId = isParent ? parent.selectedChildId : null;
  const childName = isParent && parent.selectedChild ? childLabel(parent.selectedChild) : '';
  const [section, setSection] = useState('mine');
  const [allItems, setAllItems] = useState([]);
  const [openItems, setOpenItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ subjectId: '', paid: '', favorites: '' });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('all');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');

  const begin = () => {
    setError('');
    setMsg('');
  };

  const load = async () => {
    try {
      const r = await listProjects();
      setAllItems(Array.isArray(r) ? r : r?.items || []);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const loadOpen = () =>
    listOpenProjects({ ...filters, search: query })
      .then((r) => setOpenItems(Array.isArray(r) ? r : r?.items || []))
      .catch((err) => setError(errorMessage(err)));

  useEffect(() => {
    listSubjects()
      .then((d) => setSubjects(d.items || []))
      .catch(() => {});
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (section === 'join') loadOpen();
  }, [section, query, filters.subjectId, filters.paid, filters.favorites]);

  const items = useMemo(
    () => (isParent ? allItems.filter((p) => idOf(p.studentUserId) === String(childId || '')) : allItems),
    [allItems, isParent, childId]
  );

  const visible = tab === 'all' ? items : items.filter((p) => p.status === tab);
  const list = useListFilter(
    visible,
    (p) => [p.name, p.description, p.tutorUserId?.refCode, p.status].filter(Boolean).join(' '),
    { resetKey: `${tab}-${childId}` }
  );
  const openList = useListFilter(openItems, () => '', { resetKey: `${query}-${JSON.stringify(filters)}` });

  const runConfirm = async () => {
    if (!confirm) return;
    begin();
    setBusy(true);
    try {
      await setProjectStatus(confirm.project._id, confirm.status);
      setMsg(confirm.status === 'completed' ? 'Project marked complete.' : 'Project cancelled.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const subtitle = isParent
    ? `Project work for ${childName || 'your child'}. The tutor charges a fee for project work and you pay it on your child’s behalf. Your child is not paid by anyone.`
    : 'Your tutor charges a fee for project work. You pay that fee — students are not paid by anyone.';

  if (isParent && parent.error && !parent.children.length) {
    return (
      <div className="page stack st-page">
        <ErpBanner
          variant="danger"
          actions={
            <ErpButton variant="secondary" size="sm" onClick={() => parent.refreshChildren()}>
              Retry
            </ErpButton>
          }
        >
          {parent.error}
        </ErpBanner>
      </div>
    );
  }

  const childSelect =
    isParent && parent.children.length > 0 ? (
      <ErpSelect
        inline
        aria-label="Child"
        leading={<Icon name="user" size={15} />}
        value={childId || ''}
        options={parent.children.map((c) => ({ value: idOf(c.studentUserId), label: childLabel(c) }))}
        onChange={(e) => parent.setSelectedChildId(e.target.value)}
      />
    ) : null;

  const needsAction = (p) =>
    (paymentPending(p) && p.paymentId.status !== 'awaiting_confirmation' && p.status !== 'cancelled') ||
    p.status === 'proposed' ||
    p.status === 'delivered';

  return (
    <div className="page stack st-page">
      <ErpPageHeader
        subtitle={subtitle}
        actions={
          section === 'mine' ? (
            <ErpButton icon="search" onClick={() => setSection('join')}>
              Browse projects
            </ErpButton>
          ) : null
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
      {isParent && !parent.loading && !parent.children.length && (
        <div className="erp-card">
          <ErpEmptyState
            icon="users"
            title="No linked children yet"
            description="Link your child's account to manage their project work."
            action={<LinkButton to="/parent/children/link">Link a child</LinkButton>}
          />
        </div>
      )}

      <ErpTabs
        value={section}
        onChange={setSection}
        tabs={[
          { value: 'mine', label: isParent ? 'Projects' : 'My projects', count: items.length },
          { value: 'join', label: 'Open projects' },
        ]}
      />

      {section === 'mine' && (
        <>
          <div className="st-filter-bar">
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search projects" />
            <ErpSelect
              inline
              aria-label="Status"
              value={tab}
              options={[
                { value: 'all', label: `All statuses (${items.length})` },
                ...STATUS_TABS.map((s) => ({
                  value: s,
                  label: `${titleCase(s)} (${items.filter((p) => p.status === s).length})`,
                })),
              ]}
              onChange={(e) => setTab(e.target.value)}
            />
            {childSelect ? <div className="st-filter-bar-end">{childSelect}</div> : null}
          </div>
          <ErpCard flush>
            {!items.length ? (
              <ErpEmptyState
                icon="folder"
                title="No projects yet"
                description="Tutors can propose guided project work, or you can join an open project."
                action={
                  <ErpButton variant="secondary" onClick={() => setSection('join')}>
                    Browse open projects
                  </ErpButton>
                }
              />
            ) : !visible.length ? (
              <ErpEmptyState icon="filter" title="No projects with this status" />
            ) : list.noMatch ? (
              <ErpEmptyState icon="search" title="No projects match that search" />
            ) : (
              <ul className="st-list">
                {list.items.map((p) => (
                  <li key={p._id} className={`st-item${needsAction(p) ? ' is-attention' : ''}`}>
                    <span className={`st-leading-icon${p.status === 'cancelled' ? ' is-neutral' : p.status === 'completed' ? ' is-success' : ''}`}>
                      <Icon name="folder" size={18} />
                    </span>
                    <div className="st-item-body">
                      <p className="st-item-title">{p.name}</p>
                      <p className="st-item-meta">
                        <span>
                          <Icon name="user" size={14} />
                          {tutorRef(p.tutorUserId)}
                        </span>
                        <span>
                          <Icon name="tag" size={14} />
                          {money(p.price, p.currency)}
                        </span>
                        <span>
                          <Icon name="calendar" size={14} />
                          Due {formatDay(p.deliveryDate, zone)}
                        </span>
                        {isParent && p.studentUserId?.name ? (
                          <span>
                            <Icon name="graduation-cap" size={14} />
                            For {p.studentUserId.name}
                          </span>
                        ) : null}
                      </p>
                      {p.description && <p className="st-item-desc">{p.description}</p>}
                      {!!p.deliverables?.length && (
                        <p className="st-item-meta">
                          {p.deliverables.map((f) => (
                            <a key={f.url} href={mediaUrl(f.url)} target="_blank" rel="noreferrer" className="row" style={{ gap: '0.25rem' }}>
                              <Icon name="download" size={14} />
                              {f.name || 'file'}
                            </a>
                          ))}
                        </p>
                      )}
                      <div className="st-item-badges">
                        <ErpStatusBadge status={p.status} dot>
                          {titleCase(p.status)}
                        </ErpStatusBadge>
                        {paymentPending(p) && (
                          <ErpStatusBadge status={p.paymentId.status}>
                            {p.paymentId.status === 'awaiting_confirmation' ? 'Awaiting confirmation' : 'Unpaid'}
                          </ErpStatusBadge>
                        )}
                      </div>
                    </div>
                    <div className="st-item-actions">
                      {paymentPending(p) && p.paymentId.status !== 'awaiting_confirmation' && p.status !== 'cancelled' && (
                        <LinkButton to={paymentsPath} state={{ paymentId: idOf(p.paymentId) }} icon="credit-card">
                          Pay tutor
                        </LinkButton>
                      )}
                      {p.status === 'proposed' && !paymentPending(p) && (
                        <ErpButton
                          loading={busyId === p._id}
                          disabled={busyId === p._id}
                          onClick={async () => {
                            begin();
                            setBusyId(p._id);
                            try {
                              const result = await setProjectStatus(p._id, 'accepted');
                              if (result?.payNow) {
                                navigate(paymentsPath, {
                                  state: {
                                    msg: 'Tutor fee invoice created. Pay it so the tutor can start.',
                                    paymentId: idOf(result.paymentId) || undefined,
                                  },
                                });
                                return;
                              }
                              setMsg('Project accepted.');
                              await load();
                            } catch (err) {
                              setError(errorMessage(err));
                            } finally {
                              setBusyId('');
                            }
                          }}
                        >
                          {busyId === p._id ? 'Working…' : 'Accept & pay'}
                        </ErpButton>
                      )}
                      {p.status === 'proposed' && (
                        <ErpButton
                          variant="secondary"
                          onClick={() => {
                            begin();
                            setConfirm({ project: p, status: 'cancelled' });
                          }}
                        >
                          Decline
                        </ErpButton>
                      )}
                      {p.status === 'delivered' && (
                        <ErpButton
                          icon="check"
                          onClick={() => {
                            begin();
                            setConfirm({ project: p, status: 'completed' });
                          }}
                        >
                          Mark complete
                        </ErpButton>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {list.total > 0 && <ErpPager {...list.pagerProps} noun="project" />}
          </ErpCard>
        </>
      )}

      {section === 'join' && (
        <>
          <div className="st-filter-bar">
            <ErpSearch value={search} onChange={setSearch} placeholder="Search title or tutor ID" />
            <ErpSelect
              inline
              aria-label="Subject"
              value={filters.subjectId}
              options={[{ value: '', label: 'All subjects' }, ...subjects.map((s) => ({ value: s._id, label: s.name }))]}
              onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}
            />
            <ErpSelect
              inline
              aria-label="Price"
              value={filters.paid}
              options={[
                { value: '', label: 'Free or paid' },
                { value: 'free', label: 'Free' },
                { value: 'paid', label: 'Paid' },
              ]}
              onChange={(e) => setFilters((f) => ({ ...f, paid: e.target.value }))}
            />
            <div className="st-filter-bar-end">
              <ErpSegmented
                aria-label="Show"
                value={filters.favorites === 'true' ? 'fav' : 'all'}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'fav', label: 'Favourites', icon: 'heart' },
                ]}
                onChange={(v) => setFilters((f) => ({ ...f, favorites: v === 'fav' ? 'true' : '' }))}
              />
              {childSelect}
            </div>
          </div>
          {isParent && !childId && <ErpBanner variant="info">Select a child to join a project for them.</ErpBanner>}
          {!openItems.length ? (
            <div className="erp-card">
              <ErpEmptyState
                icon="folder"
                title="No open projects match"
                description="Try another subject or clear the filters."
              />
            </div>
          ) : (
            <div className="st-resource-grid">
              {openList.items.map((p) => (
                <article key={p._id} className="erp-card st-resource">
                  <div className="st-resource-body">
                    <div className="st-resource-top">
                      <span className="st-leading-icon">
                        <Icon name="folder" size={18} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 className="st-resource-title">{p.name}</h3>
                        <p className="st-item-meta" style={{ marginTop: '0.25rem' }}>
                          <span>{p.subjectId?.name || 'Subject'}</span>
                          <span>Due {formatDay(p.deliveryDate, zone)}</span>
                        </p>
                      </div>
                      <FavButton
                        on={p.favorite}
                        onClick={async () => {
                          begin();
                          try {
                            if (p.favorite) await removeFavorite('project', p._id);
                            else await addFavorite('project', p._id);
                            loadOpen();
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                      />
                    </div>
                    {p.description && <p className="st-item-desc">{p.description}</p>}
                    <p className="st-item-meta">
                      <span>
                        <Icon name="user" size={14} />
                        Guidance tutor {tutorRef(p.tutorUserId)}
                      </span>
                    </p>
                  </div>
                  <div className="st-resource-foot">
                    <span className="st-price-value">
                      {Number(p.price) > 0 ? (
                        <>
                          {money(p.price, p.currency)}
                          <small> tutor fee</small>
                        </>
                      ) : (
                        'Free'
                      )}
                    </span>
                    <ErpButton
                      size="sm"
                      disabled={Boolean(busyId) || (isParent && !childId)}
                      loading={busyId === p._id}
                      onClick={async () => {
                        begin();
                        setBusyId(p._id);
                        try {
                          const result = await joinProject(p._id, childId ? { studentUserId: childId } : {});
                          if (result?.payNow) {
                            navigate(paymentsPath, {
                              state: { msg: 'Joined. Pay the tutor fee to start.', paymentId: idOf(result.paymentId) || undefined },
                            });
                            return;
                          }
                          setMsg(childName ? `${childName} joined the project.` : 'Joined project');
                          setSection('mine');
                          await load();
                        } catch (err) {
                          setError(errorMessage(err));
                        } finally {
                          setBusyId('');
                        }
                      }}
                    >
                      {busyId === p._id ? 'Joining…' : Number(p.price) > 0 ? 'Join & pay' : 'Join'}
                    </ErpButton>
                  </div>
                </article>
              ))}
            </div>
          )}
          {openList.total > 0 && (
            <div className="erp-card erp-card-flush">
              <ErpPager {...openList.pagerProps} noun="project" />
            </div>
          )}
        </>
      )}

      <ErpConfirm
        open={Boolean(confirm)}
        busy={busy}
        title={confirm?.status === 'completed' ? 'Mark project complete' : 'Decline project'}
        message={
          confirm?.status === 'completed'
            ? `Confirm that “${confirm?.project?.name}” was delivered as agreed. This closes the project.`
            : `Decline “${confirm?.project?.name}”? The project is cancelled and the tutor is notified.`
        }
        confirmLabel={confirm?.status === 'completed' ? 'Mark complete' : 'Decline project'}
        danger={confirm?.status === 'cancelled'}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
    </div>
  );
}
