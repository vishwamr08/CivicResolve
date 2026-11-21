import React, { useState } from 'react';
import { 
  Search, ShieldCheck, MapPin, Calendar, Building2, 
  Sparkles, CheckCircle2, Clock, AlertTriangle, ArrowRight, 
  Loader2, Navigation, Printer, Star, UserCheck, Image as ImageIcon,
  Lock, KeyRound, Unlock, Phone, Mail
} from 'lucide-react';
import TrackingTimeline from './TrackingTimeline';
import { getAssetUrl, getApiUrl } from '../config/api';

export default function ComplaintTracker({ 
  initialRefId = '', 
  onSelectComplaint,
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

  // Quick Demo Reference IDs
  const sampleIds = [
    'CR-TN-2026-763221',
    'CR-TN-2026-891623',
    'CR-TN-2026-546632',
    'CR-2026-1042'
  ];

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    const cleanId = refInput.trim();
    if (!cleanId) return;

    setLoading(true);
    setError(null);
    setIsUnlocked(false);
    setVerifyError(null);
    try {
      const res = await fetch(getApiUrl(`/api/complaints/track/${encodeURIComponent(cleanId)}`));
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `No grievance found with reference ID "${cleanId}".`);
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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="max-w-2xl">
        <span className="text-teal font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Real-Time Grievance Lifecycle Tracker</span>
        </span>
        <h2 className="text-2xl font-bold text-navy-950 tracking-tight">
          Track Your Municipal Complaint
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Enter your Reference ID (e.g. CR-TN-2026-XXXXXX) to inspect field crew updates, assigned officers, and guaranteed SLA timers.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Enter Reference ID (e.g. CR-TN-2026-763221)..."
            value={refInput}
            onChange={(e) => setRefInput(e.target.value.toUpperCase())}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm uppercase focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal bg-slate-50/60"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !refInput.trim()}
          className="px-6 py-3 rounded-xl font-bold text-xs text-white bg-teal hover:bg-teal-dark disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-teal/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fetching Status...</span>
            </>
          ) : (
            <>
              <span>Track Grievance</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick Test Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold">Quick Test IDs:</span>
        {sampleIds.map(id => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setRefInput(id);
              fetch(getApiUrl(`/api/complaints/track/${id}`))
                .then(r => r.json())
                .then(d => { setTrackingData(d); setError(null); setIsUnlocked(false); })
                .catch(e => setError(e.message));
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition-colors"
          >
            {id}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <div>
            <p className="font-bold">Lookup Unsuccessful</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Tracking Result View */}
      {c && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 animate-in fade-in slide-in-from-bottom-2">
          
          {/* Header Card */}
          <div className="p-5 sm:p-6 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-navy-950 bg-white px-3 py-1 rounded-lg border border-slate-200">
                  {c.ref_id}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                  c.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  c.status === 'Assigned' ? 'bg-indigo-100 text-indigo-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  ● {c.status}
                </span>
                {c.is_appealed ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                    Appealed
                  </span>
                ) : null}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-navy-950 pt-1">
                {c.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewReceipt && onViewReceipt(c)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>

          {/* Privacy Verification Banner */}
          {!isUnlocked && (
            <div className="p-4 bg-teal-50/50 border-b border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-teal-dark">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Privacy Protected:</strong> Citizen personal information is masked for public safety.
                </span>
              </div>
              <form onSubmit={handleVerifyOwnership} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Verify registered email or phone..."
                  value={verifyCredential}
                  onChange={(e) => setVerifyCredential(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-teal-200 text-xs bg-white focus:ring-1 focus:ring-teal w-full sm:w-60"
                />
                <button
                  type="submit"
                  disabled={verifying || !verifyCredential.trim()}
                  className="px-3 py-1.5 rounded-lg bg-teal hover:bg-teal-dark text-white font-semibold text-xs whitespace-nowrap transition-colors"
                >
                  {verifying ? 'Verifying...' : 'Unlock'}
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
              <span><strong>Identity Verified:</strong> Full citizen case records and feedback actions unlocked.</span>
            </div>
          )}

          {/* SLA & Details Bar */}
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Nodal Department</span>
              <strong className="text-navy-950 font-semibold mt-0.5 block">{c.department}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Jurisdiction</span>
              <strong className="text-slate-800 font-semibold mt-0.5 block">
                {c.district || 'Chennai'} {c.ward ? `• ${c.ward}` : ''}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Field Officer</span>
              <strong className="text-slate-800 font-semibold mt-0.5 block">
                {c.assigned_officer || 'Zonal Inspection Desk'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">SLA Target</span>
              <strong className="text-teal font-semibold mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {c.sla_hours || 24} Hours ({c.priority} Priority)
              </strong>
            </div>
          </div>

          {/* Citizen Details Row */}
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/40 text-xs border-t border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Reported By</span>
              <strong className="text-slate-800 font-semibold">{c.citizen_name || 'Citizen'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
              <strong className="text-slate-800 font-mono">{c.citizen_phone || 'Masked (Privacy Protected)'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Email</span>
              <strong className="text-slate-800 font-mono">{c.citizen_email || 'Masked (Privacy Protected)'}</strong>
            </div>
          </div>

          {/* Action-Taken Remarks & Evidence if available */}
          {(c.resolution_remarks || c.resolution_evidence_url) && (
            <div className="p-5 bg-emerald-50/60 border-l-4 border-emerald-500 space-y-2 text-xs">
              <h4 className="font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Field Resolution Report
              </h4>
              {c.resolution_remarks && (
                <p className="text-emerald-900 leading-relaxed">
                  <strong>Remarks:</strong> {c.resolution_remarks}
                </p>
              )}
              {c.resolution_evidence_url && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase mb-1">
                    Repair Evidence Photo:
                  </span>
                  <img
                    src={getAssetUrl(c.resolution_evidence_url)}
                    alt="Resolution evidence"
                    className="max-h-48 rounded-xl border border-emerald-200 object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Visual Audit Timeline */}
          <div className="p-5 sm:p-6 bg-slate-50/30">
            <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal" />
              Official Redressal Timeline
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
