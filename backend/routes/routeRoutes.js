const express = require('express');
const routeController = require('../controllers/routeController');

const router = express.Router();

router.get('/', routeController.getRoutes);
router.post('/find', routeController.findSafeRoute);
router.get('/flood-map', routeController.getFloodMapData);

module.exports = router;
