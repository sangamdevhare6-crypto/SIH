const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const radarController = require('../controllers/radarController');

router.get('/', weatherController.getWeather);
router.get('/nowcast', weatherController.getNowcast);
router.get('/radar', weatherController.getRadar);
router.get('/radar/tile/:z/:x/:y', radarController.getRadarTileImage);

module.exports = router;
