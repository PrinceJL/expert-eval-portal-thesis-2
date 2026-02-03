/**
 * Simple RBAC guard.
 * Usage: router.use(authenticate, requireRole(["ADMIN","RESEARCHER"]))
 */
function requireRole(allowedRoles = []) {
  const allowed = new Set(allowedRoles);

  return (req, res, next) => {
    const role = req?.user?.role;
    if (!role) return res.status(401).json({ error: "Access denied." });
    if (!allowed.has(role)) return res.status(403).json({ error: "Forbidden." });
    return next();
  };
}

module.exports = requireRole;
