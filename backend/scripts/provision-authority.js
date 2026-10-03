const readline = require('readline');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { hashPassword } = require('../utils/hash');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ADMIN_EMAIL: String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
};

function prompt(label, secret = false) {
  if (!process.stdin.isTTY) {
    return Promise.reject(new Error('Run this command from an interactive terminal'));
  }

  return new Promise((resolve, reject) => {
    const input = process.stdin;
    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    process.stdout.write(label);
    let value = '';

    function cleanup() {
      input.off('keypress', onKeypress);
      input.setRawMode(false);
      process.stdout.write('\n');
    }

    function onKeypress(character, key) {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Cancelled'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value.trim());
        return;
      }
      if (key.name === 'backspace') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      if (character && character.length === 1 && !key.ctrl && !key.meta) {
        value += character;
        process.stdout.write(secret ? '*' : character);
      }
    }

    input.on('keypress', onKeypress);
    input.resume();
  });
}

async function provisionAuthority() {
  if (config.NODE_ENV === 'production' && !config.ADMIN_EMAIL) {
    throw new Error('ADMIN_EMAIL is required in production');
  }

  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const fullName = await prompt('Full name: ');
  const email = (await prompt('Email: ')).toLowerCase();
  const phone = await prompt('Phone (optional): ');
  const department = await prompt('Department: ');
  const designation = await prompt('Designation: ');
  const officialId = await prompt('Official ID: ');
  const password = await prompt('Initial password (min 12 characters): ', true);

  if (config.NODE_ENV === 'production' && email !== config.ADMIN_EMAIL) {
    throw new Error('Authority email must match the configured ADMIN_EMAIL');
  }

  if (!fullName || !email || !department || !designation || password.length < 12) {
    throw new Error('Name, email, department, designation, and a 12-character password are required');
  }

  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existingAdmin = await client.query(
        'SELECT id FROM users WHERE LOWER(email) = $1',
        [email]
      );

      if (existingAdmin.rows.length > 0) {
        throw new Error('The configured admin account already exists; provisioning is one-time');
      }

      const passwordHash = await hashPassword(password);
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role)
         VALUES ($1, $2, $3, $4, 'AUTHORITY')
         RETURNING id`,
        [email, passwordHash, fullName, phone]
      );
      await client.query(
        `INSERT INTO authority_profiles (user_id, department, designation, official_id)
         VALUES ($1, $2, $3, $4)`,
        [userResult.rows[0].id, department, designation, officialId || null]
      );
      await client.query('COMMIT');
      console.log(`Authority account created for ${email}.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

provisionAuthority().catch((error) => {
  console.error(`Authority provisioning failed: ${error.message}`);
  process.exitCode = 1;
});