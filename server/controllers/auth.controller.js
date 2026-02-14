const authService = require("../services/auth.service");
const authenticate = require("../middleware/auth.middleware");
const { mongo, sql } = require("../models");
const jwt = require("jsonwebtoken");

const VALID_PRESENCE_STATUSES = new Set(["auto", "online", "idle", "dnd", "invisible"]);

async function login(req, res) {
    try {
        const authHeader = req.headers?.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key");
                const userId = String(decoded?.id || "");
                const sessionId = String(decoded?.sid || "");
                if (userId && sessionId) {
                    const active = await mongo.SessionCache.exists({
                        userId,
                        sessionId,
                        expiresAt: { $gt: new Date() }
                    });
                    if (active) {
                        return res.status(409).json({ error: "Already logged in. Please logout first." });
                    }
                }
            } catch {
                // Ignore invalid/expired token and continue normal login.
            }
        }

        const { username, password, deviceFingerprint } = req.body;
        const result = await authService.login({ username, password, deviceFingerprint, req });
        return res.json(result);
    } catch (e) {
        return res.status(e.statusCode || 400).json({ error: e.message || "Login failed" });
    }
}

async function logout(req, res) {
    try {
        const { userId, deviceFingerprint } = req.body;
        await authService.logout({ userId, deviceFingerprint });
        return res.json({ message: "Logged out" });
    } catch (e) {
        return res.status(e.statusCode || 400).json({ error: e.message || "Logout failed" });
    }
}

// Small helper to reuse middleware inside controller
function me(req, res) {
    return authenticate(req, res, () => {
        return res.json({ user: req.user });
    });
}

async function setPresence(req, res) {
    try {
        const userId = String(req?.user?.id || "");
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const requestedStatus = String(req.body?.status || "").toLowerCase();
        if (!VALID_PRESENCE_STATUSES.has(requestedStatus)) {
            return res.status(400).json({ error: "Invalid presence status" });
        }

        // Keep manual controls lightweight:
        // online/idle are treated as automatic activity-based presence.
        const nextStatus = (requestedStatus === "online" || requestedStatus === "idle")
            ? "auto"
            : requestedStatus;

        const sessionId = String(req?.user?.sid || "");
        const sessionWhere = {
            userId,
            expiresAt: { $gt: new Date() }
        };
        if (sessionId) {
            sessionWhere.sessionId = sessionId;
        }

        const now = new Date();
        await mongo.SessionCache.updateMany(
            sessionWhere,
            { $set: { presenceStatus: nextStatus, lastActivity: now } }
        );

        await sql.User.update(
            { lastActiveAt: now },
            { where: { id: userId }, silent: true }
        );

        return res.json({ status: nextStatus });
    } catch (e) {
        return res.status(500).json({ error: e.message || "Failed to update presence status" });
    }
}

async function heartbeat(req, res) {
    try {
        const userId = String(req?.user?.id || "");
        const sessionId = String(req?.user?.sid || "");
        if (!userId || !sessionId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const now = new Date();
        const touched = await mongo.SessionCache.findOneAndUpdate(
            {
                userId,
                sessionId,
                expiresAt: { $gt: now }
            },
            { $set: { lastActivity: now } },
            {
                new: false,
                projection: { _id: 1, presenceStatus: 1 }
            }
        );

        if (!touched) {
            return res.status(401).json({ error: "Session expired or replaced by another login." });
        }

        await sql.User.update(
            { lastActiveAt: now },
            { where: { id: userId }, silent: true }
        );

        return res.json({
            ok: true,
            serverTime: now.toISOString()
        });
    } catch (e) {
        return res.status(500).json({ error: e.message || "Failed to update heartbeat" });
    }
}

module.exports = { login, logout, me, setPresence, heartbeat };
