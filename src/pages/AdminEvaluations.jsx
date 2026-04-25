import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { PencilIcon, TrashIcon } from 'lucide-react';

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

const DEFAULT_BOOLEAN_CRITERIA = [
  { value: 0, criteria_name: 'No', description: 'Condition not met' },
  { value: 1, criteria_name: 'Yes', description: 'Condition met' }
];

function getEvaluationId(ev) {
  return String(ev?.id || ev?._id || '').trim();
}

function getAssignmentId(a) {
  return String(a?.id || a?._id || '').trim();
}

function normalizeCriteriaInput(criteria, { booleanMode = false } = {}) {
  if (!Array.isArray(criteria)) return [];

  return criteria
    .map((c) => {
      const value = Number(c?.value);
      if (!Number.isFinite(value)) return null;

      const derivedName = booleanMode
        ? (value === 1 ? 'Yes' : value === 0 ? 'No' : `Option ${value}`)
        : `Score ${value}`;

      const criteriaName = String(c?.criteria_name || c?.name || c?.label || '').trim() || derivedName;
      const description = String(c?.description || '').trim();

      return {
        value,
        criteria_name: criteriaName,
        description: description || (booleanMode ? (value === 1 ? 'Condition met' : value === 0 ? 'Condition not met' : '') : '')
      };
    })
    .filter(Boolean);
}

export default function AdminEvaluations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [evaluations, setEvaluations] = useState([]);
  const [scorings, setScorings] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [analytics, setAnalytics] = useState({ modelComparison: [], dimensionSummary: [] });

  const [editingDimension, setEditingDimension] = useState(null);

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

  // Create/Edit scoring
  const initialScoreForm = {
    dimension_name: '',
    dimension_description: '',
    type: 'Likert',
    min_range: 1,
    max_range: 5,
    criteriaJson: ''
  };
  const [scoreForm, setScoreForm] = useState(initialScoreForm);

  // Create assignment
  const [assignForm, setAssignForm] = useState({
    group: '',
    evaluation: '',
    scoringIds: [],
    deadline_date: '',
    deadline_time: ''
  });

  const [batchAssignMode, setBatchAssignMode] = useState('single');
  const [batchForm, setBatchForm] = useState({
    group: '',
    version: '',
    scoringIds: [],
    deadline_date: '',
    deadline_time: ''
  });

  const [viewEval, setViewEval] = useState(null);

  const expertUsers = useMemo(() => users.filter((u) => u.role === 'EXPERT' && u.isActive), [users]);
  const activeGroups = useMemo(() => {
    const orgs = new Set(users.filter(u => u.isActive && u.group).map(u => u.group));
    return Array.from(orgs).sort();
  }, [users]);
  const isBooleanScoring = scoreForm.type === 'Boolean';

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [evs, scs, us, asn, vrs, analyticsData] = await Promise.all([
        apiFetch('/admin/evaluations'),
        apiFetch('/admin/scorings'),
        apiFetch('/admin/users'),
        apiFetch('/admin/assignments'),
        apiFetch('/admin/versions'),
        apiFetch('/admin/analytics')
      ]);
      setEvaluations(Array.isArray(evs) ? evs : []);
      setScorings(Array.isArray(scs) ? scs : []);
      setUsers(Array.isArray(us) ? us : []);
      setAssignments(Array.isArray(asn) ? asn : []);
      setVersions(Array.isArray(vrs) ? vrs : []);
      setAnalytics({
        modelComparison: Array.isArray(analyticsData?.modelComparison) ? analyticsData.modelComparison : [],
        dimensionSummary: Array.isArray(analyticsData?.dimensionSummary) ? analyticsData.dimensionSummary : []
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function exportAnalyticsCsv() {
    const rows = [];
    rows.push(['MODEL', 'VERSION', 'AVG_SCORE', 'COMPLETED', 'TOTAL', 'DISTRESS_FAILS', 'MAJOR_ERRORS']);
    for (const model of analytics.modelComparison || []) {
      rows.push([
        model.modelName || '',
        model.modelVersion || '',
        model.avgScore ?? '',
        model.completedAssignments ?? 0,
        model.totalAssignments ?? 0,
        model.distressFails ?? 0,
        model.majorErrors ?? 0
      ]);
    }
    rows.push([]);
    rows.push(['DIMENSION', 'AVG_SCORE', 'RESPONSES']);
    for (const dim of analytics.dimensionSummary || []) {
      rows.push([
        dim.dimensionName || '',
        dim.avgScore ?? '',
        dim.responses ?? 0
      ]);
    }

    const csv = rows.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `evaluation-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
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
        if (payload[0] && Array.isArray(payload[0].messages)) {
          const allItems = [];
          for (const session of payload) {
            let currentQuery = "";
            (session.messages || []).forEach(m => {
              if (m.role === 'user') currentQuery = m.content;
              else if (m.role === 'assistant' && currentQuery) {
                allItems.push({ query: currentQuery, llm_response: m.content });
                currentQuery = "";
              }
            });
          }
          payload = { items: allItems };
        } else {
          payload = { items: payload };
        }
      } else if (payload && Array.isArray(payload.messages) && !payload.items) {
        const allItems = [];
        let currentQuery = "";
        payload.messages.forEach(m => {
          if (m.role === 'user') currentQuery = m.content;
          else if (m.role === 'assistant' && currentQuery) {
            allItems.push({ query: currentQuery, llm_response: m.content });
            currentQuery = "";
          }
        });
        payload.items = allItems;
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

    const booleanMode = scoreForm.type === 'Boolean';
    let rawCriteria = [];
    if (scoreForm.criteriaJson.trim()) {
      const parsed = safeJsonParse(scoreForm.criteriaJson);
      if (!parsed.ok) {
        setError(`Invalid criteria JSON: ${parsed.error}`);
        return;
      }
      rawCriteria = parsed.value;
      if (!Array.isArray(rawCriteria)) {
        setError('Criteria JSON must be an array');
        return;
      }
    }

    let criteria = normalizeCriteriaInput(
      rawCriteria.length ? rawCriteria : (booleanMode ? DEFAULT_BOOLEAN_CRITERIA : []),
      { booleanMode }
    );

    if (booleanMode) {
      const byValue = new Map();
      for (const c of criteria) {
        if (c.value === 0 || c.value === 1) byValue.set(c.value, c);
      }
      if (!byValue.has(0)) byValue.set(0, DEFAULT_BOOLEAN_CRITERIA[0]);
      if (!byValue.has(1)) byValue.set(1, DEFAULT_BOOLEAN_CRITERIA[1]);
      criteria = [byValue.get(0), byValue.get(1)];
    }

    const minRange = booleanMode ? 0 : Number(scoreForm.min_range);
    const maxRange = booleanMode ? 1 : Number(scoreForm.max_range);
    if (!Number.isFinite(minRange) || !Number.isFinite(maxRange)) {
      setError('Min and Max must be valid numbers');
      return;
    }
    if (minRange > maxRange) {
      setError('Min cannot be greater than Max');
      return;
    }

    const payload = {
      dimension_name: scoreForm.dimension_name.trim(),
      dimension_description: scoreForm.dimension_description.trim(),
      type: scoreForm.type,
      min_range: minRange,
      max_range: maxRange,
      criteria
    };

    if (!payload.dimension_name) {
      setError('Dimension name is required');
      return;
    }

    try {
      if (editingDimension) {
        await apiFetch(`/admin/scorings/${editingDimension._id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setMsg('Scoring dimension updated.');
      } else {
        await apiFetch('/admin/scorings', { method: 'POST', body: JSON.stringify(payload) });
        setMsg('Scoring dimension created.');
      }
      setScoreForm(initialScoreForm);
      setEditingDimension(null);
      await loadAll();
    } catch (e2) {
      setError(e2.message);
    }
  }

  function handleEditDimension(dim) {
    setEditingDimension(dim);
    setScoreForm({
      dimension_name: dim.dimension_name || '',
      dimension_description: dim.dimension_description || '',
      type: dim.type || 'Likert',
      min_range: dim.min_range ?? 1,
      max_range: dim.max_range ?? 5,
      criteriaJson: dim.criteria ? JSON.stringify(dim.criteria, null, 2) : ''
    });
    // Scroll to form smoothly
    document.getElementById('dimension-form-card')?.scrollIntoView({ behavior: 'smooth' });
  }

  function cancelEditDimension() {
    setEditingDimension(null);
    setScoreForm(initialScoreForm);
  }

  async function handleDeleteDimension(id) {
    if (!window.confirm("Are you sure you want to delete this dimension? Any assignments using it might be affected.")) return;
    setMsg('');
    setError('');
    try {
      await apiFetch(`/admin/scorings/${id}`, { method: 'DELETE' });
      setMsg('Scoring dimension deleted.');
      if (editingDimension?._id === id) {
        cancelEditDimension();
      }
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteAssignment(id) {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    setMsg('');
    setError('');
    try {
      await apiFetch(`/admin/assignments/${id}`, { method: 'DELETE' });
      setMsg('Assignment deleted.');
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  function toggleScoring(id) {
    const isBatch = batchAssignMode === 'batch';
    const form = isBatch ? batchForm : assignForm;
    const set = new Set(form.scoringIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);

    if (isBatch) setBatchForm(p => ({ ...p, scoringIds: Array.from(set) }));
    else setAssignForm(p => ({ ...p, scoringIds: Array.from(set) }));
  }

  async function createAssignment(e) {
    e.preventDefault();
    setMsg('');
    setError('');

    const isBatch = batchAssignMode === 'batch';
    const form = isBatch ? batchForm : assignForm;

    if (!form.group || (!isBatch && !form.evaluation) || (isBatch && !form.version) || !form.scoringIds.length) {
      setError('Choose a group, ' + (isBatch ? 'version' : 'evaluation') + ', and at least one scoring dimension');
      return;
    }

    const deadline = form.deadline_date
      ? `${form.deadline_date}T${form.deadline_time || '23:59'}`
      : '';

    const payload = isBatch ? {
      group: form.group,
      version: form.version,
      evaluation_scorings: form.scoringIds,
      ...(deadline ? { deadline } : {})
    } : {
      group: form.group,
      evaluation: form.evaluation,
      evaluation_scorings: form.scoringIds,
      ...(deadline ? { deadline } : {})
    };

    if (!isBatch && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.evaluation)) {
      setError('Selected evaluation is invalid. Please reselect the evaluation and try again.');
      return;
    }

    try {
      const url = isBatch ? '/admin/assignments/batch' : '/admin/assignments';
      const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(payload) });
      setMsg(isBatch ? (res.message || 'Batch assignments created.') : 'Assignment created.');
      
      if (isBatch) {
        setBatchForm({ group: '', version: '', scoringIds: [], deadline_date: '', deadline_time: '' });
      } else {
        setAssignForm({ group: '', evaluation: '', scoringIds: [], deadline_date: '', deadline_time: '' });
      }
      await loadAll();
    } catch (e2) {
      setError(e2.message);
    }
  }

  return (
    <div className="h-full w-full bg-base-200 text-base-content font-sans admin-evaluations-shell overflow-y-auto custom-scrollbar pb-20">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-[1400px] animate-fade-in admin-evaluations-content">
        {/* Header */}
        <div className="flex justify-between items-end mb-8 border-b border-base-200 pb-4 admin-eval-header sticky top-0 bg-base-200/90 backdrop-blur z-10 pt-4 -mt-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
              Evaluation Management
            </h1>
            <p className="text-base-content/70 mt-1 text-sm sm:text-base">
              Manage your evaluation pipeline: upload outputs, configure scoring, and assign to experts.
            </p>
          </div>
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 admin-eval-action-grid">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={`admin-eval-skeleton-card-${idx}`} className="card bg-base-100 shadow-xl border border-base-200">
                  <div className="card-body">
                    <span className="app-skeleton h-8 w-40" />
                    <span className="app-skeleton h-4 w-full" />
                    <span className="app-skeleton h-4 w-4/5" />
                    <span className="app-skeleton h-10 w-full rounded-lg" />
                    <span className="app-skeleton h-10 w-full rounded-lg" />
                    <span className="app-skeleton h-10 w-1/2 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={`admin-eval-skeleton-table-${idx}`} className="card bg-base-100 shadow-xl border border-base-200">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <span className="app-skeleton h-7 w-36" />
                      <span className="app-skeleton h-5 w-20" />
                    </div>
                    <span className="app-skeleton h-10 w-full rounded-lg" />
                    <span className="app-skeleton h-10 w-full rounded-lg" />
                    <span className="app-skeleton h-10 w-full rounded-lg" />
                  </div>
                </div>
              ))}
              <div className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <span className="app-skeleton h-7 w-36" />
                    <span className="app-skeleton h-5 w-20" />
                  </div>
                  <span className="app-skeleton h-10 w-full rounded-lg" />
                  <span className="app-skeleton h-10 w-full rounded-lg" />
                  <span className="app-skeleton h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>
            <div className="flex justify-center py-2">
              <span className="modern-loader modern-loader-sm" role="status" aria-label="Loading evaluation dashboard"></span>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* CARD 1: Upload Evaluation */}
              <div className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300 admin-eval-card admin-eval-card-upload">
                <div className="card-body">
                  <h2 className="card-title text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload Output
                  </h2>
                  <div className="division h-px bg-base-200 my-2"></div>

                  <form onSubmit={createEvaluation} className="space-y-4">
                    <div className="tabs tabs-boxed bg-base-200/50 p-1 mb-4 admin-eval-tabs">
                      <a className={`tab flex-1 ${activeTab === 'file' ? 'tab-active' : ''}`} onClick={() => setActiveTab('file')}>File Upload</a>
                      <a className={`tab flex-1 ${activeTab === 'json' ? 'tab-active' : ''}`} onClick={() => setActiveTab('json')}>Paste JSON</a>
                      <a className={`tab flex-1 ${activeTab === 'manual' ? 'tab-active' : ''}`} onClick={() => setActiveTab('manual')}>Manual Entry</a>
                    </div>

                    {activeTab === 'file' && (
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">JSON File</span></label>
                        <input type="file" className="file-input file-input-bordered file-input-primary w-full admin-eval-field" accept="application/json" onChange={onEvalJsonFile} />
                      </div>
                    )}

                    {activeTab === 'json' && (
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">JSON Content (Auto-fills below)</span></label>
                        <textarea
                          className="textarea textarea-bordered h-32 font-mono text-sm admin-eval-field admin-eval-json-textarea"
                          value={evalForm.jsonText}
                          onChange={handleJsonChange}
                          placeholder='{ "items": [...] }'
                        />
                      </div>
                    )}

                    {activeTab === 'manual' && (
                      <div className="space-y-3 bg-base-200/30 p-3 rounded-xl border border-base-200 max-h-60 overflow-y-auto custom-scrollbar admin-eval-manual-wrap">
                        {manualItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start animate-fade-in-up">
                            <div className="flex-1 space-y-2">
                              <input
                                className="input input-bordered input-sm w-full admin-eval-field"
                                placeholder="Question / Query"
                                value={item.query}
                                onChange={e => updateManualItem(idx, 'query', e.target.value)}
                              />
                              <textarea
                                className="textarea textarea-bordered textarea-sm w-full leading-tight admin-eval-field"
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
                          className="btn btn-ghost btn-sm w-full border-dashed border-base-300 admin-eval-add-item-btn"
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
                        className="input input-bordered w-full admin-eval-field"
                        value={evalForm.filename}
                        onChange={(e) => setEvalForm((p) => ({ ...p, filename: e.target.value }))}
                        placeholder="e.g. Test Sim 1"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Version Tag</span></label>
                      <input
                        type="text"
                        className="input input-bordered w-full admin-eval-field"
                        value={evalForm.rag_version}
                        onChange={(e) => setEvalForm((p) => ({ ...p, rag_version: e.target.value }))}
                        placeholder="e.g. v1.0"
                      />
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-primary w-full admin-eval-submit-btn" type="submit">Upload Evaluation</button>
                    </div>
                  </form>
                </div>
              </div>

              {/* CARD 2: Create/Edit Scoring */}
              <div id="dimension-form-card" className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300 admin-eval-card admin-eval-card-dimension">
                <div className="card-body">
                  <div className="flex justify-between items-center">
                    <h2 className="card-title text-secondary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      {editingDimension ? 'Edit Dimension' : 'Create Dimension'}
                    </h2>
                    {editingDimension && (
                      <button type="button" className="btn btn-ghost btn-xs text-error" onClick={cancelEditDimension}>
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="division h-px bg-base-200 my-2"></div>

                  <form onSubmit={createScoring} className="space-y-3">
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Dimension Name</span></label>
                      <input
                        type="text"
                        className="input input-bordered w-full admin-eval-field"
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
                        className="input input-bordered w-full admin-eval-field"
                        value={scoreForm.dimension_description}
                        onChange={(e) => setScoreForm((p) => ({ ...p, dimension_description: e.target.value }))}
                        placeholder="Brief explanation..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">Type</span></label>
                        <div className="admin-eval-select-wrap">
                          <select
                            className="select select-bordered w-full admin-eval-field admin-eval-select"
                            value={scoreForm.type}
                            onChange={(e) => {
                              const nextType = e.target.value;
                              setScoreForm((p) => ({
                                ...p,
                                type: nextType,
                                min_range: nextType === 'Boolean' ? 0 : p.min_range,
                                max_range: nextType === 'Boolean' ? 1 : p.max_range,
                                criteriaJson: nextType === 'Boolean' && !p.criteriaJson.trim()
                                  ? JSON.stringify(DEFAULT_BOOLEAN_CRITERIA, null, 2)
                                  : p.criteriaJson
                              }));
                            }}
                          >
                            <option value="Likert">Likert</option>
                            <option value="Boolean">Boolean</option>
                          </select>
                          <span className="admin-eval-select-caret" aria-hidden="true">
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                              <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="form-control w-full">
                          <label className="label"><span className="label-text font-medium">Min</span></label>
                          <input
                            type="number"
                            className="input input-bordered w-full px-2 admin-eval-field"
                            value={scoreForm.min_range}
                            disabled={isBooleanScoring}
                            onChange={(e) => setScoreForm((p) => ({ ...p, min_range: e.target.value }))}
                          />
                        </div>
                        <div className="form-control w-full">
                          <label className="label"><span className="label-text font-medium">Max</span></label>
                          <input
                            type="number"
                            className="input input-bordered w-full px-2 admin-eval-field"
                            value={scoreForm.max_range}
                            disabled={isBooleanScoring}
                            onChange={(e) => setScoreForm((p) => ({ ...p, max_range: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    {isBooleanScoring ? (
                      <p className="text-xs opacity-70 -mt-2">Boolean uses a fixed range: 0 = No, 1 = Yes.</p>
                    ) : null}

                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Criteria JSON (Optional)</span></label>
                      <textarea
                        className="textarea textarea-bordered h-24 font-mono text-sm admin-eval-field admin-eval-criteria-textarea"
                        value={scoreForm.criteriaJson}
                        onChange={(e) => setScoreForm((p) => ({ ...p, criteriaJson: e.target.value }))}
                        placeholder='[{"value":1,"description":"Bad"}]'
                      />
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-secondary w-full admin-eval-submit-btn" type="submit">
                        {editingDimension ? 'Update Dimension' : 'Create Dimension'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* CARD 3: Assign Evaluation */}
              <div className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300 admin-eval-card admin-eval-card-assign">
                <div className="card-body">
                  <h2 className="card-title text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Assign to Organization
                  </h2>
                  <div className="division h-px bg-base-200 my-2"></div>

                  <form onSubmit={createAssignment} className="space-y-4">
                    <div className="tabs tabs-boxed bg-base-200/50 p-1 mb-4">
                      <a className={`tab tab-sm flex-1 ${batchAssignMode === 'single' ? 'tab-active' : ''}`} onClick={() => setBatchAssignMode('single')}>Single</a>
                      <a className={`tab tab-sm flex-1 ${batchAssignMode === 'batch' ? 'tab-active' : ''}`} onClick={() => setBatchAssignMode('batch')}>Batch (By Version)</a>
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Select Organization</span></label>
                      <div className="admin-eval-select-wrap">
                        <select 
                          className="select select-bordered w-full admin-eval-field admin-eval-select" 
                          value={batchAssignMode === 'batch' ? batchForm.group : assignForm.group} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (batchAssignMode === 'batch') setBatchForm(p => ({ ...p, group: val }));
                            else setAssignForm(p => ({ ...p, group: val }));
                          }} 
                          required
                        >
                          <option value="">Choose...</option>
                          {activeGroups.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                        <span className="admin-eval-select-caret" aria-hidden="true">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                            <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {batchAssignMode === 'single' ? (
                      <div className="form-control">
                        <label className="label"><span className="label-text font-medium">Select Evaluation Item</span></label>
                        <div className="admin-eval-select-wrap">
                          <select className="select select-bordered w-full admin-eval-field admin-eval-select" value={assignForm.evaluation} onChange={(e) => setAssignForm((p) => ({ ...p, evaluation: e.target.value }))} required>
                            <option value="">Choose...</option>
                            {evaluations.map((ev) => {
                              const evId = getEvaluationId(ev);
                              if (!evId) return null;
                              return (
                                <option key={evId} value={evId}>
                                  {ev.filename} ({ev.items?.length || 0} items)
                                </option>
                              );
                            })}
                          </select>
                          <span className="admin-eval-select-caret" aria-hidden="true">
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                              <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="form-control animate-fade-in">
                        <label className="label"><span className="label-text font-medium text-primary">Select Version (Assigns all matching items)</span></label>
                        <div className="admin-eval-select-wrap">
                          <select className="select select-bordered select-primary w-full admin-eval-field admin-eval-select" value={batchForm.version} onChange={(e) => setBatchForm((p) => ({ ...p, version: e.target.value }))} required>
                            <option value="">Choose Batch (Version)...</option>
                            {versions.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                          <span className="admin-eval-select-caret" aria-hidden="true">
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                              <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Scoring Dimensions</span></label>
                      <div className="bg-base-200/50 rounded-lg p-3 h-40 overflow-y-auto border border-base-300 custom-scrollbar admin-eval-scoring-list">
                        {scorings.length === 0 && <p className="text-sm opacity-50 italic text-center py-4">No content yet.</p>}
                        {scorings.map((s) => (
                          <label
                            key={s._id}
                            className={`label cursor-pointer justify-start gap-3 hover:bg-base-200 rounded p-2 transition-colors admin-eval-scoring-item${(batchAssignMode === 'batch' ? batchForm.scoringIds : assignForm.scoringIds).includes(s._id) ? ' admin-eval-scoring-item-selected' : ''}`}
                          >
                            <input type="checkbox" className="checkbox checkbox-sm checkbox-accent admin-eval-score-checkbox" checked={(batchAssignMode === 'batch' ? batchForm.scoringIds : assignForm.scoringIds).includes(s._id)} onChange={() => toggleScoring(s._id)} />
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 admin-eval-deadline-grid">
                        <input
                          type="date"
                          className="input input-bordered w-full admin-eval-field admin-eval-deadline-date"
                          value={batchAssignMode === 'batch' ? batchForm.deadline_date : assignForm.deadline_date}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (batchAssignMode === 'batch') setBatchForm(p => ({ ...p, deadline_date: val }));
                            else setAssignForm(p => ({ ...p, deadline_date: val }));
                          }}
                        />
                        <input
                          type="time"
                          className="input input-bordered w-full admin-eval-field admin-eval-deadline-time"
                          value={batchAssignMode === 'batch' ? batchForm.deadline_time : assignForm.deadline_time}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (batchAssignMode === 'batch') setBatchForm(p => ({ ...p, deadline_time: val }));
                            else setAssignForm(p => ({ ...p, deadline_time: val }));
                          }}
                        />
                      </div>
                      <span className="text-xs opacity-60 mt-1 block admin-eval-deadline-note">
                        Time defaults to 23:59 if left blank.
                      </span>
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-accent w-full admin-eval-submit-btn" type="submit">
                        {batchAssignMode === 'batch' ? 'Run Batch Assignment' : 'Assign Task'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* LISTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 admin-eval-list-grid">
              {/* Evaluations List */}
              <div className="card bg-base-100 shadow-lg border border-base-200 admin-eval-list-card">
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
                        {evaluations.map((ev) => {
                          const evId = getEvaluationId(ev) || `${ev.filename}-${fmtDate(ev.createdAt)}`;
                          return (
                            <tr key={evId} className="hover">
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
                          )
                        })}
                        {!evaluations.length && <tr><td colSpan="3" className="text-center opacity-50 py-4">No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Assignments List */}
              <div className="card bg-base-100 shadow-lg border border-base-200 admin-eval-list-card">
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
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((a) => (
                          <tr key={getAssignmentId(a) || `${a?.evaluation?.filename || 'assignment'}-${a?.deadline || ''}`} className="hover">
                            <td className="font-medium truncate max-w-[150px]" title={a?.evaluation?.filename}>
                              {a?.evaluation?.filename || 'Unknown'}
                            </td>
                            <td>
                              <div className="tooltip" data-tip={a.group}>
                                {a.group || 'Unknown Organization'}
                              </div>
                              <div className="text-[10px] opacity-50">Deadline: {fmtDate(a.deadline)}</div>
                            </td>
                            <td>
                              {a.final_submitted ? (
                                <span className="badge badge-success badge-sm">Submitted</span>
                              ) : a.status === 'IN_PROGRESS' ? (
                                <span className="badge badge-info badge-sm">In Progress</span>
                              ) : a.completion_status ? (
                                <span className="badge badge-warning badge-sm">Done (Unsent)</span>
                              ) : (
                                <span className="badge badge-ghost badge-sm">Pending</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn btn-xs btn-ghost btn-square text-error"
                                onClick={() => handleDeleteAssignment(getAssignmentId(a))}
                                title="Delete"
                              >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                        ))}
                        {!assignments.length && <tr><td colSpan="4" className="text-center opacity-50 py-4">No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Multi-Model Comparison (Moved to bottom) */}
              <div className="card bg-base-100 shadow-lg border border-base-200 mt-6 col-span-1 xl:col-span-2">
                <div className="card-body p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="card-title text-lg">Thesis Analytics and Multi-Model Comparison</h3>
                    <button type="button" className="btn btn-sm btn-outline" onClick={exportAnalyticsCsv}>
                      Export CSV
                    </button>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
                    <div className="overflow-x-auto rounded-xl border border-base-300">
                      <table className="table table-compact w-full">
                        <thead>
                          <tr>
                            <th>Model</th>
                            <th>Version</th>
                            <th>Avg Score</th>
                            <th>Completed</th>
                            <th>Distress Fail</th>
                            <th>Major Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(analytics.modelComparison || []).map((row) => (
                            <tr key={`${row.modelName}-${row.modelVersion}`}>
                              <td className="font-medium">{row.modelName}</td>
                              <td>{row.modelVersion}</td>
                              <td>{row.avgScore ?? '-'}</td>
                              <td>{row.completedAssignments}/{row.totalAssignments}</td>
                              <td>{row.distressFails}</td>
                              <td>{row.majorErrors}</td>
                            </tr>
                          ))}
                          {!analytics.modelComparison?.length ? (
                            <tr><td colSpan="6" className="text-center opacity-60 py-4">No submitted evaluations yet.</td></tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-base-300">
                      <table className="table table-compact w-full">
                        <thead>
                          <tr>
                            <th>Dimension</th>
                            <th>Avg Score</th>
                            <th>Responses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(analytics.dimensionSummary || []).map((row) => (
                            <tr key={row.dimensionName}>
                              <td className="font-medium">{row.dimensionName}</td>
                              <td>{row.avgScore ?? '-'}</td>
                              <td>{row.responses}</td>
                            </tr>
                          ))}
                          {!analytics.dimensionSummary?.length ? (
                            <tr><td colSpan="3" className="text-center opacity-60 py-4">No dimension data yet.</td></tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensions List */}
              <div className="card bg-base-100 shadow-lg border border-base-200 admin-eval-list-card">
                <div className="card-body p-6">
                  <h3 className="card-title text-lg mb-4 flex justify-between">
                    <span>Dimensions</span>
                    <div className="badge badge-outline">{scorings.length} total</div>
                  </h3>
                  <div className="overflow-x-auto h-80 custom-scrollbar">
                    <table className="table table-compact w-full">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type (Range)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scorings.map((s) => (
                          <tr key={s._id} className={`hover ${editingDimension?._id === s._id ? 'bg-base-200' : ''}`}>
                            <td className="font-medium">
                              {s.dimension_name}
                              <div className="text-[10px] opacity-70 truncate max-w-[120px]" title={s.dimension_description}>
                                {s.dimension_description}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-ghost badge-sm">{s.type}</span>
                              <div className="text-[10px] opacity-70 mt-1">
                                {s.min_range} - {s.max_range}
                              </div>
                              {Array.isArray(s.criteria) && s.criteria.length > 0 && (
                                <div className="text-[10px] opacity-50 mt-1">
                                  {s.criteria.length} criteria defined
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button
                                  className="btn btn-xs btn-ghost btn-square text-info"
                                  onClick={() => handleEditDimension(s)}
                                  title="Edit"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost btn-square text-error"
                                  onClick={() => handleDeleteDimension(s._id)}
                                  title="Delete"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!scorings.length && <tr><td colSpan="3" className="text-center opacity-50 py-4">No data</td></tr>}
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
