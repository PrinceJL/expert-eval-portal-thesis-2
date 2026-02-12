const mongoose = require("mongoose");

const SessionCacheSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    deviceFingerprint: { type: String, required: true },
    refreshToken: { type: String, required: true, select: false },

    // Auto-expire sessions after 7 days
    expiresAt: { type: Date, required: true },

    lastActivity: { type: Date, default: Date.now },
    presenceStatus: {
        type: String,
        enum: ["auto", "online", "idle", "dnd", "invisible"],
        default: "auto",
        index: true
    },

    // Cached data for quick dashboard load
    cachedMessages: [{
        conversationId: String,
        lastMessage: String,
        unreadCount: Number,
        updatedAt: Date
    }]

}, { timestamps: true, bufferCommands: false });

// TTL Index for automatic cleanup
SessionCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("SessionCache", SessionCacheSchema);
