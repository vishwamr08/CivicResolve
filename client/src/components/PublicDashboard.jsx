import React, { useState, useEffect } from 'react';
import { 
  PieChart as ShieldCheck, ArrowLeft, RefreshCw, Filter } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, 
  Cell, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';
import { getApiUrl } from '../config/api';

const COLORS = ['#0D9488', '#3B82F6', '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#64748B'];

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

  const total = stats?.totalComplaints || 0;
  const inProgress = stats?.inProgressComplaints || 0;
  const resolved = stats?.resolvedComplaints || 0;
  const pending = stats?.pendingComplaints || 0;
  const overdue = stats?.overdueComplaints || 0;
  const resolutionRate = stats?.resolutionRate ?? (total > 0 ? Math.round((resolved / total) * 100) : 0);

  // Prepare Category Data for Chart
  const categoryData = (stats?.categoryDistribution || []).map((c, i) => ({
    name: c.category || 'General',
    count: c.count,
    color: COLORS[i % COLORS.length]
  }));

  // Prepare Department Data for Chart
  const departmentData = (stats?.departments || []).map((d) => ({
    name: d.department ? (d.department.length > 20 ? d.department.slice(0, 18) + '...' : d.department) : 'General',
    fullName: d.department,
    complaints: d.count
  }));

  // Prepare Status Distribution
  const statusData = [
    { name: 'Resolved', count: resolved, color: '#10B981' },
    { name: 'In Progress', count: inProgress, color: '#3B82F6' },
    { name: 'Pending Review', count: pending, color: '#F59E0B' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      
      {/* Top Banner */}
      <section className="bg-slate-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Return to Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Tamil Nadu Public Grievance Transparency Portal
                  </h1>
                  <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Open Data
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Aggregated civic resolution statistics across 38 districts and 25 Municipal Corporations.
                </p>
              </div>
            </div>

            {/* District Filter & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                <Filter className="w-3.5 h-3.5 text-teal-400" />
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
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="Refresh Statistics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Metrics KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Grievances</span>
              <p className="text-3xl font-black text-white">{total}</p>
              <span className="text-[10px] text-teal-400 font-semibold">100% Real SQLite Database</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Field Action</span>
              <p className="text-3xl font-black text-blue-400">{inProgress}</p>
              <span className="text-[10px] text-slate-400 font-semibold">Under Investigation / Repair</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Certified Resolved</span>
              <p className="text-3xl font-black text-emerald-400">{resolved}</p>
              <span className="text-[10px] text-emerald-400 font-semibold">Verified with Photo Proof</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resolution SLA Rate</span>
              <p className="text-3xl font-black text-teal-300">{resolutionRate}%</p>
              <span className="text-[10px] text-slate-400 font-semibold">
                {overdue > 0 ? `${overdue} cases escalated` : '100% On-Time Adherence'}
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 space-y-8">
        
        {/* Row 1: Charts (Category Pie & Department Bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Grievance Categories Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Grievances by Civic Category</h3>
                <p className="text-xs text-slate-500">Distribution across major municipal operational divisions</p>
              </div>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                {categoryData.length} Categories
              </span>
            </div>

            {categoryData.length > 0 ? (
              <div className="h-64 sm:h-72">
                {/* Accessible screen reader data representation */}
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
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
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
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Department Caseload</h3>
                <p className="text-xs text-slate-500">Volume routed by municipal AI triage to nodal municipal wings</p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                Nodal Wings
              </span>
            </div>

            {departmentData.length > 0 ? (
              <div className="h-64 sm:h-72">
                {/* Accessible screen reader data representation */}
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
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }}
                    />
                    <Bar dataKey="complaints" fill="#0D9488" radius={[6, 6, 0, 0]} />
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
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Resolution Pipeline</h3>
              <p className="text-xs text-slate-500">Real-time status breakdown</p>
            </div>

            <div className="space-y-3">
              {statusData.map((st, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color }}></span>
                    <span className="text-xs font-bold text-slate-800">{st.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900">{st.count}</span>
                    <span className="text-[10px] text-slate-400 block">
                      {total > 0 ? `${Math.round((st.count / total) * 100)}%` : '0%'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-teal-800">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Guaranteed Citizen Rights
              </span>
              <p className="text-[11px] text-teal-700 leading-relaxed">
                Cases not resolved within the standardized SLA window are automatically flagged for review by the Zonal Municipal Commissioner.
              </p>
            </div>
          </div>

          {/* Active Announcements & Public Notices */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Official Municipal Notices & Advisories</h3>
                <p className="text-xs text-slate-500">Live announcements from state and district administration</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {announcements.length} Active
              </span>
            </div>

            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-teal-500 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-teal-300 font-mono">
                      {a.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {lang === 'ta' ? (a.title_ta || a.title) : a.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'ta' ? (a.content_ta || a.content) : a.content}
                  </p>
                  <div className="text-[10px] text-slate-400 font-semibold pt-1">
                    Issued by: {a.department || 'Municipal Administration Desk'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Privacy & Open Data Statement Footer */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
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
