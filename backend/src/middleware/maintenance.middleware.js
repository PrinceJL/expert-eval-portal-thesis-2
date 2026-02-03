const { sql } = require("../models");

// Very small in-memory cache (avoid DB hit on every request)
let _cache = { at: 0, global: null };

async function getGlobalMaintenance() {
  const now = Date.now();
  if (_cache.global && now - _cache.at < 5000) return _cache.global;

  // Lazy-load model (may not exist in older DB)
  const PageMaintenance = sql.PageMaintenance;
  if (!PageMaintenance) {
    _cache = { at: now, global: { isUnderMaintenance: false, maintenanceMessage: "" } };
    return _cache.global;
  }

  const [row] = await PageMaintenance.findOrCreate({
    where: { pageName: "GLOBAL" },
    defaults: { isUnderMaintenance: false, maintenanceMessage: "" }
  });

  _cache = { at: now, global: row };
  return row;
}

/**
 * Global maintenance guard:
 * - If GLOBAL maintenance is enabled, only ADMIN/RESEARCHER can access protected routes.
 * - Public status endpoint (/system/maintenance) still works.
 */
module.exports = async function maintenanceMiddleware(req, res, next) {
  try {
    const openPaths = [
      "/system/maintenance",
      "/auth/login",
      "/auth/logout"
    ];

    if (openPaths.some((p) => req.path.startsWith(p))) return next();

    const global = await getGlobalMaintenance();
    if (!global?.isUnderMaintenance) return next();

    const role = req?.user?.role;
    const isPrivileged = role === "ADMIN" || role === "RESEARCHER";

    // If user isn't authenticated yet, just return maintenance info.
    if (!role || !isPrivileged) {
      return res.status(503).json({
        error: "Service Unavailable",
        maintenance: true,
        message: global.maintenanceMessage || "System is under maintenance. Please try again later."
      });
    }

    return next();
  } catch (e) {
    // Never break the app because maintenance check failed.
    return next();
  }
};
