import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import PublicDashboard from './components/PublicDashboard';
import CitizenDashboard from './components/CitizenDashboard';
import CitizenPortal from './components/CitizenPortal';
import ComplaintTracker from './components/ComplaintTracker';
import OfficerPortal from './components/OfficerPortal';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import ComplaintFormModal from './components/ComplaintFormModal';
import ReceiptModal from './components/ReceiptModal';
import CitizenAuthModal from './components/CitizenAuthModal';
import AiAnalysisModal from './components/AiAnalysisModal';
import ComplaintDetailsModal from './components/ComplaintDetailsModal';
import AdminManageModal from './components/AdminManageModal';
import ServicesPage from './components/ServicesPage';
import AnnouncementsPage from './components/AnnouncementsPage';
import HowItWorksPage from './components/HowItWorksPage';
import AboutPage from './components/AboutPage';
import Footer from './components/Footer';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { getApiUrl } from './config/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing'); // 'landing', 'tracker', 'citizen-portal', 'citizen', 'admin', 'admin-login'
  const [lang, setLang] = useState('en'); // 'en' or 'ta'
  
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
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [managingComplaint, setManagingComplaint] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [trackerInitialId, setTrackerInitialId] = useState('');

  const handleOpenSubmit = (cat) => {
    if (typeof cat === 'string' && cat.trim() !== '') {
      setSubmitModalCategory(cat);
    } else {
      setSubmitModalCategory('Road Damage');
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
          } else {
            localStorage.removeItem('civic_admin_token');
            localStorage.removeItem('civic_admin_user');
            setAdminToken(null);
            setAdminUser(null);
          }
        } catch (e) {
          console.warn('Admin session verify notice:', e.message);
        }
      }

      // 2. Check Citizen
      const storedCitizenToken = localStorage.getItem('civic_citizen_token');
      if (storedCitizenToken) {
        try {
          const res = await fetch(getApiUrl('/api/auth/citizen/me'), {
            headers: { 'Authorization': `Bearer ${storedCitizenToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCitizenUser(data.citizen);
          } else {
            localStorage.removeItem('civic_citizen_token');
            localStorage.removeItem('civic_citizen_user');
            setCitizenToken(null);
            setCitizenUser(null);
          }
        } catch (e) {
          console.warn('Citizen session verify notice:', e.message);
        }
      }
    };

    verifySessions();
  }, []);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setError(null);
      const [healthRes, statsRes, complaintsRes] = await Promise.all([
        fetch(getApiUrl('/api/health')).then(r => r.json()).catch(() => null),
        fetch(getApiUrl('/api/dashboard/stats')).then(r => r.json()).catch(() => null),
        fetch(getApiUrl('/api/complaints')).then(r => r.json()).catch(() => null)
      ]);

      if (healthRes && !healthRes.error) setHealth(healthRes);
      if (statsRes && !statsRes.error) setStats(statsRes);
      if (complaintsRes && complaintsRes.complaints) {
        setComplaints(complaintsRes.complaints);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Could not connect to CivicResolve Backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Handle Citizen Login Success
  const handleCitizenLoginSuccess = (token, citizen) => {
    setCitizenToken(token);
    setCitizenUser(citizen);
    localStorage.setItem('civic_citizen_token', token);
    localStorage.setItem('civic_citizen_user', JSON.stringify(citizen));
    showToast(`Welcome back, ${citizen.name}!`, 'success');
  };

  // Handle Citizen Logout
  const handleCitizenLogout = () => {
    localStorage.removeItem('civic_citizen_token');
    localStorage.removeItem('civic_citizen_user');
    setCitizenToken(null);
    setCitizenUser(null);
    showToast('Signed out of citizen account.', 'success');
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
      const created = result.complaint;

      // Close submission wizard
      setIsSubmitModalOpen(false);

      // Open Acknowledgement Slip Modal
      setReceiptComplaint(created);
      setIsReceiptModalOpen(true);
      setNewlyCreatedComplaint(created);

      // Refresh database records
      await fetchData();

      showToast(`Grievance ${created.ref_id} registered successfully!`, 'success');
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
        setLang={setLang}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold transition-all animate-in slide-in-from-bottom-5 ${
          toastMessage.type === 'error'
            ? 'bg-rose-900 text-white border-rose-800'
            : 'bg-slate-900 text-white border-teal-500/40'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-teal-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main View Container */}
      <main id="main-content" role="main" tabIndex="-1" className="flex-1 outline-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            <p className="text-sm font-semibold text-slate-600">Loading CivicResolve Telemetry...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-16 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="font-bold text-rose-900 text-base">Backend Connection Notice</h3>
            <p className="text-xs text-rose-700">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
            >
              Retry Connection
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
                  onRefresh={fetchData}
                  onSelectComplaint={(c) => setSelectedComplaint(c)}
                  onManageComplaint={(c) => setManagingComplaint(c)}
                  adminUser={adminUser}
                  onLogout={handleAdminLogout}
                />
              ) : (
                <AdminLogin
                  onLoginSuccess={handleAdminLoginSuccess}
                  onCancel={() => setActiveTab('landing')}
                />
              )
            )}
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

      {/* Modals Suite */}
      
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
      />

    </div>
  );
}
