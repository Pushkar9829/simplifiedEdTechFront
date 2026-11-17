import { ErpBanner, ErpButton, ErpModal, Icon } from './erp';
import { mediaUrl } from '../utils/mediaUrl';

function openUrl(url) {
  if (url) window.open(url, '_blank', 'noopener');
}

function providerLabel(provider, url = '') {
  if (String(url).includes('meet.jit.si') || provider === 'jitsi') return 'Class room';
  if (provider === 'meet') return 'Google Meet';
  if (provider === 'teams') return 'Microsoft Teams';
  return 'Zoom';
}

function docsTitle(url = '') {
  return /docs\.google\.com/i.test(url) ? 'Shared Google Doc' : 'Class notes';
}

function ToolRow({ icon, title, hint, url, primary = false, emptyText = 'Not set yet' }) {
  return (
    <li className="erp-kv-row">
      <span className="row" style={{ gap: '0.75rem', minWidth: 0, flexWrap: 'nowrap' }}>
        <span className={`erp-attention-icon ${primary ? 'is-brand' : ''}`}>
          <Icon name={icon} size={16} />
        </span>
        <span style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', fontWeight: 500 }}>{title}</strong>
          <span className="muted text-erp-xs" style={{ overflowWrap: 'anywhere' }}>
            {url ? hint : emptyText}
          </span>
        </span>
      </span>
      {url ? (
        <ErpButton
          variant={primary ? 'primary' : 'secondary'}
          size="sm"
          iconRight="external-link"
          onClick={() => openUrl(url)}
        >
          Open
        </ErpButton>
      ) : (
        <span className="erp-status-badge erp-status-neutral">Not set</span>
      )}
    </li>
  );
}

const LINK_KINDS = ['meeting', 'docs', 'whiteboard', 'link'];

/**
 * Class links for one booking: tutor-set meeting link (+ passcode), shared doc and whiteboard,
 * with "Not set yet" states. Available before and after class. `onEditLinks` (tutor) adds an Edit button.
 */
export default function ClassToolsModal({ open, join, onClose, onEditLinks }) {
  if (!join) return null;
  const tools = join.classTools || {};
  const provider = join.provider || join.meetingProvider || 'zoom';
  const meetingUrl = join.meetingUrl || join.joinUrl || '';
  const passcode = join.meetingPasscode || join.password || '';
  const history = join.classHistory || [];
  const recordings = history.filter((f) => f.kind === 'recording');
  const files = history.filter((f) => !LINK_KINDS.includes(f.kind) && f.kind !== 'recording');
  const pastLinks = history.filter(
    (f) => LINK_KINDS.includes(f.kind) && f.url && ![meetingUrl, tools.docsUrl, tools.whiteboardUrl].includes(f.url)
  );
  const opensAt = join.opensAt ? new Date(join.opensAt) : null;
  const notOpenYet = Boolean(opensAt && !Number.isNaN(opensAt.getTime()) && Date.now() < opensAt.getTime());
  const online = join.deliveryMode !== 'offline';
  return (
    <ErpModal
      open={open}
      title="Class tools"
      onClose={onClose}
      footer={
        <>
          {onEditLinks ? (
            <ErpButton variant="secondary" icon="pencil" onClick={onEditLinks}>
              Edit links
            </ErpButton>
          ) : null}
          <ErpButton variant="secondary" onClick={onClose}>
            Done
          </ErpButton>
        </>
      }
    >
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          {online
            ? 'A live room, shared notes and a whiteboard are created with the booking. The tutor can replace any link. Cloud recordings appear here after class when Zoom is connected.'
            : 'Shared notes and a whiteboard are created with the booking. The tutor can replace any link.'}
        </p>
        {online && notOpenYet && meetingUrl && (
          <ErpBanner variant="info" icon="clock" title={`${providerLabel(provider, meetingUrl)} opens soon`}>
            The class starts at {opensAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}. You
            can open the notes and whiteboard now.
          </ErpBanner>
        )}
        <ul className="erp-divided" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {online ? (
            <ToolRow
              primary
              icon="video"
              title={providerLabel(provider, meetingUrl)}
              hint={passcode ? `Live video classroom · passcode ${passcode}` : 'Live video classroom'}
              url={meetingUrl}
              emptyText="Opening a class room…"
            />
          ) : null}
          <ToolRow
            icon="file-text"
            title={docsTitle(tools.docsUrl)}
            hint="Both of you can edit these notes"
            url={tools.docsUrl}
            emptyText="Opening class notes…"
          />
          <ToolRow
            icon="layers"
            title={/excalidraw/i.test(tools.whiteboardUrl || '') ? 'Live whiteboard' : 'Whiteboard'}
            hint="Draw and explain together"
            url={tools.whiteboardUrl}
            emptyText="Opening a whiteboard…"
          />
        </ul>
        {!!pastLinks.length && (
          <div className="stack" style={{ gap: '0.5rem' }}>
            <h3 className="erp-section-title" style={{ margin: 0 }}>
              Earlier links
            </h3>
            <ul className="erp-divided" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {pastLinks.map((f, idx) => (
                <li key={`${f.url}-${idx}`} className="erp-kv-row">
                  <span className="row" style={{ gap: '0.5rem', minWidth: 0 }}>
                    <Icon name="link" size={16} />
                    <span style={{ overflowWrap: 'anywhere' }}>{f.label || f.kind}</span>
                  </span>
                  <a className="erp-link" href={f.url} target="_blank" rel="noreferrer noopener">
                    Open
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!recordings.length && (
          <div className="stack" style={{ gap: '0.5rem' }}>
            <h3 className="erp-section-title" style={{ margin: 0 }}>
              Recordings
            </h3>
            <ul className="erp-divided" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {recordings.map((f, idx) => (
                <li key={f.url || idx} className="erp-kv-row">
                  <span className="row" style={{ gap: '0.5rem', minWidth: 0 }}>
                    <Icon name="video" size={16} />
                    <span style={{ overflowWrap: 'anywhere' }}>{f.label || 'Cloud recording'}</span>
                  </span>
                  <a className="erp-link" href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!files.length && (
          <div className="stack" style={{ gap: '0.5rem' }}>
            <h3 className="erp-section-title" style={{ margin: 0 }}>
              Class files
            </h3>
            <ul className="erp-divided" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {files.map((f, idx) => (
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
