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
    <div className="min-h-screen bg-base-200 text-base-content font-sans">
      <div className="container mx-auto p-6 max-w-7xl animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-end mb-8 border-b border-base-200 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-base-content">
              User Management
            </h1>
            <p className="text-base-content/70 mt-2 text-lg">
              Create accounts and manage user access. No public registration allowed.
            </p>
          </div>
          <button
            className={`btn btn-ghost btn-sm gap-2 ${loading ? 'loading' : ''}`}
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {msg && (
          <div className="alert alert-success shadow-lg mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{msg}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error shadow-lg mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {loading && !users.length ? (
          <div className="flex justify-center py-20">
            <button className="btn btn-ghost loading btn-lg">Loading Users...</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create User Card */}
            <div className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <h2 className="card-title text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Create User
                </h2>
                <div className="divider h-px bg-base-200 my-2"></div>

                <form onSubmit={createUser} className="space-y-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Username</span></label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={form.username}
                      onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Email</span></label>
                    <input
                      type="email"
                      className="input input-bordered w-full"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Group</span></label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={form.group}
                      onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}
                      placeholder="e.g. Team404"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Role</span></label>
                    <select
                      className="select select-bordered w-full"
                      value={form.role}
                      onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    >
                      <option value="EXPERT">EXPERT</option>
                      <option value="RESEARCHER">RESEARCHER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Temporary Password (Optional)</span></label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Leave blank to auto-generate"
                    />
                  </div>

                  <div className="card-actions justify-end mt-4">
                    <button className="btn btn-primary w-full" type="submit">Create User</button>
                  </div>
                </form>
              </div>
            </div>

            {/* Users List Card - Spans 2 columns */}
            <div className="card bg-base-100 shadow-xl border border-base-200 lg:col-span-2">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="card-title text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    All Users
                  </h2>
                  <div className="flex gap-3 items-center">
                    <div className="badge badge-outline">Total: {users.length}</div>
                    <div className="badge badge-primary">Experts: {experts.length}</div>
                  </div>
                </div>

                <div className="divider h-px bg-base-200 my-2"></div>

                <div className="overflow-x-auto">
                  <table className="table table-compact w-full">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Group</th>
                        <th>Status</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="hover">
                          <td>
                            <div className="flex flex-col">
                              <div className="font-semibold">{u.username}</div>
                              <div className="text-xs opacity-60">{u.email}</div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-sm ${u.role === 'ADMIN' ? 'badge-error' :
                              u.role === 'RESEARCHER' ? 'badge-warning' :
                                'badge-info'
                              }`}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-ghost badge-sm">{u.group}</span>
                          </td>
                          <td>
                            {u.isActive ? (
                              <span className="badge badge-success badge-sm">Active</span>
                            ) : (
                              <span className="badge badge-warning badge-sm">Disabled</span>
                            )}
                          </td>
                          <td>
                            <div className="flex gap-2 justify-center flex-wrap">
                              <button
                                className="btn btn-ghost btn-xs border border-base-300"
                                onClick={() => resetPassword(u.id)}
                              >
                                Reset PW
                              </button>
                              {u.isActive ? (
                                <button
                                  className="btn btn-ghost btn-xs border border-base-300 text-warning"
                                  onClick={() => toggleActive(u.id, false)}
                                >
                                  Disable
                                </button>
                              ) : (
                                <button
                                  className="btn btn-ghost btn-xs border border-base-300 text-success"
                                  onClick={() => toggleActive(u.id, true)}
                                >
                                  Enable
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!users.length && (
                        <tr>
                          <td colSpan="5" className="text-center opacity-50 py-8">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
