const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, notificationController.getNotifications);
router.patch('/:id/read', notificationController.markNotificationAsRead);
router.post('/read-all', optionalAuth, notificationController.markAllNotificationsAsRead);

module.exports = router;
