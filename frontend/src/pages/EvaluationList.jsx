import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleString();
}

export default function EvaluationList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const completedCount = useMemo(() => rows.filter((r) => r.final_submitted).length, [rows]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/expert/assignments');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function seedSample() {
    setActionMsg('Seeding a sample assignment...');
    try {
      await apiFetch('/expert/test', { method: 'POST', body: JSON.stringify({}) });
      setActionMsg('Sample assignment created. Reloading...');
      await load();
      setActionMsg('');
    } catch (e) {
      setActionMsg(`Failed to seed: ${e.message}`);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Evaluations</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Completed: {completedCount}/{rows.length}
            </p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost" onClick={load} disabled={loading}>
              Reload
            </button>
            <button className="btn" onClick={seedSample} disabled={loading}>
              Create Sample Assignment
            </button>
          </div>
        </div>

        {actionMsg ? <p className="muted" style={{ marginTop: 10 }}>{actionMsg}</p> : null}
        {error ? <p style={{ color: 'crimson', marginTop: 10 }}>Error: {error}</p> : null}

        {loading ? (
          <p className="muted" style={{ marginTop: 14 }}>Loading...</p>
        ) : rows.length === 0 ? (
          <p className="muted" style={{ marginTop: 14 }}>
            No assignments yet. If you want to test the flow, click “Create Sample Assignment”.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Evaluation</th>
                  <th>Assigned</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <Link to={`/evaluation/${a._id}`} className="link">
                        {a?.evaluation?.filename || 'Evaluation'}
                      </Link>
                    </td>
                    <td>{fmtDate(a.date_assigned)}</td>
                    <td>{fmtDate(a.deadline)}</td>
                    <td>
                      {a.final_submitted ? (
                        <span className="badge" style={{ background: '#1f883d' }}>Submitted</span>
                      ) : a.last_draft_saved_at ? (
                        <span className="badge" style={{ background: '#9a6700' }}>Draft saved</span>
                      ) : (
                        <span className="badge" style={{ background: '#9a6700' }}>In progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyAssignments } from "../api/expert";

function daysUntil(date) {
    const diff = new Date(date) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function EvaluationList() {
    console.log("Evaluations List mounted");
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const data = await getMyAssignments();
                setEvaluations(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load assignments");
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, []);

    if (loading) {
        return <div className="p-8">Loading evaluations…</div>;
    }

    if (error) {
        return <div className="p-8 text-error">{error}</div>;
    }

    const batchNumber = evaluations[0]?.evaluation?.rag_version ?? "—";
    const completedCount = evaluations.filter(e => e.completion_status).length;

    const nextDeadlineEval = [...evaluations]
        .filter(e => !e.completion_status)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="card bg-base-200">
                <div className="card-body">
                    <h1 className="text-2xl font-bold">
                        Evaluation Batch #{batchNumber}
                    </h1>

                    <div className="flex gap-12 mt-2">
                        <div>
                            <p className="font-semibold">Next Deadline</p>
                            {nextDeadlineEval ? (
                                <p>
                                    {new Date(nextDeadlineEval.deadline).toLocaleDateString()} —{" "}
                                    <span className="text-error">
                                        in {daysUntil(nextDeadlineEval.deadline)} days
                                    </span>
                                </p>
                            ) : (
                                <p className="text-success">All completed 🎉</p>
                            )}
                        </div>

                        <div>
                            <p className="font-semibold">Progress</p>
                            <p>
                                Completed: {completedCount}/{evaluations.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="table table-zebra">
                    <thead>
                        <tr>
                            <th>Evaluation</th>
                            <th>Date Assigned</th>
                            <th>Deadline</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {evaluations.map((e) => (
                            <tr key={e._id}>
                                <td>
                                    <Link
                                        to={`/evaluation/${e._id}`}
                                        className="link link-primary"
                                    >
                                        {e.evaluation?.filename || "—"}
                                    </Link>
                                </td>
                                <td>{new Date(e.date_assigned).toLocaleDateString()}</td>
                                <td>{new Date(e.deadline).toLocaleDateString()}</td>
                                <td>
                                    {e.completion_status ? (
                                        <span className="badge badge-success">Completed</span>
                                    ) : (
                                        <span className="badge badge-warning">Pending</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

