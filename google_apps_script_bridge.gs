/**
 * ==============================================================================
 * SECURE GOOGLE APPS SCRIPT MULTI-ALIAS EMAIL RELAY FOR PEDIATRICS PYQ ADMIN PORTAL
 * ==============================================================================
 * Primary Account: pediatrics@in.acrosspg.com
 * Security:        Protected with Secret Authentication Token check
 * Purpose: Allows the Admin Portal web app to send HTML transactional emails 
 *          from ANY of your account aliases securely without unauthorized access.
 * ==============================================================================
 */

// SECURITY AUTHENTICATION TOKEN (Must match Security Token in Admin App)
var SECURITY_TOKEN = "PYQ_SECURE_KEY_2026"; 

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Empty payload" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);

    // SECURITY CHECK: Verify secret key before allowing email dispatch
    if (SECURITY_TOKEN && payload.secretKey !== SECURITY_TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Unauthorized: Invalid Security Token" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var recipient = payload.to || payload.recipient;
    var subject = payload.subject || "Pediatrics PYQ Notification";
    var htmlBody = payload.htmlBody || payload.bodyHtml;
    var textBody = payload.textBody || payload.bodyText || "Please view this email in an HTML compatible client.";
    var senderName = payload.fromName || "Pediatrics PYQ Admin";
    var requestedFrom = payload.fromEmail || payload.sender;

    if (!recipient) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Missing recipient email" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Fetch all valid aliases configured on this Google Workspace account
    var activeAliases = [];
    try {
      activeAliases = GmailApp.getAliases();
    } catch (aliasFetchErr) {
      // ignore fetch error
    }

    var primaryEmail = Session.getActiveUser().getEmail();
    var requestedReplyTo = payload.replyTo || payload.reply_to || requestedFrom || primaryEmail;

    var mailOptions = {
      htmlBody: htmlBody,
      name: senderName,
      replyTo: requestedReplyTo,
    };

    // If requested sender email is specified, set as 'from'
    if (requestedFrom) {
      mailOptions.from = requestedFrom;
    }

    // Dispatch using GmailApp (supports sending from all authorized account aliases)
    try {
      GmailApp.sendEmail(recipient, subject, textBody, mailOptions);
    } catch (aliasErr) {
      // Fallback to MailApp if alias send fails or isn't listed
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: htmlBody,
        body: textBody,
        name: senderName,
        replyTo: requestedReplyTo
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "Email dispatched successfully via " + (mailOptions.from || primaryEmail),
        recipient: recipient,
        senderUsed: mailOptions.from || primaryEmail
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "active",
      service: "Pediatrics PYQ Admin Secure Multi-Alias Email Relay",
      security: "Token Authentication Enabled"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
