const authService = require("../services/auth.service");
const authenticate = require("../middleware/auth.middleware");
const { mongo } = require("../models");

const VALID_PRESENCE_STATUSES = new Set(["auto", "online", "idle", "dnd", "invisible"]);

async function login(req, res) {
    try {
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

        const nextStatus = String(req.body?.status || "").toLowerCase();
        if (!VALID_PRESENCE_STATUSES.has(nextStatus)) {
            return res.status(400).json({ error: "Invalid presence status" });
        }

        await mongo.SessionCache.updateMany(
            { userId },
            { $set: { presenceStatus: nextStatus, lastActivity: new Date() } }
        );

        return res.json({ status: nextStatus });
    } catch (e) {
        return res.status(500).json({ error: e.message || "Failed to update presence status" });
    }
}

module.exports = { login, logout, me, setPresence };
