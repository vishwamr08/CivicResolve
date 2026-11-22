#!/usr/bin/env node
/**
 * CivicResolve - Secure Administrator Password Provisioning & Rotation CLI
 * 
 * Production-hardened, transaction-safe, read-verify password rotation tool.
 * Strictly limited to updating the existing super_admin (admin@civicresolve.gov).
 * 
 * Security Controls:
 * 1. Hardcoded target email: admin@civicresolve.gov (role: super_admin).
 * 2. Dedicated PostgreSQL client with strict TLS verification (rejectUnauthorized: true).
 * 3. Atomic transaction (BEGIN / COMMIT / ROLLBACK) with SELECT ... FOR UPDATE row locking.
 * 4. Interactive masked TTY password prompts (no CLI flags, no env vars, no generated passwords).
 * 5. Password policy enforcement (>= 14 chars, uppercase, lowercase, digit, special character).
 * 6. Explicit confirmation phrase required ("UPDATE EXISTING SUPER ADMIN PASSWORD").
 * 7. Read-verify validation using bcrypt.compareSync before COMMIT.
 * 8. Zero credential logging (passwords, hashes, and connection strings are never logged).
 * 9. Absolute prohibition on account creation (no INSERT statements).
 */

const path = require('path');
const { Writable } = require('node:stream');
const readline = require('node:readline');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const TARGET_ADMIN_EMAIL = 'admin@civicresolve.gov';
const REQUIRED_ROLE = 'super_admin';
const REQUIRED_CONFIRMATION_PHRASE = 'UPDATE EXISTING SUPER ADMIN PASSWORD';
const BCRYPT_ROUNDS = 12;

/**
 * Validates password complexity against policy requirements:
 * - At least 14 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one numeric digit
 * - Contains at least one special character
 */
function validatePasswordComplexity(password) {
  if (typeof password !== 'string') {
    return { valid: false, reason: 'Password must be a string.' };
  }
  if (password.length < 14) {
    return { valid: false, reason: 'Password must be at least 14 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one numeric digit.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character.' };
  }
  return { valid: true };
}

/**
 * Disallows CLI argument overrides for account, credentials, or engines.
 */
function validateCliArguments(args) {
  const disallowedFlags = [
    '--password',
    '--email',
    '--role',
    '--name',
    '--department',
    '--district',
    '--designation',
    '--sqlite'
  ];

  for (const flag of disallowedFlags) {
    if (args.includes(flag)) {
      if (flag === '--sqlite') {
        throw new Error('SQLite mode is rejected. Production PostgreSQL is required.');
      }
      throw new Error(`CLI argument "${flag}" is strictly prohibited. This script only rotates the password for existing ${TARGET_ADMIN_EMAIL}.`);
    }
  }
}

/**
 * Validates database configuration, enforcing production PostgreSQL and rejecting SQLite.
 */
function validateDatabaseUrl(databaseUrl, { useSqliteEnv = process.env.USE_SQLITE } = {}) {
  if (useSqliteEnv === 'true') {
    throw new Error('SQLite mode is rejected via USE_SQLITE. Production PostgreSQL is required.');
  }

  if (!databaseUrl || typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL environment variable is required. No database connection configured.');
  }

  const lower = databaseUrl.toLowerCase().trim();
  if (lower.startsWith('sqlite:') || lower.endsWith('.db') || lower.endsWith('.sqlite')) {
    throw new Error('SQLite DATABASE_URL is rejected. Production PostgreSQL is required.');
  }

  if (!lower.startsWith('postgres://') && !lower.startsWith('postgresql://')) {
    throw new Error('Invalid DATABASE_URL scheme. Production PostgreSQL (postgres:// or postgresql://) is required.');
  }
}

/**
 * Prompts for masked/hidden password on an interactive TTY.
 * Rejects non-interactive execution. Never echoes typed characters.
 */
function promptMaskedPassword(promptText, { input = process.stdin, output = process.stdout } = {}) {
  return new Promise((resolve, reject) => {
    if (!input || !input.isTTY) {
      return reject(new Error('Non-interactive execution detected. An interactive TTY is required.'));
    }

    let muted = false;
    const mutableStdout = new Writable({
      write: function (chunk, encoding, callback) {
        if (!muted) {
          output.write(chunk, encoding);
        }
        callback();
      }
    });

    const rl = readline.createInterface({
      input: input,
      output: mutableStdout,
      terminal: true
    });

    rl.question(promptText, (answer) => {
      rl.close();
      output.write('\n');
      resolve(answer);
    });

    muted = true;
  });
}

/**
 * Prompts for explicit operator confirmation phrase on an interactive TTY.
 */
function promptConfirmationPhrase(promptText, { input = process.stdin, output = process.stdout } = {}) {
  return new Promise((resolve, reject) => {
    if (!input || !input.isTTY) {
      return reject(new Error('Non-interactive execution detected. An interactive TTY is required.'));
    }

    const rl = readline.createInterface({
      input: input,
      output: output,
      terminal: true
    });

    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Instantiates dedicated PostgreSQL client with TLS verification enabled.
 */
function createPgClient(databaseUrl) {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: true
    }
  });

  // Enforce strict TLS certificate verification on connection parameters
  if (client.connectionParameters) {
    if (typeof client.connectionParameters.ssl === 'object' && client.connectionParameters.ssl !== null) {
      client.connectionParameters.ssl.rejectUnauthorized = true;
    } else {
      client.connectionParameters.ssl = { rejectUnauthorized: true };
    }
  }
  client.ssl = client.connectionParameters?.ssl || { rejectUnauthorized: true };

  return client;
}

/**
 * Collects and validates password twice, enforcing complexity and matching.
 */
async function collectAndValidatePassword({ input, output, password, confirmPassword }) {
  let pw = password;
  let cpw = confirmPassword;

  if (pw === undefined || pw === null) {
    output.write('\n[CREDENTIAL ENTRY]: Please enter the new administrator password.\n');
    pw = await promptMaskedPassword('Enter new administrator password (masked): ', { input, output });
  }

  const complexity = validatePasswordComplexity(pw);
  if (!complexity.valid) {
    throw new Error(`Password policy violation: ${complexity.reason}`);
  }

  if (cpw === undefined || cpw === null) {
    cpw = await promptMaskedPassword('Confirm new administrator password (masked): ', { input, output });
  }

  if (pw !== cpw) {
    throw new Error('Password confirmation mismatch. The entered passwords do not match.');
  }

  return pw;
}

/**
 * Primary administrator password rotation routine.
 */
async function provisionAdmin(options = {}) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const args = options.args || process.argv.slice(2);
  const databaseUrl = options.databaseUrl !== undefined ? options.databaseUrl : process.env.DATABASE_URL;

  // 1. Validate CLI Arguments (rejects overrides like --email, --password, --sqlite)
  validateCliArguments(args);

  // 2. Validate Database URL (production PostgreSQL only)
  if (!options.client) {
    validateDatabaseUrl(databaseUrl, { useSqliteEnv: options.useSqliteEnv !== undefined ? options.useSqliteEnv : process.env.USE_SQLITE });
  }

  output.write('=============================================================\n');
  output.write(' CIVICRESOLVE — SECURE ADMINISTRATOR PASSWORD ROTATION\n');
  output.write('=============================================================\n');
  output.write('[TARGET DATABASE]: Production PostgreSQL (TLS verified)\n');
  output.write(`[TARGET ACCOUNT]:  ${TARGET_ADMIN_EMAIL}\n`);

  let client = options.client;
  let ownsClient = false;

  if (!client) {
    client = createPgClient(databaseUrl);
    await client.connect();
    ownsClient = true;
  }

  try {
    // 3. Begin Transaction
    await client.query('BEGIN');

    // 4. Select existing account with row-level lock
    const selectRes = await client.query(
      `SELECT id, email, name, role, department, designation, district 
       FROM admins 
       WHERE LOWER(email) = LOWER($1) 
       FOR UPDATE`,
      [TARGET_ADMIN_EMAIL]
    );

    // 5. Strict Record Existence Assertion
    if (selectRes.rows.length === 0) {
      throw new Error(`Target administrator account "${TARGET_ADMIN_EMAIL}" does not exist. Password reset requires an existing account.`);
    }
    if (selectRes.rows.length > 1) {
      throw new Error(`Integrity violation: Multiple accounts (${selectRes.rows.length}) found for "${TARGET_ADMIN_EMAIL}". Refusing to proceed.`);
    }

    const admin = selectRes.rows[0];

    // Assert super_admin role
    if (admin.role !== REQUIRED_ROLE) {
      throw new Error(`Account "${TARGET_ADMIN_EMAIL}" has role "${admin.role}". Expected "${REQUIRED_ROLE}". Refusing to proceed.`);
    }

    // 6. Explicit Operator Confirmation
    output.write('\n-------------------------------------------------------------\n');
    output.write(' OPERATOR CONFIRMATION REQUIRED\n');
    output.write('-------------------------------------------------------------\n');
    output.write(`Target Email:   ${admin.email}\n`);
    output.write(`Account ID:     ${admin.id}\n`);
    output.write(`Current Role:   ${admin.role}\n`);
    output.write(`Administrator:  ${admin.name || 'N/A'}\n`);
    output.write(`Department:     ${admin.department || 'N/A'}\n`);
    output.write('Scope:          Only the password hash and updated_at timestamp\n');
    output.write('                will be modified. Account ID, role, and profile\n');
    output.write('                fields will be strictly preserved.\n');
    output.write('-------------------------------------------------------------\n');

    let enteredPhrase = options.confirmationPhrase;
    if (enteredPhrase === undefined || enteredPhrase === null) {
      enteredPhrase = await promptConfirmationPhrase(
        `Type "${REQUIRED_CONFIRMATION_PHRASE}" to confirm: `,
        { input, output }
      );
    }

    if (enteredPhrase !== REQUIRED_CONFIRMATION_PHRASE) {
      throw new Error(`Confirmation phrase mismatch. Expected "${REQUIRED_CONFIRMATION_PHRASE}". Operation cancelled.`);
    }

    // 7. Interactive Password Entry & Validation
    const newPassword = await collectAndValidatePassword({
      input,
      output,
      password: options.password,
      confirmPassword: options.confirmPassword
    });

    // 8. Generate Bcrypt Hash with Cost Factor 12
    const passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);

    // 9. Update ONLY password_hash and updated_at
    await client.query(
      `UPDATE admins 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [passwordHash, admin.id]
    );

    // 10. Re-read the updated record and verify hash with bcrypt
    const verifyRes = await client.query(
      `SELECT id, email, role, password_hash 
       FROM admins 
       WHERE id = $1`,
      [admin.id]
    );

    if (verifyRes.rows.length !== 1) {
      throw new Error('Failed to re-read administrator record for verification.');
    }

    const updatedAdmin = verifyRes.rows[0];

    // Assert ID and role preservation
    if (updatedAdmin.id !== admin.id) {
      throw new Error('Admin ID mismatch after update.');
    }
    if (updatedAdmin.role !== REQUIRED_ROLE) {
      throw new Error('Admin role altered unexpectedly during update.');
    }

    // Verify hash matches new password
    const isVerified = bcrypt.compareSync(newPassword, updatedAdmin.password_hash);
    if (!isVerified) {
      throw new Error('Post-update password verification failed: hash does not match new password.');
    }

    // 11. Commit Transaction
    await client.query('COMMIT');

    // 12. Zero Credential Output
    output.write('\n=============================================================\n');
    output.write(' SUCCESS: Administrator password updated successfully.\n');
    output.write(` Account ID: ${admin.id}\n`);
    output.write(' Status:     Transaction committed and verified.\n');
    output.write('=============================================================\n');

    return {
      success: true,
      adminId: admin.id,
      email: admin.email,
      role: admin.role
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // suppress secondary rollback failure
    }
    throw err;
  } finally {
    if (ownsClient) {
      await client.end().catch(() => {});
    }
  }
}

if (require.main === module) {
  provisionAdmin()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(`\n[PROVISION ERROR]: ${err.message}\n`);
      process.exit(1);
    });
}

module.exports = {
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
};
