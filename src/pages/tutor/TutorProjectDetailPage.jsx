import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deliverProject, getProject, setProjectStatus } from '../../api';
import {
  ErpAvatar,
  ErpBanner,
  ErpButton,
  ErpCard,
  ErpEmptyState,
  ErpLoadingState,
  ErpPageHeader,
  ErpStatusBadge,
  Icon,
} from '../../components/erp';
import { errorMessage } from '../../utils/errors';
import { formatDate, money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './tutorOptions';
import './tutor.css';

export default function TutorProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setProject(await getProject(id));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    setFiles([]);
    setFileKey((k) => k + 1);
    setMsg('');
    setError('');
    load();
  }, [load]);

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      await setProjectStatus(project._id, 'in_progress');
      setMsg('Project started');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not start the project'));
    } finally {
      setBusy(false);
    }
  };

  const deliver = async () => {
    if (!files.length) {
      setError('Choose at least one file to deliver');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('deliverables', f));
      await deliverProject(project._id, fd);
      setFiles([]);
      setFileKey((k) => k + 1);
      setMsg('Deliverables uploaded');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  if (!project) {
    return (
      <div className="page stack tutor-page">
        {error && <ErpBanner variant="danger">{error}</ErpBanner>}
        <ErpCard>
          {error ? (
            <ErpEmptyState
              icon="folder"
              title="Could not load project"
              action={
                <Link to="/tutor/projects" className="erp-btn-secondary">
                  Back to projects
                </Link>
              }
            />
          ) : (
            <ErpLoadingState message="Loading project…" />
          )}
        </ErpCard>
      </div>
    );
  }

  const canEdit = ['proposed', 'accepted'].includes(project.status);
  const canDeliver = ['accepted', 'in_progress', 'delivered'].includes(project.status);
  const studentLabel = project.studentUserId?.name || project.studentUserId?.phone || 'Open to join';

  const fileList = (list) => (
    <ul className="erp-divided tutor-plain-list">
      {list.map((f) => (
        <li key={f.url} className="tutor-file-row">
          <a className="erp-link tutor-file-link" href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
            <Icon name="file-text" size={14} />
            {f.name || 'file'}
          </a>
          <Icon name="external-link" size={14} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="page stack tutor-page">
      <Link to="/tutor/projects" className="tutor-back-link">
        <Icon name="arrow-left" size={14} /> Projects
      </Link>
      <ErpPageHeader
        title={project.name}
        badge={
          <ErpStatusBadge status={project.status} dot>
            {titleCase(project.status)}
          </ErpStatusBadge>
        }
        meta={
          <span className="tutor-chips text-erp-sm">
            <span className="muted">{titleCase(project.kind)}</span>
            <span className="muted">·</span>
            <span className="muted">Due {formatDate(project.deliveryDate)}</span>
            <span className="muted">·</span>
            <strong className="num">{money(project.price, project.currency)}</strong>
          </span>
        }
        actions={
          <>
            {canEdit && (
              <Link to={`/tutor/projects/${project._id}/edit`} className="erp-btn-secondary">
                <Icon name="pencil" size={16} />
                Edit
              </Link>
            )}
            {project.status === 'accepted' && (
              <ErpButton loading={busy} onClick={start}>
                Start project
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
      {msg && (
        <ErpBanner variant="success" onDismiss={() => setMsg('')}>
          {msg}
        </ErpBanner>
      )}

      <div className="tutor-detail-grid">
        <div className="stack">
          <ErpCard heading="Brief">
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {project.description || <span className="muted">No description.</span>}
            </p>
            {!!project.attachments?.length && <div style={{ marginTop: '1rem' }}>{fileList(project.attachments)}</div>}
          </ErpCard>

          <ErpCard
            heading="Deliverables"
            description={canDeliver ? 'Upload finished work — the student is notified.' : undefined}
          >
            {project.deliverables?.length ? (
              fileList(project.deliverables)
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Nothing delivered yet.
              </p>
            )}
            {canDeliver && (
              <div className="tutor-upload-row" style={{ marginTop: '1rem' }}>
                <input
                  key={fileKey}
                  type="file"
                  multiple
                  aria-label="Deliverable files"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                <ErpButton size="sm" icon="upload" disabled={!files.length} loading={busy} onClick={deliver}>
                  {busy ? 'Uploading…' : 'Upload deliverables'}
                </ErpButton>
              </div>
            )}
          </ErpCard>
        </div>

        <ErpCard heading="Details">
          <dl className="erp-detail-grid tutor-detail-dl">
            <dt>Student</dt>
            <dd>
              <span className="tutor-cell-person">
                <ErpAvatar name={studentLabel} size="xs" />
                {studentLabel}
              </span>
            </dd>
            <dt>Fee</dt>
            <dd className="num">{money(project.price, project.currency)}</dd>
            <dt>Delivery</dt>
            <dd>{formatDate(project.deliveryDate)}</dd>
            <dt>Kind</dt>
            <dd>{titleCase(project.kind)}</dd>
          </dl>
          <p className="muted text-erp-xs" style={{ margin: '1rem 0 0' }}>
            The fee is charged to the student or parent. Students do not receive payment.
          </p>
        </ErpCard>
      </div>
    </div>
  );
}
