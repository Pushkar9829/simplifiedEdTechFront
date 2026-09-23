import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deliverProject, getProject, setProjectStatus } from '../../api';
import { ErpButton, ErpCard, ErpPageHeader, ErpStatusBadge } from '../../components/erp';
import { formatDate, money } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { titleCase } from './tutorOptions';

export default function TutorProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);

  const load = useCallback(async () => {
    try {
      setProject(await getProject(id));
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!project) {
    return (
      <div className="page stack">
        {error && <div className="error-banner">{error}</div>}
        <div className="empty">{error ? 'Could not load project.' : 'Loading…'}</div>
      </div>
    );
  }

  const canEdit = ['proposed', 'accepted'].includes(project.status);

  return (
    <div className="page stack">
      <ErpPageHeader subtitle={`${titleCase(project.kind)} · due ${formatDate(project.deliveryDate)}`} />
      {error && <div className="error-banner">{error}</div>}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>{project.name}</h1>
        <div className="row">
          {canEdit && (
            <Link to={`/tutor/projects/${project._id}/edit`} className="erp-btn-secondary">
              Edit
            </Link>
          )}
          <Link to="/tutor/projects" className="btn secondary">
            Back
          </Link>
        </div>
      </div>
      <ErpCard className="stack">
        <ErpStatusBadge status={project.status}>{titleCase(project.status)}</ErpStatusBadge>
        <p>{project.description || 'No description.'}</p>
        <dl className="erp-detail-grid">
          <dt>Student</dt>
          <dd>{project.studentUserId?.name || project.studentUserId?.phone || '—'}</dd>
          <dt>Price</dt>
          <dd>{money(project.price, project.currency)}</dd>
          <dt>Delivery</dt>
          <dd>{formatDate(project.deliveryDate)}</dd>
        </dl>
        {!!project.attachments?.length && (
          <div>
            <strong>Brief</strong>
            <ul>
              {project.attachments.map((f) => (
                <li key={f.url}>
                  <a href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                    {f.name || 'file'}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!project.deliverables?.length && (
          <div>
            <strong>Deliverables</strong>
            <ul>
              {project.deliverables.map((f) => (
                <li key={f.url}>
                  <a href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                    {f.name || 'file'}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="stack">
          {project.status === 'accepted' && (
            <ErpButton onClick={() => setProjectStatus(project._id, 'in_progress').then(load)}>
              Start
            </ErpButton>
          )}
          {['accepted', 'in_progress', 'delivered'].includes(project.status) && (
            <>
              <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              <ErpButton
                onClick={async () => {
                  const fd = new FormData();
                  files.forEach((f) => fd.append('deliverables', f));
                  await deliverProject(project._id, fd);
                  setFiles([]);
                  load();
                }}
              >
                Upload deliverables
              </ErpButton>
            </>
          )}
        </div>
      </ErpCard>
    </div>
  );
}
