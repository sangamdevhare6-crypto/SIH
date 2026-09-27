const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

router.get('/', routeController.getRoutes);
router.post('/find', routeController.findSafeRoute);
router.get('/flood-map', routeController.getFloodMapData);

module.exports = router;
