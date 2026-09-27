const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Citizen incident reports
router.get('/', optionalAuth, reportController.getCitizenReports);
router.post('/', authenticate, reportController.submitCitizenReport);
router.patch('/:id', authenticate, requireRole('AUTHORITY'), reportController.updateCitizenReport);

// Analytical reports dossier
router.get('/analytics', reportController.getAnalyticsReports);
router.get('/download/:id', reportController.downloadReportData);

module.exports = router;
