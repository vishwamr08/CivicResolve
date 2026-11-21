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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:my-0 print:max-w-full">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white px-6 py-5 border-b border-navy-700 flex items-center justify-between print:bg-white print:text-navy-950 print:border-b-2 print:border-navy-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/20 border border-teal/40 flex items-center justify-center text-teal-accent print:border-navy-950 print:text-navy-950">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">CivicResolve</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-accent border border-teal-500/30 print:hidden">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors print:hidden"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 sm:p-8 space-y-6">
          
          {/* Success Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3.5 print:bg-slate-50 print:border-slate-300">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900 text-sm">
                {t.receiptTitle || 'Grievance Registered Successfully'}
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                {t.ackNotice || 'Save this reference ID to track status and receive resolution updates.'}
              </p>
            </div>
          </div>

          {/* Reference ID Highlight Box */}
          <div className="bg-slate-50 border-2 border-dashed border-teal/40 rounded-xl p-5 text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.refIdLabel || 'Unique Grievance Reference ID'}
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-wider">
                {complaint.ref_id}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-all print:hidden"
                title="Copy Reference ID"
              >
                {copied ? (
                  <span className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                    <Check className="w-4 h-4" /> Copied
                  </span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Quoting this ID will allow you to track real-time inspection & resolution.
            </p>
          </div>

          {/* Grievance Details Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Citizen Name</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {complaint.citizen_name || 'Citizen'}
                </span>
              </div>
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration Timestamp</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {submissionDate}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/50">
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Jurisdiction (District & Ward)</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal" />
                  {complaint.district || 'Chennai'}{complaint.ward ? ` • ${complaint.ward}` : ''}
                </span>
              </div>
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Nodal Department</span>
                <span className="font-semibold text-navy-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-navy-600" />
                  {complaint.department || 'Municipal Operations'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Category & Priority</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{complaint.category}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    complaint.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                    complaint.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {complaint.priority || 'Medium'} Priority
                  </span>
                </div>
              </div>
              <div className="p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target SLA Resolution Deadline</span>
                <span className="font-bold text-teal flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {slaDeadline} ({complaint.sla_hours || 24}h SLA)
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Grievance Summary</span>
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
              CivicResolve — AI-Powered Citizen Grievance Redressal
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              This acknowledgement is generated electronically upon submission. Guaranteed turnaround enforced by automated escalation timers.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{t.ackDownloadPdf || 'Print / Save Official Receipt'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-slate-600 hover:text-navy-950 font-semibold text-xs transition-colors"
            >
              Done
            </button>
            <button
              onClick={() => {
                onClose();
                if (onTrack) onTrack(complaint.ref_id);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-xs shadow-md shadow-teal/20 transition-all"
            >
              <span>Track Incident Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
