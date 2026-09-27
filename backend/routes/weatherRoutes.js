const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

router.get('/', weatherController.getWeather);
router.get('/nowcast', weatherController.getNowcast);
router.get('/radar', weatherController.getRadar);

module.exports = router;
