const {
    getRadarTile,
    getRadarMetadata
} = require('../services/radarService');


/**
 * Radar metadata
 */
function getRadar(req, res, next) {

    try {

        const data = getRadarMetadata();

        return res.json({
            success: true,
            data
        });

    } catch (error) {

        next(error);

    }
}


/**
 * Radar tile proxy
 *
 * Browser:
 * /api/weather/radar/tile/6/34/23
 *
 * Backend:
 * RainViewer
 */
async function getRadarTileImage(req, res, next) {

    try {

        const {
            z,
            x,
            y
        } = req.params;

        const tile = await getRadarTile(z, x, y);

        res.setHeader(
            'Content-Type',
            'image/png'
        );

        // Allow browser caching for a short time
        res.setHeader(
            'Cache-Control',
            'public, max-age=60'
        );

        return res.send(tile);

    } catch (error) {

        console.error(
            'Radar tile error:',
            error.message
        );

        next(error);

    }
}


module.exports = {
    getRadar,
    getRadarTileImage
};