import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  listConversations,
  listMessages,
  markConversationRead,
  messageContacts,
  openConversation,
  sendMessage,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { tutorRef } from '../../utils/format';
import {
  ErpAvatar,
  ErpBanner,
  ErpButton,
  ErpEmptyState,
  ErpSearch,
  ErpSegmented,
  ErpSpinner,
  Icon,
  useIsPhone,
} from '../../components/erp';
import { useListFilter } from '../../hooks/useListFilter';
import { mediaUrl } from '../../utils/mediaUrl';
import { errorMessage } from '../../utils/errors';
import { GlyphIcon } from './sharedUi';
import { groupByDay, shortWhen, timeOnly } from './sharedTime';
import './shared.css';
import './messages.css';

const SEEN_KEY = 'sp-messages-seen';

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeSeen(map) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {
    /* per-viewer convenience only */
  }
}

function linkLabel(url) {
  if (url.includes('zoom.us')) return 'Open Zoom';
  if (url.includes('docs.google.com')) return 'Open Google Docs';
  if (url.includes('excalidraw.com')) return 'Open whiteboard';
  return url;
}

function MessageBody({ text, kind }) {
  const parts = String(text || '').split(/(https?:\/\/[^\s]+)/g);
  const chip = kind === 'class_links' ? 'Class tools' : kind === 'feedback' ? 'Feedback' : '';
  return (
    <div className="sp-bubble-text">
      {chip && (
        <span className="sp-bubble-kind">
          <Icon name={kind === 'feedback' ? 'star' : 'link'} size={12} />
          {chip}
        </span>
      )}
      {parts.map((part, i) =>
        part.startsWith('http') ? (
          <a key={`${part}-${i}`} className="sp-bubble-link" href={part} target="_blank" rel="noreferrer">
            <Icon name="external-link" size={13} />
            {linkLabel(part)}
          </a>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        )
      )}
    </div>
  );
}

function personLabel(person, viewer) {
  if (!person) return 'Conversation';
  if (person.role === 'tutor' && (viewer?.role === 'student' || viewer?.role === 'parent')) {
    return tutorRef(person);
  }
  return person.name || person.phone || tutorRef(person) || 'Contact';
}

const roleText = (r) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : '');

export default function MessagesPage() {
  const phone = useIsPhone();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState({ students: [], parents: [], tutors: [] });
  const [contactTab, setContactTab] = useState(user?.role === 'tutor' ? 'students' : 'tutors');
  const [view, setView] = useState('chats');
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0);
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const [convosReady, setConvosReady] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const textRef = useRef(null);

  const markSeen = (id, when = new Date().toISOString()) => {
    if (!id) return;
    setSeen((prev) => {
      const next = { ...prev, [id]: when };
      writeSeen(next);
      return next;
    });
  };

  const loadConversations = async () => {
    const data = await listConversations();
    const list = data || [];
    setConversations(list);
    setConvosReady(true);
    // First visit on this device: treat everything already there as seen.
    setSeen((prev) => {
      if (prev.__seededAt) return prev;
      const next = { __seededAt: new Date().toISOString() };
      list.forEach((c) => {
        next[c._id] = c.lastMessageAt || c.updatedAt || next.__seededAt;
      });
      writeSeen(next);
      return next;
    });
  };

  const openThread = async (id) => {
    if (id !== active) {
      setMessages([]);
      setThreadLoading(true);
      stickToBottom.current = true;
    }
    setActive(id);
    try {
      const data = await listMessages(id);
      setMessages([...(data.items || [])].reverse());
      setError('');
      markSeen(id);
      await markConversationRead(id);
    } catch (err) {
      setError(errorMessage(err, 'Could not open this conversation.'));
    } finally {
      setThreadLoading(false);
    }
  };

  const startChat = async (participantId) => {
    if (opening) return;
    setOpening(true);
    setError('');
    try {
      const convo = await openConversation(participantId);
      await loadConversations();
      setView('chats');
      await openThread(convo._id);
    } catch (err) {
      setError(errorMessage(err, 'Could not start a conversation with this person.'));
    } finally {
      setOpening(false);
    }
  };

  const onSend = async (e) => {
    e?.preventDefault?.();
    if (sending) return;
    if (!body.trim()) {
      setError(
        files.length
          ? 'Add a short message to go with your attachment — messages need some text.'
          : 'Write a message before sending.'
      );
      return;
    }
    const fd = new FormData();
    fd.append('conversationId', active);
    fd.append('body', body);
    files.forEach((f) => fd.append('attachments', f));
    setSending(true);
    setError('');
    try {
      const result = await sendMessage(fd);
      setWarning(result?.warning || '');
      setBody('');
      setFiles([]);
      setFileKey((k) => k + 1);
      stickToBottom.current = true;
      await openThread(active);
    } catch (err) {
      setError(errorMessage(err, 'Message not sent.'));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    messageContacts()
      .then(setContacts)
      .catch((err) => setError(errorMessage(err, 'Could not load contacts.')));
  }, []);

  useEffect(() => {
    const refresh = () => {
      loadConversations().catch((err) => setError(err.message));
      if (active) {
        listMessages(active)
          .then((data) => {
            setMessages([...(data.items || [])].reverse());
            markSeen(active);
          })
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
    // loadConversations / markSeen only touch state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Keep the thread pinned to the newest message unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, active]);

  // Grow the composer with its content (up to ~5 lines).
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [body, active]);

  const isTutor = user?.role === 'tutor';
  const contactTabs = isTutor
    ? [
        { value: 'students', label: `Students (${contacts.students?.length || 0})` },
        { value: 'parents', label: `Parents (${contacts.parents?.length || 0})` },
      ]
    : [{ value: 'tutors', label: `Tutors (${contacts.tutors?.length || 0})` }];
  const currentTab = contactTabs.some((t) => t.value === contactTab)
    ? contactTab
    : contactTabs[0].value;
  const contactList = contacts[currentTab] || [];
  const contactCount = isTutor
    ? (contacts.students?.length || 0) + (contacts.parents?.length || 0)
    : contacts.tutors?.length || 0;
  const people = useListFilter(
    contactList,
    (c) => [c.refCode, c.name, c.phone, c.role, c.childName].filter(Boolean).join(' '),
    { resetKey: currentTab, pageSize: 200 }
  );
  const threads = useListFilter(
    conversations,
    (c) =>
      (c.participants || [])
        .map((p) => `${p.refCode || ''} ${p.name || ''} ${p.role || ''}`)
        .join(' '),
    { pageSize: 200 }
  );

  const meId = String(user?.id ?? user?._id ?? '');
  const otherOf = (c) =>
    (c?.participants || []).find((p) => p._id !== user?.id && p._id !== user?._id);
  const activeConvo = conversations.find((c) => c._id === active);
  const activeOther = otherOf(activeConvo);
  const isUnread = (c) => {
    if (c._id === active) return false;
    const last = c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0;
    const mark = seen[c._id] || seen.__seededAt;
    return Boolean(mark) && last > new Date(mark).getTime() + 1000;
  };
  const unreadCount = conversations.filter(isUnread).length;

  const onThreadScroll = (e) => {
    const el = e.currentTarget;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const dayGroups = groupByDay(messages, (m) => m.createdAt);
  const showList = !phone || !active;
  const showThread = !phone || active;

  return (
    <div className={`page sp-page sp-chat-page${phone && active ? ' is-thread' : ''}`}>
      {error ? (
        <ErpBanner variant="danger" onDismiss={() => setError('')}>
          {error}
        </ErpBanner>
      ) : null}
      {warning ? (
        <ErpBanner variant="warning" onDismiss={() => setWarning('')}>
          {warning}
        </ErpBanner>
      ) : null}

      <div className="sp-chat">
        {showList && (
          <aside className="sp-chat-list" aria-label="Conversations">
            <div className="sp-chat-list-head">
              <div className="sp-chat-list-title">
                <h2>Inbox</h2>
                {unreadCount ? <span className="sp-count">{unreadCount} new</span> : null}
              </div>
              <ErpSegmented
                className="sp-chat-switch"
                value={view}
                onChange={setView}
                options={[
                  { value: 'chats', label: 'Chats', icon: 'message-square' },
                  { value: 'people', label: `New chat${contactCount ? ` · ${contactCount}` : ''}`, icon: 'plus' },
                ]}
              />
              {view === 'chats' ? (
                <ErpSearch value={threads.search} onChange={threads.setSearch} placeholder="Search conversations" />
              ) : (
                <>
                  {contactTabs.length > 1 ? (
                    <ErpSegmented
                      className="sp-chat-switch is-sub"
                      value={currentTab}
                      onChange={setContactTab}
                      options={contactTabs}
                    />
                  ) : null}
                  <ErpSearch value={people.search} onChange={people.setSearch} placeholder="Search people" />
                </>
              )}
            </div>

            <div className="sp-chat-list-body">
              {view === 'chats' ? (
                !convosReady ? (
                  <div className="sp-chat-center">
                    <ErpSpinner />
                  </div>
                ) : !conversations.length ? (
                  <ErpEmptyState
                    icon="message-square"
                    title="No conversations yet"
                    description={isTutor ? 'Message a student or parent you teach.' : 'Message a tutor you have booked.'}
                    action={
                      <ErpButton variant="secondary" icon="plus" onClick={() => setView('people')}>
                        Start a chat
                      </ErpButton>
                    }
                  />
                ) : threads.noMatch ? (
                  <ErpEmptyState icon="search" title="No matches" description="No conversations match that search." />
                ) : (
                  <ul className="sp-convo-list">
                    {threads.items.map((c) => {
                      const other = otherOf(c);
                      const label = personLabel(other, user);
                      const unread = isUnread(c);
                      return (
                        <li key={c._id}>
                          <button
                            type="button"
                            className={`sp-convo${c._id === active ? ' is-active' : ''}${unread ? ' is-unread' : ''}`}
                            onClick={() => openThread(c._id)}
                            aria-current={c._id === active ? 'true' : undefined}
                          >
                            <ErpAvatar name={other?.name || label} size="sm" />
                            <span className="sp-convo-body">
                              <span className="sp-convo-top">
                                <span className="sp-convo-name">{label}</span>
                                <span className="sp-convo-time">{shortWhen(c.lastMessageAt)}</span>
                              </span>
                              <span className="sp-convo-sub">
                                {roleText(other?.role) || 'Contact'}
                                {other?.role === 'tutor' && other?.refCode && label !== other.refCode
                                  ? ` · ${other.refCode}`
                                  : ''}
                              </span>
                            </span>
                            {unread ? <span className="sp-unread-dot" aria-label="New messages" /> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : !contactList.length ? (
                <ErpEmptyState
                  icon="users"
                  title="No contacts yet"
                  description="People you share a booking with appear here."
                />
              ) : people.noMatch ? (
                <ErpEmptyState icon="search" title="No matches" description="No contacts match that search." />
              ) : (
                <ul className="sp-convo-list">
                  {people.items.map((c) => {
                    const label = personLabel(c, user);
                    return (
                      <li key={c._id || c.childId}>
                        <button
                          type="button"
                          className="sp-convo"
                          disabled={opening}
                          onClick={() => startChat(c._id)}
                        >
                          <ErpAvatar name={c.name || label} size="sm" />
                          <span className="sp-convo-body">
                            <span className="sp-convo-top">
                              <span className="sp-convo-name">{label}</span>
                            </span>
                            <span className="sp-convo-sub">
                              {roleText(c.role)}
                              {c.childName ? ` · parent of ${c.childName}` : ''}
                            </span>
                          </span>
                          <span className="sp-convo-go" aria-hidden="true">
                            <Icon name="message-square" size={16} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        )}

        {showThread && (
          <section className="sp-thread" aria-label="Conversation">
            {!active ? (
              <div className="sp-chat-center">
                <ErpEmptyState
                  icon="message-square"
                  title="Select a conversation"
                  description="Pick a chat on the left, or start a new one with someone you have a booking with."
                  action={
                    <ErpButton variant="secondary" icon="plus" onClick={() => setView('people')}>
                      New chat
                    </ErpButton>
                  }
                />
              </div>
            ) : (
              <>
                <header className="sp-thread-head">
                  {phone ? (
                    <ErpButton
                      variant="ghost"
                      iconOnly
                      icon="arrow-left"
                      aria-label="Back to conversations"
                      onClick={() => setActive(null)}
                    />
                  ) : null}
                  <ErpAvatar name={activeOther?.name || personLabel(activeOther, user)} size="sm" />
                  <div className="sp-thread-who">
                    <strong>{personLabel(activeOther, user)}</strong>
                    <span>{roleText(activeOther?.role) || 'Conversation'}</span>
                  </div>
                  <span className="sp-thread-privacy" title="Phone numbers, emails, links and other contact details are hidden from the other person.">
                    <Icon name="shield-check" size={14} />
                    {!phone ? 'Contact details hidden' : null}
                  </span>
                </header>

                <div className="sp-thread-scroll" ref={scrollRef} onScroll={onThreadScroll}>
                  {threadLoading && !messages.length ? (
                    <div className="sp-chat-center">
                      <ErpSpinner />
                    </div>
                  ) : !messages.length ? (
                    <div className="sp-chat-center">
                      <ErpEmptyState
                        icon="message-square"
                        title="Say hello"
                        description="Send the first message in this conversation."
                      />
                    </div>
                  ) : (
                    dayGroups.map((g) => (
                      <div key={g.label} className="sp-day">
                        <div className="sp-day-sep">
                          <span>{g.label}</span>
                        </div>
                        {g.items.map((m) => {
                          const sender = String(m.senderId?._id || m.senderId || '');
                          const mine = sender === meId || sender === String(user?._id || '');
                          return (
                            <div key={m._id} className={`sp-msg${mine ? ' is-mine' : ''}`}>
                              <div className="sp-bubble">
                                <MessageBody text={m.body} kind={m.kind} />
                                {m.attachments?.length ? (
                                  <div className="sp-attachments">
                                    {m.attachments.map((f) => (
                                      <a
                                        key={f.url}
                                        className="sp-attachment"
                                        href={mediaUrl(f.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <GlyphIcon name="paperclip" size={14} />
                                        <span>{f.name || 'file'}</span>
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <div className="sp-msg-meta">
                                {mine ? 'You' : personLabel(activeOther, user)} · {timeOnly(m.createdAt)}
                                {m.flagged ? (
                                  <span className="sp-msg-flag">
                                    <Icon name="eye" size={12} /> contact details hidden
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>

                <form className="sp-composer" onSubmit={onSend}>
                  {files.length ? (
                    <div className="sp-composer-files">
                      {files.map((f, i) => (
                        <span key={`${f.name}-${i}`} className="sp-file-chip">
                          <GlyphIcon name="paperclip" size={13} />
                          <span>{f.name}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${f.name}`}
                            onClick={() => {
                              setFiles((prev) => prev.filter((_, j) => j !== i));
                              if (files.length === 1) setFileKey((k) => k + 1);
                            }}
                          >
                            <Icon name="x" size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="sp-composer-row">
                    <label className="erp-btn-ghost erp-btn-icon-only sp-attach" title="Attach files">
                      <GlyphIcon name="paperclip" size={18} />
                      <span className="sp-sr-only">Attach files</span>
                      <input
                        key={fileKey}
                        type="file"
                        multiple
                        aria-label="Attachments"
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                      />
                    </label>
                    <textarea
                      ref={textRef}
                      className="sp-composer-input"
                      rows={1}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !phone) {
                          e.preventDefault();
                          if (body.trim()) onSend();
                        }
                      }}
                      placeholder="Write a message…"
                      aria-label="Message"
                    />
                    <button
                      type="submit"
                      className="erp-btn-primary erp-btn-icon-only sp-send"
                      disabled={sending || !body.trim()}
                      aria-label={sending ? 'Sending' : 'Send message'}
                    >
                      {sending ? <span className="erp-spinner erp-spinner-sm" aria-hidden="true" /> : <GlyphIcon name="send" size={17} />}
                    </button>
                  </div>
                  <p className="sp-composer-hint">
                    {phone ? 'Numbers and contact info are hidden.' : 'Enter to send · Shift+Enter for a new line · numbers and contact info are hidden'}
                  </p>
                </form>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
