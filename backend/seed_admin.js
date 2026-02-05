require("dotenv").config();
const bcrypt = require("bcrypt");
const { sql } = require("./src/models");

async function run() {
  await sql.sequelize.sync({ force: false });

  const username = "admin2";
  const group = "TEAM404";
  const password = "pass123";
  const passwordHash = await bcrypt.hash(password, 10);

  await sql.User.findOrCreate({
    where: { username, group },
    defaults: {
      email: "admin2-team404@example.com",
      role: "ADMIN",
      passwordHash,
      isActive: true
    }
  });

  console.log("Seeded admin: admin2 / pass123 / TEAM404");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
