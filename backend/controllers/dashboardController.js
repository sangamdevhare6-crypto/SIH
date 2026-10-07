const { memoryStore, isPostgresLive, getPool } = require('../config/db');
const { getLiveWeather } = require('../services/weatherService');
const { getAllAlerts } = require('../services/alertService');

async function getDashboardData(req, res, next) {
  try {
    const city = req.query.city || 'Chhatrapati Sambhajinagar';
    
    // 1. Get Live Weather & Telemetry
    let weather;
    try {
      weather = await getLiveWeather(city);
    } catch (weatherErr) {
      console.warn(`[DASHBOARD] Live weather unavailable for ${city} (${weatherErr.message}), using safe fallback.`);
      weather = {
        city: city,
        temperature: 28,
        rainfall_mm: 14.2,
        humidity: 76,
        wind_speed: 15.0,
        pressure: 1012,
        condition: 'Scattered Clouds',
        air_quality: 'Good (AQI 45)'
      };
    }

    // 2. Alerts & Active Warnings
    const allAlerts = await getAllAlerts();
    const activeWarnings = allAlerts.filter(a => a.status === 'Active');
    const recentAlerts = allAlerts.slice(0, 5);

    // 3. High Risk Areas
    const highRiskAreas = [
      { name: 'Kham River Catchment', risk: 'Very High', alert: '120mm Flash Flood Threat', evacStatus: 'Advisory Active' },
      { name: 'Paithan Downstream Belt', risk: 'High', alert: 'Jayakwadi 48,500 Cusec Release', evacStatus: 'Alerted' },
      { name: 'Daulatabad Ghat Corridor', risk: 'Moderate', alert: 'Slope Soil Saturation', evacStatus: 'Monitoring' },
      { name: 'Begumpura Old Sector', risk: 'Very High', alert: 'Submerged Roadways', evacStatus: 'NDRF Deployed' }
    ];

    // 4. Infrastructure Overview
    let infraSummary = { total: 5, normal: 2, warning: 2, at_risk: 1 };
    let stationsSummary = { total: 6, online: 5, offline: 1 };

    // 5. Reports Summary
    let totalReports = memoryStore.citizen_reports.length;
    let pendingReports = memoryStore.citizen_reports.filter(r => r.status === 'Pending').length;
    let inProgressReports = memoryStore.citizen_reports.filter(r => r.status === 'In Progress').length;
    let resolvedReports = memoryStore.citizen_reports.filter(r => r.status === 'Resolved').length;

    if (isPostgresLive()) {
      const pool = getPool();
      const rRep = await pool.query('SELECT status, count(*) FROM citizen_reports GROUP BY status');
      rRep.rows.forEach(r => {
        if (r.status === 'Pending') pendingReports = parseInt(r.count);
        if (r.status === 'In Progress') inProgressReports = parseInt(r.count);
        if (r.status === 'Resolved') resolvedReports = parseInt(r.count);
      });
      totalReports = pendingReports + inProgressReports + resolvedReports;
    }

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      location: city,
      systemStatus: 'OPERATIONAL • HIGH MONSOON ALERT',
      kpis: {
        rainfall_mm: weather.rainfall_mm,
        temperature: weather.temperature,
        humidity: weather.humidity,
        wind_speed: weather.wind_speed,
        pressure: weather.pressure,
        condition: weather.condition,
        air_quality: weather.air_quality,
        protected_percentage: 94.2
      },
      weather,
      recentAlerts,
      activeWarningsCount: activeWarnings.length,
      highRiskAreas,
      reports: {
        total: totalReports,
        pending: pendingReports,
        inProgress: inProgressReports,
        resolved: resolvedReports
      },
      infrastructure: infraSummary,
      stations: stationsSummary,
      userRole: req.user ? req.user.role : 'GUEST'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardData
};
