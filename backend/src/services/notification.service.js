const Notification = require("../models/mongo/notification.model");

/**
 * Creates a new notification for a user.
 * @param {String} userId - The recipient user ID.
 * @param {String} type - Type of notification (assignment, deadline, message, system).
 * @param {String} title - Notification title.
 * @param {String} message - Notification body.
 * @param {Object} data - Additional metadata.
 */
async function createNotification(userId, type, title, message, data = {}) {
    if (!userId || !title || !message) {
        throw new Error("Missing required notification fields");
    }

    const notification = new Notification({
        userId,
        type,
        title,
        message,
        data,
        isRead: false
    });

    return await notification.save();
}

/**
 * Retrieves unread notifications for a user.
 * @param {String} userId - The user ID.
 * @returns {Promise<Array>} List of unread notifications.
 */
async function getUnreadNotifications(userId) {
    return await Notification.find({ userId, isRead: false })
        .sort({ createdAt: -1 });
}

/**
 * Marks a notification as read.
 * @param {String} notificationId 
 */
async function markRead(notificationId) {
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
}

module.exports = {
    createNotification,
    getUnreadNotifications,
    markRead
};