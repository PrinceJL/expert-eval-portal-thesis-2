import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

const EMPTY_FORM = {
  username: '',
  email: '',
  group: '',
  role: 'EXPERT',
  password: ''
};

const MIN_PASSWORD_LENGTH = 8;

function roleBadgeClass(role) {
  if (role === 'ADMIN') return 'badge-error';
  if (role === 'RESEARCHER') return 'badge-warning';
  return 'badge-info';
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busyActionKey, setBusyActionKey] = useState('');

  const [activeTab, setActiveTab] = useState('USERS');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    dashboardTargetPerformance: 85,
    dashboardShowDimensions: true,
    dashboardShowMetrics: true
  });

  const [passwordDialog, setPasswordDialog] = useState({
    open: false,
    userId: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [editDialog, setEditDialog] = useState({
    open: false,
    userId: '',
    username: '',
    email: '',
    group: '',
    role: 'EXPERT',
    isActive: true
  });

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const experts = users.filter((u) => u.role === 'EXPERT').length;
    const researchers = users.filter((u) => u.role === 'RESEARCHER').length;
    return { total, active, admins, experts, researchers };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => {
        if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
        if (statusFilter === 'ACTIVE' && !u.isActive) return false;
        if (statusFilter === 'DISABLED' && u.isActive) return false;

        if (!q) return true;
        const haystack = `${u.username || ''} ${u.email || ''} ${u.group || ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => String(a.username || '').localeCompare(String(b.username || '')));
  }, [users, search, roleFilter, statusFilter]);

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
    void load();
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const data = await apiFetch('/admin/settings/dashboard');
      if (data) {
        setSettingsForm({
          dashboardTargetPerformance: data.dashboardTargetPerformance ?? 85,
          dashboardShowDimensions: data.dashboardShowDimensions ?? true,
          dashboardShowMetrics: data.dashboardShowMetrics ?? true
        });
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSettings(e) {
    if (e) e.preventDefault();
    setMsg('');
    setError('');
    setBusyActionKey('save_settings');
    try {
      await apiFetch('/admin/settings/dashboard', {
        method: 'PUT',
        body: JSON.stringify(settingsForm)
      });
      setMsg('Dashboard settings saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setBusyActionKey('');
    }
  }

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
      setForm((prev) => ({ ...EMPTY_FORM, group: prev.group }));
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function resetPassword(userId) {
    setMsg('');
    setError('');
    setBusyActionKey(`${userId}:reset`);
    try {
      const res = await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ resetPassword: true }) });
      setMsg(`Password reset. Temporary password: ${res.temporaryPassword}`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyActionKey('');
    }
  }

  async function toggleActive(userId, nextActive) {
    setMsg('');
    setError('');
    setBusyActionKey(`${userId}:active`);
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ isActive: nextActive }) });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyActionKey('');
    }
  }

  function openPasswordDialog(targetUser) {
    setPasswordDialog({
      open: true,
      userId: String(targetUser.id),
      username: targetUser.username,
      password: '',
      confirmPassword: ''
    });
  }

  function closePasswordDialog() {
    setPasswordDialog((prev) => ({
      ...prev,
      open: false,
      password: '',
      confirmPassword: ''
    }));
  }

  function openEditDialog(targetUser) {
    setEditDialog({
      open: true,
      userId: String(targetUser.id),
      username: targetUser.username,
      email: targetUser.email || '',
      group: targetUser.group || '',
      role: targetUser.role || 'EXPERT',
      isActive: Boolean(targetUser.isActive)
    });
  }

  function closeEditDialog() {
    setEditDialog((prev) => ({
      ...prev,
      open: false
    }));
  }

  async function submitEditUser(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    const usernameLabel = editDialog.username;
    const payload = {
      email: editDialog.email.trim(),
      group: editDialog.group.trim(),
      role: editDialog.role,
      isActive: !!editDialog.isActive
    };

    setBusyActionKey(`${editDialog.userId}:edit`);
    try {
      await apiFetch(`/admin/users/${editDialog.userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      setMsg(`User "${usernameLabel}" updated.`);
      closeEditDialog();
      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusyActionKey('');
    }
  }

  async function submitManualPassword(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    const nextPassword = passwordDialog.password.trim();
    const confirm = passwordDialog.confirmPassword.trim();

    if (nextPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (nextPassword !== confirm) {
      setError('Password confirmation does not match.');
      return;
    }

    setBusyActionKey(`${passwordDialog.userId}:setpw`);
    try {
      await apiFetch(`/admin/users/${passwordDialog.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: nextPassword })
      });
      setMsg(`Password updated for ${passwordDialog.username}.`);
      closePasswordDialog();
      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusyActionKey('');
    }
  }

  async function deleteUser(userToDelete) {
    setMsg('');
    setError('');

    const confirmed = window.confirm(
      `Delete "${userToDelete.username}" permanently?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setBusyActionKey(`${userToDelete.id}:delete`);
    try {
      await apiFetch(`/admin/users/${userToDelete.id}`, { method: 'DELETE' });
      setMsg(`User "${userToDelete.username}" deleted.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyActionKey('');
    }
  }

  return (
    <div className="h-full w-full bg-base-200 text-base-content font-sans admin-users-shell overflow-y-auto custom-scrollbar pb-20">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-[1400px] animate-fade-in space-y-6 admin-users-content">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-base-200 pb-4 admin-users-header sticky top-0 bg-base-200/90 backdrop-blur z-10 pt-4 -mt-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">User Management & Settings</h1>
            <p className="text-base-content/70 mt-1 text-sm sm:text-base">
              Manage accounts, and global dashboard configuration.
            </p>
          </div>
          <div className="flex gap-2">
            <button className={`btn btn-sm ${activeTab === 'USERS' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('USERS')}>Users</button>
            <button className={`btn btn-sm ${activeTab === 'SETTINGS' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('SETTINGS')}>Dashboard Settings</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { load(); loadSettings(); }} disabled={loading || settingsLoading}>
              {loading || settingsLoading ? (
                <>
                  <span className="modern-loader modern-loader-xs modern-loader-inline" aria-hidden="true"></span>
                  Refreshing...
                </>
              ) : 'Refresh'}
            </button>
          </div>
        </div>

        {msg ? (
          <div className="alert alert-success shadow-lg">
            <span>{msg}</span>
          </div>
        ) : null}

        {error ? (
          <div className="alert alert-error shadow-lg">
            <span>{error}</span>
          </div>
        ) : null}

        {activeTab === 'USERS' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border border-base-300 bg-base-100 p-3 admin-users-stat">
                <p className="text-xs uppercase opacity-60">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-base-300 bg-base-100 p-3 admin-users-stat">
                <p className="text-xs uppercase opacity-60">Active</p>
                <p className="text-2xl font-bold text-success">{stats.active}</p>
              </div>
              <div className="rounded-xl border border-base-300 bg-base-100 p-3 admin-users-stat">
                <p className="text-xs uppercase opacity-60">Admins</p>
                <p className="text-2xl font-bold">{stats.admins}</p>
              </div>
              <div className="rounded-xl border border-base-300 bg-base-100 p-3 admin-users-stat">
                <p className="text-xs uppercase opacity-60">Experts</p>
                <p className="text-2xl font-bold">{stats.experts}</p>
              </div>
              <div className="rounded-xl border border-base-300 bg-base-100 p-3 admin-users-stat">
                <p className="text-xs uppercase opacity-60">Researchers</p>
                <p className="text-2xl font-bold">{stats.researchers}</p>
              </div>
            </div>

            {loading && !users.length ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-4 card bg-base-100 shadow-xl border border-base-300">
                  <div className="card-body space-y-4">
                    <span className="app-skeleton h-8 w-32" />
                    <span className="app-skeleton h-11 w-full rounded-lg" />
                    <span className="app-skeleton h-11 w-full rounded-lg" />
                    <span className="app-skeleton h-11 w-full rounded-lg" />
                    <span className="app-skeleton h-11 w-full rounded-lg" />
                    <span className="app-skeleton h-11 w-full rounded-lg" />
                  </div>
                </div>

                <div className="xl:col-span-8 card bg-base-100 shadow-xl border border-base-300">
                  <div className="card-body space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="app-skeleton h-8 w-32" />
                      <span className="app-skeleton h-6 w-20" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <span className="app-skeleton h-11 w-full rounded-lg" />
                      <span className="app-skeleton h-11 w-full rounded-lg" />
                      <span className="app-skeleton h-11 w-full rounded-lg" />
                    </div>
                    <span className="app-skeleton h-12 w-full rounded-lg" />
                    <span className="app-skeleton h-12 w-full rounded-lg" />
                    <span className="app-skeleton h-12 w-full rounded-lg" />
                  </div>
                </div>
                <div className="xl:col-span-12 flex justify-center pb-2">
                  <span className="modern-loader modern-loader-sm" role="status" aria-label="Loading users"></span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-4 card bg-base-100 shadow-xl border border-base-300 admin-users-panel admin-users-panel-create">
                  <div className="card-body">
                    <h2 className="card-title text-primary">Create User</h2>
                    <form onSubmit={createUser} className="space-y-4 admin-users-form">
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

                      <button className="btn btn-primary w-full mt-2 admin-users-create-btn" type="submit">Create User</button>
                    </form>
                  </div>
                </div>

                <div className="xl:col-span-8 card bg-base-100 shadow-xl border border-base-300 admin-users-panel admin-users-panel-list">
                  <div className="card-body gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="card-title text-secondary">All Users</h2>
                      <div className="badge badge-outline">{filteredUsers.length} shown</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 admin-users-toolbar">
                      <input
                        type="text"
                        className="input input-bordered md:col-span-1"
                        placeholder="Search username, email, group..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <select className="select select-bordered" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="ALL">All Roles</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="EXPERT">EXPERT</option>
                        <option value="RESEARCHER">RESEARCHER</option>
                      </select>
                      <select className="select select-bordered" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DISABLED">Disabled</option>
                      </select>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-base-300 admin-users-table-wrap">
                      <table className="table table-pin-rows w-full">
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
                          {filteredUsers.map((u) => {
                            const isSelf = String(u.id) === String(currentUser?.id || '');
                            const actionBusy = busyActionKey.startsWith(`${u.id}:`);
                            return (
                              <tr key={u.id} className="hover">
                                <td>
                                  <div className="flex flex-col">
                                    <div className="font-semibold">{u.username}</div>
                                    <div className="text-xs opacity-60">{u.email || 'No email'}</div>
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge badge-sm ${roleBadgeClass(u.role)}`}>{u.role}</span>
                                </td>
                                <td>
                                  <span className="badge badge-ghost badge-sm">{u.group || 'No group'}</span>
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
                                      onClick={() => openEditDialog(u)}
                                      disabled={actionBusy}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-xs border border-base-300"
                                      onClick={() => openPasswordDialog(u)}
                                      disabled={actionBusy}
                                    >
                                      Set PW
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-xs border border-base-300"
                                      onClick={() => resetPassword(u.id)}
                                      disabled={actionBusy}
                                    >
                                      Reset PW
                                    </button>
                                    {u.isActive ? (
                                      <button
                                        className="btn btn-ghost btn-xs border border-base-300 text-warning"
                                        onClick={() => toggleActive(u.id, false)}
                                        disabled={actionBusy}
                                      >
                                        Disable
                                      </button>
                                    ) : (
                                      <button
                                        className="btn btn-ghost btn-xs border border-base-300 text-success"
                                        onClick={() => toggleActive(u.id, true)}
                                        disabled={actionBusy}
                                      >
                                        Enable
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-ghost btn-xs border border-error/40 text-error"
                                      onClick={() => deleteUser(u)}
                                      disabled={actionBusy || isSelf}
                                      title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {!filteredUsers.length ? (
                            <tr>
                              <td colSpan="5" className="text-center opacity-50 py-8">No users found</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'SETTINGS' && (
          <div className="card bg-base-100 shadow-xl border border-base-300 max-w-3xl mx-auto">
            <div className="card-body">
              <h2 className="card-title text-primary mb-2">Global Dashboard Settings</h2>
              <p className="text-sm opacity-75 mb-6">
                These settings apply to what information is displayed on the dashboard for all Expert users.
              </p>

              {settingsLoading ? (
                <div className="flex justify-center py-10">
                  <span className="modern-loader modern-loader-sm" role="status" aria-label="Loading settings"></span>
                </div>
              ) : (
                <form onSubmit={saveSettings} className="space-y-6">
                  {/* Target Performance Goal */}
                  <div className="form-control max-w-sm">
                    <label className="label">
                      <span className="label-text font-bold">Target Performance Goal (%)</span>
                      <span className="label-text-alt opacity-70">0-100</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input input-bordered w-full"
                      value={settingsForm.dashboardTargetPerformance}
                      onChange={(e) => setSettingsForm(p => ({ ...p, dashboardTargetPerformance: parseInt(e.target.value) || 0 }))}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt opacity-70">
                        This reflects the target goal circle in the Expert's "Model Goal Progress" widget.
                      </span>
                    </label>
                  </div>

                  <div className="divider opacity-30"></div>

                  {/* Show Metrics Block */}
                  <div className="form-control space-y-2">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={settingsForm.dashboardShowMetrics}
                        onChange={(e) => setSettingsForm(p => ({ ...p, dashboardShowMetrics: e.target.checked }))}
                      />
                      <span className="label-text font-bold">Show High-Level Metrics</span>
                    </label>
                    <span className="text-sm opacity-70 ml-[3.5rem] -mt-1 block">
                      Displays the 4 cards at the top of the dashboard containing totals for Assigned, Completed, Pending, and Average Score.
                    </span>
                  </div>

                  {/* Show Dimensions Block */}
                  <div className="form-control space-y-2">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={settingsForm.dashboardShowDimensions}
                        onChange={(e) => setSettingsForm(p => ({ ...p, dashboardShowDimensions: e.target.checked }))}
                      />
                      <span className="label-text font-bold">Show Dimension Performance Cards</span>
                    </label>
                    <span className="text-sm opacity-70 ml-[3.5rem] -mt-1 block">
                      Displays the grid grouping the expert's average score across specific Likert or Boolean criteria dimensions.
                    </span>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="submit"
                      className="btn btn-primary px-8"
                      disabled={busyActionKey === 'save_settings'}
                    >
                      {busyActionKey === 'save_settings' ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {passwordDialog.open ? (
        <dialog className="modal modal-open">
          <div className="modal-box admin-password-modal">
            <h3 className="font-bold text-lg">Set Password</h3>
            <p className="text-sm opacity-70 mt-1">Update password for <span className="font-semibold">{passwordDialog.username}</span>.</p>

            <form className="mt-4 space-y-3 admin-users-form" onSubmit={submitManualPassword}>
              <div className="form-control">
                <label className="label"><span className="label-text">New Password</span></label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  value={passwordDialog.password}
                  onChange={(e) => setPasswordDialog((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Confirm Password</span></label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="Re-enter password"
                  value={passwordDialog.confirmPassword}
                  onChange={(e) => setPasswordDialog((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-action mt-5">
                <button type="button" className="btn btn-ghost" onClick={closePasswordDialog}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busyActionKey === `${passwordDialog.userId}:setpw`}
                >
                  {busyActionKey === `${passwordDialog.userId}:setpw` ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closePasswordDialog}></div>
        </dialog>
      ) : null}

      {editDialog.open ? (
        <dialog className="modal modal-open">
          <div className="modal-box admin-password-modal">
            <h3 className="font-bold text-lg">Edit User</h3>
            <p className="text-sm opacity-70 mt-1">Update profile fields for <span className="font-semibold">{editDialog.username}</span>.</p>

            <form className="mt-4 space-y-3 admin-users-form" onSubmit={submitEditUser}>
              <div className="form-control">
                <label className="label"><span className="label-text">Email</span></label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="user@example.com"
                  value={editDialog.email}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Group</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs h-auto min-h-0 px-2 py-1"
                    onClick={() => setEditDialog((prev) => ({ ...prev, group: '' }))}
                  >
                    Clear Group
                  </button>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Leave blank for no group"
                  value={editDialog.group}
                  onChange={(e) => setEditDialog((prev) => ({ ...prev, group: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">Role</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={editDialog.role}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="EXPERT">EXPERT</option>
                    <option value="RESEARCHER">RESEARCHER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text">Status</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={editDialog.isActive ? 'ACTIVE' : 'DISABLED'}
                    onChange={(e) => setEditDialog((prev) => ({ ...prev, isActive: e.target.value === 'ACTIVE' }))}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="modal-action mt-5">
                <button type="button" className="btn btn-ghost" onClick={closeEditDialog}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busyActionKey === `${editDialog.userId}:edit`}
                >
                  {busyActionKey === `${editDialog.userId}:edit` ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeEditDialog}></div>
        </dialog>
      ) : null}
    </div>
  );
}
