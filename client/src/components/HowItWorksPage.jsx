import React from 'react';
import { 
  Smartphone, Camera, Clock, CheckCircle2, 
  RotateCcw, Building2, ArrowRight, Award 
} from 'lucide-react';

export default function HowItWorksPage({ 
  onOpenSubmit, 
  onGoToTracker, 
  onGoToPublicDashboard, 
  lang = 'en' 
}) {
  const steps = [
    {
      number: '01',
      title: 'Citizen Registration & Ward Verification',
      title_ta: 'குடிமக்கள் பதிவு & வார்டு சரிபார்ப்பு',
      subtitle: 'Instant Mobile Onboarding',
      icon: Smartphone,
      color: 'teal',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      text: 'text-teal-600',
      description: 'Enter your 10-digit mobile phone number for secure authentication. The system maps your primary residential jurisdiction across Tamil Nadu’s 38 districts and municipal wards.',
      description_ta: 'உங்கள் அலைபேசி எண்ணை உள்ளிட்டு சரிபார்க்கவும். தமிழ்நாட்டின் 38 மாவட்டங்கள் மற்றும் வார்டுகளில் உங்கள் பகுதி தானாகப் பொருத்தப்படுகிறது.',
      deliverables: ['Zero Password Fatigue', 'Local Ward Mapping', 'Tamil & English Bilingual Interface']
    },
    {
      number: '02',
      title: 'Report Incident with Geo-Tagged Evidence',
      title_ta: 'புகைப்படம் & இருப்பிடத்துடன் மனு பதிவு',
      subtitle: 'AI Automated Triage',
      icon: Camera,
      color: 'blue',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-600',
      description: 'Capture a photo or upload an image of the civic issue. Built-in GPS auto-detects latitude and longitude with reverse geocoding, while municipal AI classifies category and priority.',
      description_ta: 'புகைப்படத்தை பதிவேற்றவும். ஜி.பி.எஸ் மூலம் தானாகவே முகவரி பெறப்பட்டு, ஏஐ மூலம் குறையின் அவசரம் கணிக்கப்படுகிறது.',
      deliverables: ['Real-Time GPS Location', 'AI Category Classification', 'Digital Acknowledgement Receipt']
    },
    {
      number: '03',
      title: 'Department Assignment & SLA Countdown',
      title_ta: 'துறை ஒதுக்கீடு & கால அவகாசக் கண்காணிப்பு',
      subtitle: 'Algorithmic Operational Dispatch',
      icon: Clock,
      color: 'amber',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-600',
      description: 'The complaint is instantly dispatched to the responsible municipal squad (GCC, CMWSSB, TANGEDCO). An unyielding SLA timer begins counting down according to the Citizen Charter.',
      description_ta: 'உரிய நகராட்சி துறைக்கு (சென்னை மாநகராட்சி, குடிநீர் வாரியம், மின்வாரியம்) உடனடியாக அனுப்பப்பட்டு தீர்வுக்கான கால வரம்பு தொடங்குகிறது.',
      deliverables: ['8 to 72-Hour Guaranteed SLAs', 'Duty Officer Designate', 'Live Status Tracking via Ref ID']
    },
    {
      number: '04',
      title: 'Ground Rectification, Audit & Appeal Window',
      title_ta: 'களப்பணி தீர்வு, ஆய்வு & மறுமுறையீடு',
      subtitle: 'Accountable Redressal',
      icon: CheckCircle2,
      color: 'emerald',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-600',
      description: 'The field crew uploads photographic proof of the completed repair. Citizens receive an SMS/email alert, can rate the quality of work, or exercise a 7-day right to appeal and reopen.',
      description_ta: 'சீரமைக்கப்பட்ட புகைப்படம் பதிவேற்றப்படுகிறது. பொதுமக்கள் தீர்வை மதிப்பீடு செய்யலாம் அல்லது தீர்வு முழுமையடையாவிடில் 7 நாட்களுக்குள் மறுமுறையீடு செய்யலாம்.',
      deliverables: ['Photo Proof of Resolution', 'Citizen Star Feedback', '7-Day Escalation Reopen Guarantee']
    }
  ];

  const slaStandards = [
    { category: 'Hazardous Power Cables & Sparking', dept: 'TANGEDCO', sla: '8 Hours', tier: 'Emergency' },
    { category: 'Garbage Overflow & Animal Carcasses', dept: 'Solid Waste Division', sla: '12 Hours', tier: 'Urgent' },
    { category: 'Drinking Water Pipe Bursts', dept: 'Metro Water (CMWSSB)', sla: '24 Hours', tier: 'High Priority' },
    { category: 'Sewage Overflow & Blocked Drains', dept: 'Drainage Department', sla: '24 Hours', tier: 'High Priority' },
    { category: 'Non-Functional Streetlights', dept: 'Electrical Works', sla: '24 Hours', tier: 'Standard' },
    { category: 'Road Potholes & Crater Repair', dept: 'Highways & Works', sla: '48 Hours', tier: 'Standard' },
    { category: 'Public Park & Bus Shelter Repairs', dept: 'Infrastructure Division', sla: '72 Hours', tier: 'Standard' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      
      {/* Hero Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-slate-950 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold tracking-wide mx-auto">
            <Award className="w-4 h-4 text-teal-400" />
            <span>{lang === 'ta' ? 'வெளிப்படையான செயல்முறை' : 'Structured 4-Phase Redressal Workflow'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto">
            {lang === 'ta' 
              ? 'குறைதீர்ப்பு எவ்வாறு செயல்படுகிறது?' 
              : 'How CivicResolve Operates'}
          </h1>

          <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
            {lang === 'ta'
              ? 'மனு பதிவு முதல் களப்பணி தீர்வு வரை முழுமையான கணினிமயமாக்கப்பட்ட, வெளிப்படையான வழிமுறை.'
              : 'From citizen submission through algorithmic departmental routing and field team resolution, explore every stage of the civic accountability cycle.'}
          </p>

          {/* Quick Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              <span>{lang === 'ta' ? 'இப்போதே மனு பதிவு செய்க' : 'Report a Grievance Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onGoToTracker && onGoToTracker()}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-extrabold text-xs transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-teal-400" />
              <span>{lang === 'ta' ? 'மனு நிலை அறிதல்' : 'Track an Existing Complaint'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Step Visual Process Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {lang === 'ta' ? 'நான்கு எளிய படிகளில் தீர்வு' : 'Four Steps to Guaranteed Municipal Resolution'}
          </h2>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Engineered with strict SLA milestones, photographic proof, and citizen audit authority.
          </p>
        </div>

        {/* Desktop Process Flow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.number}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group"
              >
                {/* Step Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-slate-300 group-hover:text-teal-600 transition-colors">
                      {step.number}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${step.text}`} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 block">
                      {step.subtitle}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                      {lang === 'ta' ? step.title_ta : step.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'ta' ? step.description_ta : step.description}
                  </p>

                  <div className="pt-2 space-y-1.5 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Key Highlights:
                    </span>
                    {step.deliverables.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <div className="w-full py-1.5 rounded-lg bg-slate-50 text-center font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                    Stage {idx + 1} of 4
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SLA Charter Standards Table */}
        <div className="mt-16 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {lang === 'ta' ? 'அரசு சேவை கால வரம்புகள் (Citizen Charter)' : 'Citizen Charter Guaranteed Turnaround SLAs'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Mandatory maximum resolution hours stipulated across Tamil Nadu civic divisions.
              </p>
            </div>
            <button
              onClick={() => onGoToPublicDashboard && onGoToPublicDashboard()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-teal-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <BarChart3 className="w-4 h-4 text-teal-400" />
              <span>Inspect Live Analytics</span>
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Grievance Nature</th>
                  <th className="py-3 px-4">Allocated Authority</th>
                  <th className="py-3 px-4">Charter SLA</th>
                  <th className="py-3 px-4">Priority Tier</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slaStandards.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.category}</td>
                    <td className="py-3.5 px-4 text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.dept}</span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-teal-700">{item.sla}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        item.tier === 'Emergency' ? 'bg-rose-100 text-rose-800' :
                        item.tier === 'Urgent' ? 'bg-amber-100 text-amber-800' :
                        item.tier === 'High Priority' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
                        className="text-xs font-bold text-teal-600 hover:text-teal-800"
                      >
                        Report Issue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Appeal Guarantee Notice */}
        <div className="mt-8 p-6 rounded-3xl bg-slate-100 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Right to Appeal & Reopen within 7 Days</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                If field repairs are unsatisfactory or incomplete, citizens can submit a photographic appeal to the Zonal Superintendent with 1-click from their Citizen Portal.
              </p>
            </div>
          </div>
          <button
            onClick={() => onGoToTracker && onGoToTracker()}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-800 hover:bg-slate-50 shadow-sm whitespace-nowrap"
          >
            Track My Grievance
          </button>
        </div>

      </div>

    </div>
  );
}