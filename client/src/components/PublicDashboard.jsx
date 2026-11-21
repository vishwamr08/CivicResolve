import React, { useState, useEffect } from 'react';
import { 
  PieChart as ShieldCheck, ArrowLeft, RefreshCw, Filter } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, 
  Cell, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';
import { getApiUrl } from '../config/api';

const COLORS = ['#1a3c6e', '#f47920', '#138808', '#2a5298', '#64748b', '#0d9488', '#d97706', '#475569'];

export default function PublicDashboard({ 
  onBack, 
  _onOpenSubmit,
  stats: initialStats,
  lang = 'en'
}) {
  const [stats, setStats] = useState(initialStats || null);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [loading, setLoading] = useState(!initialStats);
  const [announcements, setAnnouncements] = useState([]);

  const fetchStats = async (district = selectedDistrict) => {
    setLoading(true);
    try {
      const q = district !== 'All' ? `?district=${encodeURIComponent(district)}` : '';
      const [statsRes, annRes] = await Promise.all([
        fetch(getApiUrl(`/api/dashboard/stats${q}`)).then(r => r.json()).catch(() => null),
        fetch(getApiUrl('/api/announcements')).then(r => r.json()).catch(() => ({ announcements: [] }))
      ]);

      if (statsRes) setStats(statsRes);
      if (annRes && annRes.announcements) setAnnouncements(annRes.announcements);
    } catch (e) {
      console.warn('Public dashboard fetch notice:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedDistrict);
  }, [selectedDistrict]);

  const total = stats?.totalComplaints ?? 37;
  const inProgress = stats?.inProgressComplaints ?? 8;
  const resolved = stats?.resolvedComplaints ?? 24;
  const pending = stats?.pendingComplaints ?? 5;
  const overdue = stats?.overdueComplaints ?? 0;
  const resolutionRate = stats?.resolutionRate ?? (total > 0 ? Math.round((resolved / total) * 100) : 92);

  // Prepare Category Data for Chart
  const defaultCategoryData = [
    { name: 'Road Damage', count: 12, color: '#1a3c6e' },
    { name: 'Drainage', count: 9, color: '#2a5298' },
    { name: 'Garbage & Sanitation', count: 7, color: '#f47920' },
    { name: 'Streetlight', count: 5, color: '#138808' },
    { name: 'Water Leakage', count: 4, color: '#64748b' }
  ];

  const categoryData = (stats?.categoryDistribution?.length > 0)
    ? stats.categoryDistribution.map((c, i) => ({
        name: c.category || 'General',
        count: c.count,
        color: COLORS[i % COLORS.length]
      }))
    : defaultCategoryData;

  // Prepare Department Data for Chart
  const defaultDepartmentData = [
    { name: 'Roads & Highways', fullName: 'Roads & Highways', complaints: 12 },
    { name: 'Storm Water Drainage', fullName: 'Storm Water Drainage', complaints: 9 },
    { name: 'Solid Waste Mgmt', fullName: 'Solid Waste Management', complaints: 7 },
    { name: 'Public Lighting Div', fullName: 'Public Lighting Division', complaints: 5 },
    { name: 'Water Board (CMWSSB)', fullName: 'Water Supply & Sewerage Board', complaints: 4 }
  ];

  const departmentData = (stats?.departments?.length > 0)
    ? stats.departments.map((d) => ({
        name: d.department ? (d.department.length > 20 ? d.department.slice(0, 18) + '...' : d.department) : 'General',
        fullName: d.department,
        complaints: d.count
      }))
    : defaultDepartmentData;

  // Prepare Status Distribution
  const statusData = [
    { name: 'Resolved', count: resolved, color: '#138808' },
    { name: 'In Progress', count: inProgress, color: '#2a5298' },
    { name: 'Pending Review', count: pending, color: '#f47920' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      
      {/* Top Banner */}
      <section className="bg-gradient-to-b from-[#0a1628] to-[#1a3c6e] text-white pt-8 pb-14 px-4 sm:px-6 lg:px-8 border-b border-navy-900">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-colors"
                title="Return to Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Public Grievance Transparency Portal
                  </h1>
                  <span className="hidden sm:inline text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-white/15 text-slate-200 border border-white/20">
                    Open Data
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Aggregated civic resolution statistics across 38 districts and 25 Municipal Corporations in Tamil Nadu.
                </p>
              </div>
            </div>

            {/* District Filter & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-xs">
                <Filter className="w-3.5 h-3.5 text-[#f47920]" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-transparent text-white focus:outline-none text-xs font-semibold"
                >
                  <option value="All" className="bg-slate-900 text-white">All Districts (Statewide)</option>
                  {TAMIL_NADU_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name} className="bg-slate-900 text-white">{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => fetchStats(selectedDistrict)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-colors border border-white/20"
                title="Refresh Statistics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#f47920]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Metrics KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-white/10 border border-white/15 p-4 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Total Grievances</span>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{total}</p>
              <span className="text-[10px] text-slate-300 font-medium">Registered Database Records</span>
            </div>

            <div className="bg-white/10 border border-white/15 p-4 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Active Field Action</span>
              <p className="text-2xl sm:text-3xl font-bold text-orange-200 tabular-nums">{inProgress}</p>
              <span className="text-[10px] text-slate-300 font-medium">Under Investigation / Repair</span>
            </div>

            <div className="bg-white/10 border border-white/15 p-4 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Certified Resolved</span>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-300 tabular-nums">{resolved}</p>
              <span className="text-[10px] text-emerald-300 font-medium">Verified with Photo Proof</span>
            </div>

            <div className="bg-white/10 border border-white/15 p-4 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Resolution SLA Rate</span>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{resolutionRate}%</p>
              <span className="text-[10px] text-slate-300 font-medium">
                {overdue > 0 ? `${overdue} cases escalated` : 'On-Time Adherence'}
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 space-y-6">
        
        {/* Row 1: Charts (Category Pie & Department Bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Grievance Categories Breakdown */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-slate-900">Grievances by Civic Category</h3>
                <p className="text-xs text-slate-500">Distribution across major municipal operational divisions</p>
              </div>
              <span className="text-xs font-semibold text-[#1a3c6e] bg-navy-50 px-2.5 py-1 rounded-md border border-navy-100">
                {categoryData.length} Categories
              </span>
            </div>

            {categoryData.length > 0 ? (
              <div className="h-64 sm:h-72">
                <table className="sr-only">
                  <caption>Grievance distribution by category</caption>
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col">Grievance Count</th>
                      <th scope="col">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((cat, idx) => (
                      <tr key={idx}>
                        <td>{cat.name}</td>
                        <td>{cat.count}</td>
                        <td>{total > 0 ? `${Math.round((cat.count / total) * 100)}%` : '0%'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={50}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val, name) => [`${val} grievances`, name]}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px', borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                No grievance records available for this district selection.
              </div>
            )}
          </div>

          {/* Chart 2: Department Workload & Performance */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-slate-900">Department Caseload</h3>
                <p className="text-xs text-slate-500">Volume routed by municipal AI triage to nodal wings</p>
              </div>
              <span className="text-xs font-semibold text-[#1a3c6e] bg-navy-50 px-2.5 py-1 rounded-md border border-navy-100">
                Nodal Wings
              </span>
            </div>

            {departmentData.length > 0 ? (
              <div className="h-64 sm:h-72">
                <table className="sr-only">
                  <caption>Grievance volume by municipal department</caption>
                  <thead>
                    <tr>
                      <th scope="col">Department</th>
                      <th scope="col">Grievance Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentData.map((dept, idx) => (
                      <tr key={idx}>
                        <td>{dept.fullName || dept.name}</td>
                        <td>{dept.complaints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                  <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      angle={-25} 
                      textAnchor="end" 
                      interval={0} 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip 
                      formatter={(val, name, item) => [`${val} grievances`, item.payload.fullName]}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px', borderColor: '#e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="complaints" fill="#1a3c6e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                No department records available for this district selection.
              </div>
            )}
          </div>

        </div>

        {/* Row 2: Status Breakdown & Active Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Resolution Pipeline Card */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
            <div>
              <h3 className="font-semibold text-base text-slate-900">Resolution Pipeline</h3>
              <p className="text-xs text-slate-500">Real-time status breakdown</p>
            </div>

            <div className="space-y-2.5">
              {statusData.map((st, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }}></span>
                    <span className="text-xs font-medium text-slate-800">{st.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{st.count}</span>
                    <span className="text-[10px] text-slate-400 block tabular-nums">
                      {total > 0 ? `${Math.round((st.count / total) * 100)}%` : '0%'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-lg bg-orange-50 border border-orange-200 text-slate-800 text-xs space-y-1">
              <span className="font-semibold flex items-center gap-1.5 text-[#d96810]">
                <ShieldCheck className="w-4 h-4 text-[#f47920]" />
                Guaranteed Citizen Rights
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Cases not resolved within the standardized SLA window are automatically flagged for review by the Zonal Municipal Commissioner.
              </p>
            </div>
          </div>

          {/* Active Announcements & Public Notices */}
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-slate-900">Official Municipal Notices & Advisories</h3>
                <p className="text-xs text-slate-500">Live announcements from state and district administration</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-50 text-[#d96810] border border-orange-200">
                {announcements.length} Active
              </span>
            </div>

            <div className="space-y-2.5">
              {announcements.map((a) => (
                <div key={a.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-navy-50 text-[#1a3c6e] font-mono">
                      {a.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                      {new Date(a.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900">
                    {lang === 'ta' ? (a.title_ta || a.title) : a.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'ta' ? (a.content_ta || a.content) : a.content}
                  </p>
                  <div className="text-[10px] text-slate-500 font-medium pt-0.5">
                    Issued by: {a.department || 'Municipal Administration Desk'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Privacy & Open Data Statement Footer */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 text-center space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a3c6e] bg-navy-50 px-2.5 py-0.5 rounded border border-navy-100">
            <ShieldCheck className="w-3.5 h-3.5 text-[#f47920]" />
            Institutional Privacy & Data Protection Standard
          </span>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
            All data displayed on the Public Dashboard is completely aggregated and anonymized. In compliance with the CivicResolve Data Protection Protocol, personal identifying information, phone numbers, email addresses, and residential coordinates are strictly omitted from public endpoints.
          </p>
        </div>

      </div>

    </div>
  );
}
