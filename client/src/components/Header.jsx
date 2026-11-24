import React, { useState } from 'react';
import {
  ShieldCheck, Globe, Menu, X, Home, Info, Wrench,
  HelpCircle, BarChart3, Bell, PhoneCall, User, Lock,
  PlusCircle, LogOut, ChevronRight } from 'lucide-react';
import { translations } from '../data/translations';

export default function Header({
  activeTab,
  setActiveTab,
  onOpenSubmit,
  onOpenCitizenAuth,
  citizenUser,
  onLogoutCitizen,
  adminUser,
  onLogoutAdmin,
  _health,
  lang = 'en',
  setLang,
  announcementCount = 3
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[lang] || translations.en;

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { id: 'landing', label: lang === 'ta' ? 'à®®à¯à®•à®ªà¯à®ªà¯' : 'Home', icon: Home },
    { id: 'about', label: lang === 'ta' ? 'à®…à®±à®¿à®®à¯à®•à®®à¯' : 'About', icon: Info },
    { id: 'services', label: lang === 'ta' ? 'à®šà¯‡à®µà¯ˆà®•à®³à¯' : 'Services', icon: Wrench },
    { id: 'how-it-works', label: lang === 'ta' ? 'à®šà¯†à®¯à®²à¯à®®à¯à®±à¯ˆ' : 'How It Works', icon: HelpCircle },
    { id: 'public-dashboard', label: lang === 'ta' ? 'à®ªà¯Šà®¤à¯ à®¤à®•à®µà®²à¯ à®ªà®²à®•à¯ˆ' : 'Public Dashboard', icon: BarChart3 },
    { id: 'announcements', label: lang === 'ta' ? 'à®…à®±à®¿à®µà®¿à®ªà¯à®ªà¯à®•à®³à¯' : 'Announcements', icon: Bell, badge: announcementCount },
    { id: 'contact', label: lang === 'ta' ? 'à®¤à¯Šà®Ÿà®°à¯à®ªà¯à®•à¯à®•à¯' : 'Contact', icon: PhoneCall },
  ];

  const [fontSizeLevel, setFontSizeLevel] = useState(1); // 0: A-, 1: A, 2: A+

  const handleFontSize = (level) => {
    setFontSizeLevel(level);
    if (level === 0) document.documentElement.style.fontSize = '14px';
    else if (level === 2) document.documentElement.style.fontSize = '18px';
    else document.documentElement.style.fontSize = '16px';
  };

  const currentDateStr = new Date().toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/90 shadow-sm font-sans">

      {/* Top Official Helpline, Date & Accessibility Bar */}
      <div className="bg-[#1a3c6e] text-white text-[11px] py-1.5 px-4 sm:px-6 lg:px-8 border-b border-navy-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-200">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#f47920]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f47920]"></span>
              Helpline: 1800-425-1100
            </span>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="text-white/80 hidden sm:inline tabular-nums">{currentDateStr}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Screen Reader & Font Size Controls */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
              <span className="text-white/70">Text Size:</span>
              <button
                type="button"
                onClick={() => handleFontSize(0)}
                aria-label="Decrease font size"
                className={`px-1.5 py-0.5 rounded border border-white/20 transition-colors ${fontSizeLevel === 0 ? 'bg-[#f47920] text-white font-semibold' : 'bg-white/10 hover:bg-white/20'}`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => handleFontSize(1)}
                aria-label="Default font size"
                className={`px-1.5 py-0.5 rounded border border-white/20 transition-colors ${fontSizeLevel === 1 ? 'bg-[#f47920] text-white font-semibold' : 'bg-white/10 hover:bg-white/20'}`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => handleFontSize(2)}
                aria-label="Increase font size"
                className={`px-1.5 py-0.5 rounded border border-white/20 transition-colors ${fontSizeLevel === 2 ? 'bg-[#f47920] text-white font-semibold' : 'bg-white/10 hover:bg-white/20'}`}
              >
                A+
              </button>
            </div>

            <span className="text-white/30 hidden sm:inline">|</span>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#0f2040] px-2 py-0.5 rounded-md border border-white/15">
              <Globe className="w-3 h-3 text-[#f47920]" />
              <button
                type="button"
                onClick={() => setLang && setLang('en')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  lang === 'en' ? 'bg-[#f47920] text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
              <span className="text-slate-500 text-[10px]">|</span>
              <button
                type="button"
                onClick={() => setLang && setLang('ta')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  lang === 'ta' ? 'bg-[#f47920] text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                à®¤à®®à®¿à®´à¯
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Brand & Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">

          {/* Brand Identity */}
          <div
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group min-w-0"
          >
            <img
              src="/civicresolve-logo.png"
              alt="CivicResolve Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain flex-shrink-0 drop-shadow-sm"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-[#1a3c6e]">
                  Civic<span className="text-[#f47920]">Resolve</span>
                </span>
                <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-semibold tracking-wide px-1.5 sm:px-2 py-0.5 rounded bg-orange-50 text-[#d96810] border border-orange-200/80 whitespace-nowrap">
                  Govt of Tamil Nadu
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-normal truncate max-w-[190px] sm:max-w-none">
                {lang === 'ta' ? 'à®•à¯à®Ÿà®¿à®®à®•à¯à®•à®³à¯ à®•à¯à®±à¯ˆà®¤à¯€à®°à¯à®•à¯à®•à¯à®®à¯ à®¤à®³à®®à¯' : 'Citizen Grievance Redressal Platform'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-[#1a3c6e] font-semibold border border-slate-200/80'
                      : 'text-slate-600 hover:text-[#1a3c6e] hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#f47920] text-white text-[9px] font-bold tabular-nums">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-2">

            {/* Primary Submit Grievance CTA */}
            <button
              onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#f47920] hover:bg-[#d96810] transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-white" />
              <span>{lang === 'ta' ? 'à®®à®©à¯ à®ªà®¤à®¿à®µà¯' : 'File Complaint'}</span>
            </button>

            {/* Citizen Auth Badge / Login Button */}
            {citizenUser ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <button
                  onClick={() => handleNavClick('citizen-portal')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    activeTab === 'citizen-portal'
                      ? 'bg-orange-50 border-orange-200 text-[#d96810]'
                      : 'border-slate-300 text-[#1a3c6e] bg-white hover:bg-slate-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#1a3c6e]" />
                  <span className="max-w-[90px] truncate">{citizenUser.name.split(' ')[0]}</span>
                </button>
                <button
                  onClick={onLogoutCitizen}
                  title="Logout Citizen"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenCitizenAuth}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#1a3c6e] bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>{lang === 'ta' ? 'à®•à¯à®Ÿà®¿à®®à®•à¯à®•à®³à¯' : 'Login'}</span>
              </button>
            )}

            {/* Municipal Officer / Admin Console CTA */}
            {adminUser ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'admin' || activeTab === 'officer-portal'
                      ? 'bg-[#1a3c6e] text-white shadow-sm'
                      : 'bg-slate-100 text-[#1a3c6e] hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#f47920]" />
                  <span>Admin</span>
                </button>
                <button
                  onClick={onLogoutAdmin}
                  title="Sign Out Officer"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('admin-login')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-[#1a3c6e] hover:bg-slate-100 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xl:inline">{lang === 'ta' ? 'à®…à®¤à®¿à®•à®¾à®°à®¿' : 'Officer'}</span>
              </button>
            )}

          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
              className="p-2.5 rounded-lg bg-[#f47920] hover:bg-[#d96810] text-white font-semibold text-xs shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              title="Report Issue"
              aria-label="Report Civic Issue"
            >
              <PlusCircle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 shadow-lg px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-150">

          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
            {citizenUser ? (
              <div className="flex items-center gap-1 col-span-1">
                <button
                  onClick={() => handleNavClick('citizen-portal')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-orange-50 border border-orange-200 text-[#d96810] text-xs font-semibold min-h-[44px]"
                >
                  <User className="w-3.5 h-3.5 text-[#f47920]" />
                  <span className="truncate">{citizenUser.name.split(' ')[0]}</span>
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); if (onLogoutCitizen) onLogoutCitizen(); }}
                  title="Logout Citizen"
                  aria-label="Sign out citizen"
                  className="p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[44px] min-w-[40px] flex items-center justify-center border border-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenCitizenAuth(); }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 min-h-[44px]"
              >
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span className="truncate">{t.citizenLogin}</span>
              </button>
            )}

            {adminUser ? (
              <div className="flex items-center gap-1 col-span-1">
                <button
                  onClick={() => handleNavClick('admin')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-[#1a3c6e] text-white text-xs font-semibold min-h-[44px]"
                >
                  <img src="/civicresolve-logo.png" alt="CivicResolve Logo" className="w-3.5 h-3.5 object-contain" />
                  <span className="truncate">Admin</span>
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); if (onLogoutAdmin) onLogoutAdmin(); }}
                  title="Sign Out Officer"
                  aria-label="Sign out officer"
                  className="p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[44px] min-w-[40px] flex items-center justify-center border border-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('admin-login')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 min-h-[44px]"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span className="truncate">{t.officerLogin}</span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-[#1a3c6e] text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#f47920] text-white text-[10px] font-bold tabular-nums">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Track Grievance Button in Mobile Drawer */}
          <div className="pt-2">
            <button
              onClick={() => handleNavClick('tracker')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors min-h-[44px]"
            >
              <span>{t.trackExisting}</span>
            </button>
          </div>

        </div>
      )}

    </header>
  );
}
