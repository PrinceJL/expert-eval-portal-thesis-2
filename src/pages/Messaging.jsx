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
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


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
        <div
          onClick={() => setSelectedImage(fullUrl)}
          className="block mt-2 cursor-pointer group relative"
        >
          <img
            src={fullUrl}
            alt={att.filename}
            className="max-w-full rounded-lg max-h-60 object-contain bg-base-200 transition-opacity group-hover:opacity-90"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
            </svg>
          </div>
        </div>
      );
    }
    if (att.type === 'video') {
      return (
        <video controls className="max-w-full rounded-lg mt-2 max-h-60 bg-black">
          <source src={fullUrl} />
          Your browser does not support the video tag.
        </video>
      );
    }
    return (
      <div className="mt-2">
        <a href={fullUrl} target="_blank" rel="noreferrer" className="link link-primary text-sm flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
          {att.filename} ({(att.size / 1024 / 1024).toFixed(2)} MB)
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Messaging</h1>
          <p className="text-base-content/70">Connect with Admin support.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={init}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Reload
        </button>
      </div>

      {error ? (
        <div role="alert" className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 flex-1 min-h-0 bg-base-200 rounded-xl border border-base-300 shadow-2xl overflow-hidden">
        {/* Contacts Sidebar */}
        <div className="flex flex-col border-r border-base-200 bg-base-200/30">
          <div className="p-4 border-b border-base-200 bg-base-100">
            <h2 className="font-semibold text-lg">Contacts</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-3">
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 border-2 ${selected?.id === c.id
                  ? 'bg-primary text-primary-content border-primary shadow-md'
                  : 'bg-base-100/50 hover:bg-base-200 text-base-content border-white/30 hover:border-white/50'
                  }`}
              >
                <div className={`avatar placeholder`}>
                  <div className={`${selected?.id === c.id ? 'bg-primary-content text-primary' : 'bg-neutral text-neutral-content'} rounded-full w-10`}>
                    <span className="text-xs uppercase">{c.username.substring(0, 2)}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{c.username}</div>
                  <div className={`text-xs truncate ${selected?.id === c.id ? 'text-primary-content/80' : 'text-base-content/60'}`}>
                    {c.role} • {c.group}
                  </div>
                </div>
              </button>
            ))}
            {!contacts.length ? (
              <div className="p-8 text-center text-base-content/50">
                <p>No contacts found.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-col min-h-0 bg-base-100 relative">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-base-content/50 p-8 text-center">
              <div className="w-24 h-24 bg-base-200 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Select a Conversation</h3>
              <p>Choose a contact from the list to start chatting.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-base-200 bg-base-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-10">
                      <span className="text-lg uppercase">{selected.username.substring(0, 1)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{selected.username}</h3>
                    <p className="text-xs text-base-content/60">{selected.role} • {selected.email}</p>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/10">
                {messages.map((m) => {
                  const mine = String(m.senderId) === String(user.id);
                  return (
                    <div key={m._id} className={`chat ${mine ? 'chat-end' : 'chat-start'}`}>
                      <div className="chat-header text-xs font-medium mb-1" style={{ opacity: 0.8 }}>
                        {mine ? 'You' : selected.username}
                        <time className="text-xs ml-1" style={{ opacity: 0.7 }}>{fmtTime(m.createdAt)}</time>
                      </div>
                      <div className={`chat-bubble ${mine ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                        {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                        {m.attachments?.map((att, idx) => (
                          <div key={idx}>{renderAttachment(att)}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {!messages.length ? (
                  <div className="text-center py-10 opacity-50">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-base-200 bg-base-100">
                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,application/pdf"
                  />
                  <button
                    className="btn btn-circle btn-primary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Upload image or file"
                  >
                    {uploading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 relative">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message..."
                      className="input input-bordered w-full pr-12 focus:outline-offset-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                  </div>

                  <button
                    className="btn btn-primary btn-circle"
                    type="button"
                    onClick={() => send()}
                    disabled={!draft.trim() && !uploading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </button>
                </div>
                <div className="text-xs text-center mt-2 opacity-50">
                  Enter to send
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <dialog className="modal modal-open" onClick={() => setSelectedImage(null)}>
          <div className="modal-box max-w-5xl w-full p-0 bg-transparent shadow-none" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <button
                className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 bg-base-100/80 hover:bg-base-100 z-10"
                onClick={() => setSelectedImage(null)}
              >
                ✕
              </button>
              <img
                src={selectedImage}
                alt="Full size preview"
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
          <div className="modal-backdrop bg-black/70" onClick={() => setSelectedImage(null)}></div>
        </dialog>
      )}
    </div>
  );
}
