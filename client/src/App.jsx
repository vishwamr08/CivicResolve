import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import Footer from './components/Footer';
import { Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getApiUrl } from './config/api';

// Code-split secondary dashboards, views, and modals to minimize initial page JS bundle
const PublicDashboard = lazy(() => import('./components/PublicDashboard'));
const CitizenDashboard = lazy(() => import('./components/CitizenDashboard'));
const CitizenPortal = lazy(() => import('./components/CitizenPortal'));
const ComplaintTracker = lazy(() => import('./components/ComplaintTracker'));
const OfficerPortal = lazy(() => import('./components/OfficerPortal'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const ComplaintFormModal = lazy(() => import('./components/ComplaintFormModal'));
const ReceiptModal = lazy(() => import('./components/ReceiptModal'));
const CitizenAuthModal = lazy(() => import('./components/CitizenAuthModal'));
const AiAnalysisModal = lazy(() => import('./components/AiAnalysisModal'));
const ComplaintDetailsModal = lazy(() => import('./components/ComplaintDetailsModal'));
const AdminManageModal = lazy(() => import('./components/AdminManageModal'));
const ServicesPage = lazy(() => import('./components/ServicesPage'));
const AnnouncementsPage = lazy(() => import('./components/AnnouncementsPage'));
const HowItWorksPage = lazy(() => import('./components/HowItWorksPage'));
const AboutPage = lazy(() => import('./components/AboutPage'));

// Institutional loading skeleton for deferred chunks
function ViewSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="h-7 bg-slate-200 rounded w-1/4 mb-4"></div>
      <div className="h-4 bg-slate-100 rounded w-1/2 mb-8"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="h-24 bg-slate-100 border border-slate-200/80 rounded-xl"></div>
        <div className="h-24 bg-slate-100 border border-slate-200/80 rounded-xl"></div>
        <div className="h-24 bg-slate-100 border border-slate-200/80 rounded-xl"></div>
        <div className="h-24 bg-slate-100 border border-slate-200/80 rounded-xl"></div>
      </div>
      <div className="h-72 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500 text-xs font-medium">
          <img src="/civicresolve-logo.png" alt="CivicResolve Logo" className="w-8 h-8 object-contain animate-pulse" />
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#f47920]" />
            <span>Loading CivicResolve...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('landing'); // 'landing', 'tracker', 'citizen-portal', 'citizen', 'admin', 'admin-login'
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('civic_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const handleSetLang = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem('civic_lang', newLang);
    } catch {}
  };

  // Administrator Authentication State
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('civic_admin_token') || null);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('civic_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Citizen Authentication State
  const [citizenToken, setCitizenToken] = useState(() => localStorage.getItem('civic_citizen_token') || null);
  const [citizenUser, setCitizenUser] = useState(() => {
    try {
      const saved = localStorage.getItem('civic_citizen_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [complaints, setComplaints] = useState([]);
  const [complaintsLoaded, setComplaintsLoaded] = useState(false);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, _setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isServerWaking, setIsServerWaking] = useState(false);

  // Modals & Tracking
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitModalCategory, setSubmitModalCategory] = useState('Road Damage');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newlyCreatedComplaint, setNewlyCreatedComplaint] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptComplaint, setReceiptComplaint] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const [isCitizenAuthOpen, setIsCitizenAuthOpen] = useState(false);
  const [citizenAuthMode, setCitizenAuthMode] = useState('login');
  const [pendingSubmitCategory, setPendingSubmitCategory] = useState(null);
  const [newlySubmittedCitizenGrievance, setNewlySubmittedCitizenGrievance] = useState(null);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [managingComplaint, setManagingComplaint] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [trackerInitialId, setTrackerInitialId] = useState('');

  const handleOpenSubmit = (cat) => {
    const targetCategory = (typeof cat === 'string' && cat.trim() !== '') ? cat : 'Road Damage';
    setSubmitModalCategory(targetCategory);

    // Phase 4: Mandatory Citizen Authentication Check
    if (!citizenToken && !citizenUser) {
      setPendingSubmitCategory(targetCategory);
      setCitizenAuthMode('otp');
      setIsCitizenAuthOpen(true);
      showToast(
        lang === 'ta'
          ? 'à®®à®©à¯ à®šà®®à®°à¯à®ªà¯à®ªà®¿à®•à¯à®• à®•à¯à®Ÿà®¿à®®à®•à¯à®•à®³à¯ à®•à®£à®•à¯à®•à®¿à®²à¯ à®‰à®³à¯à®¨à¯à®´à¯ˆà®¯à®µà¯à®®à¯ à®…à®²à¯à®²à®¤à¯ à®ªà®¤à®¿à®µà¯ à®šà¯†à®¯à¯à®¯à®µà¯à®®à¯.'
          : 'Please sign in or register a citizen account to submit a grievance.',
        'info'
      );
      return;
    }

    setIsSubmitModalOpen(true);
  };

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Verify stored session on mount
  useEffect(() => {
    const verifySessions = async () => {
      // 1. Check Admin
      const storedAdminToken = localStorage.getItem('civic_admin_token');
      if (storedAdminToken) {
        try {
          const res = await fetch(getApiUrl('/api/auth/me'), {
            headers: { 'Authorization': `Bearer ${storedAdminToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setAdminUser(data.admin);
          } else if (res.status === 401 || res.status === 403) {
            // Strictly remove on authenticated refusal only, never on 502/503/504 cold starts!
            localStorage.removeItem('civic_admin_token');
            localStorage.removeItem('civic_admin_user');
            setAdminToken(null);
            setAdminUser(null);
          }
        } catch (e) {
          console.warn('Admin session verify notice (server may be waking):', e.message);
        }
      }

      // 2. Check Citizen (dual-layer: localStorage token + HttpOnly cookie fallback)
      const storedCitizenToken = localStorage.getItem('civic_citizen_token');
      const citizenHeaders = storedCitizenToken ? { 'Authorization': `Bearer ${storedCitizenToken}` } : {};
      try {
        const res = await fetch(getApiUrl('/api/auth/citizen/me'), {
          headers: citizenHeaders,
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setCitizenUser(data.citizen);
          if (data.token) {
            setCitizenToken(data.token);
            localStorage.setItem('civic_citizen_token', data.token);
          } else if (storedCitizenToken) {
            setCitizenToken(storedCitizenToken);
          }
          localStorage.setItem('civic_citizen_user', JSON.stringify(data.citizen));
        } else if (res.status === 401 || res.status === 403) {
          // Strictly clear session ONLY if explicit 401/403 unauthorized, never on 502/503/504 or network errors!
          localStorage.removeItem('civic_citizen_token');
          localStorage.removeItem('civic_citizen_user');
          setCitizenToken(null);
          setCitizenUser(null);
        }
      } catch (e) {
        console.warn('Citizen session verify notice (server may be waking):', e.message);
      }
    };

    verifySessions();
  }, []);

  // On-demand complaints loading (deferred from startup)
  const loadComplaints = useCallback(async (force = false) => {
    if (complaintsLoaded && !force) return;
    try {
      const res = await fetch(getApiUrl('/api/complaints?limit=100')).then(r => r.json()).catch(() => null);
      if (res && res.complaints) {
        setComplaints(res.complaints);
        setComplaintsLoaded(true);
      }
    } catch (err) {
      console.warn('[Complaints Load Notice]:', err.message);
    }
  }, [complaintsLoaded]);

  // Fetch initial lightweight startup data only (Health + Aggregated Stats)
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [healthRes, statsRes] = await Promise.all([
        fetch(getApiUrl('/api/health')).then(r => r.json()).catch(() => null),
        fetch(getApiUrl('/api/dashboard/stats')).then(r => r.json()).catch(() => null)
      ]);

      if (healthRes && !healthRes.error) {
        setHealth(healthRes);
        setIsServerWaking(false);
      }
      if (statsRes && !statsRes.error) {
        setStats(statsRes);
      }
      return !!(healthRes && !healthRes.error);
    } catch (err) {
      console.warn('Backend connection notice:', err.message);
      return false;
    }
  }, []);

  // Initial startup probe with transparent waking detection and bounded automatic retry for cloud cold starts
  useEffect(() => {
    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 8;
    let pollTimer = null;
    let isProbing = false;

    const wakingTimer = setTimeout(() => {
      if (!cancelled) setIsServerWaking(true);
    }, 2000);

    const probeAndPoll = async () => {
      if (isProbing || cancelled) return;
      isProbing = true;
      try {
        const ok = await fetchData();
        clearTimeout(wakingTimer);
        if (ok) {
          if (!cancelled) {
            setIsServerWaking(false);
            setError(null);
          }
        } else if (!cancelled && pollCount < maxPolls) {
          setIsServerWaking(true);
          pollCount++;
          pollTimer = setTimeout(probeAndPoll, 3500);
        } else if (!cancelled) {
          setIsServerWaking(false);
          setError(
            lang === 'ta'
              ? 'à®šà®¿à®µà®¿à®•à¯à®°à®¿à®šà®¾à®²à¯à®µà¯ à®šà¯‡à®µà¯ˆà®¯à®•à®®à¯ à®¤à®±à¯à®ªà¯‹à®¤à¯ à®‡à®£à¯ˆà®•à¯à®• à®®à¯à®Ÿà®¿à®¯à®µà®¿à®²à¯à®²à¯ˆ. à®¤à®¯à®µà¯à®šà¯†à®¯à¯à®¤à¯ à®®à¯€à®£à¯à®Ÿà¯à®®à¯ à®®à¯à®¯à®±à¯à®šà®¿à®•à¯à®•à®µà¯à®®à¯.'
              : 'Unable to connect to CivicResolve services. Please tap Retry to reconnect.'
          );
        }
      } finally {
        isProbing = false;
      }
    };

    probeAndPoll();

    return () => {
      cancelled = true;
      clearTimeout(wakingTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [fetchData, lang]);

  // Fetch complaints on-demand when navigating to tabs that require individual complaints
  useEffect(() => {
    if (activeTab === 'citizen' || activeTab === 'admin' || activeTab === 'tracker') {
      loadComplaints();
    }
  }, [activeTab, loadComplaints]);

  // Phase 6: Automatic background dashboard synchronization
  useEffect(() => {
    if (activeTab !== 'admin' && activeTab !== 'citizen-portal') return;

    const syncInterval = setInterval(() => {
      fetchData();
      if (activeTab === 'admin') {
        loadComplaints(true);
      }
    }, 15000);

    return () => clearInterval(syncInterval);
  }, [activeTab, fetchData, loadComplaints]);

  // Combined refresh for Admin Command Center: telemetry metrics + full complaints list
  const handleAdminRefresh = useCallback(async () => {
    await Promise.all([
      fetchData(),
      loadComplaints(true)
    ]);
  }, [fetchData, loadComplaints]);

  // Handle Admin Login Success
  const handleAdminLoginSuccess = (token, admin) => {
    setAdminToken(token);
    setAdminUser(admin);
    localStorage.setItem('civic_admin_token', token);
    localStorage.setItem('civic_admin_user', JSON.stringify(admin));
    const targetTab = (admin.role === 'field_officer' || admin.role === 'department_officer')
      ? 'officer-portal'
      : 'admin';
    setActiveTab(targetTab);
    showToast(`Welcome, ${admin.name}! Access granted.`, 'success');
  };

  // Handle Admin Logout
  const handleAdminLogout = async () => {
    try {
      await fetch(getApiUrl('/api/auth/logout'), { method: 'POST' });
    } catch (e) {
      console.warn('Logout API notice:', e.message);
    } finally {
      localStorage.removeItem('civic_admin_token');
      localStorage.removeItem('civic_admin_user');
      setAdminToken(null);
      setAdminUser(null);
      setActiveTab('landing');
      showToast('Signed out of administrator session successfully.', 'success');
    }
  };

  // Handle Citizen Login Success (Auto routes to citizen-portal or resumes grievance submission)
  const handleCitizenLoginSuccess = (token, citizen) => {
    setCitizenToken(token);
    setCitizenUser(citizen);
    if (token) localStorage.setItem('civic_citizen_token', token);
    if (citizen) localStorage.setItem('civic_citizen_user', JSON.stringify(citizen));
    showToast(lang === 'ta' ? `à®µà®£à®•à¯à®•à®®à¯, ${citizen?.name || 'à®•à¯à®Ÿà®¿à®®à®•à®©à¯'}!` : `Welcome back, ${citizen?.name || 'Citizen'}!`, 'success');

    // If citizen was trying to submit a grievance, seamlessly resume submission
    if (pendingSubmitCategory) {
      setSubmitModalCategory(pendingSubmitCategory);
      setPendingSubmitCategory(null);
      setIsCitizenAuthOpen(false);
      setIsSubmitModalOpen(true);
    } else {
      setActiveTab('citizen-portal');
    }
  };

  // Handle Citizen Logout
  const handleCitizenLogout = async () => {
    try {
      await fetch(getApiUrl('/api/auth/citizen/logout'), {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Citizen logout API notice:', e.message);
    } finally {
      localStorage.removeItem('civic_citizen_token');
      localStorage.removeItem('civic_citizen_user');
      setCitizenToken(null);
      setCitizenUser(null);
      showToast('Signed out of citizen account.', 'success');
    }
  };

  // Handle Safe Navigation to Admin
  const handleNavigateToAdmin = () => {
    if (adminUser) {
      setActiveTab('admin');
    } else {
      setActiveTab('admin-login');
    }
  };

  // Handle new complaint submission
  const handleSubmitComplaint = async (formData) => {
    setIsSubmitting(true);
    try {
      const headers = {};
      if (citizenToken) {
        headers['Authorization'] = `Bearer ${citizenToken}`;
      }

      const response = await fetch(getApiUrl('/api/complaints'), {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit complaint');
      }

      const result = await response.json();
      const created = result.complaint || result;
      const grievanceRefId = created?.ref_id || result?.ref_id;

      if (!grievanceRefId) {
        throw new Error(result.error || 'Failed to obtain registered grievance reference ID.');
      }

      // Close submission wizard
      setIsSubmitModalOpen(false);

      // Open Acknowledgement Slip Modal
      setReceiptComplaint(created);
      setIsReceiptModalOpen(true);
      setNewlyCreatedComplaint(created);
      setNewlySubmittedCitizenGrievance(created);

      // Immediate state update (Phase 5): prepend created complaint to existing state
      if (created) {
        setComplaints(prev => [created, ...prev.filter(c => c.id !== created.id && c.ref_id !== grievanceRefId)]);
      }

      // Refresh database records and complaints list
      await Promise.all([
        fetchData(),
        loadComplaints(true)
      ]);

      showToast(`Grievance ${grievanceRefId} registered successfully!`, 'success');
    } catch (err) {
      console.error('Submission failed:', err);
      showToast(err.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Management Save
  const handleManageComplaintSave = async (id, updateData) => {
    if (!adminToken) {
      showToast('Administrator authentication required. Please log in.', 'error');
      setActiveTab('admin-login');
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/complaints/${id}/manage`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(updateData),
      });

      if (response.status === 401 || response.status === 403) {
        handleAdminLogout();
        showToast('Administrator session expired. Please log in again.', 'error');
        setActiveTab('admin-login');
        return;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update complaint');
      }

      const result = await response.json();
      const updated = result.complaint;

      // Update local state
      setComplaints(prev => prev.map(c =>
        (c.id === id || c.ref_id === id) ? updated : c
      ));

      if (selectedComplaint && (selectedComplaint.id === id || selectedComplaint.ref_id === id)) {
        setSelectedComplaint(updated);
      }

      // Refresh stats
      const statsRes = await fetch(getApiUrl('/api/dashboard/stats')).then(r => r.json()).catch(() => null);
      if (statsRes && !statsRes.error) setStats(statsRes);

      showToast(`Grievance ${updated.ref_id} updated & audit trail saved!`, 'success');
    } catch (err) {
      console.error('Management update error:', err);
      showToast(err.message || 'Could not update complaint.', 'error');
      throw err;
    }
  };

  const handleTrackRefId = (refId) => {
    setTrackerInitialId(refId);
    setActiveTab('tracker');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">

      {/* Government-Style Responsive Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSubmit={handleOpenSubmit}
        health={health}
        adminUser={adminUser}
        onLogoutAdmin={handleAdminLogout}
        citizenUser={citizenUser}
        onLogoutCitizen={handleCitizenLogout}
        onOpenCitizenAuth={(m) => {
          setCitizenAuthMode(m || 'otp');
          setIsCitizenAuthOpen(true);
        }}
        lang={lang}
        setLang={handleSetLang}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg shadow-lg border text-xs font-semibold transition-all animate-in slide-in-from-bottom-5 ${
          toastMessage.type === 'error'
            ? 'bg-rose-950 text-white border-rose-800'
            : 'bg-navy-950 text-white border-navy-800'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Cloud Cold-Start Branded Loading Experience */}
      {isServerWaking && (
        <div className="bg-[#0f2040] text-white border-b border-navy-900 px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 shadow-sm transition-all animate-in fade-in">
          <img
            src="/civicresolve-logo.png"
            alt="CivicResolve Logo"
            className="w-5 h-5 object-contain flex-shrink-0 animate-pulse"
          />
          <Loader2 className="w-4 h-4 animate-spin text-[#f47920] flex-shrink-0" />
          <span>{lang === 'ta' ? 'à®šà®¿à®µà®¿à®•à¯à®°à®¿à®šà®¾à®²à¯à®µà¯ à®à®±à¯à®±à®ªà¯à®ªà®Ÿà¯à®•à®¿à®±à®¤à¯...' : 'Loading CivicResolve...'}</span>
        </div>
      )}

      {/* Main View Container */}
      <main id="main-content" role="main" tabIndex="-1" className="flex-1 outline-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <img
              src="/civicresolve-logo.png"
              alt="CivicResolve Logo"
              className="w-14 h-14 object-contain animate-pulse mb-1"
            />
            <div className="flex items-center gap-2 text-slate-700">
              <Loader2 className="w-5 h-5 animate-spin text-[#f47920]" />
              <p className="text-xs sm:text-sm font-semibold">
                {lang === 'ta' ? 'à®šà®¿à®µà®¿à®•à¯à®°à®¿à®šà®¾à®²à¯à®µà¯ à®à®±à¯à®±à®ªà¯à®ªà®Ÿà¯à®•à®¿à®±à®¤à¯...' : 'Loading CivicResolve...'}
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-16 p-6 bg-white border border-slate-200 rounded-2xl shadow-md text-center space-y-3">
            <img
              src="/civicresolve-logo.png"
              alt="CivicResolve Logo"
              className="w-12 h-12 object-contain mx-auto"
            />
            <h3 className="font-bold text-slate-900 text-sm">
              {lang === 'ta' ? 'à®šà¯‡à®µà¯ˆà®¯à®• à®‡à®£à¯ˆà®ªà¯à®ªà¯ à®…à®±à®¿à®µà®¿à®ªà¯à®ªà¯' : 'Backend Connection Notice'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => { setError(null); fetchData(); }}
              className="mt-3 px-5 py-2.5 bg-[#1a3c6e] hover:bg-[#15305a] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors min-h-[44px] inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'à®®à¯€à®£à¯à®Ÿà¯à®®à¯ à®‡à®£à¯ˆà®•à¯à®• à®®à¯à®¯à®²à¯à®•' : 'Retry Connection'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* 1. Complete Government-Style Homepage */}
            {activeTab === 'landing' && (
              <LandingPage
                onOpenSubmit={handleOpenSubmit}
                onGoToCitizen={() => setActiveTab('citizen-portal')}
                onGoToTracker={handleTrackRefId}
                onGoToAdmin={handleNavigateToAdmin}
                onGoToOfficer={() => setActiveTab('officer-portal')}
                onGoToPublicDashboard={() => setActiveTab('public-dashboard')}
                onGoToServices={() => setActiveTab('services')}
                onGoToHowItWorks={() => setActiveTab('how-it-works')}
                onGoToAnnouncements={() => setActiveTab('announcements')}
                adminUser={adminUser}
                stats={stats}
                complaints={complaints}
                lang={lang}
              />
            )}

            <Suspense fallback={<ViewSkeleton />}>
              {/* 2. Dedicated Municipal Services Catalog */}
              {activeTab === 'services' && (
                <ServicesPage
                  onOpenSubmit={handleOpenSubmit}
                  lang={lang}
                />
              )}

              {/* 3. Dedicated How It Works Redressal Workflow */}
              {activeTab === 'how-it-works' && (
                <HowItWorksPage
                  onOpenSubmit={handleOpenSubmit}
                  onGoToTracker={handleTrackRefId}
                  onGoToPublicDashboard={() => setActiveTab('public-dashboard')}
                  lang={lang}
                />
              )}

              {/* 4. Dedicated Civic Announcements & Gazettes */}
              {activeTab === 'announcements' && (
                <AnnouncementsPage
                  adminUser={adminUser}
                  adminToken={adminToken}
                  onOpenSubmit={handleOpenSubmit}
                  lang={lang}
                />
              )}

              {/* 5. Dedicated About CivicResolve & Mission */}
              {activeTab === 'about' && (
                <AboutPage
                  onOpenSubmit={handleOpenSubmit}
                  onGoToTracker={handleTrackRefId}
                  lang={lang}
                />
              )}

              {/* 6. Emergency Contacts & Directory */}
              {activeTab === 'contact' && (
                <AboutPage
                  onOpenSubmit={handleOpenSubmit}
                  onGoToTracker={handleTrackRefId}
                  focusSection="contact"
                  lang={lang}
                />
              )}

              {/* 2. Public Transparency Dashboard (Phase 8 Recharts) */}
              {activeTab === 'public-dashboard' && (
                <PublicDashboard
                  stats={stats}
                  onBack={() => setActiveTab('landing')}
                  onOpenSubmit={handleOpenSubmit}
                  lang={lang}
                />
              )}

              {/* 3. Grievance Tracking View */}
              {activeTab === 'tracker' && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <ComplaintTracker
                    initialRefId={trackerInitialId}
                    onSelectComplaint={(c) => setSelectedComplaint(c)}
                    onViewReceipt={(c) => {
                      setReceiptComplaint(c);
                      setIsReceiptModalOpen(true);
                    }}
                    lang={lang}
                  />
                </div>
              )}

              {/* 4. Citizen Portal (Account, My Grievances, Feedback & Appeal) */}
              {activeTab === 'citizen-portal' && (
                <CitizenPortal
                  citizenUser={citizenUser}
                  onLogoutCitizen={handleCitizenLogout}
                  onOpenAuth={(m) => {
                    setCitizenAuthMode(m || 'otp');
                    setIsCitizenAuthOpen(true);
                  }}
                  onOpenSubmit={handleOpenSubmit}
                  onSelectComplaint={(c) => setSelectedComplaint(c)}
                  onViewReceipt={(c) => {
                    setReceiptComplaint(c);
                    setIsReceiptModalOpen(true);
                  }}
                  newGrievance={newlySubmittedCitizenGrievance}
                  lang={lang}
                />
              )}

              {/* 5. Public Complaints Explorer & Map */}
              {activeTab === 'citizen' && (
                <CitizenDashboard
                  complaints={complaints}
                  stats={stats}
                  onOpenSubmit={handleOpenSubmit}
                  onSelectComplaint={(c) => setSelectedComplaint(c)}
                />
              )}

              {/* 5. Officer Login */}
              {activeTab === 'admin-login' && (
                <AdminLogin
                  onLoginSuccess={handleAdminLoginSuccess}
                  onCancel={() => setActiveTab('landing')}
                />
              )}

              {/* 6. Officer Field Operations Desk */}
              {activeTab === 'officer-portal' && (
                adminUser ? (
                  <OfficerPortal
                    adminUser={adminUser}
                    onLogout={handleAdminLogout}
                    onSelectComplaint={(c) => setSelectedComplaint(c)}
                    lang={lang}
                  />
                ) : (
                  <AdminLogin
                    onLoginSuccess={handleAdminLoginSuccess}
                    onCancel={() => setActiveTab('landing')}
                  />
                )
              )}

              {/* 7. Officer Operations Command Center */}
              {activeTab === 'admin' && (
                adminUser ? (
                  <AdminDashboard
                    stats={stats}
                    complaints={complaints}
                    onRefresh={handleAdminRefresh}
                    onSelectComplaint={(c) => setSelectedComplaint(c)}
                    onManageComplaint={(c) => setManagingComplaint(c)}
                    adminUser={adminUser}
                    onLogout={handleAdminLogout}
                    lang={lang}
                  />
                ) : (
                  <AdminLogin
                    onLoginSuccess={handleAdminLoginSuccess}
                    onCancel={() => setActiveTab('landing')}
                  />
                )
              )}
            </Suspense>
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={(tab) => {
          if (tab === 'admin') {
            handleNavigateToAdmin();
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenSubmit={handleOpenSubmit}
        lang={lang}
      />

      {/* Modals Suite (Deferred Lazy Loading) */}
      <Suspense fallback={null}>
        {/* Grievance Submission Wizard */}
        <ComplaintFormModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSubmit={handleSubmitComplaint}
          isSubmitting={isSubmitting}
          initialCategory={submitModalCategory}
          citizenUser={citizenUser}
          lang={lang}
        />

        {/* Formal Government-Style Acknowledgement Slip */}
        <ReceiptModal
          complaint={receiptComplaint}
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          onTrack={handleTrackRefId}
          lang={lang}
        />

        {/* Citizen Authentication Modal */}
        <CitizenAuthModal
          isOpen={isCitizenAuthOpen}
          onClose={() => setIsCitizenAuthOpen(false)}
          onSuccess={handleCitizenLoginSuccess}
          initialMode={citizenAuthMode}
          lang={lang}
        />

        {/* Groq AI Telemetry Modal */}
        <AiAnalysisModal
          complaint={newlyCreatedComplaint}
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onViewDetails={(c) => {
            setIsAiModalOpen(false);
            setSelectedComplaint(c);
          }}
        />

        {/* Grievance Inspection Modal */}
        <ComplaintDetailsModal
          complaint={selectedComplaint}
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onManageComplaint={(c) => {
            if (adminUser) {
              setManagingComplaint(c);
            } else {
              setActiveTab('admin-login');
              showToast('Administrator authentication required to manage grievances.', 'error');
            }
          }}
        />

        {/* Officer Task Management Modal (e-Yantra Pattern) */}
        <AdminManageModal
          complaint={managingComplaint}
          isOpen={!!managingComplaint}
          onClose={() => setManagingComplaint(null)}
          onSave={handleManageComplaintSave}
          lang={lang}
        />
      </Suspense>

    </div>
  );
}
