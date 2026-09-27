// Radar telemetry data generator and layer coordinates

function getRadarMetadata() {
  const now = Date.now();
  // Generate 5 continuous historical/current radar frame timestamps
  const frames = [];
  for (let i = 4; i >= 0; i--) {
    const t = new Date(now - i * 10 * 60 * 1000);
    frames.push({
      id: `frame_${5 - i}`,
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: t.toISOString(),
      label: i === 0 ? 'Live (+0m)' : `-${i * 10}m`
    });
  }

  return {
    center: [19.8762, 75.3433], // Chhatrapati Sambhajinagar
    zoom: 9,
    timestamp: new Date().toISOString(),
    radarStatus: 'SWEEPING ACTIVE - 3.2 GHz S-Band Doppler',
    frames,
    intensityScale: [
      { level: 'Light', color: '#00F5FF', dbz: '15 - 30 dBZ', desc: '0.1 - 2.5 mm/hr' },
      { level: 'Moderate', color: '#00FFA3', dbz: '30 - 45 dBZ', desc: '2.5 - 10 mm/hr' },
      { level: 'Heavy', color: '#FFB020', dbz: '45 - 55 dBZ', desc: '10 - 50 mm/hr' },
      { level: 'Extreme', color: '#FF3366', dbz: '55+ dBZ', desc: '> 50 mm/hr (Severe Cloudburst)' }
    ],
    stormCells: [
      {
        id: 'cell_kham_01',
        name: 'Kham Basin Mesocyclone Cell',
        lat: 19.8762,
        lng: 75.3433,
        radius: 12000,
        intensity: 'Extreme',
        dbz: 58.4,
        speed: '28 km/h',
        direction: 'East-Southeast',
        lightningRate: '42 strikes/min'
      },
      {
        id: 'cell_paithan_02',
        name: 'Paithan Reservoir Squall Line',
        lat: 19.4934,
        lng: 75.3789,
        radius: 16000,
        intensity: 'Heavy',
        dbz: 49.2,
        speed: '34 km/h',
        direction: 'Northeast',
        lightningRate: '18 strikes/min'
      },
      {
        id: 'cell_nashik_03',
        name: 'Western Ghats Orographic Plume',
        lat: 19.9975,
        lng: 73.7898,
        radius: 22000,
        intensity: 'Extreme',
        dbz: 61.0,
        speed: '22 km/h',
        direction: 'East',
        lightningRate: '65 strikes/min'
      }
    ],
    lightningStrikes: [
      { lat: 19.8821, lng: 75.3342, ageSec: 14, polarity: '-CG (28kA)' },
      { lat: 19.8654, lng: 75.3521, ageSec: 32, polarity: '-CG (41kA)' },
      { lat: 19.4891, lng: 75.3812, ageSec: 5, polarity: '+CG (64kA)' },
      { lat: 19.8329, lng: 75.2410, ageSec: 21, polarity: '-CG (35kA)' },
      { lat: 19.9123, lng: 75.3981, ageSec: 48, polarity: '-IC (19kA)' }
    ]
  };
}

module.exports = {
  getRadarMetadata
};
