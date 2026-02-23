const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const maintenance = require("../middleware/maintenance.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

// All /admin routes require JWT + admin-ish role
router.use(authenticate);
router.use(maintenance);
router.use(requireRole(["ADMIN", "RESEARCHER"]));

// Users
router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.patch("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

// Scorings
router.get("/scorings", adminController.listScorings);
router.post("/scorings", adminController.createScoring);

// Evaluations
router.get("/evaluations", adminController.listEvaluations);
router.post("/evaluations", adminController.createEvaluation);

// Assignments
// Assignments
router.get("/assignments", adminController.listAssignments);
router.post("/assignments", adminController.createAssignment);
router.patch("/assignments/:id", adminController.updateAssignment);
router.delete("/assignments/:id", adminController.deleteAssignment);

// Maintenance
router.get("/maintenance", adminController.getMaintenance);
router.put("/maintenance", adminController.setMaintenance);

// Stats
router.get("/stats", adminController.getDashboardStats);
router.get("/analytics", adminController.getEvaluationAnalytics);

module.exports = router;
