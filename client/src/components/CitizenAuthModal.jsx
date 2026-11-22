import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Mail, Phone, 
  CheckCircle2, AlertCircle, Loader2, 
  ShieldCheck, ArrowRight, RotateCw
} from 'lucide-react';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';
import { translations } from '../data/translations';
import { getApiUrl } from '../config/api';

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
  const [_isNewUser, setIsNewUser] = useState(false);
  const [registrationToken, setRegistrationToken] = useState('');

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

  const t = translations[lang] || translations.en;

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
      setRegistrationToken('');
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
      setError(t.invalidPhoneMsg || (lang === 'ta' ? 'சரியான 10 இலக்க இந்திய அலைபேசி எண்ணை உள்ளிடவும்.' : 'Please enter a valid 10-digit Indian mobile number starting with 6-9.'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/citizen/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, purpose: 'login' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification OTP.');
      }

      setSuccessMsg(data.message || t.otpSuccessDispatched);
      setCooldown(data.cooldownSeconds || 60);
      setIsNewUser(!data.isExistingUser);
      if (data.devOtp) {
        setEnteredOtp(String(data.devOtp));
      }
      setOtpStep('verify-otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP Request (Resilient returning citizen detection)
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const clean = mobileNumber.replace(/\D/g, '').slice(-10);
    const cleanOtp = enteredOtp.trim();

    if (cleanOtp.length !== 6) {
      setError(t.invalidOtpMsg || (lang === 'ta' ? 'சரியான 6 இலக்க OTP எண்ணை உள்ளிடவும்.' : 'Please enter the complete 6-digit verification code.'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/citizen/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, otp: cleanOtp, purpose: 'login' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      // Check if user is truly new (has no citizen record or no registered name)
      if (data.isNewUser && (!data.citizen || !data.citizen.name)) {
        // OTP verified for new user -> advance to profile completion
        setIsNewUser(true);
        setRegistrationToken(data.registrationToken || '');
        setOtpStep('complete-profile');
        setSuccessMsg(t.otpVerifiedSuccess || (lang === 'ta' ? 'அலைபேசி எண் சரிபார்க்கப்பட்டது! விவரங்களை பூர்த்தி செய்யவும்.' : 'Mobile verified! Please provide your name and municipal details to complete setup.'));
      } else {
        // Returning citizen -> immediately establish authenticated session
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
      setError(t.nameRequiredMsg || (lang === 'ta' ? 'உங்கள் பெயரை உள்ளிடவும்.' : 'Citizen full name is required.'));
      return;
    }

    if (!consentTerms) {
      setError(t.consentRequiredMsg || (lang === 'ta' ? 'விதிமுறைகளுக்கு ஒப்புதல் அளிக்க வேண்டும்.' : 'Please accept the citizen charter terms.'));
      return;
    }

    setLoading(true);
    try {
      const clean = mobileNumber.replace(/\D/g, '').slice(-10);
      const res = await fetch(getApiUrl('/api/auth/citizen/register-with-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          phone: clean,
          otp: enteredOtp.trim(),
          registrationToken,
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
      const res = await fetch(getApiUrl('/api/auth/citizen/login'), {
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

  const handleDistrictChange = (distName) => {
    setDistrict(distName);
    const dObj = TAMIL_NADU_DISTRICTS.find(d => d.name === distName || d.id === distName);
    if (dObj && dObj.localBodies && dObj.localBodies.length > 0) {
      setMunicipality(dObj.localBodies[0].name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-navy-950 text-white p-5 border-b border-navy-900 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-saffron-500/15 text-saffron-400 flex items-center justify-center border border-saffron-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-navy-900 text-slate-300 border border-navy-800 mb-1">
                {t.authModalTitle}
              </div>
              <h2 className="text-base font-bold tracking-tight">
                {t.authModalHeading}
              </h2>
            </div>
          </div>

          {/* Auth Method Selector Tabs */}
          <div className="mt-4 flex bg-navy-900 p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setError(''); }}
              className={`flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                authMethod === 'otp' ? 'bg-navy-800 text-white shadow-xs font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t.mobileOtpTab}</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('password'); setError(''); }}
              className={`flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                authMethod === 'password' ? 'bg-navy-800 text-white shadow-xs font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t.passwordLoginTab}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
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
                    <label htmlFor="citizen-mobile-phone" className="text-xs font-semibold text-slate-700 block">
                      {t.mobileNumberLabel}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-semibold text-xs" aria-hidden="true">
                        +91
                      </div>
                      <input
                        id="citizen-mobile-phone"
                        type="tel"
                        maxLength="10"
                        placeholder="9840123456"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900"
                        autoFocus
                        required
                        aria-required="true"
                        aria-label="10 digit mobile phone number"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {t.otpNotice}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || mobileNumber.length !== 10}
                    className="w-full py-2.5 rounded-lg font-semibold text-xs text-white bg-navy-900 hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    <span>{t.getOtpBtn}</span>
                  </button>
                </form>
              )}

              {/* Step 2: Verify 6-digit OTP */}
              {otpStep === 'verify-otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t.verifyingSentTo}</span>
                      <span className="font-semibold text-slate-900 font-mono">+91 {mobileNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpStep('input-phone')}
                      className="text-xs font-semibold text-navy-900 hover:underline"
                    >
                      {t.changeNumber}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="citizen-otp-token" className="text-xs font-semibold text-slate-700 block">
                      {t.enterOtpLabel}
                    </label>
                    <input
                      id="citizen-otp-token"
                      type="text"
                      maxLength="6"
                      placeholder="• • • • • •"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[0.4em] font-mono text-lg py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900"
                      autoFocus
                      required
                      aria-required="true"
                      aria-label="6 digit one-time password"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {cooldown > 0 ? (
                        <span>{t.resendIn} <strong className="text-slate-900 font-mono">{cooldown}s</strong></span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="font-semibold text-navy-900 hover:underline flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" /> {t.resendOtp}
                        </button>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">{t.otpValidPeriod}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || enteredOtp.length !== 6}
                    className="w-full py-2.5 rounded-lg font-semibold text-xs text-white bg-navy-900 hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{t.verifyAndSignInBtn}</span>
                  </button>
                </form>
              )}

              {/* Step 3: Complete Profile for New Citizen */}
              {otpStep === 'complete-profile' && (
                <form onSubmit={handleCompleteRegistration} className="space-y-3.5">
                  <div className="space-y-1">
                    <label htmlFor="reg-fullname" className="text-xs font-semibold text-slate-700 block">
                      {t.fullNameLabel} *
                    </label>
                    <input
                      id="reg-fullname"
                      type="text"
                      placeholder={t.fullNamePlaceholder}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="reg-email" className="text-xs font-semibold text-slate-700 block">
                      {t.emailOptionalLabel}
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="citizen@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="reg-district" className="text-[11px] font-semibold text-slate-700 block">
                        {t.districtLabel} *
                      </label>
                      <select
                        id="reg-district"
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900 bg-white"
                      >
                        {TAMIL_NADU_DISTRICTS.map((d) => (
                          <option key={d.id} value={d.name}>
                            {lang === 'ta' ? (d.name_ta || d.name) : d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="reg-municipality" className="text-[11px] font-semibold text-slate-700 block">
                        {t.localBodyLabel}
                      </label>
                      <input
                        id="reg-municipality"
                        type="text"
                        placeholder="Greater Chennai Corporation"
                        value={municipality}
                        onChange={(e) => setMunicipality(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900"
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label htmlFor="reg-ward" className="text-[11px] font-semibold text-slate-700 block">
                        {t.wardZoneLabel}
                      </label>
                      <input
                        id="reg-ward"
                        type="text"
                        placeholder="Ward 114"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={consentTerms}
                        onChange={(e) => setConsentTerms(e.target.checked)}
                        className="mt-0.5 rounded text-navy-900 focus:ring-navy-800"
                      />
                      <span>{t.charterConsent}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !fullName.trim()}
                    className="w-full py-2.5 rounded-lg font-semibold text-xs text-white bg-navy-900 hover:bg-navy-950 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>{t.completeSetupBtn}</span>
                  </button>
                </form>
              )}
            </>
          )}

          {/* METHOD 2: PASSWORD LOGIN FLOW */}
          {authMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email-input" className="text-xs font-semibold text-slate-700 block">
                  {t.registeredEmailLabel}
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
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900"
                    required
                    aria-label="Registered email address"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password-input" className="text-xs font-semibold text-slate-700 block">
                  {t.passwordInputLabel}
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
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-navy-900 focus:border-navy-900"
                    required
                    aria-label="Account password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !loginEmail.trim() || !loginPassword}
                className="w-full py-2.5 rounded-lg font-semibold text-xs text-white bg-navy-900 hover:bg-navy-950 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>{t.signIn}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setAuthMethod('otp'); setError(''); }}
                  className="text-xs font-semibold text-navy-900 hover:underline"
                >
                  {lang === 'ta' ? 'புதிய குடிமகன்? மொபைல் OTP மூலம் பதிவு செய்க' : 'New Citizen? Register with Mobile OTP'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer Notice */}
        <div className="py-3 px-4 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          <span>Protected under Tamil Nadu Municipal Grievance Redressal Architecture • PII Encrypted</span>
        </div>

      </div>
    </div>
  );
}
