import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, AlertTriangle, Save, Wrench, Loader2 } from 'lucide-react';
import TrackingTimeline from './TrackingTimeline';

const ALL_DEPARTMENTS = [
  'Greater Chennai Corporation - Works & Roads',
  'Greater Chennai Corporation - Solid Waste',
  'Greater Chennai Corporation - Stormwater Drain',
  'Chennai Metro Water (CMWSSB)',
  'TANGEDCO (Tamil Nadu Generation & Distribution)',
  'Tamil Nadu Highways Department',
  'Tamil Nadu Pollution Control Board (TNPCB)',
  'Coimbatore City Municipal Corporation',
  'Madurai City Municipal Corporation',
  'Citizen Grievance Triage Desk'
];

const ALL_CATEGORIES = [
  'Road Damage',
  'Garbage and Sanitation',
  'Water Leakage',
  'Drainage',
  'Streetlight',
  'Electricity',
  'Public Infrastructure',
  'Other'
];

const ALL_STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];
const ALL_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function AdminManageModal({ complaint, isOpen, onClose, onSave }) {
  const [category, setCategory] = useState(complaint?.category || 'Road Damage');
  const [department, setDepartment] = useState(complaint?.department || 'Greater Chennai Corporation - Works & Roads');
  const [status, setStatus] = useState(complaint?.status || 'Under Review');
  const [priority, setPriority] = useState(complaint?.priority || 'Medium');
  const [assignedOfficer, setAssignedOfficer] = useState(complaint?.assigned_officer || 'AE M. Selvam - Ward 104');
  const [slaHours, setSlaHours] = useState(complaint?.sla_hours || 24);
  const [resolutionRemarks, setResolutionRemarks] = useState(complaint?.resolution_remarks || '');
  const [internalNotes, setInternalNotes] = useState(complaint?.internal_notes || '');
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState(complaint?.resolution_evidence_url || '');
  const [duplicateOfRefId, setDuplicateOfRefId] = useState(complaint?.duplicate_of_ref_id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'history'

  useEffect(() => {
    if (complaint) {
      setCategory(complaint.category || 'Road Damage');
      setDepartment(complaint.department || 'Greater Chennai Corporation - Works & Roads');
      setStatus(complaint.status || 'Under Review');
      setPriority(complaint.priority || 'Medium');
      setAssignedOfficer(complaint.assigned_officer || 'AE M. Selvam - Ward 104');
      setSlaHours(complaint.sla_hours || 24);
      setResolutionRemarks(complaint.resolution_remarks || '');
      setInternalNotes(complaint.internal_notes || '');
      setResolutionEvidenceUrl(complaint.resolution_evidence_url || '');
      setDuplicateOfRefId(complaint.duplicate_of_ref_id || '');
    }
  }, [complaint]);

  if (!isOpen || !complaint) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(complaint.id, {
        category,
        department,
        status,
        priority,
        assigned_officer: assignedOfficer,
        sla_hours: parseInt(slaHours, 10) || 24,
        resolution_remarks: resolutionRemarks,
        internal_notes: internalNotes,
        resolution_evidence_url: resolutionEvidenceUrl,
        duplicate_of_ref_id: duplicateOfRefId.trim() || null
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickResolve = () => {
    setStatus('Resolved');
    if (!resolutionRemarks) {
      setResolutionRemarks('Civic hazard inspected on site by field squad, repaired in compliance with municipal safety standards, and verified.');
    }
    if (!resolutionEvidenceUrl) {
      setResolutionEvidenceUrl('https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800&auto=format&fit=crop&q=80');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 px-6 py-5 text-white flex items-center justify-between border-b border-navy-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/20 border border-teal/40 flex items-center justify-center text-teal-accent">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-accent bg-teal/10 px-2.5 py-0.5 rounded border border-teal/30">
                  {complaint.ref_id}
                </span>
                <span className="text-xs uppercase font-bold text-slate-300">
                  Municipal Action & Task Desk (e-Yantra Workflow)
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5 line-clamp-1">
                {complaint.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'manage' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Task Allocation & Resolution Action
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'history' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Audit Trail & Logs ({complaint.status_history?.length || 0})
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            Status: <strong className="text-teal font-bold">{complaint.status}</strong>
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'history' ? (
            <div className="space-y-4">
              <TrackingTimeline
                statusHistory={complaint.status_history}
                currentStatus={complaint.status}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Appealed Alert Banner if citizen appealed */}
              {complaint.is_appealed ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Citizen Reopen Request / Appeal Active</span>
                  </div>
                  <p><strong>Citizen Reason:</strong> {complaint.appeal_reason || 'Resolution incomplete.'}</p>
                </div>
              ) : null}

              {/* AI Recommendation Snapshot */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal/5 to-slate-50 border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Civic AI Triage Telemetry</span>
                  </div>
                  {complaint.ai_confidence > 0 && (
                    <span className="text-[11px] font-mono font-bold text-teal bg-white px-2 py-0.5 rounded border border-teal/20">
                      Confidence: {Math.round(complaint.ai_confidence * 100)}%
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-navy-900 italic">
                  "{complaint.ai_summary || complaint.title}"
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-teal/10 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Recommended Dept</span>
                    <strong className="text-slate-800 font-semibold">{complaint.ai_department || 'Roads & Highways'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Assessed Severity</span>
                    <strong className="text-amber-600 font-semibold">{complaint.ai_priority || complaint.priority}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Target SLA</span>
                    <strong className="text-slate-800 font-semibold">{complaint.sla_hours || 24}h</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Safety Risk</span>
                    <strong className="text-rose-600 font-semibold truncate block">{complaint.ai_safety_risk || 'None'}</strong>
                  </div>
                </div>
              </div>

              {/* Department & Officer Allocation (e-Yantra Pattern) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Grievance Category <span className="text-teal">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-teal bg-white"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nodal Department <span className="text-teal">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-teal bg-white"
                  >
                    {ALL_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Field Officer / Squad
                  </label>
                  <input
                    type="text"
                    value={assignedOfficer}
                    onChange={(e) => setAssignedOfficer(e.target.value)}
                    placeholder="e.g. AE M. Selvam - Ward 104"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-teal"
                  />
                </div>
              </div>

              {/* Status, Priority & SLA Target */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Workflow Status <span className="text-teal">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-teal bg-white"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Priority Level <span className="text-teal">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-teal bg-white"
                  >
                    {ALL_PRIORITIES.map((pr) => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SLA Resolution Target (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={slaHours}
                    onChange={(e) => setSlaHours(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-teal"
                  />
                </div>
              </div>

              {/* Action-Taken Remarks & Evidence Photo URL */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Official Action-Taken Remarks (Public Audit)
                  </label>
                  {status !== 'Resolved' && (
                    <button
                      type="button"
                      onClick={handleQuickResolve}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      ⚡ Quick Certify & Resolve
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={resolutionRemarks}
                  onChange={(e) => setResolutionRemarks(e.target.value)}
                  placeholder="Detail the field repair, materials used, inspection results, and date of completion..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Resolution Photo Evidence URL
                    </label>
                    <input
                      type="text"
                      value={resolutionEvidenceUrl}
                      onChange={(e) => setResolutionEvidenceUrl(e.target.value)}
                      placeholder="https://.../photo-repair.jpg"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Link Duplicate Reference ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={duplicateOfRefId}
                      onChange={(e) => setDuplicateOfRefId(e.target.value)}
                      placeholder="e.g. CR-TN-2026-1042"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-teal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Internal Engineering & Supervisory Notes (Restricted)
                  </label>
                  <textarea
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Confidential notes for Zonal Commissioners and Department Engineers..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-navy-950 font-semibold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-dark hover:from-teal-light hover:to-teal text-white font-bold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Audit Entry...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save & Broadcast Update</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
