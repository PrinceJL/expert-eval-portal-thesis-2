const mongoose = require("mongoose");

const connectMongo = async () => {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
};

module.exports = connectMongo;
