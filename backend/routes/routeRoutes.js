const express = require('express');

const router = express.Router();

const {
    getRadar,
    getRadarTileImage
} = require('../controllers/radarController');



/*
 * Radar metadata
 *
 * GET /api/radar
 */
router.get(
    '/',
    getRadar
);


/*
 * Live radar tile
 *
 * GET /api/radar/tile/:z/:x/:y
 */
router.get(
    '/tile/:z/:x/:y',
    getRadarTileImage
);


module.exports = router;
