const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");

const { sql, mongo } = require("../models");

const VALID_PRESENCE_STATUSES = new Set(["auto", "online", "idle", "dnd", "invisible"]);

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

        let existingPresenceStatus = "auto";
        const existingSession = await mongo.SessionCache.findOne({ userId: String(user.id) })
            .sort({ updatedAt: -1 })
            .select({ presenceStatus: 1 });
        existingPresenceStatus = normalizePresenceStatus(existingSession?.presenceStatus);

        // Single active session per user: revoke previous sessions before issuing a new token.
        await mongo.SessionCache.deleteMany({ userId: String(user.id) });

        const sessionId = makeSessionId();
        const normalizedDeviceFingerprint = String(deviceFingerprint || "").trim() || `anon-${makeSessionId().slice(0, 12)}`;

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
