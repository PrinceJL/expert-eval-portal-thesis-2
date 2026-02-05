import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleString();
}

export default function AdminMaintenance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [global, setGlobal] = useState({ isUnderMaintenance: false, maintenanceMessage: '' });
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState({ pageName: 'GLOBAL', isUnderMaintenance: false, maintenanceMessage: '' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/admin/maintenance');
      setGlobal(data.global || { isUnderMaintenance: false, maintenanceMessage: '' });
      setPages(Array.isArray(data.pages) ? data.pages : []);
      setForm((p) => ({ ...p, pageName: 'GLOBAL', isUnderMaintenance: !!data.global?.isUnderMaintenance, maintenanceMessage: data.global?.maintenanceMessage || '' }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await apiFetch('/admin/maintenance', {
        method: 'PUT',
        body: JSON.stringify({
          pageName: form.pageName.trim(),
          isUnderMaintenance: !!form.isUnderMaintenance,
          maintenanceMessage: form.maintenanceMessage
        })
      });
      setMsg('Maintenance setting updated.');
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Maintenance Management</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Toggle maintenance mode (GLOBAL) or set per-page flags.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</button>
        </div>

        {msg ? <p style={{ color: '#1f883d' }}>{msg}</p> : null}
        {error ? <p style={{ color: 'crimson' }}>Error: {error}</p> : null}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 14 }}>
            <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Global Maintenance</h3>
              <div className="muted">Current: {global.isUnderMaintenance ? 'ON' : 'OFF'}</div>
              <div className="muted" style={{ marginTop: 6 }}>Message: {global.maintenanceMessage || '-'}</div>
              <div className="muted" style={{ marginTop: 6 }}>Updated: {fmtDate(global.updatedAt)}</div>
            </div>

            <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Update Maintenance</h3>
              <form onSubmit={save} style={{ display: 'grid', gap: 10 }}>
                <label>
                  <div className="muted">Page Name</div>
                  <input value={form.pageName} onChange={(e) => setForm((p) => ({ ...p, pageName: e.target.value }))} placeholder="GLOBAL or route key" required />
                </label>
                <label className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <input type="checkbox" checked={!!form.isUnderMaintenance} onChange={(e) => setForm((p) => ({ ...p, isUnderMaintenance: e.target.checked }))} />
                  <span>Under maintenance</span>
                </label>
                <label>
                  <div className="muted">Message (shown to users)</div>
                  <textarea rows={3} value={form.maintenanceMessage} onChange={(e) => setForm((p) => ({ ...p, maintenanceMessage: e.target.value }))} />
                </label>
                <button className="btn" type="submit">Save</button>
              </form>
            </div>
          </div>
        )}

        {!loading ? (
          <div style={{ marginTop: 18, border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>All Maintenance Records</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.id || p.pageName}>
                      <td>{p.pageName}</td>
                      <td>
                        {p.isUnderMaintenance ? (
                          <span className="badge" style={{ background: '#9a6700' }}>ON</span>
                        ) : (
                          <span className="badge" style={{ background: '#1f883d' }}>OFF</span>
                        )}
                      </td>
                      <td className="muted">{p.maintenanceMessage || '-'}</td>
                      <td className="muted">{fmtDate(p.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
