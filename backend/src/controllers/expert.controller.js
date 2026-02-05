const evaluationService = require("../services/evaluation.service");

// Eval V2 (Mongo) services (assignment + scoring definitions)
const evalTestService = require("../models/evalV2/eval_test.service");
const assignmentService = require("../models/evalV2/services/eval_assignment.service");
const scoringService = require("../models/evalV2/services/eval_score.service");

function getAuthedUserId(req) {
  const id = req?.user?.id;
  if (!id) {
    const err = new Error("Missing authenticated user id");
    err.statusCode = 401;
    throw err;
  }
  return id;
}

async function evalTest(req, res) {
  try {
    const body = { ...(req.body || {}) };
    if (!body.userId && req.user && req.user.id) body.userId = req.user.id;
    const result = await evalTestService.evalTest(body);
    res.json(result);
  } catch (err) {
    console.error("evalTest error:", err);
    res.status(400).json({ error: err.message || "Eval test failed" });
  }
}

// ===== Assignment + evaluation listing (Mongo v2) =====

async function createAssignment(req, res) {
  try {
    const isAdmin = req?.user?.role === "ADMIN" || req?.user?.role === "RESEARCHER";
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
    const assignment = await assignmentService.assignEvaluation(req.body);
    res.status(201).json(assignment);
  } catch (err) {
    console.error("createAssignment error:", err);
    res.status(400).json({ error: err.message || "Failed to create assignment" });
  }
}

async function getMyAssignments(req, res) {
  try {
    const userId = getAuthedUserId(req);
    const assignments = await assignmentService.getAssignments({
      user_assigned: String(userId)
    });
    res.json(assignments);
  } catch (err) {
    console.error("getMyAssignments error:", err);
    res.status(err.statusCode || 400).json({
      error: err.message || "Failed to fetch assignments"
    });
  }
}

async function getAssignmentById(req, res) {
  try {
    const userId = getAuthedUserId(req);
    const { id } = req.params;

    const assignment = await assignmentService.getAssignmentById(id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    // Basic ownership check: experts can only see their own
    const isOwner = String(assignment.user_assigned) === String(userId);
    const isAdmin =
      req?.user?.role === "ADMIN" || req?.user?.role === "RESEARCHER";

    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    res.json(assignment);
  } catch (err) {
    console.error("getAssignmentById error:", err);
    res.status(err.statusCode || 400).json({
      error: err.message || "Failed to fetch assignment"
    });
  }
}

async function submitAssignmentScores(req, res) {
  try {
    const userId = getAuthedUserId(req);
    const { id } = req.params;
    const { user_evaluation_output } = req.body;

    if (!Array.isArray(user_evaluation_output)) {
      return res.status(400).json({
        error: "user_evaluation_output must be an array"
      });
    }

    const assignment = await assignmentService.getAssignmentById(id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const isOwner = String(assignment.user_assigned) === String(userId);
    if (!isOwner) return res.status(403).json({ error: "Forbidden" });

    const updated = await assignmentService.finalSubmit(id, user_evaluation_output);
    const populated = await assignmentService.getAssignmentById(updated._id);
    res.json(populated);
  } catch (err) {
    console.error("submitAssignmentScores error:", err);
    res.status(err.statusCode || 400).json({ error: err.message || "Failed to submit scores" });
  }
}

async function saveAssignmentDraft(req, res) {
  try {
    const userId = getAuthedUserId(req);
    const { id } = req.params;
    const { user_evaluation_output } = req.body;

    if (!Array.isArray(user_evaluation_output)) {
      return res.status(400).json({ error: "user_evaluation_output must be an array" });
    }

    const assignment = await assignmentService.getAssignmentById(id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    const isOwner = String(assignment.user_assigned) === String(userId);
    if (!isOwner) return res.status(403).json({ error: "Forbidden" });

    const updated = await assignmentService.saveDraft(id, user_evaluation_output);
    const populated = await assignmentService.getAssignmentById(updated._id);
    res.json(populated);
  } catch (err) {
    console.error("saveAssignmentDraft error:", err);
    res.status(err.statusCode || 400).json({ error: err.message || "Failed to save draft" });
  }
}

// ===== Scoring definitions (Mongo v2) =====

async function createScoring(req, res) {
  try {
    const isAdmin = req?.user?.role === "ADMIN" || req?.user?.role === "RESEARCHER";
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
    const scoring = await scoringService.createScoring(req.body);
    res.status(201).json(scoring);
  } catch (err) {
    console.error("createScoring error:", err);
    res.status(400).json({ error: err.message || "Failed to create scoring" });
  }
}

// ===== Draft/final evaluation response (Mongo EvaluationResponse) =====

async function saveDraft(req, res) {
  try {
    const data = req.body;
    await evaluationService.saveDraft(data);
    res.json({ message: "Draft saved successfully" });
  } catch (err) {
    console.error("Save Draft Error:", err);
    res.status(500).json({ error: "Failed to save draft" });
  }
}

async function submitFinalEvaluation(req, res) {
  try {
    const data = req.body;
    await evaluationService.submitEvaluation(data);
    res.json({ message: "Evaluation submitted successfully" });
  } catch (err) {
    console.error("Submit Evaluation Error:", err);
    res.status(400).json({ error: err.message || "Failed to submit evaluation" });
  }
}

module.exports = {
  evalTest,
  createAssignment,
  getMyAssignments,
  getAssignmentById,
  submitAssignmentScores,
  saveAssignmentDraft,
  createScoring,
  saveDraft,
  submitFinalEvaluation
};
