const { memoryStore, isPostgresLive, getPool } = require('../config/db');
const { broadcast } = require('./realtimeService');

async function getAllAlerts(filters = {}) {
  let list = [];
  if (isPostgresLive()) {
    const pool = getPool();
    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];
    if (filters.risk_level && filters.risk_level !== 'All') {
      params.push(filters.risk_level);
      sql += ` AND risk_level = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const res = await pool.query(sql, params);
    list = res.rows;
  } else {
    list = [...memoryStore.alerts];
    if (filters.risk_level && filters.risk_level !== 'All') {
      list = list.filter(a => a.risk_level.toLowerCase() === filters.risk_level.toLowerCase());
    }
    if (filters.status) {
      list = list.filter(a => a.status.toLowerCase() === filters.status.toLowerCase());
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return list;
}

async function createAlert(alertData, creatorUser) {
  const newAlert = {
    id: isPostgresLive() ? undefined : 'f' + Date.now().toString(16).padStart(31, '0'),
    title: alertData.title,
    type: alertData.type || 'Weather Alert',
    risk_level: alertData.risk_level || 'High',
    location: alertData.location || 'Chhatrapati Sambhajinagar',
    latitude: alertData.latitude || 19.8762,
    longitude: alertData.longitude || 75.3433,
    description: alertData.description || 'Emergency notice',
    affected_population: alertData.affected_population || 'General Public',
    status: 'Active',
    created_by: creatorUser ? creatorUser.id : null,
    created_at: new Date()
  };

  if (isPostgresLive()) {
    const pool = getPool();
    const query = `
      INSERT INTO alerts (title, type, risk_level, location, latitude, longitude, description, affected_population, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const res = await pool.query(query, [
      newAlert.title, newAlert.type, newAlert.risk_level, newAlert.location,
      newAlert.latitude, newAlert.longitude, newAlert.description,
      newAlert.affected_population, newAlert.status, newAlert.created_by
    ]);
    const created = res.rows[0];
    broadcast('new_alert', created, 'ALL');
    return created;
  } else {
    memoryStore.alerts.unshift(newAlert);
    // Also push a real-time notification
    memoryStore.notifications.unshift({
      id: 'notif_' + Date.now(),
      user_id: null,
      role_target: 'ALL',
      type: newAlert.type,
      title: `BROADCAST: ${newAlert.title}`,
      message: newAlert.description,
      risk_level: newAlert.risk_level,
      is_read: false,
      link: '/alerts.html',
      created_at: new Date()
    });

    broadcast('new_alert', newAlert, 'ALL');
    broadcast('new_notification', {
      title: `BROADCAST: ${newAlert.title}`,
      message: newAlert.description,
      risk_level: newAlert.risk_level
    }, 'ALL');

    return newAlert;
  }
}

async function updateAlertStatus(id, status) {
  if (isPostgresLive()) {
    const pool = getPool();
    const res = await pool.query('UPDATE alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
    if (res.rows.length > 0) {
      broadcast('alert_updated', res.rows[0], 'ALL');
      return res.rows[0];
    }
    return null;
  } else {
    const item = memoryStore.alerts.find(a => a.id === id);
    if (item) {
      item.status = status;
      item.updated_at = new Date();
      broadcast('alert_updated', item, 'ALL');
      return item;
    }
    return null;
  }
}

module.exports = {
  getAllAlerts,
  createAlert,
  updateAlertStatus
};
