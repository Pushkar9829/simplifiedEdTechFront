import { useEffect, useState } from 'react';
import { getCalendarFeed, revokeCalendarFeed, rotateCalendarFeed } from '../api';
import { ErpBanner, ErpButton, ErpConfirm, ErpModal, Icon } from './erp';
import { errorMessage } from '../utils/errors';
import './bookingTools.css';

/** "Subscribe to my calendar": a private ICS address any calendar app can follow (decision #6). */
export function CalendarFeedPanel() {
  const [feed, setFeed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    let live = true;
    getCalendarFeed()
      .then((d) => live && setFeed(d))
      .catch((err) => live && setError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, []);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      setFeed(await fn());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feed.url);
      setCopied(true);
    } catch {
      setError('Copy failed. Select the address and copy it by hand.');
    }
  };

  return (
    <div className="bk-feed">
      <p className="muted" style={{ margin: 0 }}>
        Class times are stored in UTC and shown in your timezone and the other person’s timezone. Add this feed to Google
        Calendar so booked classes follow your country and timezone. Keep the address private.
      </p>
      {error ? (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      ) : null}
      {!feed ? (
        <span className="muted">Loading…</span>
      ) : feed.active ? (
        <>
          <div className="bk-feed-url">
            <input
              className="erp-input"
              readOnly
              value={feed.url}
              aria-label="Calendar address"
              onFocus={(e) => e.target.select()}
            />
            <ErpButton variant="secondary" icon={copied ? 'check' : 'clipboard-check'} onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </ErpButton>
          </div>
          <div className="bk-cal-actions">
            <a
              className="erp-btn-primary erp-btn-sm"
              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.url)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="calendar" size={15} />
              Add to Google Calendar
            </a>
            <a className="erp-btn-secondary erp-btn-sm" href={feed.webcalUrl}>
              <Icon name="calendar" size={15} />
              Apple / Outlook
            </a>
            <ErpButton
              variant="ghost"
              size="sm"
              icon="refresh"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  title: 'Get a new address',
                  message: 'The old address stops working. Calendars using it must be subscribed again.',
                  label: 'Get new address',
                  fn: rotateCalendarFeed,
                })
              }
            >
              New address
            </ErpButton>
            <ErpButton
              variant="ghost"
              size="sm"
              icon="x-circle"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  title: 'Turn off calendar feed',
                  message: 'Calendars subscribed to this address stop updating.',
                  label: 'Turn off',
                  danger: true,
                  fn: revokeCalendarFeed,
                })
              }
            >
              Turn off
            </ErpButton>
          </div>
        </>
      ) : (
        <div>
          <ErpButton icon="link" loading={busy} onClick={() => run(rotateCalendarFeed)}>
            Create my calendar address
          </ErpButton>
        </div>
      )}
      <ErpConfirm
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message || ''}
        confirmLabel={confirm?.label}
        danger={Boolean(confirm?.danger)}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run(confirm.fn)}
      />
    </div>
  );
}

/** Header button + modal wrapper used on the bookings pages. */
export default function CalendarFeedButton({ variant = 'secondary' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ErpButton variant={variant} icon="calendar" onClick={() => setOpen(true)}>
        Google Calendar
      </ErpButton>
      <ErpModal open={open} title="Sync with Google Calendar" onClose={() => setOpen(false)}>
        {open ? <CalendarFeedPanel /> : null}
      </ErpModal>
    </>
  );
}
