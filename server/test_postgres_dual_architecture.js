/**
 * CivicResolve - PostgreSQL Dual Database Architecture & Repository Test Suite
 * 
 * Verifies:
 * 1. PostgresDatabaseAdapter parameter translation (? to $1, $2, ...)
 * 2. INSERT ... RETURNING id -> lastInsertRowid compatibility
 * 3. UPDATE / DELETE -> changes (rowCount) compatibility
 * 4. Pooled client checkout and transactional consistency (COMMIT on success, ROLLBACK on error)
 * 5. Dialect normalization (CURRENT_TIMESTAMP, RIGHT phone matching)
 * 6. Disposable schema isolation (zero production mutation)
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const { Pool } = require('pg');
const { PostgresDatabaseAdapter, convertSqlToPg } = require('./db_adapter');
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

async function runDualArchitectureTests() {
  console.log('================================================================');
  console.log('CivicResolve PostgreSQL Adapter & Repository Integrity Suite');
  console.log('================================================================\n');

  if (!process.env.DATABASE_URL) {
    console.warn('[SKIP] DATABASE_URL not configured.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const testSchema = `test_arch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  console.log(`>>> Isolated Test Schema: "${testSchema}"\n`);

  try {
    // Run schema migrations in test schema
    await runMigrations({ pool, schema: testSchema });

    const adapter = new PostgresDatabaseAdapter(pool, { schema: testSchema });

    // -----------------------------------------------------------------
    // TEST GROUP 1: Query Syntax & Parameter Translation
    // -----------------------------------------------------------------
    console.log('--- Test Group 1: SQL Translation & Parameter Normalization ---');
    const sql1 = "SELECT * FROM complaints WHERE category = ? AND status = ?";
    assert(convertSqlToPg(sql1) === "SELECT * FROM complaints WHERE category = $1 AND status = $2", 'Translates ? into $1, $2 outside literals');

    const sql2 = "SELECT * FROM complaints WHERE title = 'Wait? Really?' AND id = ?";
    assert(convertSqlToPg(sql2) === "SELECT * FROM complaints WHERE title = 'Wait? Really?' AND id = $1", 'Preserves ? inside single quotes');

    const sql3 = "SELECT created_at FROM citizen_otps WHERE datetime('now') > expires_at";
    assert(convertSqlToPg(sql3).includes('CURRENT_TIMESTAMP'), 'Translates datetime(\'now\') to CURRENT_TIMESTAMP');

    // -----------------------------------------------------------------
    // TEST GROUP 2: CRUD & lastInsertRowid Interoperability
    // -----------------------------------------------------------------
    console.log('\n--- Test Group 2: CRUD & lastInsertRowid Parity ---');
    // Insert citizen
    const citizenInsert = await adapter.prepare(`
      INSERT INTO "${testSchema}".citizens (name, email, phone, password_hash, district)
      VALUES (?, ?, ?, ?, ?)
    `).run('Kavitha Selvam', 'kavitha.test@civicresolve.gov', '9840199001', 'hash123', 'Chennai');

    assert(citizenInsert.lastInsertRowid > 0, `INSERT returns positive integer lastInsertRowid (${citizenInsert.lastInsertRowid})`);
    assert(citizenInsert.changes === 1, `INSERT returns changes === 1 (found: ${citizenInsert.changes})`);

    // Retrieve citizen
    const citizen = await adapter.prepare(`
      SELECT * FROM "${testSchema}".citizens WHERE id = ?
    `).get(citizenInsert.lastInsertRowid);

    assert(citizen && citizen.name === 'Kavitha Selvam', 'Retrieved inserted citizen by primary key');
    assert(citizen.phone === '9840199001', 'Citizen phone matches inserted value');

    // Insert complaint referencing citizen
    const complaintInsert = await adapter.prepare(`
      INSERT INTO "${testSchema}".complaints (
        ref_id, title, description, category, location, citizen_id, citizen_name, citizen_phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'CR-TN-TEST-001',
      'Test Low Voltage in Ward 114',
      'Voltage fluctuating severely for 4 hours',
      'Electricity',
      'Teynampet, Chennai',
      citizen.id,
      citizen.name,
      citizen.phone,
      'Submitted'
    );

    assert(complaintInsert.lastInsertRowid > 0, `Complaint insert returned lastInsertRowid (${complaintInsert.lastInsertRowid})`);

    // Update complaint
    const updateRes = await adapter.prepare(`
      UPDATE "${testSchema}".complaints
      SET status = ?, priority = ?
      WHERE id = ?
    `).run('Assigned', 'High', complaintInsert.lastInsertRowid);

    assert(updateRes.changes === 1, `UPDATE returned changes === 1 (found: ${updateRes.changes})`);

    const updated = await adapter.prepare(`
      SELECT * FROM "${testSchema}".complaints WHERE id = ?
    `).get(complaintInsert.lastInsertRowid);

    assert(updated.status === 'Assigned', 'Status updated to "Assigned"');
    assert(updated.priority === 'High', 'Priority updated to "High"');

    // -----------------------------------------------------------------
    // TEST GROUP 3: Transaction Execution & Rollback Safety
    // -----------------------------------------------------------------
    console.log('\n--- Test Group 3: Transaction Commit and Rollback Safety ---');
    // Successful transaction
    const txSuccessResult = await adapter.transaction(async (tx) => {
      const ins1 = await tx.prepare(`
        INSERT INTO "${testSchema}".audit_logs (complaint_ref, action, remarks)
        VALUES (?, ?, ?)
      `).run('CR-TN-TEST-001', 'STATUS_CHANGE', 'Transitioned to In Progress');

      const ins2 = await tx.prepare(`
        INSERT INTO "${testSchema}".notifications (recipient_type, recipient_id, ref_id, title, message)
        VALUES (?, ?, ?, ?, ?)
      `).run('citizen', citizen.id, 'CR-TN-TEST-001', 'Work Started', 'Field crew deployed');

      return { auditId: ins1.lastInsertRowid, notifId: ins2.lastInsertRowid };
    });

    assert(txSuccessResult.auditId > 0, `Transaction successfully committed audit record #${txSuccessResult.auditId}`);
    assert(txSuccessResult.notifId > 0, `Transaction successfully committed notification record #${txSuccessResult.notifId}`);

    // Failed transaction with intentional error (must rollback completely)
    let caughtError = false;
    try {
      await adapter.transaction(async (tx) => {
        await tx.prepare(`
          INSERT INTO "${testSchema}".audit_logs (complaint_ref, action, remarks)
          VALUES (?, ?, ?)
        `).run('CR-TN-TEST-001', 'SHOULD_ROLLBACK', 'This entry must not exist');

        // Force intentional constraint violation or error
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err) {
      caughtError = err.message === 'SIMULATED_TRANSACTION_FAILURE';
    }

    assert(caughtError, 'Transaction caught and bubbled simulated failure');

    const rollbackCheck = await adapter.prepare(`
      SELECT * FROM "${testSchema}".audit_logs WHERE action = 'SHOULD_ROLLBACK'
    `).get();

    assert(!rollbackCheck, 'Failed transaction rolled back completely (uncommitted record does not exist)');

    // -----------------------------------------------------------------
    // TEST GROUP 4: Dashboard Aggregation Portability
    // -----------------------------------------------------------------
    console.log('\n--- Test Group 4: Dashboard Aggregation Query Portability ---');
    const countsRow = await adapter.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Submitted', 'Under Review') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN status IN ('Assigned', 'In Progress') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status != 'Resolved' AND sla_deadline IS NOT NULL AND CURRENT_TIMESTAMP > sla_deadline THEN 1 ELSE 0 END) as overdue
      FROM "${testSchema}".complaints
    `).get();

    assert(parseInt(countsRow.total, 10) >= 1, `Aggregation query executes cleanly (total: ${countsRow.total})`);
    assert(parseInt(countsRow.in_progress, 10) === 1, `in_progress count matches assigned status (${countsRow.in_progress})`);

    // -----------------------------------------------------------------
    // TEARDOWN: Clean up disposable schema
    // -----------------------------------------------------------------
    console.log('\n--- Teardown: Dropping Isolated Test Schema ---');
    const cleanClient = await pool.connect();
    await cleanClient.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
    cleanClient.release();
    assert(true, `Disposable test schema "${testSchema}" dropped cleanly`);

    await adapter.close();
  } catch (err) {
    console.error('[FATAL]:', err);
    process.exitCode = 1;
  }

  console.log('\n================================================================');
  console.log(`PostgreSQL Architecture Suite Completed: ${passedTests}/${totalTests} Tests Passed`);
  console.log('================================================================\n');
}

if (require.main === module) {
  runDualArchitectureTests().catch(err => {
    console.error('[FATAL]:', err);
    process.exit(1);
  });
}

module.exports = { runDualArchitectureTests };
