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
  }

  async function createEvaluation(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    const parsed = safeJsonParse(evalForm.jsonText);
    if (!parsed.ok) {
      setError(`Invalid JSON: ${parsed.error}`);
      return;
    }

    let payload = parsed.value;
    // Allow either full object or just items array
    if (Array.isArray(payload)) {
      payload = { items: payload };
    }

    const finalPayload = {
      filename: payload.filename || evalForm.filename.trim(),
      rag_version: payload.rag_version || evalForm.rag_version.trim(),
      items: payload.items
    };

    if (!finalPayload.filename || !finalPayload.rag_version || !Array.isArray(finalPayload.items) || !finalPayload.items.length) {
      setError('Missing filename / rag_version / items (array)');
      return;
    }

    try {
      await apiFetch('/admin/evaluations', { method: 'POST', body: JSON.stringify(finalPayload) });
      setMsg('Evaluation uploaded.');
      setEvalForm({ filename: '', rag_version: '', jsonText: '' });
      await loadAll();
    } catch (e2) {
      setError(e2.message);
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
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>Evaluation Management</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Upload model outputs, create scoring dimensions, and assign evaluations to experts.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={loadAll} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</button>
        </div>

        {msg ? <p style={{ color: '#1f883d' }}>{msg}</p> : null}
        {error ? <p style={{ color: 'crimson' }}>Error: {error}</p> : null}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 14 }}>
            {/* Upload evaluation */}
            <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Upload Evaluation Output</h3>
              <p className="muted" style={{ marginTop: 6 }}>
                Paste JSON or upload a .json file. Expected shape:
                <code style={{ display: 'block', marginTop: 6, whiteSpace: 'pre-wrap' }}>
{`{\n  "filename": "run_001.json",\n  "rag_version": "v1",\n  "items": [\n    {"query": "...", "rag_output": "...", "reasoning_output": "...", "llm_response": "..."}\n  ]\n}`}
                </code>
              </p>
              <form onSubmit={createEvaluation} style={{ display: 'grid', gap: 10 }}>
                <label>
                  <div className="muted">Filename (fallback if JSON has none)</div>
                  <input value={evalForm.filename} onChange={(e) => setEvalForm((p) => ({ ...p, filename: e.target.value }))} />
                </label>
                <label>
                  <div className="muted">RAG Version (fallback if JSON has none)</div>
                  <input value={evalForm.rag_version} onChange={(e) => setEvalForm((p) => ({ ...p, rag_version: e.target.value }))} />
                </label>
                <label>
                  <div className="muted">JSON File (optional)</div>
                  <input type="file" accept="application/json" onChange={onEvalJsonFile} />
                </label>
                <label>
                  <div className="muted">JSON Content</div>
                  <textarea rows={8} value={evalForm.jsonText} onChange={(e) => setEvalForm((p) => ({ ...p, jsonText: e.target.value }))} placeholder="Paste JSON here…" />
                </label>
                <button className="btn" type="submit">Upload</button>
              </form>
            </div>

            {/* Create scoring */}
            <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Create Scoring Dimension</h3>
              <form onSubmit={createScoring} style={{ display: 'grid', gap: 10 }}>
                <label>
                  <div className="muted">Dimension Name</div>
                  <input value={scoreForm.dimension_name} onChange={(e) => setScoreForm((p) => ({ ...p, dimension_name: e.target.value }))} required />
                </label>
                <label>
                  <div className="muted">Description</div>
                  <input value={scoreForm.dimension_description} onChange={(e) => setScoreForm((p) => ({ ...p, dimension_description: e.target.value }))} />
                </label>
                <div className="row" style={{ gap: 10 }}>
                  <label style={{ flex: 1 }}>
                    <div className="muted">Type</div>
                    <select value={scoreForm.type} onChange={(e) => setScoreForm((p) => ({ ...p, type: e.target.value }))}>
                      <option value="Likert">Likert</option>
                      <option value="Boolean">Boolean</option>
                    </select>
                  </label>
                  <label style={{ width: 90 }}>
                    <div className="muted">Min</div>
                    <input type="number" value={scoreForm.min_range} onChange={(e) => setScoreForm((p) => ({ ...p, min_range: e.target.value }))} />
                  </label>
                  <label style={{ width: 90 }}>
                    <div className="muted">Max</div>
                    <input type="number" value={scoreForm.max_range} onChange={(e) => setScoreForm((p) => ({ ...p, max_range: e.target.value }))} />
                  </label>
                </div>
                <label>
                  <div className="muted">Criteria JSON (optional array)</div>
                  <textarea rows={4} value={scoreForm.criteriaJson} onChange={(e) => setScoreForm((p) => ({ ...p, criteriaJson: e.target.value }))} placeholder='[{"value":1,"criteria_name":"...","description":"..."}]' />
                </label>
                <button className="btn" type="submit">Create Dimension</button>
              </form>
            </div>

            {/* Assign */}
            <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Assign Evaluation</h3>
              <form onSubmit={createAssignment} style={{ display: 'grid', gap: 10 }}>
                <label>
                  <div className="muted">Expert</div>
                  <select value={assignForm.user_assigned} onChange={(e) => setAssignForm((p) => ({ ...p, user_assigned: e.target.value }))} required>
                    <option value="">Select…</option>
                    {expertUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.username} ({u.group})</option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="muted">Evaluation</div>
                  <select value={assignForm.evaluation} onChange={(e) => setAssignForm((p) => ({ ...p, evaluation: e.target.value }))} required>
                    <option value="">Select…</option>
                    {evaluations.map((ev) => (
                      <option key={ev._id} value={ev._id}>{ev.filename} • {ev.rag_version}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="muted">Deadline (optional)</div>
                  <input type="datetime-local" value={assignForm.deadline} onChange={(e) => setAssignForm((p) => ({ ...p, deadline: e.target.value }))} />
                </label>
                <div>
                  <div className="muted" style={{ marginBottom: 6 }}>Scoring Dimensions</div>
                  <div style={{ display: 'grid', gap: 8, maxHeight: 170, overflow: 'auto', border: '1px solid #eee', borderRadius: 10, padding: 10 }}>
                    {scorings.map((s) => (
                      <label key={s._id} className="row" style={{ gap: 10, alignItems: 'center' }}>
                        <input type="checkbox" checked={assignForm.scoringIds.includes(s._id)} onChange={() => toggleScoring(s._id)} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.dimension_name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{s.type} {s.min_range}-{s.max_range}</div>
                        </div>
                      </label>
                    ))}
                    {!scorings.length ? <div className="muted">No scorings yet. Create one first.</div> : null}
                  </div>
                </div>
                <button className="btn" type="submit">Create Assignment</button>
              </form>
            </div>
          </div>
        )}

        {/* Lists */}
        {!loading ? (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
              <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Evaluations ({evaluations.length})</h3>
                <div style={{ maxHeight: 220, overflow: 'auto' }}>
                  {evaluations.map((ev) => (
                    <div key={ev._id} style={{ padding: '8px 0', borderBottom: '1px solid #f2f2f2' }}>
                      <div style={{ fontWeight: 600 }}>{ev.filename}</div>
                      <div className="muted" style={{ fontSize: 12 }}>RAG: {ev.rag_version} • Items: {ev.items?.length || 0} • {fmtDate(ev.createdAt)}</div>
                    </div>
                  ))}
                  {!evaluations.length ? <div className="muted">None yet.</div> : null}
                </div>
              </div>

              <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Assignments ({assignments.length})</h3>
                <div style={{ maxHeight: 220, overflow: 'auto' }}>
                  {assignments.map((a) => (
                    <div key={a._id} style={{ padding: '8px 0', borderBottom: '1px solid #f2f2f2' }}>
                      <div style={{ fontWeight: 600 }}>{a?.evaluation?.filename || 'Evaluation'}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        To: {a.user_assigned} • Deadline: {fmtDate(a.deadline)}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {a.final_submitted ? (
                          <span className="badge" style={{ background: '#1f883d' }}>Submitted</span>
                        ) : a.completion_status ? (
                          <span className="badge" style={{ background: '#9a6700' }}>All scored (not submitted)</span>
                        ) : (
                          <span className="badge" style={{ background: '#9a6700' }}>In progress</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {!assignments.length ? <div className="muted">None yet.</div> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
