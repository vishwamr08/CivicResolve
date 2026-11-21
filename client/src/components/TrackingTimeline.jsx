import React from 'react';
import { 
  CheckCircle2, Clock, UserCheck, Wrench, 
  Send, User, Sparkles 
} from 'lucide-react';

const STATUS_ORDER = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];

const STATUS_ICONS = {
  'Submitted': Send,
  'Under Review': Clock,
  'Assigned': UserCheck,
  'In Progress': Wrench,
  'Resolved': CheckCircle2
};

export default function TrackingTimeline({ statusHistory, currentStatus }) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  // Group or match events from statusHistory
  const events = statusHistory || [];

  return (
    <div className="space-y-6 font-sans">
      {/* Horizontal Stepper Progress Bar */}
      <div className="relative">
        <div className="overflow-hidden h-1.5 mb-4 text-xs flex rounded-full bg-slate-200">
          <div
            style={{ 
              width: `${Math.max(10, ((currentIndex + 1) / STATUS_ORDER.length) * 100)}%` 
            }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#1a3c6e] transition-all duration-300"
          ></div>
        </div>

        <div className="grid grid-cols-5 gap-1 text-center">
          {STATUS_ORDER.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const Icon = STATUS_ICONS[step] || Clock;

            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shadow-xs ${
                  isCurrent 
                    ? 'bg-[#1a3c6e] text-white ring-2 ring-[#1a3c6e]/20' 
                    : isCompleted 
                    ? 'bg-[#138808] text-white' 
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[11px] mt-2 font-medium ${
                  isCurrent ? 'text-[#1a3c6e] font-semibold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {step}
                </span>
                {isCurrent && (
                  <span className="text-[9px] font-semibold text-[#1a3c6e] bg-navy-50 px-1.5 py-0.2 rounded mt-0.5 border border-navy-100">
                    Active
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical Detailed History Log */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#1a3c6e]" />
          <span>Audit Log & Status Event History</span>
        </h4>

        {events.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No historical status records logged yet.</p>
        ) : (
          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {events.map((evt, i) => {
              const isLatest = i === events.length - 1;
              const isAi = evt.actor && (
                evt.actor.toLowerCase().includes('ai') || 
                evt.actor.toLowerCase().includes('triage') ||
                evt.actor.toLowerCase().includes('system')
              );
              const isAdmin = evt.actor && (evt.actor.toLowerCase().includes('admin') || evt.actor.toLowerCase().includes('officer'));

              return (
                <div key={i} className="relative group">
                  {/* Dot */}
                  <div className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                    isLatest ? 'bg-[#1a3c6e]' : 'bg-slate-400'
                  }`}></div>

                  <div className={`p-3.5 rounded-lg border transition-colors ${
                    isLatest 
                      ? 'bg-slate-50 border-slate-300 shadow-xs' 
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          evt.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                          evt.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          evt.status === 'Assigned' ? 'bg-purple-100 text-purple-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {evt.status}
                        </span>

                        {evt.actor && (
                          <span className={`text-[11px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded ${
                            isAi ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                            isAdmin ? 'bg-navy-50 text-[#1a3c6e] border border-navy-100' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {isAi ? <Sparkles className="w-3 h-3 text-[#f47920]" /> : <User className="w-3 h-3 text-slate-500" />}
                            <span>{evt.actor}</span>
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Recorded'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {evt.note || `Status transitioned to ${evt.status}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
