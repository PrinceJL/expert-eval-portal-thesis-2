const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");

const { sql, mongo } = require("../models");

const VALID_PRESENCE_STATUSES = new Set(["auto", "online", "idle", "dnd", "invisible"]);
const ACTIVE_SESSION_WINDOW_MS = Number(process.env.ACTIVE_SESSION_WINDOW_MS || 15 * 60 * 1000);

function normalizePresenceStatus(value) {
    const s = String(value || "").toLowerCase();
    return VALID_PRESENCE_STATUSES.has(s) ? s : "auto";
}

function makeRefreshToken() {
    return crypto.randomBytes(48).toString("hex");
}

function makeSessionId() {
    return crypto.randomBytes(24).toString("hex");
}

function isRecentlyActive(session) {
    const ts = new Date(session?.lastActivity || session?.updatedAt || 0).getTime();
    if (!Number.isFinite(ts) || ts <= 0) return false;
    return (Date.now() - ts) <= ACTIVE_SESSION_WINDOW_MS;
}

async function login({ username, password, deviceFingerprint, req }) {
    try {
        if (!username || !password) {
            const err = new Error("Missing username/password");
            err.statusCode = 400;
            throw err;
        }

        const user = await sql.User.findOne({
            where: {
                isActive: true,
                [Op.or]: [
                    { username },
                    { email: username }
                ]
            }
        });
        if (!user) {
            const err = new Error("Invalid credentials");
            err.statusCode = 401;
            throw err;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            const err = new Error("Invalid credentials");
            err.statusCode = 401;
            throw err;
        }

        const normalizedDeviceFingerprint = String(deviceFingerprint || "").trim() || `anon-${makeSessionId().slice(0, 12)}`;

        let existingPresenceStatus = "auto";
        const existingSession = await mongo.SessionCache.findOne({ userId: String(user.id) })
            .sort({ updatedAt: -1 })
            .select({ presenceStatus: 1, deviceFingerprint: 1, lastActivity: 1, updatedAt: 1 });
        existingPresenceStatus = normalizePresenceStatus(existingSession?.presenceStatus);

        // Strict single-session policy:
        // deny login from another device while the current session is still active.
        if (existingSession && isRecentlyActive(existingSession)) {
            const sameDevice = String(existingSession.deviceFingerprint || "") === normalizedDeviceFingerprint;
            if (!sameDevice) {
                const err = new Error("This account is already active on another device. Please logout there first.");
                err.statusCode = 409;
                throw err;
            }
        }

        // Re-issue session (same device relogin, or stale previous session).
        await mongo.SessionCache.deleteMany({ userId: String(user.id) });

        const sessionId = makeSessionId();

        const accessToken = jwt.sign(
            {
                id: String(user.id),
                role: user.role,
                username: user.username,
                group: user.group,
                email: user.email || null,
                sid: sessionId
            },
            process.env.JWT_SECRET || "default_secret_key",
            { expiresIn: "15m" }
        );

        const refreshToken = makeRefreshToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await mongo.SessionCache.create({
            userId: String(user.id),
            sessionId,
            deviceFingerprint: normalizedDeviceFingerprint,
            refreshToken,
            expiresAt,
            lastActivity: new Date(),
            presenceStatus: existingPresenceStatus,
            cachedMessages: []
        });

        user.lastLogin = new Date();
        await user.save();

        // Audit log (Mongo)
        try {
            await mongo.AuditLog.create({
                actorId: String(user.id),
                action: "login",
                ipAddress: req?.ip,
                userAgent: req?.headers?.["user-agent"]
            });
        } catch {
            // audit log should never block login
        }

        return {
            accessToken,
            user: {
                id: String(user.id),
                username: user.username,
                role: user.role,
                group: user.group,
                email: user.email || null,
                presenceStatus: existingPresenceStatus
            }
        };
    } catch (error) {
        console.error("AuthService Login Error:", {
            message: error.message,
            stack: error.stack,
            username: username
        });
        throw error;
    }
}

async function logout({ userId, deviceFingerprint }) {
    if (!userId) {
        const err = new Error("Missing userId");
        err.statusCode = 400;
        throw err;
    }

    // If fingerprint exists, delete only that session; otherwise wipe all sessions for the user.
    if (deviceFingerprint) {
        await mongo.SessionCache.deleteMany({ userId: String(userId), deviceFingerprint });
    } else {
        await mongo.SessionCache.deleteMany({ userId: String(userId) });
    }

    try {
        await mongo.AuditLog.create({
            actorId: String(userId),
            action: "logout"
        });
    } catch {
        // ignore
    }
}

module.exports = { login, logout };
