import React, { useEffect, useMemo, useState, useRef } from 'react';
import { apiFetch, getApiBaseUrl } from '../lib/api';
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

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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
    try {
      const data = await apiFetch(`/messages/conversation/${cid}?limit=200`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Polling error:', e);
    }
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

  // Near real-time polling (every 4 seconds)
  useEffect(() => {
    if (!conversationId) return;
    loadConversation(conversationId);

    const interval = setInterval(() => {
      loadConversation(conversationId);
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB limit check client-side
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use raw fetch for FormData because apiFetch is tuned for JSON
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${baseUrl}/messages/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const attachment = await res.json();

      // Auto-send the message with the attachment
      await send(attachment);
    } catch (e) {
      setError('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function send(attachment = null) {
    if (!selected || (!draft.trim() && !attachment)) return;
    setError('');

    const payload = {
      recipientId: selected.id,
      content: draft.trim(),
      attachments: attachment ? [attachment] : []
    };

    try {
      await apiFetch('/messages/send', { method: 'POST', body: JSON.stringify(payload) });
      setDraft('');
      await loadConversation(conversationId);
    } catch (e) {
      setError(e.message);
    }
  }

  function renderAttachment(att) {
    const baseUrl = getApiBaseUrl();
    const fullUrl = `${baseUrl}${att.url}`;

    if (att.type === 'image') {
      return (
        <a href={fullUrl} target="_blank" rel="noreferrer">
          <img src={fullUrl} alt={att.filename} style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8, cursor: 'pointer' }} />
        </a>
      );
    }
    if (att.type === 'video') {
      return (
        <video controls style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }}>
          <source src={fullUrl} />
          Your browser does not support the video tag.
        </video>
      );
    }
    return (
      <div style={{ marginTop: 8 }}>
        <a href={fullUrl} target="_blank" rel="noreferrer" className="link" style={{ fontSize: 13 }}>
          📎 {att.filename} ({(att.size / 1024 / 1024).toFixed(2)} MB)
        </a>
      </div>
    );
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
              Talk to us! Customers (Experts) can chat with Admin users here.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={init}>Reload</button>
        </div>

        {error ? <p style={{ color: 'crimson', fontSize: 13, marginBottom: 10 }}>{error}</p> : null}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, marginTop: 14 }}>
          <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, maxHeight: 600, overflow: 'auto' }}>
            <div className="muted" style={{ marginBottom: 10 }}>Contacts</div>
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8, background: selected?.id === c.id ? '#f3f4f6' : 'transparent', textAlign: 'left' }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{c.username}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{c.role} • {c.group}</div>
                </div>
              </button>
            ))}
            {!contacts.length ? <div className="muted">No contacts found.</div> : null}
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', height: 600 }}>
            {!selected ? (
              <div className="muted" style={{ padding: 12 }}>Select a person to start chatting.</div>
            ) : (
              <>
                <div style={{ borderBottom: '1px solid #f2f2f2', paddingBottom: 10, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{selected.username}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{selected.role} • {selected.email}</div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', paddingRight: 6 }}>
                  {messages.map((m) => {
                    const mine = String(m.senderId) === String(user.id);
                    return (
                      <div key={m._id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                        <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: 16, background: mine ? '#e8f5ff' : '#f3f4f6' }}>
                          {m.content && <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>}
                          {m.attachments?.map((att, idx) => (
                            <div key={idx}>{renderAttachment(att)}</div>
                          ))}
                          <div className="muted" style={{ fontSize: 10, marginTop: 4, textAlign: 'right' }}>{fmtTime(m.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {!messages.length ? <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No messages yet. Start the conversation!</div> : null}
                </div>

                <div style={{ borderTop: '1px solid #f2f2f2', paddingTop: 10, marginTop: 10 }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      title="Upload media"
                      style={{ padding: '0 8px' }}
                    >
                      {uploading ? '...' : '📎'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      accept="image/*,video/*,application/pdf"
                    />

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
                    <button className="btn btn-primary" type="button" onClick={() => send()} disabled={!draft.trim() && !uploading}>Send</button>
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
