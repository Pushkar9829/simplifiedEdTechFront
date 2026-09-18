import { useEffect, useState } from 'react';
import {
  listConversations,
  listMessages,
  markConversationRead,
  openConversation,
  sendMessage,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [error, setError] = useState('');

  const loadConversations = async () => {
    const data = await listConversations();
    setConversations(data || []);
  };

  const openThread = async (id) => {
    setActive(id);
    const data = await listMessages(id);
    setMessages([...(data.items || [])].reverse());
    await markConversationRead(id);
  };

  useEffect(() => {
    const refresh = () => {
      loadConversations().catch((err) => setError(err.message));
      if (active) {
        listMessages(active)
          .then((data) => setMessages([...(data.items || [])].reverse()))
          .catch(() => {});
      }
    };

    refresh();
    const id = setInterval(refresh, 8000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [active]);

  return (
    <div className="page stack">
      <h1>Messages</h1>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel row">
        <input
          placeholder="Open chat with user ID"
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          className="btn"
          type="button"
          onClick={async () => {
            try {
              const convo = await openConversation(participantId);
              await loadConversations();
              openThread(convo._id);
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          Open
        </button>
      </div>
      <div className="grid two">
        <div className="panel">
          <h3>Conversations</h3>
          {!conversations.length && <div className="empty">No conversations.</div>}
          {conversations.map((c) => {
            const other = (c.participants || []).find(
              (p) => p._id !== user?.id && p._id !== user?._id
            );
            return (
              <button
                key={c._id}
                type="button"
                className="btn secondary"
                style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'flex-start' }}
                onClick={() => openThread(c._id)}
              >
                {other?.name ||
                  (user?.role === 'student' || user?.role === 'parent'
                    ? 'Conversation'
                    : other?.phone) ||
                  c._id}
              </button>
            );
          })}
        </div>
        <div className="panel stack">
          <h3>Thread</h3>
          {!active && <div className="empty">Select a conversation.</div>}
          {active && (
            <>
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                {messages.map((m) => {
                  const sender = m.senderId?._id || m.senderId;
                  const mine = sender === user?._id || sender === user?.id;
                  return (
                    <div key={m._id} style={{ marginBottom: '0.75rem' }}>
                      <strong>{mine ? 'You' : 'Them'}</strong>
                      <div>{m.body}</div>
                      <small className="muted">{formatDate(m.createdAt)}</small>
                    </div>
                  );
                })}
              </div>
              <form
                className="row"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await sendMessage({ conversationId: active, body });
                  setBody('');
                  openThread(active);
                }}
              >
                <input
                  style={{ flex: 1 }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message"
                  required
                />
                <button className="btn">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
