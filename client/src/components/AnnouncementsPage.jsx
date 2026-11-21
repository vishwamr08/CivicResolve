import React, { useState, useEffect } from 'react';
import { 
  Bell, AlertTriangle, Info, Calendar, Building2, Search, 
  PlusCircle, Trash2, X, CheckCircle2, ShieldAlert, Sparkles, 
  Loader2, ArrowRight, Filter, ExternalLink
} from 'lucide-react';

export default function AnnouncementsPage({ 
  adminUser = null, 
  adminToken = null, 
  onOpenSubmit, 
  lang = 'en' 
}) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Admin Publishing Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');
  const [publishError, setPublishError] = useState('');
  const [newNotice, setNewNotice] = useState({
    title: '',
    title_ta: '',
    category: 'Public Notice',
    priority: 'Normal',
    department: adminUser ? adminUser.department || 'Municipal Administration' : 'Municipal Administration',
    content: '',
    content_ta: ''
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Failed to load announcements');
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error('Announcements fetch error:', err);
      setError('Unable to load current announcements from municipal server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    if (!newNotice.title.trim() || !newNotice.content.trim()) {
      setPublishError('Please provide both title and content.');
      return;
    }

    setPublishLoading(true);
    setPublishError('');
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(newNotice)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish announcement');

      setPublishSuccess('Official notice published successfully!');
      setNewNotice({
        title: '',
        title_ta: '',
        category: 'Public Notice',
        priority: 'Normal',
        department: adminUser ? adminUser.department || 'Municipal Administration' : 'Municipal Administration',
        content: '',
        content_ta: ''
      });
      await fetchAnnouncements();
      setTimeout(() => {
        setIsPublishModalOpen(false);
        setPublishSuccess('');
      }, 1200);
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove announcement: "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete announcement');
      }
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const categories = ['All', 'Public Notice', 'Emergency Alert', 'Service Advisory', 'Infrastructure Work'];

  const filteredAnnouncements = announcements.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.title_ta && item.title_ta.includes(searchQuery)) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.department && item.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      
      {/* Hero Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-slate-950 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold tracking-wide">
                <Bell className="w-4 h-4 text-teal-400" />
                <span>{lang === 'ta' ? 'அதிகாரப்பூர்வ அறிவிப்புகள் பலகை' : 'Official Municipal Gazette & Notices'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {lang === 'ta' ? 'பொது அறிவிப்புகள் & விழிப்புணர்வு' : 'Civic Notices & Municipal Updates'}
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                {lang === 'ta'
                  ? 'பராமரிப்புப் பணிகள், வானிலை எச்சரிக்கைகள் மற்றும் பொதுக் குடிமைச் சேவைகள் குறித்த நேரடி அதிகாரப்பூர்வ தகவல்கள்.'
                  : 'Real-time advisories regarding scheduled maintenance, monsoon mitigation operations, electrical shutdowns, and public civic guidelines.'}
              </p>
            </div>

            {/* Admin Action Button */}
            {adminUser && adminToken && (
              <button
                onClick={() => setIsPublishModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>Publish Official Notice</span>
              </button>
            )}

          </div>

          {/* Quick Search */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ta' ? 'அறிவிப்புகளைத் தேடுக...' : 'Search notices by title, department, or keyword...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-xs font-semibold text-slate-600">Loading Official Gazettes...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-700 font-semibold">{error}</p>
            <button
              onClick={fetchAnnouncements}
              className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8 space-y-3">
            <Bell className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-base text-slate-900">No Announcements Found</h3>
            <p className="text-xs text-slate-500">
              There are currently no active public notices matching your selected category or filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {filteredAnnouncements.map((item) => {
              const isUrgent = item.priority === 'Urgent' || item.priority === 'High' || item.category === 'Emergency Alert';
              return (
                <div 
                  key={item.id}
                  className={`bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all ${
                    isUrgent ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isUrgent 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : 'bg-teal-50 text-teal-800 border border-teal-200'
                      }`}>
                        {item.category || 'Public Notice'}
                      </span>
                      
                      {item.priority && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Priority: {item.priority}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}</span>
                      </span>
                    </div>

                    {/* Admin Delete Action */}
                    {adminUser && adminToken && (
                      <button
                        onClick={() => handleDeleteAnnouncement(item.id, item.title)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 p-1 hover:bg-rose-50 rounded"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="pt-4 space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900">
                      {lang === 'ta' && item.title_ta ? item.title_ta : item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {lang === 'ta' && item.content_ta ? item.content_ta : item.content}
                    </p>
                  </div>

                  {/* Footer Department */}
                  <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Issued by: {item.department || 'Municipal Operations Department'}</span>
                    </div>
                    <button
                      onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
                      className="text-teal-600 hover:text-teal-800 font-bold flex items-center gap-1"
                    >
                      <span>Report related civic issue</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Admin Publish Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white p-6 relative">
              <button 
                onClick={() => setIsPublishModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-extrabold">Publish Official Civic Gazette</h2>
              <p className="text-xs text-slate-400">Post municipal announcements directly to citizens across Tamil Nadu.</p>
            </div>

            <form onSubmit={handlePublishSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {publishError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  {publishError}
                </div>
              )}

              {publishSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Notice Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Water Pipeline Maintenance in Anna Nagar"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Notice Title (Tamil)</label>
                <input
                  type="text"
                  placeholder="அண்ணா நகர் பகுதியில் குடிநீர் குழாய் பராமரிப்பு பணி"
                  value={newNotice.title_ta}
                  onChange={(e) => setNewNotice({ ...newNotice, title_ta: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Category</label>
                  <select
                    value={newNotice.category}
                    onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="Public Notice">Public Notice</option>
                    <option value="Emergency Alert">Emergency Alert</option>
                    <option value="Service Advisory">Service Advisory</option>
                    <option value="Infrastructure Work">Infrastructure Work</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Priority Level</label>
                  <select
                    value={newNotice.priority}
                    onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Issuing Department</label>
                <input
                  type="text"
                  value={newNotice.department}
                  onChange={(e) => setNewNotice({ ...newNotice, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Notice Content (English) *</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Details of the civic advisory, affected wards, and alternative helplines..."
                  value={newNotice.content}
                  onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Notice Content (Tamil)</label>
                <textarea
                  rows="3"
                  placeholder="அறிவிப்பின் விவரங்கள்..."
                  value={newNotice.content_ta}
                  onChange={(e) => setNewNotice({ ...newNotice, content_ta: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishLoading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  {publishLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Publish Notice</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}