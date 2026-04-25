const Notification = require("../models/mongo/notification.model");
const { sql } = require("../models");
const emailService = require("./email.service");

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

    await notification.save();

    // Email notification logic
    if (type === "message" && process.env.ADMIN_NOTIFICATION_EMAIL) {
        try {
            const user = await sql.User.findByPk(userId);
            if (user && user.role === "ADMIN") {
                const senderName = data.senderName || "A user";
                await emailService.sendEmail({
                    to: process.env.ADMIN_NOTIFICATION_EMAIL,
                    subject: `[Portal] ${title}`,
                    text: `Hello,\n\n${senderName} has sent you a new message on the Evaluation Portal.\n\nContent: "${message}"\n\nPlease log in to the portal to reply.\n\nBest regards,\nPortal System`,
                    html: `
                        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                            <h2>New Message Received</h2>
                            <p><strong>${senderName}</strong> has sent you a new message on the Evaluation Portal.</p>
                            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0;">
                                <em>"${message}"</em>
                            </div>
                            <p>Please log in to the portal to view the full conversation and reply.</p>
                            <hr />
                            <p style="font-size: 12px; color: #777;">This is an automated notification from your Evaluation Portal.</p>
                        </div>
                    `
                });
            }
        } catch (emailError) {
            console.error("Failed to send notification email:", emailError);
            // We don't throw here to avoid blocking the notification creation
        }
    }

    return notification;
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