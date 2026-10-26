import React, { useState, useEffect } from 'react';
import {
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Shield,
  UserCheck,
  RefreshCw,
  Info
} from 'lucide-react';
import { scanExpiringGoldUsers, dispatchGoldExpiryReminders } from '../utils/goldReminderScanner';
import { fetchSmtpSettings } from '../lib/emailService';

export function ReminderScannerModal({ db, users, currentUser, onClose, onRefreshUsers }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [smtpSettings, setSmtpSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dispatch States
  const [isDispatching, setIsDispatching] = useState(false);
  const [progressInfo, setProgressInfo] = useState(null);
  const [dispatchResult, setDispatchResult] = useState(null);

  useEffect(() => {
    async function initScan() {
      setLoading(true);
      try {
        const [settings] = await Promise.all([
          fetchSmtpSettings(db),
        ]);
        setSmtpSettings(settings);

        const scanned = scanExpiringGoldUsers(users, 3, 7);
        setPendingUsers(scanned);
      } catch (err) {
        console.error('Failed to run reminder scan:', err);
      } finally {
        setLoading(false);
      }
    }
    initScan();
  }, [db, users]);

  const handleDispatchAll = async () => {
    if (pendingUsers.length === 0) return;
    if (!smtpSettings?.enabled) {
      alert('Email System is currently DEACTIVATED in Admin Settings. Please activate it in Email & SMTP Settings first.');
      return;
    }

    if (!window.confirm(`Dispatch GOLD expiration reminder emails to ${pendingUsers.length} user(s) with 3–7 days remaining?`)) {
      return;
    }

    setIsDispatching(true);
    setDispatchResult(null);

    try {
      const res = await dispatchGoldExpiryReminders(
        db,
        pendingUsers,
        currentUser?.email || 'admin',
        (prog) => setProgressInfo(prog)
      );

      setDispatchResult(res);
      if (onRefreshUsers) onRefreshUsers();

      // Refresh pending scan list after sending
      const updatedScan = scanExpiringGoldUsers(users, 3, 7);
      setPendingUsers(updatedScan);
    } catch (err) {
      console.error('Batch reminder dispatch failed:', err);
      setDispatchResult({ success: false, message: 'Failed: ' + (err.message || String(err)) });
    } finally {
      setIsDispatching(false);
      setProgressInfo(null);
    }
  };

  const handleDispatchSingle = async (user) => {
    if (!smtpSettings?.enabled) {
      alert('Email System is currently DEACTIVATED in Admin Settings. Please activate it in Email & SMTP Settings first.');
      return;
    }

    setIsDispatching(true);
    setDispatchResult(null);

    try {
      const res = await dispatchGoldExpiryReminders(
        db,
        [user],
        currentUser?.email || 'admin',
        (prog) => setProgressInfo(prog)
      );

      setDispatchResult(res);
      if (onRefreshUsers) onRefreshUsers();

      // Remove dispatched user from local list
      setPendingUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
      console.error(`Failed to send reminder to ${user.email}:`, err);
      setDispatchResult({ success: false, message: 'Failed: ' + (err.message || String(err)) });
    } finally {
      setIsDispatching(false);
      setProgressInfo(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 text-amber-800 p-2.5 rounded-2xl border border-amber-200">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>3–7 Day Expiry Auto-Scanner</span>
                <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {pendingUsers.length} Pending
                </span>
              </h3>
              <p className="text-xs text-slate-500">Scans active GOLD members with 3 to 7 days remaining before expiration.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1">✕</button>
        </div>

        {/* Email System Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shrink-0 ${
          smtpSettings?.enabled
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-slate-100 border-slate-300 text-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${smtpSettings?.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>
              {smtpSettings?.enabled
                ? '🟢 Automatic Email Dispatch System is ACTIVE'
                : '🔴 Email Dispatch System is DEACTIVATED (Enable in Email & SMTP Settings)'}
            </span>
          </div>
          {smtpSettings?.fromEmail && (
            <span className="font-mono opacity-80">Sender: {smtpSettings.fromEmail}</span>
          )}
        </div>

        {/* Dispatch Feedback Message */}
        {dispatchResult && (
          <div className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between shrink-0 ${
            dispatchResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
          }`}>
            <span className="flex items-center gap-2">
              {dispatchResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {dispatchResult.message}
            </span>
            <button onClick={() => setDispatchResult(null)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Main List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin text-amber-600 mb-2" size={36} />
              <p className="text-xs font-bold">Scanning Firestore GOLD Users...</p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <UserCheck size={40} className="mx-auto text-emerald-500" />
              <div>
                <p className="font-bold text-slate-700 text-sm">All Clean! No Pending Reminders Required</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  No GOLD users currently fall in the 3–7 day expiration window without having received a reminder.
                </p>
              </div>
            </div>
          ) : (
            pendingUsers.map(user => (
              <div key={user.id} className="bg-slate-50 hover:bg-slate-100/80 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{user.name || 'Unnamed User'}</h4>
                    <span className="bg-amber-100 text-amber-900 text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                      ⏳ {user.daysRemaining} Day{user.daysRemaining > 1 ? 's' : ''} Remaining
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{user.email}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Expires on: <strong className="text-slate-700">{user.expiryDateFormatted}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDispatchSingle(user)}
                    disabled={isDispatching || !smtpSettings?.enabled}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>Send Email</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Info size={14} className="text-slate-400" />
            <span>Reminders tag user records to prevent duplicate emails for the same expiration cycle.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
            >
              Close
            </button>

            {pendingUsers.length > 0 && (
              <button
                onClick={handleDispatchAll}
                disabled={isDispatching || !smtpSettings?.enabled}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {isDispatching ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                <span>
                  {isDispatching && progressInfo
                    ? `Dispatching (${progressInfo.current}/${progressInfo.total})...`
                    : `Dispatch All (${pendingUsers.length})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
