import { useEffect, useState } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api';
import { formatDate } from '../../utils/format';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await listNotifications();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Notifications</h1>
        <button
          className="btn secondary"
          type="button"
          onClick={async () => {
            await markAllNotificationsRead();
            load();
          }}
        >
          Mark all read
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel">
        {!items.length && <div className="empty">No notifications yet.</div>}
        {items.map((n) => (
          <div
            key={n._id}
            className="row"
            style={{
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--line)',
              padding: '0.85rem 0',
              opacity: n.isRead ? 0.65 : 1,
            }}
          >
            <div>
              <strong>{n.title}</strong>
              <p className="muted" style={{ margin: '0.2rem 0' }}>
                {n.body}
              </p>
              <small className="muted">{formatDate(n.createdAt)}</small>
            </div>
            {!n.isRead && (
              <button
                className="btn ghost"
                type="button"
                onClick={async () => {
                  await markNotificationRead(n._id);
                  load();
                }}
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
