const EvaluationScoring = require("../evaluation_scoring.model");
const mongoose = require("mongoose");

async function createScoring(data) {
    return EvaluationScoring.create(data);
}

async function getScorings() {
    return EvaluationScoring.find();
}

async function getScoringsByIds(ids = []) {
    const validIds = ids
        .map((id) => String(id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!validIds.length) return [];
    return EvaluationScoring.find({ _id: { $in: validIds } });
}

async function updateScoring(id, updates) {
    const doc = await EvaluationScoring.findById(id);
    if (!doc) return null;
    Object.assign(doc, updates);
    return doc.save();
}

async function deleteScoring(id) {
    return EvaluationScoring.findByIdAndDelete(id);
}

module.exports = {
    createScoring,
    getScorings,
    getScoringsByIds,
    updateScoring,
    deleteScoring
};
