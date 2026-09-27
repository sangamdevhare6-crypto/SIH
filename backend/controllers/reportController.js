const { memoryStore, isPostgresLive, getPool } = require('../config/db');
const { broadcast } = require('../services/realtimeService');

// 1. Get Incident Reports (Role-filtered)
async function getCitizenReports(req, res, next) {
  try {
    const user = req.user;
    const { status, type, priority } = req.query;

    let reports = [];

    if (isPostgresLive()) {
      const pool = getPool();
      let sql = 'SELECT * FROM citizen_reports WHERE 1=1';
      const params = [];

      // If citizen, only view own reports
      if (user && user.role === 'CITIZEN') {
        params.push(user.id);
        sql += ` AND user_id = $${params.length}`;
      }

      if (status && status !== 'All') {
        params.push(status);
        sql += ` AND status = $${params.length}`;
      }
      if (type && type !== 'All') {
        params.push(type);
        sql += ` AND report_type = $${params.length}`;
      }
      if (priority && priority !== 'All') {
        params.push(priority);
        sql += ` AND priority = $${params.length}`;
      }

      sql += ' ORDER BY created_at DESC';
      const result = await pool.query(sql, params);
      reports = result.rows;
    } else {
      reports = [...memoryStore.citizen_reports];

      // If citizen, only view own reports
      if (user && user.role === 'CITIZEN') {
        reports = reports.filter(r => r.user_id === user.id);
      }

      if (status && status !== 'All') {
        reports = reports.filter(r => r.status.toLowerCase() === status.toLowerCase());
      }
      if (type && type !== 'All') {
        reports = reports.filter(r => r.report_type.toLowerCase() === type.toLowerCase());
      }
      if (priority && priority !== 'All') {
        reports = reports.filter(r => r.priority.toLowerCase() === priority.toLowerCase());
      }

      reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    next(err);
  }
}

// 2. Submit New Incident Report (Citizen / Volunteer)
async function submitCitizenReport(req, res, next) {
  try {
    const { report_type, location, description, photo_url, priority, latitude, longitude } = req.body;
    const user = req.user;

    if (!report_type || !location || !description) {
      return res.status(400).json({ success: false, error: 'Report type, location, and description are required' });
    }

    const newReport = {
      id: isPostgresLive() ? undefined : '20' + Date.now().toString(16).padStart(30, '0'),
      user_id: user ? user.id : null,
      user_name: user ? user.full_name : 'Anonymous Citizen',
      report_type,
      location,
      latitude: latitude ? parseFloat(latitude) : 19.8762,
      longitude: longitude ? parseFloat(longitude) : 75.3433,
      description,
      photo_url: photo_url || null,
      priority: priority || 'Medium',
      status: 'Pending',
      authority_notes: null,
      created_at: new Date()
    };

    if (isPostgresLive()) {
      const pool = getPool();
      const insertSql = `
        INSERT INTO citizen_reports (user_id, user_name, report_type, location, latitude, longitude, description, photo_url, priority, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;
      const result = await pool.query(insertSql, [
        newReport.user_id, newReport.user_name, newReport.report_type,
        newReport.location, newReport.latitude, newReport.longitude,
        newReport.description, newReport.photo_url, newReport.priority, newReport.status
      ]);
      const created = result.rows[0];

      // Broadcast to Authorities
      broadcast('citizen_report_submitted', created, 'AUTHORITY');
      return res.status(201).json({
        success: true,
        message: 'Incident report submitted successfully. Emergency response team notified.',
        data: created
      });
    } else {
      memoryStore.citizen_reports.unshift(newReport);

      // Add a notification for authorities
      memoryStore.notifications.unshift({
        id: 'notif_' + Date.now(),
        user_id: null,
        role_target: 'AUTHORITY',
        type: 'Citizen report update',
        title: `NEW CITIZEN REPORT: ${newReport.report_type} at ${newReport.location}`,
        message: `${newReport.description} (Priority: ${newReport.priority})`,
        risk_level: newReport.priority === 'Critical' ? 'Very High' : 'High',
        is_read: false,
        link: '/citizen-reports.html',
        created_at: new Date()
      });

      broadcast('citizen_report_submitted', newReport, 'AUTHORITY');
      return res.status(201).json({
        success: true,
        message: 'Incident report submitted successfully. Emergency response team notified.',
        data: newReport
      });
    }
  } catch (err) {
    next(err);
  }
}

// 3. Update Report Status & Authority Notes (Authority Only)
async function updateCitizenReport(req, res, next) {
  try {
    const { id } = req.params;
    const { status, authority_notes } = req.body;

    if (status && !['Pending', 'In Progress', 'Resolved', 'Dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    if (isPostgresLive()) {
      const pool = getPool();
      const result = await pool.query(
        `UPDATE citizen_reports 
         SET status = COALESCE($1, status), authority_notes = COALESCE($2, authority_notes), updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 RETURNING *`,
        [status, authority_notes, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      const updated = result.rows[0];
      broadcast('citizen_report_updated', updated, 'ALL');
      return res.json({ success: true, message: 'Report status updated', data: updated });
    } else {
      const rep = memoryStore.citizen_reports.find(r => r.id === id);
      if (!rep) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      if (status) rep.status = status;
      if (authority_notes) rep.authority_notes = authority_notes;
      rep.updated_at = new Date();

      // If report belongs to citizen, notify them
      if (rep.user_id) {
        memoryStore.notifications.unshift({
          id: 'notif_' + Date.now(),
          user_id: rep.user_id,
          role_target: 'CITIZEN',
          type: 'Citizen report update',
          title: `Report Status Updated: ${rep.report_type} (${rep.status})`,
          message: authority_notes ? `Note from Authority: ${authority_notes}` : `Status changed to ${rep.status}`,
          risk_level: 'Moderate',
          is_read: false,
          link: '/citizen-reports.html',
          created_at: new Date()
        });
      }

      broadcast('citizen_report_updated', rep, 'ALL');
      return res.json({ success: true, message: 'Report status updated', data: rep });
    }
  } catch (err) {
    next(err);
  }
}

// 4. Generate Analytic Reports (Daily, Weekly, Monthly)
function getAnalyticsReports(req, res) {
  const timeframe = req.query.timeframe || 'All';
  const reportsList = [
    {
      id: 'rep_01',
      title: 'Daily Weather & Precipitation Dossier',
      period: 'Today (24 Hours)',
      timeframe: 'Daily',
      category: 'Daily Weather Report',
      format: 'PDF / CSV',
      status: 'Ready',
      summary: '120.4 mm accumulated precipitation in Kham River catchment. 3 convective cloudburst cells tracked.',
      generatedAt: new Date().toISOString()
    },
    {
      id: 'rep_02',
      title: 'Regional Flood Risk Hydrological Analysis',
      period: 'Week 39, 2026',
      timeframe: 'Weekly',
      category: 'Flood Risk Analysis',
      format: 'PDF / GeoJSON',
      status: 'Ready',
      summary: 'Godavari, Krishna, Narmada water level benchmarks. Jayakwadi Dam 96.4% storage threshold report.',
      generatedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'rep_03',
      title: 'Critical Infrastructure Health Audit',
      period: 'September 2026',
      timeframe: 'Monthly',
      category: 'Infrastructure Report',
      format: 'PDF / CSV',
      status: 'Ready',
      summary: 'Sensor telemetry across 5 major installations (Dams, Bridges, Roads, Emergency Hospitals).',
      generatedAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 'rep_04',
      title: 'Emergency Alerts & Siren Broadcast Summary',
      period: 'September 2026',
      timeframe: 'Weekly',
      category: 'Alert Summary',
      format: 'CSV',
      status: 'Ready',
      summary: 'Complete audit log of 5 high-priority warnings, affected populations, and response dispatch times.',
      generatedAt: new Date(Date.now() - 250000000).toISOString()
    },
    {
      id: 'rep_05',
      title: 'Automated Telemetry Rain Gauge Log',
      period: 'Daily Real-time',
      timeframe: 'Daily',
      category: 'Rainfall Data',
      format: 'CSV / Excel',
      status: 'Ready',
      summary: 'Minute-by-minute rainfall measurements from 6 regional sensor stations in Maharashtra.',
      generatedAt: new Date().toISOString()
    },
    {
      id: 'rep_06',
      title: 'System Operations & Command Telemetry Log',
      period: 'System Lifecycle',
      timeframe: 'Monthly',
      category: 'System Log',
      format: 'CSV',
      status: 'Ready',
      summary: 'Server-Sent Events connections, database queries, sensor ping rates, and user access records.',
      generatedAt: new Date().toISOString()
    }
  ];

  let filtered = reportsList;
  if (timeframe !== 'All') {
    filtered = reportsList.filter(r => r.timeframe.toLowerCase() === timeframe.toLowerCase());
  }

  return res.json({
    success: true,
    count: filtered.length,
    data: filtered
  });
}

// 5. Download Report Data (CSV Export)
function downloadReportData(req, res) {
  const { id } = req.params;
  const reportsList = {
    'rep_01': {
      filename: 'WorldMonitor_Daily_Weather_Precipitation.csv',
      data: 'Timestamp,Station,Rainfall_mm,Temperature_C,Humidity_Pct,Wind_Speed_kmh,Condition\n' +
            '2026-09-28 00:00,CS-ST01 Kham River,120.4,25.0,92,35,Heavy Monsoon\n' +
            '2026-09-28 00:00,CS-ST02 Paithan,98.2,25.5,90,30,Persistent Rain\n' +
            '2026-09-28 00:00,PN-ST03 Pune,94.0,23.5,88,28,Rain Showers\n' +
            '2026-09-28 00:00,NS-ST04 Nashik,142.1,22.0,94,32,Torrential Downpour'
    },
    'rep_02': {
      filename: 'WorldMonitor_Flood_Risk_Analysis.csv',
      data: 'River,Current_Level_m,Danger_Mark_m,Discharge_cusecs,Risk_Level,Trend\n' +
            'Godavari,463.8,464.0,48500,Very High,Rising\n' +
            'Krishna,538.2,540.0,32100,Moderate,Stable\n' +
            'Narmada,138.4,138.68,65000,High,Rising\n' +
            'Brahmaputra,105.7,106.0,185000,Very High,Surging'
    },
    'rep_03': {
      filename: 'WorldMonitor_Infrastructure_Health.csv',
      data: 'Name,Type,Location,Status,Level,Max,Health_Score\n' +
            'Jayakwadi Dam,Dam,Paithan,Warning,463.8,464.0,84%\n' +
            'Khadakwasla Dam,Dam,Pune,At Risk,582.4,582.5,76%\n' +
            'Godavari Bridge,Bridge,Nashik,Warning,14.8,16.0,82%\n' +
            'Kham River Causeway,Road,CS Old City,At Risk,2.8,2.0,42%\n' +
            'GMCH Hospital,Hospital,CS,Normal,100,100,99%'
    },
    'rep_04': {
      filename: 'WorldMonitor_Alerts_Summary.csv',
      data: 'Title,Type,Risk_Level,Location,Affected_Population,Status\n' +
            'Flash Flood Red Warning,Flash Flood,Very High,Kham River Basin,~45000 citizens,Active\n' +
            'Extreme Precipitation Downpour,Heavy Rainfall,High,Marathwada Central,~120000 citizens,Active\n' +
            'Godavari River Surge Level 2,River Level,High,Paithan Corridor,~60000 citizens,Active'
    }
  };

  const selected = reportsList[id] || reportsList['rep_01'];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${selected.filename}"`);
  return res.send(selected.data);
}

module.exports = {
  getCitizenReports,
  submitCitizenReport,
  updateCitizenReport,
  getAnalyticsReports,
  downloadReportData
};
