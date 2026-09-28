const https = require('https');
const env = require('../config/env');

/**
 * Tomorrow.io Live Radar Tile
 *
 * Field:
 * precipitationIntensity
 *
 * The API key stays on the backend.
 */
function getRadarTile(z, x, y, time = 'now') {
    return new Promise((resolve, reject) => {

        if (
            !env.RADAR_API_KEY ||
            env.RADAR_API_KEY === 'demo_radar_key'
        ) {
            return reject(
                new Error('RADAR_API_KEY is not configured')
            );
        }

        // Tomorrow.io supports zoom 1-12
        const zoom = Math.max(
            1,
            Math.min(12, Number(z))
        );

        const tileX = Number(x);
        const tileY = Number(y);

        if (
            !Number.isInteger(tileX) ||
            !Number.isInteger(tileY)
        ) {
            return reject(
                new Error('Invalid radar tile coordinates')
            );
        }

        const radarTime =
            time === 'now'
                ? 'now'
                : encodeURIComponent(time);

        const url =
            `https://api.tomorrow.io/v4/map/tile/` +
            `${zoom}/${tileX}/${tileY}/` +
            `precipitationIntensity/` +
            `${radarTime}.png` +
            `?apikey=${encodeURIComponent(env.RADAR_API_KEY)}`;

        console.log(
            `Radar tile request: z=${zoom}, x=${tileX}, y=${tileY}`
        );

        const request = https.get(
            url,
            {
                timeout: 15000,
                headers: {
                    'Accept': 'image/png'
                }
            },
            (response) => {

                if (
                    response.statusCode < 200 ||
                    response.statusCode >= 300
                ) {
                    let errorData = '';

                    response.on(
                        'data',
                        chunk => {
                            errorData += chunk.toString();
                        }
                    );

                    response.on(
                        'end',
                        () => {
                            reject(
                                new Error(
                                    `Tomorrow.io radar error ` +
                                    `${response.statusCode}: ` +
                                    `${errorData.substring(0, 300)}`
                                )
                            );
                        }
                    );

                    return;
                }

                const chunks = [];

                response.on(
                    'data',
                    chunk => {
                        chunks.push(chunk);
                    }
                );

                response.on(
                    'end',
                    () => {
                        resolve(
                            Buffer.concat(chunks)
                        );
                    }
                );
            }
        );

        request.on(
            'timeout',
            () => {
                request.destroy();

                reject(
                    new Error(
                        'Tomorrow.io radar request timed out'
                    )
                );
            }
        );

        request.on(
            'error',
            reject
        );
    });
}


/**
 * Radar metadata
 */
function getRadarMetadata() {

    return {
        provider: 'Tomorrow.io',
        layer: 'precipitationIntensity',
        type: 'LIVE_PRECIPITATION_RADAR',
        tileFormat: 'png',
        minZoom: 1,
        maxZoom: 12,
        updatedAt: new Date().toISOString()
    };
}


module.exports = {
    getRadarTile,
    getRadarMetadata
};