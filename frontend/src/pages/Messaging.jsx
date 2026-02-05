import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

function convoId(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

function fmtTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function Messaging() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const conversationId = useMemo(() => {
    if (!selected) return '';
    return convoId(user.id, selected.id);
  }, [selected, user.id]);

  async function loadContacts() {
    const data = await apiFetch('/messages/contacts');
    setContacts(Array.isArray(data) ? data : []);
  }

  async function loadConversation(cid) {
    if (!cid) return;
    const data = await apiFetch(`/messages/conversation/${cid}?limit=200`);
    setMessages(Array.isArray(data) ? data : []);
  }

  async function init() {
    setLoading(true);
    setError('');
    try {
      await loadContacts();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    loadConversation(conversationId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function send() {
    if (!selected || !draft.trim()) return;
    setError('');
    const payload = { recipientId: selected.id, content: draft.trim() };
    try {
      await apiFetch('/messages/send', { method: 'POST', body: JSON.stringify(payload) });
      setDraft('');
      await loadConversation(conversationId);
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card"><p className="muted">Loading…</p></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Messaging</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Simple in-app chat (stored in MongoDB). Contacts are limited to your group.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={init}>Reload</button>
        </div>

        {error ? <p style={{ color: 'crimson' }}>Error: {error}</p> : null}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, marginTop: 14 }}>
          <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, maxHeight: 560, overflow: 'auto' }}>
            <div className="muted" style={{ marginBottom: 10 }}>Contacts</div>
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8, background: selected?.id === c.id ? '#f3f4f6' : 'transparent' }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{c.username}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{c.role} • {c.group}</div>
                </div>
              </button>
            ))}
            {!contacts.length ? <div className="muted">No contacts found.</div> : null}
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', height: 560 }}>
            {!selected ? (
              <div className="muted" style={{ padding: 12 }}>Select a contact to start chatting.</div>
            ) : (
              <>
                <div style={{ borderBottom: '1px solid #f2f2f2', paddingBottom: 10, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{selected.username}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{selected.email}</div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', paddingRight: 6 }}>
                  {messages.map((m) => {
                    const mine = String(m.senderId) === String(user.id);
                    return (
                      <div key={m._id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                        <div style={{ maxWidth: '70%', padding: 10, borderRadius: 12, background: mine ? '#e8f5ff' : '#f3f4f6' }}>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{fmtTime(m.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {!messages.length ? <div className="muted">No messages yet.</div> : null}
                </div>

                <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 10, marginTop: 10 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          send();
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button className="btn" type="button" onClick={send} disabled={!draft.trim()}>Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
