const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const RADAR_METADATA_CACHE_MS = 2 * 60 * 1000;
const MAX_RADAR_ZOOM = 7;

let cachedRadarFrame = null;
let radarFrameCacheExpiresAt = 0;
let radarFrameRequest = null;

async function getLatestRadarFrame() {
  if (cachedRadarFrame && Date.now() < radarFrameCacheExpiresAt) {
    return cachedRadarFrame;
  }

  if (!radarFrameRequest) {
    radarFrameRequest = (async () => {
      const response = await fetch(RAINVIEWER_API_URL, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`RainViewer metadata request failed (${response.status})`);
      }

      const metadata = await response.json();
      const frames = metadata?.radar?.past;
      const latestFrame = Array.isArray(frames) ? frames[frames.length - 1] : null;

      if (!metadata?.host || !latestFrame?.path) {
        throw new Error('RainViewer returned no radar frames');
      }

      cachedRadarFrame = {
        host: metadata.host,
        path: latestFrame.path
      };
      radarFrameCacheExpiresAt = Date.now() + RADAR_METADATA_CACHE_MS;

      return cachedRadarFrame;
    })();
  }

  try {
    return await radarFrameRequest;
  } finally {
    radarFrameRequest = null;
  }
}

async function getRadarTile(z, x, y) {
  const zoom = Number(z);
  const tileX = Number(x);
  const tileY = Number(y);

  if (
    !Number.isInteger(zoom) ||
    !Number.isInteger(tileX) ||
    !Number.isInteger(tileY) ||
    zoom < 0 ||
    zoom > MAX_RADAR_ZOOM ||
    tileX < 0 ||
    tileY < 0 ||
    tileX >= 2 ** zoom ||
    tileY >= 2 ** zoom
  ) {
    throw new Error('Invalid radar tile coordinates');
  }

  const frame = await getLatestRadarFrame();
  const tileUrl = `${frame.host}${frame.path}/256/${zoom}/${tileX}/${tileY}/2/1_1.png`;
  const response = await fetch(tileUrl, {
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 200);
    throw new Error(`RainViewer tile request failed (${response.status}): ${details}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function getRadarMetadata() {
  return {
    provider: 'RainViewer',
    layer: 'radar reflectivity',
    type: 'LIVE_PRECIPITATION_RADAR',
    tileFormat: 'png',
    minZoom: 0,
    maxZoom: MAX_RADAR_ZOOM,
    updateIntervalMinutes: 10
  };
}

module.exports = {
  getRadarTile,
  getRadarMetadata
};