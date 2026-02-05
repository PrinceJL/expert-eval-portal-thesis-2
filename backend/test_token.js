// generateToken.js
const jwt = require("jsonwebtoken");

// Pick the same secret you use in your auth middleware / .env
const SECRET = process.env.JWT_SECRET || "default_secret_key";

// Payload — the user info encoded in the token
const payload = {
  id: "user123",
  username: "user123",
  role: "expert"
};

// Options — token expiry
const options = {
  expiresIn: "1h" // 1 hour
};

// Generate token
const token = jwt.sign(payload, SECRET, options);
console.log("JWT Token for user123:\n", token);
