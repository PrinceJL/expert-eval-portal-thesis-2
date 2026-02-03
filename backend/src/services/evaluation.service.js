const EvaluationResponse = require("../models/mongo/evaluation.model");

const REQUIRED_FIELDS = [
    "legalCorrectness",
    "jurisdictionalPrecision",
    "linguisticAccessibility",
    "temporalValidity"
];

/**
 * Validates the evaluation scores structure.
 * @param {Object} scores - The scores object from the request body.
 * @throws {Error} If validation fails.
 */
function validateEvaluation(scores) {
    if (!scores) {
        throw new Error("Scores object is missing");
    }

    for (const field of REQUIRED_FIELDS) {
        if (!scores[field]) {
            throw new Error(`Missing score object for: ${field}`);
        }

        // Check for value existence and range
        const value = scores[field].value;
        if (value === undefined || value === null) {
            throw new Error(`Missing score value for: ${field}`);
        }

        if (typeof value !== 'number' || value < 1 || value > 5) {
            throw new Error(`Invalid Likert score for ${field}. Must be between 1 and 5.`);
        }
    }
}

/**
 * Saves a draft evaluation.
 * @param {Object} data - The evaluation data.
 */
async function saveDraft(data) {
    return await EvaluationResponse.findOneAndUpdate(
        { assignmentId: data.assignmentId },
        { ...data, submitted: false },
        { upsert: true, new: true }
    );
}

/**
 * Submits a final evaluation.
 * @param {Object} data - The evaluation data.
 */
async function submitEvaluation(data) {
    validateEvaluation(data.scores);

    // Additional business logic could go here (e.g., check if assignment is already completed)

    return await EvaluationResponse.findOneAndUpdate(
        { assignmentId: data.assignmentId },
        { ...data, submitted: true, submittedAt: new Date() },
        { upsert: true, new: true }
    );
}

module.exports = {
    validateEvaluation,
    saveDraft,
    submitEvaluation,
    EvaluationResponse // Export model for direct queries if needed, though service methods are preferred
};