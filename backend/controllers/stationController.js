const { memoryStore, isPostgresLive, getPool } = require('../config/db');

async function getStations(req, res, next) {
  try {
    let stations = [];
    if (isPostgresLive()) {
      const pool = getPool();
      const r = await pool.query('SELECT * FROM monitoring_stations ORDER BY station_id ASC');
      stations = r.rows;
    } else {
      stations = [...memoryStore.monitoring_stations];
    }

    return res.json({
      success: true,
      count: stations.length,
      onlineCount: stations.filter(s => s.status === 'Online').length,
      offlineCount: stations.filter(s => s.status === 'Offline').length,
      data: stations
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStations
};
