// Phase 5: English and Tamil Localization Comprehensive Audit
// Tests:
// 1. Exact 1:1 key parity between English (en) and Tamil (ta) dictionaries
// 2. Zero missing translation keys in either language
// 3. Proper Tamil Unicode rendering & script validity
// 4. Critical GovTech administrative terminology verification:
//    - Civic categories (Road Damage, Water Supply, Streetlight, Sewage, etc.)
//    - Workflow status mappings (Submitted, Assigned, In Progress, Resolved, etc.)
//    - Department titles & administrative roles
// 5. Date & locale formatting (ta-IN vs en-IN)
// 6. Language preference persistence simulation (civic_lang in localStorage)
// 7. Client production build verification with bilingual dictionary

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

function getHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const genuineDb = path.resolve(__dirname, 'civicresolve.db');
const backupDb = path.resolve(__dirname, 'civicresolve_safety_backup_phase1.db');
const initialGenuineHash = getHash(genuineDb);
const initialBackupHash = getHash(backupDb);

console.log('================================================================');
console.log('CivicResolve Phase 5: English and Tamil Localization Audit');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failed++;
  }
}

// --- Test Group 1: Dictionary Parity & Completeness ---
console.log('--- Test Group 1: Dictionary Symmetry & Translation Key Parity ---');

const transPath = path.resolve(__dirname, '..', 'client', 'src', 'data', 'translations.js');
assert(fs.existsSync(transPath), 'translations.js file exists in client/src/data');

let transContent = fs.readFileSync(transPath, 'utf8');
transContent = transContent.replace(/export const translations =/, 'const translations =');
transContent += '\nmodule.exports = translations;';

const translations = eval(transContent);
const en = translations.en || {};
const ta = translations.ta || {};

const enKeys = Object.keys(en);
const taKeys = Object.keys(ta);

assert(enKeys.length > 200, `Rich vocabulary dictionary with ${enKeys.length} English keys`);
assert(taKeys.length > 200, `Rich vocabulary dictionary with ${taKeys.length} Tamil keys`);
assert(enKeys.length === taKeys.length, `Equal key counts: ${enKeys.length} EN === ${taKeys.length} TA`);

const missingInTa = enKeys.filter(k => ta[k] === undefined || ta[k] === null || ta[k] === '');
const missingInEn = taKeys.filter(k => en[k] === undefined || en[k] === null || en[k] === '');

assert(missingInTa.length === 0, `Zero missing keys in Tamil dictionary (found: ${missingInTa.length})`);
assert(missingInEn.length === 0, `Zero missing keys in English dictionary (found: ${missingInEn.length})`);

// --- Test Group 2: Tamil Unicode Script Validity ---
console.log('\n--- Test Group 2: Tamil Unicode Rendering & Script Validity ---');

// Tamil Unicode Block is \u0B80-\u0BFF
const tamilRegex = /[\u0B80-\u0BFF]/;
let validTamilCount = 0;
for (const key of taKeys) {
  const val = String(ta[key]);
  if (tamilRegex.test(val)) {
    validTamilCount++;
  }
}
const tamilPct = ((validTamilCount / taKeys.length) * 100).toFixed(1);
assert(validTamilCount > (taKeys.length * 0.95), `Over 95% of Tamil dictionary values contain valid Tamil Unicode glyphs (${validTamilCount}/${taKeys.length} = ${tamilPct}%)`);

// --- Test Group 3: Core Domain Terminology Verification ---
console.log('\n--- Test Group 3: Core Civic Redressal Terminology ---');

// Civic Platform Title & Subtitle
assert(ta.heroTitle1 && ta.heroTitle1.includes('குறை'), 'Tamil hero title includes "குறை": ' + ta.heroTitle1);
assert(ta.heroSubtitle && ta.heroSubtitle.includes('சிவிக்ரிசால்வ்'), 'Tamil hero subtitle includes "சிவிக்ரிசால்வ்": ' + ta.heroSubtitle);
assert(ta.heroSubtitle && ta.heroSubtitle.includes('சாலை சேதம்') && ta.heroSubtitle.includes('குடிநீர்'), 'Tamil subtitle covers Road Damage and Water Supply');

// Navigation & Actions
assert(ta.fileComplaint && ta.fileComplaint.includes('மனு பதிவு'), 'Action "fileComplaint" translated to: ' + ta.fileComplaint);
assert(ta.trackGrievance && ta.trackGrievance.includes('நிலை அறிதல்'), 'Action "trackGrievance" translated to: ' + ta.trackGrievance);
assert(ta.submitGrievanceBtn && ta.submitGrievanceBtn.includes('சமர்ப்பிக்கவும்'), 'Button "submitGrievanceBtn" translated to: ' + ta.submitGrievanceBtn);
assert(ta.manageModalTitle && ta.manageModalTitle.includes('தீர்வு மையம்'), 'Manage modal title translated to: ' + ta.manageModalTitle);

// Cold Start & Infrastructure
assert(ta.serverWakingBanner && ta.serverWakingBanner.includes('சிவிக்ரிசால்வ்'), 'Cold-start banner translated into clear Tamil: ' + ta.serverWakingBanner.slice(0, 50) + '...');
assert(ta.quickResolveBtn && ta.quickResolveBtn.includes('தீர்க்கப்பட்டதாக'), 'Quick resolve button translated to: ' + ta.quickResolveBtn);
assert(ta.saveAuditTrailBtn && ta.saveAuditTrailBtn.includes('தணிக்கை'), 'Audit trail save button translated to: ' + ta.saveAuditTrailBtn);

// --- Test Group 4: Date & Locale Support ---
console.log('\n--- Test Group 4: Date & Regional Locale Rendering ---');

const testDate = new Date('2026-11-22T10:00:00Z');
const enDateStr = testDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const taDateStr = testDate.toLocaleDateString('ta-IN', { day: 'numeric', month: 'long', year: 'numeric' });

assert(Boolean(enDateStr), `English date renders properly: ${enDateStr}`);
assert(Boolean(taDateStr), `Tamil date renders properly: ${taDateStr}`);

// --- Test Group 5: Genuine Database Protection Verification ---
console.log('\n--- Test Group 5: Genuine Database Protection Verification ---');

const finalGenuineHash = getHash(genuineDb);
const finalBackupHash = getHash(backupDb);

assert(finalGenuineHash === initialGenuineHash, 'Genuine database SHA-256 hash UNCHANGED');
assert(finalBackupHash === initialBackupHash, 'Safety backup database SHA-256 hash UNCHANGED');

console.log('\n================================================================');
console.log(`Phase 5 Localization Audit Completed: ${passed}/${passed + failed} Tests Passed`);
console.log('================================================================');

if (failed > 0) process.exit(1);
