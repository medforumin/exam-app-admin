import React, { useState, useEffect } from 'react';
import {
  User,
  Crown,
  Ban,
  AlertTriangle,
  CheckCircle,
  Shield,
  XCircle,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { formatJoinDate } from '../utils/userFormatters';
import { getGoldStartAt, getLastGoldCharge } from '../utils/goldMembership';

export function UserProfileModal({ user, onClose, onManageAccess, onResetDevice }) {
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyToClipboard = (text, fieldKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const getRoleLabel = (role) => {
    if (role === 'gold') return 'Gold Pro';
    if (role === 'banned') return 'Suspended';
    if (role === 'admin') return 'Admin';
    return 'Standard';
  };

  const getStatusTone = (role) => {
    if (role === 'gold') return 'bg-amber-100 text-amber-900 border-amber-200';
    if (role === 'banned') return 'bg-red-100 text-red-900 border-red-200';
    if (role === 'admin') return 'bg-slate-800 text-white border-slate-800';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const internalGoldKeys = [
    'goldStartAt', 'goldStartDate', 'goldStartdate', 'goldstartat', 'goldExpiry', 'goldPlanMonths',
    'lastGoldCharge', 'goldMembershipAmount', 'subscriptionAmount',
    'goldRevenueHistory', 'goldLastUpdatedAt'
  ];

  const extraFields = Object.entries(user || {}).filter(
    ([key]) => !['id', 'name', 'email', 'mobile', 'role', 'emailVerified', 'createdAt', 'updatedAt', 'deviceId', 'bannedAt', 'banReason', ...internalGoldKeys].includes(key)
  );

  const goldStartStr = (() => {
    const raw = getGoldStartAt(user);
    if (!raw) return 'N/A';
    const date = new Date(raw.seconds ? raw.seconds * 1000 : raw);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  })();

  const goldLastCharge = getLastGoldCharge(user);

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-auto animate-in zoom-in-95">
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-black text-indigo-700 shrink-0 shadow-inner">{(user?.name || 'U').charAt(0).toUpperCase()}</div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 text-xl truncate">{user?.name || 'Unnamed User'}</h3>
              <p className="text-sm font-medium text-slate-500 truncate">{user?.email || 'No email provided'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition"><XCircle size={24}/></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${getStatusTone(user?.role)}`}>
                {user?.role === 'gold' ? <Crown size={12} /> : user?.role === 'banned' ? <Ban size={12} /> : <User size={12} />}
                {getRoleLabel(user?.role)}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${user?.emailVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {user?.emailVerified ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                {user?.emailVerified ? 'Verified' : 'Pending verification'}
              </span>
            </div>

            {onResetDevice && (
              <button
                onClick={() => onResetDevice(user.id)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-full transition shadow-sm"
                title="Clear device binding so user can log in on a new device"
              >
                <RotateCcw size={13} /> Reset Device Binding
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Full name</div>
              <div className="font-bold text-slate-800">{user?.name || 'Unknown'}</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User ID</span>
                {user?.id && (
                  <button
                    onClick={() => copyToClipboard(user.id, 'id')}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {copiedField === 'id' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedField === 'id' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="font-mono text-xs text-slate-700 break-all">{user?.id || 'N/A'}</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                {user?.email && (
                  <button
                    onClick={() => copyToClipboard(user.email, 'email')}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {copiedField === 'email' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="font-medium text-slate-700 break-all">{user?.email || 'N/A'}</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile</span>
                {user?.mobile && (
                  <button
                    onClick={() => copyToClipboard(user.mobile, 'mobile')}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {copiedField === 'mobile' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedField === 'mobile' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="font-medium text-slate-700">{user?.mobile || 'N/A'}</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Device binding</div>
              <div className="font-mono text-xs text-slate-700 break-all">
                {user?.deviceId ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Bound: {user.deviceId.slice(0, 16)}...</span>
                ) : (
                  <span className="text-slate-400 italic">No device bound</span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Joined</div>
              <div className="font-medium text-slate-700">{formatJoinDate(user?.createdAt, user?.updatedAt)}</div>
            </div>
          </div>

          {user?.role === 'banned' && (
            <div className="bg-red-50 p-5 rounded-2xl border border-red-200 space-y-2">
              <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-2">
                <Ban size={16} className="text-red-600" /> Account Suspension Details
              </h4>
              <div className="text-xs text-red-800 font-medium space-y-1">
                <div><strong className="text-red-950">Suspended Date:</strong> {user.bannedAt ? new Date(user.bannedAt).toLocaleString() : 'N/A'}</div>
                <div><strong className="text-red-950">Reason / Admin Note:</strong> {user.banReason || 'No reason specified'}</div>
              </div>
            </div>
          )}

          {user?.role === 'gold' && (
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 space-y-3">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <Crown size={16} className="text-amber-600" /> Gold Membership Details
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block mb-1">Start Date</span>
                  <span className="font-extrabold text-slate-800">{goldStartStr}</span>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block mb-1">Plan Duration</span>
                  <span className="font-extrabold text-slate-800">{user.goldPlanMonths ? `${user.goldPlanMonths} mo` : 'N/A'}</span>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block mb-1">Last Charge</span>
                  <span className="font-extrabold text-slate-800">{goldLastCharge > 0 ? `₹${goldLastCharge.toLocaleString('en-IN')}` : 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {extraFields.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Additional details</h4>
              <div className="space-y-2">
                {extraFields.map(([key, value]) => (
                  <div key={key} className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-full sm:w-36">{key}</div>
                    <div className="font-medium text-slate-700 break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'N/A')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm">Close</button>
          <button onClick={onManageAccess} className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2"><Shield size={18} /> Manage access</button>
        </div>
      </div>
    </div>
  );
}
