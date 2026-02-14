const { sql, mongo } = require("../models");
const messageService = require("../services/message.service");
const notificationService = require("../services/notification.service");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");

function convoId(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

function normalizeAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments)) return [];

  const allowedTypes = new Set(["image", "video", "document"]);
  return rawAttachments
    .filter((att) => att && typeof att === "object")
    .map((att) => {
      const type = String(att.type || "").toLowerCase();
      const safeType = allowedTypes.has(type) ? type : "document";
      const url = String(att.url || "").trim();
      const filename = String(att.filename || "").trim();
      const size = Number(att.size);
      return {
        type: safeType,
        url,
        filename,
        size: Number.isFinite(size) && size > 0 ? size : 0
      };
    })
    .filter((att) => att.url && att.filename)
    .slice(0, 5);
}

async function canMessageRecipient(me, recipientId) {
  const where = {
    id: String(recipientId),
    isActive: true
  };

  if (String(me?.role || "").toUpperCase() === "EXPERT") {
    where[Op.or] = [
      { role: { [Op.in]: ["ADMIN", "RESEARCHER"] } },
      { role: "EXPERT", group: me.group }
    ];
  }

  const recipient = await sql.User.findOne({
    where,
    attributes: ["id", "role", "group", "isActive"]
  });
  return Boolean(recipient);
}

const ONLINE_WINDOW_MS = Number(process.env.ONLINE_WINDOW_MS || 2 * 60 * 1000);
const IDLE_DURATION_MS = Number(process.env.IDLE_DURATION_MS || 5 * 60 * 1000);
const OFFLINE_WINDOW_MS = Number(process.env.OFFLINE_WINDOW_MS || ONLINE_WINDOW_MS + IDLE_DURATION_MS);
const VALID_PRESENCE_STATUSES = new Set(["auto", "online", "idle", "dnd", "invisible"]);

function computePresence(lastActiveAt) {
  if (!lastActiveAt) return { isOnline: false, presenceStatus: "offline" };

  const ts = new Date(lastActiveAt).getTime();
  if (!Number.isFinite(ts)) return { isOnline: false, presenceStatus: "offline" };

  const deltaMs = Date.now() - ts;
  if (deltaMs <= ONLINE_WINDOW_MS) {
    return { isOnline: true, presenceStatus: "online" };
  }
  if (deltaMs <= OFFLINE_WINDOW_MS) {
    return { isOnline: false, presenceStatus: "idle" };
  }
  return { isOnline: false, presenceStatus: "offline" };
}

function normalizePresenceStatus(value) {
  const s = String(value || "").toLowerCase();
  return VALID_PRESENCE_STATUSES.has(s) ? s : "auto";
}

function applyPresenceOverride(autoPresence, overrideStatus) {
  const status = normalizePresenceStatus(overrideStatus);
  // "online"/"idle" act like auto so presence can move automatically.
  if (status === "auto" || status === "online" || status === "idle") return autoPresence;
  if (status === "dnd") return { isOnline: true, presenceStatus: "dnd" };
  if (status === "invisible") return { isOnline: false, presenceStatus: "invisible" };
  return autoPresence;
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads/");
    if (process.env.NODE_ENV !== "production" && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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

    // Customers (EXPERTS) should be able to see all ADMINS and RESEARCHERS
    // Admins should see everyone.
    const isExpert = me.role === "EXPERT";

    let users;
    if (isExpert) {
      // Experts see Admins/Researchers (all groups) + peers in their group
      users = await sql.User.findAll({
        where: {
          [Op.or]: [
            { role: { [Op.in]: ["ADMIN", "RESEARCHER"] } },
            { group: me.group, role: "EXPERT" }
          ],
          isActive: true
        },
        attributes: ["id", "username", "email", "role", "group", "lastActiveAt"],
        order: [["username", "ASC"]]
      });
    } else {
      // Admins see everyone
      users = await sql.User.findAll({
        where: { isActive: true },
        attributes: ["id", "username", "email", "role", "group", "lastActiveAt"],
        order: [["username", "ASC"]]
      });
    }

    const filteredUsers = users.filter((u) => String(u.id) !== String(me.id));
    const userIds = filteredUsers.map((u) => String(u.id));

    const presenceByUserId = new Map();
    if (userIds.length) {
      const sessions = await mongo.SessionCache.find(
        { userId: { $in: userIds } },
        { userId: 1, presenceStatus: 1, updatedAt: 1 }
      ).sort({ updatedAt: -1 });

      for (const s of sessions) {
        const uid = String(s.userId || "");
        if (!uid || presenceByUserId.has(uid)) continue;
        presenceByUserId.set(uid, normalizePresenceStatus(s.presenceStatus));
      }
    }

    const filtered = filteredUsers.map((u) => {
      const data = u.toJSON ? u.toJSON() : u;
      const autoPresence = computePresence(data.lastActiveAt);
      const overrideStatus = presenceByUserId.get(String(data.id));
      const presence = applyPresenceOverride(autoPresence, overrideStatus);
      return {
        ...data,
        ...presence
      };
    });
    res.json(filtered);
  } catch (e) {
    console.error("getContacts error:", e);
    res.status(500).json({ error: "Failed to load contacts" });
  }
}

async function uploadMedia(req, res) {
  upload(req, res, (err) => {
    if (err) {
      if (process.env.NODE_ENV === "production") {
        return res.status(400).json({
          error: "Media uploads are disabled in production due to Vercel read-only filesystem. Please contact admin."
        });
      }
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
    const recipientId = String(req.body?.recipientId || "").trim();
    const content = String(req.body?.content || "").trim();
    const attachments = normalizeAttachments(req.body?.attachments);

    if (!recipientId || (!content && !attachments.length)) {
      return res.status(400).json({ error: "Missing recipientId or message content" });
    }
    if (recipientId === senderId) {
      return res.status(400).json({ error: "Cannot send a message to yourself" });
    }

    const recipientAllowed = await canMessageRecipient(req.user, recipientId);
    if (!recipientAllowed) {
      return res.status(403).json({ error: "You are not allowed to message this user" });
    }

    const conversationId = convoId(senderId, recipientId);
    const msg = await messageService.sendMessage({
      conversationId,
      senderId,
      recipientId,
      content,
      attachments
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

    // Restrict reads to messages where requester is an actual participant.
    const msgs = await mongo.Message.find({
      conversationId: String(conversationId),
      $or: [{ senderId: userId }, { recipientId: userId }]
    })
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
