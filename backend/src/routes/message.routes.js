const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const maintenance = require("../middleware/maintenance.middleware");
const messageController = require("../controllers/message.controller");

const router = express.Router();
router.use(authenticate);
router.use(maintenance);

router.get("/contacts", messageController.getContacts);
router.get("/inbox", messageController.inbox);
router.get("/conversation/:conversationId", messageController.getConversation);
router.post("/send", messageController.send);
router.post("/upload", messageController.uploadMedia);


module.exports = router;
