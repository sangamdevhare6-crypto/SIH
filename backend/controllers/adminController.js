const { memoryStore, isPostgresLive, getPool } = require('../config/db');

async function getAdminUsers(req, res, next) {
  try {
    // PostgreSQL connected hai
    if (isPostgresLive()) {
      const pool = getPool();

      // User statistics
      const stats = await pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE is_active = true)::int AS active_users,
          COUNT(*) FILTER (WHERE role = 'CITIZEN')::int AS citizens,
          COUNT(*) FILTER (WHERE role = 'AUTHORITY')::int AS authorities
        FROM users
      `);

      // Latest registered users
      const users = await pool.query(`
        SELECT
          id,
          full_name,
          email,
          phone,
          role,
          is_active,
          created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 100
      `);

      return res.json({
        success: true,
        stats: stats.rows[0],
        users: users.rows
      });
    }

    // PostgreSQL available nahi hai
    // Memory store se users lenge
    const users = [...memoryStore.users].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const stats = {
      total_users: users.length,

      active_users: users.filter(
        user => user.is_active !== false
      ).length,

      citizens: users.filter(
        user => String(user.role).toUpperCase() === 'CITIZEN'
      ).length,

      authorities: users.filter(
        user => String(user.role).toUpperCase() === 'AUTHORITY'
      ).length
    };

    return res.json({
      success: true,
      stats,

      // Password kabhi frontend ko mat bhejna
      users: users
        .slice(0, 100)
        .map(({ password_hash, ...user }) => user)
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminUsers
};