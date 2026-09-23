import { useEffect, useState } from 'react';
import {
  listConversations,
  listMessages,
  markConversationRead,
  messageContacts,
  openConversation,
  sendMessage,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';
import { ErpButton, ErpSearch, ErpTabs, useIsPhone } from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { mediaUrl } from '../../utils/mediaUrl';

export default function MessagesPage() {
  const phone = useIsPhone();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState({ students: [], parents: [], tutors: [] });
  const [contactTab, setContactTab] = useState('students');
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [warning, setWarning] = useState('');
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

  const startChat = async (participantId) => {
    const convo = await openConversation(participantId);
    await loadConversations();
    openThread(convo._id);
  };

  useEffect(() => {
    messageContacts()
      .then(setContacts)
      .catch(() => {});
  }, []);

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
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', refresh);
    };
  }, [active]);

  const isTutor = user?.role === 'tutor';
  const contactTabs = isTutor
    ? [
        { value: 'students', label: `Students (${contacts.students?.length || 0})` },
        { value: 'parents', label: `Parents (${contacts.parents?.length || 0})` },
      ]
    : [{ value: 'tutors', label: `Tutors (${contacts.tutors?.length || 0})` }];
  const contactList =
    contactTab === 'parents' ? contacts.parents || [] : contactTab === 'tutors' ? contacts.tutors || [] : contacts.students || [];
  const people = useListFilter(
    contactList,
    (c) => [c.name, c.phone, c.role, c.childName].filter(Boolean).join(' '),
    { resetKey: contactTab }
  );
  const threads = useListFilter(conversations, (c) =>
    (c.participants || [])
      .map((p) => `${p.name || ''} ${p.role || ''}`)
      .join(' ')
  );

  return (
    <div className="page stack">
      <h1>Messages</h1>
      <p className="muted">
        Phone numbers, emails, links, and other contact details are hidden from the other person.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {warning && <div className="success-banner">{warning}</div>}

      <div className={`grid two${phone && active ? ' messages-thread-only' : ''}`}>
        {!(phone && active) && (
        <div className="panel stack">
          <h3>People</h3>
          <ErpTabs value={contactTab} onChange={setContactTab} tabs={contactTabs} />
          <ErpSearch value={people.search} onChange={people.setSearch} placeholder="Search people" />
          {!contactList.length && <div className="empty">No contacts from bookings yet.</div>}
          {people.noMatch && <div className="empty">No contacts match that search.</div>}
          {people.items.map((c) => (
            <button
              key={c._id || c.childId}
              type="button"
              className="btn secondary"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => startChat(c._id)}
            >
              {c.name || c.phone || 'Contact'}
              {c.role && <span className="erp-chip" style={{ marginLeft: 8 }}>{c.role}</span>}
              {c.childName && <span className="muted"> · parent of {c.childName}</span>}
            </button>
          ))}
          <h3>Conversations</h3>
          <ErpSearch value={threads.search} onChange={threads.setSearch} placeholder="Search conversations" />
          {!conversations.length && <div className="empty">No conversations.</div>}
          {threads.noMatch && <div className="empty">No conversations match that search.</div>}
          {threads.items.map((c) => {
            const other = (c.participants || []).find((p) => p._id !== user?.id && p._id !== user?._id);
            return (
              <button
                key={c._id}
                type="button"
                className="btn secondary"
                style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'flex-start' }}
                onClick={() => openThread(c._id)}
              >
                {other?.name || 'Conversation'}
                {other?.role && <span className="muted"> · {other.role}</span>}
              </button>
            );
          })}
        </div>
        )}
        {(!phone || active) && (
        <div className="panel stack">
          <h3>
            {phone && (
              <ErpButton variant="secondary" onClick={() => setActive(null)}>
                Back
              </ErpButton>
            )}{' '}
            Thread
          </h3>
          {!active && <div className="empty">Select a conversation.</div>}
          {active && (
            <>
              <div style={{ minHeight: 240, maxHeight: phone ? '55vh' : 420, overflow: 'auto' }}>
                {messages.map((m) => {
                  const sender = m.senderId?._id || m.senderId;
                  const mine = sender === user?._id || sender === user?.id;
                  return (
                    <div key={m._id} style={{ marginBottom: '0.75rem' }}>
                      <strong>{mine ? 'You' : 'Them'}</strong>
                      {m.flagged && <span className="muted"> · contact details hidden</span>}
                      <div>{m.body}</div>
                      {!!m.attachments?.length &&
                        m.attachments.map((f) => (
                          <div key={f.url}>
                            <a href={mediaUrl(f.url)} target="_blank" rel="noreferrer">
                              {f.name || 'file'}
                            </a>
                          </div>
                        ))}
                      <small className="muted">{formatDate(m.createdAt)}</small>
                    </div>
                  );
                })}
              </div>
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData();
                  fd.append('conversationId', active);
                  fd.append('body', body);
                  files.forEach((f) => fd.append('attachments', f));
                  const result = await sendMessage(fd);
                  setWarning(result?.warning || '');
                  setBody('');
                  setFiles([]);
                  openThread(active);
                }}
              >
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message (numbers and contact info are hidden)"
                  required
                />
                <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                <ErpButton type="submit">Send</ErpButton>
              </form>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
