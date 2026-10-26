import React, { useState } from 'react';
import {
  Shield,
  User,
  Crown,
  Ban,
  Calendar,
  Save,
  XCircle,
  Loader2,
} from 'lucide-react';

import {
  normalizePaymentHistory,
  getDateInputValue,
  getGoldStartAt,
  getLastGoldCharge,
  buildGoldUpdatePayload,
} from '../utils/goldMembership';

export function RoleEditModal({ user, onClose, onUpdate, goldPlanPrices = { 3: 2999, 6: 4999, 12: 7999, 24: 13999 } }) {
  const [role, setRole] = useState(user.role || 'standard');
  const [duration, setDuration] = useState(String([3, 6, 12, 24].includes(Number(user.goldPlanMonths)) ? user.goldPlanMonths : 3));
  const [amount, setAmount] = useState(Number(getLastGoldCharge(user) || goldPlanPrices[3] || 2999));
  const [transactionId, setTransactionId] = useState('');
  const [goldStartDate, setGoldStartDate] = useState(() => getDateInputValue(getGoldStartAt(user) || new Date()));
  const [paymentHistory, setPaymentHistory] = useState(() => normalizePaymentHistory(user?.goldRevenueHistory, user?.id));
  const [isSaving, setIsSaving] = useState(false);

  const getAmountForDuration = (months) => Number(goldPlanPrices[Number(months)] ?? goldPlanPrices[3] ?? 2999);

  const handleFreeUpgrade = () => {
    setRole('gold');
    setAmount(0);
    setTransactionId(prev => prev.trim() ? prev : 'FREE_UPGRADE');
  };

  const addCurrentUpgradeToHistory = () => {
    const finalAmount = (amount !== '' && !isNaN(amount) && Number(amount) >= 0) ? Number(amount) : getAmountForDuration(duration);
    const goldMonths = Number(duration) || 3;
    setPaymentHistory(prev => {
      const exists = prev.some(item => Number(item.amount) === finalAmount && Number(item.months) === goldMonths && item.transactionId === transactionId);
      if (exists) return prev;
      return [...prev, {
        id: `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        userId: user?.id,
        amount: finalAmount,
        months: goldMonths,
        chargedAt: new Date().toISOString(),
        transactionId: transactionId || (finalAmount === 0 ? 'FREE_UPGRADE' : ''),
      }];
    });
  };

  const deletePaymentEntry = (entryId) => {
    setPaymentHistory(prev => prev.filter(entry => entry.id !== entryId));
  };

  const handleSave = () => {
    setIsSaving(true);
    const finalAmount = (amount !== '' && !isNaN(amount) && Number(amount) >= 0) ? Number(amount) : getAmountForDuration(duration);
    const startDate = new Date(`${goldStartDate}T00:00:00`);

    const updateData = buildGoldUpdatePayload({
      role,
      startDate,
      months: Number(duration) || 3,
      amount: finalAmount,
      transactionId: transactionId || (finalAmount === 0 ? 'FREE_UPGRADE' : ''),
      currentUserRecord: user,
      paymentHistory,
    });

    onUpdate(user.id, updateData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-auto animate-in zoom-in-95">
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-xl flex items-center gap-3"><Shield size={24} className="text-indigo-600" /> Manage Access</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition"><XCircle size={24} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl font-black text-indigo-700 shrink-0 shadow-inner">{user.name ? user.name[0].toUpperCase() : "U"}</div>
            <div className="flex-1 min-w-0 pt-1">
              <h4 className="font-black text-xl text-slate-800 truncate">{user.name || 'Unnamed User'}</h4>
              <p className="text-sm font-medium text-slate-500 truncate mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Account Tier</label>
              <button
                type="button"
                onClick={handleFreeUpgrade}
                className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                title="Instantly grant Gold membership for ₹0"
              >
                <Crown size={14} className="text-amber-500 fill-amber-400" />
                <span>Free Upgrade (₹0)</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setRole('standard')} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all ${role === 'standard' ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-slate-200 hover:border-indigo-200 text-slate-600'}`}><User size={26} className={role === 'standard' ? 'text-indigo-600' : ''} /><span className="text-sm font-bold">Standard</span></button>
              <button onClick={() => setRole('gold')} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all ${role === 'gold' ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm' : 'border-slate-200 hover:border-amber-200 text-slate-600'}`}><Crown size={26} className={role === 'gold' ? 'text-amber-500' : ''} /><span className="text-sm font-bold">Gold Pro</span></button>
              <button onClick={() => setRole('banned')} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all ${role === 'banned' ? 'border-red-500 bg-red-50 text-red-900 shadow-sm' : 'border-slate-200 hover:border-red-200 text-slate-600'}`}><Ban size={26} className={role === 'banned' ? 'text-red-600' : ''} /><span className="text-sm font-bold">Suspend</span></button>
            </div>
          </div>

          {role === 'banned' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2 text-xs text-red-900">
              <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                <Ban size={18} /> User is currently Suspended
              </div>
              <p className="text-red-700/90 font-medium">This member's access is suspended. You can reinstate them or grant a complimentary Gold upgrade.</p>
              <button
                type="button"
                onClick={handleFreeUpgrade}
                className="mt-2 w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Crown size={16} className="text-amber-300 fill-amber-300" /> Free Gold Upgrade (₹0)
              </button>
            </div>
          )}

          {role === 'gold' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm">
              <label className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2 mb-3"><Calendar size={16} /> Gold start date</label>
              <input
                type="date"
                value={goldStartDate}
                onChange={(e) => setGoldStartDate(e.target.value || new Date().toISOString().slice(0, 10))}
                className="w-full p-3.5 border-2 border-amber-300 bg-white rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/20 transition-all"
              />

              <label className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2 mb-3 mt-4"><Calendar size={16} /> Duration</label>
              <select
                value={duration}
                onChange={(e) => {
                  const nextDuration = e.target.value;
                  setDuration(nextDuration);
                  if (Number(amount) > 0) {
                    setAmount(getAmountForDuration(nextDuration));
                  }
                }}
                className="w-full p-3.5 border-2 border-amber-300 bg-white rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/20 transition-all cursor-pointer"
              >
                <option value="3">3 Months</option><option value="6">6 Months</option><option value="12">1 Year (12 Months)</option><option value="24">2 Years (24 Months)</option>
              </select>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Upgrade amount (₹)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAmount(0)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${Number(amount) === 0 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'}`}
                    >
                      ₹0 (Free)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(getAmountForDuration(duration))}
                      className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md hover:bg-amber-200 transition"
                    >
                      Reset Price
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3.5 border-2 border-amber-300 bg-white rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="mt-3">
                <label className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-2">Transaction ID / Reference (Optional)</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. TXN123456789 or UPI Ref"
                  className="w-full p-3.5 border-2 border-amber-300 bg-white rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div className="pt-4 border-t border-amber-200 mt-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Payment history</span>
                  <button
                    type="button"
                    onClick={addCurrentUpgradeToHistory}
                    className="text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white px-2.5 py-1.5 rounded-full hover:bg-amber-700 transition"
                  >
                    Add current
                  </button>
                </div>

                {paymentHistory.length === 0 ? (
                  <div className="text-xs text-amber-800/80 font-medium bg-white/60 border border-dashed border-amber-200 rounded-xl p-3">No payment entries yet.</div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-auto pr-1">
                    {paymentHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 border border-amber-200">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800">₹{Number(entry.amount).toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {Number(entry.months) || 1} month • {new Date(entry.chargedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deletePaymentEntry(entry.id)}
                          className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-3.5 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition flex justify-center items-center gap-2">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Apply Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
