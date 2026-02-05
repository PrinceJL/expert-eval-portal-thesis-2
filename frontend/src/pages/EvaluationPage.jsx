import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';

function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleString();
}

export default function EvaluationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const scorings = assignment?.evaluation_scorings || [];
  const isLocked = !!assignment?.final_submitted;

  const [form, setForm] = useState({});

  const allScored = useMemo(() => {
    if (!scorings.length) return false;
    return scorings.every((s) => {
      const v = form[s._id]?.score;
      return v !== undefined && v !== null && String(v).length > 0;
    });
  }, [scorings, form]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/expert/assignments/${id}`);
      setAssignment(data);

      // hydrate form from existing user_evaluation_output if present
      const next = {};
      const existing = Array.isArray(data?.user_evaluation_output) ? data.user_evaluation_output : [];
      for (const row of existing) {
        if (!row?.scoring) continue;
        next[String(row.scoring)] = {
          score: row.score ?? '',
          comments: row.comments ?? ''
        };
      }
      setForm(next);
    } catch (e) {
      setError(e.message);
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function setScore(scoringId, score) {
    setForm((prev) => ({
      ...prev,
      [scoringId]: {
        ...(prev[scoringId] || {}),
        score: String(score)
      }
    }));
  }

  function setComments(scoringId, comments) {
    setForm((prev) => ({
      ...prev,
      [scoringId]: {
        ...(prev[scoringId] || {}),
        comments
      }
    }));
  }

  async function saveDraft() {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = scorings.map((s) => ({
        scoring: s._id,
        score: form[s._id]?.score ?? null,
        comments: form[s._id]?.comments ?? null
      }));

      await apiFetch(`/expert/assignments/${id}/draft`, {
        method: 'POST',
        body: JSON.stringify({ user_evaluation_output: payload })
      });

      setMessage('Draft saved.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function finalSubmit() {
    if (!allScored) return;
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const payload = scorings.map((s) => ({
        scoring: s._id,
        score: form[s._id]?.score ?? null,
        comments: form[s._id]?.comments ?? null
      }));

      await apiFetch(`/expert/assignments/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ user_evaluation_output: payload })
      });

      setMessage('Submitted! Your answers are now locked.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Evaluation</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              <Link className="link" to="/evaluation">← Back to list</Link>
            </p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/evaluation')}>Close</button>
            <button className="btn btn-ghost" onClick={saveDraft} disabled={saving || isLocked}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button className="btn" onClick={finalSubmit} disabled={submitting || isLocked || !allScored}>
              {isLocked ? 'Submitted' : submitting ? 'Submitting…' : 'Final Submit'}
            </button>
          </div>
        </div>

        {message ? <p style={{ color: '#1f883d', marginTop: 10 }}>{message}</p> : null}
        {error ? <p style={{ color: 'crimson', marginTop: 10 }}>Error: {error}</p> : null}

        {loading ? (
          <p className="muted" style={{ marginTop: 14 }}>Loading...</p>
        ) : !assignment ? (
          <p className="muted" style={{ marginTop: 14 }}>Assignment not found.</p>
        ) : (
          <>
            <div style={{ marginTop: 14 }}>
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div className="badge">{assignment?.evaluation?.filename || 'Evaluation'}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Assigned: {fmtDate(assignment.date_assigned)} • Deadline: {fmtDate(assignment.deadline)}
                  </div>
                </div>
                <div>
                  {assignment.final_submitted ? (
                    <span className="badge" style={{ background: '#1f883d' }}>Submitted</span>
                  ) : assignment.last_draft_saved_at ? (
                    <span className="badge" style={{ background: '#9a6700' }}>Draft saved</span>
                  ) : (
                    <span className="badge" style={{ background: '#9a6700' }}>In progress</span>
                  )}
                </div>
              </div>
              {assignment.final_submitted ? (
                <p className="muted" style={{ marginTop: 10 }}>
                  Submitted at {fmtDate(assignment.submitted_at)}. Editing is disabled.
                </p>
              ) : null}
            </div>

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />

            <h3 style={{ margin: '0 0 10px' }}>Model Output</h3>
            {Array.isArray(assignment?.evaluation?.items) && assignment.evaluation.items.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {assignment.evaluation.items.map((it, idx) => (
                  <div key={idx} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                    <div className="muted" style={{ marginBottom: 6 }}>Query</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{it.query}</div>

                    <div className="muted" style={{ margin: '10px 0 6px' }}>LLM Response</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{it.llm_response}</div>

                    <details style={{ marginTop: 10 }}>
                      <summary className="link">Show RAG + reasoning</summary>
                      <div style={{ marginTop: 8 }}>
                        <div className="muted">RAG Output</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{it.rag_output}</div>
                        <div className="muted" style={{ marginTop: 8 }}>Reasoning</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{it.reasoning_output}</div>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No evaluation items attached yet.</p>
            )}

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />

            <h3 style={{ margin: '0 0 10px' }}>Scoring</h3>
            {!scorings.length ? (
              <p className="muted">No scoring dimensions are attached to this assignment.</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {scorings.map((s) => {
                  const score = form[s._id]?.score ?? '';
                  const comments = form[s._id]?.comments ?? '';
                  const min = s.min_range ?? 1;
                  const max = s.max_range ?? 5;

                  const range = [];
                  for (let i = min; i <= max; i += 1) range.push(i);

                  return (
                    <div key={s._id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 600 }}>{s.dimension_name}</div>
                      {s.dimension_description ? (
                        <div className="muted" style={{ marginTop: 4 }}>{s.dimension_description}</div>
                      ) : null}

                      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        {range.map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`btn btn-ghost ${String(score) === String(n) ? 'active' : ''}`}
                            onClick={() => (!isLocked ? setScore(s._id, n) : null)}
                            style={{ minWidth: 44 }}
                            disabled={isLocked}
                          >
                            {n}
                          </button>
                        ))}
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <div className="muted" style={{ marginBottom: 6 }}>Comments (optional)</div>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(s._id, e.target.value)}
                          rows={2}
                          style={{ width: '100%', resize: 'vertical' }}
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!allScored && scorings.length ? (
              <p className="muted" style={{ marginTop: 12 }}>
                Choose a score for every dimension to enable submission.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
import { useParams, useNavigate } from "react-router-dom";
import { Button, IconButton, ButtonGroup, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { getAssignmentById, submitEvaluation } from "../api/expert";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

export default function EvaluationPage() {
    console.log("EvaluationPage mounted");
    const { id } = useParams();
    const navigate = useNavigate();

    const [assignment, setAssignment] = useState(null);
    const [dimensionIndex, setDimensionIndex] = useState(0);
    const [scores, setScores] = useState({});
    const [showDescription, setShowDescription] = useState(false);

    useEffect(() => {
        getAssignmentById(id).then(setAssignment);
    }, [id]);

    if (!assignment) {
        return (
            <div className="flex items-center justify-center h-screen bg-base-200">
                <div className="text-lg font-semibold animate-pulse">
                    Loading evaluation…
                </div>
            </div>
        );
    }

    const { evaluation, evaluation_scorings } = assignment;
    const currentScoring = evaluation_scorings[dimensionIndex];
    const isFinal = dimensionIndex === evaluation_scorings.length - 1;

    const handleScore = (value) => {
        setScores((prev) => ({
            ...prev,
            [currentScoring._id]: value,
        }));
    };

    const handleSubmit = async () => {
        const payload = evaluation_scorings.map((s) => ({
            scoring: s._id,
            score: scores[s._id] ?? null,
            comments: "",
        }));

        await submitEvaluation(id, { scores: payload });
        navigate("/");
    };

    const range = [];
    for (let i = currentScoring.min_range; i <= currentScoring.max_range; i++) {
        range.push(i);
    }

    const getCriteriaName = (val) => {
        const crit = currentScoring.criteria.find((c) => c.value === val);
        return crit ? crit.name : "";
    };

    return (
        <div className="flex h-screen bg-gradient-to-r from-base-100 to-base-200">
            {/* Chat Section*/}
            <div className="flex-[3] min-w-[70%] p-8 overflow-y-auto">
                <Typography variant="h5" className="font-bold mb-6 border-b pb-2">
                    {evaluation.filename} — {currentScoring.dimension_name}
                </Typography>

                <div className="space-y-8">
                    {evaluation.items.map((item, i) => (
                        <div key={i} className="space-y-2">
                            {/* Query now on the right */}
                            <div className="chat chat-end">
                                <div className="chat-bubble chat-bubble-primary">
                                    {item.query}
                                </div>
                            </div>
                            {/* Response now on the left */}
                            <div className="chat chat-start">
                                <div className="chat-bubble chat-bubble-secondary">
                                    {item.llm_response}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scoring Section (now 20%) */}
            <div className="w-1/5 p-6 border-l bg-base-200 rounded-lg shadow-lg space-y-4 relative">
                <div className="flex justify-between items-center">
                    <Typography variant="subtitle1" className="font-semibold">
                        Evaluation
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setShowDescription((prev) => !prev)}
                    >
                        {showDescription ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </div>

                {showDescription && (
                    <div className="collapse collapse-open bg-base-300 p-3 rounded-lg shadow text-sm prose">
                        <p className="font-semibold">Description:</p>
                        <p className="mb-2">{currentScoring.dimension_description}</p>

                        <p className="font-semibold">Criteria:</p>
                        <ul className="list-disc ml-4">
                            {currentScoring.criteria
                                .slice()
                                .sort((a, b) => b.value - a.value)
                                .map((c) => (
                                    <li key={c.value}>
                                        <span className="badge badge-outline mr-2">{c.value}</span>
                                        {c.description}
                                    </li>
                                ))}
                        </ul>
                    </div>
                )}

                <ButtonGroup orientation="vertical" fullWidth>
                    {range.map((n) => (
                        <Button
                            key={n}
                            variant={scores[currentScoring._id] === n ? "contained" : "outlined"}
                            color={scores[currentScoring._id] === n ? "primary" : "inherit"}
                            onClick={() => handleScore(n)}
                            className="mb-1"
                        >
                            {n} {getCriteriaName(n) ? `— ${getCriteriaName(n)}` : ""}
                        </Button>
                    ))}
                </ButtonGroup>

                <div className="text-xs text-gray-500 text-center mt-4">
                    Dimension {dimensionIndex + 1} of {evaluation_scorings.length}
                </div>
            </div>

            {/* Navigation */}
            <div className="fixed bottom-0 left-0 w-full bg-base-100 border-t p-4 flex justify-between shadow-lg">
                <Button
                    variant="outlined"
                    disabled={dimensionIndex === 0}
                    onClick={() => setDimensionIndex((i) => i - 1)}
                >
                    Previous
                </Button>

                {isFinal ? (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleSubmit}
                        disabled={!scores[currentScoring._id]}
                    >
                        Submit
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={() => setDimensionIndex((i) => i + 1)}
                        disabled={!scores[currentScoring._id]}
                    >
                        Next
                    </Button>
                )}
            </div>
        </div>
    );
}
