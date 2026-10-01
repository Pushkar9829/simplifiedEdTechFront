import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getHomework, submitHomework } from '../../api';
import { ErpButton, ErpPageHeader, ErpTabs } from '../../components/erp';
import { formatDate, tutorRef } from '../../utils/format';
import { gradeLabel, schemeLabel } from '../../utils/grading';
import { mediaName, mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './studentOptions';

export default function StudentHomeworkDetailPage() {
  const { id } = useParams();
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('brief');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const detail = await getHomework(id);
      setSelected(detail);
      setNotes(detail.submission?.notes || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <div className="empty">Loading assignment…</div>;
  if (!selected?.assignment) {
    return (
      <div className="page stack">
        {error && <div className="error-banner">{error}</div>}
        <div className="erp-card empty">
          Assignment not found. <Link to="/student/homework">Back</Link>
        </div>
      </div>
    );
  }

  const a = selected.assignment;
  const s = selected.submission;

  return (
    <div className="page stack">
      <ErpPageHeader
        subtitle={`${a.subjectId?.name || 'Homework'} · due ${formatDate(a.deadline)} · ${titleCase(a.status)}`}
        actions={
          <Link to="/student/homework" className="btn secondary">
            Back to homework
          </Link>
        }
      />
      <h1 style={{ margin: 0 }}>{a.title}</h1>

      {msg && <div className="success-banner">{msg}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'brief', label: 'Brief' },
            { value: 'submit', label: 'Submit' },
          ]}
        />
      </div>

      {tab === 'brief' && (
        <section className="erp-card stack">
          <p>{a.description || 'No description.'}</p>
          <p className="muted">Rubric: {a.rubric || '—'}</p>
          <p className="muted">
            Tutor: {tutorRef(a.tutorUserId)} · {schemeLabel(a.gradingScheme)}
          </p>
          {!!a.attachments?.length && (
            <div>
              <strong>Files from your tutor</strong>
              <ul>
                {a.attachments.map((f) => (
                  <li key={f.url}>
                    <a className="erp-link" href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                      {f.name || f.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s && (
            <div>
              <h3>Current submission</h3>
              <p>
                Grade: <strong>{s.grade ? gradeLabel(s.grade) : 'Pending'}</strong>
              </p>
              <p>Feedback: {s.feedback || '—'}</p>
              {s.notes && <p className="muted">Notes: {s.notes}</p>}
              {!!s.files?.length && (
                <p>
                  Files:{' '}
                  {s.files.map((f, i) => (
                    <span key={`${mediaUrl(f) || i}-${i}`}>
                      {i > 0 ? ', ' : ''}
                      <a className="erp-link" href={mediaUrl(f)} target="_blank" rel="noreferrer">
                        {mediaName(f)}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {tab === 'submit' && (
        <section className="erp-card stack">
          <h2 style={{ margin: 0 }}>Submit work</h2>
          <div className="field">
            <label>Notes</label>
            <textarea
              className="erp-search"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Files</label>
            <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
          </div>
          <ErpButton
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError('');
              setMsg('');
              const fd = new FormData();
              fd.append('notes', notes);
              if (files) [...files].forEach((f) => fd.append('files', f));
              try {
                await submitHomework(a._id, fd);
                setMsg('Submitted');
                setFiles(null);
                load();
              } catch (err) {
                setError(err.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Submitting…' : 'Submit assignment'}
          </ErpButton>
        </section>
      )}
    </div>
  );
}
