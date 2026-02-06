const { sql, mongo } = require("../models");
const messageService = require("../services/message.service");
const notificationService = require("../services/notification.service");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

function convoId(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVercel = process.env.VERCEL === '1';
    const dir = isVercel ? "/tmp/uploads/" : "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single("file");

async function getContacts(req, res) {
  try {
    const me = req.user;
    const where = { isActive: true };

    // Customers (EXPERTS) should be able to see all ADMINS and RESEARCHERS
    // Admins should see everyone.
    const isExpert = me.role === "EXPERT";
    const isAdmin = me.role === "ADMIN" || me.role === "RESEARCHER";

    const { Op } = require("sequelize");

    let users;
    if (isExpert) {
      // Experts see Admins/Researchers (all groups) + peers in their group
      users = await sql.User.findAll({
        where: {
          [Op.or]: [
            { role: ["ADMIN", "RESEARCHER"] },
            { group: me.group, role: "EXPERT" }
          ],
          isActive: true
        },
        attributes: ["id", "username", "email", "role", "group"],
        order: [["username", "ASC"]]
      });
    } else {
      // Admins see everyone
      users = await sql.User.findAll({
        where: { isActive: true },
        attributes: ["id", "username", "email", "role", "group"],
        order: [["username", "ASC"]]
      });
    }

    const filtered = users.filter((u) => String(u.id) !== String(me.id));
    res.json(filtered);
  } catch (e) {
    console.error("getContacts error:", e);
    res.status(500).json({ error: "Failed to load contacts" });
  }
}

async function uploadMedia(req, res) {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileType = req.file.mimetype.startsWith("image/") ? "image" :
      req.file.mimetype.startsWith("video/") ? "video" : "document";

    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
      type: fileType,
      size: req.file.size
    });
  });
}

async function send(req, res) {
  try {
    const senderId = String(req.user.id);
    const { recipientId, content, attachments } = req.body;
    if (!recipientId || (!content && !attachments?.length)) {
      return res.status(400).json({ error: "Missing recipientId or message content" });
    }

    const conversationId = convoId(senderId, recipientId);
    const msg = await messageService.sendMessage({
      conversationId,
      senderId,
      recipientId: String(recipientId),
      content: String(content || ""),
      attachments: attachments || []
    });

    try {
      await notificationService.createNotification(
        String(recipientId),
        "message",
        "New message",
        "You received a new message.",
        { conversationId }
      );
    } catch { }

    res.status(201).json(msg);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to send message" });
  }
}

async function getConversation(req, res) {
  try {
    const userId = String(req.user.id);
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const skip = Math.max(parseInt(req.query.skip || "0", 10), 0);

    if (!String(conversationId).includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const msgs = await mongo.Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    await messageService.markAsRead(conversationId, userId);
    res.json(msgs);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to load conversation" });
  }
}

async function inbox(req, res) {
  try {
    const userId = String(req.user.id);

    const msgs = await mongo.Message.find({
      $or: [{ senderId: userId }, { recipientId: userId }]
    })
      .sort({ createdAt: -1 })
      .limit(300);

    const seen = new Map();
    for (const m of msgs) {
      if (!seen.has(m.conversationId)) {
        seen.set(m.conversationId, m);
      }
    }

    const items = Array.from(seen.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(items);
  } catch (e) {
    res.status(500).json({ error: "Failed to load inbox" });
  }
}

module.exports = {
  getContacts,
  send,
  getConversation,
  inbox,
  uploadMedia
};
