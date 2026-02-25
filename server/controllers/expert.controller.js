const { sql } = require("../models");
const scoringService = require("../models/evalV2/services/eval_score.service");
const SystemSettings = require("../models/mongo/system_settings.model");

const { EvaluationAssignment, EvaluationOutput, ModelVersion, EvaluationCriteria } = sql;

const VALID_DISTRESS_RESULTS = new Set(["PASS", "FAIL", "N/A"]);
const VALID_ERROR_LEVELS = new Set(["none", "minor", "moderate", "major"]);

const DEFAULT_BOOLEAN_CRITERIA = [
  { value: 0, criteria_name: "No", description: "Condition not met" },
  { value: 1, criteria_name: "Yes", description: "Condition met" }
];

function getAuthedUserId(req) {
  const id = req?.user?.id;
  if (!id) {
    const err = new Error("Missing authenticated user id");
    err.statusCode = 401;
    throw err;
  }
  return id;
}

function parseEvaluationItems(outputText) {
  if (!outputText || typeof outputText !== "string") return [];

  let parsedItems = [];
  try {
    if (outputText.startsWith("[") || outputText.startsWith("{")) {
      const parsed = JSON.parse(outputText);
      if (Array.isArray(parsed)) parsedItems = parsed;
      else if (Array.isArray(parsed?.items)) parsedItems = parsed.items;
      else if (parsed && typeof parsed === "object") parsedItems = [parsed];
    }
  } catch {
    // fallback below
  }

  if (parsedItems.length > 0) return parsedItems;

  return [{
    query: outputText.split("[Response]:")[0]?.replace("[Query]:", "")?.trim() || "Query text unavailable",
    llm_response: outputText.split("[Response]:")[1]?.trim() || outputText,
    rag_output: "Hidden context",
    reasoning_output: "Hidden reasoning"
  }];
}

function normalizeScoringSnapshot(snapshot = []) {
  if (!Array.isArray(snapshot)) return [];

  return snapshot
    .map((item) => {
      const id = String(item?._id || item?.id || item?.scoring_id || "").trim();
      if (!id) return null;

      const type = item?.type === "Boolean" ? "Boolean" : "Likert";
      const min = type === "Boolean" ? 0 : Number(item?.min_range ?? item?.min_value ?? 1);
      const max = type === "Boolean" ? 1 : Number(item?.max_range ?? item?.max_value ?? 5);

      const criteriaFromSource = Array.isArray(item?.criteria) ? item.criteria : [];
      const criteria = criteriaFromSource
        .map((criteriaItem) => {
          const value = Number(criteriaItem?.value);
          if (!Number.isFinite(value)) return null;
          return {
            value,
            criteria_name: String(criteriaItem?.criteria_name || criteriaItem?.name || `Score ${value}`).trim(),
            description: String(criteriaItem?.description || "").trim()
          };
        })
        .filter(Boolean);

      return {
        _id: id,
        dimension_name: String(item?.dimension_name || item?.name || "Dimension").trim(),
        dimension_description: String(item?.dimension_description || item?.description || "").trim(),
        type,
        min_range: Number.isFinite(min) ? min : 1,
        max_range: Number.isFinite(max) ? max : 5,
        criteria: type === "Boolean" ? (criteria.length ? criteria : DEFAULT_BOOLEAN_CRITERIA) : criteria
      };
    })
    .filter(Boolean);
}

async function buildLegacyScoringSnapshotFromCriteria() {
  const allCriteria = await EvaluationCriteria.findAll({ order: [["dimension_name", "ASC"]] });
  return allCriteria.map((criteria) => ({
    _id: String(criteria.id),
    dimension_name: String(criteria.dimension_name || "Dimension"),
    dimension_description: String(criteria.description || ""),
    type: "Likert",
    min_range: Number(criteria.min_value || 1),
    max_range: Number(criteria.max_value || 5),
    criteria: [
      { value: Number(criteria.min_value || 1), criteria_name: "Low", description: "Lower score" },
      { value: Number(criteria.max_value || 5), criteria_name: "High", description: "Higher score" }
    ]
  }));
}

function normalizeResponseItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const scoringId = String(item?.scoring_id || item?.scoring || item?.criteria_id || "").trim();
      const rawScore = item?.score;
      const score = rawScore === null || rawScore === undefined || rawScore === "" ? null : Number(rawScore);
      const note = String(item?.note || item?.comments || "").trim();

      if (!scoringId) return null;
      if (score === null || !Number.isFinite(score)) return { scoring_id: scoringId, score: null, note };

      return {
        scoring_id: scoringId,
        score,
        note
      };
    })
    .filter(Boolean);
}

function normalizeDistressDetection(value, fallback = {}) {
  const merged = value && typeof value === "object" ? value : fallback;
  const applicable = Boolean(merged?.applicable);
  const rawResult = String(merged?.result || (applicable ? "FAIL" : "N/A")).toUpperCase();
  const result = VALID_DISTRESS_RESULTS.has(rawResult) ? rawResult : "N/A";

  return {
    applicable,
    result,
    notes: String(merged?.notes || "").trim()
  };
}

function normalizeErrorSeverity(value, fallback = {}) {
  const merged = value && typeof value === "object" ? value : fallback;
  const rawLevel = String(merged?.level || "none").toLowerCase();
  const level = VALID_ERROR_LEVELS.has(rawLevel) ? rawLevel : "none";
  const overridesScore = Boolean(merged?.overridesScore) || level === "major";

  return {
    level,
    description: String(merged?.description || "").trim(),
    overridesScore
  };
}

function extractResponsesFromBody(body = {}) {
  if (Array.isArray(body?.responses)) return normalizeResponseItems(body.responses);
  if (Array.isArray(body?.user_evaluation_output)) return normalizeResponseItems(body.user_evaluation_output);
  if (Array.isArray(body?.scores)) return normalizeResponseItems(body.scores);
  return [];
}

function validateResponsesAgainstSnapshot({ responses, scoringSnapshot, requireAll }) {
  const byScoringId = new Map(scoringSnapshot.map((scoring) => [String(scoring._id), scoring]));
  const touched = new Set();

  for (const response of responses) {
    const scoring = byScoringId.get(String(response.scoring_id));
    if (!scoring) {
      return { ok: false, error: `Invalid scoring dimension: ${response.scoring_id}` };
    }

    if (response.score === null) {
      if (requireAll) {
        return { ok: false, error: `Missing score for ${scoring.dimension_name}` };
      }
      continue;
    }

    const min = Number(scoring.min_range);
    const max = Number(scoring.max_range);
    if (!Number.isFinite(min) || !Number.isFinite(max) || response.score < min || response.score > max) {
      return { ok: false, error: `Score for ${scoring.dimension_name} must be between ${min} and ${max}` };
    }

    touched.add(String(response.scoring_id));
  }

  if (requireAll) {
    const missing = scoringSnapshot
      .map((scoring) => String(scoring._id))
      .filter((id) => !touched.has(id));

    if (missing.length > 0) {
      return { ok: false, error: "All assigned scoring dimensions must be scored before final submission." };
    }
  }

  return { ok: true };
}

function scoreToSentiment(score) {
  if (!Number.isFinite(score)) return "Neutral";
  if (score >= 4) return "Positive";
  if (score >= 2.5) return "Neutral";
  return "Negative";
}

function getProgress({ assignment, scoringSnapshot }) {
  const total = scoringSnapshot.length;
  if (assignment?.final_submitted || assignment?.status === "COMPLETED") {
    return { progress: 100, responsesCount: total, totalCriteria: total };
  }

  const activeSubmission = assignment?.draft_submission;
  const responsesCount = normalizeResponseItems(activeSubmission?.responses).filter((response) => response.score !== null).length;
  const progress = total > 0 ? Math.min(100, Math.round((responsesCount / total) * 100)) : 0;

  return { progress, responsesCount, totalCriteria: total };
}

function mapAssignmentForExpert(assignment, scoringSnapshot) {
  const { progress, responsesCount, totalCriteria } = getProgress({ assignment, scoringSnapshot });
  const completed = Boolean(assignment?.final_submitted || assignment?.status === "COMPLETED");

  return {
    id: assignment.id,
    _id: assignment.id,
    user_assigned: assignment.user_id,
    date_assigned: assignment.assigned_at,
    deadline: assignment.deadline,
    completion_status: completed,
    final_submitted: Boolean(assignment.final_submitted),
    is_locked: Boolean(assignment.is_locked),
    status: assignment.status,
    progress,
    responses_count: responsesCount,
    total_criteria: totalCriteria,
    evaluation: {
      _id: assignment.output_id,
      filename: `Evaluation ${assignment?.output?.modelVersion?.model_name || "Item"}`,
      rag_version: assignment?.output?.modelVersion?.version || "v1.0"
    },
    model: {
      name: assignment?.output?.modelVersion?.model_name || "Unknown Model",
      version: assignment?.output?.modelVersion?.version || "v1.0"
    }
  };
}

// ===== Assignment listing (SQL) =====

async function getMyAssignments(req, res) {
  try {
    const userId = getAuthedUserId(req);
    const assignments = await EvaluationAssignment.findAll({
      where: { user_id: userId },
      include: [
        {
          model: EvaluationOutput,
          as: "output",
          include: [{ model: ModelVersion, as: "modelVersion" }]
        }
      ],
      order: [["assigned_at", "DESC"]]
    });

    const mapped = assignments.map((assignment) => {
      const snapshot = normalizeScoringSnapshot(assignment.scoring_snapshot);
      return mapAssignmentForExpert(assignment, snapshot);
    });

    res.json(mapped);
  } catch (err) {
    console.error("getMyAssignments error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch assignments" });
  }
}

async function getAssignmentById(req, res) {
  try {
    const userId = getAuthedUserId(req);
    const { id } = req.params;

    const assignment = await EvaluationAssignment.findOne({
      where: { id },
      include: [
        {
          model: EvaluationOutput,
          as: "output",
          include: [{ model: ModelVersion, as: "modelVersion" }]
        }
      ]
    });

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const isOwner = String(assignment.user_id) === String(userId);
    const isAdmin = req?.user?.role === "ADMIN" || req?.user?.role === "RESEARCHER";
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    let scoringSnapshot = normalizeScoringSnapshot(assignment.scoring_snapshot);

    if (scoringSnapshot.length === 0 && Array.isArray(assignment.scoring_ids) && assignment.scoring_ids.length > 0) {
      const selectedScorings = await scoringService.getScoringsByIds(assignment.scoring_ids);
      const selectedObjects = selectedScorings.map((scoring) => (typeof scoring?.toObject === "function" ? scoring.toObject() : scoring));
      scoringSnapshot = normalizeScoringSnapshot(selectedObjects);
    }

    if (scoringSnapshot.length === 0) {
      scoringSnapshot = await buildLegacyScoringSnapshotFromCriteria();
    }

    const items = parseEvaluationItems(assignment?.output?.output_text || "");

    const currentSubmission = assignment.final_submitted
      ? assignment.final_submission
      : assignment.draft_submission;

    const draftSubmission = assignment.draft_submission || null;
    const finalSubmission = assignment.final_submission || null;

    const result = {
      id: assignment.id,
      _id: assignment.id,
      date_assigned: assignment.assigned_at,
      deadline: assignment.deadline,
      completion_status: Boolean(assignment.final_submitted || assignment.status === "COMPLETED"),
      final_submitted: Boolean(assignment.final_submitted),
      is_locked: Boolean(assignment.is_locked),
      status: assignment.status,
      evaluation: {
        _id: assignment.output_id,
        filename: `Evaluation ${assignment?.output?.modelVersion?.model_name || "Item"}`,
        rag_version: assignment?.output?.modelVersion?.version || "v1.0",
        items
      },
      evaluation_scorings: scoringSnapshot,
      evaluation_state: {
        draft: draftSubmission,
        final: finalSubmission,
        current: currentSubmission,
        last_draft_saved_at: assignment.last_draft_saved_at,
        submitted_at: assignment.submitted_at,
        distress_detection: assignment.distress_detection || currentSubmission?.distressDetection || null,
        error_severity: assignment.error_severity || currentSubmission?.errorSeverity || null
      }
    };

    res.json(result);
  } catch (err) {
    console.error("getAssignmentById error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch assignment" });
  }
}

async function saveAssignmentDraft(req, res) {
  try {
    const userId = getAuthedUserId(req);
    const { id } = req.params;

    const assignment = await EvaluationAssignment.findByPk(id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (String(assignment.user_id) !== String(userId)) return res.status(403).json({ error: "Forbidden" });
    if (assignment.final_submitted || assignment.is_locked) {
      return res.status(409).json({ error: "Assignment is finalized and locked." });
    }

    const scoringSnapshot = normalizeScoringSnapshot(assignment.scoring_snapshot);
    const responses = extractResponsesFromBody(req.body);

    const validation = validateResponsesAgainstSnapshot({ responses, scoringSnapshot, requireAll: false });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const now = new Date();
    const distressDetection = normalizeDistressDetection(req.body?.distressDetection, assignment?.distress_detection);
    const errorSeverity = normalizeErrorSeverity(req.body?.errorSeverity, assignment?.error_severity);

    const payload = {
      responses,
      distressDetection,
      errorSeverity,
      updatedAt: now.toISOString()
    };

    assignment.draft_submission = payload;
    assignment.last_draft_saved_at = now;

    const hasScoredResponse = responses.some((response) => response.score !== null);
    if (hasScoredResponse && assignment.status === "PENDING") {
      assignment.status = "IN_PROGRESS";
    }

    assignment.distress_detection = distressDetection;
    assignment.error_severity = errorSeverity;

    await assignment.save();

    res.json({
      message: "Draft saved",
      assignmentId: assignment.id,
      status: assignment.status,
      last_draft_saved_at: assignment.last_draft_saved_at
    });
  } catch (err) {
    console.error("saveAssignmentDraft error:", err);
    res.status(500).json({ error: err.message || "Failed to save draft" });
  }
}

async function submitAssignmentScores(req, res) {
  try {
    const userId = getAuthedUserId(req);
    const { id } = req.params;

    const assignment = await EvaluationAssignment.findByPk(id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (String(assignment.user_id) !== String(userId)) return res.status(403).json({ error: "Forbidden" });
    if (assignment.final_submitted || assignment.is_locked) {
      return res.status(409).json({ error: "Assignment is already submitted and locked." });
    }

    const scoringSnapshot = normalizeScoringSnapshot(assignment.scoring_snapshot);
    const responses = extractResponsesFromBody(req.body);

    const validation = validateResponsesAgainstSnapshot({ responses, scoringSnapshot, requireAll: true });
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const distressDetection = normalizeDistressDetection(req.body?.distressDetection, assignment?.distress_detection);
    if (distressDetection.applicable && distressDetection.result === "N/A") {
      return res.status(400).json({ error: "Distress detection result must be PASS or FAIL when applicable." });
    }

    const errorSeverity = normalizeErrorSeverity(req.body?.errorSeverity, assignment?.error_severity);

    const now = new Date();
    const finalPayload = {
      responses,
      distressDetection,
      errorSeverity,
      submittedAt: now.toISOString()
    };

    assignment.final_submission = finalPayload;
    assignment.draft_submission = finalPayload;
    assignment.final_submitted = true;
    assignment.submitted_at = now;
    assignment.completed_at = now;
    assignment.is_locked = true;
    assignment.last_draft_saved_at = now;
    assignment.status = "COMPLETED";
    assignment.distress_detection = distressDetection;
    assignment.error_severity = errorSeverity;

    await assignment.save();

    res.json({
      message: "Final evaluation submitted",
      assignmentId: assignment.id,
      status: assignment.status,
      final_submitted: assignment.final_submitted,
      submitted_at: assignment.submitted_at
    });
  } catch (err) {
    console.error("submitAssignmentScores error:", err);
    res.status(500).json({ error: err.message || "Failed to submit scores" });
  }
}

async function getExpertStats(req, res) {
  try {
    const userId = getAuthedUserId(req);

    const assignments = await EvaluationAssignment.findAll({
      where: { user_id: userId },
      include: [
        {
          model: EvaluationOutput,
          as: "output",
          include: [{ model: ModelVersion, as: "modelVersion" }]
        }
      ],
      order: [["assigned_at", "DESC"]]
    });

    const mappedAssignments = assignments.map((assignment) => {
      const snapshot = normalizeScoringSnapshot(assignment.scoring_snapshot);
      return mapAssignmentForExpert(assignment, snapshot);
    });

    const dimensionAgg = new Map();
    const modelAgg = new Map();
    let totalFinalScore = 0;
    let totalFinalResponses = 0;

    for (const assignment of assignments) {
      const modelName = assignment?.output?.modelVersion?.model_name || "Unknown Model";
      const modelVersion = assignment?.output?.modelVersion?.version || "v1.0";
      const modelKey = `${modelName}::${modelVersion}`;

      if (!modelAgg.has(modelKey)) {
        modelAgg.set(modelKey, {
          modelName,
          modelVersion,
          totalAssignments: 0,
          completedAssignments: 0,
          totalScore: 0,
          scoreCount: 0,
          distressFails: 0,
          majorErrors: 0
        });
      }

      const model = modelAgg.get(modelKey);
      model.totalAssignments += 1;
      if (assignment.final_submitted) model.completedAssignments += 1;
      if ((assignment?.distress_detection?.result || "").toUpperCase() === "FAIL") model.distressFails += 1;
      if ((assignment?.error_severity?.level || "").toLowerCase() === "major") model.majorErrors += 1;

      const snapshot = normalizeScoringSnapshot(assignment.scoring_snapshot);
      const responses = normalizeResponseItems(assignment?.final_submission?.responses || []);
      for (const response of responses) {
        if (!Number.isFinite(response.score)) continue;

        totalFinalScore += response.score;
        totalFinalResponses += 1;
        model.totalScore += response.score;
        model.scoreCount += 1;

        const scoring = snapshot.find((item) => String(item._id) === String(response.scoring_id));
        const dimensionName = scoring?.dimension_name || String(response.scoring_id);

        if (!dimensionAgg.has(dimensionName)) {
          dimensionAgg.set(dimensionName, {
            _id: String(response.scoring_id),
            name: dimensionName,
            description: scoring?.dimension_description || "",
            totalScore: 0,
            count: 0
          });
        }

        const dimension = dimensionAgg.get(dimensionName);
        dimension.totalScore += response.score;
        dimension.count += 1;
      }
    }

    const dimensions = Array.from(dimensionAgg.values()).map((dimension) => {
      const avgScore = dimension.count > 0 ? Number((dimension.totalScore / dimension.count).toFixed(1)) : 0;
      return {
        _id: dimension._id,
        name: dimension.name,
        description: dimension.description,
        avgScore,
        sentiment: scoreToSentiment(avgScore),
        responses: dimension.count
      };
    });

    const modelComparison = Array.from(modelAgg.values()).map((model) => ({
      modelName: model.modelName,
      modelVersion: model.modelVersion,
      totalAssignments: model.totalAssignments,
      completedAssignments: model.completedAssignments,
      avgScore: model.scoreCount > 0 ? Number((model.totalScore / model.scoreCount).toFixed(2)) : null,
      distressFails: model.distressFails,
      majorErrors: model.majorErrors
    }));

    const completed = mappedAssignments.filter((item) => item.completion_status).length;
    const totalAssignments = mappedAssignments.length;
    const completionRate = totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0;
    const avgScore = totalFinalResponses > 0 ? Number((totalFinalScore / totalFinalResponses).toFixed(2)) : 0;

    let settingsDoc = await SystemSettings.findOne({ type: "dashboard_config" });
    if (!settingsDoc) {
      settingsDoc = {
        dashboardTargetPerformance: 85,
        dashboardShowDimensions: true,
        dashboardShowMetrics: true
      };
    }

    const settings = {
      dashboardTargetPerformance: settingsDoc.dashboardTargetPerformance || 85,
      dashboardShowDimensions: settingsDoc.dashboardShowDimensions !== false,
      dashboardShowMetrics: settingsDoc.dashboardShowMetrics !== false
    };

    res.json({
      assignments: mappedAssignments,
      dimensions,
      modelComparison,
      settings,
      performance: {
        current: avgScore > 0 ? Math.round(avgScore * 20) : completionRate,
        goal: settings.dashboardTargetPerformance,
        max: 100,
        avgScore,
        completionRate,
        modelVersion: mappedAssignments[0]?.model?.version || "v1.0"
      }
    });
  } catch (err) {
    console.error("getExpertStats error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch expert dashboard stats" });
  }
}

async function createScoring(req, res) {
  res.status(501).json({ error: "Legacy createScoring not implemented in SQL refactor yet" });
}

async function saveDraft(req, res) {
  const assignmentId = String(req.body?.assignmentId || req.body?.assignment_id || "").trim();
  if (!assignmentId) {
    return res.status(400).json({ error: "assignmentId is required" });
  }
  req.params = { ...(req.params || {}), id: assignmentId };
  return saveAssignmentDraft(req, res);
}

async function submitFinalEvaluation(req, res) {
  const assignmentId = String(req.body?.assignmentId || req.body?.assignment_id || "").trim();
  if (!assignmentId) {
    return res.status(400).json({ error: "assignmentId is required" });
  }
  req.params = { ...(req.params || {}), id: assignmentId };
  return submitAssignmentScores(req, res);
}

async function evalTest(req, res) {
  res.json({ message: "SQL Eval Controller Active" });
}

async function createAssignment(req, res) {
  res.status(501).json({ error: "Not implemented in this refactor yet" });
}

module.exports = {
  evalTest,
  createAssignment,
  getMyAssignments,
  getAssignmentById,
  saveAssignmentDraft,
  submitAssignmentScores,
  getExpertStats,
  createScoring,
  saveDraft,
  submitFinalEvaluation
};
