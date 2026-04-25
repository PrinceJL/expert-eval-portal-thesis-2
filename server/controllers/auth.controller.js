const authService = require("../services/auth.service");
const authenticate = require("../middleware/auth.middleware");
const { mongo, sql } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const VALID_PRESENCE_STATUSES = new Set(["auto", "online", "idle", "dnd", "invisible"]);
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";

function issueAccessToken(userPayload = {}) {
    return jwt.sign(
        {
            id: String(userPayload?.id || ""),
            role: userPayload?.role,
            username: userPayload?.username,
            group: userPayload?.group,
            email: userPayload?.email || null,
            sid: String(userPayload?.sid || "")
        },
        process.env.JWT_SECRET || "default_secret_key",
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

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
                        // User is already logged in with a valid token, but we will allow them to login again.
                        // The authService.login function will handle clearing the old session.
                        console.log(`User ${userId} is logging in again. Proceeding to create a new session.`);
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

        const accessToken = issueAccessToken(req.user);

        return res.json({
            ok: true,
            serverTime: now.toISOString(),
            accessToken
        });
    } catch (e) {
        return res.status(500).json({ error: e.message || "Failed to update heartbeat" });
    }
}

async function changePassword(req, res) {
    try {
        const userId = String(req?.user?.id || "");
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const user = await sql.User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        user.mustChangePassword = false;
        await user.save();

        return res.json({ message: "Password updated successfully" });
    } catch (e) {
        return res.status(500).json({ error: e.message || "Failed to change password" });
    }
}

module.exports = { login, logout, me, setPresence, heartbeat, changePassword };
