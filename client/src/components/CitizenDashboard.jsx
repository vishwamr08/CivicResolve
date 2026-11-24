import React, { useState } from 'react';
import {
  PlusCircle, Search, Filter, AlertCircle, Clock, CheckCircle2,
  MapPin, ChevronRight, Calendar,
  Map as MapIcon, List, SearchCheck, Wrench } from 'lucide-react';
import ComplaintMap from './ComplaintMap';
import ComplaintTracker from './ComplaintTracker';

export default function CitizenDashboard({
  complaints,
  stats,
  onOpenSubmit,
  onSelectComplaint
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [showTrackerSection, setShowTrackerSection] = useState(false);

  const categories = [
    'All',
    'Road Damage',
    'Garbage and Sanitation',
    'Water Leakage',
    'Drainage',
    'Streetlight',
    'Electricity',
    'Public Infrastructure',
    'Other'
  ];

  const statuses = ['All', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];

  const filteredComplaints = (complaints || []).filter(c => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ref_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Action Banner */}
      <div className="bg-[#0f2040] rounded-xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden border border-navy-850">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-navy-900 text-saffron text-xs font-semibold mb-3 border border-saffron/30">
              <SearchCheck className="w-3.5 h-3.5" />
              <span>Public Accountability & Tracking Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Citizen Grievance Redressal Center
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Submit community issues with GPS geotagging, track official audit lifecycles with Reference IDs, and view neighborhood hazard resolution maps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowTrackerSection(!showTrackerSection)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-slate-200 bg-navy-900 hover:bg-navy-850 border border-slate-700 text-xs transition-colors"
            >
              <SearchCheck className="w-4 h-4 text-saffron" />
              <span>{showTrackerSection ? 'Hide Tracker' : 'Track by Ref ID'}</span>
            </button>

            <button
              onClick={onOpenSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-saffron hover:bg-saffron-dark shadow-sm transition-colors text-xs"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Submit New Grievance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Tracker Section (when toggled or always accessible) */}
      {showTrackerSection && (
        <div className="animate-in fade-in duration-200">
          <ComplaintTracker onSelectComplaint={onSelectComplaint} />
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reports</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tabular-nums tracking-tight">
              {stats?.totalComplaints ?? (complaints.length > 0 ? complaints.length : 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Municipal SQLite records</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-800 border border-navy-100 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Under Review</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-amber-700 mt-1 tabular-nums tracking-tight">
              {stats?.pendingComplaints ?? (complaints.length > 0 ? complaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length : 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Initial triage queue</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-navy-800 uppercase tracking-wider">Field Action</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-navy-800 mt-1 tabular-nums tracking-tight">
              {stats?.inProgressComplaints ?? (complaints.length > 0 ? complaints.filter(c => c.status === 'Assigned' || c.status === 'In Progress').length : 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Assigned & crew deployed</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-navy-50 text-navy-800 border border-navy-100 flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Resolved</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1 tabular-nums tracking-tight">
              {stats?.resolvedComplaints ?? (complaints.length > 0 ? complaints.filter(c => c.status === 'Resolved').length : 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Verified closed tickets</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search, Filter & View Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by issue title, Ref ID (e.g. CR-2026-1042), or street address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-navy-800 transition-colors bg-slate-50 focus:bg-white"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start md:self-auto border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'map' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Status:
          </span>
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedStatus === st
                  ? 'bg-navy-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 mr-1">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-navy-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area: Map or List */}
      {viewMode === 'map' ? (
        <div className="space-y-3">
          <ComplaintMap
            complaints={filteredComplaints}
            onSelectComplaint={onSelectComplaint}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              Recent Grievances <span className="tabular-nums">({filteredComplaints.length})</span>
            </h3>
            <span className="text-xs text-slate-500">
              Sorted by submission timestamp
            </span>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-700">No complaints found</h4>
              <p className="text-xs text-slate-500 mt-1">Try adjusting the search query or status filter.</p>
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedStatus('All'); }}
                className="mt-4 px-3.5 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComplaints.map((item) => (
                <div
                  key={item.id || item.ref_id}
                  onClick={() => onSelectComplaint(item)}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Meta */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-navy-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tabular-nums">
                          {item.ref_id}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          item.priority === 'Critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          item.priority === 'High' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                        item.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        item.status === 'In Progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        item.status === 'Assigned' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                        'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {item.status}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-navy-800 transition-colors line-clamp-1">
                      {item.title}
                    </h4>

                    {/* Location, GPS flag & Department */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="line-clamp-1">{item.location}</span>
                      </span>
                      {item.is_gps_verified && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          GPS Geotagged
                        </span>
                      )}
                      <span>•</span>
                      <span className="font-medium text-slate-600">{item.department || item.category}</span>
                    </div>

                    {/* Resolution note preview */}
                    {item.resolution_remarks ? (
                      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-900">
                        <span className="font-bold block text-[10px] text-emerald-800 uppercase">Resolution Remarks</span>
                        <p className="italic line-clamp-2">{item.resolution_remarks}</p>
                      </div>
                    ) : item.ai_summary ? (
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-navy-800 mb-0.5">
                          <CheckCircle2 className="w-3 h-3 text-navy-800" />
                          <span>Triage Assessment</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 italic">
                          "{item.ai_summary}"
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer Meta */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="tabular-nums">
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <div className="flex items-center gap-1 font-semibold text-navy-800 group-hover:translate-x-0.5 transition-transform">
                      <span>View Lifecycle & Audit</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
