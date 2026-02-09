const mongoose = require("mongoose");
mongoose.set("bufferCommands", false); // Disable buffering before requiring models
require("pg"); // Explicitly require to force Vercel bundler to include it
require("dotenv").config();
const { app, connectDB, syncDB } = require("../server/app");

// For local development only
if (process.env.NODE_ENV === "development") {
    const PORT = process.env.PORT || 3000;
    (async () => {
        try {
            await connectDB();
            await syncDB();
            app.listen(PORT, () => {
                console.log(`Server running locally on port ${PORT}`);
            });
        } catch (error) {
            console.error("Failed to start server locally:", error);
            process.exit(1);
        }
    })();
} else {
    // For Vercel/Production: Ensure DB is connected (lazy connection)
    connectDB().catch(err => console.error("Vercel DB connection error:", err));
}

// Export the app for Vercel
module.exports = app;
