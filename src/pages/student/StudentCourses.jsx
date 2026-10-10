import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addFavorite, enrollCourse, listCourses, listMyEnrollments, listSubjects, removeFavorite } from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpLoadingState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSegmented,
  ErpSelect,
  ErpStatusBadge,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { useCatalog } from '../../context/CatalogContext';
import { childLabel, useParentChild } from '../../context/ParentChildContext';
import { useListFilter } from '../../hooks/useListFilter';
import { money, tutorRef } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { titleCase } from './studentOptions';
import { idOf } from './studentTime';
import { FavButton, LinkButton } from './studentUi';
import './student.css';

export default function StudentCourses() {
  const location = useLocation();
  const navigate = useNavigate();
  const isParent = location.pathname.startsWith('/parent');
  const paymentsPath = isParent ? '/parent/payments' : '/student/payments';
  const { options } = useCatalog();
  const parent = useParentChild();
  const childId = isParent ? parent.selectedChildId : null;
  const childName = isParent && parent.selectedChild ? childLabel(parent.selectedChild) : '';
  const [section, setSection] = useState('mine');
  const [enrollments, setEnrollments] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ subjectId: '', category: '', level: '', paid: '', favorites: '' });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [loadingJoin, setLoadingJoin] = useState(false);

  const begin = () => {
    setError('');
    setMsg('');
  };

  const loadMine = () =>
    listMyEnrollments()
      .then((r) => setEnrollments(Array.isArray(r) ? r : r?.items || []))
      .catch((err) => setError(errorMessage(err)));

  const loadJoin = () => {
    setLoadingJoin(true);
    return listCourses({ ...filters, search: query })
      .then((r) => setCatalog(Array.isArray(r) ? r : r?.items || []))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoadingJoin(false));
  };

  useEffect(() => {
    listSubjects()
      .then((d) => setSubjects(d.items || []))
      .catch(() => {});
    loadMine();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (section === 'join') loadJoin();
  }, [section, query, filters.subjectId, filters.category, filters.level, filters.paid, filters.favorites]);

  // Enrollments for the learner in view (the selected child for parents).
  const items = useMemo(
    () => (isParent ? enrollments.filter((e) => idOf(e.studentUserId) === String(childId || '')) : enrollments),
    [enrollments, isParent, childId]
  );

  const enrollmentByCourse = useMemo(() => {
    const map = {};
    items.forEach((e) => {
      const cid = idOf(e.courseId);
      if (e.status === 'cancelled' && map[cid]) return;
      map[cid] = e;
    });
    return map;
  }, [items]);

  const countOf = (s) => items.filter((e) => e.status === s).length;
  const visible = tab === 'all' ? items : items.filter((e) => e.status === tab);
  const list = useListFilter(
    visible,
    (e) =>
      [e.courseId?.title, e.courseId?.subjectId?.name, e.courseId?.tutorUserId?.refCode, e.status].filter(Boolean).join(' '),
    { resetKey: `${tab}-${childId}` }
  );

  const joinList = useListFilter(catalog, () => '', { resetKey: `${query}-${JSON.stringify(filters)}` });

  const join = async (c) => {
    begin();
    if (isParent && !childId) return;
    setBusyId(c._id);
    try {
      const res = await enrollCourse(c._id, childId ? { studentUserId: childId } : {});
      const free = res?.enrollment?.status === 'active' || res?.payment?.status === 'paid' || !c.price;
      await loadMine();
      if (free) {
        setMsg(`${childName ? `${childName} is` : 'You are'} enrolled in ${c.title}.`);
      } else {
        navigate(paymentsPath, {
          state: {
            msg: `Invoice for ${c.title} is ready. Pay it to start the course.`,
            paymentId: res?.payment?._id,
          },
        });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

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

  const statusLabel = (st) => (st === 'pending' ? 'Awaiting payment' : titleCase(st));

  return (
    <div className="page stack st-page">
      <ErpPageHeader
        subtitle={
          isParent
            ? `Courses for ${childName || 'your child'}, plus a catalogue of published courses to join.`
            : 'Your enrolled courses, plus a catalogue of published courses you can join.'
        }
        actions={
          section === 'mine' ? (
            <ErpButton icon="search" onClick={() => setSection('join')}>
              Browse courses
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
            description="Link your child's account to enrol them in courses."
            action={<LinkButton to="/parent/children/link">Link a child</LinkButton>}
          />
        </div>
      )}

      <ErpTabs
        value={section}
        onChange={setSection}
        tabs={[
          { value: 'mine', label: isParent ? 'Enrolled courses' : 'My courses', count: items.length },
          { value: 'join', label: 'Browse catalogue' },
        ]}
      />

      {section === 'mine' && (
        <>
          <div className="st-filter-bar">
            <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search courses" />
            <ErpSelect
              inline
              aria-label="Status"
              value={tab}
              options={[
                { value: 'all', label: `All statuses (${items.length})` },
                { value: 'active', label: `Active (${countOf('active')})` },
                { value: 'pending', label: `Awaiting payment (${countOf('pending')})` },
                { value: 'cancelled', label: `Cancelled (${countOf('cancelled')})` },
              ]}
              onChange={(e) => setTab(e.target.value)}
            />
            {childSelect ? <div className="st-filter-bar-end">{childSelect}</div> : null}
          </div>
          <ErpCard flush>
            {!items.length ? (
              <ErpEmptyState
                icon="layers"
                title={isParent ? 'No enrollments yet' : 'You have not joined a course yet'}
                description="Browse self-paced courses published by verified tutors."
                action={
                  <ErpButton variant="secondary" onClick={() => setSection('join')}>
                    Browse courses
                  </ErpButton>
                }
              />
            ) : !visible.length ? (
              <ErpEmptyState icon="filter" title="No courses with this status" />
            ) : list.noMatch ? (
              <ErpEmptyState icon="search" title="No courses match that search" />
            ) : (
              <ul className="st-list">
                {list.items.map((e) => (
                  <li key={e._id} className={`st-item${e.status === 'pending' ? ' is-attention' : ''}`}>
                    <span className={`st-leading-icon${e.status === 'cancelled' ? ' is-neutral' : ''}`}>
                      <Icon name="layers" size={18} />
                    </span>
                    <div className="st-item-body">
                      <p className="st-item-title">{e.courseId?.title || 'Course'}</p>
                      <p className="st-item-meta">
                        <span>
                          <Icon name="book-open" size={14} />
                          {e.courseId?.subjectId?.name || 'Subject'}
                        </span>
                        <span>
                          <Icon name="user" size={14} />
                          {tutorRef(e.courseId?.tutorUserId)}
                        </span>
                        <span>{e.courseId?.price ? money(e.courseId.price, e.courseId.currency) : 'Free'}</span>
                        {isParent && e.studentUserId?.name ? (
                          <span>
                            <Icon name="graduation-cap" size={14} />
                            For {e.studentUserId.name}
                          </span>
                        ) : null}
                      </p>
                      <div className="st-item-badges">
                        <ErpStatusBadge status={e.status} dot>
                          {statusLabel(e.status)}
                        </ErpStatusBadge>
                      </div>
                    </div>
                    {e.status === 'pending' && (
                      <div className="st-item-actions">
                        <LinkButton to={paymentsPath} state={{ paymentId: idOf(e.paymentId) }} icon="credit-card">
                          Pay
                        </LinkButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {list.total > 0 && <ErpPager {...list.pagerProps} noun="course" />}
          </ErpCard>
        </>
      )}

      {section === 'join' && (
        <>
          <div className="st-filter-bar">
            <ErpSearch value={search} onChange={setSearch} placeholder="Search title or tutor ID" />
            <ErpSelect
              inline
              aria-label="Class type"
              value={filters.category || 'all'}
              options={options('subject_category', { all: 'All classes', allValue: 'all' })}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value === 'all' ? '' : e.target.value, subjectId: '' }))
              }
            />
            <ErpSelect
              inline
              aria-label="Subject"
              value={filters.subjectId}
              options={[
                { value: '', label: 'All subjects' },
                ...subjects
                  .filter((s) => !filters.category || (s.category || 'ibdp') === filters.category)
                  .map((s) => ({ value: s._id, label: s.name })),
              ]}
              onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}
            />
            <ErpSelect
              inline
              aria-label="Level"
              value={filters.level}
              options={options('subject_level', { all: 'Any level' })}
              onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
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
          {isParent && !childId && (
            <ErpBanner variant="info">Select a child to enrol them.</ErpBanner>
          )}
          {loadingJoin && !catalog.length ? (
            <ErpLoadingState message="Loading courses…" />
          ) : !catalog.length ? (
            <div className="erp-card">
              <ErpEmptyState
                icon="layers"
                title="No published courses match"
                description="Try a different subject or clear the filters."
              />
            </div>
          ) : (
            <div className="st-resource-grid">
              {joinList.items.map((c) => {
                const enr = enrollmentByCourse[c._id];
                const status = enr?.status;
                return (
                  <article key={c._id} className="erp-card st-resource">
                    <div className="st-resource-body">
                      <div className="st-resource-top">
                        <span className="st-leading-icon">
                          <Icon name="layers" size={18} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="st-resource-title">{c.title}</h3>
                          <p className="st-item-meta" style={{ marginTop: '0.25rem' }}>
                            <span>{c.subjectId?.name || 'Subject'}</span>
                            {c.level ? <span>{c.level}</span> : null}
                          </p>
                        </div>
                        <FavButton
                          on={c.favorite}
                          onClick={async () => {
                            begin();
                            try {
                              if (c.favorite) await removeFavorite('course', c._id);
                              else await addFavorite('course', c._id);
                              loadJoin();
                            } catch (err) {
                              setError(errorMessage(err));
                            }
                          }}
                        />
                      </div>
                      {c.description ? <p className="st-item-desc">{c.description}</p> : null}
                      <p className="st-item-meta">
                        <span>
                          <Icon name="user" size={14} />
                          Tutor {tutorRef(c.tutorUserId)}
                        </span>
                        {c.lessonPlanIds?.length ? <span>{c.lessonPlanIds.length} lessons</span> : null}
                      </p>
                    </div>
                    <div className="st-resource-foot">
                      <span className="st-price-value">{c.price ? money(c.price, c.currency) : 'Free'}</span>
                      {status === 'active' ? (
                        <ErpBadge tone="success" icon="check">
                          Enrolled
                        </ErpBadge>
                      ) : status === 'pending' ? (
                        <LinkButton to={paymentsPath} state={{ paymentId: idOf(enr.paymentId) }} size="sm" icon="credit-card">
                          Pay to start
                        </LinkButton>
                      ) : (
                        <ErpButton
                          size="sm"
                          disabled={Boolean(busyId) || (isParent && !childId)}
                          loading={busyId === c._id}
                          onClick={() => join(c)}
                        >
                          {busyId === c._id ? 'Joining…' : c.price ? 'Join' : 'Enroll free'}
                        </ErpButton>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {joinList.total > 0 && (
            <div className="erp-card erp-card-flush">
              <ErpPager {...joinList.pagerProps} noun="course" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
