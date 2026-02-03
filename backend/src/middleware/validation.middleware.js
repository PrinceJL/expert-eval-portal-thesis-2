const { z } = require("zod");

/**
 * Middleware factory for validating request data against a Zod schema.
 * @param {z.ZodSchema} schema - The Zod schema to validate against.
 * @param {string} source - The property of req to validate (body, query, params). Default is 'body'.
 */
const validate = (schema, source = "body") => (req, res, next) => {
    try {
        schema.parse(req[source]);
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: (err.errors || []).map(e => ({
                    path: e.path.join("."),
                    message: e.message
                }))
            });
        }
        next(err);
    }
};

module.exports = validate;
