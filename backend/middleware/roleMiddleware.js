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

module.exports = {
  requireRole
};
