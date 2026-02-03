const Message = require("../models/mongo/message.model");

/**
 * Sends a message in a conversation.
 * @param {Object} data - Message data (senderId, recipientId, content, etc.)
 * @returns {Promise<Object>} The created message.
 */
async function sendMessage(data) {
    if (!data.conversationId || !data.content) {
        throw new Error("Missing required message fields");
    }

    const message = new Message({
        ...data,
        isRead: false,
        createdAt: new Date()
    });

    return await message.save();
}

/**
 * Retrieves messages for a specific conversation.
 * @param {String} conversationId - The conversation ID.
 * @param {Number} limit - Number of messages to retrieve (default 50).
 * @param {Number} skip - Number of messages to skip (pagination).
 * @returns {Promise<Array>} List of messages.
 */
async function getConversation(conversationId, limit = 50, skip = 0) {
    return await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
}

/**
 * Marks messages as read for a recipient in a conversation.
 * @param {String} conversationId 
 * @param {String} recipientId 
 */
async function markAsRead(conversationId, recipientId) {
    await Message.updateMany(
        { conversationId, recipientId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
    );
}

module.exports = {
    sendMessage,
    getConversation,
    markAsRead
};