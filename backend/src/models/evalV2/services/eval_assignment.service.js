const EvaluationAssignment = require("../evaluation_assignment.model");

/**
 * CREATE assignment
 */
async function assignEvaluation(data) {
    return EvaluationAssignment.create(data);
}

/**
 * READ assignments (optionally by user)
 */
async function getAssignments(filter = {}) {
    return EvaluationAssignment.find(filter)
        .populate("evaluation")
        .populate("evaluation_scorings");
}

/**
 * READ single assignment
 */
async function getAssignmentById(id) {
    return EvaluationAssignment.findById(id)
        .populate("evaluation")
        .populate("evaluation_scorings");
}

/**
 * UPDATE evaluator scores
 */
async function submitScores(assignmentId, userEvaluationOutput) {
    const assignment = await EvaluationAssignment.findById(assignmentId);
    if (!assignment) return null;
    if (assignment.final_submitted) {
        const err = new Error("Assignment already submitted and locked");
        err.statusCode = 409;
        throw err;
    }
    assignment.user_evaluation_output = userEvaluationOutput;
    assignment.last_draft_saved_at = new Date();
    await assignment.save();
    return assignment;
}

/**
 * Save draft scores (partial allowed)
 */
async function saveDraft(assignmentId, userEvaluationOutput) {
    return submitScores(assignmentId, userEvaluationOutput);
}

/**
 * Final submit locks the assignment.
 */
async function finalSubmit(assignmentId, userEvaluationOutput) {
    const assignment = await EvaluationAssignment.findById(assignmentId);
    if (!assignment) return null;
    if (assignment.final_submitted) {
        const err = new Error("Assignment already submitted and locked");
        err.statusCode = 409;
        throw err;
    }

    // Require every dimension to have a non-empty score
    if (!Array.isArray(userEvaluationOutput) || !userEvaluationOutput.length) {
        const err = new Error("user_evaluation_output must be a non-empty array");
        err.statusCode = 400;
        throw err;
    }
    const allOk = userEvaluationOutput.every((row) => {
        const v = row?.score;
        return v !== null && v !== undefined && String(v).trim().length > 0;
    });
    if (!allOk) {
        const err = new Error("All dimensions must be scored before final submit");
        err.statusCode = 400;
        throw err;
    }

    assignment.user_evaluation_output = userEvaluationOutput;
    assignment.final_submitted = true;
    assignment.submitted_at = new Date();
    assignment.last_draft_saved_at = new Date();
    await assignment.save();
    return assignment;
}

/**
 * DELETE assignment (admin only)
 */
async function deleteAssignment(id) {
    return EvaluationAssignment.findByIdAndDelete(id);
}

module.exports = {
    assignEvaluation,
    getAssignments,
    getAssignmentById,
    submitScores,
    saveDraft,
    finalSubmit,
    deleteAssignment
};
