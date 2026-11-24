import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, ShieldAlert,
  Clock, Building2, Copy, Check, ArrowRight, X
} from 'lucide-react';

export default function AiAnalysisModal({ complaint, isOpen, onClose, onViewDetails }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !complaint) return null;

  const isUnavailable = complaint.ai_status === 'UNAVAILABLE';

  const copyRefId = () => {
    navigator.clipboard.writeText(complaint.ref_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-in fade-in duration-200">
        {/* Banner Header */}
        <div className={`px-6 py-4 text-white flex items-center justify-between border-b ${
          isUnavailable
            ? 'bg-amber-950 border-amber-900'
            : 'bg-navy-950 border-navy-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isUnavailable ? 'bg-amber-900/60 text-amber-300 border border-amber-800' : 'bg-navy-900 text-saffron border border-navy-800'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  {isUnavailable ? 'Manual Queue Fallback Active' : 'CivicResolve Triage Assessment Complete'}
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300">
                {isUnavailable
                  ? 'Honest Fallback: AI unavailable, routed to human desk'
                  : 'Multi-modal analysis successfully generated & verified'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reference ID Pill & Status Header */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Tracking Reference:</span>
            <div className="inline-flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-300 shadow-xs">
              <span className="font-mono text-xs font-bold text-navy-900 tabular-nums">{complaint.ref_id}</span>
              <button
                onClick={copyRefId}
                className="text-slate-400 hover:text-navy-900 transition-colors p-0.5"
                title="Copy Reference ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            {copied && <span className="text-[11px] text-emerald-600 font-medium">Copied</span>}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Recorded Status:</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              {complaint.status}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* If AI was unavailable, show honest warning banner */}
          {isUnavailable ? (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Notice: Automated AI Triage Unavailable</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {complaint.ai_reason || 'AI service was not accessible or GEMINI_API_KEY is not configured in backend environment. In strict adherence to platform honesty, deterministic fallback triage has been applied.'}
              </p>
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-700 font-medium">
                <span>Action: Routed to Municipal Operations Manual Dispatch desk</span>
                <span className="font-bold">Manual SLA: 48-72h</span>
              </div>
            </div>
          ) : (
            /* AI Success High-impact Panel */
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-navy-800" />
                    Incident Technical Synthesis
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white text-navy-900 border border-slate-200 tabular-nums">
                    Confidence: {Math.round((complaint.ai_confidence || 0.95) * 100)}%
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                  "{complaint.ai_summary || complaint.title}"
                </p>
              </div>

              {/* Grid of AI metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Detected Category */}
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Verified Category
                  </span>
                  <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                    {complaint.ai_category || complaint.category}
                  </div>
                </div>

                {/* Priority Badge */}
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Safety Urgency (Priority)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      complaint.priority === 'Critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      complaint.priority === 'High' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {complaint.priority} Priority
                    </span>
                  </div>
                </div>

                {/* Recommended Department */}
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Allocated Municipal Agency
                  </span>
                  <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-navy-700 flex-shrink-0" />
                    <span className="truncate">{complaint.department || complaint.ai_department}</span>
                  </div>
                </div>

                {/* Response SLA */}
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Suggested Response Time
                  </span>
                  <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-mono tabular-nums">{complaint.ai_suggested_response_time || '24 hours'}</span>
                  </div>
                </div>
              </div>

              {/* Safety Risk Warning Box */}
              {complaint.ai_safety_risk && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-800 text-[11px] uppercase tracking-wider mb-0.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Public Safety Hazard Assessment</span>
                  </div>
                  <p className="leading-relaxed">
                    {complaint.ai_safety_risk}
                  </p>
                </div>
              )}

              {/* Recommended Action */}
              {complaint.ai_recommended_action && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-0.5">
                    <CheckCircle2 className="w-4 h-4 text-navy-800" />
                    <span>Recommended Field Action</span>
                  </div>
                  <p className="leading-relaxed">
                    {complaint.ai_recommended_action}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Dismiss
          </button>

          <button
            onClick={() => {
              onClose();
              if (onViewDetails) onViewDetails(complaint);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-navy-900 hover:bg-navy-950 transition-colors shadow-sm"
          >
            <span>View Full Incident Audit File</span>
            <ArrowRight className="w-3.5 h-3.5 text-saffron" />
          </button>
        </div>
      </div>
    </div>
  );
}
