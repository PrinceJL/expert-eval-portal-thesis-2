const mongoose = require("mongoose");

const EvaluationSchema = new mongoose.Schema({
    assignmentId: { type: String, required: true, index: true }, // Links to PostgreSQL assignment
    expertId: { type: String, required: true },
    modelVersionId: { type: String, required: true },

    // Likert Scale Scores (1-5)
    scores: {
        legalCorrectness: {
            value: { type: Number, min: 1, max: 5 },
            confidence: { type: String, enum: ["low", "medium", "high"], default: "medium" },
            notes: String
        },
        jurisdictionalPrecision: {
            value: { type: Number, min: 1, max: 5 },
            confidence: { type: String, enum: ["low", "medium", "high"], default: "medium" },
            notes: String
        },
        linguisticAccessibility: {
            value: { type: Number, min: 1, max: 5 },
            confidence: { type: String, enum: ["low", "medium", "high"], default: "medium" },
            notes: String
        },
        temporalValidity: {
            value: { type: Number, min: 1, max: 5 },
            confidence: { type: String, enum: ["low", "medium", "high"], default: "medium" },
            notes: String
        }
    },

    // Distress Detection (Pass/Fail for high-risk scenarios)
    distressDetection: {
        applicable: { type: Boolean, default: false },
        result: { type: String, enum: ["PASS", "FAIL", "N/A"], default: "N/A" },
        notes: String
    },

    // Error Severity Classification
    errorSeverity: {
        level: { type: String, enum: ["none", "minor", "moderate", "major"], default: "none" },
        description: String,
        overridesScore: { type: Boolean, default: false }
    },

    // General Notes
    generalNotes: String,
    quickNotes: [String],            // From quick notes library

    // Metadata
    submitted: { type: Boolean, default: false },
    submittedAt: Date,
    timeSpentSeconds: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model("EvaluationResponse", EvaluationSchema);
