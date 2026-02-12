import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleString();
}

function safeJsonParse(str) {
  try {
    return { ok: true, value: JSON.parse(str) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default function AdminEvaluations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [evaluations, setEvaluations] = useState([]);
  const [scorings, setScorings] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Create evaluation
  const [evalForm, setEvalForm] = useState({ filename: '', rag_version: '', jsonText: '' });
  const [activeTab, setActiveTab] = useState('json');
  const [manualItems, setManualItems] = useState([{ query: '', llm_response: '' }]);

  function addManualItem() {
    setManualItems(prev => [...prev, { query: '', llm_response: '' }]);
  }

  function removeManualItem(index) {
    setManualItems(prev => prev.filter((_, i) => i !== index));
  }

  function updateManualItem(index, field, value) {
    setManualItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  // Create scoring
  const [scoreForm, setScoreForm] = useState({
    dimension_name: '',
    dimension_description: '',
    type: 'Likert',
    min_range: 1,
    max_range: 5,
    criteriaJson: ''
  });

  // Create assignment
  const [assignForm, setAssignForm] = useState({
    user_assigned: '',
    evaluation: '',
    scoringIds: [],
    deadline: ''
  });

  const [viewEval, setViewEval] = useState(null);

  const expertUsers = useMemo(() => users.filter((u) => u.role === 'EXPERT' && u.isActive), [users]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [evs, scs, us, asn] = await Promise.all([
        apiFetch('/admin/evaluations'),
        apiFetch('/admin/scorings'),
        apiFetch('/admin/users'),
        apiFetch('/admin/assignments')
      ]);
      setEvaluations(Array.isArray(evs) ? evs : []);
      setScorings(Array.isArray(scs) ? scs : []);
      setUsers(Array.isArray(us) ? us : []);
      setAssignments(Array.isArray(asn) ? asn : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onEvalJsonFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setEvalForm((p) => ({ ...p, jsonText: text }));

    // Auto-fill logic for file upload as well
    const parsed = safeJsonParse(text);
    if (parsed.ok && !Array.isArray(parsed.value)) {
      const { title, filename, rag_version } = parsed.value;
      setEvalForm((p) => ({
        ...p,
        filename: title || filename || p.filename,
        rag_version: rag_version || p.rag_version
      }));
    }
  }

  function handleJsonChange(e) {
    const text = e.target.value;

    const parsed = safeJsonParse(text);
    if (parsed.ok && !Array.isArray(parsed.value)) {
      const { title, filename, rag_version } = parsed.value;
      setEvalForm((p) => ({
        ...p,
        jsonText: text,
        filename: title || filename || p.filename,
        rag_version: rag_version || p.rag_version
      }));
    } else {
      setEvalForm((p) => ({ ...p, jsonText: text }));
    }
  }

  async function createEvaluation(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    let payload = {};

    if (activeTab === 'manual') {
      const validItems = manualItems.filter(i => i.query.trim() || i.llm_response.trim());
      if (!validItems.length) {
        setError('Please add at least one item with a question or answer.');
        return;
      }
      payload = { items: validItems };
    } else {
      // JSON or File mode
      if (!evalForm.jsonText.trim()) {
        setError('Please provide JSON content (via file upload or paste).');
        return;
      }
      const parsed = safeJsonParse(evalForm.jsonText);
      if (!parsed.ok) {
        setError(`Invalid JSON syntax. Please check for trailing commas or missing quotes. (${parsed.error})`);
        return;
      }
      payload = parsed.value;
      if (Array.isArray(payload)) {
        payload = { items: payload };
      }
    }

    const finalPayload = {
      filename: payload.filename || evalForm.filename.trim(),
      rag_version: payload.rag_version || evalForm.rag_version.trim(),
      items: payload.items
    };

    if (!finalPayload.filename) {
      setError('Evaluation Title is missing. Please enter it in the form or include "filename" in the JSON.');
      return;
    }
    if (!finalPayload.rag_version) {
      setError('Version/Tag is missing. Please enter it in the form or include "rag_version" in the JSON.');
      return;
    }
    if (!Array.isArray(finalPayload.items) || !finalPayload.items.length) {
      setError('JSON must contain an "items" array with at least one entry.');
      return;
    }

    try {
      await apiFetch('/admin/evaluations', { method: 'POST', body: JSON.stringify(finalPayload) });
      setMsg('Evaluation uploaded successfully!');
      setEvalForm({ filename: '', rag_version: '', jsonText: '' });
      await loadAll();
    } catch (e2) {
      setError(`Upload failed: ${e2.message}`);
    }
  }

  async function createScoring(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    let criteria = [];
    if (scoreForm.criteriaJson.trim()) {
      const parsed = safeJsonParse(scoreForm.criteriaJson);
      if (!parsed.ok) {
        setError(`Invalid criteria JSON: ${parsed.error}`);
        return;
      }
      criteria = parsed.value;
      if (!Array.isArray(criteria)) {
        setError('Criteria JSON must be an array');
        return;
      }
    }

    const payload = {
      dimension_name: scoreForm.dimension_name.trim(),
      dimension_description: scoreForm.dimension_description.trim(),
      type: scoreForm.type,
      min_range: Number(scoreForm.min_range),
      max_range: Number(scoreForm.max_range),
      criteria
    };

    if (!payload.dimension_name) {
      setError('Dimension name is required');
      return;
    }

    try {
      await apiFetch('/admin/scorings', { method: 'POST', body: JSON.stringify(payload) });
      setMsg('Scoring dimension created.');
      setScoreForm({ dimension_name: '', dimension_description: '', type: 'Likert', min_range: 1, max_range: 5, criteriaJson: '' });
      await loadAll();
    } catch (e2) {
      setError(e2.message);
    }
  }

  function toggleScoring(id) {
    setAssignForm((p) => {
      const set = new Set(p.scoringIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...p, scoringIds: Array.from(set) };
    });
  }

  async function createAssignment(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!assignForm.user_assigned || !assignForm.evaluation || !assignForm.scoringIds.length) {
      setError('Choose an expert, evaluation, and at least one scoring dimension');
      return;
    }

    const payload = {
      user_assigned: assignForm.user_assigned,
      evaluation: assignForm.evaluation,
      evaluation_scorings: assignForm.scoringIds,
      ...(assignForm.deadline ? { deadline: assignForm.deadline } : {})
    };

    try {
      await apiFetch('/admin/assignments', { method: 'POST', body: JSON.stringify(payload) });
      setMsg('Assignment created.');
      setAssignForm({ user_assigned: '', evaluation: '', scoringIds: [], deadline: '' });
      await loadAll();
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
              Evaluation Management
            </h1>
            <p className="text-base-content/70 mt-2 text-lg">
              Manage your evaluation pipeline: upload outputs, configure scoring, and assign to experts.
            </p>
          </div>
          <button
            className={`btn btn-ghost btn-sm gap-2 ${loading ? 'loading' : ''}`}
            onClick={loadAll}
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

        {loading && !evaluations.length ? (
          <div className="flex justify-center py-20">
            <button className="btn btn-ghost loading btn-lg">Loading Dashboard...</button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* CARD 1: Upload Evaluation */}
              <div className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300">
                <div className="card-body">
                  <h2 className="card-title text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload Output
                  </h2>
                  <div className="division h-px bg-base-200 my-2"></div>

                  <form onSubmit={createEvaluation} className="space-y-4">
                    <div className="tabs tabs-boxed bg-base-200/50 p-1 mb-4">
                      <a className={`tab flex-1 ${activeTab === 'file' ? 'tab-active' : ''}`} onClick={() => setActiveTab('file')}>File Upload</a>
                      <a className={`tab flex-1 ${activeTab === 'json' ? 'tab-active' : ''}`} onClick={() => setActiveTab('json')}>Paste JSON</a>
                      <a className={`tab flex-1 ${activeTab === 'manual' ? 'tab-active' : ''}`} onClick={() => setActiveTab('manual')}>Manual Entry</a>
                    </div>

                    {activeTab === 'file' && (
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">JSON File</span></label>
                        <input type="file" className="file-input file-input-bordered file-input-primary w-full" accept="application/json" onChange={onEvalJsonFile} />
                      </div>
                    )}

                    {activeTab === 'json' && (
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">JSON Content (Auto-fills below)</span></label>
                        <textarea
                          className="textarea textarea-bordered h-32 font-mono text-sm"
                          value={evalForm.jsonText}
                          onChange={handleJsonChange}
                          placeholder='{ "items": [...] }'
                        />
                      </div>
                    )}

                    {activeTab === 'manual' && (
                      <div className="space-y-3 bg-base-200/30 p-3 rounded-xl border border-base-200 max-h-60 overflow-y-auto custom-scrollbar">
                        {manualItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start animate-fade-in-up">
                            <div className="flex-1 space-y-2">
                              <input
                                className="input input-bordered input-sm w-full"
                                placeholder="Question / Query"
                                value={item.query}
                                onChange={e => updateManualItem(idx, 'query', e.target.value)}
                              />
                              <textarea
                                className="textarea textarea-bordered textarea-sm w-full leading-tight"
                                placeholder="LLM Response"
                                rows={2}
                                value={item.llm_response}
                                onChange={e => updateManualItem(idx, 'llm_response', e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs btn-square text-error mt-2"
                              onClick={() => removeManualItem(idx)}
                              title="Remove item"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm w-full border-dashed border-base-300"
                          onClick={addManualItem}
                        >
                          + Add Item
                        </button>
                      </div>
                    )}

                    <div className="division h-px bg-base-200 my-2"></div>

                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Evaluation Title</span></label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={evalForm.filename}
                        onChange={(e) => setEvalForm((p) => ({ ...p, filename: e.target.value }))}
                        placeholder="e.g. Test Sim 1"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Version Tag</span></label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={evalForm.rag_version}
                        onChange={(e) => setEvalForm((p) => ({ ...p, rag_version: e.target.value }))}
                        placeholder="e.g. v1.0"
                      />
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-primary w-full" type="submit">Upload Evaluation</button>
                    </div>
                  </form>
                </div>
              </div>

              {/* CARD 2: Create Scoring */}
              <div className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300">
                <div className="card-body">
                  <h2 className="card-title text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Create Dimension
                  </h2>
                  <div className="division h-px bg-base-200 my-2"></div>

                  <form onSubmit={createScoring} className="space-y-3">
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Dimension Name</span></label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={scoreForm.dimension_name}
                        onChange={(e) => setScoreForm((p) => ({ ...p, dimension_name: e.target.value }))}
                        required
                        placeholder="e.g. Accuracy"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Description</span></label>
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={scoreForm.dimension_description}
                        onChange={(e) => setScoreForm((p) => ({ ...p, dimension_description: e.target.value }))}
                        placeholder="Brief explanation..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">Type</span></label>
                        <select className="select select-bordered w-full" value={scoreForm.type} onChange={(e) => setScoreForm((p) => ({ ...p, type: e.target.value }))}>
                          <option value="Likert">Likert</option>
                          <option value="Boolean">Boolean</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="form-control w-full">
                          <label className="label"><span className="label-text font-medium">Min</span></label>
                          <input type="number" className="input input-bordered w-full px-2" value={scoreForm.min_range} onChange={(e) => setScoreForm((p) => ({ ...p, min_range: e.target.value }))} />
                        </div>
                        <div className="form-control w-full">
                          <label className="label"><span className="label-text font-medium">Max</span></label>
                          <input type="number" className="input input-bordered w-full px-2" value={scoreForm.max_range} onChange={(e) => setScoreForm((p) => ({ ...p, max_range: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Criteria JSON (Optional)</span></label>
                      <textarea
                        className="textarea textarea-bordered h-24 font-mono text-sm"
                        value={scoreForm.criteriaJson}
                        onChange={(e) => setScoreForm((p) => ({ ...p, criteriaJson: e.target.value }))}
                        placeholder='[{"value":1,"description":"Bad"}]'
                      />
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-secondary w-full" type="submit">Create Dimension</button>
                    </div>
                  </form>
                </div>
              </div>

              {/* CARD 3: Assign Evaluation */}
              <div className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300">
                <div className="card-body">
                  <h2 className="card-title text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Assign to Expert
                  </h2>
                  <div className="division h-px bg-base-200 my-2"></div>

                  <form onSubmit={createAssignment} className="space-y-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Select Expert</span></label>
                      <select className="select select-bordered w-full" value={assignForm.user_assigned} onChange={(e) => setAssignForm((p) => ({ ...p, user_assigned: e.target.value }))} required>
                        <option value="">Choose...</option>
                        {expertUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.username} ({u.group})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Select Evaluation</span></label>
                      <select className="select select-bordered w-full" value={assignForm.evaluation} onChange={(e) => setAssignForm((p) => ({ ...p, evaluation: e.target.value }))} required>
                        <option value="">Choose...</option>
                        {evaluations.map((ev) => (
                          <option key={ev._id} value={ev._id}>{ev.filename} ({ev.items?.length || 0} items)</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Scoring Dimensions</span></label>
                      <div className="bg-base-200/50 rounded-lg p-3 h-40 overflow-y-auto border border-base-300 custom-scrollbar">
                        {scorings.length === 0 && <p className="text-sm opacity-50 italic text-center py-4">No content yet.</p>}
                        {scorings.map((s) => (
                          <label key={s._id} className="label cursor-pointer justify-start gap-3 hover:bg-base-200 rounded p-2 transition-colors">
                            <input type="checkbox" className="checkbox checkbox-sm checkbox-accent" checked={assignForm.scoringIds.includes(s._id)} onChange={() => toggleScoring(s._id)} />
                            <div className="leading-tight">
                              <span className="font-semibold block">{s.dimension_name}</span>
                              <span className="text-xs opacity-60 block">{s.type} ({s.min_range}-{s.max_range})</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Deadline (Optional)</span></label>
                      <input type="datetime-local" className="input input-bordered w-full" value={assignForm.deadline} onChange={(e) => setAssignForm((p) => ({ ...p, deadline: e.target.value }))} />
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-accent w-full" type="submit">Assign Task</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* LISTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Evaluations List */}
              <div className="card bg-base-100 shadow-lg border border-base-200">
                <div className="card-body p-6">
                  <h3 className="card-title text-lg mb-4 flex justify-between">
                    <span>Evaluations</span>
                    <div className="badge badge-outline">{evaluations.length} total</div>
                  </h3>
                  <div className="overflow-x-auto h-80 custom-scrollbar">
                    <table className="table table-compact w-full">
                      <thead>
                        <tr>
                          <th>Title / File</th>
                          <th>Details</th>
                          <th>Uploaded</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluations.map((ev) => (
                          <tr key={ev._id} className="hover">
                            <td className="font-medium">{ev.filename}</td>
                            <td className="text-xs opacity-70">
                              <div className="badge badge-ghost badge-sm mr-1">{ev.rag_version}</div>
                              {ev.items?.length || 0} items
                            </td>
                            <td className="text-xs opacity-50">{fmtDate(ev.createdAt)}</td>
                            <td>
                              <button
                                className="btn btn-xs btn-ghost border border-base-300"
                                onClick={() => setViewEval(ev)}
                              >
                                View Items
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!evaluations.length && <tr><td colSpan="3" className="text-center opacity-50 py-4">No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Assignments List */}
              <div className="card bg-base-100 shadow-lg border border-base-200">
                <div className="card-body p-6">
                  <h3 className="card-title text-lg mb-4 flex justify-between">
                    <span>Assignments</span>
                    <div className="badge badge-outline">{assignments.length} total</div>
                  </h3>
                  <div className="overflow-x-auto h-80 custom-scrollbar">
                    <table className="table table-compact w-full">
                      <thead>
                        <tr>
                          <th>Evaluation</th>
                          <th>Assignee</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((a) => (
                          <tr key={a._id} className="hover">
                            <td className="font-medium truncate max-w-[150px]" title={a?.evaluation?.filename}>
                              {a?.evaluation?.filename || 'Unknown'}
                            </td>
                            <td>
                              <div className="tooltip" data-tip={a.user_assigned}>
                                {expertUsers.find(u => u.id === a.user_assigned)?.username || a.user_assigned}
                              </div>
                              <div className="text-[10px] opacity-50">Deadline: {fmtDate(a.deadline)}</div>
                            </td>
                            <td>
                              {a.final_submitted ? (
                                <span className="badge badge-success badge-sm">Submitted</span>
                              ) : a.completion_status ? (
                                <span className="badge badge-warning badge-sm">Done (Unsent)</span>
                              ) : (
                                <span className="badge badge-ghost badge-sm">In Progress</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!assignments.length && <tr><td colSpan="3" className="text-center opacity-50 py-4">No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewEval && (
          <dialog className="modal modal-open animate-fade-in">
            <div className="modal-box w-11/12 max-w-5xl">
              <h3 className="font-bold text-lg flex items-center justify-between">
                <span>
                  {viewEval.filename}
                  <span className="badge badge-primary ml-3">{viewEval.rag_version}</span>
                </span>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setViewEval(null)}>✕</button>
              </h3>
              <div className="py-4">
                <p className="text-sm opacity-70 mb-4">
                  Total Items: {viewEval.items?.length || 0}
                </p>
                <div className="overflow-x-auto max-h-[60vh] custom-scrollbar border border-base-200 rounded-lg">
                  <table className="table table-compact w-full relative">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="bg-base-200 w-1/12">#</th>
                        <th className="bg-base-200 w-5/12">Full Query / Prompt</th>
                        <th className="bg-base-200 w-6/12">LLM Response / Answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewEval.items?.map((item, i) => (
                        <tr key={i} className="hover">
                          <td className="opacity-50 align-top">{i + 1}</td>
                          <td className="whitespace-pre-wrap align-top font-mono text-xs">{item.query}</td>
                          <td className="whitespace-pre-wrap align-top font-mono text-xs text-base-content/80">{item.llm_response}</td>
                        </tr>
                      ))}
                      {!viewEval.items?.length && (
                        <tr><td colSpan="3" className="text-center py-8 opacity-50">No items found in this evaluation.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-action">
                <button className="btn" onClick={() => setViewEval(null)}>Close</button>
              </div>
            </div>
            <div className="modal-backdrop bg-black/20" onClick={() => setViewEval(null)}></div>
          </dialog>
        )}
      </div>
    </div>
  );
}
