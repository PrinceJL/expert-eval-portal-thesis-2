const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");

const { sql, mongo } = require("../models");

function makeRefreshToken() {
    return crypto.randomBytes(48).toString("hex");
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

        // Enforce “no 2 instances” if device fingerprint is provided.
        // (If you don’t have a frontend fingerprint yet, you can omit it for now.)
        if (deviceFingerprint) {
            await mongo.SessionCache.deleteMany({ userId: String(user.id) });
        }

        const accessToken = jwt.sign(
            {
                id: String(user.id),
                role: user.role,
                username: user.username,
                group: user.group,
                email: user.email || null
            },
            process.env.JWT_SECRET || "default_secret_key",
            { expiresIn: "15m" }
        );

        // Optional session cache record (Mongo) to support resume/session restore.
        if (deviceFingerprint) {
            const refreshToken = makeRefreshToken();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await mongo.SessionCache.create({
                userId: String(user.id),
                deviceFingerprint,
                refreshToken,
                expiresAt,
                lastActivity: new Date(),
                cachedMessages: []
            });
        }

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
                email: user.email || null
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
