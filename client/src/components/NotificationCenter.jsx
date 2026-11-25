import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink, Loader2, Inbox } from 'lucide-react';
import { getApiUrl } from '../config/api';

export default function NotificationCenter({
  isAuthenticated,
  userType = 'citizen',
  token,
  onNavigateToComplaint,
  lang = 'en'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const authHeaders = useCallback(() => {
    const headers = { 'X-Portal-Context': userType };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token, userType]);

  const fetchNotifications = useCallback(async ({ offset = 0, append = false } = {}) => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (append) setLoadingMore(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const q = new URLSearchParams({
        limit: '15',
        offset: String(offset),
        ...(filterUnread ? { unreadOnly: 'true' } : {})
      });
      const res = await fetch(getApiUrl(`/api/notifications?${q.toString()}`), {
        headers: authHeaders(),
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error('Unable to load notifications.');
      }

      const data = await res.json();
      setNotifications(prev => (append ? [...prev, ...(data.notifications || [])] : (data.notifications || [])));
      setUnreadCount(Number(data.unreadCount || 0));
      setTotalCount(Number(data.totalCount || 0));
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated, filterUnread, authHeaders]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
      return;
    }

    fetchNotifications();
    const timer = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(timer);
  }, [isAuthenticated, fetchNotifications]);

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(getApiUrl(`/api/notifications/${id}/read`), {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(getApiUrl('/api/notifications/read-all'), {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch {}
  };

  const handleDeleteNotification = async (e, notif) => {
    e.stopPropagation();
    try {
      const res = await fetch(getApiUrl(`/api/notifications/${notif.id}`), {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
        if (!notif.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setTotalCount(prev => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await fetch(getApiUrl(`/api/notifications/${notif.id}/read`), {
          method: 'PATCH',
          headers: authHeaders(),
          credentials: 'include'
        });
        setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n)));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }

    setIsOpen(false);
    if (notif.ref_id && onNavigateToComplaint) {
      onNavigateToComplaint(notif.ref_id);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) fetchNotifications();
        }}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        className="relative p-2 rounded-lg text-slate-600 hover:text-[#1a3c6e] hover:bg-slate-100 border border-slate-200/80 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#f47920] text-white text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Notification Centre"
            className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-20 sm:top-full sm:mt-2 sm:w-96 max-h-[80vh] flex flex-col bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#1a3c6e]" />
                  <span>{lang === 'ta' ? 'அறிவிப்பு மையம்' : 'Notification Centre'}</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-[#d96810] text-[10px] font-bold tabular-nums">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-[#1a3c6e] hover:bg-slate-200/70 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterUnread(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    !filterUnread ? 'bg-[#1a3c6e] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterUnread(true)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterUnread ? 'bg-[#1a3c6e] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                {userType === 'admin' ? 'Admin Inbox' : 'Citizen Inbox'}
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading && notifications.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1a3c6e] mx-auto" />
                  <p className="text-xs text-slate-500">Loading notifications...</p>
                </div>
              ) : errorMsg ? (
                <div className="p-4 text-center text-xs text-rose-600">{errorMsg}</div>
              ) : notifications.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <Inbox className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    {filterUnread ? 'All caught up!' : 'No notifications yet'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {filterUnread
                      ? 'You have no unread complaint notifications.'
                      : 'Updates on registered complaints and resolutions will appear here.'}
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleItemClick(n);
                    }}
                    className={`p-3.5 text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                      !n.is_read ? 'bg-orange-50/40 hover:bg-orange-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        !n.is_read ? 'bg-[#f47920]' : 'bg-slate-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-snug ${!n.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {n.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span className="tabular-nums">
                          {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        {n.ref_id && (
                          <span className="inline-flex items-center gap-0.5 font-mono font-semibold text-[#1a3c6e]">
                            <span>{n.ref_id}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkRead(e, n.id)}
                          title="Mark as read"
                          aria-label="Mark notification as read"
                          className="p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotification(e, n)}
                        title="Delete notification"
                        aria-label="Delete notification"
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {hasMore && (
                <div className="p-3 text-center bg-slate-50/50">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => fetchNotifications({ offset: notifications.length, append: true })}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#1a3c6e] transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading more...' : 'Load Older Notifications'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
