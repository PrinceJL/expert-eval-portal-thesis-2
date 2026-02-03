const express = require("express");
const cors = require("cors");

const expertRoutes = require("./routes/expert.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const systemRoutes = require("./routes/system.routes");
const messageRoutes = require("./routes/message.routes");

const app = express();
app.use(cors());
app.use(express.json());

// Public system endpoints
app.use("/system", systemRoutes);

app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/expert", expertRoutes);
app.use("/admin", adminRoutes);

module.exports = app;
