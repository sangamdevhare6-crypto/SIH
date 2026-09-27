const { memoryStore, isPostgresLive, getPool } = require('../config/db');

async function getAllInfrastructure(req, res, next) {
  try {
    const { type, status } = req.query;
    let list = [];

    if (isPostgresLive()) {
      const pool = getPool();
      let sql = 'SELECT * FROM infrastructure WHERE 1=1';
      const params = [];
      if (type && type !== 'All') {
        params.push(type);
        sql += ` AND type = $${params.length}`;
      }
      if (status && status !== 'All') {
        params.push(status);
        sql += ` AND status = $${params.length}`;
      }
      sql += ' ORDER BY health_score ASC';
      const r = await pool.query(sql, params);
      list = r.rows;
    } else {
      list = [...memoryStore.infrastructure];
      if (type && type !== 'All') {
        list = list.filter(i => i.type.toLowerCase() === type.toLowerCase());
      }
      if (status && status !== 'All') {
        list = list.filter(i => i.status.toLowerCase() === status.toLowerCase());
      }
    }

    return res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (err) {
    next(err);
  }
}

async function getInfrastructureById(req, res, next) {
  try {
    const { id } = req.params;
    let item = null;

    if (isPostgresLive()) {
      const pool = getPool();
      const r = await pool.query('SELECT * FROM infrastructure WHERE id = $1', [id]);
      if (r.rows.length > 0) item = r.rows[0];
    } else {
      item = memoryStore.infrastructure.find(i => i.id === id || i.name.toLowerCase().includes(id.toLowerCase()));
    }

    if (!item) {
      // Default to Jayakwadi Dam if not matched by ID
      item = memoryStore.infrastructure[0];
    }

    // Historical sensor trend data for Chart.js
    const sensorHistory = {
      labels: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', 'Now'],
      waterLevels: [461.2, 461.5, 461.9, 462.3, 462.7, 463.0, 463.2, 463.5, 463.6, 463.7, 463.75, 463.80],
      inflowRate: [22000, 24500, 28000, 34000, 41000, 45000, 47000, 48200, 49000, 48800, 48600, 48500],
      outflowDischarge: [8000, 10000, 15000, 25000, 35000, 42000, 45000, 48000, 48500, 48500, 48500, 48500]
    };

    // Documents & inspection reports
    const documents = [
      { name: 'Structural Integrity & Seismic Review 2026.pdf', size: '4.2 MB', date: 'August 14, 2026', authority: 'Central Water Commission' },
      { name: 'Spillway Gate Automation & Hydraulic Calibration.pdf', size: '2.8 MB', date: 'September 01, 2026', authority: 'Irrigation Dept MH' },
      { name: 'Emergency Action Plan (EAP) - Downstream Evacuation.pdf', size: '6.5 MB', date: 'September 20, 2026', authority: 'SDMA Command' }
    ];

    return res.json({
      success: true,
      data: {
        ...item,
        sensorHistory,
        documents
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllInfrastructure,
  getInfrastructureById
};
