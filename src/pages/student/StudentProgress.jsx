import { useEffect, useState } from 'react';
import { getProgress, listSubjects } from '../../api';
import {
  ErpBadge,
  ErpBanner,
  ErpCard,
  ErpEmptyState,
  ErpLoadingState,
  ErpPageHeader,
  ErpStat,
  Icon,
} from '../../components/erp';
import { errorMessage } from '../../utils/errors';
import { subjectNameMap } from './studentTime';
import { LinkButton, Meter } from './studentUi';
import './student.css';

/** Scores may be on the IB 1–7 scale or a percentage; show both sensibly. */
function scoreView(avg) {
  const n = Number(avg || 0);
  if (n <= 7) return { pct: (n / 7) * 100, text: `${n.toFixed(1)} / 7` };
  return { pct: Math.min(100, n), text: `${n.toFixed(0)}%` };
}

export default function StudentProgress() {
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProgress(), listSubjects({ limit: 500 })])
      .then(([p, s]) => {
        setData(p);
        setSubjects(s.items || []);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const names = subjectNameMap(subjects, data?.records || []);
  // Keys may be subject ids or (for predicted grades) plain subject names.
  const subjectName = (id) => names[String(id)] || (/^[a-f0-9]{24}$/i.test(String(id)) ? 'Subject' : String(id));

  if (loading || !data) {
    return (
      <div className="page stack st-page">
        {error ? (
          <ErpBanner variant="danger" title="Could not load progress">
            {error}
          </ErpBanner>
        ) : (
          <ErpLoadingState message="Loading progress…" />
        )}
      </div>
    );
  }

  const bySubject = [...(data.bySubject || [])].sort((a, b) => Number(b.avgScore || 0) - Number(a.avgScore || 0));
  const predicted = Object.entries(data.predictedGrades || {});
  const weak = data.weakTopics || [];
  const strong = data.strongTopics || [];
  const badges = data.badges || [];

  return (
    <div className="page stack st-page">
      <ErpPageHeader
        subtitle="Scores, predicted grades and badges from your work."
        actions={
          <LinkButton to="/student/progress/log" icon="plus">
            Log study hours
          </LinkButton>
        }
      />
      {error && <ErpBanner variant="danger">{error}</ErpBanner>}

      <div className="st-kpis">
        <ErpStat
          label="Study streak"
          value={`${data.studyStreak || 0} day${data.studyStreak === 1 ? '' : 's'}`}
          icon="flame"
          tone="warning"
          hint="Log hours daily to grow it"
        />
        <ErpStat
          label="Credits"
          value={data.credits || 0}
          icon="award"
          tone="success"
          hint={`${data.stars || 0} star${data.stars === 1 ? '' : 's'} earned`}
        />
        <ErpStat label="Level" value={data.level || 'Starter'} icon="trending-up" hint="Based on credits" />
        <ErpStat
          label="Badges"
          value={badges.length}
          icon="sparkles"
          tone="info"
          hint={`${strong.length} strong · ${weak.length} to improve`}
        />
      </div>

      <div className="st-two">
        <ErpCard heading="Subject performance" description="Average score across graded work.">
          {!bySubject.length ? (
            <ErpEmptyState
              icon="bar-chart"
              title="No subject scores yet"
              description="Scores appear once tutors grade your homework."
            />
          ) : (
            <div className="stack" style={{ gap: '1rem' }}>
              {bySubject.map((row) => {
                const v = scoreView(row.avgScore);
                return <Meter key={row._id} label={subjectName(row._id)} hint={v.text} value={v.pct} />;
              })}
            </div>
          )}
        </ErpCard>

        <ErpCard heading="Predicted grades" description="Set by your tutors.">
          {!predicted.length ? (
            <ErpEmptyState icon="target" title="No predicted grades yet" />
          ) : (
            <ul className="st-mini-list">
              {predicted.map(([subject, grade]) => (
                <li key={subject} className="st-mini-item">
                  <span className="st-mini-body">
                    <span className="st-mini-title">{subjectName(subject)}</span>
                  </span>
                  <span className="st-grade-pill">{grade}</span>
                </li>
              ))}
            </ul>
          )}
        </ErpCard>

        <ErpCard heading="Topics">
          {!weak.length && !strong.length ? (
            <ErpEmptyState icon="list-checks" title="No topic insights yet" />
          ) : (
            <div className="stack" style={{ gap: '1rem' }}>
              <div className="stack" style={{ gap: '0.5rem' }}>
                <span className="row" style={{ gap: '0.375rem' }}>
                  <Icon name="target" size={15} />
                  <strong style={{ fontWeight: 500 }}>Focus next</strong>
                </span>
                {weak.length ? (
                  <div className="st-topic-chips">
                    {weak.map((t) => (
                      <ErpBadge key={t} tone="warning">
                        {t}
                      </ErpBadge>
                    ))}
                  </div>
                ) : (
                  <span className="muted">Nothing flagged.</span>
                )}
              </div>
              <div className="stack" style={{ gap: '0.5rem' }}>
                <span className="row" style={{ gap: '0.375rem' }}>
                  <Icon name="check-circle" size={15} />
                  <strong style={{ fontWeight: 500 }}>Strong</strong>
                </span>
                {strong.length ? (
                  <div className="st-topic-chips">
                    {strong.map((t) => (
                      <ErpBadge key={t} tone="success">
                        {t}
                      </ErpBadge>
                    ))}
                  </div>
                ) : (
                  <span className="muted">Keep going — strengths appear as you are graded.</span>
                )}
              </div>
            </div>
          )}
        </ErpCard>

        <ErpCard heading="Badges">
          {!badges.length ? (
            <ErpEmptyState icon="award" title="No badges yet" description="Earn badges by keeping your streak and submitting on time." />
          ) : (
            <div className="st-topic-chips">
              {badges.map((b) => (
                <ErpBadge key={b._id} tone="brand" icon="award">
                  {b.badgeId?.name || 'Badge'}
                </ErpBadge>
              ))}
            </div>
          )}
        </ErpCard>
      </div>
    </div>
  );
}
