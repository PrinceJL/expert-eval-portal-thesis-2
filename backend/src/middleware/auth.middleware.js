const jwt = require("jsonwebtoken");

/**
 * Middleware to authenticate requests using JWT.
 */
const authenticate = (req, res, next) => {
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
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: "Invalid token." });
    }
};

module.exports = authenticate;
