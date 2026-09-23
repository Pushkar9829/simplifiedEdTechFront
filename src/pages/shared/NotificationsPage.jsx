import { useEffect, useState } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api';
import { ErpButton, ErpList, ErpListItem, ErpPager, ErpSearch, ErpTabs } from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
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

  const [tab, setTab] = useState('all');
  const visible = items.filter((n) => {
    if (tab === 'new') return !n.isRead;
    if (tab === 'read') return n.isRead;
    return true;
  });
  const list = useListFilter(
    visible,
    (n) => [n.title, n.body, n.isRead ? 'read' : 'new'].filter(Boolean).join(' '),
    { resetKey: tab }
  );

  return (
    <div className="page stack">
      <h1>Notifications</h1>
      <div className="avail-bar">
        <ErpTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'new', label: 'New' },
            { value: 'read', label: 'Read' },
          ]}
        />
        <ErpSearch value={list.search} onChange={list.setSearch} placeholder="Search notifications" />
        <div className="avail-bar-actions">
          <ErpButton
            variant="secondary"
            onClick={async () => {
              await markAllNotificationsRead();
              load();
            }}
          >
            Mark all read
          </ErpButton>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!visible.length && items.length ? (
        <div className="empty">No notifications in this view.</div>
      ) : !items.length ? (
        <div className="empty">No notifications yet.</div>
      ) : list.noMatch ? (
        <div className="empty">No notifications match that search.</div>
      ) : (
        <ErpList>
          {list.items.map((n) => (
            <ErpListItem
              key={n._id}
              title={n.title}
              meta={`${n.body || ''} · ${formatDate(n.createdAt)}`}
              status={n.isRead ? 'completed' : 'pending'}
              statusLabel={n.isRead ? 'Read' : 'New'}
              actions={
                !n.isRead ? (
                  <ErpButton
                    variant="secondary"
                    onClick={async () => {
                      await markNotificationRead(n._id);
                      load();
                    }}
                  >
                    Mark read
                  </ErpButton>
                ) : null
              }
            />
          ))}
        </ErpList>
      )}
      {list.total > 0 && <ErpPager {...list.pagerProps} noun="notification" />}
    </div>
  );
}
