require("dotenv").config();
const { sql } = require("./server/models");
const authService = require("./server/services/auth.service");
const { connectDB } = require("./server/app");

async function testLogin() {
    await connectDB();
    const username = process.env.ADMIN_USERNAME || "admin0";
    const password = process.env.ADMIN_PASSWORD || "pass123";

    console.log(`Testing login for user: ${username} with password: ${password}`);

    try {
        const result = await authService.login({
            username,
            password,
            deviceFingerprint: "test-fp",
            req: { ip: "127.0.0.1", headers: {} }
        });
        console.log("✅ Login Successful!");
        console.log("Result:", result);
    } catch (error) {
        console.error("❌ Login Failed!");
        console.error("Error Message:", error.message);
        console.error("Stack:", error.stack);

        // Let's verify why it failed
        const user = await sql.User.findOne({ where: { username } });
        if (!user) {
            console.log("Reason: User not found in database.");
        } else {
            const bcrypt = require("bcrypt");
            const ok = await bcrypt.compare(password, user.passwordHash);
            console.log("Bcrypt comparison result:", ok);
            console.log("User isActive:", user.isActive);
        }
    }
    process.exit(0);
}

testLogin();
