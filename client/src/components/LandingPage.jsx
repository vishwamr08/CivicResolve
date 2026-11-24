import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle2,
  MapPin, ArrowRight, Zap, Droplets, Trash2, Lightbulb, Activity, Building2, FileText,
  Search, UserCheck, ChevronDown, Eye, Lock, BarChart3, ArrowUpRight, Megaphone, Clock, Loader2
} from 'lucide-react';
import { translations } from '../data/translations';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';
import { getAssetUrl, getApiUrl } from '../config/api';

const ComplaintMap = React.lazy(() => import('./ComplaintMap'));

export default function LandingPage({
  onOpenSubmit,
  onGoToCitizen,
  onGoToTracker,
  _onGoToAdmin,
  onGoToOfficer,
  onGoToPublicDashboard,
  onGoToServices,
  onGoToHowItWorks,
  onGoToAnnouncements,
  adminUser,
  stats,
  complaints = [],
  lang = 'en'
}) {
  const [openFaq, setOpenFaq] = useState(null);
  const [quickTrackId, setQuickTrackId] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [announcementIdx, setAnnouncementIdx] = useState(0);

  const t = translations[lang] || translations.en;

  // Fallback realistic announcements to guarantee initial pre-deployment contents
  const defaultAnnouncements = [
    {
      id: 1,
      title: 'Emergency Storm Drain Desilting Drive Across Chennai & Coastal Districts',
      title_ta: 'சென்னை மற்றும் கடலோர மாவட்டங்களில் அவசர மழைநீர் வடிகால் தூர்வாரும் பணி',
      department: 'Greater Chennai Corporation (GCC)',
      priority: 'High'
    },
    {
      id: 2,
      title: 'Underground Drainage Network Replacement in Coimbatore Central Zone',
      title_ta: 'கோயம்புத்தூர் மத்திய மண்டலத்தில் பாதாள சாக்கடை விரிவாக்கப் பணி',
      department: 'Coimbatore City Municipal Corporation',
      priority: 'Normal'
    },
    {
      id: 3,
      title: 'LED Luminaire & Feeder Automation Along Madurai Heritage Corridors',
      title_ta: 'மதுரை பாரம்பரிய பாதைகளில் எல்இடி விளக்குகள் மற்றும் மின் விநியோக மேம்பாடு',
      department: 'Madurai Municipal Corporation',
      priority: 'Normal'
    }
  ];

  const activeAnnouncements = announcements.length > 0 ? announcements : defaultAnnouncements;

  // Fetch live announcements from backend
  useEffect(() => {
    fetch(getApiUrl('/api/announcements'))
      .then(r => r.json())
      .then(d => {
        if (d && d.announcements && d.announcements.length > 0) {
          setAnnouncements(d.announcements);
        }
      })
      .catch(() => {});
  }, []);

  // Cycle announcements ticker every 5 seconds
  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;
    const interval = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % activeAnnouncements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeAnnouncements]);

  const handleQuickTrack = (e) => {
    e.preventDefault();
    if (quickTrackId.trim()) {
      onGoToTracker(quickTrackId.trim());
    }
  };

  const categories = [
    {
      id: 'Road Damage',
      name: 'Road Damage & Potholes',
      name_ta: 'சாலை பழுது மற்றும் குழிகள்',
      icon: AlertTriangle,
      sla: '24 Hours',
      dept: 'Highways & Municipal Roads',
      desc: 'Potholes, broken asphalt, cave-ins, and uneven road surface hazards.'
    },
    {
      id: 'Garbage and Sanitation',
      name: 'Solid Waste & Sanitation',
      name_ta: 'திடக்கழிவு மற்றும் துப்புரவு',
      icon: Trash2,
      sla: '12 Hours',
      dept: 'Solid Waste Management',
      desc: 'Overflowing dumpsters, delayed garbage collection, and bio-waste disposal.'
    },
    {
      id: 'Water Leakage',
      name: 'Drinking Water Supply',
      name_ta: 'குடிநீர் கசிவு மற்றும் விநியோகம்',
      icon: Droplets,
      sla: '12 Hours',
      dept: 'CMWSSB / TWAD Board',
      desc: 'Pipeline bursts, contaminated municipal water lines, and low pressure.'
    },
    {
      id: 'Drainage & Flooding',
      name: 'Stormwater & Drainage',
      name_ta: 'மழைநீர் வடிகால் மற்றும் கழிவுநீர்',
      icon: Droplets,
      sla: '24 Hours',
      dept: 'Stormwater Drainage Wing',
      desc: 'Blocked culverts, overflowing manholes, and monsoon waterlogging.'
    },
    {
      id: 'Streetlight',
      name: 'Streetlights & High-Mast',
      name_ta: 'தெருவிளக்குகள் மற்றும் விளக்கு கம்பங்கள்',
      icon: Lightbulb,
      sla: '8 Hours',
      dept: 'Public Lighting Division',
      desc: 'Dark corridors, burnt LED luminaires, and damaged feeder pillars.'
    },
    {
      id: 'Electricity Hazards',
      name: 'Electricity & Live Wires',
      name_ta: 'மின்சார ஆபத்துகள்',
      icon: Zap,
      sla: '4 Hours (Emergency)',
      dept: 'TANGEDCO Distribution',
      desc: 'Snapped live overhead conductors, leaning poles, and transformer sparks.'
    },
    {
      id: 'Public Health',
      name: 'Public Health & Fogging',
      name_ta: 'பொது சுகாதாரம் மற்றும் கொசு ஒழிப்பு',
      icon: Activity,
      sla: '24 Hours',
      dept: 'Municipal Health Dept',
      desc: 'Mosquito breeding, stagnant cesspools, and sanitary fumigation.'
    },
    {
      id: 'Parks & Encroachments',
      name: 'Parks & Civic Amenities',
      name_ta: 'பூங்காக்கள் மற்றும் ஆக்கிரமிப்புகள்',
      icon: Building2,
      sla: '48 Hours',
      dept: 'Town Planning & Parks',
      desc: 'Damaged play equipment, public park maintenance, and footpath obstacles.'
    }
  ];

  const faqs = [
    {
      q: 'What is CivicResolve and how does it assist citizens?',
      a: 'CivicResolve is Tamil Nadu’s AI-powered municipal grievance redressal platform. It allows citizens to report civic hazards with GPS geotagging and photo evidence. The system utilizes municipal AI to automatically classify the hazard, calculate guaranteed resolution SLAs, and directly dispatch field squads.'
    },
    {
      q: 'Can I report grievances in Tamil or Tanglish?',
      a: 'Yes, absolutely. CivicResolve natively understands complaints entered in Tamil script (தமிழ்), Tanglish, and English. The bilingual AI engine summarizes inputs and maps them accurately to the appropriate municipal department.'
    },
    {
      q: 'How does CivicResolve safeguard citizen privacy?',
      a: 'CivicResolve implements strict PII masking. When searching a public reference ID, all phone numbers, email addresses, and full names are masked. Complete case records are accessible only to the verified citizen after OTP verification or sign-in.'
    },
    {
      q: 'What can I do if a complaint is marked resolved but the work is incomplete?',
      a: 'Every citizen has full reopening rights. If an issue is marked resolved but incomplete, you can click "Appeal & Reopen" on the tracking page. The complaint is immediately escalated to the Zonal Supervising Officer for re-inspection.'
    },
    {
      q: 'How does Mobile OTP verification work?',
      a: 'Citizens can sign up or log in using just their 10-digit mobile number. CivicResolve sends a cryptographically secure 6-digit OTP to your registered phone, ensuring instant, password-free access without collecting sensitive personal identity numbers.'
    }
  ];

  // Actual Database Statistics
  const totalRegistered = stats?.totalComplaints ?? 0;
  const inProgressCases = stats?.inProgressComplaints ?? 0;
  const resolvedCases = stats?.resolvedComplaints ?? 0;
  const _overdueCases = stats?.overdueComplaints ?? 0;
  const resolutionRate = stats?.slaResolutionRate || (totalRegistered > 0 ? `${Math.round((resolvedCases / totalRegistered) * 100)}%` : '0%');

  // Filter complaints for snapshots (show resolved ones first)
  const resolvedSnapshots = complaints.filter(c => c.status === 'Resolved').slice(0, 3);
  const fallbackSnapshots = complaints.slice(0, 3);
  const displaySnapshots = resolvedSnapshots.length > 0 ? resolvedSnapshots : fallbackSnapshots;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">

      {/* ------------------------------------------------------------- */}
      {/* SECTION 5: IMPORTANT SERVICE ANNOUNCEMENTS TICKER BANNER       */}
      {/* ------------------------------------------------------------- */}
      {activeAnnouncements.length > 0 && (
        <div
          onClick={() => onGoToAnnouncements && onGoToAnnouncements()}
          className="bg-amber-500/10 border-b border-amber-500/20 text-slate-900 py-2.5 px-4 text-xs font-medium cursor-pointer hover:bg-amber-500/15 transition-colors"
          title="Click to view all municipal announcements"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wide">
                <Megaphone className="w-3 h-3" />
                {lang === 'ta' ? 'அறிவிப்பு' : 'Public Notice'}
              </span>
              <p className="truncate text-slate-800">
                {lang === 'ta'
                  ? (activeAnnouncements[announcementIdx]?.title_ta || activeAnnouncements[announcementIdx]?.title)
                  : activeAnnouncements[announcementIdx]?.title
                }
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                {activeAnnouncements[announcementIdx]?.department || 'Municipal Administration'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600 hidden sm:inline" />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: CIVICRESOLVE HERO SECTION                          */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-gradient-to-b from-[#0a1628] via-[#0f2040] to-[#1a3c6e] text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-navy-900 relative">
        <div className="max-w-6xl mx-auto space-y-8 relative z-10 text-center">

          <div className="max-w-3xl mx-auto space-y-4">

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 border border-white/20 text-slate-200 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#138808]"></span>
              <span>Government of Tamil Nadu • Citizen Grievance Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Transparent Grievance Redressal for Citizens & Communities
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl mx-auto">
              Report municipal issues with GPS geotagging, monitor statutory SLA resolution countdowns, and hold local administrative wings accountable across Tamil Nadu.
            </p>

            {/* Hero Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => onOpenSubmit('Road Damage')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#f47920] hover:bg-[#d96810] text-white font-semibold text-xs shadow-sm transition-colors"
              >
                <span>File a Grievance</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onGoToTracker()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 transition-colors"
              >
                <span>Track Existing Grievance</span>
              </button>
            </div>

          </div>

          {/* Quick Track Input Bar inside Hero */}
          <div className="max-w-xl mx-auto pt-2">
            <form onSubmit={handleQuickTrack} className="bg-white/10 p-1.5 rounded-xl border border-white/20 shadow-lg flex items-center gap-2">
              <div className="pl-3 text-[#f47920]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder={lang === 'ta' ? 'மனு எண் உள்ளிடவும் (e.g. CR-TN-2026-1042)' : 'Enter Reference ID (e.g. CR-TN-2026-1042)...'}
                value={quickTrackId}
                onChange={(e) => setQuickTrackId(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-300 text-xs sm:text-sm font-mono focus:outline-none px-2 uppercase tracking-wide"
              />
              <button
                type="submit"
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-[#f47920] hover:bg-[#d96810] text-white font-semibold text-xs transition-colors shadow-sm"
              >
                {lang === 'ta' ? 'நிலை அறி' : 'Track Status'}
              </button>
            </form>
          </div>

          {/* 4 Prominent Civic Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-left">

            {/* Tile 1: Report a Grievance */}
            <div
              onClick={() => onOpenSubmit('Road Damage')}
              className="bg-white/10 hover:bg-white/15 border border-white/15 p-5 rounded-xl cursor-pointer transition-colors group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-[#f47920] text-white flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-orange-200 transition-colors">
                    {lang === 'ta' ? 'மனு பதிவு செய்க' : 'Report Grievance'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Geotag civic hazards, dictate in Tamil or English, and attach photo evidence.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center text-xs font-semibold text-[#f47920] gap-1">
                <span>Start Filing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Tile 2: Track Your Complaint */}
            <div
              onClick={() => onGoToTracker()}
              className="bg-white/10 hover:bg-white/15 border border-white/15 p-5 rounded-xl cursor-pointer transition-colors group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-[#2a5298] text-white flex items-center justify-center font-bold">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-blue-200 transition-colors">
                    {lang === 'ta' ? 'மனு நிலை அறிய' : 'Track Grievance'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Follow end-to-end status milestones, officer inspection remarks, and SLA timer.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center text-xs font-semibold text-blue-300 gap-1">
                <span>Track Action</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Tile 3: Public Dashboard & Transparency */}
            <div
              onClick={() => onGoToPublicDashboard ? onGoToPublicDashboard() : onGoToCitizen()}
              className="bg-white/10 hover:bg-white/15 border border-white/15 p-5 rounded-xl cursor-pointer transition-colors group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-slate-200 transition-colors">
                    {lang === 'ta' ? 'பொது தகவல் பலகை' : 'Public Dashboard'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    District-wise resolution rates, category volumes, and municipal performance metrics.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center text-xs font-semibold text-slate-300 gap-1">
                <span>View Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Tile 4: Citizen Portal / Officer Desk */}
            <div
              onClick={adminUser ? onGoToOfficer : onGoToCitizen}
              className="bg-white/10 hover:bg-white/15 border border-white/15 p-5 rounded-xl cursor-pointer transition-colors group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-[#138808] text-white flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-emerald-200 transition-colors">
                    {adminUser ? 'Officer Task Desk' : 'Citizen Mobile Portal'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {adminUser ? 'Inspect assigned tasks, upload repair proof, and manage cases.' : 'Mobile OTP sign-in, personal grievance history, and receipts.'}
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center text-xs font-semibold text-emerald-300 gap-1">
                <span>{adminUser ? 'Open Desk' : 'Citizen Login'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: STATISTIC COUNTER CARDS                            */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1: Total Filed */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Grievances</span>
              <div className="w-8 h-8 rounded-lg bg-navy-50 text-[#1a3c6e] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#1a3c6e] tabular-nums">{totalRegistered}</p>
            <span className="text-[11px] text-[#1a3c6e] font-medium mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a3c6e]"></span>
              Registered Citizen Records
            </span>
          </div>

          {/* Card 2: Under Review */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#d96810]">Under Field Review</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#f47920] flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#f47920] tabular-nums">{inProgressCases}</p>
            <span className="text-[11px] text-[#d96810] font-medium mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f47920]"></span>
              Under Active Resolution
            </span>
          </div>

          {/* Card 3: Resolved Successfully */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#138808]">Certified Resolved</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#138808] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#138808] tabular-nums">{resolvedCases}</p>
            <span className="text-[11px] text-[#138808] font-medium mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#138808]"></span>
              <span className="tabular-nums">{resolutionRate}</span> Resolution Adherence
            </span>
          </div>

          {/* Card 4: SLA Target */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Statutory SLA</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2a5298] flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#2a5298] tabular-nums">&lt; 24h</p>
            <span className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2a5298]"></span>
              Guaranteed Escalation
            </span>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: GRIEVANCE CATEGORY SECTION WITH GUARANTEED SLAS    */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <span className="text-[#f47920] font-semibold text-xs uppercase tracking-wider">Citizen Service Charter</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Select a Grievance Category
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Each civic category is bound to legally standardized resolution windows with automated escalation timers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() => onOpenSubmit(cat.id)}
                className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-[#1a3c6e] flex items-center justify-center group-hover:bg-[#1a3c6e] group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
                      {cat.sla}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#1a3c6e] transition-colors">
                      {lang === 'ta' ? cat.name_ta : cat.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[150px]">{cat.dept}</span>
                  <span className="font-semibold text-[#f47920] group-hover:translate-x-0.5 transition-transform">Report →</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => onGoToServices && onGoToServices()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 shadow-sm transition-colors"
          >
            <span>Explore All Municipal Services & Guaranteed SLAs</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1a3c6e]" />
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 4: HOW CIVICRESOLVE OPERATES (4-STEP WORKFLOW)        */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-[#0f2040] text-white py-14 border-y border-navy-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <span className="text-[#f47920] font-semibold text-xs uppercase tracking-wider">Accountable Municipal Process</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How Grievance Redressal Operates
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              From citizen geotag to verified municipal sign-off in 4 transparent stages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                step: '01',
                title: 'Geotag & Submit',
                title_ta: 'புவிக்குறியீடு & மனு பதிவு',
                desc: 'Citizen pins precise location, uploads photo proof, and submits with optional voice/text in Tamil or English.'
              },
              {
                step: '02',
                title: 'Intelligent AI Triage',
                title_ta: 'AI வகைப்பாடு & முன்னுரிமை',
                desc: 'CivicResolve assesses hazard severity, flags safety risks, and attaches guaranteed SLA countdowns.'
              },
              {
                step: '03',
                title: 'Field Squad Dispatch',
                title_ta: 'களப்பணி பிரிவு ஒதுக்கீடு',
                desc: 'Grievance is auto-routed to the jurisdictional zonal engineer, municipal ward crew, or TANGEDCO division.'
              },
              {
                step: '04',
                title: 'Verified Resolution',
                title_ta: 'சரிபார்க்கப்பட்ட தீர்வு',
                desc: 'Field squads upload repair proof photos. Citizens certify satisfaction or exercise 1-click reopening rights.'
              }
            ].map((st, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-2.5 hover:border-white/20 transition-colors">
                <span className="text-2xl font-bold text-orange-400 font-mono block tabular-nums">
                  {st.step}
                </span>
                <h3 className="font-semibold text-sm text-white">
                  {lang === 'ta' ? st.title_ta : st.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => onGoToHowItWorks && onGoToHowItWorks()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 transition-colors"
            >
              <span>Learn Detailed Redressal Process & Appeals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 5: PUBLIC COMPLAINT SNAPSHOTS & VERIFIED RESOLUTIONS  */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[#f47920] font-semibold text-xs uppercase tracking-wider">Ground Reality</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Recent Verified Resolutions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Real citizen grievances resolved by municipal field engineering squads.
            </p>
          </div>
          <button
            onClick={() => onGoToTracker()}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1a3c6e] hover:text-[#2a5298] transition-colors"
          >
            <span>View Public Tracker</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {displaySnapshots.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No verified grievance records are available yet.</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All live complaints filed by citizens across Tamil Nadu will be tracked here transparently once verified.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displaySnapshots.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={getAssetUrl(item.image_url)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
                        <MapPin className="w-8 h-8 text-slate-300" />
                        <span className="text-[11px] font-medium text-slate-400">Verified Geotagged Record</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900/85 text-white">
                        {item.ref_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.status === 'Resolved' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3c6e] bg-navy-50 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.resolution_remarks || item.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {item.district || 'Tamil Nadu'}
                  </span>
                  <button
                    onClick={() => onGoToTracker(item.ref_id)}
                    className="font-semibold text-[#1a3c6e] hover:text-[#2a5298] transition-colors"
                  >
                    Verify History →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 6: INTERACTIVE GRIEVANCE MAP (PRIVACY-PRESERVED)      */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-slate-100/70 border-y border-slate-200 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[#1a3c6e] font-semibold text-xs uppercase tracking-wider">Spatial Redressal</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Live Community Grievance Map
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Public coordinates are generalized to ward level to rigorously safeguard citizen residential privacy.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Resolved
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Critical Hazard
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm min-h-[420px]">
            <React.Suspense fallback={
              <div className="h-[420px] w-full bg-slate-50 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-medium animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                <span>Loading Municipal Grievance Map...</span>
              </div>
            }>
              <ComplaintMap complaints={complaints} />
            </React.Suspense>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 7: DEPARTMENT INFORMATION & JURISDICTION HIERARCHY   */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <span className="text-[#f47920] font-semibold text-xs uppercase tracking-wider">Jurisdiction Directory</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Nodal Departments & Civic Bodies
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Integrated municipal coordination across state and local municipal authorities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              code: 'GCC',
              name: 'Greater Chennai Corporation',
              name_ta: 'பெருநகர சென்னை மாநகராட்சி',
              jurisdiction: '15 Zones, 200 Wards (Chennai District)',
              role: 'Road repairs, solid waste clearing, storm water drains, street illumination.'
            },
            {
              code: 'TANGEDCO',
              name: 'Tamil Nadu Power Generation & Distribution',
              name_ta: 'தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மான கழகம்',
              jurisdiction: 'Statewide 38 Districts',
              role: 'Hazardous overhead lines, transformer sparks, leaning electric poles.'
            },
            {
              code: 'CMWSSB / TWAD',
              name: 'Metro Water & Tamil Nadu Water Supply Board',
              name_ta: 'சென்னை பெருநகர் குடிநீர் வழங்கல் மற்றும் கழிவுநீரகற்று வாரியம்',
              jurisdiction: 'Urban & Rural Municipalities',
              role: 'Drinking water pipeline welding, sewage overflows, contamination prevention.'
            },
            {
              code: 'HIGHWAYS',
              name: 'Tamil Nadu Highways Department',
              name_ta: 'நெடுஞ்சாலைத்துறை',
              jurisdiction: 'State & Major District Corridors',
              role: 'Arterial road craters, bridge expansion joints, highway median lighting.'
            },
            {
              code: 'HEALTH',
              name: 'Directorate of Public Health & Preventive Medicine',
              name_ta: 'பொது சுகாதாரம் மற்றும் நோய் தடுப்பு மருந்துத்துறை',
              jurisdiction: 'Municipal & Panchayat Unions',
              role: 'Mosquito abatement, anti-larval fogging, epidemic vector mitigation.'
            },
            {
              code: 'TOWN PLANNING',
              name: 'Directorate of Municipal Administration',
              name_ta: 'நகராட்சி நிர்வாக இயக்ககம்',
              jurisdiction: '25 Corporations, 121 Municipalities',
              role: 'Footpath encroachments, municipal parks, public amenity repairs.'
            }
          ].map((d, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-navy-50 text-[#1a3c6e] font-mono">
                  {d.code}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Integrated</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900">{d.name}</h3>
                <span className="text-[11px] text-slate-500 block">{d.name_ta}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                {d.role}
              </p>
              <div className="text-[10px] font-medium text-[#1a3c6e] bg-slate-50 px-2 py-1 rounded border border-slate-100">
                {d.jurisdiction}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 8: CITIZEN RIGHTS & CITIZEN CHARTER                   */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-[#0f2040] text-white py-14 border-y border-navy-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <span className="text-[#f47920] font-semibold text-xs uppercase tracking-wider">Public Accountability</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tamil Nadu Citizen Grievance Charter
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Guaranteed institutional rights protected under the CivicResolve platform architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-[#f47920] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-white">Zero PII Leakage Guarantee</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                No phone number, email address, or residential location is ever exposed to public search engines. All public reference lookups display strictly masked data.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-white">Mandatory Photo Resolution Proof</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                A complaint cannot be closed by a field squad without geotagged before-and-after photographic evidence uploaded to the immutable audit database.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-white">Statutory Reopening Appeal</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                If repairs are subpar or incomplete, the citizen possesses a 1-click Appeal & Reopen right. The case immediately escalates to the District Zonal Officer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 9: STATEWIDE DISTRICT REACH                           */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t.tnCoverageTitle || 'Statewide Coverage Across All 38 Districts'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {t.tnCoverageSub || 'Standardized municipal jurisdiction hierarchy across 25 Municipal Corporations to town panchayats and village wards.'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {TAMIL_NADU_DISTRICTS.map((d) => (
              <div
                key={d.id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-center hover:border-slate-300 hover:bg-slate-100 transition-colors"
              >
                <span className="font-semibold text-xs text-slate-900 block">{d.name}</span>
                <span className="text-[10px] text-slate-500 block">{d.name_ta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 10: FREQUENTLY ASKED QUESTIONS (ACCORDIONS)           */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-white border-t border-slate-200 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500">Everything you need to know about CivicResolve Redressal</p>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-xs transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left font-semibold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-[#1a3c6e]' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-3 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => onGoToHowItWorks && onGoToHowItWorks()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
            >
              <span>Learn Detailed Redressal Process & Appeals</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1a3c6e]" />
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 11: CONTACT AND SUPPORT DIRECTORY                     */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-slate-100/70 border-t border-slate-200 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Civic Helpline & Assistance Directory
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Round-the-clock municipal operations desks and emergency hotlines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Civic Redressal Central</span>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">1100</p>
              <p className="text-xs text-slate-500 leading-relaxed">Toll-free 24/7 centralized municipal complaint helpline.</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Electricity Emergency</span>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">1912</p>
              <p className="text-xs text-slate-500 leading-relaxed">TANGEDCO power supply and live wire emergency response.</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Drinking Water Support</span>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">044-4567 4567</p>
              <p className="text-xs text-slate-500 leading-relaxed">CMWSSB 24x7 water distribution & sewer control room.</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Official Email Support</span>
              <p className="text-base font-semibold text-[#1a3c6e]">grievance@civicresolve.gov</p>
              <p className="text-xs text-slate-500 leading-relaxed">Digital documentation and escalation desk.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 12: READY TO REPORT GRIEVANCE (BOTTOM CTA)            */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-gradient-to-r from-[#0a1628] via-[#0f2040] to-[#1a3c6e] text-white py-14 px-4 sm:px-6 lg:px-8 border-t border-navy-800 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 border border-white/20 text-xs font-semibold text-[#f47920]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f47920]"></span>
            <span>Civic Engagement Platform</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Need to Report a Civic Issue in Your Ward?
          </h2>
          <p className="text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
            Report civic hazards directly to municipal zonal engineers, attach photographic proof, and track time-bound statutory resolutions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenSubmit('Road Damage')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#f47920] hover:bg-[#d96810] text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <span>File a Grievance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onGoToTracker()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 transition-colors"
            >
              <span>Track Existing Ticket</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
