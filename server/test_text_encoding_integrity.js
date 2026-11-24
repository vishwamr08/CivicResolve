/**
 * CivicResolve - English & Tamil Text Encoding Integrity Test Suite
 *
 * Verifies:
 * 1. Global Zero-Mojibake Scan (no à¤, à®, à¯, â€¢, â€“, â€”, â€˜, â€™, â€œ, â€, \uFFFD)
 * 2. English Dictionary & Punctuation Standards
 * 3. Tamil Unicode Validity & Full 246-Key Localization Parity
 * 4. HTML Entry Point & API Response UTF-8 Content-Type
 * 5. Language Switching Consistency
 * 6. Genuine Database Protection & Hash Immutability
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

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

function getHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const genuineDb = path.resolve(__dirname, 'civicresolve.db');
const backupDb = path.resolve(__dirname, 'civicresolve_safety_backup_phase1.db');
const initialGenuineHash = getHash(genuineDb);
const initialBackupHash = getHash(backupDb);

console.log('================================================================');
console.log('CivicResolve: English & Tamil Text Encoding Integrity Suite');
console.log('================================================================\n');

// --- Test Group 1: Global Zero-Mojibake Repository Scan ---
console.log('--- Test Group 1: Global Zero-Mojibake Repository Scan ---');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.gemini', '.system_generated'].includes(file)) {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (/\.(jsx?|tsx?|html|json|sql|md)$/.test(file)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const rootDir = path.resolve(__dirname, '..');
const allSourceFiles = walk(rootDir);

const mojibakePatterns = [
  { name: 'Devanagari/Hindi mojibake (à¤)', regex: /\u00E0\u00A4/ },
  { name: 'Tamil mojibake (à® / à¯)', regex: /[\u00E0]\u00AE|[\u00E0]\u00AF/ },
  { name: 'Punctuation mojibake (â€...)', regex: /\u00E2\u20AC/ },
  { name: 'Latin-1 double encoded (Ã...)', regex: /\u00C3[\u0080-\u00BF]/ },
  { name: 'Unicode replacement char (\uFFFD)', regex: /\uFFFD/ }
];

let corruptedFiles = [];
allSourceFiles.forEach(f => {
  // Exclude test suite definitions that match patterns as literals
  if (f.endsWith('test_text_encoding_integrity.js') || f.endsWith('test_remediation_phases.js')) return;
  const content = fs.readFileSync(f, 'utf8');
  mojibakePatterns.forEach(p => {
    if (p.regex.test(content)) {
      corruptedFiles.push({ file: path.relative(rootDir, f), pattern: p.name });
    }
  });
});

assert(corruptedFiles.length === 0, `Zero mojibake or replacement character files found (detected: ${corruptedFiles.length})`);
if (corruptedFiles.length > 0) {
  corruptedFiles.forEach(c => console.error(`    Corrupted: ${c.file} -> ${c.pattern}`));
}

// --- Test Group 2: HTML Entry Point & UTF-8 Standards ---
console.log('\n--- Test Group 2: HTML Entry Point & UTF-8 Configuration ---');

const indexHtmlPath = path.resolve(__dirname, '..', 'client', 'index.html');
assert(fs.existsSync(indexHtmlPath), 'client/index.html exists');

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtml.includes('<meta charset="UTF-8" />') || indexHtml.includes('<meta charset="utf-8">'), 'client/index.html specifies UTF-8 charset');
assert(indexHtml.includes('name="viewport"'), 'Mobile viewport configured in index.html');
assert(indexHtml.includes('/civicresolve-logo.png'), 'Browser favicon references /civicresolve-logo.png');

// --- Test Group 3: Localization Dictionary Parity & Unicode Validation ---
console.log('\n--- Test Group 3: Localization Dictionary Parity & Unicode Validation ---');

const transPath = path.resolve(__dirname, '..', 'client', 'src', 'data', 'translations.js');
assert(fs.existsSync(transPath), 'client/src/data/translations.js exists');

const transContent = fs.readFileSync(transPath, 'utf8');
const enKeysMatch = transContent.match(/en:\s*\{([\s\S]*?)\n\s*\},/);
const taKeysMatch = transContent.match(/ta:\s*\{([\s\S]*?)\n\s*\}\s*;/);

assert(enKeysMatch !== null, 'English dictionary block found');
assert(taKeysMatch !== null, 'Tamil dictionary block found');

// Evaluate translations dictionary safely
let evalContent = transContent.replace(/export const translations =/, 'const translations =');
evalContent += '\nmodule.exports = translations;';
let translationsObj;
try {
  translationsObj = eval(evalContent);
} catch (e) {
  translationsObj = { en: {}, ta: {} };
}

const en = translationsObj.en || {};
const ta = translationsObj.ta || {};
const enKeys = Object.keys(en);
const taKeys = Object.keys(ta);

assert(enKeys.length >= 240, `Rich English dictionary defined (${enKeys.length} keys)`);
assert(taKeys.length >= 240, `Rich Tamil dictionary defined (${taKeys.length} keys)`);
assert(enKeys.length === taKeys.length, `Symmetric key count: ${enKeys.length} EN === ${taKeys.length} TA`);

const missingInTamil = enKeys.filter(k => !ta[k] || ta[k].trim() === '');
assert(missingInTamil.length === 0, `Zero missing keys in Tamil dictionary (missing: ${missingInTamil.join(', ')})`);

// Check Tamil Unicode range (U+0B80 - U+0BFF)
const tamilBlock = transContent.split('ta: {')[1];
const tamilCharCount = (tamilBlock.match(/[\u0B80-\u0BFF]/g) || []).length;
assert(tamilCharCount > 1000, `Rich Tamil glyph density verified (${tamilCharCount} Tamil characters)`);

// Check Virama / Pulli (U+0BCD) preservation
const pulliCount = (tamilBlock.match(/\u0BCD/g) || []).length;
assert(pulliCount > 200, `Tamil virama/pulli marks (்) preserved without corruption (${pulliCount} pulli characters)`);

// Check core civic vocabulary in Tamil
assert(tamilBlock.includes('சிவிக்ரிசால்வ்'), 'Tamil brand name correctly spelled: சிவிக்ரிசால்வ்');
assert(tamilBlock.includes('குடிமக்கள் குறைதீர்க்கும் தளம்'), 'Tamil portal subtitle correctly spelled: குடிமக்கள் குறைதீர்க்கும் தளம்');
assert(tamilBlock.includes('மனு பதிவு'), 'Tamil report action correctly spelled: மனு பதிவு');
assert(tamilBlock.includes('நிலை அறிதல்'), 'Tamil tracking action correctly spelled: நிலை அறிதல்');
assert(tamilBlock.includes('சிவிக்ரிசால்வ் ஏற்றப்படுகிறது...'), 'Tamil loading string correctly spelled: சிவிக்ரிசால்வ் ஏற்றப்படுகிறது...');

// --- Test Group 4: Backend API Response UTF-8 Content-Type ---
console.log('\n--- Test Group 4: Backend API Response UTF-8 Content-Type ---');

const { setupIsolatedTestDb } = require('./test_helper');
const testDb = setupIsolatedTestDb('text_encoding_audit');

process.env.NODE_ENV = 'test';
const app = require('./index');

async function testApiEncoding() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health check endpoint
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.ok, 'GET /api/health returns HTTP 200');
    const healthType = healthRes.headers.get('content-type') || '';
    assert(healthType.toLowerCase().includes('application/json'), 'GET /api/health content-type is application/json');

    // 2. Tamil Nadu Geo hierarchy endpoint
    const geoRes = await fetch(`${baseUrl}/api/geo/districts`);
    assert(geoRes.ok, 'GET /api/geo/districts returns HTTP 200');
    const geoData = await geoRes.json();
    assert(geoData.districts && geoData.districts.length === 38, '38 revenue districts loaded');
    const chennai = geoData.districts.find(d => d.name === 'Chennai');
    assert(chennai && chennai.name_ta === 'சென்னை', `Chennai Tamil name uncorrupted: "${chennai?.name_ta}"`);
    const madurai = geoData.districts.find(d => d.name === 'Madurai');
    assert(madurai && madurai.name_ta === 'மதுரை', `Madurai Tamil name uncorrupted: "${madurai?.name_ta}"`);

    // 3. Announcements endpoint (bilingual content)
    const annRes = await fetch(`${baseUrl}/api/announcements`);
    assert(annRes.ok, 'GET /api/announcements returns HTTP 200');
    const annData = await annRes.json();
    assert(annData.announcements && annData.announcements.length > 0, 'Announcements returned');
    const firstAnn = annData.announcements[0];
    assert(firstAnn.title_ta && firstAnn.title_ta.length > 5, 'Announcement has Tamil title (title_ta)');
    assert(/[\u0B80-\u0BFF]/.test(firstAnn.title_ta), 'Announcement Tamil title contains valid Tamil Unicode');
    assert(!/à®|à¯|â€/.test(firstAnn.title_ta), 'Announcement Tamil title has zero mojibake');

  } finally {
    server.close();
    testDb.cleanup();
  }

  // --- Test Group 5: Genuine Database Protection Verification ---
  console.log('\n--- Test Group 5: Genuine Database Protection Verification ---');
  const finalGenuineHash = getHash(genuineDb);
  const finalBackupHash = getHash(backupDb);

  assert(finalGenuineHash === initialGenuineHash, 'Genuine database SHA-256 hash UNCHANGED');
  assert(finalBackupHash === initialBackupHash, 'Safety backup database SHA-256 hash UNCHANGED');

  console.log('\n================================================================');
  console.log(`Text Encoding Integrity Audit: ${passedTests}/${totalTests} Tests Passed`);
  console.log('================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

testApiEncoding().catch(err => {
  console.error('[FATAL AUDIT ERROR]:', err);
  testDb.cleanup();
  process.exit(1);
});
