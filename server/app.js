const express = require("express");
const cors = require("cors");

const expertRoutes = require("./routes/expert.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const systemRoutes = require("./routes/system.routes");

const messageRoutes = require("./routes/message.routes");
const contactRoutes = require("./routes/contact.routes");

const app = express();

// --- Database Connection Logic (Refactored for Performance) ---
const connectMongo = require("./config/mongo");
const { sql } = require("./models/index");
const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        console.log("Connecting to MongoDB...");
        await connectMongo();
        console.log("MongoDB connected. Connecting to Postgres...");

        // Race authenticate with a timeout to detect hangs
        const authPromise = sql.sequelize.authenticate();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Postgres connection timeout (10s)")), 10000)
        );

        await Promise.race([authPromise, timeoutPromise]);
        console.log("Postgres connected. Database connections established");
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

// Serve uploaded files
const path = require("path");
app.get("/uploads/:filename", (req, res) => {
    const filePath = path.join(process.cwd(), "uploads", req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error serving file:", err);
            res.status(404).json({ error: "File not found" });
        }
    });
});



// Routes
app.use("/api/system", systemRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/expert", expertRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);


