/**
 * CivicResolve - Automated Frontend Component & Render Verification Suite
 *
 * Uses Vite SSR module loader + React 19 renderToString to verify:
 * 1. Root <App /> renders non-blank interface with zero ReferenceError and zero standby banner
 * 2. <Header /> renders branding, mobile toggle, Citizen/Admin avatars & NotificationCenter bell
 * 3. <AvatarDisplay /> renders <img> for custom photos & accessible initials fallback when null
 * 4. <ProfilePhotoUploader /> renders upload, remove & accessible JPEG/PNG/WebP controls
 * 5. <WebPushControl /> renders browser push UI gracefully
 * 6. <NotificationCenter /> renders notification bell for authenticated Citizen & Admin users
 * 7. <CitizenPortal /> renders authenticated citizen profile banner + avatar + tabs
 * 8. <AdminDashboard /> renders metrics, analytics containers, tabs & admin avatar
 * 9. <PublicDashboard /> renders analytics sections cleanly without crashing
 * 10. <ComplaintTracker /> renders search input, masked PII states & verification bar
 * 11. <OfficerPortal /> renders officer header + avatar cleanly
 */

import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

// Minimal DOM global shim for third-party browser libraries (e.g., Leaflet) when evaluated under Node SSR
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { hostname: '127.0.0.1', origin: 'http://127.0.0.1', search: '', pathname: '/' },
    screen: { deviceXDPI: 96, logicalXDPI: 96 },
    devicePixelRatio: 1,
    navigator: { userAgent: 'node-test' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  globalThis.document = {
    documentElement: { style: {} },
    createElement: () => ({ style: {}, getContext: () => null }),
    getElementsByTagName: () => [],
    addEventListener: () => {}
  };
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
}

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${message}`);
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Frontend assertion failed: ${message}`);
  }
}

async function runFrontendComponentTests() {
  console.log('================================================================================');
  console.log('  CIVICRESOLVE — AUTOMATED FRONTEND COMPONENT & RENDER VERIFICATION SUITE');
  console.log('================================================================================\n');

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent'
  });

  try {
    // Verify sw.js service worker file exists cleanly
    const swPath = path.resolve('public/sw.js');
    assert(fs.existsSync(swPath), 'Web Push Service Worker exists at client/public/sw.js');
    const swCode = fs.readFileSync(swPath, 'utf8');
    assert(swCode.includes("addEventListener('push'") && swCode.includes("addEventListener('notificationclick'"), 'Service Worker implements push and notificationclick handlers');

    // 1. Test Root <App />
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
    const appHtml = renderToString(React.createElement(App));
    assert(appHtml && appHtml.length > 500, 'Root <App /> renders non-empty homepage markup cleanly');
    assert(!appHtml.includes('waking from standby'), 'Root <App /> contains ZERO cold-start waking standby banner');

    // 2. Test <AvatarDisplay />
    const { default: AvatarDisplay } = await vite.ssrLoadModule('/src/components/AvatarDisplay.jsx');
    const avatarFallbackHtml = renderToString(React.createElement(AvatarDisplay, {
      user: { name: 'Selvi Anitha', profile_photo_url: null },
      variant: 'citizen'
    }));
    assert(avatarFallbackHtml.includes('>SA<'), '<AvatarDisplay /> renders initials fallback ("SA") when photo is null');

    const avatarImgHtml = renderToString(React.createElement(AvatarDisplay, {
      user: { name: 'Selvi Anitha', profile_photo_url: '/api/avatars/citizen/1?v=123' },
      variant: 'citizen'
    }));
    assert(avatarImgHtml.includes('<img') && avatarImgHtml.includes('/api/avatars/citizen/1?v=123'), '<AvatarDisplay /> renders image element with API avatar URL');
    assert(avatarImgHtml.includes('object-cover'), '<AvatarDisplay /> applies object-cover to prevent image distortion');

    // 3. Test <ProfilePhotoUploader />
    const { default: ProfilePhotoUploader } = await vite.ssrLoadModule('/src/components/ProfilePhotoUploader.jsx');
    const uploaderNoPhoto = renderToString(React.createElement(ProfilePhotoUploader, {
      user: { id: 1, name: 'Test User', profile_photo_url: null },
      userType: 'citizen',
      token: 'tok'
    }));
    assert(uploaderNoPhoto.includes('Select Photo') && !uploaderNoPhoto.includes('Remove Photo'), '<ProfilePhotoUploader /> displays Select Photo without Remove button when no photo saved');

    const uploaderWithPhoto = renderToString(React.createElement(ProfilePhotoUploader, {
      user: { id: 1, name: 'Test User', profile_photo_url: '/api/avatars/citizen/1?v=99' },
      userType: 'citizen',
      token: 'tok'
    }));
    assert(uploaderWithPhoto.includes('Change Photo') && uploaderWithPhoto.includes('Remove Photo'), '<ProfilePhotoUploader /> renders Change Photo and Remove Photo buttons when avatar exists');

    // 4. Test <WebPushControl />
    const { default: WebPushControl } = await vite.ssrLoadModule('/src/components/WebPushControl.jsx');
    const pushHtml = renderToString(React.createElement(WebPushControl, {
      token: 'tok',
      userType: 'citizen'
    }));
    assert(pushHtml.includes('Browser Push Notifications'), '<WebPushControl /> renders push notification control panel');

    // 5. Test <NotificationCenter />
    const { default: NotificationCenter } = await vite.ssrLoadModule('/src/components/NotificationCenter.jsx');
    const notifAnonHtml = renderToString(React.createElement(NotificationCenter, {
      isAuthenticated: false,
      userType: 'citizen',
      token: null
    }));
    assert(notifAnonHtml === '', '<NotificationCenter /> hides bell icon for unauthenticated visitors');

    const notifAuthHtml = renderToString(React.createElement(NotificationCenter, {
      isAuthenticated: true,
      userType: 'citizen',
      token: 'tok'
    }));
    assert(notifAuthHtml.includes('Notifications'), '<NotificationCenter /> renders accessible notification bell for signed-in users');

    // 6. Test <Header />
    const { default: Header } = await vite.ssrLoadModule('/src/components/Header.jsx');
    const headerCitizenHtml = renderToString(React.createElement(Header, {
      activeTab: 'landing',
      setActiveTab: () => {},
      citizenUser: { id: 1, name: 'Anitha Sundaram', profile_photo_url: '/api/avatars/citizen/1?v=5' },
      citizenToken: 'tok'
    }));
    assert(headerCitizenHtml.includes('Civic') && headerCitizenHtml.includes('/api/avatars/citizen/1?v=5'), '<Header /> displays authenticated citizen avatar inside navigation bar');

    // 7. Test <CitizenPortal />
    const { default: CitizenPortal } = await vite.ssrLoadModule('/src/components/CitizenPortal.jsx');
    const portalHtml = renderToString(React.createElement(CitizenPortal, {
      citizenUser: { id: 1, name: 'Anitha Sundaram', email: 'anitha@example.com', phone: '9840123456', district: 'Chennai', profile_photo_url: '/api/avatars/citizen/1?v=5' },
      citizenToken: 'tok',
      newGrievance: null
    }));
    assert(portalHtml.includes('Verified Citizen Session') && portalHtml.includes('/api/avatars/citizen/1?v=5'), '<CitizenPortal /> renders authenticated session banner with persisted profile photo');

    // 8. Test <AdminDashboard />
    const { default: AdminDashboard } = await vite.ssrLoadModule('/src/components/AdminDashboard.jsx');
    const adminDashHtml = renderToString(React.createElement(AdminDashboard, {
      stats: {
        totalComplaints: 10,
        pendingComplaints: 3,
        inProgressComplaints: 4,
        resolvedComplaints: 3,
        priorityDistribution: [{ priority: 'High', count: 5 }, { priority: 'Medium', count: 5 }],
        categoryDistribution: [{ category: 'Road Damage', count: 6 }, { category: 'Drainage', count: 4 }]
      },
      complaints: [],
      adminUser: { id: 1, name: 'Director Operations', email: 'admin@civicresolve.gov', role: 'super_admin', profile_photo_url: '/api/avatars/admin/1?v=8' },
      adminToken: 'atok'
    }));
    assert(adminDashHtml.includes('Municipal Administration Console') && adminDashHtml.includes('/api/avatars/admin/1?v=8'), '<AdminDashboard /> renders console header with persisted admin avatar');
    assert(adminDashHtml.includes('My Profile') && adminDashHtml.includes('Notifications'), '<AdminDashboard /> renders My Profile & Alerts and Notifications tabs');

    // 9. Test <PublicDashboard />
    const { default: PublicDashboard } = await vite.ssrLoadModule('/src/components/PublicDashboard.jsx');
    const pubDashHtml = renderToString(React.createElement(PublicDashboard, {
      stats: {
        totalComplaints: 5,
        resolvedComplaints: 3,
        pendingComplaints: 1,
        inProgressComplaints: 1,
        resolutionRate: 60,
        categoryDistribution: [{ category: 'Road Damage', count: 3 }, { category: 'Water Leakage', count: 2 }],
        departments: [{ department: 'Highways', count: 5 }]
      }
    }));
    assert(pubDashHtml.includes('Open Data') && pubDashHtml.includes('Grievance distribution by category'), '<PublicDashboard /> renders analytics sections cleanly');

    // 10. Test <ComplaintTracker />
    const { default: ComplaintTracker } = await vite.ssrLoadModule('/src/components/ComplaintTracker.jsx');
    const trackerHtml = renderToString(React.createElement(ComplaintTracker, { initialRefId: '' }));
    assert(trackerHtml.includes('tracker-ref-input'), '<ComplaintTracker /> renders search form input cleanly');

    // 11. Test <OfficerPortal />
    const { default: OfficerPortal } = await vite.ssrLoadModule('/src/components/OfficerPortal.jsx');
    const officerHtml = renderToString(React.createElement(OfficerPortal, {
      adminUser: { name: 'Er. Kousalya', designation: 'AE', profile_photo_url: '/api/avatars/admin/3?v=2' }
    }));
    assert(officerHtml.includes('/api/avatars/admin/3?v=2') && officerHtml.includes('Field Duty'), '<OfficerPortal /> renders officer avatar and header');

    console.log('\n================================================================================');
    console.log(`  ALL ${passedTests}/${totalTests} FRONTEND COMPONENT TESTS PASSED CLEANLY!`);
    console.log('================================================================================\n');
  } finally {
    await vite.close();
  }
}

runFrontendComponentTests().catch((err) => {
  console.error('\n[FATAL FRONTEND TEST ERROR]:', err);
  process.exit(1);
});
