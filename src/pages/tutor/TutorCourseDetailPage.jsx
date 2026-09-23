import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCourse, publishCourse } from '../../api';
import { ErpButton, ErpCard, ErpPageHeader, ErpStatusBadge } from '../../components/erp';
import { money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './tutorOptions';

export default function TutorCourseDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await getCourse(id));
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const course = data?.course;
  if (!course) {
    return (
      <div className="page stack">
        {error && <div className="error-banner">{error}</div>}
        <div className="empty">{error ? 'Could not load course.' : 'Loading…'}</div>
      </div>
    );
  }

  return (
    <div className="page stack">
      <ErpPageHeader subtitle={`${course.subjectId?.name || 'Course'} · ${course.level || ''}`} />
      {error && <div className="error-banner">{error}</div>}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>{course.title}</h1>
        <div className="row">
          <Link to={`/tutor/courses/${course._id}/edit`} className="erp-btn-secondary">
            Edit
          </Link>
          <Link to="/tutor/courses" className="btn secondary">
            Back
          </Link>
        </div>
      </div>
      <ErpCard className="stack">
        <ErpStatusBadge status={course.status}>{titleCase(course.status)}</ErpStatusBadge>
        {course.thumbnail && (
          <img src={mediaUrl(course.thumbnail)} alt="" style={{ maxWidth: 240, borderRadius: 8 }} />
        )}
        <p>{course.description || 'No description.'}</p>
        <p>
          Price: <strong>{course.price ? money(course.price, course.currency) : 'Free'}</strong>
          {course.countryId?.name ? ` · ${course.countryId.name}` : ''}
        </p>
        <h3>Lesson plans</h3>
        {!course.lessonPlanIds?.length ? (
          <p className="muted">No lesson plans attached.</p>
        ) : (
          <ul>
            {course.lessonPlanIds.map((p) => (
              <li key={p._id || p}>
                <Link to={`/tutor/lesson-plans/${p._id || p}/edit`}>{p.title || 'Lesson plan'}</Link>
                {p.status && <span className="muted"> · {titleCase(p.status)}</span>}
              </li>
            ))}
          </ul>
        )}
        {course.status !== 'published' && (
          <ErpButton
            onClick={async () => {
              try {
                await publishCourse(course._id);
                load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            Publish
          </ErpButton>
        )}
      </ErpCard>
    </div>
  );
}
