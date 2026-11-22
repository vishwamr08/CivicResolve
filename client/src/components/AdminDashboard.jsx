import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, 
  BarChart3, PieChart as PieIcon, RefreshCw, Eye, Edit3, Wrench, Search,
  Mail, Send, Loader2, RotateCcw, Map as MapIcon, Inbox
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import ComplaintMap from './ComplaintMap';
import { getApiUrl } from '../config/api';
import { translations } from '../data/translations';

export default function AdminDashboard({ 
  stats, 
  complaints, 
  onRefresh, 
  onSelectComplaint, 
  onManageComplaint,
  adminUser,
  onLogout,
  lang = 'en'
}) {
  const [activeAdminTab, setActiveAdminTab] = useState('inbox'); // 'inbox', 'analytics', 'map', 'notifications', 'duplicates'
  
  const t = translations[lang] || translations.en;
  
  // Inbox filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [onlyAppealed, setOnlyAppealed] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Notification center state
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('admin@civicresolve.gov');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);
  const [retryingLogId, setRetryingLogId] = useState(null);

  // KPI Metrics
  const total = stats ? stats.totalComplaints : complaints.length;
  const pending = stats ? stats.pendingComplaints : complaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length;
  const highPriority = stats ? stats.highPriorityComplaints : complaints.filter(c => c.priority === 'High').length;
  const critical = stats ? stats.criticalComplaints : complaints.filter(c => c.priority === 'Critical').length;
  const inProgress = stats ? stats.inProgressComplaints : complaints.filter(c => c.status === 'Assigned' || c.status === 'In Progress').length;
  const resolved = stats ? stats.resolvedComplaints : complaints.filter(c => c.status === 'Resolved').length;
  const overdueCount = stats ? (stats.overdueComplaints || 0) : complaints.filter(c => c.sla?.isOverdue && c.status !== 'Resolved').length;
  const appealedCount = complaints.filter(c => c.is_appealed).length;

  // Chart data
  const categoryData = stats?.categoryDistribution || [];
  const priorityData = stats?.priorityDistribution || [];

  const PRIORITY_COLORS = {
    'Critical': '#dc2626',
    'High': '#f47920',
    'Medium': '#2a5298',
    'Low': '#64748b'
  };

  const fetchNotificationLogs = async () => {
    const token = localStorage.getItem('civic_admin_token');
    if (!token) return;

    setLoadingLogs(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/notifications/logs?limit=40'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Could not fetch notification logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'notifications') {
      fetchNotificationLogs();
    }
  }, [activeAdminTab]);

  const handleTestSmtp = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('civic_admin_token');
    if (!token || !testEmailTo) return;

    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch(getApiUrl('/api/admin/notifications/test-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ to: testEmailTo.trim() })
      });
      const data = await res.json();
      setSmtpTestResult(data);
      await fetchNotificationLogs();
    } catch (err) {
      setSmtpTestResult({ success: false, status: 'failed', error: err.message });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleRetryLog = async (logId) => {
    const token = localStorage.getItem('civic_admin_token');
    if (!token) return;

    setRetryingLogId(logId);
    try {
      const res = await fetch(getApiUrl(`/api/admin/notifications/${logId}/retry`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retry failed');
      await fetchNotificationLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setRetryingLogId(null);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = 
      searchTerm === '' ||
      (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.ref_id && c.ref_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
    const matchesDepartment = departmentFilter === 'All' || c.department === departmentFilter;
    const matchesAppealed = !onlyAppealed || c.is_appealed;
    const matchesOverdue = !onlyOverdue || (c.sla?.isOverdue && c.status !== 'Resolved');

    return matchesSearch && matchesStatus && matchesPriority && matchesDepartment && matchesAppealed && matchesOverdue;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Municipal Administration Console
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300">
              {adminUser?.designation || 'Zonal Officer Session'}
            </span>
            {adminUser?.district && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-navy-50 text-navy-800 border border-navy-200">
                {adminUser.district}
              </span>
            )}
            {stats?.isDemoData ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Demonstration Data
              </span>
            ) : total > 0 ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Live Database Data
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                No Data Available
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-900 font-semibold">{adminUser?.name || 'Administrator'}</strong> ({adminUser?.email || 'admin@civicresolve.gov'})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Telemetry</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* 6 KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Registered</span>
          <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{total}</p>
          <span className="text-[11px] text-navy-800 font-semibold">Municipal AI Triaged</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending Review</span>
          <p className="text-2xl font-bold text-amber-700 tabular-nums tracking-tight">{pending}</p>
          <span className="text-[11px] text-slate-500">Awaiting Dispatch</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Critical Urgency</span>
          <p className="text-2xl font-bold text-rose-700 tabular-nums tracking-tight">{critical}</p>
          <span className="text-[11px] text-rose-600 font-semibold">6h Emergency Window</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-saffron-dark uppercase tracking-wider">High Priority</span>
          <p className="text-2xl font-bold text-saffron-dark tabular-nums tracking-tight">{highPriority}</p>
          <span className="text-[11px] text-slate-500">24h Target SLA</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-navy-800 uppercase tracking-wider">Field Squads Active</span>
          <p className="text-2xl font-bold text-navy-800 tabular-nums tracking-tight">{inProgress}</p>
          <span className="text-[11px] text-navy-700 font-semibold">Under Repair</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Certified Resolved</span>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums tracking-tight">{resolved}</p>
          <span className="text-[11px] text-emerald-700 font-semibold">Verified Redressals</span>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-2">
        <button
          onClick={() => setActiveAdminTab('inbox')}
          className={`flex items-center gap-1.5 py-3 px-4 rounded-t-lg transition-colors border-b-2 ${
            activeAdminTab === 'inbox'
              ? 'border-navy-900 text-navy-950 bg-white shadow-sm font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4 text-navy-800" />
          <span>Grievance Inbox <span className="tabular-nums">({filteredComplaints.length})</span></span>
        </button>

        <button
          onClick={() => setActiveAdminTab('analytics')}
          className={`flex items-center gap-1.5 py-3 px-4 rounded-t-lg transition-colors border-b-2 ${
            activeAdminTab === 'analytics'
              ? 'border-navy-900 text-navy-950 bg-white shadow-sm font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-navy-800" />
          <span>Analytics & SLA</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('map')}
          className={`flex items-center gap-1.5 py-3 px-4 rounded-t-lg transition-colors border-b-2 ${
            activeAdminTab === 'map'
              ? 'border-navy-900 text-navy-950 bg-white shadow-sm font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapIcon className="w-4 h-4 text-navy-800" />
          <span>Geotagged Incident Map</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('notifications')}
          className={`flex items-center gap-1.5 py-3 px-4 rounded-t-lg transition-colors border-b-2 ${
            activeAdminTab === 'notifications'
              ? 'border-navy-900 text-navy-950 bg-white shadow-sm font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4 text-navy-800" />
          <span>Notification Engine & Logs</span>
        </button>
      </div>

      {/* 1. INBOX TAB */}
      {activeAdminTab === 'inbox' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-800">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-base sm:text-lg text-slate-900">
                  Grievance Action Inbox
                </h2>
                <p className="text-xs text-slate-500 tabular-nums">
                  {filteredComplaints.length} incident cases matched
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-navy-800 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-navy-800 focus:outline-none"
                aria-label="Filter by priority"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-navy-800 focus:outline-none"
                aria-label="Filter by department"
              >
                <option value="All">All Departments</option>
                <option value="Roads and Highways">Roads & Highways</option>
                <option value="Garbage & Sanitation">Solid Waste & Sanitation</option>
                <option value="Water Supply & Sewage">Metro Water & Drainage</option>
                <option value="Electricity & Power">TANGEDCO Electricity</option>
                <option value="Street Lighting">Street Lighting</option>
              </select>

              <button
                onClick={() => setOnlyAppealed(!onlyAppealed)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                  onlyAppealed 
                    ? 'bg-rose-50 border-rose-300 text-rose-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Appealed <span className="tabular-nums font-mono">({appealedCount})</span>
              </button>

              <button
                onClick={() => setOnlyOverdue(!onlyOverdue)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                  onlyOverdue 
                    ? 'bg-rose-600 border-rose-700 text-white' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Overdue <span className="tabular-nums font-mono">({overdueCount})</span>
              </button>
            </div>
          </div>

          {/* Mobile Cards View (< md) */}
          <div className="md:hidden divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {filteredComplaints.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs px-4">
                {complaints.length === 0
                  ? (lang === 'ta' ? 'மனு பதிவுகள் எதுவும் இல்லை.' : 'No verified grievance records are available yet.')
                  : (lang === 'ta' ? 'தேடலுக்கு ஏற்ப மனுக்கள் இல்லை.' : 'No grievance records match the current filters.')}
              </div>
            ) : (
              filteredComplaints.map((c) => (
                <div key={c.id || c.ref_id} className="p-4 bg-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-navy-950 text-xs">{c.ref_id}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                        c.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        c.priority === 'Medium' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>{c.priority}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'Assigned' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                      }`}>● {c.status}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-xs line-clamp-2">{c.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{c.category} • {c.district || 'Chennai'} {c.ward ? `• ${c.ward}` : ''}</p>
                  </div>
                  <div className="text-[11px] text-slate-600 flex flex-wrap justify-between gap-1 pt-1 border-t border-slate-50">
                    <span className="truncate max-w-[180px]">{c.department}</span>
                    <span className="text-navy-800 font-medium">{c.assigned_officer || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => onSelectComplaint && onSelectComplaint(c)}
                      className="flex-1 py-2 px-3 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs text-center hover:bg-slate-50 min-h-[40px] flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t.inspectBtn || 'Inspect'}</span>
                    </button>
                    <button
                      onClick={() => onManageComplaint && onManageComplaint(c)}
                      className="flex-1 py-2 px-3 rounded-lg bg-navy-900 text-white font-semibold text-xs text-center hover:bg-navy-950 min-h-[40px] flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t.manageBtn || 'Manage'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">{t.colRefTime || 'Ref ID / Time'}</th>
                  <th className="py-3 px-4">{t.colTitle || 'Grievance Title'}</th>
                  <th className="py-3 px-4">{t.colDistrictWard || 'District / Ward'}</th>
                  <th className="py-3 px-4">{t.colDeptOfficer || 'Department & Officer'}</th>
                  <th className="py-3 px-4">{t.colPrioritySla || 'Priority & SLA'}</th>
                  <th className="py-3 px-4">{t.colStatus || 'Status'}</th>
                  <th className="py-3 px-4 text-right">{t.colAction || 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 text-xs">
                      {complaints.length === 0
                        ? (lang === 'ta' ? 'மனு பதிவுகள் எதுவும் இல்லை.' : 'No verified grievance records are available yet.')
                        : (lang === 'ta' ? 'தேடலுக்கு ஏற்ப மனுக்கள் இல்லை.' : 'No grievance records match the current filters.')}
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => (
                    <tr key={c.id || c.ref_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-navy-950 block tabular-nums">
                          {c.ref_id}
                        </span>
                        <span className="text-[10px] text-slate-500 tabular-nums">
                          {new Date(c.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-slate-900 line-clamp-1">{c.title}</p>
                        <span className="text-[11px] text-slate-500">{c.category}</span>
                        {c.is_appealed ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-bold border border-rose-200">
                            {lang === 'ta' ? 'மறுஆய்வு கோரப்பட்டது' : 'Citizen Appeal'}
                          </span>
                        ) : null}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {c.district || 'Chennai'}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block max-w-[140px]">
                          {c.ward || c.location || 'Municipal Ward'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-semibold block truncate max-w-[180px]">
                          {c.department}
                        </span>
                        <span className="text-[10px] text-navy-700 font-medium">
                          {c.assigned_officer || 'Unassigned'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                          c.priority === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          c.priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {c.priority}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 tabular-nums">
                          {c.sla_hours || 24}h SLA
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${
                          c.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          c.status === 'In Progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          c.status === 'Assigned' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectComplaint && onSelectComplaint(c)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            title={t.inspectBtn || 'View Details'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onManageComplaint && onManageComplaint(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy-900 text-white font-semibold text-xs hover:bg-navy-950 shadow-sm transition-colors"
                            title={t.manageBtn || 'Action & Manage'}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{t.manageBtn || 'Action'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ANALYTICS & SLA TAB */}
      {activeAdminTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-navy-800" />
                  Grievance Inflow by Category
                </h3>
                <span className="text-xs text-slate-500 font-mono">SQLite Distribution</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis dataKey="category" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#1a3c6e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-navy-800" />
                  Priority Distribution
                </h3>
                <span className="text-xs text-slate-500 font-mono">Severity Split</span>
              </div>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={priorityData} dataKey="count" nameKey="priority" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {priorityData.map((entry) => (
                        <Cell key={`cell-${entry.priority}`} fill={PRIORITY_COLORS[entry.priority] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAP TAB */}
      {activeAdminTab === 'map' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-navy-800" />
                Geotagged Civic Incident Map
              </h3>
              <p className="text-xs text-slate-500">Live coordinates captured from citizen GPS verification</p>
            </div>
          </div>
          <div className="h-[500px] rounded-lg overflow-hidden border border-slate-200">
            <ComplaintMap complaints={complaints} onSelectComplaint={onSelectComplaint} />
          </div>
        </div>
      )}

      {/* 4. NOTIFICATION CENTER & SMTP TESTER */}
      {activeAdminTab === 'notifications' && (
        <div className="space-y-6">
          
          {/* SMTP Live Testing Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-navy-800" />
                  Live Notification Engine & SMTP Verification
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test actual SMTP connectivity. Real delivery states are logged to SQLite without simulated falsification.
                </p>
              </div>
              <button
                onClick={fetchNotificationLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            <form onSubmit={handleTestSmtp} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="email"
                required
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="Enter destination email (e.g. admin@civicresolve.gov)..."
                className="flex-1 w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
              />
              <button
                type="submit"
                disabled={testingSmtp || !testEmailTo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-navy-900 hover:bg-navy-950 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors"
              >
                {testingSmtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Testing SMTP Transport...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Verification Test</span>
                  </>
                )}
              </button>
            </form>

            {smtpTestResult && (
              <div className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
                smtpTestResult.status === 'sent' 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                {smtpTestResult.status === 'sent' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {smtpTestResult.status === 'sent' ? 'SMTP Accepted & Delivered' : 'Delivery Logged as Failed / Unconfigured'}
                  </p>
                  <p className="mt-0.5">
                    {smtpTestResult.message || smtpTestResult.error}
                  </p>
                  {smtpTestResult.messageId && (
                    <p className="font-mono text-[11px] mt-1 text-slate-600">Message ID: {smtpTestResult.messageId}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Real Notification Delivery Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Notification Audit & Delivery History <span className="tabular-nums">({notificationLogs.length})</span>
            </h3>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Ref ID</th>
                    <th className="py-2.5 px-3">Delivery State</th>
                    <th className="py-2.5 px-3">Error / Provider Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">Loading delivery telemetry...</td>
                    </tr>
                  ) : notificationLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">No notification logs recorded yet.</td>
                    </tr>
                  ) : (
                    notificationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                          {new Date(log.created_at).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold uppercase text-slate-700">
                          {log.channel}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">
                          {log.recipient}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {log.event_type}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-navy-800 tabular-nums">
                          {log.ref_id || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.status === 'sent' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            log.status === 'sending' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-500 text-[11px]" title={log.error_message || log.provider_response || ''}>
                          {log.error_message || (log.status === 'sent' ? 'Accepted by SMTP Provider' : '-')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {log.status === 'failed' && (
                            <button
                              onClick={() => handleRetryLog(log.id)}
                              disabled={retryingLogId === log.id}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
                              <span>Retry</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
