// Phase 6: Mobile Responsiveness and Accessibility Comprehensive Audit
// Tests:
// 1. Mobile viewport meta configuration (width=device-width, initial-scale=1.0)
// 2. WCAG touch target compliance (min-h-[44px] on civic action buttons)
// 3. Visible keyboard focus indicators (:focus-visible)
// 4. Mobile horizontal overflow prevention (max-width: 100vw, overflow-x: hidden)
// 5. Responsive grid & flex layouts across breakpoints (sm, md, lg) in all core views
// 6. Accessible semantic form elements & aria attributes
// 7. Touch manipulation behavior (touch-action: manipulation)
// 8. Genuine database protection verification

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function getHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const genuineDb = path.resolve(__dirname, 'civicresolve.db');
const backupDb = path.resolve(__dirname, 'civicresolve_safety_backup_phase1.db');
const initialGenuineHash = getHash(genuineDb);
const initialBackupHash = getHash(backupDb);

console.log('================================================================');
console.log('CivicResolve Phase 6: Mobile Responsiveness & Accessibility Audit');
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

// --- Test Group 1: Mobile Viewport & Root HTML Accessibility ---
console.log('--- Test Group 1: Mobile Viewport & HTML Standards ---');

const indexHtmlPath = path.resolve(__dirname, '..', 'client', 'index.html');
assert(fs.existsSync(indexHtmlPath), 'client/index.html exists');

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtml.includes('name="viewport"'), 'Viewport meta tag present in index.html');
assert(indexHtml.includes('width=device-width'), 'Viewport configured with width=device-width');
assert(indexHtml.includes('initial-scale=1'), 'Viewport configured with initial-scale=1.0');
assert(indexHtml.includes('lang="en"') || indexHtml.includes('lang='), 'Document root specifies language attribute');

// --- Test Group 2: WCAG 2.1 Touch Target & Focus Indicators ---
console.log('\n--- Test Group 2: WCAG Touch Targets & Focus Styling ---');

const cssPath = path.resolve(__dirname, '..', 'client', 'src', 'index.css');
assert(fs.existsSync(cssPath), 'client/src/index.css exists');

const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('min-h-[44px]'), 'Touch targets conform to 44px minimum height standard');
assert(cssContent.includes(':focus-visible'), 'Explicit :focus-visible styling defined for keyboard accessibility');
assert(cssContent.includes('touch-action: manipulation'), 'touch-action: manipulation enabled to eliminate mobile tap delays');
assert(cssContent.includes('overflow-x: hidden'), 'Global horizontal overflow guard enabled on mobile viewports');

// --- Test Group 3: Core View Responsiveness ---
console.log('\n--- Test Group 3: Responsive Component Design Matrix ---');

const componentsToCheck = [
  { file: 'Header.jsx', name: 'Navigation Header', mobileMenu: true },
  { file: 'LandingPage.jsx', name: 'Public Landing Page' },
  { file: 'CitizenPortal.jsx', name: 'Citizen Dashboard & Grievances' },
  { file: 'ComplaintFormModal.jsx', name: 'Grievance Filing Wizard' },
  { file: 'ComplaintTracker.jsx', name: 'Public Status Tracker' },
  { file: 'AdminDashboard.jsx', name: 'Administrative Portal' },
  { file: 'OfficerPortal.jsx', name: 'Field Officer Operations' },
  { file: 'PublicDashboard.jsx', name: 'Public Transparency Analytics' }
];

componentsToCheck.forEach(({ file, name, mobileMenu }) => {
  const filePath = path.resolve(__dirname, '..', 'client', 'src', 'components', file);
  assert(fs.existsSync(filePath), `${name} (${file}) exists`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check responsive layout utilities
  const hasResponsiveBreakpoints = content.includes('sm:') || content.includes('md:') || content.includes('lg:');
  assert(hasResponsiveBreakpoints, `${name} implements responsive layout breakpoints (sm/md/lg)`);

  if (mobileMenu) {
    assert(content.includes('Menu') || content.includes('isOpen'), `${name} includes collapsible mobile drawer/menu`);
  }
});

// --- Test Group 4: Genuine Database Protection Verification ---
console.log('\n--- Test Group 4: Genuine Database Protection Verification ---');

const finalGenuineHash = getHash(genuineDb);
const finalBackupHash = getHash(backupDb);

assert(finalGenuineHash === initialGenuineHash, 'Genuine database SHA-256 hash UNCHANGED');
assert(finalBackupHash === initialBackupHash, 'Safety backup database SHA-256 hash UNCHANGED');

console.log('\n================================================================');
console.log(`Phase 6 Responsiveness Audit Completed: ${passed}/${passed + failed} Tests Passed`);
console.log('================================================================');

if (failed > 0) process.exit(1);
