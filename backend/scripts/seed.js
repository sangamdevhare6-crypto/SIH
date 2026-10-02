const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/env');

async function runSeed() {
  console.log('🌱 Starting database seed script...');

  if (config.NODE_ENV === 'production') {
    console.error('Refusing to run demo seed in production; seed.sql truncates application tables.');
    process.exit(1);
  }

  if (!config.DATABASE_URL) {
    console.log('ℹ️ No DATABASE_URL provided. Embedded memory store is already seeded by default.');
    process.exit(0);
  }

  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.resolve(__dirname, '../../database/seed.sql'), 'utf8');

    console.log('⚡ Executing schema.sql...');
    await client.query(schemaSql);

    console.log('⚡ Executing seed.sql...');
    await client.query(seedSql);

    console.log('🎉 Database seeded successfully!');
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database seeding failed:', err.message);
    process.exit(1);
  }
}

runSeed();
