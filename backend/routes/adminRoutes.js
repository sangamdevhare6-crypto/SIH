const express = require('express');

const router = express.Router();

const { getAdminUsers } = require('../controllers/adminController');

const {
  authenticate
} = require('../middleware/authMiddleware');

const { requireConfiguredAdmin } = require('../middleware/roleMiddleware');


// Admin users API
router.get(
  '/users',
  authenticate,
  requireConfiguredAdmin,
  getAdminUsers
);

module.exports = router;