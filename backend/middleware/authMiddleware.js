const { verifyToken } = require('../utils/jwt');
const { memoryStore, isPostgresLive, getPool } = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired token'
      });
    }

    // Attach user
    if (isPostgresLive()) {
      const pool = getPool();
      const userRes = await pool.query('SELECT id, email, full_name, phone, role, avatar_url FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'User no longer exists' });
      }
      req.user = userRes.rows[0];
    } else {
      const user = memoryStore.users.find(u => u.id === decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, error: 'User no longer exists' });
      }
      req.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url
      };
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      details: err.message
    });
  }
}

// Optional auth for public routes that enhance UX if logged in
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded) {
        if (isPostgresLive()) {
          const pool = getPool();
          const userRes = await pool.query('SELECT id, email, full_name, role FROM users WHERE id = $1', [decoded.id]);
          if (userRes.rows.length > 0) req.user = userRes.rows[0];
        } else {
          const user = memoryStore.users.find(u => u.id === decoded.id);
          if (user) req.user = { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
        }
      }
    }
  } catch (e) {
    // Ignore error in optional auth
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuth
};
