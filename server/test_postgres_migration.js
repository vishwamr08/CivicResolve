/**
 * CivicResolve - PostgreSQL Schema Migration Test Suite
 * 
 * Verifies versioned SQL migrations against Supabase PostgreSQL:
 * 1. Creates a disposable isolated test schema.
 * 2. Runs all migration scripts (001, 002, 003).
 * 3. Asserts all tables, columns, indexes, and constraints exist.
 * 4. Verifies idempotent re-execution (zero errors on second run).
 * 5. Drops the disposable test schema completely.
 * 
 * Safe: Never touches public tables or production data.
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const { Pool } = require('pg');
const { runMigrations } = require('./migrate');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runPostgresMigrationTests() {
  console.log('================================================================');
  console.log('CivicResolve PostgreSQL Migration & Schema Integrity Test Suite');
  console.log('================================================================\n');

  if (!process.env.DATABASE_URL) {
    console.warn('[SKIP] DATABASE_URL not configured. Skipping PostgreSQL tests.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const testSchema = `test_pg_mig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  console.log(`>>> Isolated Test Schema: "${testSchema}"\n`);

  try {
    // -----------------------------------------------------------------
    // TEST GROUP 1: Migration Execution
    // -----------------------------------------------------------------
    console.log('--- Test Group 1: Versioned Migration Execution ---');
    const migResult = await runMigrations({
      pool,
      schema: testSchema,
      migrationsDir: path.join(__dirname, 'migrations')
    });

    assert(migResult.total >= 3, `Discovered at least 3 migration files (found: ${migResult.total})`);
    assert(migResult.executed.length >= 3, `Executed all pending migrations (executed: ${migResult.executed.length})`);
    assert(migResult.executed.includes('001_initial_schema.sql'), 'Executed 001_initial_schema.sql');
    assert(migResult.executed.includes('002_indexes_and_constraints.sql'), 'Executed 002_indexes_and_constraints.sql');
    assert(migResult.executed.includes('003_seed_master_admin_and_announcements.sql'), 'Executed 003_seed_master_admin_and_announcements.sql');

    // -----------------------------------------------------------------
    // TEST GROUP 2: Table Existence & Schema Verification
    // -----------------------------------------------------------------
    console.log('\n--- Test Group 2: Table Existence & Schema Verification ---');
    const client = await pool.connect();
    try {
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        ORDER BY table_name;
      `, [testSchema]);

      const tableNames = new Set(tablesRes.rows.map(r => r.table_name));
      const expectedTables = [
        'admins',
        'citizens',
        'complaints',
        'citizen_otps',
        'audit_logs',
        'announcements',
        'notifications',
        'notification_logs',
        'revoked_tokens',
        'schema_migrations'
      ];

      for (const t of expectedTables) {
        assert(tableNames.has(t), `Table "${t}" exists in PostgreSQL schema`);
      }

      // Check complaints column types
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = 'complaints'
      `, [testSchema]);
      const colMap = new Map(colsRes.rows.map(r => [r.column_name, r.data_type]));

      assert(colMap.has('ref_id'), 'complaints has ref_id column');
      assert(colMap.has('title'), 'complaints has title column');
      assert(colMap.has('description'), 'complaints has description column');
      assert(colMap.has('latitude'), 'complaints has latitude column');
      assert(colMap.has('longitude'), 'complaints has longitude column');
      assert(colMap.has('sla_deadline'), 'complaints has sla_deadline column');
      assert(colMap.has('is_gps_verified'), 'complaints has is_gps_verified column');
      assert(colMap.get('created_at') === 'timestamp with time zone', 'created_at is timestamp with time zone (TIMESTAMPTZ)');

      // -----------------------------------------------------------------
      // TEST GROUP 3: Constraints & Performance Indexes
      // -----------------------------------------------------------------
      console.log('\n--- Test Group 3: Indexes & Constraints Verification ---');
      const idxRes = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = $1;
      `, [testSchema]);
      const indexNames = new Set(idxRes.rows.map(r => r.indexname));

      const expectedIndexes = [
        'idx_citizens_phone_unique',
        'idx_citizens_email_unique',
        'idx_complaints_ref_id',
        'idx_complaints_status',
        'idx_complaints_created_at',
        'idx_complaints_category',
        'idx_complaints_citizen_id',
        'idx_complaints_citizen_phone',
        'idx_complaints_district',
        'idx_citizen_otps_phone',
        'idx_announcements_active'
      ];

      for (const idx of expectedIndexes) {
        assert(indexNames.has(idx), `Performance index "${idx}" created successfully`);
      }

      // -----------------------------------------------------------------
      // TEST GROUP 4: Idempotency & Seeder Verification
      // -----------------------------------------------------------------
      console.log('\n--- Test Group 4: Idempotent Re-execution & Seed Verification ---');
      // Re-running migrations should report 0 pending migrations without error
      const rerunResult = await runMigrations({
        pool,
        schema: testSchema,
        migrationsDir: path.join(__dirname, 'migrations')
      });
      assert(rerunResult.executed.length === 0, 'Idempotent re-run executes 0 migrations (schema unchanged)');

      // Verify master admin seeded
      const adminRes = await client.query(`SELECT email, role FROM "${testSchema}".admins WHERE email = 'admin@civicresolve.gov';`);
      assert(adminRes.rows.length === 1, 'Master admin "admin@civicresolve.gov" seeded');
      assert(adminRes.rows[0].role === 'super_admin', 'Master admin has role "super_admin"');

      // Verify announcements seeded
      const annRes = await client.query(`SELECT count(*) as count FROM "${testSchema}".announcements;`);
      assert(parseInt(annRes.rows[0].count, 10) === 3, 'Default municipal announcements seeded (3 announcements)');

    } finally {
      // -----------------------------------------------------------------
      // TEARDOWN: Clean up disposable test schema
      // -----------------------------------------------------------------
      console.log('\n--- Test Teardown: Disposable Schema Cleanup ---');
      await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
      assert(true, `Disposable test schema "${testSchema}" dropped cleanly`);
      client.release();
    }
  } finally {
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`PostgreSQL Migration Suite Completed: ${passedTests}/${totalTests} Tests Passed`);
  console.log('================================================================\n');
}

if (require.main === module) {
  runPostgresMigrationTests().catch(err => {
    console.error('[FATAL]:', err);
    process.exit(1);
  });
}

module.exports = { runPostgresMigrationTests };
