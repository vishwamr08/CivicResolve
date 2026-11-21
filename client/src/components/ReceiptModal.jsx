import React, { useRef } from 'react';
import { 
  CheckCircle2, Printer, Copy, Check, X, ShieldCheck, 
  MapPin, Calendar, Clock, Building2, User, ArrowRight 
} from 'lucide-react';
import { translations } from '../data/translations';

export default function ReceiptModal({ 
  complaint, 
  isOpen, 
  onClose, 
  onTrack, 
  lang = 'en' 
}) {
  const [copied, setCopied] = React.useState(false);
  const receiptRef = useRef(null);
  const t = translations[lang] || translations.en;

  if (!isOpen || !complaint) return null;

  const handleCopy = () => {
    if (complaint?.ref_id) {
      navigator.clipboard.writeText(complaint.ref_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const submissionDate = complaint.created_at 
    ? new Date(complaint.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString('en-IN');

  const slaDeadline = complaint.sla_deadline
    ? new Date(complaint.sla_deadline).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : `${complaint.sla_hours || 24} Hours from registration`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-in fade-in duration-200 print:shadow-none print:border-none print:my-0 print:max-w-full">
        
        {/* Top Header */}
        <div className="bg-navy-950 text-white px-6 py-4 border-b border-navy-900 flex items-center justify-between print:bg-white print:text-navy-950 print:border-b-2 print:border-navy-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-900 border border-navy-800 flex items-center justify-center text-saffron print:border-navy-950 print:text-navy-950">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight">CivicResolve</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-navy-900 text-saffron border border-saffron/30 print:hidden">
                  Official Slip
                </span>
              </div>
              <p className="text-xs text-slate-300 print:text-slate-600">
                {lang === 'ta' ? 'குடிமக்கள் குறைதீர்ப்பு ரசீது' : 'Public Grievance Acknowledgement Slip'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors print:hidden"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 sm:p-8 space-y-5">
          
          {/* Success Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-start gap-3 print:bg-slate-50 print:border-slate-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900 text-xs sm:text-sm">
                {t.receiptTitle || 'Grievance Registered Successfully'}
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                {t.ackNotice || 'Save this reference ID to track status and receive resolution updates.'}
              </p>
            </div>
          </div>

          {/* Reference ID Highlight Box */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 text-center space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {t.refIdLabel || 'Unique Grievance Reference ID'}
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tracking-wider tabular-nums">
                {complaint.ref_id}
              </span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors print:hidden inline-flex items-center gap-1"
                title="Copy Reference ID"
              >
                {copied ? (
                  <span className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                    <Check className="w-3.5 h-3.5" /> Copied
                  </span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Quoting this ID will allow you to track real-time inspection & resolution.
            </p>
          </div>

          {/* Grievance Details Grid */}
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
              <div className="p-3 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Citizen Name</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {complaint.citizen_name || 'Citizen'}
                </span>
              </div>
              <div className="p-3 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Registration Timestamp</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {submissionDate}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/50">
              <div className="p-3 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Jurisdiction (District & Ward)</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {complaint.district || 'Chennai'}{complaint.ward ? ` • ${complaint.ward}` : ''}
                </span>
              </div>
              <div className="p-3 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Nodal Department</span>
                <span className="font-semibold text-navy-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-navy-700" />
                  {complaint.department || 'Municipal Operations'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
              <div className="p-3 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Category & Priority</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{complaint.category}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    complaint.priority === 'Critical' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                    complaint.priority === 'High' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {complaint.priority || 'Medium'} Priority
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Target SLA Resolution Deadline</span>
                <span className="font-semibold text-navy-900 flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {slaDeadline}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50/50 space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Grievance Summary</span>
              <p className="font-medium text-slate-700 leading-relaxed">
                {complaint.title}
              </p>
              {complaint.location && (
                <p className="text-[11px] text-slate-500 mt-1">
                  <strong>Location:</strong> {complaint.location}
                </p>
              )}
            </div>
          </div>

          {/* Acknowledgement Footer */}
          <div className="text-[11px] text-slate-500 bg-slate-100 p-3 rounded-lg border border-slate-200 text-center leading-normal">
            <p className="font-semibold text-slate-700">
              CivicResolve — Citizen Grievance Redressal
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              This acknowledgement is generated electronically upon submission. Guaranteed turnaround enforced by automated escalation timers.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.ackDownloadPdf || 'Print / Save Official Receipt'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors"
            >
              Done
            </button>
            <button
              onClick={() => {
                onClose();
                if (onTrack) onTrack(complaint.ref_id);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-950 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <span>Track Incident Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
