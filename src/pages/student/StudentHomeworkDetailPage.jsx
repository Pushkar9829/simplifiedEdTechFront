import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getHomework, submitHomework } from '../../api';
import {
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpLoadingState,
  ErpPageHeader,
  ErpStatusBadge,
  ErpTextarea,
  Icon,
} from '../../components/erp';
import { tutorRef } from '../../utils/format';
import { errorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';
import { gradeLabel, schemeLabel } from '../../utils/grading';
import { mediaName, mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './studentOptions';
import { formatWhen, timeUntil, viewerZone } from './studentTime';
import { LinkButton } from './studentUi';
import './student.css';

const MAX_FILES = 5;

function FileLink({ href, name }) {
  return (
    <li>
      <a className="st-file" href={href} target="_blank" rel="noreferrer">
        <Icon name="file-text" size={16} />
        <span>{name}</span>
        <Icon name="external-link" size={14} />
      </a>
    </li>
  );
}

export default function StudentHomeworkDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const zone = viewerZone(user);
  const fileInput = useRef(null);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const detail = await getHomework(id);
      setSelected(detail);
      setNotes(detail.submission?.notes || '');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const back = (
    <Link to="/student/homework" className="st-back">
      <Icon name="chevron-left" size={16} /> All homework
    </Link>
  );

  if (loading && !selected) {
    return (
      <div className="page stack st-page">
        {back}
        <ErpLoadingState message="Loading assignment…" />
      </div>
    );
  }
  if (!selected?.assignment) {
    return (
      <div className="page stack st-page">
        {back}
        <div className="erp-card">
          <ErpEmptyState
            icon="file-text"
            title="Assignment not found"
            description={error || 'It may have been removed by your tutor.'}
            action={
              <LinkButton to="/student/homework" variant="secondary">
                Back to homework
              </LinkButton>
            }
          />
        </div>
      </div>
    );
  }

  const a = selected.assignment;
  const s = selected.submission;
  const graded = a.status === 'graded' || Boolean(s?.gradedAt);
  const fileCount = files ? files.length : 0;
  const tooMany = fileCount > MAX_FILES;
  const canSubmit = !saving && !tooMany && (notes.trim().length > 0 || fileCount > 0);
  const overdue =
    a.status === 'overdue' || (a.status === 'assigned' && a.deadline && new Date(a.deadline) < new Date());

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    setMsg('');
    const fd = new FormData();
    fd.append('notes', notes);
    if (files) [...files].forEach((f) => fd.append('files', f));
    try {
      await submitHomework(a._id, fd);
      setMsg(s ? 'Resubmitted. Your tutor will see the latest version.' : 'Submitted. Your tutor has been notified.');
      setFiles(null);
      if (fileInput.current) fileInput.current.value = '';
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack st-page">
      {back}
      <ErpPageHeader
        title={a.title}
        badge={
          <ErpStatusBadge status={overdue ? 'overdue' : a.status} dot>
            {overdue ? 'Overdue' : a.status === 'assigned' ? 'To do' : titleCase(a.status)}
          </ErpStatusBadge>
        }
        meta={
          <p className="st-item-meta">
            <span>
              <Icon name="book-open" size={14} />
              {a.subjectId?.name || 'Homework'}
            </span>
            <span className={overdue ? 'erp-text-danger' : undefined}>
              <Icon name="clock" size={14} />
              Due {formatWhen(a.deadline, zone)}
              {(a.status === 'assigned' || a.status === 'overdue') && a.deadline ? ` · ${timeUntil(a.deadline)}` : ''}
            </span>
            <span>
              <Icon name="user" size={14} />
              Tutor {tutorRef(a.tutorUserId)}
            </span>
            <span>
              <Icon name="award" size={14} />
              {schemeLabel(a.gradingScheme)}
            </span>
          </p>
        }
      />

      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}
      {error && (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      )}

      <div className="st-split">
        <div className="st-split-main">
          <ErpCard heading="Brief">
            <div className="stack">
              <p className="st-prose">{a.description || 'No description from your tutor.'}</p>
              {a.rubric ? (
                <div>
                  <p className="erp-section-title" style={{ marginBottom: '0.375rem' }}>
                    Rubric
                  </p>
                  <p className="st-prose">{a.rubric}</p>
                </div>
              ) : null}
              {!!a.attachments?.length && (
                <div>
                  <p className="erp-section-title" style={{ marginBottom: '0.5rem' }}>
                    Files from your tutor
                  </p>
                  <ul className="st-files">
                    {a.attachments.map((f) => (
                      <FileLink key={f.url} href={mediaUrl(f.url)} name={f.name || f.url} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ErpCard>

          {s && (
            <ErpCard
              heading="Your submission"
              headerActions={
                s.grade ? (
                  <span className="st-grade-pill">{gradeLabel(s.grade)}</span>
                ) : (
                  <ErpStatusBadge status="pending">Awaiting grade</ErpStatusBadge>
                )
              }
            >
              <dl className="erp-detail-grid">
                <dt>Grade</dt>
                <dd>{s.grade ? gradeLabel(s.grade) : 'Pending'}</dd>
                <dt>Feedback</dt>
                <dd>{s.feedback || '—'}</dd>
                {s.notes ? (
                  <>
                    <dt>Your notes</dt>
                    <dd>{s.notes}</dd>
                  </>
                ) : null}
              </dl>
              {!!s.files?.length && (
                <ul className="st-files" style={{ marginTop: '1rem' }}>
                  {s.files.map((f, i) => (
                    <FileLink key={`${mediaUrl(f) || i}-${i}`} href={mediaUrl(f)} name={mediaName(f)} />
                  ))}
                </ul>
              )}
            </ErpCard>
          )}
        </div>

        <aside className="st-split-side st-sticky">
          {graded ? (
            <ErpCard>
              <ErpEmptyState
                icon="award"
                title="Graded"
                description="Submissions are closed for this assignment."
              />
            </ErpCard>
          ) : (
            <ErpCard
              heading={s ? 'Resubmit work' : 'Submit work'}
              description={s ? 'A new submission replaces your previous one.' : 'Add notes, files, or both.'}
            >
              <div className="stack" style={{ gap: '0.875rem' }}>
                <ErpTextarea
                  label="Notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything your tutor should know"
                />
                <div className="field" style={{ marginBottom: 0 }}>
                  <span className="erp-label">Files</span>
                  <label className="st-dropzone">
                    <span className="st-dropzone-icon">
                      <Icon name="upload" size={18} />
                    </span>
                    <strong style={{ fontWeight: 500 }}>
                      {fileCount ? `${fileCount} file${fileCount === 1 ? '' : 's'} selected` : 'Choose files to upload'}
                    </strong>
                    <span className="muted">Up to {MAX_FILES} files</span>
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      onChange={(e) => setFiles(e.target.files?.length ? e.target.files : null)}
                    />
                  </label>
                  {fileCount > 0 && (
                    <ul className="st-files" style={{ marginTop: '0.5rem' }}>
                      {[...files].map((f) => (
                        <li key={f.name} className="st-file">
                          <Icon name="file-text" size={16} />
                          <span>{f.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tooMany && (
                    <p className="erp-field-error" role="alert">
                      You selected {fileCount} files. Attach at most {MAX_FILES}.
                    </p>
                  )}
                </div>
                <ErpButton block icon="upload" disabled={!canSubmit} loading={saving} onClick={submit}>
                  {saving ? 'Submitting…' : s ? 'Resubmit assignment' : 'Submit assignment'}
                </ErpButton>
                {!canSubmit && !saving && !tooMany && (
                  <p className="muted" style={{ margin: 0 }}>
                    Add notes or attach a file to submit.
                  </p>
                )}
              </div>
            </ErpCard>
          )}
        </aside>
      </div>
    </div>
  );
}
