const { z } = require("zod");

const scoreSchema = z.object({
    value: z.number().min(1).max(5),
    confidence: z.enum(["low", "medium", "high"]).default("medium"),
    notes: z.string().optional()
});

const evaluationSchema = z.object({
    assignmentId: z.string().min(1, "Assignment ID is required"),
    expertId: z.string().min(1, "Expert ID is required"),
    modelVersionId: z.string().min(1, "Model Version ID is required"),
    scores: z.object({
        legalCorrectness: scoreSchema,
        jurisdictionalPrecision: scoreSchema,
        linguisticAccessibility: scoreSchema,
        temporalValidity: scoreSchema
    }),
    distressDetection: z.object({
        applicable: z.boolean().default(false),
        result: z.enum(["PASS", "FAIL", "N/A"]).default("N/A"),
        notes: z.string().optional()
    }).optional(),
    errorSeverity: z.object({
        level: z.enum(["none", "minor", "moderate", "major"]).default("none"),
        description: z.string().optional(),
        overridesScore: z.boolean().default(false)
    }).optional(),
    generalNotes: z.string().optional(),
    quickNotes: z.array(z.string()).optional()
});

module.exports = {
    evaluationSchema
};
