// Sends support messages to the StudyNova inbox via Resend (works on Render's free plan).
// "Reply" in Gmail goes straight to the user who wrote the message.

const RESEND_URL = 'https://api.resend.com/emails';
const CATEGORY_LABEL = { bug: 'Bug', question: 'Question', idea: 'Suggestion' };
const LANGUAGE_LABEL = { en: 'English', he: 'Hebrew', ar: 'Arabic' };

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendSupportEmail(report) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUPPORT_EMAIL;
  if (!apiKey || !to) {
    console.log('Support email not configured (RESEND_API_KEY / SUPPORT_EMAIL missing) - skipped');
    return;
  }

  const category = CATEGORY_LABEL[report.category] || 'Message';
  const from = report.email || 'unknown user';
  const sentAt = new Date(report.createdAt || Date.now()).toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem' });

  const subject = `[StudyNova] ${category} from ${from}`;

  const text = [
    `${category} from ${from}`,
    '',
    report.message,
    '',
    '---',
    `Tab: ${report.page || '-'}`,
    `Language: ${LANGUAGE_LABEL[report.language] || report.language || '-'}`,
    `Sent: ${sentAt} (Israel time)`,
    `Browser: ${report.userAgent || '-'}`,
    '',
    report.email ? 'Click Reply to answer the user directly.' : 'No email address was attached.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; max-width: 600px;">
      <p style="margin: 0 0 4px; color: #5c6b4a; font-weight: bold;">StudyNova support</p>
      <h2 style="margin: 0 0 16px;">${escapeHtml(category)} from ${escapeHtml(from)}</h2>
      <div dir="auto" style="white-space: pre-wrap; padding: 14px; background: #eef1e8; border-radius: 8px; font-size: 15px; line-height: 1.5;">${escapeHtml(report.message)}</div>
      <table style="margin-top: 16px; font-size: 13px; color: #555;">
        <tr><td style="padding-right: 12px;"><b>Tab</b></td><td>${escapeHtml(report.page || '-')}</td></tr>
        <tr><td style="padding-right: 12px;"><b>Language</b></td><td>${escapeHtml(LANGUAGE_LABEL[report.language] || report.language || '-')}</td></tr>
        <tr><td style="padding-right: 12px;"><b>Sent</b></td><td>${escapeHtml(sentAt)} (Israel time)</td></tr>
        <tr><td style="padding-right: 12px;"><b>Browser</b></td><td>${escapeHtml(report.userAgent || '-')}</td></tr>
      </table>
      <p style="margin-top: 16px; font-size: 13px; color: #555;">
        ${report.email ? 'Click <b>Reply</b> to answer the user directly.' : 'No email address was attached to this message.'}
      </p>
    </div>`;

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'StudyNova Support <onboarding@resend.dev>',
      to: [to],
      reply_to: report.email || undefined,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend error ${response.status}: ${await response.text()}`);
  }
}

module.exports = { sendSupportEmail };