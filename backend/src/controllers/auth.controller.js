const authService = require("../services/auth.service");
const authenticate = require("../middleware/auth.middleware");

async function login(req, res) {
    try {
        const { username, password, group, deviceFingerprint } = req.body;
        const result = await authService.login({ username, password, group, deviceFingerprint, req });
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

module.exports = { login, logout, me };
