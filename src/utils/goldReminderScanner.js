import { doc, updateDoc } from 'firebase/firestore';
import { fetchSmtpSettings, dispatchTestEmail, safeFormatDate } from '../lib/emailService';
import { logAdminAudit } from '../lib/firebase';
import { getExpiryMs } from './userFormatters';

/**
 * Normalizes a raw date input to YYYY-MM-DD string
 */
export const getExpiryDateString = (expiryVal) => {
  if (!expiryVal) return '';
  const date = new Date(expiryVal?.seconds ? expiryVal.seconds * 1000 : expiryVal);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

/**
 * Scans user list for active GOLD members whose goldExpiry date falls within 3 to 7 days from now,
 * and who have NOT yet received a reminder for their current expiry cycle.
 */
export const scanExpiringGoldUsers = (users = [], minDays = 3, maxDays = 7) => {
  const nowMs = Date.now();
  const minMs = nowMs + minDays * 24 * 60 * 60 * 1000;
  const maxMs = nowMs + maxDays * 24 * 60 * 60 * 1000;

  return users.filter(user => {
    if (user.role !== 'gold') return false;

    const expiryMs = getExpiryMs(user.goldExpiry);
    if (!expiryMs || Number.isNaN(expiryMs)) return false;

    // Check if within 3 to 7 days window
    const isWithinWindow = expiryMs >= minMs && expiryMs <= maxMs;
    if (!isWithinWindow) return false;

    // Prevent duplicate reminders for the same expiry date cycle
    const currentExpiryDateStr = getExpiryDateString(user.goldExpiry);
    if (user.goldReminderSentForExpiryDate === currentExpiryDateStr) {
      return false; // Already sent reminder for this expiration cycle
    }

    return true;
  }).map(user => {
    const expiryMs = getExpiryMs(user.goldExpiry);
    const diffMs = expiryMs - nowMs;
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    return {
      ...user,
      daysRemaining,
      expiryDateFormatted: new Date(expiryMs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  });
};

/**
 * Dispatches expiry reminder emails to selected target users via current SMTP/Bridge settings
 */
export const dispatchGoldExpiryReminders = async (db, targetUsers = [], adminEmail = 'unknown', onProgress = null) => {
  if (!db || !Array.isArray(targetUsers) || targetUsers.length === 0) {
    return { success: true, count: 0, skipped: 'No target users provided.' };
  }

  const smtpSettings = await fetchSmtpSettings(db);

  if (!smtpSettings.enabled) {
    return {
      success: false,
      count: 0,
      reason: 'email_system_deactivated',
      message: 'Automated email system is currently deactivated in Admin Settings. Please activate it in Email & SMTP Settings before sending reminders.'
    };
  }

  let sentCount = 0;
  let failCount = 0;
  const errors = [];

  for (let i = 0; i < targetUsers.length; i++) {
    const user = targetUsers[i];
    if (!user.email) continue;

    const currentExpiryDateStr = getExpiryDateString(user.goldExpiry);
    const daysLeft = user.daysRemaining || 5;
    const fallbackExpiryStr = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedExpiry = user.expiryDateFormatted || safeFormatDate(user.goldExpiry, fallbackExpiryStr);
    const formattedStart = safeFormatDate(user.goldStartAt, '');

    try {
      if (onProgress) {
        onProgress({ current: i + 1, total: targetUsers.length, email: user.email });
      }

      await dispatchTestEmail(
        db,
        smtpSettings,
        user.email,
        'gold_reminder_3_7_days',
        {
          userName: user.name || user.email,
          expiryDate: formattedExpiry,
          daysRemaining: String(daysLeft),
          goldStartAt: formattedStart,
          planMonths: `${user.goldPlanMonths || 1} Month(s)`,
        },
        adminEmail
      );

      // Tag user document in Firestore to prevent duplicate reminders for this expiry cycle
      await updateDoc(doc(db, 'users', user.id), {
        lastGoldReminderSentAt: new Date().toISOString(),
        goldReminderSentForExpiryDate: currentExpiryDateStr,
      });

      sentCount++;
    } catch (err) {
      console.error(`Failed to send reminder to ${user.email}:`, err);
      failCount++;
      errors.push({ email: user.email, error: err.message || String(err) });
    }
  }

  if (sentCount > 0) {
    try {
      await logAdminAudit('dispatch_gold_expiry_reminders', { count: sentCount, failed: failCount }, adminEmail);
    } catch (e) {
      console.error('Failed to log audit for reminder dispatch:', e);
    }
  }

  return {
    success: true,
    sentCount,
    failCount,
    errors,
    message: `Dispatched ${sentCount} reminder email(s).${failCount > 0 ? ` (${failCount} failed)` : ''}`,
  };
};
