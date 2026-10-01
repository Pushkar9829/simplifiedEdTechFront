import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudentDashboard } from '../../api';
import { ErpPageHeader } from '../../components/erp';
import { formatInZone, statusBadge, tutorRef } from '../../utils/format';
import { titleCase } from './studentOptions';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (loading || !data) return <div className="empty">Loading dashboard…</div>;

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle="Classes, homework, grades, and study rhythm"
        actions={
          <Link to="/student/tutors" className="erp-btn-primary">
            Find a tutor
          </Link>
        }
      />

      <div className="grid three">
        <div className="stat">
          <div className="label">Study streak</div>
          <div className="value">{data.studyStreak || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Credits</div>
          <div className="value">{data.credits || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Stars</div>
          <div className="value">{'★'.repeat(data.stars || 0) || '—'}</div>
        </div>
        <div className="stat">
          <div className="label">Level</div>
          <div className="value">{data.level || 'Starter'}</div>
        </div>
        <div className="stat">
          <div className="label">Upcoming classes</div>
          <div className="value">{data.upcomingClasses?.length || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Unread alerts</div>
          <div className="value">{data.unreadNotifications || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Homework due</div>
          <div className="value">{data.homeworkDue?.length || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Recent grades</div>
          <div className="value">{data.recentGrades?.length || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Focus topics</div>
          <div className="value">{data.recommendedStudyPlan?.focusTopics?.length || 0}</div>
        </div>
      </div>

      <div className="grid two">
        <section className="erp-card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Upcoming classes</h2>
            <Link to="/student/bookings" className="btn secondary">
              All bookings
            </Link>
          </div>
          {!data.upcomingClasses?.length && <div className="empty">No upcoming classes.</div>}
          {data.upcomingClasses?.slice(0, 5).map((b) => (
            <div key={b._id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                <strong>{b.subjectId?.name || 'Class'}</strong>
                {b.tutorUserId && (
                  <span className="muted"> · {tutorRef(b.tutorUserId)}</span>
                )}
              </span>
              <span className="muted">{formatInZone(b.startAt, b.timezone)}</span>
            </div>
          ))}
        </section>

        <section className="erp-card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Homework due</h2>
            <Link to="/student/homework" className="btn secondary">
              Open homework
            </Link>
          </div>
          {!data.homeworkDue?.length && <div className="empty">Nothing due.</div>}
          {data.homeworkDue?.slice(0, 5).map((h) => (
            <div key={h._id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                <Link to={`/student/homework/${h._id}`}>{h.title}</Link>
              </span>
              <span className="muted">Due {formatInZone(h.deadline, h.timezone)}</span>
            </div>
          ))}
        </section>

        <section className="erp-card stack">
          <h2>Recommended study plan</h2>
          <p>{data.recommendedStudyPlan?.tip || 'Stay consistent with daily practice.'}</p>
          <p className="muted">
            Focus:{' '}
            {(data.recommendedStudyPlan?.focusTopics || []).join(', ') || 'Stay consistent'}
          </p>
          <Link to="/student/progress" className="btn secondary">
            View progress
          </Link>
        </section>

        <section className="erp-card stack">
          <h2>Recent grades</h2>
          {!data.recentGrades?.length && <div className="empty">No grades yet.</div>}
          {data.recentGrades?.map((g, i) => (
            <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{g.topic || 'Graded work'}</span>
              <strong>{g.scoreLabel || g.scoreValue}</strong>
            </div>
          ))}
        </section>
      </div>

      <section className="erp-card">
        <h2>Recent activity</h2>
        {!(data.recentActivity || []).length && <div className="empty">No recent activity.</div>}
        {(data.recentActivity || []).map((a, i) => (
          <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              <span className={statusBadge(a.type)}>{titleCase(a.type)}</span> {a.summary}
            </span>
            <span className="muted">{formatInZone(a.at)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
