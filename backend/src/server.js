require("dotenv").config();
const app = require("./app");
const connectMongo = require("./config/mongo");
const { sql } = require("./models/index"); // Import SQL models to trigger init

// Connect to MongoDB
connectMongo();

// Sync PostgreSQL (Sequelize)
// In production, use migrations instead of sync({ force: false })
sql.sequelize.sync({ force: false })
    .then(() => {
        console.log("PostgreSQL synced");
    })
    .catch((err) => {
        console.error("Failed to sync PostgreSQL:", err);
    });

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
