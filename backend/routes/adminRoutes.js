const express = require('express');

const router = express.Router();

const { getAdminUsers } = require('../controllers/adminController');

const {
  authenticate
} = require('../middleware/authMiddleware');

const {
  requireRole
} = require('../middleware/roleMiddleware');


// Admin users API
router.get(
  '/users',
  authenticate,
  requireRole('AUTHORITY'),
  getAdminUsers
);

module.exports = router;