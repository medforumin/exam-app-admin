import React, { useState, useEffect } from 'react';
import {
  Mail,
  Server,
  FileText,
  Save,
  RotateCcw,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Code,
  Info,
  Shield,
  History,
  Sparkles,
  Copy,
  Check,
  Trash2,
  HelpCircle
} from 'lucide-react';
import {
  fetchSmtpSettings,
  saveSmtpSettings,
  fetchEmailTemplates,
  saveEmailTemplate,
  resetTemplateToDefault,
  dispatchTestEmail,
  fetchEmailLogs,
  deleteEmailLog,
  clearAllEmailLogs,
  EMAIL_TEMPLATE_TAGS,
  renderTemplate,
  DEFAULT_SMTP_SETTINGS
} from '../lib/emailService';
import { fetchAdminLogs, deleteAdminLog, clearAllAdminLogs } from '../lib/firebase';

export function EmailSettingsScreen({ db, currentUser }) {
  const [activeTab, setActiveTab] = useState('smtp'); // 'smtp', 'templates', 'logs'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // SMTP State
  const [smtpForm, setSmtpForm] = useState(DEFAULT_SMTP_SETTINGS);
  const [showPassword, setShowPassword] = useState(false);

  // Template State
  const [templates, setTemplates] = useState({});
  const [selectedTemplateId, setSelectedTemplateId] = useState('gold_welcome');
  const [currentTemplateForm, setCurrentTemplateForm] = useState({ subject: '', bodyHtml: '', bodyText: '' });
  const [previewMode, setPreviewMode] = useState('html'); // 'html', 'text'

  // Test Email State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState(currentUser?.email || '');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Logs State
  const [logSubTab, setLogSubTab] = useState('email'); // 'email', 'admin'
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [adminLogs, setAdminLogs] = useState([]);
  const [loadingAdminLogs, setLoadingAdminLogs] = useState(false);

  // Load Data on Mount
  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      try {
        const [settings, loadedTemplates] = await Promise.all([
          fetchSmtpSettings(db),
          fetchEmailTemplates(db),
        ]);
        setSmtpForm(settings);
        setTemplates(loadedTemplates);
        if (loadedTemplates[selectedTemplateId]) {
          setCurrentTemplateForm({ ...loadedTemplates[selectedTemplateId] });
        }
      } catch (err) {
        console.error('Error loading email settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, [db, selectedTemplateId]);

  // Update current template form when selected template changes
  useEffect(() => {
    if (templates[selectedTemplateId]) {
      setCurrentTemplateForm({ ...templates[selectedTemplateId] });
    }
  }, [selectedTemplateId, templates]);

  // Load logs when logs tab is selected
  useEffect(() => {
    async function loadLogsData() {
      setLoadingLogs(true);
      try {
        const logs = await fetchEmailLogs(db, 50);
        setEmailLogs(logs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLogs(false);
      }
    }
    if (activeTab === 'logs') {
      loadLogsData();
    }
  }, [activeTab, db]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await fetchEmailLogs(db, 50);
      setEmailLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadAdminLogsData = async () => {
    setLoadingAdminLogs(true);
    try {
      const logs = await fetchAdminLogs(50);
      setAdminLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdminLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs' && logSubTab === 'admin') {
      loadAdminLogsData();
    }
  }, [activeTab, logSubTab]);

  const handleDeleteLog = async (logId) => {
    try {
      await deleteEmailLog(db, logId);
      setEmailLogs(prev => prev.filter(item => item.id !== logId));
      setStatusMsg({ type: 'success', text: 'Log entry deleted.' });
    } catch (err) {
      console.error('Delete log failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to delete log entry: ' + err.message });
    }
  };

  const handleClearAllLogs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL email activity logs? This cannot be undone.')) return;
    setLoadingLogs(true);
    try {
      await clearAllEmailLogs(db);
      setEmailLogs([]);
      setStatusMsg({ type: 'success', text: 'All email activity logs purged successfully.' });
    } catch (err) {
      console.error('Clear all logs failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to clear logs: ' + err.message });
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDeleteAdminLog = async (logId) => {
    try {
      await deleteAdminLog(logId);
      setAdminLogs(prev => prev.filter(item => item.id !== logId));
      setStatusMsg({ type: 'success', text: 'Admin audit log entry deleted.' });
    } catch (err) {
      console.error('Delete admin log failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to delete admin log entry: ' + err.message });
    }
  };

  const handleClearAllAdminLogs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL admin audit logs? This cannot be undone.')) return;
    setLoadingAdminLogs(true);
    try {
      await clearAllAdminLogs();
      setAdminLogs([]);
      setStatusMsg({ type: 'success', text: 'All admin audit logs purged successfully.' });
    } catch (err) {
      console.error('Clear all admin logs failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to clear admin logs: ' + err.message });
    } finally {
      setLoadingAdminLogs(false);
    }
  };

  const handleSmtpSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await saveSmtpSettings(db, smtpForm, currentUser?.email || 'admin');
      setStatusMsg({ type: 'success', text: '✅ SMTP Configuration saved successfully to Firestore!' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to save SMTP settings: ' + (err.message || String(err)) });
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await saveEmailTemplate(db, selectedTemplateId, currentTemplateForm, currentUser?.email || 'admin');
      setTemplates(prev => ({
        ...prev,
        [selectedTemplateId]: { ...currentTemplateForm, id: selectedTemplateId }
      }));
      setStatusMsg({ type: 'success', text: `✅ Template "${templates[selectedTemplateId]?.title || selectedTemplateId}" saved successfully!` });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to save template: ' + (err.message || String(err)) });
    } finally {
      setSaving(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm(`Reset template "${templates[selectedTemplateId]?.title}" back to default content?`)) return;
    setSaving(true);
    try {
      const defaultData = await resetTemplateToDefault(db, selectedTemplateId, currentUser?.email || 'admin');
      setTemplates(prev => ({ ...prev, [selectedTemplateId]: defaultData }));
      setCurrentTemplateForm({ ...defaultData });
      setStatusMsg({ type: 'success', text: 'Template reset to default!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Reset failed: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const insertTagToSubject = (tag) => {
    setCurrentTemplateForm(prev => ({
      ...prev,
      subject: (prev.subject || '') + ' ' + tag,
      bodyHtml: (prev.bodyHtml || '') + ' ' + tag,
      bodyText: (prev.bodyText || '') + ' ' + tag,
    }));
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testRecipient) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const result = await dispatchTestEmail(db, smtpForm, testRecipient, selectedTemplateId, {}, currentUser?.email || 'admin');
      setTestResult({ success: true, message: result.message });
      await loadLogs();
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Failed to dispatch test email.' });
    } finally {
      setSendingTest(false);
    }
  };

  // Preview Variables Substitution
  const sampleVars = {
    userName: 'Dr. Ananya Sharma',
    userEmail: testRecipient || 'ananya.sharma@example.com',
    goldStartAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    daysRemaining: '5',
    planMonths: '3 Months',
    appTitle: 'Pediatrics PYQ Admin',
    supportEmail: smtpForm.replyTo || smtpForm.fromEmail || 'support@medforum.in',
  };

  const previewSubject = renderTemplate(currentTemplateForm.subject, sampleVars);
  const previewHtml = renderTemplate(currentTemplateForm.bodyHtml, sampleVars);
  const previewText = renderTemplate(currentTemplateForm.bodyText, sampleVars);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="animate-spin text-indigo-600 mb-3" size={40} />
        <p className="font-medium text-sm">Loading Email Settings & Templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-indigo-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 text-indigo-400 p-3 rounded-xl border border-indigo-500/30">
              <Mail size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Email & SMTP Settings</h1>
                <span className="bg-indigo-500/30 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-mono border border-indigo-400/20">v3.0.5</span>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">Manage SMTP transport credentials, customize Gold membership templates, and view dispatch logs.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 text-sm"
          >
            <Send size={16} />
            <span>Test SMTP Email</span>
          </button>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMsg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-semibold transition-all ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
          }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 bg-white p-2 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab('smtp')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'smtp'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <Server size={18} />
          <span>SMTP Configuration</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'templates'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <FileText size={18} />
          <span>Email Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <History size={18} />
          <span>Activity Logs</span>
        </button>
      </div>

      {/* ==================== TAB 1: SMTP CONFIGURATION ==================== */}
      {activeTab === 'smtp' && (
        <form onSubmit={handleSmtpSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Server className="text-indigo-600" size={20} />
                    Email Dispatcher Settings
                  </h2>
                  <p className="text-xs text-slate-500">Select your active email delivery service and configure its provider settings.</p>
                </div>
                <span className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1 rounded-full font-bold border border-indigo-200">
                  {(smtpForm.provider || (smtpForm.useAppScriptBridge ? 'apps_script' : 'smtp')).toUpperCase()}
                </span>
              </div>

              {/* Master System Activation Toggle */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${smtpForm.enabled
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-slate-100/90 border-slate-300 text-slate-700'
                }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${smtpForm.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    <h3 className="font-bold text-sm">
                      {smtpForm.enabled ? '🟢 Automated Email Notifications: ACTIVE' : '🔴 Automated Email Notifications: DEACTIVATED'}
                    </h3>
                  </div>
                  <p className="text-xs opacity-80">
                    {smtpForm.enabled
                      ? 'Upgrades, status updates, and expiry reminders will automatically dispatch email notifications.'
                      : 'Email dispatch is currently turned OFF. Upgrades proceed without sending emails.'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={smtpForm.enabled}
                    onChange={e => setSmtpForm({ ...smtpForm, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Email Service Selector Dropdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Select Active Email Service Provider</span>
                  <span className="text-[11px] text-indigo-600 font-semibold">Only selected service settings will be active & visible</span>
                </label>
                <select
                  value={smtpForm.provider || (smtpForm.useAppScriptBridge ? 'apps_script' : 'smtp')}
                  onChange={e => {
                    const newProv = e.target.value;
                    setSmtpForm({
                      ...smtpForm,
                      provider: newProv,
                      useAppScriptBridge: newProv === 'apps_script'
                    });
                  }}
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800 shadow-sm"
                >
                  <option value="apps_script">⚡ Google Apps Script Bridge (Recommended • Free Direct Gmail)</option>
                  <option value="sendpulse">✉️ SendPulse REST API (Official SendPulse Account)</option>
                  <option value="resend">🚀 Resend REST API</option>
                  <option value="brevo">📩 Brevo / Sendinblue REST API</option>
                  <option value="sendgrid">📨 SendGrid REST API</option>
                  <option value="custom_webhook">🔗 Custom Webhook / Cloud Function URL</option>
                  <option value="smtp">⚙️ Custom / Generic Direct SMTP Server</option>
                </select>
              </div>

              {/* ==================== PROVIDER CONFIGURATION CARDS ==================== */}

              {/* PROVIDER 1: GOOGLE APPS SCRIPT BRIDGE */}
              {(smtpForm.provider === 'apps_script' || (!smtpForm.provider && smtpForm.useAppScriptBridge)) && (
                <div className="space-y-4 bg-amber-50/70 p-5 rounded-2xl border border-amber-200/90 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                    <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                      <Sparkles size={18} className="text-amber-600" />
                      Google Apps Script Web App Bridge
                    </h3>
                    <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-300">
                      Bypasses CORS & Browser Limits
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Apps Script Web App URL</label>
                      <input
                        type="url"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={smtpForm.appScriptUrl || ''}
                        onChange={e => setSmtpForm({ ...smtpForm, appScriptUrl: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Security Token</label>
                      <input
                        type="text"
                        value={smtpForm.appScriptSecret || 'PYQ_SECURE_KEY_2026'}
                        onChange={e => setSmtpForm({ ...smtpForm, appScriptSecret: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono font-bold text-indigo-700"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
                    <span className="text-amber-900 font-medium">🔒 Protected with Security Token. Copy script below:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentSecret = smtpForm.appScriptSecret || 'PYQ_SECURE_KEY_2026';
                        const scriptCode = `var SECURITY_TOKEN = "${currentSecret}";
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Empty payload" })).setMimeType(ContentService.MimeType.JSON);
    }
    var payload = JSON.parse(e.postData.contents);
    if (SECURITY_TOKEN && payload.secretKey !== SECURITY_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unauthorized: Invalid Security Token" })).setMimeType(ContentService.MimeType.JSON);
    }
    var recipient = payload.to || payload.recipient;
    var subject = payload.subject || "Pediatrics PYQ Notification";
    var htmlBody = payload.htmlBody || payload.bodyHtml;
    var textBody = payload.textBody || payload.bodyText || "Please view in HTML.";
    var senderName = payload.fromName || "Pediatrics PYQ Admin";
    var requestedFrom = payload.fromEmail || payload.sender;
    if (!recipient) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing recipient" })).setMimeType(ContentService.MimeType.JSON);
    }
    var primaryEmail = Session.getActiveUser().getEmail();
    var requestedReplyTo = payload.replyTo || payload.reply_to || requestedFrom || primaryEmail;
    var opts = { htmlBody: htmlBody, name: senderName, replyTo: requestedReplyTo };
    if (requestedFrom) opts.from = requestedFrom;
    try {
      GmailApp.sendEmail(recipient, subject, textBody, opts);
    } catch (err) {
      MailApp.sendEmail({ to: recipient, subject: subject, htmlBody: htmlBody, body: textBody, name: senderName, replyTo: requestedReplyTo });
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Dispatched via " + (opts.from || primaryEmail), recipient: recipient })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status: "active", service: "Pediatrics PYQ Secure Relay" })).setMimeType(ContentService.MimeType.JSON);
}`;
                        navigator.clipboard.writeText(scriptCode);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 3000);
                      }}
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition text-xs shrink-0"
                    >
                      {copiedScript ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedScript ? 'Secure Script Copied!' : 'Copy Apps Script Code'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PROVIDER 2: SENDPULSE REST API */}
              {smtpForm.provider === 'sendpulse' && (
                <div className="space-y-4 bg-sky-50/70 p-5 rounded-2xl border border-sky-200 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-sky-200/80 pb-3">
                    <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                      <Mail size={18} className="text-sky-600" />
                      SendPulse REST API Configuration
                    </h3>
                    <span className="bg-sky-100 text-sky-900 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-sky-300">
                      OAuth2 REST API
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SendPulse API User ID (Client ID)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 8d39f4e2..."
                        value={smtpForm.sendpulseUserId || ''}
                        onChange={e => setSmtpForm({ ...smtpForm, sendpulseUserId: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SendPulse API Secret Key</label>
                      <input
                        type="password"
                        required
                        placeholder="SendPulse Secret Key..."
                        value={smtpForm.sendpulseSecret || ''}
                        onChange={e => setSmtpForm({ ...smtpForm, sendpulseSecret: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-sky-900">
                    💡 Get your API ID and Secret from <strong>SendPulse Account Settings &gt; API</strong>.
                  </p>
                </div>
              )}

              {/* PROVIDER 3: RESEND REST API */}
              {smtpForm.provider === 'resend' && (
                <div className="space-y-4 bg-purple-50/70 p-5 rounded-2xl border border-purple-200 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-purple-200/80 pb-3">
                    <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                      <Send size={18} className="text-purple-600" />
                      Resend REST API Configuration
                    </h3>
                    <span className="bg-purple-100 text-purple-900 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-300">
                      HTTPS REST API
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Resend API Key</label>
                    <input
                      type="password"
                      required
                      placeholder="re_123456789..."
                      value={smtpForm.resendApiKey || ''}
                      onChange={e => setSmtpForm({ ...smtpForm, resendApiKey: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                    />
                  </div>
                  <p className="text-xs text-purple-900">
                    💡 Obtain your API Key from your Resend Dashboard (<code className="bg-purple-100 px-1 rounded">resend.com/api-keys</code>).
                  </p>
                </div>
              )}

              {/* PROVIDER 4: BREVO (SENDINBLUE) REST API */}
              {smtpForm.provider === 'brevo' && (
                <div className="space-y-4 bg-teal-50/70 p-5 rounded-2xl border border-teal-200 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-teal-200/80 pb-3">
                    <h3 className="text-sm font-bold text-teal-950 flex items-center gap-2">
                      <Mail size={18} className="text-teal-600" />
                      Brevo (Sendinblue) REST API Configuration
                    </h3>
                    <span className="bg-teal-100 text-teal-900 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-teal-300">
                      HTTPS v3 REST API
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Brevo API Key</label>
                    <input
                      type="password"
                      required
                      placeholder="xkeysib-..."
                      value={smtpForm.brevoApiKey || ''}
                      onChange={e => setSmtpForm({ ...smtpForm, brevoApiKey: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                    />
                  </div>
                  <p className="text-xs text-teal-900">
                    💡 Obtain your API Key from Brevo Dashboard (&gt; SMTP & API &gt; API Keys).
                  </p>
                </div>
              )}

              {/* PROVIDER 5: SENDGRID REST API */}
              {smtpForm.provider === 'sendgrid' && (
                <div className="space-y-4 bg-blue-50/70 p-5 rounded-2xl border border-blue-200 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
                    <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                      <Server size={18} className="text-blue-600" />
                      SendGrid REST API Configuration
                    </h3>
                    <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-300">
                      v3 Web API
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SendGrid API Key</label>
                    <input
                      type="password"
                      required
                      placeholder="SG.123456789..."
                      value={smtpForm.sendgridApiKey || ''}
                      onChange={e => setSmtpForm({ ...smtpForm, sendgridApiKey: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                    />
                  </div>
                  <p className="text-xs text-blue-900">
                    💡 Generate an API key with Mail Send permissions from SendGrid Settings.
                  </p>
                </div>
              )}

              {/* PROVIDER 6: CUSTOM WEBHOOK / CLOUD FUNCTION */}
              {smtpForm.provider === 'custom_webhook' && (
                <div className="space-y-4 bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-indigo-200/80 pb-3">
                    <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                      <Code size={18} className="text-indigo-600" />
                      Custom Webhook / Cloud Function Endpoint
                    </h3>
                    <span className="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-300">
                      POST Webhook
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Custom Webhook Endpoint URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://us-central1-yourproject.cloudfunctions.net/sendEmail"
                      value={smtpForm.customWebhookUrl || ''}
                      onChange={e => setSmtpForm({ ...smtpForm, customWebhookUrl: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                    />
                  </div>
                  <p className="text-xs text-indigo-900">
                    💡 Dispatches standard JSON POST payload with recipient, subject, htmlBody, and sender parameters.
                  </p>
                </div>
              )}

              {/* PROVIDER 7: CUSTOM / GENERIC DIRECT SMTP */}
              {(smtpForm.provider === 'smtp' || (!smtpForm.provider && !smtpForm.useAppScriptBridge)) && (
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Server size={18} className="text-indigo-600" />
                      Generic / Direct SMTP Server Credentials
                    </h3>
                    <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                      Standard Socket SMTP
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SMTP Host</label>
                      <input
                        type="text"
                        required
                        placeholder="smtp.gmail.com"
                        value={smtpForm.smtpHost}
                        onChange={e => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SMTP Port</label>
                      <input
                        type="number"
                        required
                        placeholder="587"
                        value={smtpForm.smtpPort}
                        onChange={e => setSmtpForm({ ...smtpForm, smtpPort: Number(e.target.value) })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <input
                      type="checkbox"
                      id="secureToggle"
                      checked={smtpForm.secure}
                      onChange={e => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="secureToggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Use Secure SSL/TLS (Enable for port 465, uncheck for port 587 STARTTLS)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SMTP Username / Auth Email</label>
                      <input
                        type="text"
                        placeholder="pediatrics@e.dnbpedia.in"
                        value={smtpForm.authUser}
                        onChange={e => setSmtpForm({ ...smtpForm, authUser: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase">SMTP Password / App Key</label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-xs text-indigo-600 font-semibold hover:underline"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••••••"
                        value={smtpForm.authPass}
                        onChange={e => setSmtpForm({ ...smtpForm, authPass: e.target.value })}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* COMMON SENDER IDENTITY DEFAULTS */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Mail size={16} className="text-indigo-600" />
                  Sender Identity Defaults (Applied to all providers)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">From Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="pediatrics@e.dnbpedia.in"
                      value={smtpForm.fromEmail}
                      onChange={e => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">From Sender Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Pediatrics PYQ Team"
                      value={smtpForm.fromName}
                      onChange={e => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reply-To Email</label>
                    <input
                      type="email"
                      placeholder="pediatrics@e.dnbpedia.in"
                      value={smtpForm.replyTo || ''}
                      onChange={e => setSmtpForm({ ...smtpForm, replyTo: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Admin Alert Recipient Email</label>
                    <input
                      type="email"
                      placeholder="pyq@dnbpedia.in"
                      value={smtpForm.adminNotificationEmail || ''}
                      onChange={e => setSmtpForm({ ...smtpForm, adminNotificationEmail: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all disabled:opacity-70"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>Save Email Configuration</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Info Box */}
          <div className="space-y-6">
            <div className="bg-indigo-50/60 p-6 rounded-2xl border border-indigo-100 text-slate-700 space-y-4">
              <h3 className="font-bold text-indigo-950 flex items-center gap-2">
                <HelpCircle size={18} className="text-indigo-600" />
                Active Provider Setup Guide
              </h3>

              {(!smtpForm.provider || smtpForm.provider === 'apps_script' || smtpForm.useAppScriptBridge) && (
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-indigo-950">Google Apps Script Bridge (Free Delivery):</p>
                  <ol className="space-y-1.5 list-decimal list-inside text-slate-700 font-medium">
                    <li>Open <strong>script.google.com</strong> and create a new project.</li>
                    <li>Click <strong>Copy Apps Script Code</strong> button on left card and paste into the editor.</li>
                    <li>Click <strong>Deploy &gt; New deployment &gt; Web app</strong>.</li>
                    <li>Set <i>Execute as</i>: <strong>Me</strong>, <i>Who has access</i>: <strong>Anyone</strong>.</li>
                    <li>Copy Web App URL into the Apps Script Web App URL field above.</li>
                  </ol>
                </div>
              )}

              {smtpForm.provider === 'sendpulse' && (
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-indigo-950">SendPulse REST API Setup:</p>
                  <ol className="space-y-1.5 list-decimal list-inside text-slate-700 font-medium">
                    <li>Log in to your <strong>SendPulse Account</strong>.</li>
                    <li>Go to <strong>Account Settings &gt; API</strong> tab.</li>
                    <li>Activate REST API and copy your <strong>API User ID</strong> and <strong>Secret</strong>.</li>
                    <li>Ensure your Sender Email address is verified in SendPulse Service Settings.</li>
                  </ol>
                </div>
              )}

              {smtpForm.provider === 'resend' && (
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-indigo-950">Resend REST API Setup:</p>
                  <ol className="space-y-1.5 list-decimal list-inside text-slate-700 font-medium">
                    <li>Log in to <strong>resend.com</strong> and generate an API key.</li>
                    <li>Add your sending domain or use a verified address.</li>
                    <li>Paste the API key starting with <code className="bg-white px-1 rounded font-mono">re_</code> above.</li>
                  </ol>
                </div>
              )}

              {smtpForm.provider === 'smtp' && (
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-indigo-950">Gmail / Direct SMTP Setup:</p>
                  <ol className="space-y-1.5 list-decimal list-inside text-slate-700 font-medium">
                    <li>Enable 2-Step Verification on your Google Account.</li>
                    <li>Generate an <strong>App Password</strong> in Google Security.</li>
                    <li>Set Host to <code className="bg-white px-1 rounded font-mono">smtp.gmail.com</code>, Port to <code className="bg-white px-1 rounded font-mono">587</code>.</li>
                    <li>Paste the 16-character App Password above.</li>
                  </ol>
                </div>
              )}

              {(smtpForm.provider === 'brevo' || smtpForm.provider === 'sendgrid' || smtpForm.provider === 'custom_webhook') && (
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-indigo-950">Modern HTTP API Delivery:</p>
                  <p className="text-slate-700">
                    HTTP REST APIs run directly over standard HTTPS requests and bypass browser TCP socket limitations.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={16} className="text-amber-600" /> Security Note
              </h4>
              <p className="text-xs leading-relaxed text-amber-800">
                SMTP configurations are stored securely in Firestore under <code className="font-mono bg-amber-100 px-1 rounded">/systemConfig/emailSettings</code> and are restricted strictly to authorized Admin roles.
              </p>
            </div>
          </div>
        </form>
      )}

      {/* ==================== TAB 2: EMAIL TEMPLATES EDITOR ==================== */}
      {activeTab === 'templates' && (
        <form onSubmit={handleTemplateSave} className="space-y-6">
          {/* Template Selector Chips */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Email Notification Event</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(templates).map(tId => {
                  const t = templates[tId];
                  const isActive = tId === selectedTemplateId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setSelectedTemplateId(tId)}
                      title={t?.title || tId}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${isActive
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      {tId === 'gold_welcome' && <span>🚀 Standard → GOLD Upgrade</span>}
                      {tId === 'gold_reminder_3_7_days' && <span>⏳ 3–7 Day Expiry Reminder</span>}
                      {tId === 'gold_expired' && <span>🔴 GOLD Membership Expired</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetTemplate}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <RotateCcw size={14} />
                <span>Reset Default</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                <span>Save Template</span>
              </button>
            </div>
          </div>

          {/* Placeholder Variable Tag Insertion Box */}
          <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-md border border-indigo-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-2">
                <Code size={16} /> Dynamic Placeholder Variables (Click to copy/insert)
              </h4>
              <span className="text-[11px] text-indigo-300">Clicking tag appends to subject and body</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {EMAIL_TEMPLATE_TAGS.map(item => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertTagToSubject(item.tag)}
                  title={`${item.label} (e.g. ${item.example})`}
                  className="bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 border border-indigo-700/60 px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 group"
                >
                  <span className="font-bold text-amber-300">{item.tag}</span>
                  <span className="text-[10px] text-indigo-300 group-hover:text-white">({item.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Split Screen Editor & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Form Editor */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-800 text-base flex items-center justify-between border-b border-slate-100 pb-3">
                <span>Template Editor</span>
                <span className="text-xs text-indigo-600 font-medium">{templates[selectedTemplateId]?.title}</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Subject Line</label>
                <input
                  type="text"
                  required
                  value={currentTemplateForm.subject}
                  onChange={e => setCurrentTemplateForm({ ...currentTemplateForm, subject: e.target.value })}
                  placeholder="Subject line with {{userName}} variables..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">HTML Email Body</label>
                  <span className="text-[11px] text-slate-400">Supports inline HTML styles</span>
                </div>
                <textarea
                  rows={12}
                  required
                  value={currentTemplateForm.bodyHtml}
                  onChange={e => setCurrentTemplateForm({ ...currentTemplateForm, bodyHtml: e.target.value })}
                  className="w-full p-3 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Plain Text Fallback Body</label>
                <textarea
                  rows={4}
                  required
                  value={currentTemplateForm.bodyText}
                  onChange={e => setCurrentTemplateForm({ ...currentTemplateForm, bodyText: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                />
              </div>
            </div>

            {/* Right Column: Live Rendered Email Preview */}
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Eye size={18} className="text-indigo-600" />
                  Live Preview Output
                </h3>
                <div className="flex bg-white p-1 rounded-lg border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('html')}
                    className={`px-3 py-1 rounded-md transition ${previewMode === 'html' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                  >
                    HTML View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('text')}
                    className={`px-3 py-1 rounded-md transition ${previewMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                  >
                    Plain Text
                  </button>
                </div>
              </div>

              {/* Email Envelope Frame */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-3.5 space-y-1">
                  <p className="text-xs text-slate-500"><strong className="text-slate-700">From:</strong> {smtpForm.fromName} &lt;{smtpForm.fromEmail}&gt;</p>
                  <p className="text-xs text-slate-500"><strong className="text-slate-700">To:</strong> {sampleVars.userName} &lt;{sampleVars.userEmail}&gt;</p>
                  <p className="text-sm font-bold text-slate-900 pt-1"><strong className="text-slate-500 font-normal">Subject:</strong> {previewSubject}</p>
                </div>

                <div className="p-4 overflow-y-auto max-h-[500px] bg-white">
                  {previewMode === 'html' ? (
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-xs font-mono text-slate-700">{previewText}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ==================== TAB 3: ACTIVITY LOGS & AUDIT ==================== */}
      {activeTab === 'logs' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {/* Sub-tab Selector Chips */}
          <div className="flex border-b border-slate-200 gap-2 pb-3">
            <button
              onClick={() => setLogSubTab('email')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${logSubTab === 'email'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              <Mail size={16} />
              <span>Email Dispatch Logs (/emailLogs)</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">{emailLogs.length}</span>
            </button>

            <button
              onClick={() => setLogSubTab('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${logSubTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              <Shield size={16} />
              <span>Admin System Audit Logs (/adminLogs)</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">{adminLogs.length}</span>
            </button>
          </div>

          {/* SUB-TAB 1: EMAIL DISPATCH LOGS */}
          {logSubTab === 'email' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <History className="text-indigo-600" size={18} />
                    Email Dispatch Activity Logs
                  </h2>
                  <p className="text-xs text-slate-500">History of test dispatches, automated reminder notifications, and upgrade emails.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadLogs}
                    disabled={loadingLogs}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition"
                  >
                    {loadingLogs ? <Loader2 className="animate-spin" size={14} /> : <RotateCcw size={14} />}
                    <span>Refresh Logs</span>
                  </button>

                  {emailLogs.length > 0 && (
                    <button
                      onClick={handleClearAllLogs}
                      disabled={loadingLogs}
                      className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                      <span>Clear All Email Logs</span>
                    </button>
                  )}
                </div>
              </div>

              {emailLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Mail size={36} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No email logs recorded yet.</p>
                  <p className="text-xs">Send a test email to verify logging in Firestore.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase">
                        <th className="p-3">Sent At</th>
                        <th className="p-3">Event / Template</th>
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {emailLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                            {log.sentAt ? new Date(log.sentAt).toLocaleString('en-IN') : 'Just now'}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono text-[11px]">
                              {log.templateId || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-900">{log.recipient}</td>
                          <td className="p-3 text-slate-700 truncate max-w-xs">{log.subject}</td>
                          <td className="p-3 text-slate-500 font-mono">{log.method || 'SMTP'}</td>
                          <td className="p-3">
                            {log.status === 'delivered' || log.status === 'simulated_success' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                                <CheckCircle2 size={12} /> {log.status === 'simulated_success' ? 'Verified (Test)' : 'Delivered'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                                <XCircle size={12} /> Failed
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              title="Delete log entry"
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition inline-flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: ADMIN SYSTEM AUDIT LOGS */}
          {logSubTab === 'admin' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="text-amber-600" size={18} />
                    Admin System Audit Trail (/adminLogs)
                  </h2>
                  <p className="text-xs text-slate-500">History of administrative configuration updates, role edits, and template modifications.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadAdminLogsData}
                    disabled={loadingAdminLogs}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition"
                  >
                    {loadingAdminLogs ? <Loader2 className="animate-spin" size={14} /> : <RotateCcw size={14} />}
                    <span>Refresh Admin Logs</span>
                  </button>

                  {adminLogs.length > 0 && (
                    <button
                      onClick={handleClearAllAdminLogs}
                      disabled={loadingAdminLogs}
                      className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                      <span>Clear All Admin Logs</span>
                    </button>
                  )}
                </div>
              </div>

              {adminLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Shield size={36} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No admin audit logs recorded yet.</p>
                  <p className="text-xs">Administrative actions will automatically log events here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase">
                        <th className="p-3">Logged At</th>
                        <th className="p-3">Event Type</th>
                        <th className="p-3">Admin Email</th>
                        <th className="p-3">Audit Details</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminLogs.map(log => {
                        let dateStr = 'Just now';
                        if (log.createdAt?.seconds) {
                          dateStr = new Date(log.createdAt.seconds * 1000).toLocaleString('en-IN');
                        } else if (log.createdAt) {
                          dateStr = new Date(log.createdAt).toLocaleString('en-IN');
                        }

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{dateStr}</td>
                            <td className="p-3 font-semibold text-slate-800">
                              <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold">
                                {log.eventType || 'admin_action'}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-slate-900">{log.adminEmail || 'Admin'}</td>
                            <td className="p-3 text-slate-700 max-w-md">
                              <pre className="text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                {JSON.stringify(log.details || {}, null, 2)}
                              </pre>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteAdminLog(log.id)}
                                title="Delete admin audit log entry"
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition inline-flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== TEST EMAIL DISPATCH MODAL ==================== */}
      {showTestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send size={20} className="text-indigo-600" />
                Dispatch Test Email
              </h3>
              <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Template to Test</label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                >
                  <option value="gold_welcome">Standard → GOLD Upgrade Welcome</option>
                  <option value="gold_reminder_3_7_days">3–7 Day Expiry Reminder</option>
                  <option value="gold_expired">GOLD Membership Expired Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Recipient Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={testRecipient}
                  onChange={e => setTestRecipient(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl border text-xs font-semibold space-y-1 ${testResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
                  }`}>
                  <p className="flex items-center gap-1.5 font-bold">
                    {testResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {testResult.message}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition text-xs disabled:opacity-70"
                >
                  {sendingTest ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  <span>Send Test Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
