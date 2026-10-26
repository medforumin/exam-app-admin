import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, writeBatch, getDoc, setDoc, serverTimestamp, Timestamp, deleteField
} from "firebase/firestore";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "firebase/auth";
import {
  Search,
  User,
  Users,
  LogOut,
  Shield,
  ShieldCheck,
  Crown,
  Smartphone,
  Mail,
  Calendar,
  Clock,
  Filter,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  Ban,
  AlertTriangle,
  Download,
  Upload,
  FileText,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Copy,
  Check,
  Database,
  FileJson
} from 'lucide-react';
import { auth, db, logAdminAudit, saveExportMeta, sendSheetUpdate } from './lib/firebase';
import { formatExpiry, formatJoinDate, getExpiryMs } from './utils/userFormatters';
import {
  normalizePaymentHistory,
  getGoldStartAt,
  getLastGoldCharge,
  buildGoldUpdatePayload,
} from './utils/goldMembership';
import { UserProfileModal } from './components/UserProfileModal';
import { RoleEditModal } from './components/RoleEditModal';
import { GoldMembersScreen } from './components/GoldMembersScreen';
import { EmailSettingsScreen } from './components/EmailSettingsScreen';
import { PendingPaymentRequests } from './components/PendingPaymentRequests';
import { ReminderScannerModal } from './components/ReminderScannerModal';
import { scanExpiringGoldUsers } from './utils/goldReminderScanner';
import { sendGoldUpgradeEmailIfActive, sendGoldDowngradeEmailIfActive } from './lib/emailService';

// --- MAIN COMPONENT ---
export default function AdminApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }

    setCurrentUser(null);
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    if (auth) {
      try { await signOut(auth); } catch (e) { console.error(e); }
    }
    setCurrentUser(null);
    window.location.reload();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-teal-600" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {currentUser ? <Dashboard user={currentUser} onLogout={handleLogout} /> : <LoginScreen />}
    </div>
  );
}

// --- LOGIN SCREEN ---
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    if (!auth) {
      setError("Authentication service unavailable. Check Firebase configuration.");
      setIsLoggingIn(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      let msg = "Login Failed.";
      if (err.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
      if (err.code === 'auth/user-not-found') msg = "No user found with this email.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/too-many-requests') msg = "Too many attempts. Try again later.";
      setError(msg);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-700">
            <Shield size={32} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Admin Portal</h1>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold font-mono px-2 py-0.5 rounded-full border border-indigo-200">v3.0.5</span>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Pediatrics PYQ Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">Admin Email</label>
            <input
              type="email"
              required
              className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow bg-slate-50 focus:bg-white"
              placeholder="admin@medforum.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wide">Password</label>
            <input
              type="password"
              required
              className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow bg-slate-50 focus:bg-white"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-in slide-in-from-top-2">
              <p className="text-red-800 text-sm font-semibold flex items-center gap-2">
                <AlertTriangle size={16} /> {error}
              </p>
            </div>
          )}

          <button disabled={isLoggingIn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5">
            {isLoggingIn ? <Loader2 className="animate-spin" /> : "Secure Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- DASHBOARD ---
function Dashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Bulk Actions State
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [showBulkGoldModal, setShowBulkGoldModal] = useState(false);
  const defaultGoldPlanPrices = { 3: 2999, 6: 4999, 12: 7999 };
  const [goldPlanPrices, setGoldPlanPrices] = useState(() => {
    try {
      const saved = localStorage.getItem('pyq_gold_plan_prices');
      if (!saved) return defaultGoldPlanPrices;
      const parsed = JSON.parse(saved);
      return { ...defaultGoldPlanPrices, ...parsed };
    } catch (e) {
      console.error('Could not read saved gold pricing:', e);
      return defaultGoldPlanPrices;
    }
  });
  const [showGoldPricingEditor, setShowGoldPricingEditor] = useState(false);

  // Backup & Restore States
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef(null);

  // Export Utility State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPaymentTrackerModal, setShowPaymentTrackerModal] = useState(false);
  const [activeView, setActiveView] = useState('users');
  const [revenueSearch, setRevenueSearch] = useState('');
  const [revenueUserSearch, setRevenueUserSearch] = useState('');
  const [revenuePeriodFilter, setRevenuePeriodFilter] = useState('all'); // 'all', 'today', '7days', '30days', 'this_month', 'custom'
  const [revenueCustomStartDate, setRevenueCustomStartDate] = useState('');
  const [revenueCustomEndDate, setRevenueCustomEndDate] = useState('');
  const [revenueSortBy, setRevenueSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'amount_desc', 'amount_asc', 'name_asc'
  const [revenueForm, setRevenueForm] = useState({
    userId: '',
    amount: '',
    months: '3',
    chargedAt: new Date().toISOString().slice(0, 16),
    transactionId: '',
    note: '',
  });
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [exportPreset, setExportPreset] = useState('all'); // 'all', 'today', '7days', '30days', 'this_month', 'custom'
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportScope, setExportScope] = useState('all'); // 'all' (all DB users), 'filtered' (current search results)
  const [deduplicateEmails, setDeduplicateEmails] = useState(true);
  const [lastExportInfo, setLastExportInfo] = useState(null);

  // 3-7 Day Reminder Scanner State
  const [showReminderScannerModal, setShowReminderScannerModal] = useState(false);
  const pendingReminderUsers = useMemo(() => scanExpiringGoldUsers(users, 3, 7), [users]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (!db) return;
    try {
      const q = query(
        collection(db, "membership_requests"),
        where("status", "==", "pending_verification")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingRequestsCount(snapshot.size);
      }, (err) => {
        console.warn("Failed to listen to membership_requests:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Error setting up membership_requests listener:", e);
    }
  }, []);

  const getGoldAmountForMonths = (months) => {
    const value = Number(goldPlanPrices[Number(months)] ?? 0);
    return Number.isFinite(value) && value > 0 ? value : Number(defaultGoldPlanPrices[Number(months)] ?? 0);
  };

  const getGoldRevenueEntries = (user) => {
    return normalizePaymentHistory(
      user?.goldRevenueHistory,
      user?.id,
      getLastGoldCharge(user),
      user?.goldPlanMonths || 1,
      getGoldStartAt(user)
    );
  };

  const paymentHistoryEntries = users.flatMap(user => getGoldRevenueEntries(user));

  const totalGoldRevenue = paymentHistoryEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const paidEntries = paymentHistoryEntries.filter(entry => Number(entry.amount || 0) > 0);
  const freeEntries = paymentHistoryEntries.filter(entry => Number(entry.amount || 0) === 0);

  const planBreakdown = useMemo(() => {
    const map = {};
    paymentHistoryEntries.forEach(entry => {
      const m = Number(entry.months) || 3;
      if (m === 1) return; // Exclude 1-month cancellations from plan tier cards
      const key = `${m} Month${m > 1 ? 's' : ''}`;
      if (!map[key]) map[key] = { months: m, count: 0, revenue: 0 };
      map[key].count += 1;
      map[key].revenue += Number(entry.amount || 0);
    });
    return Object.values(map).sort((a, b) => a.months - b.months);
  }, [paymentHistoryEntries]);

  const formatDateTimeLocal = (value) => {
    if (!value) return new Date().toISOString().slice(0, 16);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 16);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const getRevenueMonthlySummary = () => {
    const map = new Map();
    paymentHistoryEntries.forEach(entry => {
      const date = new Date(entry.chargedAt);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(entry.amount || 0);
      map.set(key, (map.get(key) || 0) + amount);
    });

    return [...map.entries()].map(([month, amount]) => ({ month, amount })).sort((a, b) => b.month.localeCompare(a.month));
  };

  const monthlyRevenueSummary = getRevenueMonthlySummary();

  const filteredRevenueEntries = useMemo(() => {
    const now = new Date();
    return paymentHistoryEntries
      .filter(entry => {
        // Search text filter
        const user = users.find(u => u.id === entry.userId);
        const haystack = `${user?.name || ''} ${user?.email || ''} ${entry.amount || ''} ${entry.months || ''} ${entry.transactionId || ''} ${entry.note || ''}`.toLowerCase();
        if (revenueSearch.trim() && !haystack.includes(revenueSearch.trim().toLowerCase())) {
          return false;
        }

        // Date period filter
        if (revenuePeriodFilter === 'all') return true;
        const entryMs = new Date(entry.chargedAt).getTime();
        if (Number.isNaN(entryMs)) return false;

        if (revenuePeriodFilter === 'today') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
          return entryMs >= start && entryMs <= end;
        }
        if (revenuePeriodFilter === '7days') {
          const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          return entryMs >= cutoff;
        }
        if (revenuePeriodFilter === '30days') {
          const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          return entryMs >= cutoff;
        }
        if (revenuePeriodFilter === 'this_month') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          return entryMs >= start;
        }
        if (revenuePeriodFilter === 'custom') {
          if (revenueCustomStartDate) {
            const startMs = new Date(revenueCustomStartDate + 'T00:00:00').getTime();
            if (entryMs < startMs) return false;
          }
          if (revenueCustomEndDate) {
            const endMs = new Date(revenueCustomEndDate + 'T23:59:59.999').getTime();
            if (entryMs > endMs) return false;
          }
          return true;
        }
        return true;
      })
      .sort((a, b) => {
        if (revenueSortBy === 'date_desc') return new Date(b.chargedAt).getTime() - new Date(a.chargedAt).getTime();
        if (revenueSortBy === 'date_asc') return new Date(a.chargedAt).getTime() - new Date(b.chargedAt).getTime();
        if (revenueSortBy === 'amount_desc') return Number(b.amount || 0) - Number(a.amount || 0);
        if (revenueSortBy === 'amount_asc') return Number(a.amount || 0) - Number(b.amount || 0);
        if (revenueSortBy === 'name_asc') {
          const uA = users.find(u => u.id === a.userId)?.name || '';
          const uB = users.find(u => u.id === b.userId)?.name || '';
          return uA.localeCompare(uB);
        }
        return 0;
      });
  }, [paymentHistoryEntries, users, revenueSearch, revenuePeriodFilter, revenueCustomStartDate, revenueCustomEndDate, revenueSortBy]);

  const filteredRevenueUsers = users.filter(user => {
    const term = revenueUserSearch.trim().toLowerCase();
    if (!term) return true;
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(term) || email.includes(term) || user.id.toLowerCase().includes(term);
  }).slice(0, 100);

  const saveGoldPlanPrices = async (nextPrices) => {
    const sanitized = {
      3: Number(nextPrices[3]) || defaultGoldPlanPrices[3],
      6: Number(nextPrices[6]) || defaultGoldPlanPrices[6],
      12: Number(nextPrices[12]) || defaultGoldPlanPrices[12],
    };

    setGoldPlanPrices(sanitized);
    localStorage.setItem('pyq_gold_plan_prices', JSON.stringify(sanitized));

    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'goldSubscriptionPlans'), {
          plans: sanitized,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error('Could not save gold pricing:', err);
      }
    }
  };

  // Load last export metadata from localStorage & Firestore
  useEffect(() => {
    try {
      const cached = localStorage.getItem('pyq_last_user_export');
      if (cached) setLastExportInfo(JSON.parse(cached));
    } catch (e) {
      console.error('Error reading cached export info:', e);
    }

    if (db) {
      getDoc(doc(db, "settings", "exportMeta")).then(snap => {
        if (snap.exists() && snap.data().lastUserExport) {
          const meta = snap.data().lastUserExport;
          setLastExportInfo(meta);
          localStorage.setItem('pyq_last_user_export', JSON.stringify(meta));
        }
      }).catch(err => {
        console.error("Could not fetch export metadata from Firestore:", err);
      });

      getDoc(doc(db, 'settings', 'goldSubscriptionPlans')).then(snap => {
        if (snap.exists() && snap.data()?.plans) {
          const plans = { ...defaultGoldPlanPrices, ...snap.data().plans };
          setGoldPlanPrices(plans);
          localStorage.setItem('pyq_gold_plan_prices', JSON.stringify(plans));
        }
      }).catch(err => {
        console.error('Could not fetch gold pricing settings:', err);
      });
    }
  }, [user]);

  // GOLD expiry tracking / alerts
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const expiringWindowDays = 7; // show alerts for GOLD expiring within this many days

  const [restorePreview, setRestorePreview] = useState(null);
  const [isRollbackAvailable, setIsRollbackAvailable] = useState(() => Boolean(localStorage.getItem('pyq_pre_restore_backup')));

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        setEditingUser(null);
        setProfileUser(null);
        setShowDuplicateModal(false);
        setShowExpiryModal(false);
        setShowBulkGoldModal(false);
        setShowExportModal(false);
        setRestorePreview(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const resetDeviceBinding = async (targetUserId) => {
    if (!db) return alert('Database connection not available.');
    const targetUser = users.find(u => u.id === targetUserId);
    if (!window.confirm(`Reset device binding for ${targetUser?.name || targetUser?.email || 'this user'}? This will allow them to log in on a new device.`)) return;
    try {
      await updateDoc(doc(db, 'users', targetUserId), { deviceId: deleteField() });
      await logAdminAudit('reset_device_binding', { userId: targetUserId }, user?.email || 'unknown');
      alert('Device binding reset successfully.');
    } catch (err) {
      console.error('Reset device binding failed:', err);
      alert('Reset failed: ' + (err.message || String(err)));
    }
  };

  const expiringUsers = users.filter(u => {
    if (u.role !== 'gold') return false;
    const ms = getExpiryMs(u.goldExpiry);
    if (!ms) return false;
    const now = Date.now();
    const limit = now + expiringWindowDays * 24 * 60 * 60 * 1000;
    return ms > now && ms <= limit;
  });

  const expiredUsers = users.filter(u => {
    if (u.role !== 'gold') return false;
    const ms = getExpiryMs(u.goldExpiry);
    if (!ms) return false;
    return ms <= Date.now();
  });

  const extendGold = async (targetUserId, months = 1, isComplimentary = false) => {
    if (!db) return alert('Database not available.');
    try {
      const targetUser = users.find(u => u.id === targetUserId) || {};
      const baseMs = getExpiryMs(targetUser?.goldExpiry) || Date.now();
      const baseDate = new Date(baseMs);
      const amount = isComplimentary ? 0 : getGoldAmountForMonths(months);

      const existingHistory = normalizePaymentHistory(
        targetUser.goldRevenueHistory,
        targetUserId,
        getLastGoldCharge(targetUser),
        targetUser.goldPlanMonths || 1,
        getGoldStartAt(targetUser)
      );

      const nextHistory = [
        ...existingHistory,
        {
          id: `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          userId: targetUserId,
          amount,
          months: Number(months),
          chargedAt: new Date().toISOString(),
        }
      ];

      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + Number(months));

      const updateData = {
        role: 'gold',
        goldStartAt: getGoldStartAt(targetUser) || new Date().toISOString(),
        goldStartDate: deleteField(),
        goldStartdate: deleteField(),
        goldstartat: deleteField(),
        goldExpiry: newExpiry,
        goldPlanMonths: Number(months),
        lastGoldCharge: amount,
        goldMembershipAmount: deleteField(),
        goldRevenueHistory: nextHistory,
        goldLastUpdatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'users', targetUserId), updateData);
      sendGoldUpgradeEmailIfActive(db, { ...targetUser, ...updateData }, user?.email || 'admin').catch(e => console.error('Extend gold upgrade email failed:', e));
      await logAdminAudit('extend_gold', { userId: targetUserId, months, amount, isComplimentary, newExpiry: newExpiry.toISOString() }, user.email || 'unknown');
      alert(isComplimentary ? 'Gold extended for FREE (Complimentary) to ' + newExpiry.toLocaleDateString() : 'Gold extended to ' + newExpiry.toLocaleDateString() + ' (₹' + amount.toLocaleString('en-IN') + ')');
      setShowExpiryModal(false);
    } catch (err) {
      console.error('Extend gold failed:', err);
      alert('Extend failed: ' + (err.message || String(err)));
    }
  };

  useEffect(() => {
    if (!db) {
      setError("Database connection not available. Check Firebase configuration and Firestore settings.");
      setLoading(false);
      return;
    }

    try {
      // Load every user document, then sort locally. Ordering by createdAt in Firestore
      // can omit documents with missing/null values, which is why some duplicate-email
      // records were disappearing from the admin list.
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userList);
        setSelectedUsers(prev => prev.filter(id => userList.some(u => u.id === id)));
        setError(null);
        setLoading(false);
      }, (err) => {
        console.error("Firestore Error:", err);
        setError("Permission Denied: Unable to fetch users. Check Firestore Rules.");
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Firestore Init Error:", e);
      setError("Error connecting to database.");
      setLoading(false);
    }
  }, [user]);

  // --- FILTERING & SORTING LOGIC ---
  const filteredUsers = users.filter(u => {
    const searchMatch = !searchTerm ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      u.mobile?.includes(searchTerm);
    if (!searchMatch) return false;

    if (statusFilter === 'all') return true;

    const ms = getExpiryMs(u.goldExpiry);
    const now = Date.now();
    const isGoldRole = u.role === 'gold';

    if (statusFilter === 'gold_active') {
      return isGoldRole && ms > now;
    }
    if (statusFilter === 'expiring_soon') {
      const limit = now + expiringWindowDays * 24 * 60 * 60 * 1000;
      return isGoldRole && ms > now && ms <= limit;
    }
    if (statusFilter === 'gold_expired') {
      return isGoldRole && ms <= now;
    }
    if (statusFilter === 'suspended') {
      return u.role === 'banned';
    }
    if (statusFilter === 'pending_verification') {
      return !u.emailVerified && u.role !== 'banned';
    }

    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    if (sortBy === 'role') return (a.role || 'standard').localeCompare(b.role || 'standard');
    // Default: Newest First
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });

  // --- PAGINATION LOGIC ---
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  // Reset to page 1 if search, sort, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, statusFilter]);

  // --- SELECTION LOGIC (Visible Page Only) ---
  const toggleSelectAll = () => {
    const visibleIds = currentUsers.map(u => u.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedUsers.includes(id));

    if (allVisibleSelected) {
      // Deselect currently visible
      setSelectedUsers(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Select all visible (keep previously selected hidden ones)
      const newSelections = new Set([...selectedUsers, ...visibleIds]);
      setSelectedUsers(Array.from(newSelections));
    }
  };

  const revokeGold = async (targetUserId) => {
    if (!db) return alert('Database not available.');
    try {
      const orig = users.find(u => u.id === targetUserId) || {};
      const priorExpiry = orig.goldExpiry || null;
      const updatePayload = buildGoldUpdatePayload({ role: 'standard', currentUserRecord: orig });
      await updateDoc(doc(db, 'users', targetUserId), updatePayload);
      sendGoldDowngradeEmailIfActive(db, { ...orig, ...updatePayload, priorExpiry }, user?.email || 'admin').catch(e => console.error('Revoke gold downgrade email failed:', e));
      await logAdminAudit('revoke_gold', { userId: targetUserId }, user.email || 'unknown');
      try { await sendSheetUpdate([{ userId: targetUserId, name: orig.name || '', email: orig.email || '', prevRole: orig.role || 'unknown', newRole: 'standard', at: new Date().toISOString() }]); } catch (e) { console.error('Sheet update failed on revoke:', e); }
      alert('Gold revoked.');
      setShowExpiryModal(false);
    } catch (err) {
      console.error('Revoke gold failed:', err);
      alert('Revoke failed: ' + (err.message || String(err)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const isAllVisibleSelected = currentUsers.length > 0 && currentUsers.every(u => selectedUsers.includes(u.id));

  const getDuplicateVerificationStatus = (user) => {
    if (user?.role === 'banned') {
      return { label: 'Suspended', className: 'bg-red-100 text-red-800 border-red-200' };
    }
    if (user?.emailVerified) {
      return { label: 'Verified', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
    return { label: 'Pending verification', className: 'bg-amber-100 text-amber-800 border-amber-200' };
  };

  const duplicateData = (() => {
    const emailMap = new Map();
    const phoneMap = new Map();
    const duplicateUserIds = new Set();

    users.forEach(user => {
      const emailKey = (user.email || '').trim().toLowerCase();
      const phoneKey = (user.mobile || '').trim().toLowerCase();

      if (emailKey) {
        if (!emailMap.has(emailKey)) emailMap.set(emailKey, []);
        emailMap.get(emailKey).push(user);
      }

      if (phoneKey) {
        if (!phoneMap.has(phoneKey)) phoneMap.set(phoneKey, []);
        phoneMap.get(phoneKey).push(user);
      }
    });

    const emailGroups = [...emailMap.values()].filter(group => group.length > 1).map(group => ({
      key: group[0].email || 'unknown-email',
      users: group,
      summary: group.some(u => u.emailVerified) ? (group.every(u => u.emailVerified) ? 'All verified' : 'Mixed verification') : 'Unverified duplicates'
    }));

    const phoneGroups = [...phoneMap.values()].filter(group => group.length > 1).map(group => ({
      key: group[0].mobile || 'unknown-phone',
      users: group,
      summary: group.some(u => u.emailVerified) ? (group.every(u => u.emailVerified) ? 'All verified' : 'Mixed verification') : 'Unverified duplicates'
    }));

    [...emailGroups, ...phoneGroups].forEach(group => {
      group.users.forEach(u => duplicateUserIds.add(u.id));
    });

    return {
      emailGroups,
      phoneGroups,
      duplicateUserIds,
      duplicateCount: duplicateUserIds.size,
      any: duplicateUserIds.size > 0
    };
  })();

  const isDuplicateUser = (user) => duplicateData.duplicateUserIds.has(user.id);

  const deleteDuplicateUser = async (userToDelete) => {
    if (!db) {
      alert('Database not available.');
      return;
    }

    if (!window.confirm(`Delete ${userToDelete?.name || 'this user'} from the database? This removes the record from Firestore but does not delete their Firebase Auth account.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      await logAdminAudit('delete_duplicate_user', {
        userId: userToDelete.id,
        email: userToDelete.email || '',
        mobile: userToDelete.mobile || '',
        reason: 'duplicate_record_cleanup'
      }, user.email || 'unknown');

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setSelectedUsers(prev => prev.filter(id => id !== userToDelete.id));
      if (profileUser?.id === userToDelete.id) setProfileUser(null);
      alert('Duplicate user record deleted successfully.');
    } catch (err) {
      console.error('Delete duplicate user failed:', err);
      alert('Delete failed: ' + (err.message || String(err)));
    }
  };

  // --- BULK ACTION LOGIC ---
  const handleBulkAction = async (actionType, payload = null, isComplimentary = false) => {
    let confirmMsg = '';
    if (actionType === 'delete') confirmMsg = `WARNING: Are you sure you want to permanently delete database records for ${selectedUsers.length} users? (Note: This does not delete their Firebase Auth accounts).`;
    else if (actionType === 'banned') confirmMsg = `Suspend ${selectedUsers.length} selected users?`;
    else if (actionType === 'standard') confirmMsg = `Downgrade ${selectedUsers.length} users to Standard?`;

    if (actionType !== 'gold' && !window.confirm(confirmMsg)) return;

    setIsBulkLoading(true);
    try {
      if (!db) {
        throw new Error("Database not available.");
      }

      let batch = writeBatch(db);
      let count = 0;

      for (const uid of selectedUsers) {
        const docRef = doc(db, "users", uid);
        if (actionType === 'delete') {
          batch.delete(docRef);
        } else {
          const userRecord = users.find(u => u.id === uid) || { id: uid };
          const updates = buildGoldUpdatePayload({
            role: actionType,
            startDate: new Date(),
            months: Number(payload) || 1,
            amount: isComplimentary ? 0 : getGoldAmountForMonths(payload),
            currentUserRecord: userRecord,
          });
          batch.update(docRef, updates);
        }

        count++;
        if (count >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      // After successful bulk commit, notify Google Sheet for role changes
      try {
        const changes = [];
        for (const uid of selectedUsers) {
          const orig = users.find(u => u.id === uid) || {};
          const prevRole = orig.role || 'unknown';
          const newRole = actionType === 'gold' ? 'gold' : actionType === 'standard' ? 'standard' : actionType;
          if (prevRole !== newRole && ((prevRole === 'gold' && newRole !== 'gold') || (prevRole !== 'gold' && newRole === 'gold'))) {
            changes.push({ userId: uid, name: orig.name || '', email: orig.email || '', prevRole, newRole, at: new Date().toISOString() });
            const priorExpiry = orig.goldExpiry || null;
            const mergedRecord = { ...orig, role: newRole, priorExpiry };
            if (prevRole !== 'gold' && newRole === 'gold') {
              sendGoldUpgradeEmailIfActive(db, mergedRecord, user?.email || 'admin').catch(e => console.error('Bulk upgrade email error:', e));
            } else if (prevRole === 'gold' && newRole !== 'gold') {
              sendGoldDowngradeEmailIfActive(db, mergedRecord, user?.email || 'admin').catch(e => console.error('Bulk downgrade email error:', e));
            }
          }
        }
        if (changes.length > 0) await sendSheetUpdate(changes);
      } catch (err) {
        console.error('Sheet update after bulk action failed:', err);
      }

      setSelectedUsers([]);
      setShowBulkGoldModal(false);
    } catch (err) {
      console.error("Bulk action failed:", err);
      alert("Bulk update failed: " + err.message);
    } finally {
      setIsBulkLoading(false);
    }
  };


  // --- USER EXPORT UTILITY LOGIC ---
  const getUserCreatedDateMs = (u) => {
    if (!u) return null;
    const ca = u.createdAt;
    if (!ca) return null;
    if (typeof ca.seconds === 'number') return ca.seconds * 1000;
    if (ca instanceof Date) return ca.getTime();
    if (typeof ca === 'number') return ca;
    if (typeof ca === 'string') {
      const parsed = Date.parse(ca);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const getFilteredExportUsers = () => {
    const sourceList = exportScope === 'all' ? users : sortedUsers;

    const dateFiltered = sourceList.filter(u => {
      if (exportPreset === 'all') return true;
      const ms = getUserCreatedDateMs(u);
      if (!ms) return false;

      const now = new Date();
      if (exportPreset === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
        return ms >= start && ms <= end;
      }
      if (exportPreset === '7days') {
        const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        return ms >= cutoff;
      }
      if (exportPreset === '30days') {
        const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        return ms >= cutoff;
      }
      if (exportPreset === 'since_last') {
        if (lastExportInfo?.timestamp) {
          const lastMs = new Date(lastExportInfo.timestamp).getTime();
          return ms > lastMs;
        }
        return true;
      }
      if (exportPreset === 'custom') {
        if (exportStartDate) {
          const startMs = new Date(exportStartDate + 'T00:00:00').getTime();
          if (ms < startMs) return false;
        }
        if (exportEndDate) {
          const endMs = new Date(exportEndDate + 'T23:59:59.999').getTime();
          if (ms > endMs) return false;
        }
        return true;
      }
      return true;
    });

    if (deduplicateEmails) {
      const seen = new Set();
      const result = [];
      for (const u of dateFiltered) {
        const em = u.email ? u.email.trim().toLowerCase() : '';
        if (em) {
          if (!seen.has(em)) {
            seen.add(em);
            result.push(u);
          }
        } else {
          result.push(u);
        }
      }
      return result;
    }

    return dateFiltered;
  };

  const executeUserExport = async () => {
    const exportUsersList = getFilteredExportUsers();
    if (exportUsersList.length === 0) {
      alert("No users match the selected date range and export criteria.");
      return;
    }

    const headers = ['User ID', 'Name', 'Email', 'Mobile', 'Role', 'Email Verified', 'Gold Expiry Date', 'Join Date'];
    const rows = exportUsersList.map(u => {
      const joinDate = formatJoinDate(u.createdAt || u.updatedAt);
      const expiryDate = (() => { const ms = getExpiryMs(u.goldExpiry); return ms ? new Date(ms).toLocaleDateString() : 'N/A'; })();
      return [
        u.id, `"${u.name || ''}"`, `"${u.email || ''}"`, `"${u.mobile || ''}"`,
        u.role || 'standard', u.emailVerified ? 'Yes' : 'No', expiryDate, joinDate
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `pyq_users_export_${exportPreset}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Record last export date and details
    const nowISO = new Date().toISOString();
    const meta = {
      timestamp: nowISO,
      count: exportUsersList.length,
      preset: exportPreset,
      scope: exportScope,
      deduplicated: deduplicateEmails,
      adminEmail: user?.email || 'admin'
    };

    setLastExportInfo(meta);
    localStorage.setItem('pyq_last_user_export', JSON.stringify(meta));

    if (db) {
      try {
        await saveExportMeta(meta, user?.email || 'admin');
        await logAdminAudit('export_users', meta, user?.email || 'admin');
      } catch (err) {
        console.error("Failed to save export metadata to Firestore:", err);
      }
    }

    setShowExportModal(false);
  };

  const downloadRevenueCsv = () => {
    if (!filteredRevenueEntries.length) {
      alert('No payment records match the current search.');
      return;
    }

    const headers = ['User Name', 'Email', 'Amount (₹)', 'Plan Months', 'Paid On', 'Type', 'Audit Note'];
    const rows = filteredRevenueEntries.map(entry => {
      const targetUser = users.find(u => u.id === entry.userId);
      const isFree = Number(entry.amount || 0) === 0;
      return [
        `"${targetUser?.name || 'Unknown User'}"`,
        `"${targetUser?.email || ''}"`,
        isFree ? 0 : Number(entry.amount || 0),
        Number(entry.months || 1),
        `"${new Date(entry.chargedAt).toLocaleString()}"`,
        isFree ? '"Complimentary (Free)"' : '"Paid Upgrade"',
        `"${entry.note || ''}"`,
      ];
    });

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pyq_revenue_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printRevenueReport = () => {
    window.print();
  };

  const saveRevenueEntry = async () => {
    if (!db) {
      alert('Database not available.');
      return;
    }

    const userId = revenueForm.userId;
    const amount = Number(revenueForm.amount);
    const months = Number(revenueForm.months) || 1;

    if (!userId) {
      alert('Select a user to record the payment.');
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      alert('Enter a valid payment amount (0 or greater).');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      alert('Selected user could not be found.');
      return;
    }

    const currentHistory = normalizePaymentHistory(
      targetUser.goldRevenueHistory,
      userId,
      getLastGoldCharge(targetUser),
      targetUser.goldPlanMonths || 1,
      getGoldStartAt(targetUser)
    );

    const nextHistory = [...currentHistory];
    const chargedAt = new Date(revenueForm.chargedAt || new Date()).toISOString();
    const newEntry = {
      id: editingPaymentId || `payment-${userId}-${Date.now()}`,
      userId,
      amount,
      months,
      chargedAt,
      transactionId: (revenueForm.transactionId || '').trim(),
      note: (revenueForm.note || '').trim(),
    };

    if (editingPaymentId) {
      const index = nextHistory.findIndex(item => item.id === editingPaymentId);
      if (index >= 0) nextHistory[index] = newEntry;
    } else {
      nextHistory.push(newEntry);
    }

    const latestEntry = nextHistory.slice().sort((a, b) => new Date(b.chargedAt) - new Date(a.chargedAt))[0] || null;

    try {
      await updateDoc(doc(db, 'users', userId), {
        goldRevenueHistory: nextHistory,
        lastGoldCharge: latestEntry ? Number(latestEntry.amount) : deleteField(),
        goldMembershipAmount: deleteField(),
        goldStartDate: deleteField(),
        goldStartdate: deleteField(),
        goldstartat: deleteField(),
        goldStartAt: getGoldStartAt(targetUser) || (latestEntry ? latestEntry.chargedAt : deleteField()),
        goldPlanMonths: latestEntry ? Number(latestEntry.months) : deleteField(),
        goldLastUpdatedAt: latestEntry ? latestEntry.chargedAt : new Date().toISOString(),
        role: latestEntry ? (targetUser.role === 'gold' ? 'gold' : targetUser.role) : 'standard',
      });

      setRevenueForm({
        userId: users[0]?.id || '',
        amount: '',
        months: '3',
        chargedAt: new Date().toISOString().slice(0, 16),
        transactionId: '',
        note: '',
      });
      setRevenueUserSearch('');
      setEditingPaymentId(null);
      alert(editingPaymentId ? 'Payment updated.' : 'Payment added successfully.');
    } catch (error) {
      console.error('Failed to save payment entry:', error);
      alert('Failed to save payment: ' + (error.message || String(error)));
    }
  };

  const deleteRevenueEntry = async (entry) => {
    if (!db) {
      alert('Database not available.');
      return;
    }

    const targetUser = users.find(u => u.id === entry.userId);
    if (!targetUser) return;

    const currentHistory = normalizePaymentHistory(
      targetUser.goldRevenueHistory,
      entry.userId,
      getLastGoldCharge(targetUser),
      targetUser.goldPlanMonths || 1,
      getGoldStartAt(targetUser)
    );

    const nextHistory = currentHistory.filter(item => item.id !== entry.id);
    const latestEntry = nextHistory.slice().sort((a, b) => new Date(b.chargedAt) - new Date(a.chargedAt))[0] || null;

    try {
      await updateDoc(doc(db, 'users', entry.userId), {
        goldRevenueHistory: nextHistory,
        lastGoldCharge: latestEntry ? Number(latestEntry.amount) : deleteField(),
        goldMembershipAmount: deleteField(),
        goldStartDate: deleteField(),
        goldStartdate: deleteField(),
        goldstartat: deleteField(),
        goldStartAt: getGoldStartAt(targetUser) || deleteField(),
        goldPlanMonths: latestEntry ? Number(latestEntry.months) : deleteField(),
        goldLastUpdatedAt: latestEntry ? latestEntry.chargedAt : new Date().toISOString(),
        role: nextHistory.length > 0 ? targetUser.role || 'standard' : 'standard',
      });
      alert('Payment entry removed.');
    } catch (error) {
      console.error('Failed to delete payment entry:', error);
      alert('Failed to delete payment: ' + (error.message || String(error)));
    }
  };

  const downgradeAllExpiredGoldUsers = async () => {
    if (!db) return alert('Database connection not available.');
    if (!expiredUsers.length) return alert('No expired Gold users found.');
    if (!window.confirm(`Downgrade ${expiredUsers.length} expired Gold users to Standard?`)) return;
    try {
      let batch = writeBatch(db), count = 0;
      for (const u of expiredUsers) {
        const updates = buildGoldUpdatePayload({ role: 'standard', currentUserRecord: u });
        batch.update(doc(db, 'users', u.id), updates);
        count++;
        if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
      await logAdminAudit('bulk_downgrade_expired_gold', { count: expiredUsers.length }, user?.email || 'unknown');
      alert(`✅ Downgraded ${expiredUsers.length} expired Gold user(s) to Standard!`);
      setShowExpiryModal(false);
    } catch (err) {
      console.error('Bulk downgrade failed:', err);
      alert('Bulk downgrade failed: ' + (err.message || String(err)));
    }
  };

  // --- BACKUP & RESTORE ---
  const currentFirestoreCollections = ['users', 'questions', 'answers_gold', 'settings'];

  const handleBackup = async () => {
    if (!db) return alert("Database connection not available.");
    if (!confirm("Download a backup of the current app collections?")) return;
    setIsBackingUp(true);
    try {
      const backupData = {};
      for (const colName of currentFirestoreCollections) {
        const querySnapshot = await getDocs(collection(db, colName));
        backupData[colName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.download = `pyq_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (err) { alert("Backup Failed: " + err.message); } finally { setIsBackingUp(false); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!confirm("⚠️ DANGER: Restoring will OVERWRITE existing data. Proceed?")) { e.target.value = null; return; }
    if (!db) { alert('Database not available. Ensure Firebase initialized.'); e.target.value = null; return; }
    setIsRestoring(true);
    const reader = new FileReader();
    const collectionsToRestore = currentFirestoreCollections;

    // Recursively convert objects that look like { seconds, nanoseconds? } into Firestore Timestamps
    const convertTimestamps = (val) => {
      if (val && typeof val === 'object') {
        // detect timestamp-like
        if (Object.prototype.hasOwnProperty.call(val, 'seconds') && (Object.prototype.hasOwnProperty.call(val, 'nanoseconds') || typeof val.seconds === 'number')) {
          try {
            const seconds = Number(val.seconds || 0);
            const nanos = Number(val.nanoseconds || 0);
            return new Timestamp(seconds, nanos);
          } catch (e) {
            return val;
          }
        }
        if (Array.isArray(val)) return val.map(convertTimestamps);
        const out = {};
        for (const k of Object.keys(val)) {
          out[k] = convertTimestamps(val[k]);
        }
        return out;
      }
      return val;
    };

    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        // Take a safety snapshot of current users before restore
        try {
          localStorage.setItem('pyq_pre_restore_backup', JSON.stringify(users));
          setIsRollbackAvailable(true);
        } catch (e) {
          console.warn('Could not store local pre-restore snapshot:', e);
        }

        const counts = {
          users: Array.isArray(data.users) ? data.users.length : 0,
          questions: Array.isArray(data.questions) ? data.questions.length : 0,
          answers_gold: Array.isArray(data.answers_gold) ? data.answers_gold.length : 0,
          settings: Array.isArray(data.settings) ? data.settings.length : 0,
        };

        setRestorePreview({ data, counts, fileName: file.name });
      } catch (err) {
        alert("Invalid Backup File: " + (err && err.message ? err.message : String(err)));
      } finally {
        setIsRestoring(false);
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  const executeRestore = async (data) => {
    if (!db || !data) return;
    setIsRestoring(true);
    try {
      const collectionsToRestore = currentFirestoreCollections;
      const convertTimestamps = (val) => {
        if (val && typeof val === 'object') {
          if (Object.prototype.hasOwnProperty.call(val, 'seconds') && (Object.prototype.hasOwnProperty.call(val, 'nanoseconds') || typeof val.seconds === 'number')) {
            try {
              return new Timestamp(Number(val.seconds || 0), Number(val.nanoseconds || 0));
            } catch (e) {
              return val;
            }
          }
          if (Array.isArray(val)) return val.map(convertTimestamps);
          const out = {};
          for (const k of Object.keys(val)) out[k] = convertTimestamps(val[k]);
          return out;
        }
        return val;
      };

      let batch = writeBatch(db), count = 0, total = 0;
      for (const colName of collectionsToRestore) {
        if (data[colName] && Array.isArray(data[colName])) {
          for (const rawItem of data[colName]) {
            if (rawItem && rawItem.id) {
              const item = { ...rawItem };
              delete item.id;
              const cleaned = convertTimestamps(item);
              batch.set(doc(db, colName, rawItem.id), cleaned);
              count++; total++;
              if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
            }
          }
        }
      }
      if (count > 0) await batch.commit();
      await logAdminAudit('restore_database', { totalProcessed: total }, user?.email || 'unknown');
      alert(`✅ Restore Successful! Processed ${total} documents.`);
      setRestorePreview(null);
    } catch (err) {
      alert("Restore Failed: " + (err && err.message ? err.message : String(err)));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRollbackBackup = async () => {
    const raw = localStorage.getItem('pyq_pre_restore_backup');
    if (!raw) return alert('No pre-restore backup found in browser storage.');
    if (!window.confirm('Rollback user records to the safety snapshot taken before your last restore?')) return;
    try {
      const usersToRollback = JSON.parse(raw);
      let batch = writeBatch(db), count = 0;
      for (const u of usersToRollback) {
        batch.set(doc(db, 'users', u.id), u);
        count++;
        if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
      await logAdminAudit('rollback_pre_restore_backup', { count: usersToRollback.length }, user?.email || 'unknown');
      alert(`✅ Rollback Complete! Restored ${usersToRollback.length} user records.`);
    } catch (e) {
      alert('Rollback failed: ' + e.message);
    }
  };

  const [isSanitizingSchema, setIsSanitizingSchema] = useState(false);

  const sanitizeDatabaseGoldSchema = async () => {
    if (!db) return alert("Database not available.");
    if (!window.confirm("Clean up and optimize Gold Membership database schema across all users? This will standardize transaction objects, consolidate goldStartAt and lastGoldCharge fields, and remove legacy duplicate fields.")) return;

    setIsSanitizingSchema(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      let cleanedCount = 0;

      for (const u of users) {
        const startAt = getGoldStartAt(u);
        const lastCharge = getLastGoldCharge(u);
        const normalizedHistory = normalizePaymentHistory(
          u.goldRevenueHistory,
          u.id,
          lastCharge,
          u.goldPlanMonths || 1,
          startAt
        );

        const docRef = doc(db, 'users', u.id);
        const updateObj = {
          goldRevenueHistory: normalizedHistory,
          goldStartDate: deleteField(),
          goldStartdate: deleteField(),
          goldstartat: deleteField(),
          goldMembershipAmount: deleteField(),
        };

        if (u.role === 'gold') {
          updateObj.goldStartAt = startAt || new Date().toISOString();
          if (lastCharge > 0) {
            updateObj.lastGoldCharge = lastCharge;
          } else {
            updateObj.lastGoldCharge = deleteField();
          }
        } else {
          updateObj.goldStartAt = deleteField();
          updateObj.goldExpiry = deleteField();
          updateObj.goldPlanMonths = deleteField();
          updateObj.lastGoldCharge = deleteField();
        }

        batch.update(docRef, updateObj);
        count++;
        cleanedCount++;

        if (count >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) await batch.commit();
      await logAdminAudit('sanitize_gold_schema', { totalProcessed: cleanedCount }, user.email || 'unknown');
      alert(`Schema optimization complete! Sanitized ${cleanedCount} user document(s).`);
    } catch (err) {
      console.error("Schema cleanup failed:", err);
      alert("Schema cleanup failed: " + (err.message || String(err)));
    } finally {
      setIsSanitizingSchema(false);
    }
  };


  return (
    <div className="flex flex-col h-screen relative bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl"><Shield size={24} /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 text-lg leading-tight">Admin Dashboard</h2>
              <span className="bg-indigo-100 text-indigo-700 text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border border-indigo-200">v3.0.5</span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shadow-sm">
            <button onClick={handleBackup} disabled={isBackingUp || !db} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm hover:text-indigo-600 rounded-lg transition disabled:opacity-50" title="Download full JSON backup">
              {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span className="hidden lg:inline">Backup</span>
            </button>
            <div className="w-[1px] h-5 bg-slate-300 mx-1"></div>
            <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm hover:text-amber-600 rounded-lg transition cursor-pointer">
              {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span className="hidden lg:inline">Restore</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" disabled={isRestoring} />
            </label>
            {isRollbackAvailable && (
              <>
                <div className="w-[1px] h-5 bg-slate-300 mx-1"></div>
                <button onClick={handleRollbackBackup} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition" title="Rollback user records to safety snapshot before last restore">
                  <RotateCcw size={14} className="text-amber-700" />
                  <span className="hidden xl:inline">Rollback</span>
                </button>
              </>
            )}
            <div className="w-[1px] h-5 bg-slate-300 mx-1"></div>
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm hover:text-indigo-600 rounded-lg transition" title="Export users with date & duplicate filters">
              <FileText size={16} />
              <span className="hidden lg:inline">Export CSV</span>
            </button>
            <div className="w-[1px] h-5 bg-slate-300 mx-1"></div>
            <button onClick={sanitizeDatabaseGoldSchema} disabled={isSanitizingSchema || !db} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm hover:text-amber-600 rounded-lg transition disabled:opacity-50" title="Clean up and optimize Gold Membership schema across all user documents">
              {isSanitizingSchema ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} className="text-amber-500" />}
              <span className="hidden xl:inline">Clean Schema</span>
            </button>
          </div>
          <button onClick={onLogout} className="text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-sm"><LogOut size={16} /> <span className="hidden md:inline">Logout</span></button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
        <div className="max-w-7xl mx-auto">

          {/* Primary Toolbar */}
          <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 mb-4 flex flex-col xl:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:max-w-2xl">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative w-full sm:w-56 shrink-0">
                <ArrowUpDown className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition appearance-none cursor-pointer text-slate-700"
                >
                  <option value="newest">Newest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="role">User Role</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 md:gap-3 text-sm font-semibold flex-wrap justify-center xl:justify-end w-full xl:w-auto">
              <div className="bg-slate-100 px-3 md:px-4 py-2 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-700"><User size={16} className="text-slate-500" /> Total <span className="font-bold text-slate-900">{users.length}</span></div>
              <div className="bg-amber-50 px-3 md:px-4 py-2 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2"><Crown size={16} className="text-amber-500" /> Gold <span className="font-bold">{users.filter(u => u.role === 'gold').length}</span></div>
              <div className="bg-red-50 px-3 md:px-4 py-2 border border-red-200 text-red-800 rounded-xl flex items-center gap-2"><Ban size={16} className="text-red-500" /> Banned <span className="font-bold">{users.filter(u => u.role === 'banned').length}</span></div>
            </div>
          </div>

          {/* Quick Status Filter Bar */}
          {(() => {
            const filterOptions = [
              { id: 'all', label: 'All Users', count: users.length },
              { id: 'gold_active', label: 'Active Gold', count: users.filter(u => u.role === 'gold' && getExpiryMs(u.goldExpiry) > Date.now()).length },
              { id: 'expiring_soon', label: 'Expiring Soon (7d)', count: expiringUsers.length },
              { id: 'gold_expired', label: 'Expired Gold', count: expiredUsers.length },
              { id: 'suspended', label: 'Suspended', count: users.filter(u => u.role === 'banned').length },
              { id: 'pending_verification', label: 'Pending Verification', count: users.filter(u => !u.emailVerified && u.role !== 'banned').length },
            ];

            return (
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-4">
                {/* Mobile / Small Screens: Dropdown Select (< md) */}
                <div className="md:hidden flex items-center gap-2">
                  <div className="relative flex-1">
                    <Filter className="absolute left-3.5 top-3 text-indigo-600 pointer-events-none" size={16} />
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 appearance-none cursor-pointer"
                    >
                      {filterOptions.map(chip => (
                        <option key={chip.id} value={chip.id}>
                          Filter: {chip.label} ({chip.count})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <ArrowUpDown size={14} />
                    </div>
                  </div>

                  {statusFilter !== 'all' && (
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-2.5 rounded-xl border border-indigo-200 transition shrink-0 flex items-center gap-1"
                      title="Reset filter to show all users"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>

                {/* Desktop / Large Screens: Button Chips (>= md) */}
                <div className="hidden md:flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                    <Filter size={14} className="text-indigo-600" /> Filter:
                  </span>
                  {filterOptions.map(chip => {
                    const isActive = statusFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => setStatusFilter(chip.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border ${isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                      >
                        <span>{chip.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                          }`}>
                          {chip.count}
                        </span>
                      </button>
                    );
                  })}

                  {statusFilter !== 'all' && (
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="ml-auto text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition flex items-center gap-1"
                      title="Reset filter to show all users"
                    >
                      <XCircle size={14} /> Clear Filter
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Secondary Toolbar & Navigation Tabs */}
          <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveView('users')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'users'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <Users size={16} /> All Users <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeView === 'users' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>{users.length}</span>
              </button>

              <button
                onClick={() => setActiveView('gold_members')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'gold_members'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
              >
                <Crown size={16} className={activeView === 'gold_members' ? 'text-white' : 'text-amber-500'} /> GOLD Members <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeView === 'gold_members' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'}`}>{users.filter(u => u.role === 'gold').length}</span>
              </button>

              <button
                onClick={() => setActiveView('revenue')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'revenue'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                  }`}
              >
                <Crown size={16} className={activeView === 'revenue' ? 'text-white' : 'text-emerald-600'} /> Revenue <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeView === 'revenue' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>₹{totalGoldRevenue.toLocaleString('en-IN')}</span>
              </button>

              <button
                onClick={() => setActiveView('email_settings')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'email_settings'
                    ? 'bg-indigo-900 text-white shadow-md shadow-indigo-300'
                    : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                  }`}
              >
                <Mail size={16} className={activeView === 'email_settings' ? 'text-white' : 'text-indigo-600'} /> Email & SMTP
              </button>


              <button
                onClick={() => setActiveView('pending_payments')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'pending_payments'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                    : pendingRequestsCount > 0
                      ? 'bg-rose-50 text-rose-900 border border-rose-300 font-extrabold animate-pulse'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <Clock size={16} className={activeView === 'pending_payments' ? 'text-white' : pendingRequestsCount > 0 ? 'text-rose-600' : 'text-slate-500'} />
                <span>UPI Requests</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeView === 'pending_payments'
                    ? 'bg-white/20 text-white'
                    : pendingRequestsCount > 0
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}>
                  {pendingRequestsCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowReminderScannerModal(true)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border rounded-xl transition ${pendingReminderUsers.length > 0
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200 hover:bg-amber-600'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                title="Scan and dispatch 3-7 day expiration reminder emails"
              >
                <Clock size={15} className={pendingReminderUsers.length > 0 ? 'text-white' : 'text-amber-600'} />
                <span>3–7d Reminders</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${pendingReminderUsers.length > 0 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                  {pendingReminderUsers.length}
                </span>
              </button>

              <button onClick={() => setShowExpiryModal(true)} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition">
                <Calendar size={15} className="text-amber-700" /> Expiry Alerts <span className="font-bold">{expiringUsers.length + expiredUsers.length}</span>
              </button>

              <button onClick={() => setShowDuplicateModal(true)} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border rounded-xl transition ${duplicateData.any ? 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                <AlertTriangle size={15} className={duplicateData.any ? 'text-orange-700' : 'text-slate-500'} /> Duplicates <span className="font-bold">{duplicateData.duplicateCount}</span>
              </button>
            </div>
          </div>

          {pendingRequestsCount > 0 && activeView !== 'pending_payments' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 text-white rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Clock size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">Action Required: {pendingRequestsCount} Pending UPI Payment Request{pendingRequestsCount > 1 ? 's' : ''}</h4>
                  <p className="text-xs text-rose-100 font-medium">Students have submitted transaction reference (UTR) numbers for GOLD upgrades.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveView('pending_payments')}
                className="px-4 py-2 bg-white text-rose-700 text-xs font-black rounded-xl hover:bg-rose-50 transition shadow-md active:scale-95 shrink-0"
              >
                Review Requests ({pendingRequestsCount})
              </button>
            </div>
          )}

          {activeView === 'pending_payments' ? (
            <PendingPaymentRequests />
          ) : activeView === 'email_settings' ? (
            <EmailSettingsScreen db={db} currentUser={user} />
          ) : activeView === 'gold_members' ? (
            <GoldMembersScreen
              users={users}
              onUpdateUser={async (targetUserId, updateData) => {
                if (!db) return alert('Database connection not available.');
                try {
                  await updateDoc(doc(db, 'users', targetUserId), updateData);
                  await logAdminAudit('update_gold_member', { userId: targetUserId }, user.email || 'unknown');
                  setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, ...updateData } : u));
                } catch (err) {
                  console.error('Failed to update Gold member:', err);
                  alert('Update failed: ' + (err.message || String(err)));
                }
              }}
              onOpenRoleModal={(member) => setEditingUser(member)}
            />
          ) : activeView === 'revenue' ? (
            <div className="space-y-5 print:space-y-2">
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-3xl shadow-lg shadow-emerald-500/20 p-4 sm:p-5 text-white">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] font-bold text-emerald-100">Revenue dashboard</p>
                    <h3 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">Gold payments & reports</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={printRevenueReport} className="px-3 py-2 text-xs font-bold bg-white/12 text-white border border-white/20 rounded-xl hover:bg-white/18 backdrop-blur-sm">Print PDF</button>
                    <button onClick={downloadRevenueCsv} className="px-3 py-2 text-xs font-bold bg-white text-emerald-700 rounded-xl hover:bg-emerald-50">Export CSV</button>
                    <button onClick={() => setActiveView('users')} className="px-3 py-2 text-xs font-bold bg-slate-900/10 text-white border border-white/20 rounded-xl hover:bg-slate-900/20">Back to users</button>
                  </div>
                </div>
              </div>

              {/* Revenue Stats KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Total Revenue</div>
                  <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-700">₹{totalGoldRevenue.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">{paidEntries.length} paid charges</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Total Payments</div>
                  <div className="mt-2 text-xl sm:text-2xl font-black text-slate-800">{paymentHistoryEntries.length}</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">{paidEntries.length} paid • {freeEntries.length} free</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Active Gold</div>
                  <div className="mt-2 text-xl sm:text-2xl font-black text-amber-700">{users.filter(u => u.role === 'gold').length}</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">subscribers active</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Complimentary</div>
                  <div className="mt-2 text-xl sm:text-2xl font-black text-teal-700">{freeEntries.length}</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">free (₹0) grants</div>
                </div>
              </div>

              {/* Plan Revenue Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown size={15} className="text-amber-500" /> Revenue Breakdown by Subscription Plan
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{planBreakdown.length} Active Tiers</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {planBreakdown.map(plan => {
                    const label = plan.months === 12 ? '12 Mo (1 Yr)' : plan.months === 24 ? '24 Mo (2 Yrs)' : `${plan.months} Months`;
                    return (
                      <div key={plan.months} className="bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200/70 rounded-xl p-2.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900">{label}</span>
                          <span className="text-[9px] font-bold text-amber-800/90 bg-amber-100/80 px-1.5 py-0.5 rounded-md whitespace-nowrap">{plan.count} upgrade{plan.count > 1 ? 's' : ''}</span>
                        </div>
                        <div className="mt-1.5 text-base sm:text-lg font-black text-slate-800">₹{plan.revenue.toLocaleString('en-IN')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
                {/* Add / Edit Payment Form */}
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4 sm:p-5 h-fit">
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{editingPaymentId ? 'Edit payment' : 'Add payment'}</h4>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-emerald-200">Live</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">User</label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={revenueUserSearch}
                          onChange={(e) => {
                            setRevenueUserSearch(e.target.value);
                            if (!e.target.value.trim()) {
                              setRevenueForm(prev => ({ ...prev, userId: prev.userId || '' }));
                            }
                          }}
                          placeholder="Search user by name or email"
                          className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <select
                          value={revenueForm.userId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedUser = users.find(u => u.id === selectedId);
                            setRevenueForm(prev => ({ ...prev, userId: selectedId }));
                            setRevenueUserSearch(selectedUser ? (selectedUser.name || selectedUser.email || '') : '');
                          }}
                          className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Select a user</option>
                          {filteredRevenueUsers.map(userItem => (
                            <option key={userItem.id} value={userItem.id}>{userItem.name || userItem.email || userItem.id}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount (₹)</label>
                        <button type="button" onClick={() => setRevenueForm(prev => ({ ...prev, amount: '0' }))} className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5 hover:bg-emerald-200">🎁 Free (₹0)</button>
                      </div>
                      <input type="number" min="0" value={revenueForm.amount} onChange={(e) => setRevenueForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500" placeholder="2999" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Plan duration</label>
                      <select value={revenueForm.months} onChange={(e) => setRevenueForm(prev => ({ ...prev, months: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months (1 Year)</option>
                        <option value="24">24 Months (2 Years)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment date</label>
                      <input type="datetime-local" value={revenueForm.chargedAt} onChange={(e) => setRevenueForm(prev => ({ ...prev, chargedAt: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Transaction ID / Ref (Optional)</label>
                      <input type="text" value={revenueForm.transactionId || ''} onChange={(e) => setRevenueForm(prev => ({ ...prev, transactionId: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. UPI/123456789 or TXN987" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Audit Note (Optional)</label>
                      <input type="text" value={revenueForm.note || ''} onChange={(e) => setRevenueForm(prev => ({ ...prev, note: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Telegram promo or admin reference" />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button onClick={saveRevenueEntry} className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200">{editingPaymentId ? 'Update payment' : 'Save payment'}</button>
                      {editingPaymentId && (
                        <button onClick={() => { setEditingPaymentId(null); setRevenueUserSearch(''); setRevenueForm({ userId: users[0]?.id || '', amount: '', months: '3', chargedAt: new Date().toISOString().slice(0, 16), transactionId: '', note: '' }); }} className="px-3 py-3 text-sm font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200">Cancel</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Records Table & Mobile Cards */}
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  {/* Revenue Records Filter & Controls Bar */}
                  <div className="p-4 border-b border-slate-200 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Payment Records ({filteredRevenueEntries.length})</h4>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative w-full sm:w-60">
                          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                          <input value={revenueSearch} onChange={(e) => setRevenueSearch(e.target.value)} placeholder="Search Txn ID, name, note..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div className="relative w-full sm:w-44 shrink-0">
                          <ArrowUpDown className="absolute left-3 top-3 text-slate-400" size={14} />
                          <select value={revenueSortBy} onChange={(e) => setRevenueSortBy(e.target.value)} className="w-full pl-8 pr-6 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 outline-none cursor-pointer appearance-none">
                            <option value="date_desc">Newest Date First</option>
                            <option value="date_asc">Oldest Date First</option>
                            <option value="amount_desc">Highest Amount</option>
                            <option value="amount_asc">Lowest Amount</option>
                            <option value="name_asc">User Name (A-Z)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Period Filter Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
                      {[
                        { id: 'all', label: 'All Time' },
                        { id: 'today', label: 'Today' },
                        { id: '7days', label: 'Last 7 Days' },
                        { id: '30days', label: 'Last 30 Days' },
                        { id: 'this_month', label: 'This Month' },
                        { id: 'custom', label: 'Custom Range' },
                      ].map(chip => (
                        <button
                          key={chip.id}
                          onClick={() => setRevenuePeriodFilter(chip.id)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${revenuePeriodFilter === chip.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          {chip.label}
                        </button>
                      ))}

                      {revenuePeriodFilter === 'custom' && (
                        <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                          <input type="date" value={revenueCustomStartDate} onChange={(e) => setRevenueCustomStartDate(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50" />
                          <span className="text-xs text-slate-400">to</span>
                          <input type="date" value={revenueCustomEndDate} onChange={(e) => setRevenueCustomEndDate(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Table View (>= lg) */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-[0.18em] font-bold">
                        <tr>
                          <th className="px-4 py-3">User & Contact</th>
                          <th className="px-4 py-3">Amount & Txn ID</th>
                          <th className="px-4 py-3">Plan</th>
                          <th className="px-4 py-3">Payment Date</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredRevenueEntries.length === 0 ? (
                          <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-500 font-medium">No revenue records match your filters.</td></tr>
                        ) : (
                          filteredRevenueEntries.map((entry) => {
                            const user = users.find(u => u.id === entry.userId);
                            const chargedDateStr = new Date(entry.chargedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            return (
                              <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-bold text-slate-800">{user?.name || 'Unknown User'}</div>
                                  <div className="text-xs text-slate-500">{user?.email || 'No email'}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-black text-emerald-700">
                                    {Number(entry.amount) === 0 ? (
                                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full border border-emerald-200 font-extrabold">🎁 ₹0 (Free)</span>
                                    ) : (
                                      `₹${Number(entry.amount).toLocaleString('en-IN')}`
                                    )}
                                  </div>
                                  {entry.transactionId && (
                                    <div className="inline-block font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mt-1">
                                      Txn ID: {entry.transactionId}
                                    </div>
                                  )}
                                  {entry.note && <div className="text-[11px] text-amber-800 font-medium italic mt-0.5">Note: {entry.note}</div>}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  {Number(entry.months) || 1} {Number(entry.months) === 1 ? 'Month' : 'Months'}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                                  {chargedDateStr}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => { const selectedUser = users.find(u => u.id === entry.userId); setEditingPaymentId(entry.id); setRevenueUserSearch(selectedUser ? (selectedUser.name || selectedUser.email || '') : ''); setRevenueForm({ userId: entry.userId, amount: String(entry.amount), months: String(entry.months || 1), chargedAt: formatDateTimeLocal(entry.chargedAt), transactionId: entry.transactionId || '', note: entry.note || '' }); }} className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition">Edit</button>
                                    <button onClick={() => deleteRevenueEntry(entry)} className="text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile & Tablet Card View (< lg) */}
                  <div className="lg:hidden p-3 sm:p-4 space-y-3">
                    {filteredRevenueEntries.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 text-center py-10">No revenue records match your filters.</div>
                    ) : (
                      filteredRevenueEntries.map((entry) => {
                        const user = users.find(u => u.id === entry.userId);
                        const chargedDateStr = new Date(entry.chargedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-sm space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-black text-slate-800 truncate">{user?.name || 'Unknown User'}</div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email || 'No email'}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-base font-black text-emerald-700">
                                  {Number(entry.amount) === 0 ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full border border-emerald-200 font-extrabold">🎁 Free</span>
                                  ) : (
                                    `₹${Number(entry.amount).toLocaleString('en-IN')}`
                                  )}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase">{Number(entry.months) || 1} Month(s)</div>
                              </div>
                            </div>

                            {entry.transactionId && (
                              <div className="inline-block font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                Txn ID: {entry.transactionId}
                              </div>
                            )}

                            {entry.note && (
                              <div className="text-[11px] text-amber-900 font-medium italic bg-amber-50 p-1.5 rounded-lg border border-amber-200/60">
                                Note: {entry.note}
                              </div>
                            )}

                            <div className="text-xs text-slate-500 font-medium pt-1">
                              Paid on {chargedDateStr}
                            </div>

                            <div className="pt-2 flex gap-2 border-t border-slate-200/60">
                              <button onClick={() => { const selectedUser = users.find(u => u.id === entry.userId); setEditingPaymentId(entry.id); setRevenueUserSearch(selectedUser ? (selectedUser.name || selectedUser.email || '') : ''); setRevenueForm({ userId: entry.userId, amount: String(entry.amount), months: String(entry.months || 1), chargedAt: formatDateTimeLocal(entry.chargedAt), transactionId: entry.transactionId || '', note: entry.note || '' }); }} className="flex-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg border border-amber-200">Edit</button>
                              <button onClick={() => deleteRevenueEntry(entry)} className="flex-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg border border-red-200">Delete</button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Monthly revenue summary</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Updated</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {monthlyRevenueSummary.length === 0 ? (
                    <div className="text-sm text-slate-500">No revenue data recorded yet.</div>
                  ) : (
                    monthlyRevenueSummary.map(item => (
                      <div key={item.month} className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-3">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{item.month}</div>
                        <div className="mt-2 text-xl font-black text-slate-800">₹{Number(item.amount).toLocaleString('en-IN')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-600 text-red-800 p-4 rounded-xl shadow-sm mb-6 flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0" size={20} />
                  <div><h4 className="font-bold text-sm">Error Loading Data</h4><p className="text-sm mt-1 font-medium">{error}</p></div>
                </div>
              )}

              {/* Users List */}
              {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                        <tr>
                          <th className="px-5 py-4 w-14 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              checked={isAllVisibleSelected}
                              onChange={toggleSelectAll}
                              title="Select all visible on this page"
                            />
                          </th>
                          <th className="px-5 py-4 tracking-wider">User Details</th>
                          <th className="px-6 py-4 tracking-wider">Contact Info</th>
                          <th className="px-6 py-4 tracking-wider">Status</th>
                          <th className="px-6 py-4 tracking-wider">Membership</th>
                          <th className="px-6 py-4 tracking-wider">Joined</th>
                          <th className="px-6 py-4 text-right tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {currentUsers.map(user => {
                          const isSelected = selectedUsers.includes(user.id);
                          return (
                            <tr key={user.id} className={`transition duration-150 ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'} ${isDuplicateUser(user) ? 'border-l-4 border-l-amber-400' : ''}`}>
                              <td className="px-5 py-4 text-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  checked={isSelected}
                                  onChange={() => toggleSelectOne(user.id)}
                                />
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                  {user.name || "Unknown Name"}
                                  {user.role === 'admin' && <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider">ADMIN</span>}
                                </div>
                                <div className="text-xs text-slate-400 font-mono mt-1 font-medium">ID: {user.id.substring(0, 10)}...</div>
                              </td>
                              <td className="px-6 py-4 font-medium">
                                <div className="flex items-center gap-2 text-slate-600 mb-1.5"><Mail size={16} className="text-slate-400" /> {user.email}</div>
                                {user.mobile && <div className="flex items-center gap-2 text-slate-600"><Smartphone size={16} className="text-slate-400" /> {user.mobile}</div>}
                              </td>
                              <td className="px-6 py-4">
                                {user.emailVerified
                                  ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200"><CheckCircle size={14} /> Verified</span>
                                  : <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300"><AlertTriangle size={14} /> Pending</span>
                                }
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm
                                    ${user.role === 'gold' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                    user.role === 'banned' ? 'bg-red-100 text-red-900 border-red-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                  {user.role === 'gold' ? <Crown size={14} className="text-amber-600" /> : user.role === 'banned' ? <Ban size={14} className="text-red-600" /> : <User size={14} className="text-slate-500" />}
                                  {user.role === 'gold' ? 'GOLD PRO' : user.role === 'banned' ? 'SUSPENDED' : 'STANDARD'}
                                </span>
                                {user.role === 'gold' && user.goldExpiry && (
                                  <div className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1"><Calendar size={12} /> Exp: {formatExpiry(user.goldExpiry)}</div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {formatJoinDate(user.createdAt)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => setProfileUser(user)} className="text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl border border-slate-200 transition shadow-sm" title="View profile"><User size={16} /></button>
                                  <button onClick={() => setEditingUser(user)} className="text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-5 py-2.5 rounded-xl border border-indigo-200 hover:border-indigo-300 transition shadow-sm">Manage</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        {currentUsers.length === 0 && (
                          <tr><td colSpan="6" className="px-6 py-16 text-center"><div className="text-slate-300 mb-3"><Search size={40} className="mx-auto" /></div><p className="text-slate-500 font-bold text-lg">{users.length > 0 ? `No users found matching your search.` : "Database is empty."}</p></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="block lg:hidden p-3 space-y-3">
                    {currentUsers.map(user => {
                      const isSelected = selectedUsers.includes(user.id);
                      return (
                        <div key={user.id} className={`rounded-2xl border p-4 shadow-sm transition ${isSelected ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-200 bg-white'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(user.id)}
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 text-base flex items-center gap-2 flex-wrap">
                                  <span className="truncate">{user.name || "Unknown Name"}</span>
                                  {user.role === 'admin' && <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider">ADMIN</span>}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono mt-1 font-medium break-all">ID: {user.id.substring(0, 10)}...</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setProfileUser(user)} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg border border-slate-200" title="View profile"><User size={15} /></button>
                              <button onClick={() => setEditingUser(user)} className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg border border-indigo-200">Manage</button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail size={15} className="text-slate-400 shrink-0" />
                              <span className="break-all">{user.email}</span>
                            </div>
                            {user.mobile && (
                              <div className="flex items-center gap-2">
                                <Smartphone size={15} className="text-slate-400 shrink-0" />
                                <span>{user.mobile}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {user.emailVerified ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200"><CheckCircle size={12} /> Verified</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300"><AlertTriangle size={12} /> Pending</span>
                              )}
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold border shadow-sm
                                ${user.role === 'gold' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                user.role === 'banned' ? 'bg-red-100 text-red-900 border-red-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                              {user.role === 'gold' ? <Crown size={12} className="text-amber-600" /> : user.role === 'banned' ? <Ban size={12} className="text-red-600" /> : <User size={12} className="text-slate-500" />}
                              {user.role === 'gold' ? 'GOLD' : user.role === 'banned' ? 'SUSPENDED' : 'STANDARD'}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                            <div>
                              <div className="font-semibold uppercase tracking-wide text-slate-400 mb-1">Joined</div>
                              <div className="font-medium text-slate-600">{formatJoinDate(user.createdAt)}</div>
                            </div>
                            <div>
                              <div className="font-semibold uppercase tracking-wide text-slate-400 mb-1">Expiry</div>
                              <div className="font-medium text-slate-600">{user.role === 'gold' && user.goldExpiry ? formatExpiry(user.goldExpiry) : '—'}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {currentUsers.length === 0 && (
                      <div className="px-4 py-16 text-center">
                        <div className="text-slate-300 mb-3"><Search size={36} className="mx-auto" /></div>
                        <p className="text-slate-500 font-bold text-base">{users.length > 0 ? `No users found matching your search.` : "Database is empty."}</p>
                      </div>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-xs sm:text-sm font-medium text-slate-500 text-center sm:text-left">
                        Showing <strong className="text-slate-800">{indexOfFirstUser + 1}</strong> to <strong className="text-slate-800">{Math.min(indexOfLastUser, sortedUsers.length)}</strong> of <strong className="text-slate-800">{sortedUsers.length}</strong> users
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition shadow-sm"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition shadow-sm"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* FLOATING BULK ACTIONS BAR */}
      {selectedUsers.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 px-3 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] flex flex-col sm:flex-row items-center gap-3 sm:gap-6 animate-in slide-in-from-bottom-10 fade-in border border-slate-700 w-[calc(100%-1rem)] sm:w-max max-w-[95vw] overflow-x-auto">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-indigo-500 text-white font-black w-9 h-9 rounded-full flex items-center justify-center shadow-inner text-sm">{selectedUsers.length}</div>
            <span className="text-sm font-bold text-slate-200">Selected</span>
          </div>
          <div className="hidden sm:block w-[1px] h-8 bg-slate-600 shrink-0"></div>

          <div className="flex items-center justify-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => handleBulkAction('standard')}
              disabled={isBulkLoading}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <User size={18} className="text-slate-300" /> <span className="hidden sm:inline">Standard</span>
            </button>
            <button
              onClick={() => setShowBulkGoldModal(true)}
              disabled={isBulkLoading}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-amber-300 hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Crown size={18} /> <span className="hidden sm:inline">Make Gold</span>
            </button>
            <button
              onClick={() => handleBulkAction('banned')}
              disabled={isBulkLoading}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-red-400 hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Ban size={18} /> <span className="hidden sm:inline">Suspend</span>
            </button>
            <div className="hidden sm:block w-[1px] h-6 bg-slate-600 mx-2 shrink-0"></div>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={isBulkLoading}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-red-900/80 text-red-500 transition flex items-center gap-2 disabled:opacity-50"
              title="Delete Database Records"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <button onClick={() => setSelectedUsers([])} className="absolute -top-3 -right-3 bg-slate-600 text-white rounded-full p-1.5 hover:bg-slate-500 shadow-xl border border-slate-500 transition-transform hover:scale-110">
            <XCircle size={20} />
          </button>
        </div>
      )}

      {/* Combined Expiry Modal */}
      {showExpiryModal && (
        <div onClick={() => setShowExpiryModal(false)} className="fixed inset-0 bg-slate-900/70 z-[115] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-xl flex items-center gap-3"><Calendar size={24} className="text-amber-500" /> GOLD Expiry Alerts</h3>
              <button onClick={() => setShowExpiryModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition"><XCircle size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <section>
                <h4 className="text-sm font-bold text-amber-800 mb-3">Expiring within {expiringWindowDays} days ({expiringUsers.length})</h4>
                {expiringUsers.length === 0 ? (
                  <p className="text-sm text-slate-600">No GOLD subscriptions expiring soon.</p>
                ) : (
                  <div className="space-y-3">
                    {expiringUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{u.name || 'Unknown'}</div>
                          <div className="text-sm text-slate-500 truncate">{u.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-amber-700">Exp: {formatExpiry(u.goldExpiry)}</div>
                          <div className="mt-2 flex gap-2 justify-end">
                            <button onClick={() => extendGold(u.id, 1, false)} className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl">+1m Paid</button>
                            <button onClick={() => extendGold(u.id, 1, true)} className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-xl">🎁 Free</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-bold text-red-700">Already expired ({expiredUsers.length})</h4>
                  {expiredUsers.length > 0 && (
                    <button
                      onClick={downgradeAllExpiredGoldUsers}
                      className="text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2.5 py-1 rounded-full hover:bg-red-700 transition"
                    >
                      Downgrade All Expired
                    </button>
                  )}
                </div>
                {expiredUsers.length === 0 ? (
                  <p className="text-sm text-slate-600">No expired GOLD users found.</p>
                ) : (
                  <div className="space-y-3">
                    {expiredUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{u.name || 'Unknown'}</div>
                          <div className="text-sm text-slate-500 truncate">{u.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-700">Expired: {formatExpiry(u.goldExpiry)}</div>
                          <div className="mt-2 flex gap-2 justify-end">
                            <button onClick={() => extendGold(u.id, 1, false)} className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl">+1m Paid</button>
                            <button onClick={() => extendGold(u.id, 1, true)} className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-xl">🎁 Free</button>
                            <button onClick={() => revokeGold(u.id)} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl">Revoke GOLD</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowExpiryModal(false)} className="py-2.5 px-4 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Gold Modal */}
      {showBulkGoldModal && (
        <div className="fixed inset-0 bg-slate-900/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-auto animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-black text-slate-800 text-xl flex items-center gap-3"><Crown size={24} className="text-amber-500" /> Bulk Upgrade</h3>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm font-medium text-slate-600">You are about to upgrade <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-base">{selectedUsers.length} user(s)</strong> to Gold Pro.</p>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <label className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2"><Calendar size={16} /> Subscription Duration</label>
                  <button onClick={() => setShowGoldPricingEditor(v => !v)} className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-1 transition hover:bg-amber-200">
                    {showGoldPricingEditor ? 'Close' : 'Edit rates'}
                  </button>
                </div>
                <select id="bulkGoldDuration" className="w-full p-3.5 border-2 border-amber-300 bg-amber-50 rounded-xl text-sm text-slate-800 font-bold outline-none focus:ring-4 focus:ring-amber-500/20 transition-all cursor-pointer">
                  <option value="3">3 Months — ₹{(goldPlanPrices[3] || 2999).toLocaleString('en-IN')}</option>
                  <option value="6">6 Months — ₹{(goldPlanPrices[6] || 4999).toLocaleString('en-IN')}</option>
                  <option value="12">12 Months — ₹{(goldPlanPrices[12] || 7999).toLocaleString('en-IN')}</option>
                  <option value="24">2 Years — ₹{(goldPlanPrices[24] || 13999).toLocaleString('en-IN')}</option>
                </select>
              </div>

              {showGoldPricingEditor && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Default subscription rates</div>
                  {[3, 6, 12].map(months => (
                    <div key={months} className="grid grid-cols-[70px_1fr] items-center gap-2 text-sm text-slate-700">
                      <label className="font-bold">{months}M</label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={goldPlanPrices[months] ?? defaultGoldPlanPrices[months]}
                          onChange={(e) => setGoldPlanPrices(prev => ({ ...prev, [months]: Number(e.target.value) || 0 }))}
                          className="w-full px-2.5 py-2 border border-amber-200 bg-white rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => saveGoldPlanPrices(goldPlanPrices)}
                    className="w-full py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition"
                  >
                    Save pricing
                  </button>
                </div>
              )}
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowBulkGoldModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm">Cancel</button>
              <button onClick={() => handleBulkAction('gold', document.getElementById('bulkGoldDuration').value)} className="flex-1 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                {isBulkLoading ? <Loader2 size={18} className="animate-spin" /> : <><Crown size={18} /> Upgrade All</>}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Export Users Utility Modal */}
      {showExportModal && (
        <div onClick={() => setShowExportModal(false)} className="fixed inset-0 bg-slate-900/70 z-[115] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 border border-slate-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-400/30 text-indigo-300">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl leading-tight">Export Users Utility</h3>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">Filter by registration date & deduplicate emails</p>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. Registration Date Filter */}
              <div>
                <label className="flex text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" /> Filter by Registration Date
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Registered Today' },
                    { id: '7days', label: 'Last 7 Days' },
                    { id: '30days', label: 'Last 30 Days' },
                    { id: 'since_last', label: 'Since Last Export' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setExportPreset(preset.id)}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${exportPreset === preset.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Since Last Export Info Banner */}
                {exportPreset === 'since_last' && (
                  <div className="mt-3 p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-900 animate-in fade-in">
                    <Clock size={16} className="text-indigo-600 shrink-0" />
                    {lastExportInfo ? (
                      <div>
                        Filtering users registered after <strong className="font-bold">{new Date(lastExportInfo.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                      </div>
                    ) : (
                      <div>No previous export record found — exporting all users.</div>
                    )}
                  </div>
                )}

                {/* Custom Date Pickers */}
                {exportPreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">From Date</label>
                      <input
                        type="date"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        value={exportStartDate}
                        onChange={e => setExportStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">To Date</label>
                      <input
                        type="date"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        value={exportEndDate}
                        onChange={e => setExportEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. User Scope & Deduplication */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="flex text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 items-center gap-2">
                    <Users size={16} className="text-indigo-600" /> Export User Scope
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition ${exportScope === 'all' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-sm' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportScope === 'all'}
                        onChange={() => setExportScope('all')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-bold">All Database Users</div>
                        <div className="text-[10px] text-slate-500 font-medium">Ignore search query ({users.length} total)</div>
                      </div>
                    </label>

                    <label className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition ${exportScope === 'filtered' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-sm' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportScope === 'filtered'}
                        onChange={() => setExportScope('filtered')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-bold">Search Filtered Users</div>
                        <div className="text-[10px] text-slate-500 font-medium">Current search ({sortedUsers.length} users)</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Prevent Duplicate Emails Checkbox */}
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deduplicateEmails}
                      onChange={e => setDeduplicateEmails(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 block">Prevent Duplicate Emails</span>
                      <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">Filter out repeated emails so each unique email address is exported once</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Live Preview Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Export Ready</div>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">
                    {getFilteredExportUsers().length} <span className="text-sm font-semibold text-slate-300">users selected</span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400 space-y-1">
                  <div>Date Filter: <strong className="text-slate-200">{exportPreset.toUpperCase()}</strong></div>
                  <div>Unique Emails: <strong className="text-emerald-400">{deduplicateEmails ? 'ENABLED' : 'OFF'}</strong></div>
                </div>
              </div>

              {/* 3. Last Export Record */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
                <Clock size={20} className="text-slate-400 shrink-0" />
                <div className="text-xs text-slate-600 min-w-0">
                  <div className="font-bold text-slate-800">Last Export Record</div>
                  {lastExportInfo ? (
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                      {new Date(lastExportInfo.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} — <strong className="text-slate-700">{lastExportInfo.count} users</strong> ({lastExportInfo.adminEmail || 'admin'})
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic mt-0.5">No previous export recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={executeUserExport}
                className="flex-1 py-3 px-6 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2"
              >
                <Download size={18} /> Export CSV ({getFilteredExportUsers().length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {profileUser && (
        <UserProfileModal
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onResetDevice={resetDeviceBinding}
          onManageAccess={() => {
            setEditingUser(profileUser);
            setProfileUser(null);
          }}
        />
      )}

      {/* Duplicate User Detection Modal */}
      {showDuplicateModal && (
        <div onClick={() => setShowDuplicateModal(false)} className="fixed inset-0 bg-slate-900/70 z-[115] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-auto animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2.5 rounded-xl border border-amber-200 text-amber-700">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-xl">Duplicate User Detection</h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">Accounts sharing the same email or phone number</p>
                </div>
              </div>
              <button onClick={() => setShowDuplicateModal(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition"><XCircle size={24} /></button>
            </div>

            <div className="p-6 space-y-6">
              {duplicateData.emailGroups.length === 0 && duplicateData.phoneGroups.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-medium">No duplicate emails or mobile numbers found.</div>
              ) : (
                <>
                  {duplicateData.emailGroups.length > 0 && (
                    <section>
                      <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3">Duplicate Emails ({duplicateData.emailGroups.length})</h4>
                      <div className="space-y-3">
                        {duplicateData.emailGroups.map((group, index) => (
                          <div key={`email-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">{group.key}</div>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">{group.summary}</span>
                            </div>
                            <div className="space-y-2">
                              {group.users.map(user => {
                                const verification = getDuplicateVerificationStatus(user);
                                return (
                                  <div key={user.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-amber-100">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="font-bold text-slate-800 truncate">{user.name || 'Unknown User'}</div>
                                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold border rounded-full ${verification.className}`}>
                                          {verification.label}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-500 truncate">{user.email || 'No email'} • {user.mobile || 'No mobile'}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button onClick={() => { setProfileUser(user); setShowDuplicateModal(false); }} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-200">View</button>
                                      <button onClick={() => deleteDuplicateUser(user)} className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg border border-red-200">Delete</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {duplicateData.phoneGroups.length > 0 && (
                    <section>
                      <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3">Duplicate Mobile Numbers ({duplicateData.phoneGroups.length})</h4>
                      <div className="space-y-3">
                        {duplicateData.phoneGroups.map((group, index) => (
                          <div key={`phone-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">{group.key}</div>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">{group.summary}</span>
                            </div>
                            <div className="space-y-2">
                              {group.users.map(user => {
                                const verification = getDuplicateVerificationStatus(user);
                                return (
                                  <div key={user.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-amber-100">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="font-bold text-slate-800 truncate">{user.name || 'Unknown User'}</div>
                                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold border rounded-full ${verification.className}`}>
                                          {verification.label}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-500 truncate">{user.email || 'No email'} • {user.mobile || 'No mobile'}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button onClick={() => { setProfileUser(user); setShowDuplicateModal(false); }} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-200">View</button>
                                      <button onClick={() => deleteDuplicateUser(user)} className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg border border-red-200">Delete</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowDuplicateModal(false)} className="py-2.5 px-4 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Single Edit Role Modal */}
      {editingUser && (
        <RoleEditModal
          user={editingUser}
          goldPlanPrices={goldPlanPrices}
          onClose={() => setEditingUser(null)}
          onUpdate={(userId, newData) => {
            if (!db) {
              alert("Database not available.");
              setEditingUser(null);
              return;
            }

            const orig = users.find(u => u.id === userId) || {};

            updateDoc(doc(db, "users", userId), newData).then(async () => {
              try {
                const prevRole = orig.role || 'unknown';
                const newRole = newData.role || prevRole;
                const priorExpiry = orig.goldExpiry || null;
                const mergedRecord = { ...orig, ...newData, priorExpiry };
                if (prevRole !== newRole && ((prevRole === 'gold' && newRole !== 'gold') || (prevRole !== 'gold' && newRole === 'gold'))) {
                  await sendSheetUpdate([{ userId, name: orig.name || '', email: orig.email || '', prevRole, newRole, at: new Date().toISOString() }]);
                }
                if (prevRole !== 'gold' && newRole === 'gold') {
                  sendGoldUpgradeEmailIfActive(db, mergedRecord, user?.email || 'admin').catch(e => console.error('Single update upgrade email error:', e));
                } else if (prevRole === 'gold' && newRole !== 'gold') {
                  sendGoldDowngradeEmailIfActive(db, mergedRecord, user?.email || 'admin').catch(e => console.error('Single update downgrade email error:', e));
                }
              } catch (e) {
                console.error('Sheet update failed for single update:', e);
              }
              setEditingUser(null);
            }).catch(err => alert("Error: " + err.message));
          }}
        />
      )}
      {/* Restore Pre-flight Validation & Preview Modal */}
      {restorePreview && (
        <div onClick={() => setRestorePreview(null)} className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-auto animate-in zoom-in-95 border border-slate-100">
            <div className="p-6 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2.5 rounded-xl border border-amber-200 text-amber-800">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-xl">Restore Validation Dry-Run</h3>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">{restorePreview.fileName}</p>
                </div>
              </div>
              <button onClick={() => setRestorePreview(null)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition"><XCircle size={24} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
                <strong className="font-bold block mb-1">⚠️ Safety Snapshot Recorded:</strong>
                A backup of your current database state has been stored locally in browser storage. You can rollback using <strong>"Rollback Snapshot"</strong> if needed.
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Collection Document Counts</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Users Collection</div>
                    <div className="text-xl font-black text-slate-800 mt-1">{restorePreview.counts.users} docs</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Questions Collection</div>
                    <div className="text-xl font-black text-slate-800 mt-1">{restorePreview.counts.questions} docs</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Gold Answers</div>
                    <div className="text-xl font-black text-slate-800 mt-1">{restorePreview.counts.answers_gold} docs</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Settings</div>
                    <div className="text-xl font-black text-slate-800 mt-1">{restorePreview.counts.settings} docs</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setRestorePreview(null)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm">Cancel</button>
              <button onClick={() => executeRestore(restorePreview.data)} className="flex-1 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg transition flex justify-center items-center gap-2">
                {isRestoring ? <Loader2 size={18} className="animate-spin" /> : <><Upload size={18} /> Confirm & Restore</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminderScannerModal && (
        <ReminderScannerModal
          db={db}
          users={users}
          currentUser={user}
          onClose={() => setShowReminderScannerModal(false)}
          onRefreshUsers={() => {
            // State updates automatically via Firestore onSnapshot
          }}
        />
      )}
    </div>
  );
}

