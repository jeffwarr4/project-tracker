'use strict';

require('dotenv').config();
const { Resend } = require('resend');

let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const EMAILS = {
  jeff:    () => process.env.EMAIL_JEFF,
  partner: () => process.env.EMAIL_PARTNER,
  both:    () => [process.env.EMAIL_JEFF, process.env.EMAIL_PARTNER].filter(Boolean),
};

// --- HTML template -------------------------------------------------------

function html(title, headerColor = '#6366f1', rows = [], extra = '', subtitle = '') {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px;vertical-align:top">${label}</td>
      <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500">${value}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="background:${headerColor};padding:20px 24px">
      <p style="margin:0 0 4px;color:rgba(255,255,255,.75);font-size:12px;letter-spacing:.05em;text-transform:uppercase">Project Tracker</p>
      <h1 style="margin:0;color:white;font-size:20px;font-weight:700;line-height:1.3">${title}</h1>
      ${subtitle ? `<p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:15px;font-weight:600">${subtitle}</p>` : ''}
    </div>
    <div style="padding:24px">
      ${rowsHtml ? `<table style="width:100%;border-collapse:collapse">${rowsHtml}</table>` : ''}
      ${extra}
    </div>
    <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;color:#9ca3af;font-size:11px">Sent automatically by Project Tracker · Do not reply</p>
    </div>
  </div>
</body></html>`;
}

// --- Send helpers --------------------------------------------------------

async function send(to, subject, htmlBody) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email.');
    return;
  }
  const { error } = await getResend().emails.send({
    from: 'Project Tracker <notifications@mail.good-yute.com>',
    to:   Array.isArray(to) ? to : [to],
    subject,
    html: htmlBody,
  });
  if (error) throw new Error(error.message);
}

// --- Notification functions (fire-and-forget safe) -----------------------

async function notifyNewProject(project, senderName) {
  const subject = `[Project Tracker] New project: ${project.projectName || project.name}`;
  const body = html(
    `New project created`,
    '#059669',
    [
      ['Project',     project.projectName || project.name],
      ['Client',      project.clientName  || project.client || 'N/A'],
      ['Created by',  senderName],
      ['Est. hours',  project.estimatedHours ? `${project.estimatedHours}h` : 'Not set'],
      ['Project ID',  project.id],
    ],
    project.description
      ? `<p style="margin:16px 0 0;padding:12px;background:#f0fdf4;border-radius:8px;font-size:13px;color:#374151">${project.description}</p>`
      : ''
  );
  await send(EMAILS.both(), subject, body);
}

async function notifyProjectUpdate(projectId, projectName, updates, senderName) {
  const subject = `[Project Tracker] Updated: ${projectName}`;
  const changeRows = Object.entries(updates)
    .filter(([k]) => !['projectId', 'projectName'].includes(k))
    .map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').toLowerCase(), Array.isArray(v) ? v.join(', ') : String(v)]);

  const body = html(
    `Project updated`,
    '#d97706',
    [
      ['Project',    projectName],
      ['Project ID', projectId],
      ['Updated by', senderName],
      ...changeRows,
    ]
  );
  await send(EMAILS.both(), subject, body);
}

async function notifyTimeLog(projectId, projectName, hours, description, senderName, totalHours) {
  const subject = `[Project Tracker] ${hours}h logged on ${projectName}`;
  const body = html(
    `Time logged`,
    '#2563eb',
    [
      ['Project',    projectName],
      ['Project ID', projectId],
      ['Hours',      `${hours}h`],
      ['Total logged',`${totalHours}h`],
      ['Logged by',  senderName],
      ['Work done',  description || '—'],
    ]
  );
  await send(EMAILS.both(), subject, body);
}

async function notifyCollaborationMessage(projectId, projectName, message, senderName, recipientEmail) {
  const subject = `[Project Tracker] Message from ${senderName}: ${projectName}`;
  const body = html(
    `Message from ${senderName}`,
    '#6366f1',
    [
      ['Project',    projectName],
      ['Project ID', projectId || '—'],
      ['From',       senderName],
    ],
    `<div style="margin-top:16px;padding:14px;background:#eef2ff;border-radius:10px;border-left:3px solid #6366f1">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${message.replace(/\n/g, '<br>')}</p>
    </div>`
  );
  await send(recipientEmail, subject, body);
}

async function sendWeeklyDigest(weekLabel, groups, totalHours) {
  const subject = `[Project Tracker] Weekly time log — ${weekLabel}`;

  const projectsHtml = groups.map(group => {
    const rows = group.entries
      .slice().sort((a, b) => a.date.localeCompare(b.date))
      .map(e => `
        <tr>
          <td style="padding:3px 0;color:#6b7280;font-size:12px;width:82px;vertical-align:top">${e.date}</td>
          <td style="padding:3px 0;color:#2563eb;font-size:13px;font-weight:600;width:36px;vertical-align:top">${e.hours}h</td>
          <td style="padding:3px 0;color:#374151;font-size:13px;vertical-align:top">${e.description || '—'}</td>
          <td style="padding:3px 0;color:#9ca3af;font-size:12px;text-align:right;white-space:nowrap;vertical-align:top">${e.loggedBy}</td>
        </tr>`).join('');

    return `
      <div style="margin-bottom:20px">
        <div style="font-size:14px;font-weight:600;color:#111827;padding-bottom:6px;border-bottom:1px solid #e5e7eb;margin-bottom:8px">
          ${group.name}
          <span style="font-weight:400;color:#6b7280;margin-left:6px">${Math.round(group.totalHours * 10) / 10}h</span>
        </div>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>`;
  }).join('');

  const extra = `
    <div style="margin-top:4px">
      ${projectsHtml}
      <div style="border-top:2px solid #e5e7eb;padding-top:10px;text-align:right">
        <span style="font-size:14px;font-weight:700;color:#111827">${totalHours}h total unreported</span>
      </div>
    </div>`;

  const body = html('Weekly time log', '#2563eb', [], extra, `${totalHours}h across ${groups.length} project${groups.length !== 1 ? 's' : ''}`);
  await send(EMAILS.both(), subject, body);
}

async function sendHealthAlert(failures) {
  const subject = `[Project Tracker] Health check failed (${failures.length} check${failures.length !== 1 ? 's' : ''})`;
  const rows = failures.map(f => [f.name, f.error]);
  const body = html('Health check failed', '#dc2626', rows, '', 'One or more pipeline checks did not pass');
  await send(EMAILS.jeff(), subject, body);
}

module.exports = {
  notifyNewProject,
  notifyProjectUpdate,
  notifyTimeLog,
  notifyCollaborationMessage,
  sendWeeklyDigest,
  sendHealthAlert,
};
