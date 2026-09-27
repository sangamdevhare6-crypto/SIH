const { memoryStore, isPostgresLive, getPool } = require('../config/db');

async function getNotifications(req, res, next) {
  try {
    const user = req.user;
    let notifs = [];

    if (isPostgresLive()) {
      const pool = getPool();
      let sql = 'SELECT * FROM notifications WHERE 1=1';
      const params = [];

      if (user) {
        params.push(user.id);
        params.push(user.role);
        sql += ` AND (user_id = $1 OR role_target = 'ALL' OR role_target = $2)`;
      } else {
        sql += ` AND role_target = 'ALL'`;
      }

      sql += ' ORDER BY created_at DESC LIMIT 30';
      const r = await pool.query(sql, params);
      notifs = r.rows;
    } else {
      notifs = memoryStore.notifications.filter(n => {
        if (!user) return n.role_target === 'ALL';
        return n.role_target === 'ALL' || n.user_id === user.id || n.role_target === user.role;
      });
      notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const unreadCount = notifs.filter(n => !n.is_read).length;

    return res.json({
      success: true,
      unreadCount,
      totalCount: notifs.length,
      data: notifs
    });
  } catch (err) {
    next(err);
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params;

    if (isPostgresLive()) {
      const pool = getPool();
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    } else {
      const n = memoryStore.notifications.find(item => item.id === id);
      if (n) n.is_read = true;
    }

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsAsRead(req, res, next) {
  try {
    const user = req.user;

    if (isPostgresLive()) {
      const pool = getPool();
      if (user) {
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR role_target = 'ALL' OR role_target = $2", [user.id, user.role]);
      } else {
        await pool.query("UPDATE notifications SET is_read = TRUE WHERE role_target = 'ALL'");
      }
    } else {
      memoryStore.notifications.forEach(n => {
        if (!user || n.role_target === 'ALL' || n.user_id === user.id || n.role_target === user.role) {
          n.is_read = true;
        }
      });
    }

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
