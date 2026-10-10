import { ErpBanner, ErpButton, ErpEmptyState, ErpModal, Icon } from './erp';
import { mediaUrl } from '../utils/mediaUrl';

function openUrl(url) {
  if (url) window.open(url, '_blank', 'noopener');
}

function providerLabel(provider) {
  if (provider === 'meet') return 'Google Meet';
  if (provider === 'teams') return 'Microsoft Teams';
  return 'Zoom';
}

function ToolRow({ icon, title, hint, onOpen, primary = false }) {
  return (
    <li className="erp-kv-row">
      <span className="row" style={{ gap: '0.75rem', minWidth: 0 }}>
        <span className={`erp-attention-icon ${primary ? 'is-brand' : ''}`}>
          <Icon name={icon} size={16} />
        </span>
        <span style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', fontWeight: 500 }}>{title}</strong>
          {hint ? <span className="muted text-erp-xs">{hint}</span> : null}
        </span>
      </span>
      <ErpButton
        variant={primary ? 'primary' : 'secondary'}
        size="sm"
        iconRight="external-link"
        onClick={onOpen}
      >
        Open
      </ErpButton>
    </li>
  );
}

export default function ClassToolsModal({ open, join, onClose }) {
  if (!join) return null;
  const tools = join.classTools || {};
  const provider = join.meetingProvider || 'zoom';
  const meetingUrl =
    join.meetingUrl ||
    (provider === 'meet' ? tools.meetUrl : provider === 'teams' ? tools.teamsUrl : tools.zoomUrl);
  const history = join.classHistory || [];
  const opensAt = join.opensAt ? new Date(join.opensAt) : null;
  const notOpenYet = Boolean(opensAt && !Number.isNaN(opensAt.getTime()) && Date.now() < opensAt.getTime());
  const hasAny = Boolean(meetingUrl || tools.docsUrl || tools.whiteboardUrl);
  return (
    <ErpModal
      open={open}
      title="Class tools"
      onClose={onClose}
      footer={
        <ErpButton variant="secondary" onClick={onClose}>
          Done
        </ErpButton>
      }
    >
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          Everything for this class in one place. The same links were also sent in Messages.
        </p>
        {notOpenYet && (
          <ErpBanner variant="info" icon="clock" title={`${providerLabel(provider)} is not open yet`}>
            Opens at {opensAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}. Docs and the
            whiteboard are available now.
          </ErpBanner>
        )}
        {hasAny ? (
          <ul className="erp-divided" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {meetingUrl && !notOpenYet && (
              <ToolRow
                primary
                icon="video"
                title={providerLabel(provider)}
                hint="Live video classroom"
                onOpen={() => openUrl(meetingUrl)}
              />
            )}
            {tools.meetUrl && provider !== 'meet' && !notOpenYet && (
              <ToolRow icon="video" title="Google Meet" hint="Backup video link" onOpen={() => openUrl(tools.meetUrl)} />
            )}
            {tools.teamsUrl && provider !== 'teams' && !notOpenYet && (
              <ToolRow icon="video" title="Teams" hint="Backup video link" onOpen={() => openUrl(tools.teamsUrl)} />
            )}
            {tools.docsUrl && (
              <ToolRow icon="file-text" title="Google Docs" hint="Shared notes" onOpen={() => openUrl(tools.docsUrl)} />
            )}
            {tools.whiteboardUrl && (
              <ToolRow
                icon="layers"
                title="Whiteboard"
                hint="Draw and explain together"
                onOpen={() => openUrl(tools.whiteboardUrl)}
              />
            )}
          </ul>
        ) : (
          <ErpEmptyState icon="link" title="No class links yet" description="Links appear here once the class is set up." />
        )}
        {!!history.length && (
          <div className="stack" style={{ gap: '0.5rem' }}>
            <h3 className="erp-section-title" style={{ margin: 0 }}>
              Class files
            </h3>
            <ul className="erp-divided" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {history.map((f, idx) => (
                <li key={f.url || idx} className="erp-kv-row">
                  <span className="row" style={{ gap: '0.5rem', minWidth: 0 }}>
                    <Icon name="file-text" size={16} />
                    <span style={{ overflowWrap: 'anywhere' }}>{f.label || f.name || 'Class file'}</span>
                  </span>
                  <a className="erp-link" href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ErpModal>
  );
}
