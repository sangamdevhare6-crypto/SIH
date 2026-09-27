const { getAllAlerts, createAlert, updateAlertStatus } = require('../services/alertService');

async function getAlerts(req, res, next) {
  try {
    const { risk_level, status } = req.query;
    const alerts = await getAllAlerts({ risk_level, status });
    return res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (err) {
    next(err);
  }
}

async function postAlert(req, res, next) {
  try {
    const { title, type, risk_level, location, description, affected_population, latitude, longitude } = req.body;
    if (!title || !type || !risk_level || !location) {
      return res.status(400).json({ success: false, error: 'Title, type, risk level, and location are required' });
    }

    const created = await createAlert({
      title,
      type,
      risk_level,
      location,
      description,
      affected_population,
      latitude,
      longitude
    }, req.user);

    return res.status(201).json({
      success: true,
      message: 'Emergency alert broadcasted successfully',
      data: created
    });
  } catch (err) {
    next(err);
  }
}

async function patchAlert(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Monitoring', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be Active, Monitoring, or Resolved' });
    }

    const updated = await updateAlertStatus(id, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    return res.json({
      success: true,
      message: `Alert updated to ${status}`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAlerts,
  postAlert,
  patchAlert
};
