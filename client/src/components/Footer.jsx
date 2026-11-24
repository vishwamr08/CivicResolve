import React from 'react';
import { Lock } from 'lucide-react';

export default function Footer({ onNavigate, onOpenSubmit, _lang = 'en' }) {
  return (
    <footer className="bg-[#0a1628] text-slate-400 border-t border-navy-800 text-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5 text-white">
              <img
                src="/civicresolve-logo.png"
                alt="CivicResolve Logo"
                className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-sm"
              />
              <span className="font-bold text-lg text-white">
                Civic<span className="text-[#f47920]">Resolve</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Transparent municipal grievance reporting, automated department triage, and verified redressal monitoring across Tamil Nadu.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <Lock className="w-3.5 h-3.5 text-[#f47920]" />
              <span>Citizen Privacy & PII Masking Protected</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white uppercase tracking-wider mb-3 text-xs">Platform Services</h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('landing')} className="hover:text-white transition-colors">
                  Home Overview
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-white transition-colors">
                  Municipal Services & SLAs
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors">
                  Redressal Workflow
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('tracker')} className="hover:text-white transition-colors">
                  Track by Reference ID
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('public-dashboard')} className="hover:text-white transition-colors">
                  Public Transparency Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('citizen-portal')} className="hover:text-white transition-colors">
                  Citizen Mobile Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-white transition-colors">
                  Officer Command Center
                </button>
              </li>
              <li>
                <button onClick={onOpenSubmit} className="text-[#f47920] hover:text-[#ff8f3d] transition-colors font-semibold">
                  + File a Grievance
                </button>
              </li>
            </ul>
          </div>

          {/* Civic Departments */}
          <div>
            <h4 className="font-semibold text-white uppercase tracking-wider mb-3 text-xs">Nodal Jurisdictions</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>Greater Chennai Corporation (GCC)</li>
              <li>Chennai Metro Water (CMWSSB)</li>
              <li>TANGEDCO Power Distribution</li>
              <li>Tamil Nadu Highways Department</li>
              <li>Public Health & Vector Mitigation</li>
              <li>Directorate of Municipal Administration</li>
            </ul>
          </div>

          {/* Emergency Helplines & Compliance */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider mb-3 text-xs">Official Helplines</h4>
            <div className="space-y-1 text-slate-300 text-xs tabular-nums">
              <p>CM Helpline / Grievance: <strong className="text-white">1100</strong></p>
              <p>TANGEDCO Electricity: <strong className="text-white">1912</strong></p>
              <p>Police Control Room: <strong className="text-white">100</strong></p>
              <p>Fire & Rescue: <strong className="text-white">101</strong></p>
              <p>Women Safety Helpline: <strong className="text-white">1091</strong></p>
            </div>
          </div>

        </div>

        {/* Legal Disclaimer Box */}
        <div className="mt-8 pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-400">
          <p>
            © {new Date().getFullYear()} CivicResolve — Citizen Grievance Redressal Platform. Built for transparent civic governance.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>PII Masking Guaranteed</span>
            <span>•</span>
            <span>Statutory SLA Tracking</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
