const express = require("express");

const authController = require("../controllers/auth.controller");

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

module.exports = router;
