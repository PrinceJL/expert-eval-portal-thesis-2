const express = require("express");

const expertController = require("../controllers/expert.controller");
const validate = require("../middleware/validation.middleware");
const { evaluationSchema } = require("../models/schemas/evaluation.schema");
const authenticate = require("../middleware/auth.middleware");
const maintenance = require("../middleware/maintenance.middleware");

const router = express.Router();

// All /expert routes require JWT
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

// Eval V2 (Mongo): scoring definitions
router.post("/scorings", expertController.createScoring);

// Evaluation response (Mongo EvaluationResponse): draft/final submission
router.post("/save", expertController.saveDraft);
router.post("/submit", validate(evaluationSchema), expertController.submitFinalEvaluation);

router.get("/ping", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

module.exports = router;
