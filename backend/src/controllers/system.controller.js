const { sql } = require("../models");

async function getMaintenance(req, res) {
  try {
    const PageMaintenance = sql.PageMaintenance;
    if (!PageMaintenance) {
      return res.json({ global: { isUnderMaintenance: false, maintenanceMessage: "" }, pages: [] });
    }

    const [global] = await PageMaintenance.findOrCreate({
      where: { pageName: "GLOBAL" },
      defaults: { isUnderMaintenance: false, maintenanceMessage: "" }
    });

    const pages = await PageMaintenance.findAll({ order: [["pageName", "ASC"]] });
    return res.json({ global, pages });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch maintenance status" });
  }
}

module.exports = { getMaintenance };
