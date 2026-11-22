/**
 * CivicResolve - Secure Administrator Provisioning Security Test Suite
 * 
 * Verifies all 13 security controls for server/provision_admin.js:
 * 1. Missing DATABASE_URL rejection.
 * 2. SQLite mode rejection (CLI flags, database URLs, env vars).
 * 3. Missing admin account rejection (with rollback).
 * 4. Duplicate admin account rejection (with rollback).
 * 5. Incorrect role rejection (with rollback).
 * 6. Password mismatch rejection.
 * 7. Weak password rejection across all complexity rules.
 * 8. Non-interactive execution rejection (TTY enforcement).
 * 9. Incorrect confirmation phrase rejection.
 * 10. Successful update with bcrypt verification and COMMIT.
 * 11. Existing ID and role preservation.
 * 12. No account creation (no INSERT statements).
 * 13. Transaction rollback on error.
 * 14. TLS certificate verification (rejectUnauthorized: true).
 * 15. Zero credential leakage in output/logs.
 * 
 * Uses synthetic mocks and memory streams only. Does NOT connect to production.
 */

const { Writable, PassThrough } = require('node:stream');
const bcrypt = require('bcryptjs');
const {
  TARGET_ADMIN_EMAIL,
  REQUIRED_ROLE,
  REQUIRED_CONFIRMATION_PHRASE,
  BCRYPT_ROUNDS,
  validatePasswordComplexity,
  validateCliArguments,
  validateDatabaseUrl,
  promptMaskedPassword,
  promptConfirmationPhrase,
  createPgClient,
  provisionAdmin
} = require('./provision_admin');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

/**
 * Mock Memory Output Stream to inspect logging and verify zero credential leakage
 */
class MemoryOutputStream extends Writable {
  constructor() {
    super();
    this.buffer = '';
  }
  _write(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    callback();
  }
  getOutput() {
    return this.buffer;
  }
  clear() {
    this.buffer = '';
  }
}

/**
 * Synthetic In-Memory PostgreSQL Client
 */
class MockPgClient {
  constructor(initialAdmin = null, options = {}) {
    this.admin = initialAdmin ? (Array.isArray(initialAdmin) ? initialAdmin.map(a => ({ ...a })) : { ...initialAdmin }) : null;
    this.queries = [];
    this.transactionState = 'none';
    this.simulateVerificationFailure = options.simulateVerificationFailure || false;
    this.ended = false;
  }

  async connect() {
    return;
  }

  async query(sql, params = []) {
    const trimmed = sql.trim();
    this.queries.push({ sql: trimmed, params });
    const normalized = trimmed.toUpperCase().replace(/\s+/g, ' ');

    if (normalized === 'BEGIN') {
      this.transactionState = 'begun';
      return { rows: [] };
    }

    if (normalized === 'COMMIT') {
      this.transactionState = 'committed';
      return { rows: [] };
    }

    if (normalized === 'ROLLBACK') {
      this.transactionState = 'rolled_back';
      return { rows: [] };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM ADMINS') && normalized.includes('FOR UPDATE')) {
      if (!this.admin) {
        return { rows: [] };
      }
      if (Array.isArray(this.admin)) {
        return { rows: this.admin };
      }
      return { rows: [this.admin] };
    }

    if (normalized.startsWith('UPDATE ADMINS')) {
      if (this.admin && !Array.isArray(this.admin)) {
        this.admin.password_hash = params[0];
        this.admin.updated_at = new Date().toISOString();
      }
      return { rowCount: 1 };
    }

    if (normalized.startsWith('SELECT') && normalized.includes('FROM ADMINS WHERE ID = $1')) {
      if (this.simulateVerificationFailure) {
        // Return corrupted hash to test post-update verification failure
        return { rows: [{ ...this.admin, password_hash: 'corrupted_hash' }] };
      }
      return { rows: [this.admin] };
    }

    return { rows: [] };
  }

  async end() {
    this.ended = true;
  }
}

async function runProvisioningSecurityTests() {
  console.log('================================================================');
  console.log(' CIVICRESOLVE — PROVISION ADMIN SECURITY AUDIT SUITE');
  console.log('================================================================\n');

  const validPassword = 'Civic#Admin2026!Secure';
  const baselineAdmin = {
    id: 1,
    email: 'admin@civicresolve.gov',
    name: 'Director of Municipal Operations',
    role: 'super_admin',
    department: 'Municipal Administration & Water Supply',
    district: 'Statewide',
    designation: 'Director of Municipal Operations',
    password_hash: bcrypt.hashSync('OldBaselinePassword#2026', 12)
  };

  // -----------------------------------------------------------------
  // 1. Missing DATABASE_URL Rejection
  // -----------------------------------------------------------------
  console.log('>>> [Suite 1] DATABASE_URL & Engine Validation');
  {
    let err1 = null;
    try {
      await provisionAdmin({ databaseUrl: '' });
    } catch (e) {
      err1 = e;
    }
    assert(err1 && err1.message.includes('DATABASE_URL environment variable is required'), 'Rejects empty DATABASE_URL');

    let err2 = null;
    try {
      await provisionAdmin({ databaseUrl: '   ' });
    } catch (e) {
      err2 = e;
    }
    assert(err2 && err2.message.includes('DATABASE_URL environment variable is required'), 'Rejects whitespace DATABASE_URL');
  }

  // -----------------------------------------------------------------
  // 2. SQLite Rejection
  // -----------------------------------------------------------------
  {
    let errSqliteFlag = null;
    try {
      await provisionAdmin({ args: ['--sqlite'], databaseUrl: 'postgres://localhost/test' });
    } catch (e) {
      errSqliteFlag = e;
    }
    assert(errSqliteFlag && errSqliteFlag.message.includes('SQLite mode is rejected'), 'Rejects --sqlite command line argument');

    let errSqliteUrl = null;
    try {
      await provisionAdmin({ databaseUrl: 'sqlite:civicresolve.db' });
    } catch (e) {
      errSqliteUrl = e;
    }
    assert(errSqliteUrl && errSqliteUrl.message.includes('SQLite DATABASE_URL is rejected'), 'Rejects sqlite: URL prefix');

    let errDbFile = null;
    try {
      await provisionAdmin({ databaseUrl: 'civicresolve.db' });
    } catch (e) {
      errDbFile = e;
    }
    assert(errDbFile && errDbFile.message.includes('SQLite DATABASE_URL is rejected'), 'Rejects .db file path');

    let errUseSqliteEnv = null;
    try {
      await provisionAdmin({ useSqliteEnv: 'true', databaseUrl: 'postgres://localhost/test' });
    } catch (e) {
      errUseSqliteEnv = e;
    }
    assert(errUseSqliteEnv && errUseSqliteEnv.message.includes('SQLite mode is rejected via USE_SQLITE'), 'Rejects USE_SQLITE=true environment variable');
  }

  // -----------------------------------------------------------------
  // 3. CLI Argument Override Rejection
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 2] Disallowed CLI Flags & Parameter Tampering');
  {
    const disallowed = ['--email', '--role', '--password', '--name', '--department', '--district', '--designation'];
    for (const flag of disallowed) {
      let err = null;
      try {
        validateCliArguments([flag, 'malicious_value']);
      } catch (e) {
        err = e;
      }
      assert(err && err.message.includes('strictly prohibited'), `Rejects disallowed argument: ${flag}`);
    }
  }

  // -----------------------------------------------------------------
  // 4. Missing or Duplicate Admin Account
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 3] Record Existence & Integrity Assertion');
  {
    // 4.1 Missing admin
    const mockClientMissing = new MockPgClient(null);
    let errMissing = null;
    try {
      await provisionAdmin({
        client: mockClientMissing,
        confirmationPhrase: REQUIRED_CONFIRMATION_PHRASE,
        password: validPassword,
        confirmPassword: validPassword,
        output: new MemoryOutputStream()
      });
    } catch (e) {
      errMissing = e;
    }
    assert(errMissing && errMissing.message.includes('does not exist'), 'Rejects non-existent administrator account');
    assert(mockClientMissing.transactionState === 'rolled_back', 'Executes ROLLBACK when admin account is missing');

    // 4.2 Duplicate admin records
    const mockClientDuplicate = new MockPgClient([
      { id: 1, email: TARGET_ADMIN_EMAIL, role: REQUIRED_ROLE },
      { id: 2, email: TARGET_ADMIN_EMAIL, role: REQUIRED_ROLE }
    ]);
    let errDuplicate = null;
    try {
      await provisionAdmin({
        client: mockClientDuplicate,
        confirmationPhrase: REQUIRED_CONFIRMATION_PHRASE,
        password: validPassword,
        confirmPassword: validPassword,
        output: new MemoryOutputStream()
      });
    } catch (e) {
      errDuplicate = e;
    }
    assert(errDuplicate && errDuplicate.message.includes('Multiple accounts'), 'Rejects multiple matching admin accounts');
    assert(mockClientDuplicate.transactionState === 'rolled_back', 'Executes ROLLBACK when duplicate accounts exist');
  }

  // -----------------------------------------------------------------
  // 5. Incorrect Role Assertion
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 4] Role Authorization Checks');
  {
    const mockClientWrongRole = new MockPgClient({
      id: 5,
      email: TARGET_ADMIN_EMAIL,
      role: 'department_officer'
    });
    let errRole = null;
    try {
      await provisionAdmin({
        client: mockClientWrongRole,
        confirmationPhrase: REQUIRED_CONFIRMATION_PHRASE,
        password: validPassword,
        confirmPassword: validPassword,
        output: new MemoryOutputStream()
      });
    } catch (e) {
      errRole = e;
    }
    assert(errRole && errRole.message.includes('Expected "super_admin"'), 'Rejects account without super_admin role');
    assert(mockClientWrongRole.transactionState === 'rolled_back', 'Executes ROLLBACK on unauthorized role');
  }

  // -----------------------------------------------------------------
  // 6. Password Complexity & Policy Enforcement
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 5] Password Complexity Policy');
  {
    // Less than 14 characters
    const resShort = validatePasswordComplexity('Short#2026!A');
    assert(!resShort.valid && resShort.reason.includes('at least 14 characters'), 'Rejects password shorter than 14 characters');

    // Missing uppercase
    const resNoUpper = validatePasswordComplexity('alllowercase#2026!');
    assert(!resNoUpper.valid && resNoUpper.reason.includes('uppercase letter'), 'Rejects password missing uppercase letter');

    // Missing lowercase
    const resNoLower = validatePasswordComplexity('ALLUPPERCASE#2026!');
    assert(!resNoLower.valid && resNoLower.reason.includes('lowercase letter'), 'Rejects password missing lowercase letter');

    // Missing numeric digit
    const resNoDigit = validatePasswordComplexity('NoNumbersHere#Special!');
    assert(!resNoDigit.valid && resNoDigit.reason.includes('numeric digit'), 'Rejects password missing numeric digit');

    // Missing special character
    const resNoSpecial = validatePasswordComplexity('NoSpecialCharacters2026ABC');
    assert(!resNoSpecial.valid && resNoSpecial.reason.includes('special character'), 'Rejects password missing special character');

    // Valid compliant password
    const resValid = validatePasswordComplexity(validPassword);
    assert(resValid.valid === true, 'Accepts compliant 14+ character password with upper, lower, digit, and special char');
  }

  // -----------------------------------------------------------------
  // 7. Password Mismatch Rejection
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 6] Password Double-Entry Confirmation');
  {
    const mockClient = new MockPgClient(baselineAdmin);
    let errMismatch = null;
    try {
      await provisionAdmin({
        client: mockClient,
        confirmationPhrase: REQUIRED_CONFIRMATION_PHRASE,
        password: validPassword,
        confirmPassword: 'Different#Pass2026!Secure',
        output: new MemoryOutputStream()
      });
    } catch (e) {
      errMismatch = e;
    }
    assert(errMismatch && errMismatch.message.includes('Password confirmation mismatch'), 'Rejects mismatched passwords');
    assert(mockClient.transactionState === 'rolled_back', 'Executes ROLLBACK on password mismatch');
  }

  // -----------------------------------------------------------------
  // 8. Non-Interactive Execution Rejection (TTY Requirement)
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 7] Interactive TTY Enforcement');
  {
    const nonTtyInput = new PassThrough();
    nonTtyInput.isTTY = false;

    let errNonTtyPw = null;
    try {
      await promptMaskedPassword('Password: ', { input: nonTtyInput, output: new MemoryOutputStream() });
    } catch (e) {
      errNonTtyPw = e;
    }
    assert(errNonTtyPw && errNonTtyPw.message.includes('Non-interactive execution detected'), 'Rejects password prompt when input is not an interactive TTY');

    let errNonTtyConfirm = null;
    try {
      await promptConfirmationPhrase('Confirm: ', { input: nonTtyInput, output: new MemoryOutputStream() });
    } catch (e) {
      errNonTtyConfirm = e;
    }
    assert(errNonTtyConfirm && errNonTtyConfirm.message.includes('Non-interactive execution detected'), 'Rejects confirmation prompt when input is not an interactive TTY');
  }

  // -----------------------------------------------------------------
  // 9. Incorrect Confirmation Phrase Rejection
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 8] Operator Confirmation Phrase');
  {
    const mockClient = new MockPgClient(baselineAdmin);
    let errPhrase = null;
    try {
      await provisionAdmin({
        client: mockClient,
        confirmationPhrase: 'YES PLEASE UPDATE PASSWORD',
        password: validPassword,
        confirmPassword: validPassword,
        output: new MemoryOutputStream()
      });
    } catch (e) {
      errPhrase = e;
    }
    assert(errPhrase && errPhrase.message.includes('Confirmation phrase mismatch'), 'Rejects incorrect confirmation phrase');
    assert(mockClient.transactionState === 'rolled_back', 'Executes ROLLBACK on confirmation phrase mismatch');
  }

  // -----------------------------------------------------------------
  // 10. Successful Update, Verification, ID & Role Preservation, Zero Account Creation
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 9] Transactional Update, Read-Verify & Zero Credential Leakage');
  {
    const mockClient = new MockPgClient(baselineAdmin);
    const memoryOut = new MemoryOutputStream();

    const result = await provisionAdmin({
      client: mockClient,
      confirmationPhrase: REQUIRED_CONFIRMATION_PHRASE,
      password: validPassword,
      confirmPassword: validPassword,
      output: memoryOut
    });

    // 10.1 Success & Commit
    assert(result.success === true, 'Returns success status on verified update');
    assert(result.adminId === baselineAdmin.id, 'Returns accurate admin ID');
    assert(mockClient.transactionState === 'committed', 'Transaction successfully committed with COMMIT');

    // 10.2 Bcrypt verification of updated database record
    assert(bcrypt.compareSync(validPassword, mockClient.admin.password_hash), 'New password matches updated bcrypt hash in database');
    assert(!bcrypt.compareSync('OldBaselinePassword#2026', mockClient.admin.password_hash), 'Old password fails bcrypt match');

    // 10.3 ID and Role preservation
    assert(mockClient.admin.id === baselineAdmin.id, 'Admin ID is preserved');
    assert(mockClient.admin.role === REQUIRED_ROLE, 'Role remains super_admin');
    assert(mockClient.admin.email === TARGET_ADMIN_EMAIL, 'Email remains admin@civicresolve.gov');
    assert(mockClient.admin.department === baselineAdmin.department, 'Department is preserved');
    assert(mockClient.admin.district === baselineAdmin.district, 'District is preserved');

    // 10.4 Zero Account Creation: Ensure no INSERT statement was executed
    const insertQueries = mockClient.queries.filter(q => q.sql.toUpperCase().includes('INSERT'));
    assert(insertQueries.length === 0, 'No INSERT queries executed (Zero account creation verified)');

    // 10.5 FOR UPDATE Row Locking verified
    const selectForUpdate = mockClient.queries.find(q => q.sql.toUpperCase().includes('FOR UPDATE'));
    assert(!!selectForUpdate, 'SELECT ... FOR UPDATE row-level lock was acquired');

    // 10.6 Re-read verification query executed
    const reReadQuery = mockClient.queries.find(q => q.sql.toUpperCase().replace(/\s+/g, ' ').includes('SELECT ID, EMAIL, ROLE, PASSWORD_HASH FROM ADMINS WHERE ID = $1'));
    assert(!!reReadQuery, 'Re-read query for post-update verification was executed before COMMIT');

    // 10.7 Zero credential leakage in output logs
    const outputText = memoryOut.getOutput();
    assert(!outputText.includes(validPassword), 'Plaintext password is NEVER present in console output');
    assert(!outputText.includes(mockClient.admin.password_hash), 'Bcrypt hash is NEVER present in console output');
    assert(!outputText.includes('postgres://') && !outputText.includes('postgresql://'), 'Database connection string is NEVER present in console output');
    assert(outputText.includes('SUCCESS: Administrator password updated successfully.'), 'Generic success status logged');
    assert(outputText.includes(`Account ID: ${baselineAdmin.id}`), 'Logs account ID without credentials');
  }

  // -----------------------------------------------------------------
  // 11. Transaction Rollback on Post-Update Verification Failure
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 10] Transaction Rollback on Verification Failure');
  {
    const mockClientFailingVerify = new MockPgClient(baselineAdmin, { simulateVerificationFailure: true });
    let errVerify = null;
    try {
      await provisionAdmin({
        client: mockClientFailingVerify,
        confirmationPhrase: REQUIRED_CONFIRMATION_PHRASE,
        password: validPassword,
        confirmPassword: validPassword,
        output: new MemoryOutputStream()
      });
    } catch (e) {
      errVerify = e;
    }
    assert(errVerify && errVerify.message.includes('Post-update password verification failed'), 'Aborts when post-update hash does not match');
    assert(mockClientFailingVerify.transactionState === 'rolled_back', 'Executes ROLLBACK and refuses COMMIT when hash verification fails');
  }

  // -----------------------------------------------------------------
  // 12. TLS Certificate Verification Configuration
  // -----------------------------------------------------------------
  console.log('\n>>> [Suite 11] PostgreSQL TLS Configuration');
  {
    const client = createPgClient('postgresql://user:pass@remote.db.server:5432/civicresolve?sslmode=require');
    assert(client.ssl && client.ssl.rejectUnauthorized === true, 'PostgreSQL client enforces TLS certificate verification (rejectUnauthorized: true)');
  }

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` PROVISION ADMIN TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  if (failedTests > 0) {
    console.error(` [FAILURES]: ${failedTests} test(s) failed.`);
    console.log('================================================================\n');
    process.exit(1);
  } else {
    console.log(' ALL SECURITY CONTROLS VERIFIED SUCCESSFULLY.');
    console.log('================================================================\n');
  }
}

if (require.main === module) {
  runProvisioningSecurityTests()
    .catch(err => {
      console.error('[UNCAUGHT TEST SUITE ERROR]:', err);
      process.exit(1);
    });
}

module.exports = { runProvisioningSecurityTests };
