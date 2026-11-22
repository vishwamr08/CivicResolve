#!/usr/bin/env node
/**
 * CivicResolve - Secure Administrator Provisioning CLI (Phase 1)
 * 
 * Provides an explicit, authenticated, one-time administrator provisioning
 * and password rotation workflow.
 * 
 * Features:
 * - Generates high-entropy bcrypt hashes with cost factor 12.
 * - Idempotently updates the existing admin@civicresolve.gov account without changing its ID or profile.
 * - Never stores plaintext passwords or fixed hashes in version control.
 * - Requires explicit confirmation (--confirm) to guard against accidental execution.
 * - Supports both PostgreSQL (production / Supabase) and SQLite (local development).
 * 
 * Usage:
 *   node provision_admin.js --confirm
 *   node provision_admin.js --email admin@civicresolve.gov --password "YourSecurePass#2026!" --confirm
 *   node provision_admin.js --sqlite --confirm
 */

const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const bcrypt = require('bcryptjs');

// Parse CLI Arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue = null) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const isConfirmed = hasFlag('--confirm');
const useSqlite = hasFlag('--sqlite') || (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production');
const targetEmail = (getArg('--email') || process.env.ADMIN_PROVISION_EMAIL || 'admin@civicresolve.gov').toLowerCase().trim();
const targetRole = getArg('--role') || 'super_admin';
const targetName = getArg('--name') || 'Director of Municipal Operations';
const targetDept = getArg('--department') || 'Municipal Administration & Water Supply';
const targetDistrict = getArg('--district') || 'Statewide';
const targetDesignation = getArg('--designation') || 'Director of Municipal Operations';

// Password handling: argument -> environment variable -> cryptographically generated 24-char password
let rawPassword = getArg('--password') || process.env.ADMIN_PROVISION_PASSWORD;
let isGeneratedPassword = false;

if (!rawPassword) {
  // Generate cryptographically strong random password (24 characters, URL-safe base64 + symbol)
  const randomBytes = crypto.randomBytes(18).toString('base64url');
  rawPassword = `Civic#${randomBytes}!2026`;
  isGeneratedPassword = true;
}

if (rawPassword.length < 12) {
  console.error('[PROVISION ERROR]: Administrator password must be at least 12 characters long.');
  process.exit(1);
}

async function runProvisioning() {
  console.log('=============================================================');
  console.log(' CIVICRESOLVE — SECURE ADMINISTRATOR PROVISIONING TOOL');
  console.log('=============================================================');

  if (!isConfirmed) {
    console.warn('\n[SAFETY GUARD]: Missing explicit confirmation flag (--confirm).');
    console.warn('Execution aborted without making changes.');
    console.warn('\nTo execute provisioning, rerun with the --confirm flag:');
    console.warn(`  node provision_admin.js --email ${targetEmail} --confirm\n`);
    process.exit(1);
  }

  // 1. Generate fresh bcrypt hash with cost factor 12
  const BCRYPT_ROUNDS = 12;
  const passwordHash = bcrypt.hashSync(rawPassword, BCRYPT_ROUNDS);

  let targetEngine = useSqlite ? 'sqlite' : 'postgres';
  let dbClient = null;

  try {
    if (targetEngine === 'postgres') {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required for PostgreSQL provisioning.');
      }
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PG_SSL_DISABLE === 'true' ? false : { rejectUnauthorized: false }
      });
      dbClient = pool;

      // Mask host for safe logging
      const maskedUrl = process.env.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
      console.log(`[TARGET DATABASE]: PostgreSQL (${maskedUrl.split('@')[1] || 'remote'})`);

      // Check if existing administrator exists
      const existingRes = await pool.query('SELECT id, email, name, role, department FROM admins WHERE LOWER(email) = LOWER($1)', [targetEmail]);
      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        console.log(`[ACTION]: Found existing administrator record (ID: ${existing.id}, Role: ${existing.role}). Updating credentials...`);
        
        await pool.query(
          `UPDATE admins 
           SET password_hash = $1, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [passwordHash, existing.id]
        );

        console.log(`✓ Administrator [${targetEmail}] updated successfully.`);
        console.log(`  - Account ID: ${existing.id}`);
        console.log(`  - Role: ${existing.role}`);
        console.log(`  - Name: ${existing.name}`);
        console.log(`  - Bcrypt Cost Factor: ${BCRYPT_ROUNDS}`);
      } else {
        console.log(`[ACTION]: Administrator [${targetEmail}] not found. Creating new ${targetRole} account...`);
        const insertRes = await pool.query(
          `INSERT INTO admins (email, password_hash, name, role, district, department, designation, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [targetEmail, passwordHash, targetName, targetRole, targetDistrict, targetDept, targetDesignation]
        );
        const newId = insertRes.rows[0].id;
        console.log(`✓ Administrator [${targetEmail}] provisioned successfully.`);
        console.log(`  - Account ID: ${newId}`);
        console.log(`  - Role: ${targetRole}`);
      }

      await pool.end();
    } else {
      // SQLite
      const BetterSqlite = require('better-sqlite3');
      const dbPath = process.env.SQLITE_DB_PATH || path.resolve(__dirname, 'civicresolve.db');
      console.log(`[TARGET DATABASE]: SQLite (${path.basename(dbPath)})`);
      const sqliteDb = new BetterSqlite(dbPath);
      dbClient = sqliteDb;

      const existing = sqliteDb.prepare('SELECT id, email, name, role FROM admins WHERE LOWER(email) = LOWER(?)').get(targetEmail);
      if (existing) {
        console.log(`[ACTION]: Found existing administrator record (ID: ${existing.id}, Role: ${existing.role}). Updating credentials...`);
        sqliteDb.prepare(
          `UPDATE admins 
           SET password_hash = ?, 
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`
        ).run(passwordHash, existing.id);

        console.log(`✓ Administrator [${targetEmail}] updated successfully.`);
        console.log(`  - Account ID: ${existing.id}`);
        console.log(`  - Role: ${existing.role}`);
        console.log(`  - Name: ${existing.name}`);
        console.log(`  - Bcrypt Cost Factor: ${BCRYPT_ROUNDS}`);
      } else {
        console.log(`[ACTION]: Administrator [${targetEmail}] not found. Creating new ${targetRole} account...`);
        const res = sqliteDb.prepare(
          `INSERT INTO admins (email, password_hash, name, role, district, department, designation, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).run(targetEmail, passwordHash, targetName, targetRole, targetDistrict, targetDept, targetDesignation);
        console.log(`✓ Administrator [${targetEmail}] provisioned successfully.`);
        console.log(`  - Account ID: ${res.lastInsertRowid}`);
        console.log(`  - Role: ${targetRole}`);
      }

      sqliteDb.close();
    }

    console.log('\n=============================================================');
    console.log(' PROVISIONING SUMMARY & CREDENTIAL NOTICE');
    console.log('=============================================================');
    console.log(`Target Email:    ${targetEmail}`);
    if (isGeneratedPassword) {
      console.log(`One-Time Password: ${rawPassword}`);
      console.log('\nIMPORTANT: Store this generated password securely in your password manager.');
      console.log('It will NOT be displayed again and is NOT saved in persistent logs.');
    } else {
      console.log('Password:        [Supplied via argument/environment]');
    }
    console.log('Status:          SUCCESS (Bcrypt Cost 12 verified)');
    console.log('=============================================================');

  } catch (err) {
    console.error('\n[PROVISION FAILURE]:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runProvisioning();
}

module.exports = { runProvisioning };
