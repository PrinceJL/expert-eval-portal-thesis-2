const express = require("express");
// Services are now used in controllers

const router = express.Router();

const expertController = require("../controllers/expert.controller");
const authenticate = require("../middleware/auth.middleware");
const maintenance = require("../middleware/maintenance.middleware");// All /expert routes require JWT
router.use(authenticate);
router.use(maintenance);

// Debug/test
router.post("/test", expertController.evalTest);

// Eval V2 (Mongo): assignments + evaluation payload
router.get("/assignments", expertController.getMyAssignments);
router.get("/assignments/:id", expertController.getAssignmentById);
router.post("/assignments", expertController.createAssignment);
router.post("/assignments/:id/draft", expertController.saveAssignmentDraft);
router.post("/assignments/:id/submit", expertController.submitAssignmentScores);
router.get("/stats", expertController.getExpertStats);

// Expert Stats
router.get("/stats", expertController.getExpertStats);

// Eval V2 (Mongo): scoring definitions
router.post("/scorings", expertController.createScoring);

// Evaluation response (Mongo EvaluationResponse): draft/final submission
router.post("/save", expertController.saveDraft);
router.post("/submit", expertController.submitFinalEvaluation);

router.get("/ping", (req, res) => {
    res.json({ status: "ok", time: new Date() });
});

module.exports = router;
