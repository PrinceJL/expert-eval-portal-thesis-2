const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    recipientId: { type: String, required: true },
    content: { type: String, required: true },

    attachments: [{
        type: { type: String, enum: ["image", "document", "video"] },
        url: String,
        filename: String,
        size: Number
    }],

    // Track which model version was active when this message was sent
    modelVersionContext: String,

    isRead: { type: Boolean, default: false },
    readAt: Date

}, { timestamps: true });

// Index for retrieving conversation history
MessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);
