import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, limit, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { logAdminAudit } from './firebase';

export const DEFAULT_SMTP_SETTINGS = {
  enabled: false, // Master toggle to activate/deactivate automatic email notifications
  provider: 'apps_script', // 'apps_script' | 'sendpulse' | 'resend' | 'brevo' | 'sendgrid' | 'custom_webhook' | 'smtp'
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  secure: false,
  authUser: 'pediatrics.pyq@e.dnbpedia.in',
  authPass: '',
  fromEmail: 'pediatrics.pyq@e.dnbpedia.in',
  fromName: 'Pediatrics PYQ',
  replyTo: 'pediatrics.pyq@e.dnbpedia.in',
  adminNotificationEmail: 'pyq@dnbpedia.in',
  useAppScriptBridge: true,
  appScriptUrl: '',
  appScriptSecret: 'PYQ_SECURE_KEY_2026',
  resendApiKey: '',
  brevoApiKey: '',
  sendgridApiKey: '',
  sendpulseUserId: '',
  sendpulseSecret: '',
  customWebhookUrl: '',
};

export const DEFAULT_EMAIL_TEMPLATES = {
  gold_welcome: {
    id: 'gold_welcome',
    title: 'Standard to GOLD Upgrade Welcome',
    subject: '[Pediatrics PYQ] Welcome to GOLD Membership!',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4f46e5, #d97706); padding: 24px; text-align: center; color: #ffffff;">
    <h1 style="margin: 0; font-size: 24px;">Welcome to GOLD Access!</h1>
    <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Your subscription has been activated</p>
  </div>
  <div style="padding: 24px; color: #334155; line-height: 1.6;">
    <p>Dear <strong>{{userName}}</strong>,</p>
    <p>We are excited to let you know that your account has been upgraded to <strong>GOLD Membership</strong> for <strong>{{appTitle}}</strong>!</p>
    
    <div style="background: #f8fafc; border-left: 4px solid #d97706; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #92400e;">Subscription Details</h3>
      <p style="margin: 4px 0;"><strong>Plan Duration:</strong> {{planMonths}}</p>
      <p style="margin: 4px 0;"><strong>Start Date:</strong> {{goldStartAt}}</p>
      <p style="margin: 4px 0;"><strong>Expiration Date:</strong> {{expiryDate}}</p>
    </div>

    <p>You now have full access to high-yield past questions, explanations, and exclusive GOLD preparation material.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pediatrics.medforum.in" style="background-color: #d97706; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Explore GOLD Content Now</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">If you have any questions or need assistance, reply directly to this email or reach us at {{supportEmail}}.</p>
  </div>
  <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
    © {{appTitle}} Team. All rights reserved.
  </div>
</div>`,
    bodyText: `Dear {{userName}},\n\nYour account has been upgraded to GOLD Membership for {{appTitle}}!\n\nDetails:\n- Plan: {{planMonths}}\n- Start Date: {{goldStartAt}}\n- Expiration Date: {{expiryDate}}\n\nThank you for choosing {{appTitle}}.\n\nSupport: {{supportEmail}}`,
    updatedAt: new Date().toISOString(),
  },

  gold_reminder_3_7_days: {
    id: 'gold_reminder_3_7_days',
    title: 'GOLD Expiry Reminder (3-7 Days Remaining)',
    subject: '[Reminder] Your GOLD Membership expires in {{daysRemaining}} days',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #d97706, #dc2626); padding: 24px; text-align: center; color: #ffffff;">
    <h1 style="margin: 0; font-size: 22px;">GOLD Membership Expiring Soon</h1>
    <p style="margin-top: 8px; font-size: 14px;">Only {{daysRemaining}} days left on your plan</p>
  </div>
  <div style="padding: 24px; color: #334155; line-height: 1.6;">
    <p>Dear <strong>{{userName}}</strong>,</p>
    <p>This is a friendly reminder that your <strong>GOLD Membership</strong> for {{appTitle}} will end on <strong>{{expiryDate}}</strong>.</p>
    
    <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; color: #92400e;">
      <p style="margin: 0; font-weight: bold;">[!] Days Remaining: {{daysRemaining}} Days</p>
      <p style="margin: 6px 0 0 0; font-size: 13px;">Renew now to ensure uninterrupted access to your exam preparation material and saved bookmarks.</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://pediatrics.medforum.in" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Renew Membership Now</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">Questions? Contact our team anytime at {{supportEmail}}.</p>
  </div>
  <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
    © {{appTitle}} Team
  </div>
</div>`,
    bodyText: `Dear {{userName}},\n\nYour GOLD Membership for {{appTitle}} will expire on {{expiryDate}} ({{daysRemaining}} days remaining).\n\nRenew now to avoid interruption to your access.\n\nSupport: {{supportEmail}}`,
    updatedAt: new Date().toISOString(),
  },

  gold_expired: {
    id: 'gold_expired',
    title: 'GOLD Membership Expired Notice',
    subject: '[Notice] Your GOLD Membership has expired',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: #475569; padding: 24px; text-align: center; color: #ffffff;">
    <h1 style="margin: 0; font-size: 22px;">GOLD Membership Has Ended</h1>
    <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Your account has reverted to Standard status</p>
  </div>
  <div style="padding: 24px; color: #334155; line-height: 1.6;">
    <p>Dear <strong>{{userName}}</strong>,</p>
    <p>Your GOLD Membership for <strong>{{appTitle}}</strong> expired on <strong>{{expiryDate}}</strong>.</p>
    <p>Your account is currently set to Standard status. You can upgrade anytime to restore unlimited access to GOLD features and questions.</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="https://pediatrics.medforum.in" style="background-color: #d97706; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Re-activate GOLD Access</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">If you need assistance, please reply to this email or reach us at {{supportEmail}}.</p>
  </div>
</div>`,
    bodyText: `Dear {{userName}},\n\nYour GOLD Membership for {{appTitle}} expired on {{expiryDate}}.\n\nRe-activate your subscription anytime to restore full access.\n\nSupport: {{supportEmail}}`,
    updatedAt: new Date().toISOString(),
  }
};

/**
 * Placeholder tags documentation helper
 */
export const EMAIL_TEMPLATE_TAGS = [
  { tag: '{{userName}}', label: 'User Full Name', example: 'Dr. Ananya Sharma' },
  { tag: '{{userEmail}}', label: 'User Email Address', example: 'ananya@example.com' },
  { tag: '{{goldStartAt}}', label: 'Gold Start Date', example: '01 Oct 2026' },
  { tag: '{{expiryDate}}', label: 'Gold Expiration Date', example: '10 Oct 2026' },
  { tag: '{{daysRemaining}}', label: 'Days Until Expiry', example: '5' },
  { tag: '{{planMonths}}', label: 'Plan Duration', example: '3 Months' },
  { tag: '{{appTitle}}', label: 'App Portal Name', example: 'Pediatrics PYQ' },
  { tag: '{{supportEmail}}', label: 'Support Email', example: 'support@medforum.in' },
];

/**
 * Safely formats dates from various types:
 * - Firestore Timestamps (with .toDate() method or raw { seconds, nanoseconds })
 * - Date instances
 * - ISO string or date string / number
 * - Handles deleteField() and sentinel objects gracefully without returning "[object Object]"
 */
export const safeFormatDate = (val, fallback = 'N/A') => {
  if (!val) return fallback;
  if (typeof val === 'object') {
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? fallback : val.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        return fallback;
      }
    }
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000);
      return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    // Sentinel objects like deleteField() or empty objects
    return fallback;
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return fallback;
};

export const escapeHtml = (str) => {
  if (typeof str !== 'string') {
    if (str && typeof str === 'object') {
      if (str instanceof Date) {
        return str.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (typeof str.seconds === 'number') {
        return new Date(str.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return ''; // Never print [object Object]
    }
    return String(str ?? '');
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Renders dynamic tags inside subject or body text with HTML sanitization
 */
export const renderTemplate = (text = '', variables = {}, isHtml = true) => {
  if (!text) return '';
  let result = text;
  Object.keys(variables).forEach(key => {
    let rawVal = variables[key] ?? '';
    if (typeof rawVal === 'object' && rawVal !== null) {
      if (rawVal instanceof Date) {
        rawVal = rawVal.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } else if (typeof rawVal.seconds === 'number') {
        rawVal = new Date(rawVal.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } else {
        rawVal = '';
      }
    }
    const safeVal = isHtml ? escapeHtml(rawVal) : String(rawVal);
    const tagToReplace = `{{${key}}}`;
    result = result.split(tagToReplace).join(safeVal);

    // Also replace formatted space variants like {{ userName }}
    const tagWithSpaces = `{{ ${key} }}`;
    result = result.split(tagWithSpaces).join(safeVal);
  });
  return result;
};

/**
 * Loads SMTP Configuration from Firestore
 */
export const fetchSmtpSettings = async (db) => {
  if (db) {
    try {
      const docRef = doc(db, 'systemConfig', 'emailSettings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        try {
          localStorage.setItem('pyq_smtp_settings', JSON.stringify(data));
        } catch (e) {
          // ignore storage error
        }
        return { ...DEFAULT_SMTP_SETTINGS, ...data };
      }
    } catch (err) {
      console.warn('Firestore fetchSmtpSettings failed (falling back to cache/defaults):', err?.message || err);
    }
  }

  try {
    const cached = localStorage.getItem('pyq_smtp_settings');
    if (cached) {
      return { ...DEFAULT_SMTP_SETTINGS, ...JSON.parse(cached) };
    }
  } catch (e) {
    // ignore storage read error
  }

  return DEFAULT_SMTP_SETTINGS;
};

/**
 * Saves SMTP Configuration to Firestore with local cache fallback
 */
export const saveSmtpSettings = async (db, settings, adminEmail = 'unknown') => {
  const payload = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };

  // Always save locally so system settings persist for active admin session even if Firestore permissions lag
  try {
    localStorage.setItem('pyq_smtp_settings', JSON.stringify(payload));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }

  if (!db) return payload;

  const docRef = doc(db, 'systemConfig', 'emailSettings');
  try {
    await setDoc(docRef, payload, { merge: true });
    await logAdminAudit('update_smtp_settings', { enabled: settings.enabled, host: settings.smtpHost, port: settings.smtpPort, fromEmail: settings.fromEmail }, adminEmail);
  } catch (err) {
    console.error('Save SMTP settings to Firestore error:', err);
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      throw new Error('Missing or insufficient permissions. Please deploy the updated firestore.rules or verify your admin role.');
    }
    throw err;
  }
  return payload;
};

/**
 * Loads Email Templates from Firestore single document (/systemConfig/emailTemplates)
 */
export const fetchEmailTemplates = async (db) => {
  const templates = { ...DEFAULT_EMAIL_TEMPLATES };
  if (!db) return templates;

  try {
    const docRef = doc(db, 'systemConfig', 'emailTemplates');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      Object.keys(data).forEach(tId => {
        if (data[tId] && typeof data[tId] === 'object') {
          templates[tId] = { ...DEFAULT_EMAIL_TEMPLATES[tId], ...data[tId], id: tId };
        }
      });
      return templates;
    }
  } catch (err) {
    console.warn('Checking legacy template collections:', err?.message || err);
  }

  // Fallback to legacy subcollection paths if single document is not yet populated
  try {
    const colRef = collection(db, 'systemConfig', 'emailTemplates', 'templates');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.id) {
          templates[data.id] = { ...DEFAULT_EMAIL_TEMPLATES[data.id], ...data };
        }
      });
      return templates;
    }
  } catch (err) {
    // ignore
  }

  // Fallback to legacy root collection /emailTemplates
  try {
    const rootLegacyColRef = collection(db, 'emailTemplates');
    const rootLegacySnap = await getDocs(rootLegacyColRef);
    rootLegacySnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data && data.id) {
        templates[data.id] = { ...DEFAULT_EMAIL_TEMPLATES[data.id], ...data };
      }
    });
  } catch (err) {
    console.warn('Using default email templates:', err?.message || err);
  }

  return templates;
};

/**
 * Saves an Email Template to Firestore single document (/systemConfig/emailTemplates)
 */
export const saveEmailTemplate = async (db, templateId, templateData, adminEmail = 'unknown') => {
  if (!db) throw new Error('Database connection unavailable');
  const docRef = doc(db, 'systemConfig', 'emailTemplates');
  const payload = {
    ...templateData,
    id: templateId,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };
  await setDoc(docRef, { [templateId]: payload }, { merge: true });
  await logAdminAudit('update_email_template', { templateId, subject: templateData.subject }, adminEmail);
  return payload;
};

/**
 * Resets a template back to factory defaults
 */
export const resetTemplateToDefault = async (db, templateId, adminEmail = 'unknown') => {
  if (!DEFAULT_EMAIL_TEMPLATES[templateId]) throw new Error('Invalid template ID');
  const defaultData = DEFAULT_EMAIL_TEMPLATES[templateId];
  if (db) {
    await saveEmailTemplate(db, templateId, defaultData, adminEmail);
  }
  return defaultData;
};

const LOCAL_EMAIL_LOGS_KEY = 'pyq_email_logs';

const getLocalEmailLogs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_EMAIL_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalEmailLogs = (logs = []) => {
  try {
    localStorage.setItem(LOCAL_EMAIL_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.warn('Failed to save email logs to localStorage:', e);
  }
};

/**
 * Dispatches an email log entry to Firestore `/emailLogs` with localStorage buffer/fallback
 */
export const logEmailDispatch = async (db, logEntry) => {
  const nowIso = new Date().toISOString();
  // Sanitize all fields to eliminate undefined values which cause Firestore addDoc to reject
  const sanitizedEntry = {
    templateId: logEntry.templateId || 'general_notification',
    recipient: logEntry.recipient || 'unknown',
    subject: logEntry.subject || 'No Subject',
    status: logEntry.status || 'delivered',
    method: logEntry.method || 'Unknown',
    sender: logEntry.sender || 'system',
    sentBy: logEntry.sentBy || 'admin',
    sentAt: logEntry.sentAt || nowIso,
    ...(logEntry.error ? { error: String(logEntry.error) } : {}),
    ...(logEntry.fallbackNotes ? { fallbackNotes: String(logEntry.fallbackNotes) } : {}),
  };

  // 1. Immediately save to LocalStorage so logs are guaranteed in the UI
  const localId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const localRecord = { id: localId, ...sanitizedEntry };
  const currentLogs = getLocalEmailLogs();
  saveLocalEmailLogs([localRecord, ...currentLogs]);

  // 2. Persist to Firestore /emailLogs collection
  if (db) {
    try {
      const colRef = collection(db, 'emailLogs');
      const docRef = await addDoc(colRef, {
        ...sanitizedEntry,
        timestamp: serverTimestamp(),
      });
      if (docRef?.id) {
        const updated = getLocalEmailLogs().map(item => item.id === localId ? { ...item, id: docRef.id } : item);
        saveLocalEmailLogs(updated);
      }
    } catch (err) {
      console.warn('[Email Logging] Firestore /emailLogs write failed (persisted to local cache fallback):', err?.message || err);
    }
  }
};

export const fetchEmailLogs = async (db, maxLogs = 50) => {
  let firestoreLogs = [];
  if (db) {
    try {
      const q = query(collection(db, 'emailLogs'), orderBy('sentAt', 'desc'), limit(maxLogs));
      const snap = await getDocs(q);
      firestoreLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      try {
        const fallbackSnap = await getDocs(collection(db, 'emailLogs'));
        firestoreLogs = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (fallbackErr) {
        console.warn('Firestore /emailLogs read failed (falling back to local cache):', fallbackErr?.message || fallbackErr);
      }
    }
  }

  const localLogs = getLocalEmailLogs();

  // Merge Firestore and LocalStorage logs, deduplicating by ID or identical recipient + sentAt
  const combinedMap = new Map();
  firestoreLogs.forEach(log => {
    const key = log.id || `${log.recipient}_${log.sentAt}`;
    combinedMap.set(key, log);
  });

  localLogs.forEach(log => {
    const key = log.id || `${log.recipient}_${log.sentAt}`;
    const alreadyExists = Array.from(combinedMap.values()).some(existing =>
      existing.id === log.id ||
      (existing.recipient === log.recipient && Math.abs(new Date(existing.sentAt || 0) - new Date(log.sentAt || 0)) < 3000)
    );
    if (!alreadyExists) {
      combinedMap.set(key, log);
    }
  });

  const merged = Array.from(combinedMap.values()).sort((a, b) => {
    const timeA = new Date(a.sentAt || 0).getTime();
    const timeB = new Date(b.sentAt || 0).getTime();
    return timeB - timeA;
  });

  if (merged.length > 0) {
    saveLocalEmailLogs(merged);
  }

  return merged.slice(0, maxLogs);
};

/**
 * Deletes a single email log entry from Firestore and local cache
 */
export const deleteEmailLog = async (db, logId) => {
  if (!logId) return;

  // Remove from LocalStorage
  const localLogs = getLocalEmailLogs().filter(item => item.id !== logId);
  saveLocalEmailLogs(localLogs);

  // Remove from Firestore
  if (db && !logId.startsWith('log_')) {
    try {
      const docRef = doc(db, 'emailLogs', logId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore log delete error:', err?.message || err);
    }
  }
};

/**
 * Clears/purges all email logs from Firestore and local cache
 */
export const clearAllEmailLogs = async (db) => {
  try {
    localStorage.removeItem(LOCAL_EMAIL_LOGS_KEY);
  } catch (e) {
    // ignore
  }

  if (db) {
    try {
      const colRef = collection(db, 'emailLogs');
      const snap = await getDocs(colRef);
      const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'emailLogs', docSnap.id)));
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn('Firestore clear logs error:', err?.message || err);
    }
  }
};

/**
 * Dispatches a test email dispatch via current SMTP / webhook configuration
 */
export const dispatchTestEmail = async (db, smtpSettings, targetEmail, templateId, customVariables = {}, adminEmail = 'unknown') => {
  const templates = await fetchEmailTemplates(db);
  const template = templates[templateId] || DEFAULT_EMAIL_TEMPLATES.gold_welcome;

  const vars = {
    userName: 'Dr. Test Administrator',
    userEmail: targetEmail,
    goldStartAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    daysRemaining: '5',
    planMonths: '3 Months',
    appTitle: 'Pediatrics PYQ Admin',
    supportEmail: smtpSettings.replyTo || smtpSettings.fromEmail || 'pediatrics@e.dnbpedia.in',
    ...customVariables,
  };

  const renderedSubject = renderTemplate(template.subject, vars, false);
  const renderedHtml = renderTemplate(template.bodyHtml, vars, true);
  const renderedText = renderTemplate(template.bodyText, vars, false);

  const primaryProvider = smtpSettings.provider || (
    (smtpSettings.useAppScriptBridge && smtpSettings.appScriptUrl) ? 'apps_script' :
      (smtpSettings.sendpulseUserId && smtpSettings.sendpulseSecret) ? 'sendpulse' :
        smtpSettings.resendApiKey ? 'resend' :
          smtpSettings.brevoApiKey ? 'brevo' :
            smtpSettings.sendgridApiKey ? 'sendgrid' :
              smtpSettings.customWebhookUrl ? 'custom_webhook' : 'smtp'
  );

  // Single Provider Transport Executor
  async function attemptTransport(providerKey) {
    // 1. Google Apps Script Bridge
    if (providerKey === 'apps_script') {
      if (!smtpSettings.appScriptUrl) throw new Error('Missing Google Apps Script Web App URL');
      const response = await fetch(smtpSettings.appScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'sendEmail',
          secretKey: smtpSettings.appScriptSecret || 'PYQ_SECURE_KEY_2026',
          to: targetEmail,
          subject: renderedSubject,
          htmlBody: renderedHtml,
          textBody: renderedText,
          fromName: smtpSettings.fromName,
          fromEmail: smtpSettings.fromEmail,
          replyTo: smtpSettings.replyTo || smtpSettings.fromEmail,
        }),
      });

      if (!response.ok) throw new Error(`HTTP Bridge status: ${response.status}`);
      const resData = await response.json().catch(() => null);
      if (resData && resData.status === 'error') throw new Error(resData.message || 'Apps Script bridge error');
      return { method: 'AppsScript_Bridge', label: 'Google Apps Script Bridge' };
    }

    // 2. SendPulse REST API
    if (providerKey === 'sendpulse') {
      if (!smtpSettings.sendpulseUserId || !smtpSettings.sendpulseSecret) throw new Error('Missing SendPulse API credentials');
      const authRes = await fetch('https://api.sendpulse.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: smtpSettings.sendpulseUserId.trim(),
          client_secret: smtpSettings.sendpulseSecret.trim(),
        }),
      });

      const authData = await authRes.json().catch(() => ({}));
      if (!authRes.ok || !authData.access_token) throw new Error(authData.error_description || authData.message || 'SendPulse OAuth Failed');

      const htmlBase64 = btoa(unescape(encodeURIComponent(renderedHtml)));
      const emailRes = await fetch('https://api.sendpulse.com/smtp/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: {
            html: htmlBase64,
            text: renderedText,
            subject: renderedSubject,
            from: { name: smtpSettings.fromName || 'Pediatrics PYQ Admin', email: smtpSettings.fromEmail },
            to: [{ name: targetEmail.split('@')[0], email: targetEmail }],
            reply_to: {
              email: smtpSettings.replyTo || smtpSettings.fromEmail,
              name: smtpSettings.fromName || 'Pediatrics PYQ Support',
            },
          },
        }),
      });

      const emailData = await emailRes.json().catch(() => ({}));
      if (!emailRes.ok || emailData.result === false) throw new Error(emailData.message || emailData.error_code || `HTTP ${emailRes.status}`);
      return { method: 'SendPulse_API', label: 'SendPulse REST API' };
    }

    // 3. Resend REST API
    if (providerKey === 'resend') {
      if (!smtpSettings.resendApiKey) throw new Error('Missing Resend API Key');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${smtpSettings.resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${smtpSettings.fromName || 'Admin'} <${smtpSettings.fromEmail}>`,
          to: [targetEmail],
          reply_to: smtpSettings.replyTo || smtpSettings.fromEmail,
          subject: renderedSubject,
          html: renderedHtml,
          text: renderedText,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message || resData.error || `HTTP ${res.status}`);
      return { method: 'Resend_API', label: 'Resend REST API' };
    }

    // 4. Brevo REST API
    if (providerKey === 'brevo') {
      if (!smtpSettings.brevoApiKey) throw new Error('Missing Brevo API Key');
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': smtpSettings.brevoApiKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: smtpSettings.fromName || 'Admin', email: smtpSettings.fromEmail },
          to: [{ email: targetEmail }],
          replyTo: {
            email: smtpSettings.replyTo || smtpSettings.fromEmail,
            name: smtpSettings.fromName || 'Admin',
          },
          subject: renderedSubject,
          htmlContent: renderedHtml,
          textContent: renderedText,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message || resData.code || `HTTP ${res.status}`);
      return { method: 'Brevo_API', label: 'Brevo REST API' };
    }

    // 5. SendGrid REST API
    if (providerKey === 'sendgrid') {
      if (!smtpSettings.sendgridApiKey) throw new Error('Missing SendGrid API Key');
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${smtpSettings.sendgridApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: targetEmail }] }],
          from: { email: smtpSettings.fromEmail, name: smtpSettings.fromName || 'Admin' },
          reply_to: { email: smtpSettings.replyTo || smtpSettings.fromEmail, name: smtpSettings.fromName || 'Admin' },
          subject: renderedSubject,
          content: [{ type: 'text/html', value: renderedHtml }],
        }),
      });

      if (!res.ok) {
        const resData = await res.json().catch(() => ({}));
        throw new Error(resData.errors?.[0]?.message || `HTTP ${res.status}`);
      }
      return { method: 'SendGrid_API', label: 'SendGrid REST API' };
    }

    // 6. Custom Webhook
    if (providerKey === 'custom_webhook') {
      if (!smtpSettings.customWebhookUrl) throw new Error('Missing Custom Webhook URL');
      const res = await fetch(smtpSettings.customWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: renderedSubject,
          htmlBody: renderedHtml,
          textBody: renderedText,
          fromEmail: smtpSettings.fromEmail,
          fromName: smtpSettings.fromName,
          replyTo: smtpSettings.replyTo || smtpSettings.fromEmail,
        }),
      });

      if (!res.ok) throw new Error(`Custom Webhook HTTP ${res.status}`);
      return { method: 'Custom_Webhook', label: 'Custom Webhook' };
    }

    throw new Error('Direct SMTP sockets restricted in browser. Please configure an HTTP API or Apps Script.');
  }

  // Determine available fallback providers that have credentials
  const allKnownProviders = ['apps_script', 'sendpulse', 'resend', 'brevo', 'sendgrid', 'custom_webhook'];
  const hasCredentialsFor = (p) => {
    if (p === 'apps_script') return Boolean(smtpSettings.appScriptUrl);
    if (p === 'sendpulse') return Boolean(smtpSettings.sendpulseUserId && smtpSettings.sendpulseSecret);
    if (p === 'resend') return Boolean(smtpSettings.resendApiKey);
    if (p === 'brevo') return Boolean(smtpSettings.brevoApiKey);
    if (p === 'sendgrid') return Boolean(smtpSettings.sendgridApiKey);
    if (p === 'custom_webhook') return Boolean(smtpSettings.customWebhookUrl);
    return false;
  };

  const providersToTry = [primaryProvider];
  allKnownProviders.forEach(p => {
    if (p !== primaryProvider && hasCredentialsFor(p)) {
      providersToTry.push(p);
    }
  });

  const failureLogs = [];

  for (let i = 0; i < providersToTry.length; i++) {
    const providerKey = providersToTry[i];
    try {
      const outcome = await attemptTransport(providerKey);
      const isBackup = i > 0;

      await logEmailDispatch(db, {
        templateId,
        recipient: targetEmail,
        subject: renderedSubject,
        status: 'delivered',
        method: outcome.method + (isBackup ? ' (Backup Retry)' : ''),
        sender: smtpSettings.fromEmail,
        sentBy: adminEmail,
        ...(isBackup ? { fallbackNotes: `Primary provider (${primaryProvider}) failed; delivered via backup (${outcome.label})` } : {})
      });

      const messageText = isBackup
        ? `⚠️ Primary service (${primaryProvider}) failed, but live email was successfully dispatched to ${targetEmail} via backup service (${outcome.label})!`
        : `✅ Live email successfully dispatched to ${targetEmail} via ${outcome.label}!`;

      return { success: true, message: messageText };
    } catch (err) {
      console.warn(`[Email Transport] Provider '${providerKey}' failed: ${err.message}`);
      failureLogs.push(`${providerKey}: ${err.message}`);
    }
  }

  // If all tried providers failed
  await logEmailDispatch(db, {
    templateId,
    recipient: targetEmail,
    subject: renderedSubject,
    status: 'failed',
    error: failureLogs.join(' | '),
    method: primaryProvider,
    sender: smtpSettings.fromEmail,
    sentBy: adminEmail,
  });

  throw new Error(`Email dispatch failed on all attempted services: ${failureLogs.join('; ')}`);
};

/**
 * Triggers Gold Upgrade Welcome email only if the email system is currently activated.
 */
export const sendGoldUpgradeEmailIfActive = async (db, userRecord, adminEmail = 'unknown') => {
  if (!db || !userRecord) return { sent: false, reason: 'missing_user_record' };

  const targetEmail = userRecord.email || userRecord.userEmail || userRecord.recipientEmail;
  if (!targetEmail) {
    console.warn('[Email System] Missing recipient email address for upgrade email:', userRecord);
    return { sent: false, reason: 'missing_email' };
  }

  const smtpSettings = await fetchSmtpSettings(db);

  if (!smtpSettings.enabled) {
    console.warn(`[Email System] Notification system is DEACTIVATED in Admin Settings. Skipping upgrade email for ${targetEmail}.`);
    return { sent: false, reason: 'system_deactivated' };
  }

  try {
    const targetName = userRecord.name || userRecord.displayName || userRecord.userName || targetEmail.split('@')[0];

    const result = await dispatchTestEmail(
      db,
      smtpSettings,
      targetEmail,
      'gold_welcome',
      {
        userName: targetName,
        userEmail: targetEmail,
        goldStartAt: safeFormatDate(userRecord.goldStartAt || new Date()),
        expiryDate: safeFormatDate(userRecord.goldExpiry),
        planMonths: `${userRecord.goldPlanMonths || 1} Month(s)`,
      },
      adminEmail
    );
    console.log(`[Email System] Successfully dispatched GOLD Welcome Email to ${targetEmail} via ${result?.message || 'configured service'}`);
    return { sent: true, result };
  } catch (err) {
    console.error(`[Email System] GOLD upgrade email dispatch failed for ${targetEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
};

/**
 * Triggers Gold Downgrade (reverted to Standard) notice email only if the email system is currently activated.
 */
export const sendGoldDowngradeEmailIfActive = async (db, userRecord, adminEmail = 'unknown') => {
  if (!db || !userRecord) return { sent: false, reason: 'missing_user_record' };

  const targetEmail = userRecord.email || userRecord.userEmail || userRecord.recipientEmail;
  if (!targetEmail) {
    console.warn('[Email System] Missing recipient email address for downgrade email:', userRecord);
    return { sent: false, reason: 'missing_email' };
  }

  const smtpSettings = await fetchSmtpSettings(db);

  if (!smtpSettings.enabled) {
    console.warn(`[Email System] Notification system is DEACTIVATED in Admin Settings. Skipping downgrade email for ${targetEmail}.`);
    return { sent: false, reason: 'system_deactivated' };
  }

  try {
    const targetName = userRecord.name || userRecord.displayName || userRecord.userName || targetEmail.split('@')[0];
    const todayFormatted = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const rawExpiry = userRecord.priorExpiry || userRecord.goldExpiry;
    const formattedExpiry = safeFormatDate(rawExpiry, todayFormatted);

    const result = await dispatchTestEmail(
      db,
      smtpSettings,
      targetEmail,
      'gold_expired',
      {
        userName: targetName,
        userEmail: targetEmail,
        expiryDate: formattedExpiry,
      },
      adminEmail
    );
    console.log(`[Email System] Successfully dispatched GOLD Expiry/Downgrade Email to ${targetEmail} (Expired: ${formattedExpiry})`);
    return { sent: true, result };
  } catch (err) {
    console.error(`[Email System] GOLD downgrade email dispatch failed for ${targetEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
};
