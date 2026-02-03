const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    type: {
        type: String,
        enum: ["assignment", "deadline", "message", "system"],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: Object, // Additional payload for navigation or context

    isRead: { type: Boolean, default: false },

}, { timestamps: true });

// Index for efficiently fetching unread notifications
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
