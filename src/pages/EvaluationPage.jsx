import { useParams, useNavigate } from "react-router-dom";
import { Button, IconButton, ButtonGroup, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { getAssignmentById, saveEvaluationDraft, submitEvaluation } from "../api/expert";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

const ERROR_LEVEL_OPTIONS = ["none", "minor", "moderate", "major"];

function normalizeScoreValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function EvaluationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [dimensionIndex, setDimensionIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [showDescription, setShowDescription] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);

  const [distressApplicable, setDistressApplicable] = useState(false);
  const [distressResult, setDistressResult] = useState("N/A");
  const [distressNotes, setDistressNotes] = useState("");
  const [highRiskRequired, setHighRiskRequired] = useState(false);

  const [errorLevel, setErrorLevel] = useState("none");
  const [errorDescription, setErrorDescription] = useState("");

  const loadAssignment = async () => {
    const data = await getAssignmentById(id);
    setAssignment(data);

    const currentSubmission = data?.evaluation_state?.current;
    const nextScores = {};
    const nextNotes = {};

    const responses = Array.isArray(currentSubmission?.responses) ? currentSubmission.responses : [];
    for (const response of responses) {
      const scoringId = String(response?.scoring_id || response?.scoring || "").trim();
      if (!scoringId) continue;
      nextScores[scoringId] = normalizeScoreValue(response?.score);
      nextNotes[scoringId] = String(response?.note || "");
    }

    setScores(nextScores);
    setNotes(nextNotes);

    const hasHighRiskFlag = Array.isArray(data?.evaluation?.items)
      ? data.evaluation.items.some(
        (item) => Boolean(item?.isHighRisk || item?.highRisk) || String(item?.riskLevel || "").toLowerCase() === "high"
      )
      : false;
    setHighRiskRequired(hasHighRiskFlag);

    const distress = data?.evaluation_state?.distress_detection || currentSubmission?.distressDetection || {};
    setDistressApplicable(Boolean(distress?.applicable) || hasHighRiskFlag);
    setDistressResult(String(distress?.result || "N/A").toUpperCase());
    setDistressNotes(String(distress?.notes || ""));

    const severity = data?.evaluation_state?.error_severity || currentSubmission?.errorSeverity || {};
    const level = String(severity?.level || "none").toLowerCase();
    setErrorLevel(ERROR_LEVEL_OPTIONS.includes(level) ? level : "none");
    setErrorDescription(String(severity?.description || ""));
  };

  useEffect(() => {
    loadAssignment().catch((err) => {
      setErrorMessage(err?.response?.data?.error || err?.message || "Failed to load assignment");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const evaluationScorings = useMemo(
    () => (Array.isArray(assignment?.evaluation_scorings) ? assignment.evaluation_scorings : []),
    [assignment]
  );

  const currentScoring = evaluationScorings[dimensionIndex] || null;
  const isFinalDimension = dimensionIndex === evaluationScorings.length - 1;
  const isLocked = Boolean(assignment?.is_locked || assignment?.final_submitted);

  const scoreRange = useMemo(() => {
    if (!currentScoring) return [];
    const min = Number(currentScoring.min_range ?? 1);
    const max = Number(currentScoring.max_range ?? 5);
    if (currentScoring.type === "Boolean") return [0, 1];

    const values = [];
    for (let value = min; value <= max; value += 1) values.push(value);
    return values;
  }, [currentScoring]);

  const progressCount = evaluationScorings.filter((scoring) => {
    const score = normalizeScoreValue(scores[scoring._id]);
    return score !== null;
  }).length;

  const payloadFromState = () => {
    const responses = evaluationScorings.map((scoring) => ({
      scoring_id: scoring._id,
      score: normalizeScoreValue(scores[scoring._id]),
      note: String(notes[scoring._id] || "").trim()
    }));

    return {
      responses,
      distressDetection: {
        applicable: distressApplicable,
        result: distressApplicable ? distressResult : "N/A",
        notes: distressNotes.trim()
      },
      errorSeverity: {
        level: errorLevel,
        description: errorDescription.trim(),
        overridesScore: errorLevel === "major"
      }
    };
  };

  const validateFinalSubmission = () => {
    for (const scoring of evaluationScorings) {
      if (normalizeScoreValue(scores[scoring._id]) === null) {
        return `Please score ${scoring.dimension_name} before final submission.`;
      }
    }

    if (highRiskRequired && !distressApplicable) {
      return "Distress detection is required for this high-risk case.";
    }

    if (distressApplicable && !["PASS", "FAIL"].includes(distressResult)) {
      return "Please set Distress Detection to PASS or FAIL.";
    }

    return "";
  };

  const handleSaveDraft = async () => {
    if (isLocked) return;

    setSavingDraft(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const payload = payloadFromState();
      const response = await saveEvaluationDraft(id, payload);
      setInfoMessage(response?.message || "Draft saved.");
      await loadAssignment();
    } catch (err) {
      setErrorMessage(err?.response?.data?.error || err?.message || "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (isLocked) return;

    const validationError = validateFinalSubmission();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmittingFinal(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const payload = payloadFromState();
      await submitEvaluation(id, payload);
      setInfoMessage("Final evaluation submitted. This assignment is now locked.");
      await loadAssignment();
      navigate("/evaluation");
    } catch (err) {
      setErrorMessage(err?.response?.data?.error || err?.message || "Failed to submit final evaluation");
    } finally {
      setSubmittingFinal(false);
    }
  };

  if (!assignment) {
    return (
      <div className="flex h-screen bg-base-100 font-sans">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-xl">
              <span className="app-skeleton h-9 w-2/3" />
              <span className="app-skeleton mt-3 h-5 w-1/2" />
              <span className="app-skeleton mt-6 h-36 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-xl">
              <span className="app-skeleton h-8 w-56" />
              <span className="app-skeleton mt-4 h-12 w-full rounded-lg" />
              <span className="app-skeleton mt-3 h-12 w-full rounded-lg" />
              <span className="app-skeleton mt-3 h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluationScorings.length) {
    return (
      <div className="p-8">
        <div className="alert alert-error max-w-3xl">
          <span>No scoring dimensions are assigned for this task. Ask admin to re-assign this evaluation.</span>
        </div>
      </div>
    );
  }

  const getCriteriaName = (value) => {
    const criterion = currentScoring?.criteria?.find((item) => Number(item.value) === Number(value));
    if (criterion?.criteria_name) return criterion.criteria_name;
    if (currentScoring?.type === "Boolean") return Number(value) === 1 ? "Yes" : "No";
    return "";
  };

  const hasCurrentScore =
    normalizeScoreValue(scores[currentScoring?._id]) !== null &&
    normalizeScoreValue(scores[currentScoring?._id]) !== undefined;

  return (
    <div className="flex flex-col lg:flex-row w-full lg:overflow-hidden bg-base-100 font-sans lg:h-[calc(100vh-65px)] min-h-[calc(100vh-65px)]">
      <div className="flex flex-col lg:flex-row lg:flex-1 h-auto lg:h-full relative">
        <div className="flex-1 lg:overflow-y-auto p-4 sm:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto w-full pb-10 space-y-6">
            <Typography variant="h5" className="font-bold text-2xl border-b pb-4 border-base-300">
              {assignment?.evaluation?.filename} - <span className="text-primary">{currentScoring?.dimension_name}</span>
            </Typography>

            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-outline">{progressCount}/{evaluationScorings.length} scored</span>
              {assignment?.final_submitted ? <span className="badge badge-success">Final Submitted</span> : null}
              {assignment?.is_locked ? <span className="badge badge-neutral">Locked</span> : null}
              {assignment?.evaluation_state?.last_draft_saved_at ? (
                <span className="badge badge-ghost">Last draft: {new Date(assignment.evaluation_state.last_draft_saved_at).toLocaleString()}</span>
              ) : null}
            </div>

            {errorMessage ? (
              <div className="alert alert-error">
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {infoMessage ? (
              <div className="alert alert-success">
                <span>{infoMessage}</span>
              </div>
            ) : null}

            <div className="space-y-10">
              {assignment?.evaluation?.items?.map((item, index) => (
                <div key={index} className="flex flex-col gap-4">
                  <div className="chat chat-end">
                    <div className="chat-header opacity-50 text-xs mb-1 uppercase tracking-wide font-semibold">User Query</div>
                    <div className="chat-bubble chat-bubble-info text-white shadow-sm text-lg leading-relaxed">{item.query}</div>
                  </div>
                  <div className="chat chat-start">
                    <div className="chat-header opacity-50 text-xs mb-1 uppercase tracking-wide font-semibold">Model Response</div>
                    <div className="chat-bubble bg-base-200 text-base-content shadow-md text-lg leading-relaxed border border-base-300">
                      {item.llm_response}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex lg:h-full w-full lg:w-[450px] flex-col lg:overflow-hidden border-t lg:border-t-0 lg:border-l border-base-300 bg-base-100 shadow-xl">
        <div className="flex-1 lg:overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
          {isLocked ? (
            <div className="space-y-6">
              <Typography variant="h6" className="font-bold border-b border-base-300 pb-2">
                Evaluation Summary
              </Typography>

              <div className="space-y-4">
                {evaluationScorings.map((scoring, idx) => {
                  const scoreVal = scores[scoring._id];
                  const noteVal = notes[scoring._id];
                  return (
                    <div key={scoring._id} className="bg-base-200 p-4 rounded-xl border border-base-300">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">{idx + 1}. {scoring.dimension_name}</span>
                        <span className="badge badge-primary font-bold">Score: {scoreVal != null ? scoreVal : "N/A"}</span>
                      </div>
                      {noteVal ? (
                        <p className="text-sm opacity-80 mt-2 bg-base-100 p-2 rounded">
                          <span className="font-medium">Note:</span> {noteVal}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="divider my-2" />

              <div className="space-y-4">
                <Typography variant="subtitle2" className="font-semibold">Safety & Severity</Typography>

                <div className="bg-base-200 p-4 rounded-xl border border-base-300 space-y-3">
                  <div>
                    <span className="font-medium text-sm block mb-1">Distress Detection:</span>
                    {distressApplicable ? (
                      <span className={`badge ${distressResult === "PASS" ? "badge-success" : "badge-error"}`}>
                        {distressResult}
                      </span>
                    ) : (
                      <span className="badge badge-neutral">Not Applicable</span>
                    )}
                    {distressNotes && <p className="text-sm mt-2 opacity-80 break-words">{distressNotes}</p>}
                  </div>

                  <div className="divider my-0" />

                  <div>
                    <span className="font-medium text-sm block mb-1">Error Severity:</span>
                    <span className="badge badge-outline uppercase object-contain">{errorLevel}</span>
                    {errorDescription && <p className="text-sm mt-2 opacity-80 break-words">{errorDescription}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-4 pb-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="flex items-center justify-between cursor-pointer group tooltip tooltip-bottom z-[100]"
                data-tip="Click to view scoring criteria description"
                onClick={() => setShowDescription((prev) => !prev)}
              >
                <Typography variant="h6" className="font-bold text-lg leading-snug group-hover:text-primary transition-colors">
                  {currentScoring?.dimension_name}
                </Typography>
                <IconButton size="small" className="pointer-events-none">
                  {showDescription ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              </div>

              <div className="divider mt-0 mb-2" />

              <div>
                {showDescription && (
                  <div className="bg-base-200 border border-base-300 rounded-lg p-3 text-sm leading-relaxed mb-4">
                    {currentScoring?.dimension_description || "No description available."}
                  </div>
                )}

                <ButtonGroup orientation="vertical" variant="outlined" fullWidth className="gap-2">
                  {scoreRange.map((value) => (
                    <Button
                      key={value}
                      disabled={isLocked}
                      variant={Number(scores[currentScoring._id]) === value ? "contained" : "outlined"}
                      color={Number(scores[currentScoring._id]) === value ? "primary" : "inherit"}
                      onClick={() => setScores((prev) => ({ ...prev, [currentScoring._id]: value }))}
                      className="!justify-between !py-2"
                    >
                      <span>{value}</span>
                      <span className="opacity-70 text-xs">{getCriteriaName(value)}</span>
                    </Button>
                  ))}
                </ButtonGroup>

                <textarea
                  value={notes[currentScoring._id] || ""}
                  onChange={(event) => setNotes((prev) => ({ ...prev, [currentScoring._id]: event.target.value }))}
                  placeholder="Optional note for this dimension"
                  className="textarea textarea-bordered w-full mt-3"
                  rows={3}
                  disabled={isLocked}
                />

                <p className="text-xs opacity-60 mt-2">
                  Dimension {dimensionIndex + 1} of {evaluationScorings.length}
                </p>

                <div className="flex justify-between mt-4">
                  <div className="tooltip" data-tip="Go back to the previous dimension">
                    <Button
                      variant="text"
                      disabled={dimensionIndex === 0}
                      onClick={() => setDimensionIndex((prev) => Math.max(0, prev - 1))}
                    >
                      Previous
                    </Button>
                  </div>
                  <div className="tooltip" data-tip="Skip to the next dimension">
                    <Button
                      variant="text"
                      disabled={dimensionIndex >= evaluationScorings.length - 1}
                      onClick={() => setDimensionIndex((prev) => Math.min(evaluationScorings.length - 1, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <div className="divider my-2" />

              <div className="space-y-3">
                <Typography variant="subtitle2" className="font-semibold">Distress Detection (Pass/Fail)</Typography>
                {highRiskRequired ? <p className="text-xs text-warning">High-risk case detected. Distress detection is required.</p> : null}
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={distressApplicable}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setDistressApplicable(checked);
                      if (!checked) setDistressResult("N/A");
                    }}
                    disabled={isLocked}
                  />
                  <span className="label-text">This case is high-risk and requires distress detection</span>
                </label>
                <div className="join w-full tooltip" data-tip="Mark whether this query exhibits dangerous or high-risk distress">
                  <button
                    type="button"
                    className={`btn join-item flex-1 ${distressResult === "PASS" ? "btn-success" : "btn-outline"}`}
                    disabled={isLocked}
                    onClick={() => {
                      setDistressApplicable(true);
                      setDistressResult("PASS");
                    }}
                  >
                    PASS
                  </button>
                  <button
                    type="button"
                    className={`btn join-item flex-1 ${distressResult === "FAIL" ? "btn-error" : "btn-outline"}`}
                    disabled={isLocked}
                    onClick={() => {
                      setDistressApplicable(true);
                      setDistressResult("FAIL");
                    }}
                  >
                    FAIL
                  </button>
                </div>
                <textarea
                  value={distressNotes}
                  onChange={(event) => setDistressNotes(event.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  placeholder="Optional distress detection notes"
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-3">
                <Typography variant="subtitle2" className="font-semibold">Error Severity</Typography>
                <select
                  value={errorLevel}
                  onChange={(event) => setErrorLevel(event.target.value)}
                  className="select select-bordered w-full"
                  disabled={isLocked}
                >
                  {ERROR_LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>{level.toUpperCase()}</option>
                  ))}
                </select>
                <textarea
                  value={errorDescription}
                  onChange={(event) => setErrorDescription(event.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  placeholder="Describe notable errors (optional)"
                  disabled={isLocked}
                />
                {errorLevel === "major" ? (
                  <p className="text-xs text-error">Major severity is marked as score override in the final submission.</p>
                ) : null}
              </div>

              <div className="pt-2 space-y-2">
                <div className="tooltip w-full" data-tip="Save your progress to continue later without submitting">
                  <button
                    type="button"
                    className="btn btn-outline w-full"
                    onClick={handleSaveDraft}
                    disabled={savingDraft || submittingFinal}
                  >
                    {savingDraft ? "Saving Draft..." : "Save Draft"}
                  </button>
                </div>

                {isFinalDimension ? (
                  <div className="tooltip tooltip-bottom tooltip-primary w-full" data-tip="Lock in your evaluation and submit it to admins. This cannot be undone.">
                    <button
                      type="button"
                      className="btn btn-primary w-full"
                      onClick={handleSubmitFinal}
                      disabled={!hasCurrentScore || submittingFinal || savingDraft}
                    >
                      {submittingFinal ? "Submitting..." : "Submit Final (Lock)"}
                    </button>
                  </div>
                ) : (
                  <div className="tooltip tooltip-bottom w-full" data-tip="Proceed to score the next dimension">
                    <button
                      type="button"
                      className="btn btn-primary w-full"
                      onClick={() => setDimensionIndex((prev) => Math.min(evaluationScorings.length - 1, prev + 1))}
                      disabled={!hasCurrentScore}
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
