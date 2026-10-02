const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL ||
  (NODE_ENV === 'production' ? '' : 'admin@worldmonitor.gov.in')
).trim().toLowerCase();
const requiredProductionVariables = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN', 'ADMIN_EMAIL'];
const missingProductionVariables = requiredProductionVariables.filter(
  (name) => !process.env[name]
);

if (NODE_ENV === 'production' && missingProductionVariables.length > 0) {
  throw new Error(`Missing required production environment variables: ${missingProductionVariables.join(', ')}`);
}

if (NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production');
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV,
  ADMIN_EMAIL,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'local-development-only-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || 'demo_weather_key',
  CORS_ORIGIN: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  SEED_DEMO_DATA: process.env.SEED_DEMO_DATA === 'true'
};
