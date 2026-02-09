const express = require("express");
const cors = require("cors");

const expertRoutes = require("./routes/expert.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const systemRoutes = require("./routes/system.routes");
const messageRoutes = require("./routes/message.routes");

const app = express();

// --- Database Connection Logic (Refactored for Performance) ---
const connectMongo = require("./config/mongo");
const { sql } = require("./models/index");
const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        await connectMongo();
        await sql.sequelize.authenticate();
        console.log("Database connections established");
        isConnected = true;
    } catch (error) {
        console.error("Database connection failed:", error);
        throw error;
    }
};

const syncDB = async () => {
    try {
        if (process.env.NODE_ENV === "development") {
            await sql.sequelize.sync({ alter: true });
            console.log("Database schema synced for development");
        }
    } catch (error) {
        console.error("Database sync failed:", error);
        // Don't throw here to avoid crashing if sync fails but DB is up
    }
};

module.exports = { app, connectDB, syncDB };
// ----------------------------------------------------
// ----------------------------------------------------

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));


// Routes
app.use("/api/system", systemRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/expert", expertRoutes);
app.use("/api/admin", adminRoutes);


