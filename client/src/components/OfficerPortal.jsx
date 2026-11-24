import React, { useState, useEffect } from 'react';
import {
  Clock, Wrench, MapPin, Search, RefreshCw,
  Eye, Edit3, Image as Send, Loader2, X, UserCheck, AlertCircle
} from 'lucide-react';
import { translations } from '../data/translations';
import { getApiUrl } from '../config/api';

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
      const res = await fetch(getApiUrl('/api/officer/tasks'), {
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
      const res = await fetch(getApiUrl(`/api/officer/tasks/${reportingTask.id || reportingTask.ref_id}/report`), {
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
      <div className="bg-[#0f2040] rounded-xl p-6 sm:p-8 text-white shadow-sm border border-navy-850 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-navy-900 text-saffron text-xs font-semibold border border-saffron/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Field Duty & Inspection Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {adminUser?.name || 'Municipal Officer'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Role: <strong className="text-white font-semibold">{adminUser?.designation || 'Zonal Officer'}</strong></span>
            <span>•</span>
            <span>Department: <strong className="text-white font-semibold">{adminUser?.department || 'Municipal Operations'}</strong></span>
            <span>•</span>
            <span>Jurisdiction: <strong className="text-white font-semibold">{adminUser?.district || 'Statewide'}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTasks}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-600 hover:bg-navy-900 text-slate-200 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Tasks</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-lg bg-navy-900 hover:bg-rose-950 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Work Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setFilterTab('all')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            filterTab === 'all'
              ? 'bg-navy-950 text-white border-navy-900 shadow-sm'
              : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">All Assigned</span>
          <p className="text-2xl font-bold mt-1 tabular-nums tracking-tight">{counts.all}</p>
        </div>

        <div
          onClick={() => setFilterTab('pending')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            filterTab === 'pending'
              ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
              : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-700">Pending Action</span>
          <p className="text-2xl font-bold mt-1 tabular-nums tracking-tight">{counts.pending}</p>
        </div>

        <div
          onClick={() => setFilterTab('inProgress')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            filterTab === 'inProgress'
              ? 'bg-navy-800 text-white border-navy-900 shadow-sm'
              : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block text-navy-800">In Progress</span>
          <p className="text-2xl font-bold mt-1 tabular-nums tracking-tight">{counts.inProgress}</p>
        </div>

        <div
          onClick={() => setFilterTab('overdue')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            filterTab === 'overdue'
              ? 'bg-rose-700 text-white border-rose-800 shadow-sm'
              : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-700">SLA Overdue</span>
          <p className="text-2xl font-bold mt-1 tabular-nums tracking-tight">{counts.overdue}</p>
        </div>

        <div
          onClick={() => setFilterTab('resolved')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            filterTab === 'resolved'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-700">Certified Resolved</span>
          <p className="text-2xl font-bold mt-1 tabular-nums tracking-tight">{counts.resolved}</p>
        </div>
      </div>

      {/* Task Queue Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-800">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                {t.assignedTasks || 'My Assigned Field Tasks'}
              </h2>
              <p className="text-xs text-slate-500 tabular-nums">
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
                className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-navy-800 mx-auto" />
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
                className="p-4 sm:p-5 rounded-xl border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-navy-950 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 tabular-nums">
                      {task.ref_id}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      task.priority === 'Critical' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                      task.priority === 'High' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {task.priority} Priority
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      task.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      task.status === 'In Progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {task.status}
                    </span>
                    {task.sla?.isOverdue && task.status !== 'Resolved' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                        SLA Overdue
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-slate-900 line-clamp-1">
                    {task.title}
                  </h3>

                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {task.location} ({task.district} • {task.ward})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      SLA: <strong className="font-mono tabular-nums">{task.sla_hours || 24}h</strong> ({task.sla?.remainingHours || 0}h remaining)
                    </span>
                  </p>

                  {task.resolution_remarks && (
                    <div className="text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-slate-700 mt-1">
                      <strong>Current Remarks:</strong> {task.resolution_remarks}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onSelectComplaint && onSelectComplaint(task)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                    title="View Incident File"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenReport(task)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-navy-900 hover:bg-navy-950 text-white font-semibold text-xs shadow-sm transition-colors"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full border border-slate-200 shadow-xl p-6 sm:p-8 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-navy-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tabular-nums">
                  {reportingTask.ref_id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Officer Action & Resolution Report
                </h3>
              </div>
              <button
                onClick={() => setReportingTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Update Workflow Status <span className="text-saffron-dark">*</span>
                </label>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-navy-800 bg-white focus:outline-none"
                >
                  <option value="In Progress">In Progress (Field Work Underway)</option>
                  <option value="Resolved">Resolved (Rectification Certified)</option>
                  <option value="Under Review">Under Review (Need Clarification)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  On-Site Action-Taken Remarks <span className="text-saffron-dark">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reportRemarks}
                  onChange={(e) => setReportRemarks(e.target.value)}
                  placeholder="Detail the materials used, labor deployed, and repair verification..."
                  className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Resolution Photo Evidence URL
                </label>
                <input
                  type="text"
                  value={reportEvidenceUrl}
                  onChange={(e) => setReportEvidenceUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or uploaded photo link"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confidential Internal Notes (Restricted to Municipal Staff)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal notes for Zonal Commissioners..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setReportingTask(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:text-navy-950 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-950 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors"
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
