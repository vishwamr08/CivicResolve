import React from 'react';
import {
  X, MapPin, Calendar, CheckCircle2, Wrench
} from 'lucide-react';
import TrackingTimeline from './TrackingTimeline';
import { getAssetUrl } from '../config/api';

export default function ComplaintDetailsModal({
  complaint,
  isOpen,
  onClose,
  onManageComplaint
}) {
  if (!isOpen || !complaint) return null;

  const isAiSuccess = complaint.ai_status === 'SUCCESS';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full border border-slate-200 shadow-xl overflow-hidden my-auto animate-in fade-in duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-navy-950 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between border-b border-navy-900 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/civicresolve-logo.png"
              alt="CivicResolve Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain flex-shrink-0 drop-shadow-sm"
            />
            <span className="font-mono text-xs font-bold text-navy-950 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 tabular-nums">
              {complaint.ref_id}
            </span>
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md ${
              complaint.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              complaint.status === 'In Progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
              complaint.status === 'Assigned' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
              'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {complaint.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {/* Title & Metadata */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              {complaint.title}
            </h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{complaint.location}</span>
                {complaint.is_gps_verified ? (
                  <span className="ml-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    GPS Geotag Verified ({complaint.latitude}, {complaint.longitude})
                  </span>
                ) : (
                  <span className="ml-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                    Manual Street Address
                  </span>
                )}
              </span>
              <span>â€¢</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="tabular-nums">{new Date(complaint.created_at).toLocaleString('en-IN')}</span>
              </span>
            </div>
          </div>

          {/* Photo Evidence (if uploaded) */}
          {complaint.image_url && (
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Citizen Photo Evidence
              </span>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 max-h-72 flex items-center justify-center">
                <img
                  src={getAssetUrl(complaint.image_url)}
                  alt="Incident Visual Evidence"
                  className="w-full h-full object-contain max-h-72"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800';
                  }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Citizen Description
            </span>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {complaint.description}
            </div>
          </div>

          {/* Resolution Remarks (if recorded) */}
          {complaint.resolution_remarks && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px] uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Official Resolution Remarks</span>
              </div>
              <p className="font-medium leading-relaxed">
                {complaint.resolution_remarks}
              </p>
            </div>
          )}

          {/* AI-Powered Complaint Analysis */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-navy-900 text-saffron flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">CivicResolve Triage Assessment</h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Status: <strong className={isAiSuccess ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>{complaint.ai_status}</strong>
                  </span>
                </div>
              </div>

              {complaint.ai_confidence > 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-medium">Confidence</span>
                  <span className="text-xs font-mono font-bold text-navy-900 tabular-nums">
                    {Math.round(complaint.ai_confidence * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* AI Summary */}
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Technical Synthesis
              </span>
              <p className="text-xs font-medium text-slate-800 italic">
                "{complaint.ai_summary || complaint.title}"
              </p>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Priority</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{complaint.priority}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Category</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">{complaint.category}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Target SLA</span>
                <span className="font-bold text-slate-900 mt-0.5 block font-mono tabular-nums">{complaint.ai_suggested_response_time || `${complaint.sla_hours || 24}h`}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">Department</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">{complaint.department || 'Roads'}</span>
              </div>
            </div>

            {/* Safety Risk */}
            {complaint.ai_safety_risk && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
                <span className="font-semibold text-rose-800 block text-[11px] mb-0.5">Assessed Safety Threat:</span>
                {complaint.ai_safety_risk}
              </div>
            )}

            {/* Recommended Action */}
            {complaint.ai_recommended_action && (
              <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">Recommended Field Action:</span>
                {complaint.ai_recommended_action}
              </div>
            )}
          </div>

          {/* Lifecycle Tracking Timeline */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">
              Live Lifecycle Progression
            </h4>
            <TrackingTimeline
              statusHistory={complaint.status_history}
              currentStatus={complaint.status}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          {onManageComplaint ? (
            <button
              onClick={() => {
                onClose();
                onManageComplaint(complaint);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-navy-900 hover:bg-navy-950 text-white transition-colors shadow-sm"
            >
              <Wrench className="w-3.5 h-3.5 text-saffron" />
              <span>Open Admin Management Desk</span>
            </button>
          ) : <div></div>}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
