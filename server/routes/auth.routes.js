const express = require("express");

const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * POST /auth/login
 * Body: { username, password, group, deviceFingerprint? }
 * Returns: { accessToken, user }
 */
router.post("/login", authController.login);

/**
 * POST /auth/logout
 * Body: { userId, deviceFingerprint? }
 */
router.post("/logout", authController.logout);

/**
 * GET /auth/me
 * Header: Authorization: Bearer <token>
 */
router.get("/me", authController.me);

/**
 * POST /auth/presence
 * Body: { status: "auto"|"online"|"idle"|"dnd"|"invisible" }
 */
router.post("/presence", authenticate, authController.setPresence);

/**
 * POST /auth/heartbeat
 * Touches last activity for the authenticated session.
 */
router.post("/heartbeat", authenticate, authController.heartbeat);

module.exports = router;
