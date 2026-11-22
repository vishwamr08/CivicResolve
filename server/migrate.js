/**
 * CivicResolve PostgreSQL Migration Runner
 * 
 * Safely executes versioned SQL migrations in deterministic order.
 * Tracks executed migrations in schema_migrations table.
 * Idempotent, transaction-safe, and supports custom schemas for test isolation.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const { Pool } = require('pg');

async function runMigrations(options = {}) {
  let pool = options.pool;
  let ownsPool = false;

  if (!pool) {
    const dbUrl = options.databaseUrl || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('[MIGRATION ERROR]: No DATABASE_URL configured for PostgreSQL migrations.');
    }
    pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.PG_SSL_DISABLE === 'true' ? false : { rejectUnauthorized: false }
    });
    ownsPool = true;
  }

  const schema = options.schema || 'public';
  const migrationsDir = options.migrationsDir || path.join(__dirname, 'migrations');

  const client = await pool.connect();
  try {
    if (schema !== 'public') {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
      await client.query(`SET search_path TO "${schema}", public;`);
    }

    // 1. Ensure schema_migrations exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch already executed migrations
    const executedRes = await client.query('SELECT version FROM schema_migrations ORDER BY id ASC;');
    const executedVersions = new Set(executedRes.rows.map(r => r.version));

    // 3. Read migration files from directory
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`[MIGRATIONS]: Directory "${migrationsDir}" not found.`);
      return { executed: [], total: 0 };
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const newlyExecuted = [];

    for (const file of files) {
      if (executedVersions.has(file)) {
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[MIGRATION]: Executing ${file}...`);
      await client.query('BEGIN;');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [file]);
        await client.query('COMMIT;');
        newlyExecuted.push(file);
        console.log(`[MIGRATION]: Successfully applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK;');
        console.error(`[MIGRATION ERROR]: Failed while applying ${file}:`, err.message);
        throw err;
      }
    }

    if (newlyExecuted.length === 0) {
      console.log('[MIGRATION]: Schema is already up to date. Zero pending migrations.');
    } else {
      console.log(`[MIGRATION]: Successfully applied ${newlyExecuted.length} migration(s).`);
    }

    return { executed: newlyExecuted, total: files.length };
  } finally {
    client.release();
    if (ownsPool) {
      await pool.end();
    }
  }
}

// Allow direct CLI execution
if (require.main === module) {
  runMigrations()
    .then(res => {
      console.log(`[MIGRATION COMPLETE]: Total migrations: ${res.total}, newly applied: ${res.executed.length}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('[MIGRATION FATAL]:', err.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
