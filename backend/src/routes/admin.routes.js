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

// Scorings
router.get("/scorings", adminController.listScorings);
router.post("/scorings", adminController.createScoring);

// Evaluations
router.get("/evaluations", adminController.listEvaluations);
router.post("/evaluations", adminController.createEvaluation);

// Assignments
router.get("/assignments", adminController.listAssignments);
router.post("/assignments", adminController.createAssignment);

// Maintenance
router.get("/maintenance", adminController.getMaintenance);
router.put("/maintenance", adminController.setMaintenance);

module.exports = router;
