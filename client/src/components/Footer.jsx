import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export default function Footer({ onNavigate, onOpenSubmit, _lang = 'en' }) {
  return (
    <footer className="bg-navy-950 text-slate-400 border-t border-navy-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center font-bold text-navy-950">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">CivicResolve</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              AI-powered municipal grievance intelligence and automated triage platform designed for modern public administration across Tamil Nadu.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-teal-accent">
              <Lock className="w-3.5 h-3.5" />
              <span>Government-Grade Encryption & Privacy</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-xs">Quick Access</h4>
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
                  How It Operates
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('tracker')} className="hover:text-white transition-colors">
                  Track Grievance by Ref ID
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('citizen-portal')} className="hover:text-white transition-colors">
                  Citizen Portal & Feedback
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-white transition-colors">
                  Officer Command Center
                </button>
              </li>
              <li>
                <button onClick={onOpenSubmit} className="hover:text-teal-accent transition-colors font-semibold">
                  File a New Grievance
                </button>
              </li>
            </ul>
          </div>

          {/* Civic Departments */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-xs">Connected Divisions</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>Greater Chennai Corporation (GCC)</li>
              <li>Chennai Metro Water (CMWSSB)</li>
              <li>TANGEDCO Power Distribution</li>
              <li>Tamil Nadu Highways Department</li>
              <li>Tamil Nadu Pollution Control Board</li>
              <li>Coimbatore City Municipal Corp (CCMC)</li>
            </ul>
          </div>

          {/* Emergency Helplines & Compliance */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-xs">Tamil Nadu Helplines</h4>
            <div className="space-y-1 text-slate-300 text-xs">
              <p>CM Helpline / Grievance: <strong className="text-white">1100</strong></p>
              <p>TANGEDCO Electricity: <strong className="text-white">1912</strong></p>
              <p>Police Emergency: <strong className="text-white">100</strong></p>
              <p>Fire & Rescue: <strong className="text-white">101</strong></p>
              <p>Women Helpline: <strong className="text-white">1091</strong></p>
            </div>
          </div>

        </div>

        {/* Legal Disclaimer Box */}
        <div className="mt-8 pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-slate-400">
          <p>
            © {new Date().getFullYear()} CivicResolve. Independent civic tech prototype inspired by Tamil Nadu CM Helpline (Mudhalvarin Mugavari) grievance workflows. Not an official government platform.
          </p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Built with Civic AI & React</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
