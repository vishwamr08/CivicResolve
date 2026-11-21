import React, { useState } from 'react';
import { 
  PlusCircle, Search, Filter, AlertCircle, Clock, CheckCircle2, 
  MapPin, Sparkles, ChevronRight, Calendar, 
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
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-navy-700">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_70%_50%,rgba(13,148,136,0.25),transparent_70%)] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/20 text-teal-accent text-xs font-semibold mb-3 border border-teal/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Accountability & Tracking Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Citizen Grievance Redressal Center
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300">
              Submit community issues with GPS geotagging, track official audit lifecycles with Reference IDs, and view neighborhood hazard resolution maps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowTrackerSection(!showTrackerSection)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 bg-navy-800/90 hover:bg-navy-700/90 border border-slate-700 text-xs transition-all"
            >
              <SearchCheck className="w-4 h-4 text-teal-accent" />
              <span>{showTrackerSection ? 'Hide Tracker' : 'Track by Ref ID'}</span>
            </button>

            <button
              onClick={onOpenSubmit}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-500 to-teal-dark hover:from-teal-light hover:to-teal shadow-lg shadow-teal-500/25 active:scale-95 transition-all text-xs"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Submit New Grievance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Tracker Section (when toggled or always accessible) */}
      {showTrackerSection && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <ComplaintTracker onSelectComplaint={onSelectComplaint} />
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Reports</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-1">
              {stats ? stats.totalComplaints : complaints.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Municipal SQLite records</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Under Review</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">
              {stats ? stats.pendingComplaints : complaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length}
            </h3>
            <p className="text-[11px] text-amber-600/80 mt-0.5">Initial triage queue</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Field Action</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">
              {stats ? stats.inProgressComplaints : complaints.filter(c => c.status === 'Assigned' || c.status === 'In Progress').length}
            </h3>
            <p className="text-[11px] text-blue-600/80 mt-0.5">Assigned & crew deployed</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Resolved</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
              {stats ? stats.resolvedComplaints : complaints.filter(c => c.status === 'Resolved').length}
            </h3>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">Verified closed tickets</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search, Filter & View Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by issue title, Ref ID (e.g. CR-2026-1042), or street address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-all bg-slate-50/50"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'map' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Status:
          </span>
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedStatus === st
                  ? 'bg-navy-900 text-white font-semibold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-400 mr-1">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-teal text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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
            <h3 className="font-bold text-navy-900 text-lg">
              Recent Grievances ({filteredComplaints.length})
            </h3>
            <span className="text-xs text-slate-500">
              Sorted by submission timestamp
            </span>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-700">No complaints found</h4>
              <p className="text-xs text-slate-500 mt-1">Try adjusting the search query or status filter.</p>
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedStatus('All'); }}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
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
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-teal/50 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Meta */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-md">
                          {item.ref_id}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          item.priority === 'Critical' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          item.priority === 'High' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-teal/10 text-teal border border-teal/20'
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'Assigned' ? 'bg-purple-100 text-purple-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {item.status}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-base text-navy-900 group-hover:text-teal transition-colors line-clamp-1">
                      {item.title}
                    </h4>

                    {/* Location, GPS flag & Department */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="line-clamp-1">{item.location}</span>
                      </span>
                      {item.is_gps_verified && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          GPS Geotagged
                        </span>
                      )}
                      <span>•</span>
                      <span className="font-medium text-slate-600">{item.department || item.category}</span>
                    </div>

                    {/* AI Assessment / Resolution note preview */}
                    {item.resolution_remarks ? (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900">
                        <span className="font-bold block text-[10px] text-emerald-800 uppercase">Resolution Remarks</span>
                        <p className="italic line-clamp-2">{item.resolution_remarks}</p>
                      </div>
                    ) : item.ai_summary ? (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-teal mb-0.5">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Synthesis</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 italic">
                          "{item.ai_summary}"
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer Meta */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {new Date(item.created_at).toLocaleDateString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                    <div className="flex items-center gap-1 font-semibold text-teal group-hover:translate-x-1 transition-transform">
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
