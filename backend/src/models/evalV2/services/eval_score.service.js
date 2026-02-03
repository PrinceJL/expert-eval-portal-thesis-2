const EvaluationScoring = require("../evaluation_scoring.model");

async function createScoring(data) {
    return EvaluationScoring.create(data);
}

async function getScorings() {
    return EvaluationScoring.find();
}

async function updateScoring(id, updates) {
    return EvaluationScoring.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
    );
}

async function deleteScoring(id) {
    return EvaluationScoring.findByIdAndDelete(id);
}

module.exports = {
    createScoring,
    getScorings,
    updateScoring,
    deleteScoring
};
