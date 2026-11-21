import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Mail, Phone, 
  CheckCircle2, AlertCircle, Loader2, 
  ShieldCheck, ArrowRight, RotateCw
} from 'lucide-react';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';

export default function CitizenAuthModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialMode = 'otp', // 'otp' or 'password'
  lang = 'en'
}) {
  const [authMethod, setAuthMethod] = useState('otp'); // 'otp' or 'password'
  const [otpStep, setOtpStep] = useState('input-phone'); // 'input-phone', 'verify-otp', 'complete-profile'

  // Mobile OTP State
  const [mobileNumber, setMobileNumber] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);

  // New Citizen Profile Fields (collected after mobile verification)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('Chennai');
  const [municipality, setMunicipality] = useState('Greater Chennai Corporation');
  const [ward, setWard] = useState('Ward 114');
  const [consentTerms, setConsentTerms] = useState(true);

  // Password Login State (fallback for existing accounts)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      setAuthMethod(initialMode === 'password' ? 'password' : 'otp');
      setOtpStep('input-phone');
      setEnteredOtp('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // 1. Send OTP Request
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const clean = mobileNumber.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setError(lang === 'ta' ? 'சரியான 10 இலக்க இந்திய அலைபேசி எண்ணை உள்ளிடவும்.' : 'Please enter a valid 10-digit Indian mobile number starting with 6-9.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/citizen/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, purpose: 'login' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification OTP.');
      }

      setSuccessMsg(data.message || 'OTP dispatched to registered mobile.');
      setCooldown(data.cooldownSeconds || 60);
      setIsNewUser(!data.isExistingUser);
      setOtpStep('verify-otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP Request
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const clean = mobileNumber.replace(/\D/g, '').slice(-10);
    const cleanOtp = enteredOtp.trim();

    if (cleanOtp.length !== 6) {
      setError(lang === 'ta' ? 'சரியான 6 இலக்க OTP எண்ணை உள்ளிடவும்.' : 'Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/citizen/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, otp: cleanOtp, purpose: 'login' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      if (data.isNewUser) {
        // OTP verified for new user -> advance to profile completion
        setIsNewUser(true);
        setOtpStep('complete-profile');
        setSuccessMsg(lang === 'ta' ? 'அலைபேசி எண் சரிபார்க்கப்பட்டது! விவரங்களை பூர்த்தி செய்யவும்.' : 'Mobile verified! Please provide your name and municipal details to complete setup.');
      } else {
        // Existing user -> session established
        if (onSuccess) {
          onSuccess(data.token, data.citizen);
        }
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Complete Profile for New Citizen
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError(lang === 'ta' ? 'உங்கள் பெயரை உள்ளிடவும்.' : 'Citizen full name is required.');
      return;
    }

    if (!consentTerms) {
      setError(lang === 'ta' ? 'விதிமுறைகளுக்கு ஒப்புதல் அளிக்க வேண்டும்.' : 'Please accept the citizen charter terms.');
      return;
    }

    setLoading(true);
    try {
      const clean = mobileNumber.replace(/\D/g, '').slice(-10);
      const res = await fetch('/api/auth/citizen/register-with-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          phone: clean,
          otp: enteredOtp.trim(),
          email: email.trim() || undefined,
          district,
          municipality,
          ward
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      if (onSuccess) {
        onSuccess(data.token, data.citizen);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Password Login Handler (Fallback)
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/citizen/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      if (onSuccess) {
        onSuccess(data.token, data.citizen);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (citizenEmail) => {
    setAuthMethod('password');
    setLoginEmail(citizenEmail);
    setLoginPassword('Citizen#2026!Demo');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                {lang === 'ta' ? 'குடிமக்கள் உள்நுழைவு' : 'Citizen Grievance Portal'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'ta' ? 'பாதுகாப்பான அலைபேசி OTP சரிபார்ப்பு' : 'Secure Mobile OTP Authentication'}
              </p>
            </div>
          </div>

          {/* Auth Method Selector Tabs */}
          <div className="mt-4 flex bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'otp' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile OTP</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('password'); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'password' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password Login</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* METHOD 1: MOBILE OTP FLOW */}
          {authMethod === 'otp' && (
            <>
              {/* Step 1: Input Mobile Phone */}
              {otpStep === 'input-phone' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="citizen-mobile-phone" className="text-xs font-bold text-slate-700 block">
                      {lang === 'ta' ? 'அலைபேசி எண் (10 இலக்கங்கள்)' : 'Mobile Phone Number'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-xs" aria-hidden="true">
                        +91
                      </div>
                      <input
                        id="citizen-mobile-phone"
                        type="tel"
                        maxLength="10"
                        placeholder="9840123456"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        autoFocus
                        required
                        aria-required="true"
                        aria-label="10 digit mobile phone number"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'ta' ? 'உங்கள் எண்ணிற்கு 6 இலக்க OTP குறியீடு அனுப்பப்படும்.' : 'We will send a 6-digit one-time password to verify your account.'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || mobileNumber.length !== 10}
                    className="w-full py-3 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>{lang === 'ta' ? 'OTP பெறுக' : 'Get Verification OTP'}</span>
                  </button>
                </form>
              )}

              {/* Step 2: Verify 6-digit OTP */}
              {otpStep === 'verify-otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Verification sent to</span>
                      <span className="font-extrabold text-slate-900">+91 {mobileNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpStep('input-phone')}
                      className="text-xs font-bold text-teal-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="citizen-otp-token" className="text-xs font-bold text-slate-700 block">
                      {lang === 'ta' ? '6 இலக்க OTP உள்ளிடவும்' : 'Enter 6-Digit OTP'}
                    </label>
                    <input
                      id="citizen-otp-token"
                      type="text"
                      maxLength="6"
                      placeholder="• • • • • •"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      autoFocus
                      required
                      aria-required="true"
                      aria-label="6 digit one-time password"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {cooldown > 0 ? (
                        <span>Resend in <strong className="text-slate-900 font-mono">{cooldown}s</strong></span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="font-bold text-teal-600 hover:underline flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" /> Resend OTP
                        </button>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">Valid for 10 minutes</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || enteredOtp.length !== 6}
                    className="w-full py-3 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{lang === 'ta' ? 'சரிபார்த்து தொடரவும்' : 'Verify & Sign In'}</span>
                  </button>
                </form>
              )}

              {/* Step 3: Complete Profile for New Citizen */}
              {otpStep === 'complete-profile' && (
                <form onSubmit={handleCompleteRegistration} className="space-y-3.5">
                  <div className="space-y-1">
                    <label htmlFor="reg-fullname" className="text-xs font-bold text-slate-700 block">
                      {lang === 'ta' ? 'முழு பெயர்' : 'Full Name'} *
                    </label>
                    <input
                      id="reg-fullname"
                      type="text"
                      placeholder="e.g. S. Ramanathan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="reg-email" className="text-xs font-bold text-slate-700 block">
                      {lang === 'ta' ? 'மின்னஞ்சல் (விருப்பத்தேர்வு)' : 'Email Address (Optional)'}
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="ramanathan@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="reg-district" className="text-[11px] font-bold text-slate-700 block">
                        {lang === 'ta' ? 'மாவட்டம்' : 'District'} *
                      </label>
                      <select
                        id="reg-district"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                      >
                        {TAMIL_NADU_DISTRICTS.map((d) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="reg-ward" className="text-[11px] font-bold text-slate-700 block">
                        {lang === 'ta' ? 'வார்டு / பகுதி' : 'Ward / Zone'}
                      </label>
                      <input
                        id="reg-ward"
                        type="text"
                        placeholder="Ward 114"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={consentTerms}
                        onChange={(e) => setConsentTerms(e.target.checked)}
                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>I agree to receive grievance status alerts via SMS and accept the CivicResolve citizen charter.</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !fullName.trim()}
                    className="w-full py-3 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>{lang === 'ta' ? 'பதிவு செய்து உள்நுழைக' : 'Complete Setup & Open Portal'}</span>
                  </button>
                </form>
              )}
            </>
          )}

          {/* METHOD 2: PASSWORD LOGIN FLOW */}
          {authMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email-input" className="text-xs font-bold text-slate-700 block">
                  {lang === 'ta' ? 'மின்னஞ்சல் முகவரி' : 'Registered Email Address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400" aria-hidden="true">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email-input"
                    type="email"
                    placeholder="citizen@civicresolve.gov"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    required
                    aria-label="Registered email address"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password-input" className="text-xs font-bold text-slate-700 block">
                  {lang === 'ta' ? 'கடவுச்சொல்' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400" aria-hidden="true">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password-input"
                    type="password"
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              {/* Demo Account Quick Fill */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  1-Click Demo Citizen Profiles:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoFill('citizen@civicresolve.gov')}
                    className="flex-1 py-1 px-2 rounded-lg bg-white border border-slate-200 hover:border-teal-500 text-[10px] font-bold text-slate-700 transition-colors truncate"
                  >
                    Selvi Anitha (Chennai)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('karthik@civicresolve.gov')}
                    className="flex-1 py-1 px-2 rounded-lg bg-white border border-slate-200 hover:border-teal-500 text-[10px] font-bold text-slate-700 transition-colors truncate"
                  >
                    Karthik Raja (CBE)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !loginEmail.trim() || !loginPassword}
                className="w-full py-3 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>{lang === 'ta' ? 'உள்நுழைக' : 'Sign In with Password'}</span>
              </button>
            </form>
          )}

        </div>

        {/* Modal Footer Notice */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
          <span>Protected under Tamil Nadu Municipal Grievance Redressal Architecture • PII Encrypted</span>
        </div>

      </div>
    </div>
  );
}
