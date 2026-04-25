const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Sends an email notification.
 * @param {Object} options - Email options.
 * @param {String} options.to - Recipient email.
 * @param {String} options.subject - Email subject.
 * @param {String} options.text - Plain text content.
 * @param {String} options.html - HTML content.
 */
async function sendEmail({ to, subject, text, html }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("Email service not configured. Skipping email sending.");
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Portal Notification" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log("Email sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Failed to send email:", error);
        throw error;
    }
}

module.exports = {
    sendEmail
};
