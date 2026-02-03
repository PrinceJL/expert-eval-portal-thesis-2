const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
    actorId: { type: String, required: true, index: true },
    action: {
        type: String,
        required: true,
        enum: ["login", "logout", "submit_evaluation", "update_assignment", "create_model_version", "page_maintenance"]
    },

    target: {
        type: { type: String }, // 'EvaluationResponse', 'Assignment', 'User'
        id: { type: String }
    },

    details: Object, // Contextual changes

    ipAddress: String,
    userAgent: String,

}, { timestamps: true });

// Prevent updates to audit logs to ensure integrity
AuditLogSchema.pre('findOneAndUpdate', function () {
    throw new Error('Audit logs are immutable');
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);
