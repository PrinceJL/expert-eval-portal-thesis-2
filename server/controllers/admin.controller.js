const bcrypt = require("bcrypt");

const { sql, mongo } = require("../models");
const { Op } = require("sequelize");
const notificationService = require("../services/notification.service");

// Eval V2 services
const evalService = require("../models/evalV2/services/eval.service");
const scoringService = require("../models/evalV2/services/eval_score.service");
const assignmentService = require("../models/evalV2/services/eval_assignment.service");

function genTempPassword() {
  // 12 chars, mix of letters and digits
  return `Temp${Math.random().toString(36).slice(2, 10)}!`;
}

const DEFAULT_BOOLEAN_CRITERIA = [
  { value: 0, criteria_name: "No", description: "Condition not met" },
  { value: 1, criteria_name: "Yes", description: "Condition met" }
];

function normalizeScoringCriteria(criteria, { booleanMode = false } = {}) {
  if (!Array.isArray(criteria)) return [];

  return criteria
    .map((c) => {
      const value = Number(c?.value);
      if (!Number.isFinite(value)) return null;

      const fallbackName = booleanMode
        ? (value === 1 ? "Yes" : value === 0 ? "No" : `Option ${value}`)
        : `Score ${value}`;

      return {
        value,
        criteria_name: String(c?.criteria_name || c?.name || c?.label || "").trim() || fallbackName,
        description: String(c?.description || "").trim() || (booleanMode ? (value === 1 ? "Condition met" : value === 0 ? "Condition not met" : "") : "")
      };
    })
    .filter(Boolean);
}

// ------------------ USERS ------------------

async function listUsers(req, res) {
  try {
    const where = {};
    if (req.query.group) where.group = req.query.group;
    if (req.query.role) where.role = req.query.role;
    if (req.query.active === "true") where.isActive = true;
    if (req.query.active === "false") where.isActive = false;

    const users = await sql.User.findAll({
      where,
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["passwordHash"] }
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Failed to list users" });
  }
}

async function createUser(req, res) {
  try {
    const { username, email, group, role } = req.body;
    let { password } = req.body;

    if (!username || !group || !role) {
      return res.status(400).json({ error: "Missing username/group/role" });
    }

    if (!["ADMIN", "EXPERT", "RESEARCHER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (!password) password = genTempPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await sql.User.create({
      username,
      email,
      group,
      role,
      passwordHash,
      isActive: true
    });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        group: user.group,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      temporaryPassword: password
    });
  } catch (e) {
    // Friendly unique constraint errors
    const msg = String(e?.message || "");
    if (msg.includes("username") && msg.includes("group")) {
      return res.status(409).json({ error: "Username already exists for this group" });
    }
    return res.status(500).json({ error: "Failed to create user" });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { email, group, role, isActive, resetPassword, password } = req.body;

    const user = await sql.User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (email !== undefined) user.email = email;
    if (group !== undefined) user.group = group;
    if (role !== undefined) {
      if (!["ADMIN", "EXPERT", "RESEARCHER"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      user.role = role;
    }
    if (isActive !== undefined) user.isActive = !!isActive;

    if (resetPassword && password !== undefined) {
      return res.status(400).json({ error: "Use either resetPassword or password, not both" });
    }

    let passwordUpdated = false;
    let newTempPassword = null;
    if (password !== undefined) {
      const nextPassword = String(password || "").trim();
      if (nextPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      user.passwordHash = await bcrypt.hash(nextPassword, 10);
      passwordUpdated = true;
    } else if (resetPassword) {
      newTempPassword = genTempPassword();
      user.passwordHash = await bcrypt.hash(newTempPassword, 10);
      passwordUpdated = true;
    }

    await user.save();

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        group: user.group,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      },
      ...(passwordUpdated ? { passwordUpdated: true } : {}),
      ...(newTempPassword ? { temporaryPassword: newTempPassword } : {})
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to update user" });
  }
}

function normalizeAssignmentResponses(submission) {
  const responses = Array.isArray(submission?.responses) ? submission.responses : [];
  return responses.filter((item) => item && item.scoring_id && Number.isFinite(Number(item.score)));
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const actorId = String(req?.user?.id || "");

    if (actorId && String(id) === actorId) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const user = await sql.User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role === "ADMIN" && user.isActive) {
      const activeAdminCount = await sql.User.count({
        where: { role: "ADMIN", isActive: true }
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: "Cannot delete the last active admin account" });
      }
    }

    await user.destroy();
    await mongo.SessionCache.deleteMany({ userId: String(id) });

    return res.json({ message: "User deleted" });
  } catch (e) {
    if (e?.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({ error: "Cannot delete this user because related records exist. Disable the account instead." });
    }
    return res.status(500).json({ error: "Failed to delete user" });
  }
}

// ------------------ SCORINGS ------------------

async function listScorings(req, res) {
  try {
    const scorings = await scoringService.getScorings();
    res.json(scorings);
  } catch (e) {
    res.status(500).json({ error: "Failed to list scorings" });
  }
}

async function createScoring(req, res) {
  try {
    const type = req.body?.type === "Boolean" ? "Boolean" : "Likert";
    const booleanMode = type === "Boolean";
    const min_range = booleanMode ? 0 : Number(req.body?.min_range);
    const max_range = booleanMode ? 1 : Number(req.body?.max_range);

    if (!Number.isFinite(min_range) || !Number.isFinite(max_range)) {
      return res.status(400).json({ error: "min_range and max_range must be valid numbers" });
    }
    if (min_range > max_range) {
      return res.status(400).json({ error: "min_range cannot be greater than max_range" });
    }

    let criteria = normalizeScoringCriteria(req.body?.criteria || [], { booleanMode });

    if (booleanMode) {
      const byValue = new Map();
      for (const c of criteria) {
        if (c.value === 0 || c.value === 1) byValue.set(c.value, c);
      }
      if (!byValue.has(0)) byValue.set(0, DEFAULT_BOOLEAN_CRITERIA[0]);
      if (!byValue.has(1)) byValue.set(1, DEFAULT_BOOLEAN_CRITERIA[1]);
      criteria = [byValue.get(0), byValue.get(1)];
    }

    const scoring = await scoringService.createScoring({
      dimension_name: req.body?.dimension_name,
      dimension_description: req.body?.dimension_description,
      type,
      min_range,
      max_range,
      criteria
    });
    res.status(201).json(scoring);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to create scoring" });
  }
}

// ------------------ EVALUATIONS ------------------

async function listEvaluations(req, res) {
  try {
    // In SQL, "Evaluations" are effectively EvaluationOutputs tied to ModelVersions
    // or we can allow assigning specific ModelVersions.
    // Let's return ModelVersions that have outputs, or just EvaluationOutputs directly.
    // For simplicity in assignment, we list EvaluationOutputs.
    const outputs = await sql.EvaluationOutput.findAll({
      include: [{ model: sql.ModelVersion, as: 'modelVersion' }],
      order: [['createdAt', 'DESC']]
    });

    // Transform to friendly format
    const mapped = outputs.map(o => {
      let items = [];
      try {
        const parsed = JSON.parse(o.output_text);
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && Array.isArray(parsed.items)) {
          items = parsed.items;
        } else {
          // Fallback for flat object or single item
          items = [parsed];
        }
      } catch (e) {
        // Fallback for legacy text format
        if (o.output_text && o.output_text.trim()) {
          items = [{
            query: o.output_text.split("[Response]:")[0]?.replace("[Query]:", "")?.trim() || "Query text unavailable",
            llm_response: o.output_text.split("[Response]:")[1]?.trim() || o.output_text
          }];
        }
      }

      return {
        id: o.id,
        filename: `Evaluation ${o.modelVersion?.model_name || 'Item'}`,
        rag_version: o.modelVersion?.version || 'v1.0',
        createdAt: o.createdAt,
        items: items // Return actual items
      };
    });

    res.json(mapped);
  } catch (e) {
    console.error("listEvaluations error:", e);
    res.status(500).json({ error: "Failed to list evaluations" });
  }
}

async function createEvaluation(req, res) {
  // Creating a new "Evaluation" in SQL means creating a ModelVersion + Output + Criteria?
  // or just utilizing existing seeding scripts. 
  // For this MVP, we might stick to " Assignments are created from EXISTING outputs".
  // But if the user wants to "Create" one, we'd need a text input.
  try {
    const { filename, rag_version, items } = req.body;
    // This is complex for SQL structure (ModelVersion -> Output).
    // Let's implement a basic version that creates a ModelVersion and Output.

    // 1. Create/Find ModelVersion
    const [version] = await sql.ModelVersion.findOrCreate({
      where: { version: rag_version || 'v1.0', model_name: filename || 'Custom Eval' }
    });

    // 2. Create Output
    // items is array of { query, llm_response... }
    // We store this as one big text blob in `output_text` for now, matching the `expert.controller.js` parsing logic.
    // "[Query]: ... [Response]: ..."
    // 2. Create Output
    // items is array of { query, llm_response... }
    // Serialize ALL items to JSON
    const outputText = JSON.stringify(items);

    const output = await sql.EvaluationOutput.create({
      model_version_id: version.id,
      output_text: outputText
    });

    res.status(201).json(output);
  } catch (e) {
    console.error("createEvaluation error:", e);
    res.status(400).json({ error: e.message || "Failed to create evaluation" });
  }
}

// ------------------ ASSIGNMENTS ------------------

async function listAssignments(req, res) {
  try {
    const where = {};
    if (req.query.user_assigned) where.user_id = req.query.user_assigned;

    const assignments = await sql.EvaluationAssignment.findAll({
      where,
      include: [
        {
          model: sql.User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: sql.EvaluationOutput,
          as: 'output',
          include: [{ model: sql.ModelVersion, as: 'modelVersion' }]
        }
      ],
      order: [['assigned_at', 'DESC']]
    });

    // Remap for frontend consistency
    const mapped = assignments.map(a => {
      const scoringIds = Array.isArray(a.scoring_ids) ? a.scoring_ids : [];
      const totalAssigned = scoringIds.length || (Array.isArray(a.scoring_snapshot) ? a.scoring_snapshot.length : 0);
      const draftResponses = normalizeAssignmentResponses(a.draft_submission);
      const finalResponses = normalizeAssignmentResponses(a.final_submission);
      const responseCount = (a.final_submitted ? finalResponses : draftResponses).length;
      const isCompleted = Boolean(a.final_submitted || a.status === 'COMPLETED');
      const progress = isCompleted ? 100 : (totalAssigned > 0 ? Math.min(100, Math.round((responseCount / totalAssigned) * 100)) : 0);

      return {
        id: a.id,
        user_assigned: a.user_id,
        user: a.user,
        evaluation: {
          id: a.output?.id,
          filename: `Evaluation ${a.output?.modelVersion?.model_name || 'Item'}`,
          rag_version: a.output?.modelVersion?.version
        },
        status: a.status,
        completion_status: isCompleted,
        final_submitted: Boolean(a.final_submitted),
        deadline: a.deadline,
        assigned_at: a.assigned_at,
        completed_at: a.completed_at,
        progress: progress,
        responses_count: responseCount,
        total_criteria: totalAssigned
      };
    });

    res.json(mapped);
  } catch (e) {
    console.error("listAssignments error:", e);
    res.status(500).json({ error: "Failed to list assignments" });
  }
}

async function createAssignment(req, res) {
  try {
    const { user_assigned, evaluation, evaluation_scorings = [], deadline } = req.body;
    // user_assigned = user_id
    // evaluation = output_id

    if (!user_assigned || !evaluation) {
      return res.status(400).json({ error: "Missing user_assigned or evaluation ID" });
    }
    if (!Array.isArray(evaluation_scorings) || evaluation_scorings.length === 0) {
      return res.status(400).json({ error: "Please assign at least one scoring dimension." });
    }

    const [assignedUser, evaluationOutput] = await Promise.all([
      sql.User.findByPk(user_assigned),
      sql.EvaluationOutput.findByPk(evaluation)
    ]);
    if (!assignedUser) {
      return res.status(400).json({ error: "Selected expert user does not exist." });
    }
    if (!evaluationOutput) {
      return res.status(400).json({ error: "Selected evaluation does not exist." });
    }

    const selectedScorings = await scoringService.getScoringsByIds(evaluation_scorings);
    if (selectedScorings.length !== evaluation_scorings.length) {
      return res.status(400).json({ error: "One or more selected scoring dimensions are invalid." });
    }

    const orderedScorings = evaluation_scorings
      .map((id) => selectedScorings.find((s) => String(s?._id) === String(id)))
      .filter(Boolean);

    const scoringSnapshot = orderedScorings.map((scoring) => {
      const scoringType = scoring?.type === "Boolean" ? "Boolean" : "Likert";
      const booleanMode = scoringType === "Boolean";
      const minRange = booleanMode ? 0 : Number(scoring?.min_range || 1);
      const maxRange = booleanMode ? 1 : Number(scoring?.max_range || 5);
      const criteria = normalizeScoringCriteria(scoring?.criteria || [], { booleanMode });

      return {
        _id: String(scoring._id),
        dimension_name: String(scoring.dimension_name || "").trim(),
        dimension_description: String(scoring.dimension_description || "").trim(),
        type: scoringType,
        min_range: minRange,
        max_range: maxRange,
        criteria
      };
    });

    const assignment = await sql.EvaluationAssignment.create({
      user_id: user_assigned,
      output_id: evaluation,
      deadline: deadline ? new Date(deadline) : null,
      status: 'PENDING',
      scoring_ids: scoringSnapshot.map((s) => s._id),
      scoring_snapshot: scoringSnapshot,
      draft_submission: null,
      final_submission: null,
      final_submitted: false,
      is_locked: false
    });

    // Notification
    try {
      await notificationService.createNotification(
        String(user_assigned),
        "assignment",
        "New evaluation assigned",
        "You have a new evaluation assignment.",
        { assignmentId: assignment.id }
      );
    } catch (err) {
      console.error("Notification error:", err);
    }

    res.status(201).json(assignment);
  } catch (e) {
    console.error("createAssignment error:", e);
    res.status(400).json({ error: e.message || "Failed to create assignment" });
  }
}

async function getEvaluationAnalytics(req, res) {
  try {
    const assignments = await sql.EvaluationAssignment.findAll({
      include: [
        {
          model: sql.EvaluationOutput,
          as: "output",
          include: [{ model: sql.ModelVersion, as: "modelVersion" }]
        }
      ],
      order: [["assigned_at", "DESC"]]
    });

    const modelAgg = new Map();
    const dimensionAgg = new Map();

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
          avgScoreAccumulator: 0,
          avgScoreCount: 0,
          distressFails: 0,
          majorErrors: 0
        });
      }

      const modelRow = modelAgg.get(modelKey);
      modelRow.totalAssignments += 1;

      const finalSubmission = assignment?.final_submission || null;
      const finalResponses = normalizeAssignmentResponses(finalSubmission);

      if (assignment?.final_submitted) modelRow.completedAssignments += 1;
      if ((assignment?.distress_detection?.result || "").toUpperCase() === "FAIL") modelRow.distressFails += 1;
      if ((assignment?.error_severity?.level || "").toLowerCase() === "major") modelRow.majorErrors += 1;

      for (const response of finalResponses) {
        const score = Number(response.score);
        if (!Number.isFinite(score)) continue;
        modelRow.avgScoreAccumulator += score;
        modelRow.avgScoreCount += 1;

        const snapshot = Array.isArray(assignment.scoring_snapshot)
          ? assignment.scoring_snapshot.find((item) => String(item?._id) === String(response.scoring_id))
          : null;
        const dimensionName = snapshot?.dimension_name || String(response.scoring_id);

        if (!dimensionAgg.has(dimensionName)) {
          dimensionAgg.set(dimensionName, { dimensionName, totalScore: 0, count: 0 });
        }
        const dim = dimensionAgg.get(dimensionName);
        dim.totalScore += score;
        dim.count += 1;
      }
    }

    const modelComparison = Array.from(modelAgg.values()).map((row) => ({
      modelName: row.modelName,
      modelVersion: row.modelVersion,
      totalAssignments: row.totalAssignments,
      completedAssignments: row.completedAssignments,
      avgScore: row.avgScoreCount > 0 ? Number((row.avgScoreAccumulator / row.avgScoreCount).toFixed(2)) : null,
      distressFails: row.distressFails,
      majorErrors: row.majorErrors
    }));

    const dimensionSummary = Array.from(dimensionAgg.values())
      .map((row) => ({
        dimensionName: row.dimensionName,
        avgScore: row.count > 0 ? Number((row.totalScore / row.count).toFixed(2)) : null,
        responses: row.count
      }))
      .sort((a, b) => String(a.dimensionName).localeCompare(String(b.dimensionName)));

    res.json({
      generatedAt: new Date().toISOString(),
      modelComparison,
      dimensionSummary
    });
  } catch (e) {
    console.error("getEvaluationAnalytics error:", e);
    res.status(500).json({ error: "Failed to load evaluation analytics" });
  }
}

async function updateAssignment(req, res) {
  try {
    const { id } = req.params;
    const { deadline, status } = req.body;

    const assignment = await sql.EvaluationAssignment.findByPk(id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    if (deadline !== undefined) assignment.deadline = deadline ? new Date(deadline) : null;
    if (status !== undefined) assignment.status = status;

    await assignment.save();
    res.json(assignment);
  } catch (e) {
    res.status(500).json({ error: "Failed to update assignment" });
  }
}

async function deleteAssignment(req, res) {
  try {
    const { id } = req.params;
    const deleted = await sql.EvaluationAssignment.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Assignment not found" });
    res.json({ message: "Assignment deleted" });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete assignment" });
  }
}

// ------------------ MAINTENANCE ------------------

async function getMaintenance(req, res) {
  try {
    const PageMaintenance = sql.PageMaintenance;
    const [global] = await PageMaintenance.findOrCreate({
      where: { pageName: "GLOBAL" },
      defaults: { isUnderMaintenance: false, maintenanceMessage: "" }
    });
    const pages = await PageMaintenance.findAll({ order: [["pageName", "ASC"]] });
    res.json({ global, pages });
  } catch (e) {
    res.status(500).json({ error: "Failed to load maintenance settings" });
  }
}

async function setMaintenance(req, res) {
  try {
    const PageMaintenance = sql.PageMaintenance;
    const { pageName, isUnderMaintenance, maintenanceMessage, scheduledStart, scheduledEnd } = req.body;
    if (!pageName) return res.status(400).json({ error: "Missing pageName" });

    const [row] = await PageMaintenance.findOrCreate({
      where: { pageName },
      defaults: {
        isUnderMaintenance: !!isUnderMaintenance,
        maintenanceMessage: maintenanceMessage || "",
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        updatedBy: req.user.id
      }
    });

    row.isUnderMaintenance = isUnderMaintenance !== undefined ? !!isUnderMaintenance : row.isUnderMaintenance;
    if (maintenanceMessage !== undefined) row.maintenanceMessage = maintenanceMessage;
    if (scheduledStart !== undefined) row.scheduledStart = scheduledStart ? new Date(scheduledStart) : null;
    if (scheduledEnd !== undefined) row.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : null;
    row.updatedBy = req.user.id;
    await row.save();

    res.json(row);
  } catch (e) {
    res.status(500).json({ error: "Failed to update maintenance" });
  }
}

async function getDashboardStats(req, res) {
  try {
    const userCount = await sql.User.count();

    // Count users active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineCount = await sql.User.count({
      where: {
        lastActiveAt: {
          [Op.gte]: fiveMinutesAgo
        }
      }
    });

    const evaluationCount = await sql.EvaluationAssignment.count();
    const completedCount = await sql.EvaluationAssignment.count({ where: { status: 'COMPLETED' } });
    const pendingCount = await sql.EvaluationAssignment.count({ where: { status: 'PENDING' } });

    res.json({
      users: {
        total: userCount,
        online: onlineCount
      },
      evaluations: {
        total: evaluationCount,
        completed: completedCount,
        pending: pendingCount
      }
    });
  } catch (e) {
    console.error("Stats Error:", e);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
}

module.exports = {
  // users
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  // scorings
  listScorings,
  createScoring,
  // evaluations
  listEvaluations,
  createEvaluation,
  // assignments
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  // maintenance
  getMaintenance,
  setMaintenance,
  getDashboardStats,
  getEvaluationAnalytics
};
