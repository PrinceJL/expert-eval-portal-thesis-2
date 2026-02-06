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

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
