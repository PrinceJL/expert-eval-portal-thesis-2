const jwt = require("jsonwebtoken");
const trackActivity = require("./activity.middleware");
const { mongo } = require("../models");

/**
 * Middleware to authenticate requests using JWT.
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: "Access denied. Invalid token format." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key");
        const userId = String(decoded?.id || "");
        const sessionId = String(decoded?.sid || "");
        if (!userId || !sessionId) {
            return res.status(401).json({ error: "Invalid session token." });
        }

        // Enforce single active session:
        // only the latest login sessionId remains valid.
        const activeSession = await mongo.SessionCache.findOneAndUpdate(
            {
                userId,
                sessionId,
                expiresAt: { $gt: new Date() }
            },
            { $set: { lastActivity: new Date() } },
            {
                new: false,
                projection: { _id: 1 }
            }
        );
        if (!activeSession) {
            return res.status(401).json({ error: "Session expired or replaced by another login." });
        }

        req.user = decoded;

        // Track activity
        await trackActivity(req, res, () => { });

        next();
    } catch (err) {
        // Return 401 so the frontend triggers auto-logout
        res.status(401).json({ error: "Invalid or expired token." });
    }
};

module.exports = authenticate;
