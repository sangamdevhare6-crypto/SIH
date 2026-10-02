const { memoryStore, isPostgresLive, getPool } = require('../config/db');

async function getAdminUsers(req, res, next) {
  try {
    // PostgreSQL connected hai
    if (isPostgresLive()) {
      const pool = getPool();

      // User statistics
      const stats = await pool.query(`
        SELECT
          COUNT(DISTINCT users.id)::int AS total_users,
          COUNT(DISTINCT users.id) FILTER (WHERE users.is_active = true)::int AS active_users,
          COUNT(DISTINCT users.id) FILTER (WHERE users.role = 'CITIZEN')::int AS citizens,
          COUNT(DISTINCT users.id) FILTER (WHERE users.role = 'AUTHORITY')::int AS authorities,
          COUNT(DISTINCT user_login_events.user_id)::int AS logged_in_users,
          COUNT(user_login_events.id)::int AS total_logins
        FROM users
        LEFT JOIN user_login_events ON user_login_events.user_id = users.id
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
          created_at,
          (SELECT COUNT(*)::int FROM user_login_events events WHERE events.user_id = users.id) AS login_count,
          (SELECT MAX(events.logged_in_at) FROM user_login_events events WHERE events.user_id = users.id) AS last_login_at
        FROM users
        ORDER BY users.created_at DESC
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
    const loginEvents = memoryStore.login_events || [];

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
      ).length,

      logged_in_users: new Set(loginEvents.map(event => event.user_id)).size,

      total_logins: loginEvents.length
    };

    return res.json({
      success: true,
      stats,

      // Password kabhi frontend ko mat bhejna
      users: users
        .slice(0, 100)
        .map(({ password_hash, ...user }) => {
          const userLogins = loginEvents
            .filter(event => event.user_id === user.id)
            .sort((a, b) => new Date(b.logged_in_at) - new Date(a.logged_in_at));

          return {
            ...user,
            login_count: userLogins.length,
            last_login_at: userLogins[0]?.logged_in_at || null
          };
        })
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminUsers
};