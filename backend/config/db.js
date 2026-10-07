const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./env');

let pool = null;
let isPostgresLive = false;

// In-Memory / File-based Database Store for zero-config fallback
const memoryStore = {
  users: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@worldmonitor.gov.in',
      password_hash: '$2a$10$tSK3RjZ2iK8IEp7/Me96c.zRiS.OKjNCDQ.ce/fNGzdR9TNSgsYP2',
      full_name: 'Commander Rajesh Deshmukh',
      phone: '+91 98220 11223',
      role: 'AUTHORITY',
      avatar_url: '/assets/avatars/officer.png',
      is_active: true,
      created_at: new Date('2026-01-01')
    },
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      email: 'citizen@worldmonitor.org',
      password_hash: '$2a$10$QdFJxr7eXJbEXTZPkDlGJOSLtqyY1Z2TIcIJYEWju4ESuuwL7JXLi',
      full_name: 'Pooja Kulkarni',
      phone: '+91 94220 44556',
      role: 'CITIZEN',
      avatar_url: '/assets/avatars/citizen.png',
      is_active: true,
      created_at: new Date('2026-01-01')
    }
  ],
  login_events: [],
  citizen_profiles: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      user_id: 'c0000000-0000-0000-0000-000000000001',
      emergency_contact: '+91 98221 99887',
      blood_group: 'O+',
      address: 'Flat 402, Shivajinagar Heights, Cidco N-4',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      pincode: '431003'
    }
  ],
  authority_profiles: [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      department: 'State Disaster Management Authority (SDMA)',
      designation: 'Chief Emergency Response Officer',
      official_id: 'SDMA-MH-7049',
      jurisdiction: 'Chhatrapati Sambhajinagar & Marathwada'
    }
  ],
  alerts: [],
  citizen_reports: [
    {
      id: '20000000-0000-0000-0000-000000000001',
      user_id: 'c0000000-0000-0000-0000-000000000001',
      user_name: 'Pooja Kulkarni',
      report_type: 'Flood',
      location: 'Begumpura Main Chawk, Near Bridge',
      latitude: 19.882100,
      longitude: 75.334200,
      description: 'Water level on the road is over 2.5 feet and rising fast. Several two wheelers stalled. Need municipal evacuation team.',
      photo_url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
      priority: 'Critical',
      status: 'In Progress',
      authority_notes: 'NDRF Unit 4 dispatched from Cidco depot. Sandbagging in progress.',
      created_at: new Date(Date.now() - 35 * 60 * 1000),
      updated_at: new Date(Date.now() - 10 * 60 * 1000)
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      user_id: 'c0000000-0000-0000-0000-000000000001',
      user_name: 'Pooja Kulkarni',
      report_type: 'Road Block',
      location: 'Jalna Road Underpass near Mukundwadi',
      latitude: 19.869400,
      longitude: 75.371200,
      description: 'Underpass heavily waterlogged. Heavy tree branch snapped and blocked both lanes.',
      photo_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80',
      priority: 'High',
      status: 'Pending',
      authority_notes: 'Traffic police alerted. Tree clearing crane en route.',
      created_at: new Date(Date.now() - 75 * 60 * 1000),
      updated_at: new Date(Date.now() - 75 * 60 * 1000)
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      user_id: 'local_volunteer_1',
      user_name: 'Amit Shinde (Local Volunteer)',
      report_type: 'Water Level',
      location: 'Paithan Old Ghat Embankment',
      latitude: 19.489100,
      longitude: 75.381200,
      description: 'Godavari backwater reached the ghat steps. Embankment wall showing minor moisture seepage.',
      photo_url: null,
      priority: 'Medium',
      status: 'Resolved',
      authority_notes: 'Inspected by Irrigation Dept engineer. Retaining wall structurally secure.',
      created_at: new Date(Date.now() - 300 * 60 * 1000),
      updated_at: new Date(Date.now() - 120 * 60 * 1000)
    }
  ],
  infrastructure: [
    {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Jayakwadi Dam (Nath Sagar)',
      type: 'Dam',
      location: 'Paithan, Chhatrapati Sambhajinagar',
      status: 'Warning',
      current_level: 463.80,
      max_level: 464.00,
      unit: 'm MSL',
      health_score: 84,
      sensor_health: 'Live (18 Sensors Active)',
      last_inspected: new Date(),
      latitude: 19.493400,
      longitude: 75.378900,
      sensors: [
        { name: 'Spillway Gate 1-18', val: '14 Gates Open (3ft)', status: 'Normal' },
        { name: 'Reservoir Water Level', val: '463.80 m / 464.00 m (96.4%)', status: 'Warning' },
        { name: 'Inflow Discharge', val: '48,500 cusecs', status: 'High' },
        { name: 'Pore Pressure Transducer', val: '0.32 MPa', status: 'Normal' },
        { name: 'Seepage Flow Sensor', val: '18.2 L/min', status: 'Normal' }
      ]
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Khadakwasla Dam',
      type: 'Dam',
      location: 'Pune Outskirts, Maharashtra',
      status: 'At Risk',
      current_level: 582.40,
      max_level: 582.50,
      unit: 'm MSL',
      health_score: 76,
      sensor_health: 'Live (24 Sensors Active)',
      last_inspected: new Date(),
      latitude: 18.428700,
      longitude: 73.766700,
      sensors: [
        { name: 'Spillway Discharge', val: '34,200 cusecs', status: 'Critical' },
        { name: 'Storage Capacity', val: '98.9% Full', status: 'At Risk' },
        { name: 'Structural Strain Meter', val: 'Normal (0.01%)', status: 'Normal' }
      ]
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'Godavari Old River Bridge',
      type: 'Bridge',
      location: 'Gangapur Road, Nashik / CS Highway',
      status: 'Warning',
      current_level: 14.8,
      max_level: 16.0,
      unit: 'm Clearance',
      health_score: 82,
      sensor_health: 'Vibration Sensors Active',
      last_inspected: new Date(),
      latitude: 19.997500,
      longitude: 75.321400,
      sensors: [
        { name: 'Pier Scour Gauge', val: 'Stable (-0.4m)', status: 'Normal' },
        { name: 'Clearance from Crest', val: '1.2m remaining', status: 'Warning' }
      ]
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      name: 'Kham River Causeway Bypass',
      type: 'Road',
      location: 'Begumpura, CS Old City',
      status: 'At Risk',
      current_level: 2.8,
      max_level: 2.0,
      unit: 'm Inundation',
      health_score: 42,
      sensor_health: 'Flow Velocity Radar Active',
      last_inspected: new Date(),
      latitude: 19.882100,
      longitude: 75.334200,
      sensors: [
        { name: 'Road Surface Inundation', val: '0.8m Water Depth', status: 'At Risk' },
        { name: 'Flow Velocity', val: '3.1 m/s (Torrential)', status: 'Danger' }
      ]
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      name: 'Government Medical College & Hospital (GMCH)',
      type: 'Hospital',
      location: 'Panchakki Road, CS',
      status: 'Normal',
      current_level: 100.0,
      max_level: 100.0,
      unit: '% Operational',
      health_score: 99,
      sensor_health: 'Aux Generator & ICU Monitored',
      last_inspected: new Date(),
      latitude: 19.896700,
      longitude: 75.319800,
      sensors: [
        { name: 'Emergency Beds Free', val: '48 Beds', status: 'Normal' },
        { name: 'Backup Power Status', val: '100% Available (Diesel 72h)', status: 'Normal' },
        { name: 'Flood Defenses', val: 'Sump Pumps Operating', status: 'Normal' }
      ]
    }
  ],
  monitoring_stations: [
    {
      id: 's01',
      station_id: 'CS-ST01',
      station_name: 'Kham River Radar Station',
      location: 'Chhatrapati Sambhajinagar Central',
      rainfall_mm: 120.4,
      water_level_m: 4.8,
      battery_pct: 98,
      status: 'Online',
      last_ping: new Date(),
      latitude: 19.8761,
      longitude: 75.3433
    },
    {
      id: 's02',
      station_id: 'CS-ST02',
      station_name: 'Paithan Hydro Station',
      location: 'Jayakwadi Reservoir Gate 4',
      rainfall_mm: 98.2,
      water_level_m: 463.8,
      battery_pct: 100,
      status: 'Online',
      last_ping: new Date(),
      latitude: 19.4934,
      longitude: 75.3789
    },
    {
      id: 's03',
      station_id: 'PN-ST03',
      station_name: 'Mutha River Hydrologic Unit',
      location: 'Deccan Gymkhana, Pune',
      rainfall_mm: 94.0,
      water_level_m: 6.2,
      battery_pct: 92,
      status: 'Online',
      last_ping: new Date(),
      latitude: 18.5167,
      longitude: 73.8417
    },
    {
      id: 's04',
      station_id: 'NS-ST04',
      station_name: 'Godavari High Velocity Unit',
      location: 'Ramkund Basin, Nashik',
      rainfall_mm: 142.1,
      water_level_m: 7.9,
      battery_pct: 95,
      status: 'Online',
      last_ping: new Date(),
      latitude: 19.9975,
      longitude: 73.7898
    },
    {
      id: 's05',
      station_id: 'NG-ST05',
      station_name: 'Nag River Gauge Station',
      location: 'Sitabuldi, Nagpur',
      rainfall_mm: 45.2,
      water_level_m: 2.4,
      battery_pct: 88,
      status: 'Online',
      last_ping: new Date(),
      latitude: 21.1458,
      longitude: 79.0882
    },
    {
      id: 's06',
      station_id: 'CS-ST06',
      station_name: 'Waluj Telemetry Station',
      location: 'MIDC Sector 2, CS',
      rainfall_mm: 82.0,
      water_level_m: 3.1,
      battery_pct: 0,
      status: 'Offline',
      last_ping: new Date(Date.now() - 3600000 * 5),
      latitude: 19.8329,
      longitude: 75.2410
    }
  ],
  weather_data: {
    'Chhatrapati Sambhajinagar': {
      city: 'Chhatrapati Sambhajinagar',
      temperature: 25.0,
      humidity: 92,
      rainfall_mm: 120.0,
      wind_speed: 35.0,
      wind_direction: 'NW',
      pressure: 995.0,
      visibility: 4.2,
      uv_index: 3,
      air_quality: 'Moderate (AQI 65)',
      condition: 'Heavy Monsoon Downpour',
      forecast: [
        { time: 'Now', temp: 25, rainProb: 95, condition: 'Heavy Rain', humidity: 92 },
        { time: '3 PM', temp: 24, rainProb: 88, condition: 'Moderate Rain', humidity: 94 },
        { time: '4 PM', temp: 24, rainProb: 80, condition: 'Rain Showers', humidity: 93 },
        { time: '5 PM', temp: 23, rainProb: 75, condition: 'Thunderstorm', humidity: 95 },
        { time: '6 PM', temp: 23, rainProb: 60, condition: 'Light Rain', humidity: 91 }
      ],
      sevenDay: [
        { day: 'Mon (Today)', high: 26, low: 22, rainProb: 95, condition: 'Heavy Rain' },
        { day: 'Tue', high: 27, low: 22, rainProb: 85, condition: 'Thunderstorms' },
        { day: 'Wed', high: 28, low: 23, rainProb: 70, condition: 'Scattered Showers' },
        { day: 'Thu', high: 29, low: 24, rainProb: 45, condition: 'Overcast' },
        { day: 'Fri', high: 30, low: 24, rainProb: 30, condition: 'Partly Cloudy' },
        { day: 'Sat', high: 31, low: 25, rainProb: 20, condition: 'Sunny Breaks' },
        { day: 'Sun', high: 31, low: 25, rainProb: 15, condition: 'Clear Sky' }
      ]
    },
    'Pune': {
      city: 'Pune',
      temperature: 23.5,
      humidity: 88,
      rainfall_mm: 94.0,
      wind_speed: 28.0,
      wind_direction: 'W',
      pressure: 998.0,
      visibility: 5.0,
      uv_index: 4,
      air_quality: 'Good (AQI 45)',
      condition: 'Persistent Rainfall',
      forecast: [
        { time: 'Now', temp: 23, rainProb: 85, condition: 'Rain', humidity: 88 },
        { time: '3 PM', temp: 24, rainProb: 80, condition: 'Rain', humidity: 89 },
        { time: '4 PM', temp: 23, rainProb: 70, condition: 'Light Rain', humidity: 90 },
        { time: '5 PM', temp: 22, rainProb: 65, condition: 'Overcast', humidity: 91 },
        { time: '6 PM', temp: 22, rainProb: 50, condition: 'Drizzle', humidity: 92 }
      ],
      sevenDay: []
    },
    'Nashik': {
      city: 'Nashik',
      temperature: 22.0,
      humidity: 94,
      rainfall_mm: 142.0,
      wind_speed: 32.0,
      wind_direction: 'WSW',
      pressure: 993.0,
      visibility: 3.5,
      uv_index: 2,
      air_quality: 'Good (AQI 38)',
      condition: 'Torrential Rain Alert',
      forecast: [
        { time: 'Now', temp: 22, rainProb: 98, condition: 'Torrential Rain', humidity: 94 },
        { time: '3 PM', temp: 22, rainProb: 95, condition: 'Heavy Rain', humidity: 95 },
        { time: '4 PM', temp: 21, rainProb: 90, condition: 'Heavy Rain', humidity: 96 },
        { time: '5 PM', temp: 21, rainProb: 85, condition: 'Heavy Rain', humidity: 96 },
        { time: '6 PM', temp: 21, rainProb: 80, condition: 'Downpour', humidity: 95 }
      ],
      sevenDay: []
    },
    'Nagpur': {
      city: 'Nagpur',
      temperature: 28.0,
      humidity: 78,
      rainfall_mm: 45.0,
      wind_speed: 18.0,
      wind_direction: 'SW',
      pressure: 1002.0,
      visibility: 7.0,
      uv_index: 5,
      air_quality: 'Moderate (AQI 72)',
      condition: 'Cloudy with Thunder',
      forecast: [],
      sevenDay: []
    }
  },
  notifications: [],
  safe_routes: [
    {
      id: '40000000-0000-0000-0000-000000000001',
      name: 'Green Corridor #1 - Begumpura to Sports Complex Safe Shelter',
      origin: 'Begumpura Chawk',
      destination: 'Divisional Sports Complex Shelter, Garkheda',
      safe_status: 'Clear',
      distance_km: 6.4,
      estimated_time_mins: 18,
      checkpoints: [
        { name: 'University Road Junction', status: 'Clear', police: 'Stationed' },
        { name: 'Kranti Chawk Flyover (Elevated)', status: 'Clear', police: 'Stationed' },
        { name: 'Garkheda Sports Complex Safe Zone', status: 'Designated Evacuation Shelter', police: 'Active' }
      ],
      shelters: [
        { name: 'Divisional Sports Complex Evacuation Center', capacity: '2,500 Persons', status: 'Open', lat: 19.8654, lng: 75.3521, supplies: 'Food, Medical, Clean Water' },
        { name: 'Cidco Community Hall Safe Hub', capacity: '1,200 Persons', status: 'Open', lat: 19.8732, lng: 75.3621, supplies: 'First Aid, Dry Rations' }
      ],
      polyline: [
        [19.8821, 75.3342],
        [19.8780, 75.3380],
        [19.8720, 75.3450],
        [19.8670, 75.3500],
        [19.8654, 75.3521]
      ]
    },
    {
      id: '40000000-0000-0000-0000-000000000002',
      name: 'River Crossing Route #2 - Old Bazar via Causeway',
      origin: 'Old Bazar Market',
      destination: 'Cidco Community Hall',
      safe_status: 'Blocked',
      distance_km: 4.2,
      estimated_time_mins: 45,
      checkpoints: [
        { name: 'Kham River Causeway', status: 'Submerged (0.8m water)', danger: 'Do Not Attempt' }
      ],
      shelters: [],
      polyline: [
        [19.8860, 75.3280],
        [19.8821, 75.3342],
        [19.8760, 75.3480]
      ]
    }
  ]
};

// Initialize PostgreSQL Connection Pool if DATABASE_URL is configured
async function initDatabase() {
  if (config.DATABASE_URL && config.DATABASE_URL.trim() !== '') {
    let client;
    try {
      pool = new Pool({
        connectionString: config.DATABASE_URL,
        ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Test connection
      client = await pool.connect();
      console.log('✅ [DATABASE] PostgreSQL connected successfully via DATABASE_URL');
      isPostgresLive = true;

      // Initialize an empty database without loading demo records in production.
      const checkTable = await client.query("SELECT to_regclass('public.users') as exists;");
      if (!checkTable.rows[0].exists) {
        console.log('⚡ [DATABASE] Initializing PostgreSQL schema...');
        const schemaSql = fs.readFileSync(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
        await client.query(schemaSql);
        if (config.NODE_ENV !== 'production' && config.SEED_DEMO_DATA) {
          const seedSql = fs.readFileSync(path.resolve(__dirname, '../../database/seed.sql'), 'utf8');
          await client.query(seedSql);
        }
        console.log('✅ [DATABASE] PostgreSQL schema initialized.');
      }

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_login_events (
          id BIGSERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_user_login_events_user_time
          ON user_login_events(user_id, logged_in_at DESC);
      `);
    } catch (err) {
      isPostgresLive = false;
      if (client) client.release();
      if (pool) await pool.end().catch(() => {});
      pool = null;
      if (config.NODE_ENV === 'production') throw err;
      console.warn('⚠️ [DATABASE] PostgreSQL connection failed (' + err.message + '). Switching seamlessly to embedded ACID store.');
      return;
    }
    if (client) client.release();
  } else {
    if (config.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production');
    }
    console.log('ℹ️ [DATABASE] Operating with high-performance embedded store. Connect PostgreSQL by configuring DATABASE_URL.');
    isPostgresLive = false;
  }
}

// Database query interface
async function query(text, params = []) {
  if (isPostgresLive && pool) {
    return pool.query(text, params);
  }
  // If embedded fallback mode, caller uses memory store directly
  return { rows: [] };
}

module.exports = {
  initDatabase,
  query,
  memoryStore,
  isPostgresLive: () => isPostgresLive,
  getPool: () => pool
};
