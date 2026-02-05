const express = require("express");
const systemController = require("../controllers/system.controller");

const router = express.Router();

// Public endpoint used by frontend to show a 503 / maintenance page
router.get("/maintenance", systemController.getMaintenance);

module.exports = router;
