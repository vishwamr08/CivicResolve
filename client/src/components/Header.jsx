import React, { useState } from 'react';
import { 
  ShieldCheck, Globe, Menu, X, Home, Info, Wrench, 
  HelpCircle, BarChart3, Bell, PhoneCall, User, Lock, 
  PlusCircle, LogOut, Sparkles, ChevronRight, CheckCircle
} from 'lucide-react';
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
  health, 
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm font-sans">
      
      {/* Top Official Helpline & Language Bar */}
      <div className="bg-slate-900 text-white text-[11px] py-1.5 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
            <span className="inline-flex items-center gap-1 font-semibold text-teal-400">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              {lang === 'ta' ? 'அவசர உதவி எண்கள்:' : 'Emergency Helplines:'}
            </span>
            <span>Civic: <strong className="text-white font-bold">1100</strong></span>
            <span>•</span>
            <span>EB: <strong className="text-white font-bold">1912</strong></span>
            <span>•</span>
            <span>Police: <strong className="text-white font-bold">100</strong></span>
            <span>•</span>
            <span>Fire: <strong className="text-white font-bold">101</strong></span>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              <Globe className="w-3 h-3 text-teal-400" />
              <button
                type="button"
                onClick={() => setLang && setLang('en')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  lang === 'en' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <span className="text-slate-600 text-[10px]">|</span>
              <button
                type="button"
                onClick={() => setLang && setLang('ta')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  lang === 'ta' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
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
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Identity */}
          <div 
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-3.5 cursor-pointer select-none group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-teal-500/40 flex items-center justify-center shadow-md shadow-slate-900/10 group-hover:border-teal-400 transition-colors">
              <ShieldCheck className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                  Civic<span className="text-teal-600">Resolve</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Tamil Nadu
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-tight">
                {lang === 'ta' ? 'பொது மக்கள் குறைதீர்க்கும் தளம்' : 'Citizen Grievance Redressal & Action Platform'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
            
            {/* Primary Submit Grievance CTA */}
            <button
              onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>{lang === 'ta' ? 'மனு பதிவு' : 'Report Issue'}</span>
            </button>

            {/* Citizen Auth Badge / Login Button */}
            {citizenUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  onClick={() => handleNavClick('citizen-portal')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    activeTab === 'citizen-portal'
                      ? 'bg-teal-50 border-teal-300 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span className="max-w-[100px] truncate">{citizenUser.name.split(' ')[0]}</span>
                </button>
                <button
                  onClick={onLogoutCitizen}
                  title="Logout Citizen"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenCitizenAuth}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>{lang === 'ta' ? 'குடிமக்கள் லாகின்' : 'Citizen Login'}</span>
              </button>
            )}

            {/* Municipal Officer / Admin Console CTA */}
            {adminUser ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'admin' || activeTab === 'officer-portal'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Admin</span>
                </button>
                <button
                  onClick={onLogoutAdmin}
                  title="Sign Out Officer"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('admin-login')}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden lg:inline">{lang === 'ta' ? 'அதிகாரி லாகின்' : 'Municipal Login'}</span>
              </button>
            )}

          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex xl:hidden items-center gap-2">
            <button
              onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
              className="p-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
              title="Report Issue"
            >
              <PlusCircle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 shadow-xl px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
            {citizenUser ? (
              <button
                onClick={() => handleNavClick('citizen-portal')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold"
              >
                <User className="w-4 h-4 text-teal-600" />
                <span>Citizen Portal</span>
              </button>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenCitizenAuth(); }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold"
              >
                <User className="w-4 h-4 text-slate-600" />
                <span>Citizen Login</span>
              </button>
            )}

            {adminUser ? (
              <button
                onClick={() => handleNavClick('admin')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Admin Console</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavClick('admin-login')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
              >
                <Lock className="w-4 h-4 text-slate-600" />
                <span>Officer Login</span>
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
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
            >
              <span>{lang === 'ta' ? 'மனு நிலை அறிய' : 'Track Existing Grievance'}</span>
            </button>
          </div>

        </div>
      )}

    </header>
  );
}
