import React, { useEffect, useRef } from 'react';
import { 
  ShieldCheck, PhoneCall, Lock, Cpu, 
  FileText, ArrowRight, Clock 
} from 'lucide-react';

export default function AboutPage({ 
  onOpenSubmit, 
  onGoToTracker, 
  focusSection = null, 
  lang = 'en' 
}) {
  const contactRef = useRef(null);

  useEffect(() => {
    if (focusSection === 'contact' && contactRef.current) {
      contactRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [focusSection]);

  const emergencyHelplines = [
    { title: 'Chief Minister Helpline (CM Cell)', number: '1100', desc: 'Unified State Public Grievance Helpline', color: 'teal' },
    { title: 'TANGEDCO Electricity Board', number: '1912', desc: 'Power Outages, Cable Sparking & Billing', color: 'rose' },
    { title: 'Greater Chennai Corporation (GCC)', number: '1913', desc: 'Sanitation, Potholes & Municipal Works', color: 'blue' },
    { title: 'Police Emergency Assistance', number: '100', desc: 'Law Enforcement & Immediate Distress', color: 'indigo' },
    { title: 'Fire & Rescue Services', number: '101', desc: 'Fire Hazards & Disaster Management', color: 'amber' },
    { title: 'Ambulance Emergency Medical', number: '108', desc: '24/7 Paramedic Response & Hospital Transit', color: 'emerald' },
    { title: 'Women Safety Helpline', number: '1091', desc: '24/7 Protective Support for Women', color: 'purple' },
    { title: 'Childline Emergency Desk', number: '1098', desc: 'Protection of Children in Distress', color: 'cyan' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      
      {/* Hero Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-slate-950 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold tracking-wide mx-auto">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>{lang === 'ta' ? 'அமைப்பின் நோக்கம்' : 'Mission & Institutional Framework'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto">
            {lang === 'ta' 
              ? 'சிவிக்ரிசால்வ்: குடிமைத் தீர்வு தளம்' 
              : 'About CivicResolve'}
          </h1>

          <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
            {lang === 'ta'
              ? 'தமிழ்நாடு முழுவதும் வெளிப்படையான, தாமதமில்லாத மற்றும் பொறுப்புமிக்க மக்கள் குறைதீர்க்கும் தளம்.'
              : 'An independent civic technology platform engineered to bring algorithmic transparency, guaranteed turnaround times, and verified field resolutions to municipal administration.'}
          </p>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              <span>{lang === 'ta' ? 'மனு பதிவு' : 'Report Civic Issue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onGoToTracker && onGoToTracker()}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-extrabold text-xs transition-all"
            >
              <span>{lang === 'ta' ? 'மனு கண்காணிக்க' : 'Track Existing Issue'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-12">
        
        {/* Core Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center border border-teal-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">Guaranteed SLAs</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every complaint is bound to explicit Citizen Charter turnaround targets (8h for electrical faults, 12h for solid waste, 24h for drinking water & drainage). Timers count down transparently.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">Neutral AI Triage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated image analysis and semantic severity classification eliminate bureaucratic bias and prevent unattended backlog accumulation.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">Auditable Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cryptographic verification hashes, salted hashes for credentials, strict rate limiting, and immutable audit logs guarantee tamper-evident integrity.
            </p>
          </div>
        </div>

        {/* Legal & Inspiration Note */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Independent Platform Architecture & Proven Workflow Inspiration
              </h3>
              <p className="text-xs text-slate-500">Notice of Independent Engineering & Transparency</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            CivicResolve is an independent civic technology platform created for demonstration and hackathon evaluation. Its workflow patterns are inspired by the structured citizen-facing service design of the <strong>Tamil Nadu CM Helpline (Mudhalvarin Mugavari)</strong> and the rigorous submission monitoring workflows of academic initiatives such as <strong>e-Yantra (IIT Bombay)</strong>.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            CivicResolve does not use official state emblems, copyrighted assets, or imply government endorsement. It operates using standard open APIs, local municipal GIS datasets, and verified municipal dispatch contracts.
          </p>
        </div>

        {/* Official Emergency Contact Directory Section */}
        <div ref={contactRef} id="contact" className="space-y-6 pt-4">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              <PhoneCall className="w-3.5 h-3.5 text-teal-600" />
              <span>Official Emergency Helplines Directory</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Tamil Nadu Citizen & Civic Helplines
            </h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              For life-threatening emergencies, power line snapping, or urgent fire distress, please dial direct toll-free emergency response numbers immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {emergencyHelplines.map((line, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {line.number}
                    </span>
                    <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <PhoneCall className="w-4 h-4 text-teal-600" />
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800 mt-2">{line.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{line.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <a
                    href={`tel:${line.number}`}
                    className="w-full py-2 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Dial Toll-Free</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}