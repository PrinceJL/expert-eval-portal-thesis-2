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
    <div className="min-h-screen bg-base-200 text-base-content font-sans">
      <div className="container mx-auto p-6 max-w-7xl animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-end mb-8 border-b border-base-200 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-base-content">
              Maintenance Management
            </h1>
            <p className="text-base-content/70 mt-2 text-lg">
              Toggle maintenance mode globally or configure per-page maintenance flags.
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

        {loading && !pages.length ? (
          <div className="flex justify-center py-20">
            <button className="btn btn-ghost loading btn-lg">Loading Maintenance Settings...</button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Grid - Status and Update Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Global Status Card */}
              <div className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300">
                <div className="card-body">
                  <h2 className="card-title text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Global Maintenance Status
                  </h2>
                  <div className="divider h-px bg-base-200 my-2"></div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base-content/70">Current Status:</span>
                      {global.isUnderMaintenance ? (
                        <span className="badge badge-warning badge-lg">ON</span>
                      ) : (
                        <span className="badge badge-success badge-lg">OFF</span>
                      )}
                    </div>

                    <div>
                      <div className="text-base-content/70 text-sm mb-1">Message:</div>
                      <div className="bg-base-200 p-3 rounded-lg">
                        {global.maintenanceMessage || <span className="italic opacity-50">No message set</span>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-base-content/70">Last Updated:</span>
                      <span className="badge badge-ghost">{fmtDate(global.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Update Maintenance Form Card */}
              <div className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300">
                <div className="card-body">
                  <h2 className="card-title text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Update Settings
                  </h2>
                  <div className="divider h-px bg-base-200 my-2"></div>

                  <form onSubmit={save} className="space-y-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Page Name</span></label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={form.pageName}
                        onChange={(e) => setForm((p) => ({ ...p, pageName: e.target.value }))}
                        placeholder="GLOBAL or route key"
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt text-base-content/60">Use "GLOBAL" for system-wide maintenance</span>
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label cursor-pointer justify-start gap-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={!!form.isUnderMaintenance}
                          onChange={(e) => setForm((p) => ({ ...p, isUnderMaintenance: e.target.checked }))}
                        />
                        <span className="label-text font-medium">Enable Maintenance Mode</span>
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Message (shown to users)</span></label>
                      <textarea
                        className="textarea textarea-bordered h-24"
                        value={form.maintenanceMessage}
                        onChange={(e) => setForm((p) => ({ ...p, maintenanceMessage: e.target.value }))}
                        placeholder="Enter a message to display to users during maintenance..."
                      />
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-primary w-full" type="submit">Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* All Maintenance Records Table */}
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="card-title text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    All Maintenance Records
                  </h2>
                  <div className="badge badge-outline">Total: {pages.length}</div>
                </div>

                <div className="divider h-px bg-base-200 my-2"></div>

                <div className="overflow-x-auto">
                  <table className="table table-compact w-full">
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>Status</th>
                        <th>Message</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((p) => (
                        <tr key={p.id || p.pageName} className="hover">
                          <td>
                            <span className="font-semibold">{p.pageName}</span>
                          </td>
                          <td>
                            {p.isUnderMaintenance ? (
                              <span className="badge badge-warning badge-sm">ON</span>
                            ) : (
                              <span className="badge badge-success badge-sm">OFF</span>
                            )}
                          </td>
                          <td>
                            <span className="text-base-content/70 text-sm">
                              {p.maintenanceMessage || <span className="italic opacity-50">-</span>}
                            </span>
                          </td>
                          <td>
                            <span className="text-base-content/60 text-xs">{fmtDate(p.updatedAt)}</span>
                          </td>
                        </tr>
                      ))}
                      {!pages.length && (
                        <tr>
                          <td colSpan="4" className="text-center opacity-50 py-8">
                            No maintenance records found
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
