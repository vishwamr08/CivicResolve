import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Clock, CheckCircle2, 
  MapPin, ArrowRight, Zap, Droplets, Trash2, Wrench, 
  Lightbulb, Activity, Sparkles, Building2, FileText, 
  Search, UserCheck, ChevronDown, PhoneCall, HelpCircle,
  Eye, Lock, BarChart3, Users, ExternalLink, Calendar,
  Shield, Check, AlertCircle, ArrowUpRight, Megaphone
} from 'lucide-react';
import { translations } from '../data/translations';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';
import ComplaintMap from './ComplaintMap';

export default function LandingPage({ 
  onOpenSubmit, 
  onGoToCitizen, 
  onGoToTracker, 
  onGoToAdmin,
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

  // Fetch live announcements from backend
  useEffect(() => {
    fetch('/api/announcements')
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
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements]);

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
  const totalRegistered = stats?.totalComplaints || 0;
  const inProgressCases = stats?.inProgressComplaints || 0;
  const resolvedCases = stats?.resolvedComplaints || 0;
  const overdueCases = stats?.overdueComplaints || 0;
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
      {announcements.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-slate-900 py-2.5 px-4 text-xs font-medium">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wide">
                <Megaphone className="w-3 h-3" />
                {lang === 'ta' ? 'அறிவிப்பு' : 'Public Notice'}
              </span>
              <p className="truncate text-slate-800">
                {lang === 'ta' 
                  ? (announcements[announcementIdx]?.title_ta || announcements[announcementIdx]?.title)
                  : announcements[announcementIdx]?.title
                }
              </p>
            </div>
            <span className="text-[10px] text-slate-500 flex-shrink-0 hidden sm:inline">
              {announcements[announcementIdx]?.department || 'Municipal Administration'}
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: PROFESSIONAL GOVERNMENT-STYLE HERO SECTION          */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        
        {/* Subtle geometric background watermark */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Government of Tamil Nadu • Municipal Redressal Prototype</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Report Issues. Track Action. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-200">
                Build Better Communities.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              Tamil Nadu's unified AI grievance redressal portal. Instant geotagging, municipal AI bilingual triage, and strict SLA timelines for 38 districts and 25 Municipal Corporations.
            </p>

          </div>

          {/* Quick Track Input Bar inside Hero */}
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleQuickTrack} className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2">
              <div className="pl-3 text-teal-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder={lang === 'ta' ? 'மனு எண் உள்ளிடவும் (e.g. CR-TN-2026-1042)' : 'Enter Complaint ID (e.g. CR-TN-2026-1042)'}
                value={quickTrackId}
                onChange={(e) => setQuickTrackId(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none px-2"
              />
              <button
                type="submit"
                className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs transition-colors shadow-md shadow-teal-500/20"
              >
                {lang === 'ta' ? 'நிலை அறி' : 'Track Status'}
              </button>
            </form>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTIONS 2, 3, 4: PROMINENT ACTION TILES                      */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            
            {/* Tile 1: Report a Grievance */}
            <div 
              onClick={() => onOpenSubmit('Road Damage')}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-teal-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-teal-300 transition-colors">
                    {lang === 'ta' ? 'மனு பதிவு செய்க' : 'Report Grievance'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Geotag civic hazards, dictate in Tamil or English, and attach photo evidence.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center text-xs font-bold text-teal-300 gap-1">
                <span>Start Filing</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 2: Track Your Complaint */}
            <div 
              onClick={() => onGoToTracker()}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-500/30">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-blue-300 transition-colors">
                    {lang === 'ta' ? 'மனு நிலை அறிய' : 'Track Grievance'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Follow 14-stage workflow timeline, officer remarks, and SLA countdown.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center text-xs font-bold text-blue-300 gap-1">
                <span>Track Action</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 3: Public Dashboard & Transparency */}
            <div 
              onClick={() => onGoToPublicDashboard ? onGoToPublicDashboard() : onGoToCitizen()}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/30">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                    {lang === 'ta' ? 'பொது தகவல் பலகை' : 'Public Dashboard'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Statewide resolution percentages, category volumes, and ward charts.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center text-xs font-bold text-indigo-300 gap-1">
                <span>View Analytics</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 4: Citizen Portal / Officer Desk */}
            <div 
              onClick={adminUser ? onGoToOfficer : onGoToCitizen}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/30">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                    {adminUser ? 'Officer Task Desk' : 'Citizen Mobile Portal'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {adminUser ? 'Inspect assigned tasks, upload repair proof, and manage cases.' : 'Mobile OTP sign-in, personal grievance history, and receipts.'}
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center text-xs font-bold text-amber-300 gap-1">
                <span>{adminUser ? 'Open Desk' : 'Citizen Login'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 6: LIVE PLATFORM STATISTICS FROM BACKEND DATABASE     */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Grievances</span>
            <p className="text-3xl font-extrabold text-slate-900">{totalRegistered}</p>
            <span className="text-[11px] text-teal-600 font-semibold flex items-center justify-center sm:justify-start gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
              Live SQLite Database
            </span>
          </div>

          <div className="space-y-1 text-center sm:text-left sm:pl-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Field Squads Deployed</span>
            <p className="text-3xl font-extrabold text-blue-600">{inProgressCases}</p>
            <span className="text-[11px] text-slate-500">Under Active Inspection</span>
          </div>

          <div className="space-y-1 text-center sm:text-left sm:pl-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Certified Resolved</span>
            <p className="text-3xl font-extrabold text-emerald-600">{resolvedCases}</p>
            <span className="text-[11px] text-emerald-600 font-semibold">{resolutionRate} Adherence</span>
          </div>

          <div className="space-y-1 text-center sm:text-left sm:pl-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI Triage SLA</span>
            <p className="text-3xl font-extrabold text-teal-600">&lt; 1.5s</p>
            <span className="text-[11px] text-slate-500">Automated Triage</span>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 7: GRIEVANCE CATEGORY SECTION WITH GUARANTEED SLAS    */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">Citizen Service Charter</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
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
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {cat.sla}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                      {lang === 'ta' ? cat.name_ta : cat.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {cat.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[150px]">{cat.dept}</span>
                  <span className="font-bold text-teal-600 group-hover:translate-x-0.5 transition-transform">Report →</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 8: HOW CIVICRESOLVE OPERATES (4-STEP WORKFLOW)        */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-slate-900 text-white py-16 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-teal-400 font-bold text-xs uppercase tracking-wider">Accountable Municipal Process</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              How CivicResolve Operates
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              From citizen geotag to verified municipal sign-off in 4 transparent stages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                desc: 'CivicResolve AI assesses hazard severity, flags safety risks, and attaches guaranteed SLA countdowns.'
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
              <div key={idx} className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl space-y-3 relative overflow-hidden group hover:border-teal-500/50 transition-colors">
                <span className="text-4xl font-black text-slate-700 font-mono block group-hover:text-teal-500/40 transition-colors">
                  {st.step}
                </span>
                <h3 className="font-bold text-base text-white">
                  {lang === 'ta' ? st.title_ta : st.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 9: PUBLIC COMPLAINT SNAPSHOTS & VERIFIED RESOLUTIONS  */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">Ground Reality</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Recent Verified Resolutions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Real citizen grievances resolved by municipal field engineering squads.
            </p>
          </div>
          <button
            onClick={() => onGoToTracker()}
            className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700"
          >
            <span>View Public Tracker</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displaySnapshots.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-sm">
                      {item.ref_id}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${
                      item.status === 'Resolved' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {item.resolution_remarks || item.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {item.district || 'Chennai'}
                </span>
                <button
                  onClick={() => onGoToTracker(item.ref_id)}
                  className="font-bold text-teal-600 hover:text-teal-700"
                >
                  Verify History →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 10: INTERACTIVE GRIEVANCE MAP (PRIVACY-PRESERVED)      */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-slate-100/70 border-y border-slate-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">Spatial Redressal</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Live Community Grievance Map
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Public coordinates are generalized to ward level to rigorously safeguard citizen residential privacy.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Resolved
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical Hazard
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm">
            <ComplaintMap complaints={complaints} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 11: DEPARTMENT INFORMATION & JURISDICTION HIERARCHY   */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">Jurisdiction Directory</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Nodal Departments & Civic Bodies
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Integrated municipal coordination across state and local municipal authorities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-2.5 py-1 rounded bg-slate-900 text-teal-300 font-mono">
                  {d.code}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Active Integration</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{d.name}</h3>
                <span className="text-[11px] text-slate-500 block">{d.name_ta}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                {d.role}
              </p>
              <div className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded">
                {d.jurisdiction}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 12: CITIZEN RIGHTS & CITIZEN CHARTER                   */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-teal-400 font-bold text-xs uppercase tracking-wider">Public Accountability</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Tamil Nadu Citizen Grievance Charter
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Guaranteed institutional rights protected under the CivicResolve platform architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Zero PII Leakage Guarantee</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                No phone number, email address, or residential location is ever exposed to public search engines. All public reference lookups display strictly masked data.
              </p>
            </div>

            <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Mandatory Photo Resolution Proof</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                A complaint cannot be closed by a field squad without geotagged before-and-after photographic evidence uploaded to the immutable audit database.
              </p>
            </div>

            <div className="bg-slate-800/90 border border-slate-700 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Statutory Reopening Appeal</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                If repairs are subpar or incomplete, the citizen possesses a 1-click Appeal & Reopen right. The case immediately escalates to the District Zonal Officer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 13: STATEWIDE DISTRICT REACH                           */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Statewide Coverage Across All 38 Districts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Standardized municipal jurisdiction hierarchy from corporation headquarters to village panchayat wards.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {TAMIL_NADU_DISTRICTS.slice(0, 24).map((d) => (
              <div 
                key={d.id} 
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center hover:border-teal-500 transition-colors"
              >
                <span className="font-bold text-xs text-slate-900 block">{d.name}</span>
                <span className="text-[10px] text-slate-500 block">{d.name_ta}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">
            + 14 additional districts including Ramanathapuram, Theni, Virudhunagar, Thiruvarur, and Dharmapuri.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 14: FREQUENTLY ASKED QUESTIONS (ACCORDIONS)            */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500">Everything you need to know about CivicResolve Redressal</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-teal-600' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-3 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 15: CONTACT AND SUPPORT DIRECTORY                      */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-slate-100/70 border-t border-slate-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Civic Helpline & Assistance Directory
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Round-the-clock municipal operations desks and emergency hotlines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Civic Redressal Central</span>
              <p className="text-2xl font-black text-slate-900">1100</p>
              <p className="text-xs text-slate-500">Toll-free 24/7 centralized municipal complaint helpline.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Electricity Emergency</span>
              <p className="text-2xl font-black text-slate-900">1912</p>
              <p className="text-xs text-slate-500">TANGEDCO power supply and live wire emergency response.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Drinking Water Support</span>
              <p className="text-2xl font-black text-slate-900">044-4567 4567</p>
              <p className="text-xs text-slate-500">CMWSSB 24x7 water distribution & sewer control room.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Official Email Support</span>
              <p className="text-base font-bold text-teal-700">grievance@civicresolve.gov</p>
              <p className="text-xs text-slate-500">Digital documentation and escalation desk.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 16: GOVERNMENT-STYLE FOOTER                           */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-slate-950 text-white border-t border-slate-800 pt-16 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <span className="font-extrabold text-xl tracking-tight text-white">CivicResolve</span>
                  <p className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">Tamil Nadu Municipal Redressal Prototype</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                CivicResolve is an independent, next-generation AI grievance redressal prototype designed for municipal corporations and panchayats across Tamil Nadu. Empowering citizens through real-time accountability, municipal AI triage, and verified field resolutions.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">Quick Links</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><button onClick={() => onOpenSubmit('Road Damage')} className="hover:text-white transition-colors">Submit Grievance</button></li>
                <li><button onClick={() => onGoToTracker()} className="hover:text-white transition-colors">Track Complaint</button></li>
                <li><button onClick={() => onGoToCitizen()} className="hover:text-white transition-colors">Citizen Mobile Portal</button></li>
                <li><button onClick={() => onGoToAdmin()} className="hover:text-white transition-colors">Municipal Command Center</button></li>
                <li><button onClick={() => onGoToOfficer()} className="hover:text-white transition-colors">Field Officer Desk</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">Security & Legal</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><span className="hover:text-white cursor-pointer">Citizen Privacy Charter</span></li>
                <li><span className="hover:text-white cursor-pointer">PII Masking Standards</span></li>
                <li><span className="hover:text-white cursor-pointer">Audit Logging Protocol</span></li>
                <li><span className="hover:text-white cursor-pointer">Terms of Service</span></li>
                <li><span className="hover:text-white cursor-pointer">Disclaimer Notice</span></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} CivicResolve Platform. Engineered for Tamil Nadu Municipal Operations.</p>
            <p className="text-slate-500">Independent Academic & Competition Prototype • Not affiliated with official government bodies.</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
