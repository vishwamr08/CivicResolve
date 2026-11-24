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
    { id: 'landing', label: lang === 'ta' ? 'முகப்பு' : 'Home', icon: Home },
    { id: 'about', label: lang === 'ta' ? 'அறிமுகம்' : 'About', icon: Info },
    { id: 'services', label: lang === 'ta' ? 'சேவைகள்' : 'Services', icon: Wrench },
    { id: 'how-it-works', label: lang === 'ta' ? 'செயல்முறை' : 'How It Works', icon: HelpCircle },
    { id: 'public-dashboard', label: lang === 'ta' ? 'பொது தகவல் பலகை' : 'Public Dashboard', icon: BarChart3 },
    { id: 'announcements', label: lang === 'ta' ? 'அறிவிப்புகள்' : 'Announcements', icon: Bell, badge: announcementCount },
    { id: 'contact', label: lang === 'ta' ? 'தொடர்புக்கு' : 'Contact', icon: PhoneCall },
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
                தமிழ்
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
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1a3c6e] border border-[#2a5298] flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#f47920]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-[#1a3c6e]">
                  Civic<span className="text-[#f47920]">Resolve</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded bg-orange-50 text-[#d96810] border border-orange-200/80">
                  Govt of Tamil Nadu
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                {lang === 'ta' ? 'குடிமக்கள் குறைதீர்க்கும் தளம்' : 'Citizen Grievance Redressal Platform'}
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
              <span>{lang === 'ta' ? 'மனு பதிவு' : 'File Complaint'}</span>
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
                <span>{lang === 'ta' ? 'குடிமக்கள்' : 'Login'}</span>
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
                <span className="hidden xl:inline">{lang === 'ta' ? 'அதிகாரி' : 'Officer'}</span>
              </button>
            )}

          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
              className="p-2 rounded-lg bg-[#f47920] text-white font-semibold text-xs shadow-sm"
              title="Report Issue"
            >
              <PlusCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 shadow-lg px-4 pt-3 pb-5 space-y-3">

          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
            {citizenUser ? (
              <button
                onClick={() => handleNavClick('citizen-portal')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-orange-50 border border-orange-200 text-[#d96810] text-xs font-semibold"
              >
                <User className="w-3.5 h-3.5 text-[#f47920]" />
                <span className="truncate">{t.citizenPortal}</span>
              </button>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenCitizenAuth(); }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200"
              >
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span className="truncate">{t.citizenLogin}</span>
              </button>
            )}

            {adminUser ? (
              <button
                onClick={() => handleNavClick('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#1a3c6e] text-white text-xs font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#f47920]" />
                <span className="truncate">{t.commandCenter}</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavClick('admin-login')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
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
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-colors ${
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
                    <span className="px-1.5 py-0.2 rounded-full bg-[#f47920] text-white text-[9px] font-bold tabular-nums">
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              <span>{t.trackExisting}</span>
            </button>
          </div>

        </div>
      )}

    </header>
  );
}
