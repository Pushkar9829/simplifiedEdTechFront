import { ErpButton, ErpModal } from './erp';

function openUrl(url) {
  if (url) window.open(url, '_blank', 'noopener');
}

export default function ClassToolsModal({ open, join, onClose }) {
  if (!join) return null;
  const tools = join.classTools || {};
  return (
    <ErpModal open={open} title="Class tools" onClose={onClose}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>
          Zoom, Google Docs, and the whiteboard open from here. The same links were sent in Messages.
        </p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {join.meetingUrl && (
            <ErpButton onClick={() => openUrl(join.meetingUrl)}>Open Zoom</ErpButton>
          )}
          {tools.docsUrl && (
            <ErpButton variant="secondary" onClick={() => openUrl(tools.docsUrl)}>
              Google Docs
            </ErpButton>
          )}
          {tools.whiteboardUrl && (
            <ErpButton variant="secondary" onClick={() => openUrl(tools.whiteboardUrl)}>
              Whiteboard
            </ErpButton>
          )}
        </div>
        {!join.meetingUrl && !tools.docsUrl && !tools.whiteboardUrl && (
          <div className="muted">No class links yet.</div>
        )}
      </div>
    </ErpModal>
  );
}
