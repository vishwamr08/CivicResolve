import React, { useState, useEffect } from 'react';
import { 
  User, PlusCircle, Search, ShieldCheck, MapPin, 
  Clock, CheckCircle2, AlertTriangle, 
  Star, Printer, RefreshCw, Loader2, LogOut, ChevronRight,
  Settings, Lock, Save, Phone, Mail
} from 'lucide-react';
import { translations } from '../data/translations';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';
import { getApiUrl } from '../config/api';

export default function CitizenPortal({ 
  citizenUser, 
  onLogoutCitizen,
  onOpenAuth,
  onOpenSubmit,
  onSelectComplaint,
  onViewReceipt,
  lang = 'en'
}) {
  const [activeTab, setActiveTab] = useState('grievances'); // 'grievances' or 'settings'
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Feedback & Appeal State
  const [feedbackComplaint, setFeedbackComplaint] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [isAppealing, setIsAppealing] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  // Profile Settings State with resilient session autofetch
  const storedCitizen = (() => {
    try {
      const s = localStorage.getItem('civic_citizen_user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  })();
  const effectiveCitizen = citizenUser || storedCitizen;

  const [profileName, setProfileName] = useState(effectiveCitizen?.name || '');
  const [profilePhone, setProfilePhone] = useState(effectiveCitizen?.phone || '');
  const [profileDistrict, setProfileDistrict] = useState(effectiveCitizen?.district || 'Chennai');
  const [profileMunicipality, setProfileMunicipality] = useState(effectiveCitizen?.municipality || '');
  const [profileWard, setProfileWard] = useState(effectiveCitizen?.ward || '');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [whatsappNotifs, setWhatsappNotifs] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  const t = translations[lang] || translations.en;

  const fetchMyComplaints = async () => {
    const token = localStorage.getItem('civic_citizen_token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/citizen/my-complaints'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyComplaints(data.complaints || []);
      }
    } catch (e) {
      console.warn('Could not load citizen complaints:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileSettings = async () => {
    const token = localStorage.getItem('civic_citizen_token');
    if (!token) return;

    try {
      const res = await fetch(getApiUrl('/api/citizen/profile'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.profile;
        if (p) {
          setProfileName(p.name || '');
          setProfilePhone(p.phone || '');
          setProfileDistrict(p.district || 'Chennai');
          setProfileMunicipality(p.municipality || '');
          setProfileWard(p.ward || '');
          setEmailNotifs(Boolean(p.email_notifications));
          setSmsNotifs(Boolean(p.sms_notifications));
          setWhatsappNotifs(Boolean(p.whatsapp_notifications));
        }
      }
    } catch (e) {
      console.warn('Could not load profile settings:', e);
    }
  };

  useEffect(() => {
    let user = citizenUser;
    if (!user) {
      try {
        const saved = localStorage.getItem('civic_citizen_user');
        if (saved) user = JSON.parse(saved);
      } catch {}
    }

    if (user) {
      if (user.name) setProfileName(user.name);
      if (user.phone) setProfilePhone(user.phone);
      if (user.district) setProfileDistrict(user.district);
      if (user.municipality) setProfileMunicipality(user.municipality);
      if (user.ward) setProfileWard(user.ward);
      fetchMyComplaints();
      fetchProfileSettings();
    } else {
      setMyComplaints([]);
    }
  }, [citizenUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('civic_citizen_token');
    if (!token) return;

    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/citizen/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          district: profileDistrict,
          municipality: profileMunicipality,
          ward: profileWard,
          email_notifications: emailNotifs ? 1 : 0,
          sms_notifications: smsNotifs ? 1 : 0,
          whatsapp_notifications: whatsappNotifs ? 1 : 0,
          sms_consent: smsNotifs ? 1 : 0,
          whatsapp_consent: whatsappNotifs ? 1 : 0
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      // Update local storage representation
      try {
        const raw = localStorage.getItem('civic_citizen_user');
        if (raw) {
          const userObj = JSON.parse(raw);
          userObj.name = profileName;
          userObj.phone = profilePhone;
          userObj.district = profileDistrict;
          userObj.municipality = profileMunicipality;
          userObj.ward = profileWard;
          localStorage.setItem('civic_citizen_user', JSON.stringify(userObj));
        }
      } catch {}

      setProfileMsg({ type: 'success', text: 'Profile & administrative jurisdiction saved successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setResettingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch(getApiUrl('/api/auth/citizen/password-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: citizenUser.email,
          phone: citizenUser.phone || profilePhone,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackComplaint) return;

    setSubmittingFeedback(true);
    setFeedbackSuccess('');
    try {
      const citizenToken = localStorage.getItem('civic_citizen_token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(citizenToken ? { 'Authorization': `Bearer ${citizenToken}` } : {})
      };

      if (isAppealing) {
        const res = await fetch(getApiUrl(`/api/complaints/${feedbackComplaint.id || feedbackComplaint.ref_id}/appeal`), {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ 
            appeal_reason: appealReason,
            credential: citizenUser?.phone || citizenUser?.email
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to file appeal');
        setFeedbackSuccess('Grievance reopen request submitted for Zonal Officer review!');
      } else {
        const res = await fetch(getApiUrl(`/api/complaints/${feedbackComplaint.id || feedbackComplaint.ref_id}/feedback`), {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ 
            rating, 
            feedback: feedbackText,
            credential: citizenUser?.phone || citizenUser?.email
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');
        setFeedbackSuccess('Thank you! Your satisfaction feedback has been recorded.');
      }

      await fetchMyComplaints();
      setTimeout(() => {
        setFeedbackComplaint(null);
        setIsAppealing(false);
        setAppealReason('');
        setFeedbackText('');
        setFeedbackSuccess('');
      }, 2000);
    } catch (err) {
      alert(err.message || 'Error processing request');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const filteredList = myComplaints.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.title && c.title.toLowerCase().includes(term)) ||
      (c.ref_id && c.ref_id.toLowerCase().includes(term)) ||
      (c.location && c.location.toLowerCase().includes(term)) ||
      (c.category && c.category.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Profile Card */}
      {citizenUser ? (
        <div className="bg-[#0f2040] rounded-xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden border border-navy-850">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-navy-900 text-saffron text-xs font-semibold border border-saffron/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Citizen Session</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome, {citizenUser.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>District: <strong className="text-white font-semibold">{citizenUser.district || 'Chennai'}</strong></span>
                {citizenUser.municipality && (
                  <>
                    <span>•</span>
                    <span>Admin Body: <strong className="text-white font-semibold">{citizenUser.municipality}</strong></span>
                  </>
                )}
                {citizenUser.ward && (
                  <>
                    <span>•</span>
                    <span>Ward: <strong className="text-white font-semibold">{citizenUser.ward}</strong></span>
                  </>
                )}
                <span>•</span>
                <span>Mobile: <strong className="text-white font-mono">{citizenUser.phone || '9840XXXXXX'}</strong></span>
                <span>•</span>
                <span>Email: <strong className="text-white font-semibold">{citizenUser.email}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenSubmit}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white bg-saffron hover:bg-saffron-dark shadow-sm transition-colors text-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Grievance</span>
              </button>
              <button
                onClick={onLogoutCitizen}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-600 hover:bg-navy-900 text-slate-200 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-navy-50 text-navy-800 text-xs font-semibold border border-navy-200">
              <User className="w-3.5 h-3.5" />
              <span>Citizen Redressal Account</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Sign In to Access Your Personal Case Files
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Review personal grievance history, download formal receipt slips, inspect assigned officers, and provide satisfaction ratings upon resolution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-5 py-2.5 rounded-lg font-semibold text-xs text-white bg-navy-900 hover:bg-navy-950 shadow-sm transition-colors"
            >
              Citizen Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-5 py-2.5 rounded-lg font-semibold text-xs text-slate-800 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      )}

      {/* Citizen Navigation Tabs */}
      {citizenUser && (
        <div className="flex border-b border-slate-200 text-xs font-semibold gap-2">
          <button
            onClick={() => setActiveTab('grievances')}
            className={`flex items-center gap-1.5 py-3 px-4 rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'grievances'
                ? 'border-navy-900 text-slate-900 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>My Grievances <span className="tabular-nums">({myComplaints.length})</span></span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 py-3 px-4 rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'border-navy-900 text-slate-900 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-navy-800" />
            <span>Profile & Notification Settings</span>
          </button>
        </div>
      )}

      {/* TAB 1: GRIEVANCES */}
      {activeTab === 'grievances' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {t.myGrievances || 'My Registered Grievances'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track status, review field crew inspection remarks, or file an appeal if work was unsatisfactory.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search my grievances..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none bg-slate-50 focus:bg-white"
                />
              </div>
              <button
                onClick={fetchMyComplaints}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Complaints List / Empty State */}
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-navy-800 mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading your registered grievances...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-800 mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Grievances Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {citizenUser 
                  ? 'You have not submitted any complaints under this account yet. Click below to submit your first civic grievance.'
                  : 'Sign in to see complaints linked to your phone and email, or submit a new one.'}
              </p>
              <button
                onClick={onOpenSubmit}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs text-white bg-saffron hover:bg-saffron-dark shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Grievance</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredList.map((c) => {
                const isResolved = c.status === 'Resolved';
                return (
                  <div 
                    key={c.id || c.ref_id}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-colors bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-navy-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tabular-nums">
                          {c.ref_id}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          c.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          c.status === 'In Progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          c.status === 'Assigned' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                        {c.is_appealed ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                            Appealed by Citizen
                          </span>
                        ) : null}
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          Filed: {new Date(c.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 line-clamp-1">
                        {c.title}
                      </h3>

                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {c.district || 'Chennai'} {c.ward ? `• ${c.ward}` : ''}
                        </span>
                        <span>•</span>
                        <span>Dept: <strong className="text-slate-700 font-semibold">{c.department}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          SLA: <strong className="font-mono tabular-nums">{c.sla_hours || 24}h</strong>
                        </span>
                      </p>

                      {c.resolution_remarks && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mt-2">
                          <strong>Official Resolution Remark:</strong> {c.resolution_remarks}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onViewReceipt && onViewReceipt(c)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                        title="View Official Receipt"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Receipt</span>
                      </button>

                      <button
                        onClick={() => onSelectComplaint && onSelectComplaint(c)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold transition-colors"
                      >
                        <span>View File</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {isResolved && (
                        <button
                          onClick={() => {
                            setFeedbackComplaint(c);
                            setIsAppealing(false);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 text-navy-900 border border-navy-200 font-semibold text-xs transition-colors"
                        >
                          <Star className="w-3.5 h-3.5 text-saffron" />
                          <span>Rate / Appeal</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROFILE & NOTIFICATION PREFERENCES */}
      {activeTab === 'settings' && citizenUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Contact Details & Notification Preferences */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-navy-800" />
              <span>Contact & Alert Preferences</span>
            </h3>

            {profileMsg && (
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                profileMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Registered Phone (for SMS Updates)</label>
                <input
                  type="tel"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Home District</label>
                <select
                  value={profileDistrict}
                  onChange={(e) => setProfileDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 bg-white focus:outline-none"
                >
                  {TAMIL_NADU_DISTRICTS.map(d => (
                    <option key={d.id} value={d.name}>{d.name} ({d.name_ta})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Municipality / Corporation</label>
                  <input
                    type="text"
                    placeholder="e.g. Greater Chennai Corporation"
                    value={profileMunicipality}
                    onChange={(e) => setProfileMunicipality(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ward / Zone</label>
                  <input
                    type="text"
                    placeholder="e.g. Ward 114, Zone 9"
                    value={profileWard}
                    onChange={(e) => setProfileWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                <span className="font-semibold text-slate-900 block">Notification Channels:</span>
                
                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-navy-800" />
                    <div>
                      <p className="font-semibold text-slate-800">Email Status Notifications</p>
                      <p className="text-[11px] text-slate-500">Receive dispatch & resolution updates at {citizenUser.email}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className="w-4 h-4 text-navy-800 rounded focus:ring-navy-800"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-navy-800" />
                    <div>
                      <p className="font-semibold text-slate-800">SMS Text Alerts</p>
                      <p className="text-[11px] text-slate-500">I consent to receiving SMS alerts at {profilePhone || citizenUser.phone}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsNotifs}
                    onChange={(e) => setSmsNotifs(e.target.checked)}
                    className="w-4 h-4 text-navy-800 rounded focus:ring-navy-800"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs text-white bg-navy-900 hover:bg-navy-950 shadow-sm transition-colors disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Preferences</span>
              </button>
            </form>
          </div>

          {/* Password Reset */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="w-4 h-4 text-navy-800" />
              <span>Change Security Password</span>
            </h3>

            {passwordMsg && (
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                passwordMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={resettingPassword}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-xs text-slate-800 border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Satisfaction / Appeal Modal */}
      {feedbackComplaint && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isAppealing ? 'Appeal & Reopen Grievance' : 'Citizen Satisfaction Feedback'}
                </h3>
                <p className="text-xs text-slate-500 font-mono tabular-nums">Ref: {feedbackComplaint.ref_id}</p>
              </div>
              <button
                onClick={() => setFeedbackComplaint(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {feedbackSuccess ? (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{feedbackSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setIsAppealing(false)}
                    className={`flex-1 py-2 text-center transition-colors ${
                      !isAppealing ? 'bg-navy-900 text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Satisfied (Provide Rating)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAppealing(true)}
                    className={`flex-1 py-2 text-center transition-colors ${
                      isAppealing ? 'bg-rose-700 text-white font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Unsatisfied (Appeal & Reopen)
                  </button>
                </div>

                {!isAppealing ? (
                  <>
                    <div className="text-center py-2 space-y-2">
                      <span className="text-xs text-slate-600 block">Rate the quality and speed of resolution:</span>
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="p-1 transition-colors"
                          >
                            <Star className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Feedback / Remarks:
                      </label>
                      <textarea
                        rows={3}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Share your feedback regarding the resolution quality..."
                        className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <strong>Citizen Reopening Right:</strong> If the issue was not fully rectified, your appeal will escalate this grievance directly to the Zonal Supervisory Officer for re-investigation.
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Reason for Reopening <span className="text-rose-600">*</span>:
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={appealReason}
                        onChange={(e) => setAppealReason(e.target.value)}
                        placeholder="Explain why the resolution is incomplete (e.g. pothole only partially filled, drain still choked)..."
                        className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className={`w-full py-2.5 rounded-lg font-semibold text-xs text-white transition-colors ${
                    isAppealing 
                      ? 'bg-rose-700 hover:bg-rose-800' 
                      : 'bg-navy-900 hover:bg-navy-950'
                  }`}
                >
                  {submittingFeedback ? 'Submitting...' : isAppealing ? 'Submit Reopening Appeal' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
