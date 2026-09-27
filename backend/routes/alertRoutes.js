const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', optionalAuth, alertController.getAlerts);
router.post('/', authenticate, requireRole('AUTHORITY'), alertController.postAlert);
router.patch('/:id', authenticate, requireRole('AUTHORITY'), alertController.patchAlert);

module.exports = router;
