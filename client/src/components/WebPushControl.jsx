import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  fetchPushStatus,
  enableWebPushNotifications,
  disableWebPushNotifications
} from '../utils/webPushClient';

export default function WebPushControl({
  token,
  userType = 'citizen',
  onStatusChange,
  lang = 'en'
}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchPushStatus({ token, portalContext: userType });
      setStatus(next);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [token, userType]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleEnable = async () => {
    setToggling(true);
    setFeedback(null);
    try {
      await enableWebPushNotifications({ token, portalContext: userType });
      await loadStatus();
      if (onStatusChange) onStatusChange(true);
      setFeedback({
        type: 'success',
        text: lang === 'ta'
          ? 'உலாவி புஷ் அறிவிப்புகள் வெற்றிகரமாக இயக்கப்பட்டது!'
          : 'Browser push notifications enabled for real-time updates!'
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setToggling(false);
    }
  };

  const handleDisable = async () => {
    setToggling(true);
    setFeedback(null);
    try {
      await disableWebPushNotifications({ token, portalContext: userType });
      await loadStatus();
      if (onStatusChange) onStatusChange(false);
      setFeedback({
        type: 'success',
        text: lang === 'ta'
          ? 'உலாவி புஷ் அறிவிப்புகள் நிறுத்தப்பட்டன.'
          : 'Browser push notifications disabled.'
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setToggling(false);
    }
  };

  const isSubscribed = Boolean(status?.serverSubscribed && status?.browserSubscribed) || Boolean(status?.serverSubscribed && !status?.supported);
  const isBlockedInBrowser = status?.permission === 'denied';
  const serverReady = Boolean(status?.serverEnabled && status?.serverConfigured);

  return (
    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isSubscribed ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1a3c6e]/10 text-[#1a3c6e]'
          }`}>
            {isSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">
              Browser Push Notifications (Free Web Push)
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {loading
                ? 'Checking notification status...'
                : !status?.supported
                  ? 'Web Push is not supported in this browser environment.'
                  : !serverReady
                    ? 'Server VAPID keys are not configured yet (Email & In-App alerts remain active).'
                    : isBlockedInBrowser
                      ? 'Notifications are blocked by your browser settings. Allow notifications in site permissions.'
                      : isSubscribed
                        ? 'Active on this device. Instant popup alerts on submission & resolution.'
                        : 'Get instant desktop or mobile browser alerts when complaint status changes.'}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0">
          {!loading && status?.supported && (
            isSubscribed ? (
              <button
                type="button"
                onClick={handleDisable}
                disabled={toggling}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors min-h-[40px] disabled:opacity-50"
              >
                {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
                <span>Disable Notifications</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnable}
                disabled={toggling || !serverReady || isBlockedInBrowser}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1a3c6e] hover:bg-[#15305a] text-white font-semibold text-xs transition-colors min-h-[40px] disabled:opacity-50"
              >
                {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                <span>Enable Notifications</span>
              </button>
            )
          )}
        </div>
      </div>

      {feedback && (
        <div className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
}
