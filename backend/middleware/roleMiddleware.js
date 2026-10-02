const config = require('../config/env');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required'
      });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const upperAllowed = allowedRoles.map(r => r.toUpperCase());

    if (!upperAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Requires role [${allowedRoles.join(', ')}]. Current role: ${userRole}`
      });
    }

    next();
  };
}

function requireConfiguredAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required'
    });
  }

  const userEmail = String(req.user.email || '').trim().toLowerCase();
  const userRole = String(req.user.role || '').trim().toUpperCase();

  if (
    userRole !== 'AUTHORITY' ||
    !config.ADMIN_EMAIL ||
    userEmail !== config.ADMIN_EMAIL
  ) {
    return res.status(403).json({
      success: false,
      error: 'Admin dashboard access is restricted to the configured admin account'
    });
  }

  next();
}

module.exports = {
  requireRole,
  requireConfiguredAdmin
};
