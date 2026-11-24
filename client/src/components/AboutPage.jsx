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
    { title: 'Chief Minister Helpline (CM Cell)', number: '1100', desc: 'Unified State Public Grievance Helpline' },
    { title: 'TANGEDCO Electricity Board', number: '1912', desc: 'Power Outages, Cable Sparking & Billing' },
    { title: 'Greater Chennai Corporation (GCC)', number: '1913', desc: 'Sanitation, Potholes & Municipal Works' },
    { title: 'Police Emergency Assistance', number: '100', desc: 'Law Enforcement & Immediate Distress' },
    { title: 'Fire & Rescue Services', number: '101', desc: 'Fire Hazards & Disaster Management' },
    { title: 'Ambulance Emergency Medical', number: '108', desc: '24/7 Paramedic Response & Hospital Transit' },
    { title: 'Women Safety Helpline', number: '1091', desc: '24/7 Protective Support for Women' },
    { title: 'Childline Emergency Desk', number: '1098', desc: 'Protection of Children in Distress' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">

      {/* Hero Banner */}
      <div className="bg-navy-950 text-white border-b border-navy-900 py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <img
            src="/civicresolve-logo.png"
            alt="CivicResolve Logo"
            className="w-12 h-12 object-contain mx-auto mb-2 drop-shadow-md"
          />
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-semibold bg-navy-900 text-slate-300 border border-navy-800 tracking-wide mx-auto">
            <ShieldCheck className="w-4 h-4 text-saffron-400" />
            <span>{lang === 'ta' ? 'à®…à®®à¯ˆà®ªà¯à®ªà®¿à®©à¯ à®¨à¯‹à®•à¯à®•à®®à¯' : 'Mission & Institutional Framework'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-3xl mx-auto">
            {lang === 'ta'
              ? 'à®šà®¿à®µà®¿à®•à¯à®°à®¿à®šà®¾à®²à¯à®µà¯: à®•à¯à®Ÿà®¿à®®à¯ˆà®¤à¯ à®¤à¯€à®°à¯à®µà¯ à®¤à®³à®®à¯'
              : 'About CivicResolve'}
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            {lang === 'ta'
              ? 'à®¤à®®à®¿à®´à¯à®¨à®¾à®Ÿà¯ à®®à¯à®´à¯à®µà®¤à¯à®®à¯ à®µà¯†à®³à®¿à®ªà¯à®ªà®Ÿà¯ˆà®¯à®¾à®©, à®¤à®¾à®®à®¤à®®à®¿à®²à¯à®²à®¾à®¤ à®®à®±à¯à®±à¯à®®à¯ à®ªà¯Šà®±à¯à®ªà¯à®ªà¯à®®à®¿à®•à¯à®• à®®à®•à¯à®•à®³à¯ à®•à¯à®±à¯ˆà®¤à¯€à®°à¯à®•à¯à®•à¯à®®à¯ à®¤à®³à®®à¯.'
              : 'An independent civic technology platform engineered to bring algorithmic transparency, guaranteed turnaround times, and verified field resolutions to municipal administration.'}
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
              className="px-5 py-2.5 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-navy-950 font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
            >
              <span>{lang === 'ta' ? 'à®®à®©à¯ à®ªà®¤à®¿à®µà¯' : 'Report Civic Issue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onGoToTracker && onGoToTracker()}
              className="px-5 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-950 text-white border border-navy-800 font-medium text-xs transition-colors"
            >
              <span>{lang === 'ta' ? 'à®®à®©à¯ à®•à®£à¯à®•à®¾à®£à®¿à®•à¯à®•' : 'Track Existing Issue'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-10">

        {/* Core Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-900 border border-navy-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-navy-900" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Guaranteed SLAs</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every complaint is bound to explicit Citizen Charter turnaround targets (8h for electrical faults, 12h for solid waste, 24h for drinking water & drainage). Timers count down transparently.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-900 border border-navy-100 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-navy-900" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Neutral AI Triage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated image analysis and semantic severity classification eliminate bureaucratic bias and prevent unattended backlog accumulation.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-900 border border-navy-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-navy-900" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Auditable Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cryptographic verification hashes, salted hashes for credentials, strict rate limiting, and immutable audit logs guarantee tamper-evident integrity.
            </p>
          </div>
        </div>

        {/* Legal & Inspiration Note */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-950 text-saffron-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Independent Platform Architecture & Proven Workflow Inspiration
              </h3>
              <p className="text-[11px] text-slate-500">Notice of Independent Engineering & Transparency</p>
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
        <div ref={contactRef} id="contact" className="space-y-5 pt-2">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
              <PhoneCall className="w-3.5 h-3.5 text-saffron-600" />
              <span>Official Emergency Helplines Directory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
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
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-navy-950 font-mono tracking-tight tabular-nums">
                      {line.number}
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <PhoneCall className="w-3.5 h-3.5 text-navy-900" />
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 mt-2">{line.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{line.desc}</p>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <a
                    href={`tel:${line.number}`}
                    className="w-full py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-navy-900 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
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
