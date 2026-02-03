const Evaluation = require("../evaluation.model");

/**
 * CREATE evaluation
 */
async function createEvaluation(data) {
    return Evaluation.create(data);
}

/**
 * READ all evaluations
 */
async function getEvaluations() {
    return Evaluation.find().sort({ createdAt: -1 });
}

/**
 * READ one evaluation
 */
async function getEvaluationById(id) {
    return Evaluation.findById(id);
}

/**
 * UPDATE evaluation
 */
async function updateEvaluation(id, updates) {
    return Evaluation.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    );
}

/**
 * DELETE evaluation
 */
async function deleteEvaluation(id) {
    return Evaluation.findByIdAndDelete(id);
}

module.exports = {
    createEvaluation,
    getEvaluations,
    getEvaluationById,
    updateEvaluation,
    deleteEvaluation
};
