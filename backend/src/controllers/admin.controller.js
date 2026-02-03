const bcrypt = require("bcrypt");

const { sql } = require("../models");
const notificationService = require("../services/notification.service");

// Eval V2 services
const evalService = require("../models/evalV2/services/eval.service");
const scoringService = require("../models/evalV2/services/eval_score.service");
const assignmentService = require("../models/evalV2/services/eval_assignment.service");

function genTempPassword() {
  // 12 chars, mix of letters and digits
  return `Temp${Math.random().toString(36).slice(2, 10)}!`;
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

    if (!username || !email || !group || !role) {
      return res.status(400).json({ error: "Missing username/email/group/role" });
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
    if (msg.includes("users_email") || msg.includes("email")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    if (msg.includes("username") && msg.includes("group")) {
      return res.status(409).json({ error: "Username already exists for this group" });
    }
    return res.status(500).json({ error: "Failed to create user" });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { email, group, role, isActive, resetPassword } = req.body;

    const user = await sql.User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (email !== undefined) user.email = email;
    if (group !== undefined) user.group = group;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = !!isActive;

    let newTempPassword = null;
    if (resetPassword) {
      newTempPassword = genTempPassword();
      user.passwordHash = await bcrypt.hash(newTempPassword, 10);
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
      ...(newTempPassword ? { temporaryPassword: newTempPassword } : {})
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to update user" });
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
    const scoring = await scoringService.createScoring(req.body);
    res.status(201).json(scoring);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to create scoring" });
  }
}

// ------------------ EVALUATIONS ------------------

async function listEvaluations(req, res) {
  try {
    const evals = await evalService.getEvaluations();
    res.json(evals);
  } catch (e) {
    res.status(500).json({ error: "Failed to list evaluations" });
  }
}

async function createEvaluation(req, res) {
  try {
    const { filename, rag_version, items } = req.body;
    if (!filename || !rag_version || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Missing filename/rag_version/items" });
    }
    const created = await evalService.createEvaluation({ filename, rag_version, items });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to create evaluation" });
  }
}

// ------------------ ASSIGNMENTS ------------------

async function listAssignments(req, res) {
  try {
    const filter = {};
    if (req.query.user_assigned) filter.user_assigned = String(req.query.user_assigned);
    const assignments = await assignmentService.getAssignments(filter);
    res.json(assignments);
  } catch (e) {
    res.status(500).json({ error: "Failed to list assignments" });
  }
}

async function createAssignment(req, res) {
  try {
    const { user_assigned, evaluation, evaluation_scorings, deadline } = req.body;
    if (!user_assigned || !evaluation || !Array.isArray(evaluation_scorings) || !evaluation_scorings.length) {
      return res.status(400).json({ error: "Missing user_assigned/evaluation/evaluation_scorings" });
    }

    // Initialize output array for all dimensions
    const user_evaluation_output = evaluation_scorings.map((sid) => ({
      scoring: sid,
      score: null,
      comments: null
    }));

    const assignment = await assignmentService.assignEvaluation({
      user_assigned: String(user_assigned),
      evaluation,
      evaluation_scorings,
      deadline: deadline ? new Date(deadline) : undefined,
      user_evaluation_output
    });

    // Notification
    try {
      await notificationService.createNotification(
        String(user_assigned),
        "assignment",
        "New evaluation assigned",
        "You have a new evaluation assignment.",
        { assignmentId: String(assignment._id) }
      );
    } catch {}

    const populated = await assignmentService.getAssignmentById(assignment._id);
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to create assignment" });
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

module.exports = {
  // users
  listUsers,
  createUser,
  updateUser,
  // scorings
  listScorings,
  createScoring,
  // evaluations
  listEvaluations,
  createEvaluation,
  // assignments
  listAssignments,
  createAssignment,
  // maintenance
  getMaintenance,
  setMaintenance
};
