import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCourse, publishCourse } from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpLoadingState,
  ErpPageHeader,
  ErpStatusBadge,
  Icon,
} from '../../components/erp';
import { money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './tutorOptions';
import { errorMessage } from '../../utils/errors';
import './tutor.css';

export default function TutorCourseDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getCourse(id));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const course = data?.course;
  if (!course) {
    return (
      <div className="page stack tutor-page">
        {error && <ErpBanner variant="danger">{error}</ErpBanner>}
        <ErpCard>
          {error ? (
            <ErpEmptyState
              icon="graduation-cap"
              title="Could not load course"
              action={
                <Link to="/tutor/courses" className="erp-btn-secondary">
                  Back to courses
                </Link>
              }
            />
          ) : (
            <ErpLoadingState message="Loading course…" />
          )}
        </ErpCard>
      </div>
    );
  }

  const plans = course.lessonPlanIds || [];

  return (
    <div className="page stack tutor-page">
      <Link to="/tutor/courses" className="tutor-back-link">
        <Icon name="arrow-left" size={14} /> Courses
      </Link>
      <ErpPageHeader
        title={course.title}
        badge={
          <ErpStatusBadge status={course.status} dot>
            {titleCase(course.status)}
          </ErpStatusBadge>
        }
        meta={
          <span className="tutor-chips text-erp-sm">
            <span className="muted">{course.subjectId?.name || 'Course'}</span>
            {course.level ? <ErpBadge>{course.level}</ErpBadge> : null}
            {course.countryId?.name ? <span className="muted">· {course.countryId.name}</span> : null}
          </span>
        }
        actions={
          <>
            <Link to={`/tutor/courses/${course._id}/edit`} className="erp-btn-secondary">
              <Icon name="pencil" size={16} />
              Edit
            </Link>
            {course.status !== 'published' && (
              <ErpButton
                loading={publishing}
                onClick={async () => {
                  setPublishing(true);
                  try {
                    await publishCourse(course._id);
                    load();
                  } catch (err) {
                    setError(errorMessage(err));
                  } finally {
                    setPublishing(false);
                  }
                }}
              >
                Publish
              </ErpButton>
            )}
          </>
        }
      />
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      <div className="tutor-detail-grid">
        <div className="stack">
          <ErpCard heading="About this course">
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {course.description || <span className="muted">No description.</span>}
            </p>
          </ErpCard>
          <ErpCard
            flush
            heading="Lesson plans"
            headerActions={<span className="muted text-erp-sm">{plans.length} included</span>}
          >
            {!plans.length ? (
              <ErpEmptyState
                icon="list-checks"
                title="No lesson plans attached"
                action={
                  <Link to={`/tutor/courses/${course._id}/edit`} className="erp-btn-secondary">
                    Add lesson plans
                  </Link>
                }
              />
            ) : (
              <ol className="tutor-plan-list">
                {plans.map((p, i) => (
                  <li key={p._id || p}>
                    <span className="tutor-plan-index">{i + 1}</span>
                    <Link className="erp-link" to={`/tutor/lesson-plans/${p._id || p}/edit`}>
                      {p.title || 'Lesson plan'}
                    </Link>
                    {p.status ? (
                      <ErpStatusBadge status={p.status} className="tutor-push-right">
                        {titleCase(p.status)}
                      </ErpStatusBadge>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </ErpCard>
        </div>
        <ErpCard flush>
          <div className="tutor-item-cover" style={{ height: 160 }}>
            {course.thumbnail ? <img src={mediaUrl(course.thumbnail)} alt="" /> : <Icon name="graduation-cap" size={32} />}
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            <p className="erp-overline" style={{ margin: 0 }}>
              Price
            </p>
            <p className="tutor-price">{course.price ? money(course.price, course.currency) : 'Free'}</p>
          </div>
        </ErpCard>
      </div>
    </div>
  );
}
