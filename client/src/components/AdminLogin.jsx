import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, Mail, Eye, EyeOff, 
  ArrowRight, ArrowLeft, Loader2, AlertCircle, KeyRound, Sparkles 
} from 'lucide-react';
import { getApiUrl } from '../config/api';

export default function AdminLogin({ onLoginSuccess, onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both administrator email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      // Store in memory/localStorage & notify App
      onLoginSuccess(data.token, data.admin);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('admin@civicresolve.gov');
    setPassword('CivicAdmin#2026!Secure');
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 px-8 py-8 text-white text-center border-b border-navy-800 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 mx-auto mb-3 shadow-lg shadow-teal-500/30">
            <div className="w-full h-full bg-navy-900 rounded-[14px] flex items-center justify-center">
              <KeyRound className="w-7 h-7 text-teal-accent" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Command Access</h2>
          <p className="text-xs text-slate-300 mt-1">
            Municipal Operations Directorate Authentication
          </p>
        </div>

        {/* Evaluation Fast-Fill Pill */}
        <div className="bg-teal/5 border-b border-teal/10 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-teal" />
            <span className="font-semibold text-slate-700">Evaluation Demo Admin:</span>
          </div>
          <button
            type="button"
            onClick={handleQuickFill}
            className="text-[11px] font-bold text-teal hover:text-teal-dark hover:underline"
          >
            Auto-fill Credentials
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                autoFocus
                placeholder="admin@civicresolve.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-all disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-all disabled:bg-slate-100 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-teal-500 to-teal-dark hover:from-teal-light hover:to-teal shadow-lg shadow-teal-500/25 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Authenticate & Access Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Security Advisory */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400">
              Restricted to authorized municipal duty supervisors. All login attempts and IP addresses are audited for security.
            </p>
          </div>

          {/* Back to Citizen Portal */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Citizen Portal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
