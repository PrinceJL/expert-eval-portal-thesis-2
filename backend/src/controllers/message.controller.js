const { sql, mongo } = require("../models");
const messageService = require("../services/message.service");
const notificationService = require("../services/notification.service");

function convoId(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

async function getContacts(req, res) {
  try {
    const me = req.user;
    const where = { isActive: true };
    // If group is present, keep contacts within same group (practical default)
    if (me?.group) where.group = me.group;

    const users = await sql.User.findAll({
      where,
      attributes: ["id", "username", "email", "role", "group"],
      order: [["username", "ASC"]]
    });

    const filtered = users.filter((u) => String(u.id) !== String(me.id));
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: "Failed to load contacts" });
  }
}

async function send(req, res) {
  try {
    const senderId = String(req.user.id);
    const { recipientId, content } = req.body;
    if (!recipientId || !content) {
      return res.status(400).json({ error: "Missing recipientId/content" });
    }

    const conversationId = convoId(senderId, recipientId);
    const msg = await messageService.sendMessage({
      conversationId,
      senderId,
      recipientId: String(recipientId),
      content: String(content)
    });

    try {
      await notificationService.createNotification(
        String(recipientId),
        "message",
        "New message",
        "You received a new message.",
        { conversationId }
      );
    } catch {}

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

    // Ownership: conversationId must include userId
    if (!String(conversationId).includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const msgs = await mongo.Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // Mark as read (recipient side)
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
  inbox
};
