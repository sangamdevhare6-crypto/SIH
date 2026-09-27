const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'world_monitor_super_secure_jwt_secret_key_2026_!@#',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || 'demo_weather_key',
  MAP_API_KEY: process.env.MAP_API_KEY || 'demo_map_key',
  RADAR_API_KEY: process.env.RADAR_API_KEY || 'demo_radar_key',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
