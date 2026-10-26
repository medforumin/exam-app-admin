import { deleteField } from 'firebase/firestore';

/**
 * Utility functions for standardizing Gold Membership data fields and revenue history in Firestore.
 */

/**
 * Normalizes a revenue/payment history array into a consistent array of structured payment objects.
 * Handles legacy numeric entries (e.g. [2999, 4999]) as well as existing object entries.
 */
export const normalizePaymentHistory = (history = [], userId = 'unknown', fallbackAmount = 0, fallbackMonths = 1, fallbackDate = null) => {
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

  // Fallback if history is empty but a scalar charge exists (> 0)
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
};

/**
 * Safely extracts the Gold start date string/timestamp from a user object.
 * Checks `goldStartAt` first, with fallback to legacy `goldStartDate` or `goldLastUpdatedAt`.
 */
export const getGoldStartAt = (user) => {
  if (!user) return null;
  return user.goldStartAt || user.goldStartDate || user.goldStartdate || user.goldstartat || user.goldLastUpdatedAt || null;
};

/**
 * Safely extracts the last Gold charge amount from a user object.
 * Checks `lastGoldCharge` first, with fallback to legacy `goldMembershipAmount` or `subscriptionAmount`.
 */
export const getLastGoldCharge = (user) => {
  if (!user) return 0;
  const amount = Number(user.lastGoldCharge ?? user.goldMembershipAmount ?? user.subscriptionAmount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

/**
 * Formats a raw date value into a YYYY-MM-DD input string for <input type="date">.
 */
export const getDateInputValue = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return value.slice(0, 10);
  }
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
};

/**
 * Builds a standardized update payload for updating a user's role and Gold fields in Firestore.
 * Completely deletes redundant legacy fields (goldStartDate, goldStartdate, goldstartat, goldMembershipAmount) via deleteField().
 */
export const buildGoldUpdatePayload = ({
  role,
  startDate = new Date(),
  months = 1,
  amount = 0,
  transactionId = '',
  customExpiryDate = null,
  note = '',
  banReason = '',
  currentUserRecord = {},
  paymentHistory = null,
}) => {
  const payload = { role };

  if (role === 'banned') {
    payload.bannedAt = new Date().toISOString();
    payload.banReason = banReason ? banReason.trim() : (currentUserRecord.banReason || 'Suspended by admin');
  } else {
    payload.bannedAt = deleteField();
    payload.banReason = deleteField();
  }

  if (role === 'gold') {
    const startObj = startDate instanceof Date ? startDate : new Date(startDate);
    const goldMonths = Number(months) || 1;
    const chargeAmount = Number(amount) || 0;

    const baseHistory = paymentHistory !== null
      ? paymentHistory
      : normalizePaymentHistory(
          currentUserRecord.goldRevenueHistory,
          currentUserRecord.id,
          getLastGoldCharge(currentUserRecord),
          currentUserRecord.goldPlanMonths || 1,
          getGoldStartAt(currentUserRecord)
        );

    // Ensure current charge is included in history
    const hasCurrentEntry = baseHistory.some(
      item => Number(item.amount) === chargeAmount && Number(item.months) === goldMonths
    );

    const nextHistory = hasCurrentEntry
      ? baseHistory
      : [
          ...baseHistory,
          {
            id: `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            userId: currentUserRecord.id,
            amount: chargeAmount,
            months: goldMonths,
            chargedAt: startObj.toISOString(),
            transactionId: transactionId || '',
            note: note || '',
          },
        ];

    // Compute expiry date from startObj or custom date
    const expiryObj = customExpiryDate ? new Date(customExpiryDate) : new Date(startObj);
    if (!customExpiryDate) {
      expiryObj.setMonth(expiryObj.getMonth() + goldMonths);
    }

    payload.goldStartAt = startObj.toISOString();
    payload.goldExpiry = expiryObj.toISOString();
    payload.goldPlanMonths = goldMonths;
    payload.lastGoldCharge = chargeAmount;
    payload.goldRevenueHistory = nextHistory;
    payload.goldLastUpdatedAt = new Date().toISOString();

    // Use deleteField() so deprecated legacy fields are completely removed from Firestore
    payload.goldStartDate = deleteField();
    payload.goldStartdate = deleteField();
    payload.goldstartat = deleteField();
    payload.goldMembershipAmount = deleteField();
  } else {
    // When role is not gold (standard, banned, admin), delete gold status fields while retaining payment history
    const existingHistory = paymentHistory !== null
      ? paymentHistory
      : normalizePaymentHistory(currentUserRecord.goldRevenueHistory, currentUserRecord.id);

    payload.goldStartAt = deleteField();
    payload.goldStartDate = deleteField();
    payload.goldStartdate = deleteField();
    payload.goldstartat = deleteField();
    payload.goldExpiry = deleteField();
    payload.goldPlanMonths = deleteField();
    payload.lastGoldCharge = deleteField();
    payload.goldMembershipAmount = deleteField();
    payload.goldRevenueHistory = existingHistory;
  }

  return payload;
};
