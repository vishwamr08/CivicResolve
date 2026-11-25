import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Sparkles, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Loader2, Printer, Lock, Unlock
} from 'lucide-react';
import TrackingTimeline from './TrackingTimeline';
import { getAssetUrl, getApiUrl } from '../config/api';
import { translations } from '../data/translations';

export default function ComplaintTracker({
  initialRefId = '',
  _onSelectComplaint,
  onViewReceipt,
  lang = 'en'
}) {
  const [refInput, setRefInput] = useState(initialRefId);
  const [trackingData, setTrackingData] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verification state for PII unmasking
  const [verifyCredential, setVerifyCredential] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  const t = translations[lang] || translations.en;

  const performLookup = useCallback(async (cleanId) => {
    if (!cleanId) return;

    setLoading(true);
    setError(null);
    setIsUnlocked(false);
    setVerifyError(null);
    try {
      const res = await fetch(getApiUrl(`/api/complaints/track/${encodeURIComponent(cleanId)}`));
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `${t.noRecordFound} "${cleanId}".`);
      }
      const data = await res.json();
      setTrackingData(data);
    } catch (err) {
      console.error('Tracking lookup error:', err);
      setError(err.message);
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  }, [t.noRecordFound]);

  useEffect(() => {
    const clean = (initialRefId || '').trim().toUpperCase();
    if (clean) {
      setRefInput(clean);
      performLookup(clean);
    }
  }, [initialRefId, performLookup]);

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    const cleanId = refInput.trim().toUpperCase();
    await performLookup(cleanId);
  };

  const handleVerifyOwnership = async (e) => {
    e.preventDefault();
    if (!trackingData || !verifyCredential.trim()) return;

    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(getApiUrl(`/api/complaints/track/${trackingData.ref_id}/verify-access`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: verifyCredential.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification credential did not match.');
      }

      setTrackingData(data.complaint);
      setIsUnlocked(true);
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const c = trackingData;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-6 font-sans">
      <div className="max-w-2xl">
        <span className="text-[#1a3c6e] font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-1">
          <img src="/civicresolve-logo.png" alt="CivicResolve Logo" className="w-4 h-4 object-contain flex-shrink-0" />
          <span>{t.trackerBadge}</span>
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {t.trackerHeading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {t.trackerDesc}
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="tracker-ref-input"
            aria-label={t.refSearchPlaceholder || 'Grievance Reference Number'}
            type="text"
            placeholder={t.refSearchPlaceholder}
            value={refInput}
            onChange={(e) => setRefInput(e.target.value.toUpperCase())}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 font-mono text-xs sm:text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#1a3c6e] focus:border-[#1a3c6e] bg-slate-50/60"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !refInput.trim()}
          className="px-5 py-2.5 rounded-lg font-semibold text-xs text-white bg-[#f47920] hover:bg-[#d96810] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm min-h-[42px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.searchingBtn}</span>
            </>
          ) : (
            <>
              <span>{t.trackNowBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Reference Format Hint */}
      <p className="text-[11px] text-slate-500">
        Enter the unique reference code provided on your grievance filing receipt (e.g., <span className="font-mono font-medium text-slate-700">CR-TN-2026-XXXXXX</span>).
      </p>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">{lang === 'ta' ? 'தேடல் தோல்வியுற்றது' : 'Lookup Unsuccessful'}</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Tracking Result View */}
      {c && (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100 animate-in fade-in">

          {/* Header Card */}
          <div className="p-4 sm:p-6 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  {c.ref_id}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                  c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                  c.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  c.status === 'Assigned' ? 'bg-indigo-100 text-indigo-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  ● {c.status}
                </span>
                {c.is_appealed ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                    {lang === 'ta' ? 'மறுஆய்வு கோரப்பட்டது' : 'Appealed'}
                  </span>
                ) : null}
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 pt-1">
                {c.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewReceipt && onViewReceipt(c)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors min-h-[40px]"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.ackDownloadPdf}</span>
              </button>
            </div>
          </div>

          {/* Privacy Verification Banner */}
          {!isUnlocked && (
            <div className="p-4 bg-orange-50/60 border-b border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Lock className="w-4 h-4 flex-shrink-0 text-[#f47920]" />
                <span>
                  <strong>{t.unmaskNoticeTitle}:</strong> {t.unmaskNoticeDesc}
                </span>
              </div>
              <form onSubmit={handleVerifyOwnership} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  id="tracker-verify-credential"
                  aria-label={t.credentialInputPlaceholder || 'Registered phone number or email address'}
                  type="text"
                  placeholder={t.credentialInputPlaceholder}
                  value={verifyCredential}
                  onChange={(e) => setVerifyCredential(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-[#1a3c6e] w-full sm:w-60"
                />
                <button
                  type="submit"
                  disabled={verifying || !verifyCredential.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1a3c6e] hover:bg-[#15305a] text-white font-semibold text-xs whitespace-nowrap transition-colors min-h-[36px]"
                >
                  {verifying ? t.verifyingBtn : t.verifyIdentityBtn}
                </button>
              </form>
            </div>
          )}

          {verifyError && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {isUnlocked && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border-b border-emerald-100">
              <Unlock className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span><strong>{lang === 'ta' ? 'அடையாளம் சரிபார்க்கப்பட்டது:' : 'Identity Verified:'}</strong> {lang === 'ta' ? 'முழு தொடர்பு விவரங்கள் திறக்கப்பட்டுள்ளன.' : 'Full citizen case records and feedback actions unlocked.'}</span>
            </div>
          )}

          {/* SLA & Details Bar */}
          <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 bg-white text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t.assignedDeptLabel}</span>
              <strong className="text-slate-900 font-semibold mt-0.5 block truncate">{c.department}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t.districtLabel}</span>
              <strong className="text-slate-800 font-semibold mt-0.5 block truncate">
                {c.district || 'Chennai'} {c.ward ? `• ${c.ward}` : ''}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t.designatedOfficerLabel}</span>
              <strong className="text-slate-800 font-semibold mt-0.5 block truncate">
                {c.assigned_officer || 'Zonal Inspection Desk'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t.slaTargetLabel}</span>
              <strong className="text-[#1a3c6e] font-semibold mt-0.5 flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#f47920]" />
                {c.sla_hours || 24} {lang === 'ta' ? 'மணிகள்' : 'Hours'} ({c.priority})
              </strong>
            </div>
          </div>

          {/* Citizen Details Row */}
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 bg-slate-50/40 text-xs border-t border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t.citizenName}</span>
              <strong className="text-slate-800 font-semibold">{c.citizen_name || 'Citizen'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t.citizenPhone}</span>
              <strong className="text-slate-800 font-mono tabular-nums">{c.citizen_phone || (lang === 'ta' ? 'பாதுகாக்கப்பட்டது' : 'Masked (Privacy Protected)')}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">{t.citizenEmail}</span>
              <strong className="text-slate-800 font-mono truncate block">{c.citizen_email || (lang === 'ta' ? 'பாதுகாக்கப்பட்டது' : 'Masked (Privacy Protected)')}</strong>
            </div>
          </div>

          {/* Action-Taken Remarks & Evidence if available */}
          {(c.resolution_remarks || c.resolution_evidence_url) && (
            <div className="p-4 sm:p-5 bg-emerald-50/60 border-l-4 border-emerald-500 space-y-2 text-xs">
              <h4 className="font-semibold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {lang === 'ta' ? 'கள தீர்வு அறிக்கை' : 'Field Resolution Report'}
              </h4>
              {c.resolution_remarks && (
                <p className="text-emerald-900 leading-relaxed">
                  <strong>{lang === 'ta' ? 'குறிப்புகள்:' : 'Remarks:'}</strong> {c.resolution_remarks}
                </p>
              )}
              {c.resolution_evidence_url && (
                <div className="pt-2">
                  <span className="text-[10px] font-semibold text-emerald-800 block uppercase mb-1">
                    {lang === 'ta' ? 'சீரமைப்பு புகைப்பட ஆதாரம்:' : 'Repair Evidence Photo:'}
                  </span>
                  <img
                    src={getAssetUrl(c.resolution_evidence_url)}
                    alt="Resolution evidence"
                    className="max-h-48 rounded-lg border border-emerald-200 object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Visual Audit Timeline */}
          <div className="p-4 sm:p-6 bg-slate-50/30">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#f47920]" />
              {t.statusHistoryHeading}
            </h4>
            <TrackingTimeline
              statusHistory={c.status_history}
              currentStatus={c.status}
            />
          </div>
        </div>
      )}
    </div>
  );
}
