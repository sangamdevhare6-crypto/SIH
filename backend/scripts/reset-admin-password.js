/**
 * ============================================================
 * WORLD MONITOR — Admin Password Reset Script
 * ============================================================
 * Render Shell mein chalane ke liye:
 *   npm run reset:admin
 *
 * Ye script sirf ADMIN_EMAIL wale account ka password reset
 * karta hai. Database mein seedha bcrypt hash update hota hai.
 * ============================================================
 */

const readline = require('readline');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { hashPassword } = require('../utils/hash');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL || '';

// ---- Prompt helper (password masked with *) ----
function prompt(label, secret = false) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    if (secret && process.stdin.isTTY) {
      process.stdout.write(label);
      process.stdin.setRawMode(true);
      let value = '';
      readline.emitKeypressEvents(process.stdin);

      function onKey(ch, key) {
        if (!key) return;
        if (key.ctrl && key.name === 'c') {
          process.stdout.write('\n');
          process.exit(0);
        }
        if (key.name === 'return' || key.name === 'enter') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('keypress', onKey);
          process.stdout.write('\n');
          rl.close();
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
        if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
          value += ch;
          process.stdout.write('*');
        }
      }
      process.stdin.on('keypress', onKey);
      process.stdin.resume();
    } else {
      rl.question(label, answer => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function resetAdminPassword() {
  console.log('\n========================================');
  console.log('  WORLD MONITOR — Admin Password Reset');
  console.log('========================================\n');

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable set nahi hai.');
    console.error('   Render Shell mein yeh automatically available hota hai.\n');
    process.exit(1);
  }

  if (!ADMIN_EMAIL) {
    console.error('❌ ADMIN_EMAIL environment variable set nahi hai.');
    process.exit(1);
  }

  console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
  console.log('🔑 Naya password set karne ke liye:\n');

  const newPassword = await prompt('Naya Password (min 12 characters): ', true);
  const confirmPassword = await prompt('Password Confirm Karen:           ', true);

  if (newPassword !== confirmPassword) {
    console.error('\n❌ Passwords match nahi karte. Script band ho raha hai.');
    process.exit(1);
  }

  if (newPassword.length < 12) {
    console.error('\n❌ Password kam se kam 12 characters ka hona chahiye.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    try {
      // Check account exists
      const checkRes = await client.query(
        'SELECT id, email, role FROM users WHERE LOWER(email) = $1',
        [ADMIN_EMAIL]
      );

      if (checkRes.rows.length === 0) {
        console.error(`\n❌ "${ADMIN_EMAIL}" email wala account database mein nahi mila.`);
        console.error('   Pehle "npm run provision:authority" chalao account banane ke liye.\n');
        process.exit(1);
      }

      const user = checkRes.rows[0];
      if (user.role !== 'AUTHORITY') {
        console.error(`\n❌ Yeh account AUTHORITY role ka nahi hai (current: ${user.role}).\n`);
        process.exit(1);
      }

      // Hash and update
      console.log('\n⏳ Password hash generate ho raha hai...');
      const newHash = await hashPassword(newPassword);

      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newHash, user.id]
      );

      console.log('\n✅ Password successfully reset ho gaya!');
      console.log(`   Email:    ${ADMIN_EMAIL}`);
      console.log('   Password: (jo aapne abhi enter kiya)');
      console.log('\n📌 Ab is password se login karo:');
      console.log('   https://YOUR-SITE.onrender.com/admin.html\n');

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('\n❌ Database error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
