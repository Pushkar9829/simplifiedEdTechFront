import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteCourse, listMyCourses, publishCourse } from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpConfirm,
  ErpEmptyState,
  ErpPager,
  ErpPageHeader,
  ErpSearch,
  ErpSkeleton,
  ErpStatusBadge,
  ErpTabs,
  Icon,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import TutorRowMenu from './TutorRowMenu';
import './tutor.css';

export default function TutorCourses() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState('');
  const [tab, setTab] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const r = await listMyCourses();
      setItems(Array.isArray(r) ? r : r?.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const publish = async (c) => {
    setPublishing(c._id);
    setError('');
    try {
      await publishCourse(c._id);
      setMsg(`“${c.title}” is published`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPublishing('');
    }
  };

  const visible = tab === 'all' ? items : items.filter((c) => c.status === tab);
  const list = useListFilter(
    visible,
    (c) => [c.title, c.description, c.subjectId?.name, c.status].filter(Boolean).join(' '),
    { resetKey: tab }
  );
  const count = (s) => items.filter((c) => c.status === s).length;

  return (
    <div className="page stack tutor-page">
      <ErpPageHeader
        subtitle="Bundle your lesson plans into a course students can enrol in."
        actions={
          <Link to="/tutor/courses/new" className="erp-btn-primary">
            <Icon name="plus" size={16} />
            Launch course
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
              { value: 'draft', label: 'Draft', count: count('draft') || null },
              { value: 'published', label: 'Published', count: count('published') || null },
            ]}
          />
          <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search courses" />
        </div>
      </div>

      {loading ? (
        <div className="tutor-card-grid">
          {[0, 1, 2].map((i) => (
            <ErpSkeleton key={i} width="100%" height="12rem" radius="12px" />
          ))}
        </div>
      ) : !visible.length ? (
        <ErpCard>
          <ErpEmptyState
            icon="graduation-cap"
            title={tab === 'all' ? 'No courses yet' : `No ${tab} courses`}
            description="Pick a few lesson plans, set a price and publish."
            action={
              <Link to="/tutor/courses/new" className="erp-btn-primary">
                Launch your first course
              </Link>
            }
          />
        </ErpCard>
      ) : list.noMatch ? (
        <ErpCard>
          <ErpEmptyState icon="search" title="No courses match that search" />
        </ErpCard>
      ) : (
        <>
          <div className="tutor-card-grid">
            {list.items.map((c) => (
              <article key={c._id} className="erp-card tutor-item-card">
                <Link to={`/tutor/courses/${c._id}`} className="tutor-item-cover" aria-label={c.title}>
                  {c.thumbnail ? (
                    <img src={mediaUrl(c.thumbnail)} alt="" />
                  ) : (
                    <Icon name="graduation-cap" size={28} />
                  )}
                </Link>
                <div className="tutor-item-body">
                  <div className="tutor-item-top">
                    <ErpStatusBadge status={c.status} dot>
                      {titleCase(c.status)}
                    </ErpStatusBadge>
                    <TutorRowMenu
                      label={`Actions for ${c.title}`}
                      items={[
                        { label: 'View', icon: 'eye', onClick: () => navigate(`/tutor/courses/${c._id}`) },
                        { label: 'Edit', icon: 'pencil', onClick: () => navigate(`/tutor/courses/${c._id}/edit`) },
                        { label: 'Delete', icon: 'trash', danger: true, onClick: () => setPending(c) },
                      ]}
                    />
                  </div>
                  <Link to={`/tutor/courses/${c._id}`} className="tutor-item-title">
                    {c.title}
                  </Link>
                  {c.description ? <p className="tutor-item-desc">{c.description}</p> : null}
                  <div className="tutor-chips">
                    {c.subjectId?.name ? <span className="erp-tag">{c.subjectId.name}</span> : null}
                    {c.level ? <ErpBadge>{c.level}</ErpBadge> : null}
                    <span className="muted text-erp-xs">
                      {c.lessonPlanIds?.length || 0} plan{c.lessonPlanIds?.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="tutor-item-foot">
                  <strong className="num">{c.price ? money(c.price, c.currency) : 'Free'}</strong>
                  {c.status !== 'published' ? (
                    <ErpButton size="sm" variant="secondary" loading={publishing === c._id} onClick={() => publish(c)}>
                      Publish
                    </ErpButton>
                  ) : (
                    <Link to={`/tutor/courses/${c._id}`} className="erp-btn-ghost erp-btn-sm">
                      View
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {list.pages > 1 && (
            <ErpCard size="sm" flush>
              <ErpPager {...list.pagerProps} noun="course" />
            </ErpCard>
          )}
        </>
      )}
      <ErpConfirm
        open={Boolean(pending)}
        title="Delete course"
        message={pending ? `Delete “${pending.title}”?` : ''}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => !deleting && setPending(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteCourse(pending._id);
            setPending(null);
            setMsg('Course deleted');
            load();
          } catch (err) {
            setError(errorMessage(err));
            setPending(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
