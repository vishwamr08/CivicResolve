import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Clock, CheckCircle2, AlertTriangle, 
  Wrench, Building2, MapPin, Search, Filter, RefreshCw, 
  Eye, Edit3, Image as ImageIcon, Send, Loader2, ArrowRight, X, ChevronRight, UserCheck
} from 'lucide-react';
import { translations } from '../data/translations';

export default function OfficerPortal({ 
  adminUser, 
  onLogout,
  onSelectComplaint,
  lang = 'en'
}) {
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, inProgress: 0, resolved: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'pending', 'inProgress', 'overdue', 'resolved'
  const [searchTerm, setSearchTerm] = useState('');

  // Officer Reporting Modal
  const [reportingTask, setReportingTask] = useState(null);
  const [reportStatus, setReportStatus] = useState('In Progress');
  const [reportRemarks, setReportRemarks] = useState('');
  const [reportEvidenceUrl, setReportEvidenceUrl] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const t = translations[lang] || translations.en;

  const fetchTasks = async () => {
    const token = localStorage.getItem('civic_admin_token');
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/officer/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Could not load officer assigned tasks.');
      }
      const data = await res.json();
      setTasks(data.tasks || []);
      setCounts(data.counts || { all: 0, pending: 0, inProgress: 0, resolved: 0, overdue: 0 });
    } catch (err) {
      console.error('Error fetching officer tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [adminUser]);

  const handleOpenReport = (task) => {
    setReportingTask(task);
    setReportStatus(task.status === 'Submitted' ? 'In Progress' : task.status);
    setReportRemarks(task.resolution_remarks || '');
    setReportEvidenceUrl(task.resolution_evidence_url || '');
    setInternalNotes(task.internal_notes || '');
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportingTask) return;

    const token = localStorage.getItem('civic_admin_token');
    if (!token) return;

    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/officer/tasks/${reportingTask.id || reportingTask.ref_id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: reportStatus,
          remarks: reportRemarks,
          evidenceUrl: reportEvidenceUrl,
          internalNotes: internalNotes
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to submit report');
      }

      setReportingTask(null);
      await fetchTasks();
    } catch (err) {
      alert(err.message || 'Error updating task');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm.trim() ||
      (task.title && task.title.toLowerCase().includes(term)) ||
      (task.ref_id && task.ref_id.toLowerCase().includes(term)) ||
      (task.location && task.location.toLowerCase().includes(term)) ||
      (task.category && task.category.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (filterTab === 'pending') {
      return task.status === 'Submitted' || task.status === 'Under Review' || task.status === 'Assigned';
    }
    if (filterTab === 'inProgress') {
      return task.status === 'In Progress';
    }
    if (filterTab === 'overdue') {
      return task.sla?.isOverdue && task.status !== 'Resolved';
    }
    if (filterTab === 'resolved') {
      return task.status === 'Resolved';
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Officer Header Card */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-navy-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/20 text-teal-accent text-xs font-semibold border border-teal/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Field Duty & Inspection Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {adminUser?.name || 'Municipal Officer'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Role: <strong className="text-white">{adminUser?.designation || 'Zonal Officer'}</strong></span>
            <span>•</span>
            <span>Department: <strong className="text-white">{adminUser?.department || 'Municipal Operations'}</strong></span>
            <span>•</span>
            <span>Jurisdiction: <strong className="text-white">{adminUser?.district || 'Statewide'}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTasks}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-navy-800 text-slate-300 text-xs font-semibold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Tasks</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-900/60 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* KPI Work Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div 
          onClick={() => setFilterTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'all' ? 'bg-navy-950 text-white border-navy-900 shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">All Assigned</span>
          <p className="text-2xl font-extrabold mt-1">{counts.all}</p>
        </div>

        <div 
          onClick={() => setFilterTab('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'pending' ? 'bg-amber-600 text-white border-amber-700 shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-500">Pending Action</span>
          <p className="text-2xl font-extrabold mt-1">{counts.pending}</p>
        </div>

        <div 
          onClick={() => setFilterTab('inProgress')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'inProgress' ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block text-blue-500">In Progress</span>
          <p className="text-2xl font-extrabold mt-1">{counts.inProgress}</p>
        </div>

        <div 
          onClick={() => setFilterTab('overdue')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'overdue' ? 'bg-rose-600 text-white border-rose-700 shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-500">SLA Overdue</span>
          <p className="text-2xl font-extrabold mt-1">{counts.overdue}</p>
        </div>

        <div 
          onClick={() => setFilterTab('resolved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'resolved' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-500">Certified Resolved</span>
          <p className="text-2xl font-extrabold mt-1">{counts.resolved}</p>
        </div>
      </div>

      {/* Task Queue Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teal" />
            <div>
              <h2 className="font-bold text-lg text-navy-950">
                {t.assignedTasks || 'My Assigned Field Tasks'}
              </h2>
              <p className="text-xs text-slate-500">
                {filteredTasks.length} task(s) matching filter
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, title, ward..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-teal mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading assigned tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No tasks match the selected filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div 
                key={task.id || task.ref_id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-teal/50 hover:shadow-md transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-navy-950 bg-slate-100 px-2.5 py-0.5 rounded">
                      {task.ref_id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                      task.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority} Priority
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {task.status}
                    </span>
                    {task.sla?.isOverdue && task.status !== 'Resolved' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                        SLA Overdue
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-navy-950 line-clamp-1">
                    {task.title}
                  </h3>

                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal" />
                      {task.location} ({task.district} • {task.ward})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-teal font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      SLA: {task.sla_hours || 24}h ({task.sla?.remainingHours || 0}h remaining)
                    </span>
                  </p>

                  {task.resolution_remarks && (
                    <div className="text-xs bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700 mt-1">
                      <strong>Current Remarks:</strong> {task.resolution_remarks}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onSelectComplaint && onSelectComplaint(task)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                    title="View Incident File"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenReport(task)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>File Field Report</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Field Inspection & Report Modal */}
      {reportingTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-teal bg-teal/10 px-2 py-0.5 rounded">
                  {reportingTask.ref_id}
                </span>
                <h3 className="text-lg font-bold text-navy-950 mt-1">
                  Officer Action & Resolution Report
                </h3>
              </div>
              <button
                onClick={() => setReportingTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-navy-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Update Workflow Status <span className="text-teal">*</span>
                </label>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-teal bg-white"
                >
                  <option value="In Progress">In Progress (Field Work Underway)</option>
                  <option value="Resolved">Resolved (Rectification Certified)</option>
                  <option value="Under Review">Under Review (Need Clarification)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  On-Site Action-Taken Remarks <span className="text-teal">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reportRemarks}
                  onChange={(e) => setReportRemarks(e.target.value)}
                  placeholder="Detail the materials used, labor deployed, and repair verification..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Resolution Photo Evidence URL
                </label>
                <input
                  type="text"
                  value={reportEvidenceUrl}
                  onChange={(e) => setReportEvidenceUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or uploaded photo link"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confidential Internal Notes (Restricted to Municipal Staff)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal notes for Zonal Commissioners..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setReportingTask(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-navy-950 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-xs shadow-md shadow-teal/20 disabled:opacity-50"
                >
                  {submittingReport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Report...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Save & Broadcast Notification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
