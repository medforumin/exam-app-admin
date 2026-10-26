/**
 * Standardized Membership Schema Utilities
 * Used across Student App (exam-app-sso) and Admin App (exam-app-in-admin)
 * to guarantee 100% data consistency for user documents in Firestore (`users/{uid}`).
 */

/**
 * Calculates goldExpiry ISO string given durationMonths from a start date.
 * If user has an unexpired active membership, extends from existing goldExpiry.
 * 
 * @param {number} durationMonths 
 * @param {Date|string} startDate 
 * @returns {string} ISO Date String
 */
export function calculateGoldExpiry(durationMonths = 3, startDate = new Date()) {
  const expiry = new Date(startDate);
  expiry.setMonth(expiry.getMonth() + Number(durationMonths || 3));
  return expiry.toISOString();
}

/**
 * Safely extracts the Gold start date string/timestamp from a user object.
 * Checks `goldStartAt` first, with fallback to legacy `goldStartDate` or `goldLastUpdatedAt`.
 * 
 * @param {Object} user 
 * @returns {string|null}
 */
export function getGoldStartAt(user) {
  if (!user) return null;
  return user.goldStartAt || user.goldStartDate || user.goldStartdate || user.goldstartat || user.goldLastUpdatedAt || null;
}

/**
 * Safely extracts the last Gold charge amount from a user object.
 * Checks `lastGoldCharge` first, with fallback to legacy `goldMembershipAmount` or `subscriptionAmount`.
 * 
 * @param {Object} user 
 * @returns {number}
 */
export function getLastGoldCharge(user) {
  if (!user) return 0;
  const amount = Number(user.lastGoldCharge ?? user.goldMembershipAmount ?? user.subscriptionAmount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Normalizes a revenue/payment history array into a consistent array of structured payment objects.
 * Handles legacy numeric entries as well as existing object entries.
 */
export function normalizePaymentHistory(history = [], userId = 'unknown', fallbackAmount = 0, fallbackMonths = 1, fallbackDate = null) {
  if (!Array.isArray(history)) {
    history = [];
  }

  const entries = history.map((entry, index) => {
    if (typeof entry === 'object' && entry !== null) {
      const amount = Number(entry.amount ?? entry.value ?? entry.total ?? 0);
      const months = Number(entry.months ?? entry.duration ?? 1);
      return {
        id: entry.id || `${userId}-${index}-${entry.chargedAt || entry.date || Date.now()}`,
        userId: entry.userId || userId,
        amount: Number.isFinite(amount) ? amount : 0,
        months: Number.isFinite(months) && months > 0 ? months : 1,
        chargedAt: entry.chargedAt || entry.date || new Date().toISOString(),
        transactionId: entry.transactionId || entry.txnId || entry.txId || entry.transactionRef || '',
        note: entry.note || entry.reason || entry.ref || '',
      };
    }

    const amount = Number(entry ?? 0);
    return {
      id: `${userId}-${index}-${Date.now()}`,
      userId,
      amount: Number.isFinite(amount) ? amount : 0,
      months: 1,
      chargedAt: new Date().toISOString(),
      transactionId: '',
      note: '',
    };
  }).filter(item => Number.isFinite(item.amount) && item.amount >= 0);

  if (entries.length === 0 && Number.isFinite(fallbackAmount) && fallbackAmount > 0) {
    entries.push({
      id: `${userId}-fallback-${Date.now()}`,
      userId,
      amount: fallbackAmount,
      months: fallbackMonths || 1,
      chargedAt: fallbackDate || new Date().toISOString(),
      transactionId: '',
      note: '',
    });
  }

  return entries;
}

/**
 * Builds canonical GOLD membership fields for updating `users/{uid}` document.
 * 
 * @param {Object} userDocData Existing user document data from Firestore
 * @param {Object} options Payment details { amount, durationMonths, transactionId, note }
 * @returns {Object} Firestore update object
 */
export function buildGoldUpgradeFields(userDocData = {}, { amount = 0, durationMonths = 3, transactionId = 'UPI', note = '' }) {
  const nowIso = new Date().toISOString();
  const months = Number(durationMonths || 3);
  const amt = Number(amount || 0);

  // Maintain existing start date if unexpired, otherwise current timestamp
  const goldStartAt = getGoldStartAt(userDocData) || nowIso;

  // Calculate new expiry date from current time or unexpired goldExpiry
  let baseDate = new Date();
  if (userDocData.goldExpiry) {
    const existingExpiry = new Date(userDocData.goldExpiry);
    if (!isNaN(existingExpiry.getTime()) && existingExpiry > baseDate) {
      baseDate = existingExpiry;
    }
  }
  const goldExpiry = calculateGoldExpiry(months, baseDate);

  const paymentRecord = {
    id: `payment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    userId: userDocData.uid || userDocData.id || '',
    amount: amt,
    months: months,
    chargedAt: nowIso,
    transactionId: transactionId || 'UPI',
    note: note || ''
  };

  const existingHistory = normalizePaymentHistory(userDocData.goldRevenueHistory, userDocData.uid || userDocData.id || '');

  return {
    role: 'gold',
    goldStartAt: goldStartAt,
    goldExpiry: goldExpiry,
    goldPlanMonths: months,
    goldLastUpdatedAt: nowIso,
    lastGoldCharge: amt,
    goldRevenueHistory: [...existingHistory, paymentRecord]
  };
}

/**
 * Builds canonical Downgrade fields for `users/{uid}`
 * 
 * @returns {Object} Firestore update object
 */
export function buildGoldDowngradeFields() {
  return {
    role: 'standard',
    goldLastUpdatedAt: new Date().toISOString()
  };
}

