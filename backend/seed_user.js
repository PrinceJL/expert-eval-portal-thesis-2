require("dotenv").config();
const bcrypt = require("bcrypt");
const { sql } = require("./src/models");

/**
 * Seed a test user for local development.
 * Usage: node seed_user.js
 */
async function run() {
    await sql.sequelize.sync({ force: false });

    const passwordHash = await bcrypt.hash("pass123", 10);

    await sql.User.findOrCreate({
        where: { username: "expert1", group: "TEAM404" },
        defaults: {
            email: "expert1@example.com",
            role: "EXPERT",
            passwordHash,
            isActive: true
        }
    });

    console.log("Seeded user: expert1 / pass123 / group TEAM404");
    process.exit(0);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
