import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({ username: '', email: '', group: '', role: 'EXPERT', password: '' });

  const experts = useMemo(() => users.filter((u) => u.role === 'EXPERT'), [users]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/admin/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        group: form.group.trim(),
        role: form.role,
        ...(form.password.trim() ? { password: form.password.trim() } : {})
      };
      const res = await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
      setMsg(`User created. Temporary password: ${res.temporaryPassword}`);
      setForm({ username: '', email: '', group: form.group, role: 'EXPERT', password: '' });
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function resetPassword(userId) {
    setMsg('');
    setError('');
    try {
      const res = await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ resetPassword: true }) });
      setMsg(`Password reset. Temporary password: ${res.temporaryPassword}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleActive(userId, nextActive) {
    setMsg('');
    setError('');
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ isActive: nextActive }) });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>User Management</h2>
        <p className="muted">Create accounts (no public registration). You can also reset passwords.</p>

        {msg ? <p style={{ color: '#1f883d' }}>{msg}</p> : null}
        {error ? <p style={{ color: 'crimson' }}>Error: {error}</p> : null}

        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginTop: 14 }}>
          <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Create User</h3>
            <form onSubmit={createUser} style={{ display: 'grid', gap: 10 }}>
              <label>
                <div className="muted">Username</div>
                <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
              </label>
              <label>
                <div className="muted">Email</div>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
              </label>
              <label>
                <div className="muted">Group</div>
                <input value={form.group} onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))} placeholder="e.g. Team404" required />
              </label>
              <label>
                <div className="muted">Role</div>
                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value="EXPERT">EXPERT</option>
                  <option value="RESEARCHER">RESEARCHER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <label>
                <div className="muted">Temporary Password (optional)</div>
                <input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Leave blank to auto-generate" />
              </label>
              <button className="btn" type="submit">Create</button>
            </form>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Users</h3>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="muted">Total: {users.length} • Experts: {experts.length}</div>
              <button className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</button>
            </div>

            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Group</th>
                    <th>Status</th>
                    <th style={{ width: 200 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.username}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{u.email}</div>
                      </td>
                      <td><span className="badge">{u.role}</span></td>
                      <td>{u.group}</td>
                      <td>
                        {u.isActive ? (
                          <span className="badge" style={{ background: '#1f883d' }}>Active</span>
                        ) : (
                          <span className="badge" style={{ background: '#9a6700' }}>Disabled</span>
                        )}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost" onClick={() => resetPassword(u.id)}>Reset PW</button>
                          {u.isActive ? (
                            <button className="btn btn-ghost" onClick={() => toggleActive(u.id, false)}>Disable</button>
                          ) : (
                            <button className="btn btn-ghost" onClick={() => toggleActive(u.id, true)}>Enable</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
