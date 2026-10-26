import React, { useState, useMemo } from 'react';
import {
  Crown,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Receipt,
  Edit3,
  History,
  Shield,
  CreditCard,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Loader2,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Tag
} from 'lucide-react';
import {
  normalizePaymentHistory,
  getGoldStartAt,
  getLastGoldCharge,
  getDateInputValue,
  buildGoldUpdatePayload
} from '../utils/goldMembership';
import { getExpiryMs } from '../utils/userFormatters';

/**
 * Consistent date formatting helper across start, end (expiry), and payment dates.
 * Output format: "12 Sep 2026"
 */
const formatDateConsistent = (val) => {
  if (!val) return '—';
  let dateObj;
  if (val?.seconds) {
    dateObj = new Date(val.seconds * 1000);
  } else if (val instanceof Date) {
    dateObj = val;
  } else {
    dateObj = new Date(val);
  }

  if (isNaN(dateObj.getTime())) return '—';

  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export function GoldMembersScreen({ users = [], onUpdateUser, onOpenRoleModal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'near_expiry', 'inactive'
  const [sortBy, setSortBy] = useState('start_date'); // 'start_date', 'expiry', 'amount', 'name'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
  const [editingTxnUser, setEditingTxnUser] = useState(null);
  const [txnInput, setTxnInput] = useState('');
  const [isSavingTxn, setIsSavingTxn] = useState(false);

  const nowMs = Date.now();
  const nearExpiryLimitMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days window

  // Calculate status tagging for each user
  const processedGoldUsers = useMemo(() => {
    return users
      .map((u) => {
        const history = normalizePaymentHistory(
          u.goldRevenueHistory,
          u.id,
          getLastGoldCharge(u),
          u.goldPlanMonths || 1,
          getGoldStartAt(u)
        );

        const isGoldRole = u.role === 'gold';
        const expiryMs = getExpiryMs(u.goldExpiry);
        const hasHistory = history.length > 0;

        let statusTag = 'inactive'; // 'active', 'near_expiry', 'inactive'
        let statusLabel = 'Inactive / Expired';

        if (isGoldRole) {
          if (expiryMs && expiryMs <= nowMs) {
            statusTag = 'inactive';
            statusLabel = 'Expired';
          } else if (expiryMs && expiryMs <= nearExpiryLimitMs) {
            statusTag = 'near_expiry';
            const daysLeft = Math.max(1, Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24)));
            statusLabel = `Near Expiry (${daysLeft}d left)`;
          } else {
            statusTag = 'active';
            statusLabel = 'Active';
          }
        } else if (hasHistory) {
          statusTag = 'inactive';
          statusLabel = 'Inactive / Expired';
        }

        // Get latest transaction if available
        const sortedHistory = [...history].sort(
          (a, b) => new Date(b.chargedAt).getTime() - new Date(a.chargedAt).getTime()
        );
        const latestTxn = sortedHistory[0] || null;

        return {
          ...u,
          statusTag,
          statusLabel,
          history: sortedHistory,
          latestTxn,
          goldStartAtDate: getGoldStartAt(u),
          lastCharge: getLastGoldCharge(u),
          isGoldRole,
          hasHistory,
        };
      })
      .filter((u) => u.isGoldRole || u.hasHistory);
  }, [users, nowMs, nearExpiryLimitMs]);

  // Statistics summaries
  const stats = useMemo(() => {
    const active = processedGoldUsers.filter((u) => u.statusTag === 'active').length;
    const nearExpiry = processedGoldUsers.filter((u) => u.statusTag === 'near_expiry').length;
    const inactive = processedGoldUsers.filter((u) => u.statusTag === 'inactive').length;
    const totalRevenue = processedGoldUsers.reduce((sum, u) => {
      return sum + u.history.reduce((hSum, item) => hSum + Number(item.amount || 0), 0);
    }, 0);

    return { active, nearExpiry, inactive, total: processedGoldUsers.length, totalRevenue };
  }, [processedGoldUsers]);

  // Filtered & Sorted members list
  const sortedAndFilteredMembers = useMemo(() => {
    const filtered = processedGoldUsers.filter((u) => {
      // Status filter
      if (statusFilter === 'active' && u.statusTag !== 'active') return false;
      if (statusFilter === 'near_expiry' && u.statusTag !== 'near_expiry') return false;
      if (statusFilter === 'inactive' && u.statusTag !== 'inactive') return false;

      // Search filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const mobile = (u.mobile || u.phone || '').toLowerCase();
      const txnsMatch = u.history.some(
        (h) => (h.transactionId || '').toLowerCase().includes(term) || (h.note || '').toLowerCase().includes(term)
      );

      return name.includes(term) || email.includes(term) || mobile.includes(term) || txnsMatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'start_date') {
        const aTime = a.goldStartAtDate ? new Date(a.goldStartAtDate).getTime() : 0;
        const bTime = b.goldStartAtDate ? new Date(b.goldStartAtDate).getTime() : 0;
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      }
      if (sortBy === 'expiry') {
        const aTime = getExpiryMs(a.goldExpiry) || 0;
        const bTime = getExpiryMs(b.goldExpiry) || 0;
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      }
      if (sortBy === 'amount') {
        const aAmt = Number(a.lastCharge || (a.latestTxn ? a.latestTxn.amount : 0));
        const bAmt = Number(b.lastCharge || (b.latestTxn ? b.latestTxn.amount : 0));
        return sortOrder === 'desc' ? bAmt - aAmt : aAmt - bAmt;
      }
      if (sortBy === 'name') {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        return sortOrder === 'desc' ? bName.localeCompare(aName) : aName.localeCompare(bName);
      }
      return 0;
    });
  }, [processedGoldUsers, statusFilter, searchTerm, sortBy, sortOrder]);

  // Header column click toggle sorting
  const handleHeaderSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(columnKey);
      setSortOrder('desc');
    }
  };

  // Render header sort arrow icon
  const renderSortArrow = (columnKey) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown size={13} className="opacity-40 hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'desc' ? (
      <ArrowDown size={14} className="text-amber-600 font-bold" />
    ) : (
      <ArrowUp size={14} className="text-amber-600 font-bold" />
    );
  };

  // Save Transaction ID handler
  const handleSaveTransactionId = async () => {
    if (!editingTxnUser) return;
    setIsSavingTxn(true);

    try {
      const userRecord = editingTxnUser;
      const updatedHistory = [...userRecord.history];

      if (updatedHistory.length > 0) {
        // Update latest transaction entry
        updatedHistory[0] = {
          ...updatedHistory[0],
          transactionId: txnInput.trim(),
        };
      } else {
        // Create new fallback transaction entry
        updatedHistory.push({
          id: `payment-${Date.now()}`,
          userId: userRecord.id,
          amount: Number(userRecord.lastCharge || 0),
          months: Number(userRecord.goldPlanMonths || 1),
          chargedAt: userRecord.goldStartAtDate || new Date().toISOString(),
          transactionId: txnInput.trim(),
          note: 'Transaction ID added via Gold Members Manager',
        });
      }

      const payload = buildGoldUpdatePayload({
        role: userRecord.role || 'gold',
        startDate: userRecord.goldStartAtDate ? new Date(userRecord.goldStartAtDate) : new Date(),
        months: userRecord.goldPlanMonths || 1,
        amount: userRecord.lastCharge || 0,
        transactionId: txnInput.trim(),
        currentUserRecord: userRecord,
        paymentHistory: updatedHistory,
      });

      await onUpdateUser(userRecord.id, payload);
      setEditingTxnUser(null);
      setTxnInput('');
    } catch (err) {
      console.error('Error updating transaction ID:', err);
      alert('Failed to update transaction ID: ' + (err.message || String(err)));
    } finally {
      setIsSavingTxn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <Crown size={240} />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-100 text-xs font-bold uppercase tracking-widest">
              <Crown size={18} /> Premium Membership Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">GOLD Members Details</h2>
            <p className="text-amber-100/90 text-xs sm:text-sm font-medium mt-1 max-w-xl">
              Track subscriptions, membership dates, payment records, transaction IDs, and historical upgrade records for all GOLD subscribers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <div className="bg-white/15 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-amber-100 tracking-wider">Total Revenue</div>
              <div className="text-lg sm:text-xl font-black">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left ${
            statusFilter === 'all'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-80">All Members</span>
            <Crown size={18} className={statusFilter === 'all' ? 'text-white' : 'text-amber-500'} />
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1 sm:mt-2">{stats.total}</div>
        </button>

        <button
          onClick={() => setStatusFilter('active')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left ${
            statusFilter === 'active'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-80">Active</span>
            <CheckCircle size={18} className={statusFilter === 'active' ? 'text-white' : 'text-emerald-500'} />
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1 sm:mt-2">{stats.active}</div>
        </button>

        <button
          onClick={() => setStatusFilter('near_expiry')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left ${
            statusFilter === 'near_expiry'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-80">Near Expiry</span>
            <AlertTriangle size={18} className={statusFilter === 'near_expiry' ? 'text-white' : 'text-amber-500'} />
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1 sm:mt-2">{stats.nearExpiry}</div>
        </button>

        <button
          onClick={() => setStatusFilter('inactive')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left ${
            statusFilter === 'inactive'
              ? 'bg-slate-700 text-white border-slate-700 shadow-md shadow-slate-700/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-80">Expired</span>
            <XCircle size={18} className={statusFilter === 'inactive' ? 'text-white' : 'text-slate-400'} />
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1 sm:mt-2">{stats.inactive}</div>
        </button>
      </div>

      {/* Controls, Search & Sorting Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-3.5 sm:gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:max-w-2xl">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search name, email, phone, or Txn ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium transition"
            />
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <ArrowUpDown className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [key, order] = e.target.value.split('_');
                setSortBy(key === 'start' ? 'start_date' : key);
                setSortOrder(order);
              }}
              className="w-full pl-10 pr-8 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer appearance-none transition"
            >
              <option value="start_desc">Latest Gold Start Date</option>
              <option value="start_asc">Oldest Gold Start Date</option>
              <option value="expiry_asc">Expiring Soonest</option>
              <option value="expiry_desc">Expiring Furthest</option>
              <option value="amount_desc">Highest Payment First</option>
              <option value="name_asc">Member Name (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-start sm:justify-end w-full xl:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Filter size={14} className="text-amber-600" /> Filter:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Active ({stats.active})
          </button>
          <button
            onClick={() => setStatusFilter('near_expiry')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              statusFilter === 'near_expiry'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Near Expiry ({stats.nearExpiry})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              statusFilter === 'inactive'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Expired ({stats.inactive})
          </button>
        </div>
      </div>

      {/* Main Container: Desktop Table View + Mobile/Tablet Card View */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {sortedAndFilteredMembers.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Crown size={48} className="mx-auto text-slate-300 mb-3" />
            <h4 className="text-lg font-bold text-slate-700">No GOLD members match your criteria</h4>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search terms, filter selection, or sort order.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-[0.18em] font-black border-b border-slate-200">
                    <th className="px-6 py-4">
                      <button
                        onClick={() => handleHeaderSort('name')}
                        className="flex items-center gap-1.5 hover:text-amber-600 transition"
                      >
                        Member Info {renderSortArrow('name')}
                      </button>
                    </th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleHeaderSort('start_date')}
                          className="flex items-center gap-1 hover:text-amber-600 transition"
                          title="Sort by Start Date"
                        >
                          Start Date {renderSortArrow('start_date')}
                        </button>
                        <span className="text-slate-300">/</span>
                        <button
                          onClick={() => handleHeaderSort('expiry')}
                          className="flex items-center gap-1 hover:text-amber-600 transition"
                          title="Sort by Expiry Date"
                        >
                          End Date {renderSortArrow('expiry')}
                        </button>
                      </div>
                    </th>
                    <th className="px-5 py-4">
                      <button
                        onClick={() => handleHeaderSort('amount')}
                        className="flex items-center gap-1.5 hover:text-amber-600 transition"
                      >
                        Payment & Txn ID {renderSortArrow('amount')}
                      </button>
                    </th>
                    <th className="px-4 py-4 text-center">History</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sortedAndFilteredMembers.map((member) => {
                    const startDateStr = formatDateConsistent(member.goldStartAtDate);
                    const expiryStr = formatDateConsistent(member.goldExpiry);
                    const durationMonths = member.goldPlanMonths || (member.latestTxn ? member.latestTxn.months : 1);
                    const lastPaymentAmount = member.lastCharge || (member.latestTxn ? member.latestTxn.amount : 0);
                    const paymentDateStr = formatDateConsistent(member.latestTxn?.chargedAt || member.goldStartAtDate);
                    const transactionId = member.latestTxn?.transactionId || '';

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 bg-amber-100 text-amber-700 font-black rounded-2xl flex items-center justify-center text-base shrink-0 shadow-inner">
                              {member.name ? member.name[0].toUpperCase() : 'G'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate text-sm">
                                {member.name || 'Unnamed Member'}
                              </div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">{member.email}</div>
                              {member.mobile && (
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{member.mobile}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {member.statusTag === 'active' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle size={14} className="text-emerald-600" /> Active
                            </span>
                          )}
                          {member.statusTag === 'near_expiry' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <AlertTriangle size={14} className="text-amber-600" /> {member.statusLabel}
                            </span>
                          )}
                          {member.statusTag === 'inactive' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle size={14} className="text-slate-400" /> {member.statusLabel}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 inline-block min-w-[210px]">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800 gap-2">
                              <span>{startDateStr}</span>
                              <ArrowRight size={13} className="text-slate-400 shrink-0" />
                              <span className={member.statusTag === 'near_expiry' ? 'text-amber-900 font-black' : ''}>
                                {expiryStr}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                              <span className="flex items-center gap-1 text-amber-700 font-bold">
                                <Clock size={12} /> {durationMonths} {durationMonths === 1 ? 'Month' : 'Months'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-emerald-700 text-sm">
                                {Number(lastPaymentAmount) === 0 ? (
                                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">🎁 ₹0 (Free)</span>
                                ) : (
                                  `₹${Number(lastPaymentAmount).toLocaleString('en-IN')}`
                                )}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">({paymentDateStr})</span>
                            </div>

                            <div>
                              {transactionId ? (
                                <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5">
                                  <span className="font-mono text-[11px] font-bold text-slate-700 truncate max-w-[140px]">
                                    {transactionId}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingTxnUser(member);
                                      setTxnInput(transactionId);
                                    }}
                                    className="text-slate-400 hover:text-amber-600 transition p-0.5 ml-1"
                                    title="Edit Transaction ID"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingTxnUser(member);
                                    setTxnInput('');
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition"
                                >
                                  <Plus size={12} /> Add Txn ID
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => setSelectedUserForHistory(member)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-xl border border-indigo-200 transition"
                            title="View all older transactions for this user"
                          >
                            <History size={13} /> {member.history.length}
                          </button>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onOpenRoleModal && onOpenRoleModal(member)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-300 transition shadow-sm"
                            title="Edit Gold Status or Role"
                          >
                            <Shield size={14} /> Manage Access
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card View (< md screens) */}
            <div className="md:hidden divide-y divide-slate-100">
              {sortedAndFilteredMembers.map((member) => {
                const startDateStr = formatDateConsistent(member.goldStartAtDate);
                const expiryStr = formatDateConsistent(member.goldExpiry);
                const durationMonths = member.goldPlanMonths || (member.latestTxn ? member.latestTxn.months : 1);
                const lastPaymentAmount = member.lastCharge || (member.latestTxn ? member.latestTxn.amount : 0);
                const paymentDateStr = formatDateConsistent(member.latestTxn?.chargedAt || member.goldStartAtDate);
                const transactionId = member.latestTxn?.transactionId || '';

                return (
                  <div key={member.id} className="p-4 space-y-3 hover:bg-slate-50/80 transition-colors">
                    {/* Header: User Info & Status Tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-amber-100 text-amber-700 font-black rounded-2xl flex items-center justify-center text-base shrink-0 shadow-inner">
                          {member.name ? member.name[0].toUpperCase() : 'G'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate text-sm">
                            {member.name || 'Unnamed Member'}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{member.email}</div>
                          {member.mobile && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{member.mobile}</div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {member.statusTag === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle size={12} className="text-emerald-600" /> Active
                          </span>
                        )}
                        {member.statusTag === 'near_expiry' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            <AlertTriangle size={12} className="text-amber-600" /> {member.statusLabel}
                          </span>
                        )}
                        {member.statusTag === 'inactive' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <XCircle size={12} className="text-slate-400" /> {member.statusLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Membership Period Card */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1"><Calendar size={13} className="text-slate-400" /> {startDateStr}</span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className={member.statusTag === 'near_expiry' ? 'text-amber-900 font-black' : ''}>{expiryStr}</span>
                      </div>
                      <div className="text-[11px] text-amber-700 font-bold flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="flex items-center gap-1"><Clock size={12} /> Plan: {durationMonths} {durationMonths === 1 ? 'Month' : 'Months'}</span>
                        <span className="text-emerald-700 font-black">
                          {Number(lastPaymentAmount) === 0 ? '🎁 ₹0 (Free)' : `₹${Number(lastPaymentAmount).toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    </div>

                    {/* Txn ID & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div>
                        {transactionId ? (
                          <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
                            <span className="font-mono text-[11px] font-bold text-slate-700 truncate max-w-[120px]">
                              {transactionId}
                            </span>
                            <button
                              onClick={() => {
                                setEditingTxnUser(member);
                                setTxnInput(transactionId);
                              }}
                              className="text-slate-400 hover:text-amber-600 transition p-0.5 ml-0.5"
                              title="Edit Transaction ID"
                            >
                              <Edit3 size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingTxnUser(member);
                              setTxnInput('');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200"
                          >
                            <Plus size={12} /> Add Txn ID
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUserForHistory(member)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-xl border border-indigo-200"
                        >
                          <History size={13} /> {member.history.length}
                        </button>
                        <button
                          onClick={() => onOpenRoleModal && onOpenRoleModal(member)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300"
                        >
                          <Shield size={13} /> Manage
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Transaction ID Add / Edit Modal */}
      {editingTxnUser && (
        <div className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4 sm:space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                <Receipt className="text-amber-600" size={20} /> Update Transaction ID
              </h3>
              <button
                onClick={() => setEditingTxnUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Member</div>
                <div className="font-bold text-slate-800 text-sm sm:text-base">{editingTxnUser.name || 'Unnamed Member'}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{editingTxnUser.email}</div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
                  Transaction ID / Reference Number
                </label>
                <input
                  type="text"
                  value={txnInput}
                  onChange={(e) => setTxnInput(e.target.value)}
                  placeholder="e.g. UPI/123456789/RAZORPAY_REF"
                  className="w-full p-3 border-2 border-amber-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/20 bg-white"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Optional reference code (e.g. Bank UTR, Razorpay Payment ID, or UPI Ref) to link to this member.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingTxnUser(null)}
                disabled={isSavingTxn}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTransactionId}
                disabled={isSavingTxn}
                className="flex-1 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg shadow-amber-200 flex justify-center items-center gap-2 transition"
              >
                {isSavingTxn ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Txn ID</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Older Transactions History Modal */}
      {selectedUserForHistory && (
        <div className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-amber-50 border-b border-amber-200 p-4 sm:p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 text-white font-black rounded-2xl flex items-center justify-center text-lg sm:text-xl shadow-sm shrink-0">
                  <History size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 text-lg sm:text-xl truncate">Payment & Upgrade History</h3>
                  <p className="text-xs font-bold text-amber-800 mt-0.5 truncate">
                    {selectedUserForHistory.name || 'Unnamed Member'} ({selectedUserForHistory.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForHistory(null)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition shrink-0"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
                <span>Transactions ({selectedUserForHistory.history.length})</span>
                <span>Total Paid: ₹{selectedUserForHistory.history.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('en-IN')}</span>
              </div>

              {selectedUserForHistory.history.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
                  No previous transactions logged for this member.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedUserForHistory.history.map((txn, index) => {
                    const isLatest = index === 0;
                    const txnDateStr = formatDateConsistent(txn.chargedAt);
                    return (
                      <div
                        key={txn.id || index}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          isLatest
                            ? 'bg-amber-50/70 border-amber-200 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base sm:text-lg font-black text-slate-800">
                                {Number(txn.amount) === 0 ? (
                                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-xs sm:text-sm border border-emerald-200">
                                    🎁 ₹0 (Free Upgrade)
                                  </span>
                                ) : (
                                  `₹${Number(txn.amount).toLocaleString('en-IN')}`
                                )}
                              </span>
                              {isLatest && (
                                <span className="bg-amber-600 text-white text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full">
                                  Latest Active
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-500 font-medium mt-1.5 flex flex-wrap gap-4">
                              <span>Duration: <strong className="text-slate-700">{txn.months || 1} Month(s)</strong></span>
                              <span>Payment Date: <strong className="text-slate-700">{txnDateStr}</strong></span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                            {txn.transactionId ? (
                              <div className="inline-block bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-bold px-2.5 py-1 rounded-lg">
                                Txn ID: {txn.transactionId}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic">No Txn ID logged</div>
                            )}
                          </div>
                        </div>

                        {txn.note && (
                          <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 text-xs text-amber-900 font-medium">
                            <span className="font-bold">Note:</span> {txn.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedUserForHistory(null)}
                className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
