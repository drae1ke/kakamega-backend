import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host:   config.email.host,
  port:   config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// ─── Template renderer ────────────────────────────────────────────────────────

const renderTemplate = (template, data) => {
  const base = (content) => `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="background:#065f38;padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Kakamega County Services</h1>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Official County Government Portal</p>
      </div>
      <div style="padding:32px;">
        ${content}
      </div>
      <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
        This is an automated message from Kakamega County Services Portal. Do not reply to this email.
      </div>
    </div>
  `;

  const pill = (text, color = '#065f38') =>
    `<span style="display:inline-block;background:${color};color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${text}</span>`;

  const row = (label, value) =>
    `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:160px;">${label}</td><td style="padding:8px 0;color:#111;font-size:13px;font-weight:500;">${value}</td></tr>`;

  switch (template) {

    // ── Sent to citizen when complaint is received ─────────────────────────
    case 'complaintConfirmation':
      return base(`
        <p style="color:#111;font-size:16px;font-weight:600;">Dear ${data.name},</p>
        <p style="color:#374151;line-height:1.6;">
          Your complaint has been received and logged in our system. Our team will review it and take appropriate action.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">Your Tracking Number</p>
          <p style="margin:0;font-size:28px;font-family:monospace;font-weight:700;color:#065f38;">${data.trackingNumber}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          ${row('Category', data.category)}
          ${row('Location', data.location)}
        </table>
        <p style="color:#374151;line-height:1.6;margin-top:20px;">
          Use your tracking number to check the status of your complaint at any time on our portal.
        </p>
        <a href="${config.portalUrl || 'http://localhost:5173'}/track"
           style="display:inline-block;background:#065f38;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px;">
          Track Your Complaint
        </a>
      `);

    // ── Sent to citizen when complaint status changes ──────────────────────
    case 'complaintUpdate':
      return base(`
        <p style="color:#111;font-size:16px;font-weight:600;">Dear ${data.name},</p>
        <p style="color:#374151;line-height:1.6;">
          There's an update on your complaint <strong>${data.trackingNumber}</strong>.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">New Status</p>
          ${pill(data.status.replace('-', ' ').toUpperCase(), data.status === 'resolved' ? '#065f38' : '#f59e0b')}
          ${data.feedback ? `<p style="margin:16px 0 0;color:#374151;font-size:14px;line-height:1.6;">${data.feedback}</p>` : ''}
        </div>
        <a href="${config.portalUrl || 'http://localhost:5173'}/track"
           style="display:inline-block;background:#065f38;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          View Full Status
        </a>
      `);

    // ── Sent to new staff member when admin creates their account ──────────
    case 'staffWelcome':
      return base(`
        <p style="color:#111;font-size:16px;font-weight:600;">Welcome, ${data.name}!</p>
        <p style="color:#374151;line-height:1.6;">
          A staff account has been created for you on the Kakamega County Services Portal by <strong>${data.createdBy}</strong>.
        </p>
        <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#854d0e;">⚠️ Temporary Credentials — Change on First Login</p>
          <table style="width:100%;border-collapse:collapse;">
            ${row('Portal URL', `<a href="${data.portalUrl}" style="color:#065f38;">${data.portalUrl}</a>`)}
            ${row('Email', data.email)}
            ${row('Temporary Password', `<code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-family:monospace;">${data.temporaryPassword}</code>`)}
            ${row('Role', pill(data.role.toUpperCase()))}
          </table>
        </div>
        <p style="color:#374151;line-height:1.6;">
          You will be asked to change your password on first login. Please keep your credentials secure and do not share them.
        </p>
        <a href="${data.portalUrl}"
           style="display:inline-block;background:#065f38;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Login to Portal
        </a>
      `);

    // ── Application confirmation ───────────────────────────────────────────
    case 'applicationConfirmation':
      return base(`
        <p style="color:#111;font-size:16px;font-weight:600;">Dear ${data.name},</p>
        <p style="color:#374151;line-height:1.6;">
          Your application for <strong>${data.serviceName}</strong> has been received.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">Application Number</p>
          <p style="margin:0;font-size:24px;font-family:monospace;font-weight:700;color:#065f38;">${data.applicationId}</p>
        </div>
        ${data.fee > 0
          ? `<p style="color:#374151;"><strong>Application Fee:</strong> KES ${Number(data.fee).toLocaleString()}</p>`
          : '<p style="color:#374151;">No application fee required for this service.</p>'
        }
        <a href="${config.portalUrl || 'http://localhost:5173'}/track"
           style="display:inline-block;background:#065f38;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px;">
          Track Application
        </a>
      `);

    // ── Application status update ─────────────────────────────────────────
    case 'applicationStatusUpdate':
      return base(`
        <p style="color:#111;font-size:16px;font-weight:600;">Dear ${data.name},</p>
        <p style="color:#374151;line-height:1.6;">
          Your application for <strong>${data.serviceName}</strong> (${data.applicationId}) has been updated.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;">
          ${pill(data.status.replace('-', ' ').toUpperCase())}
          ${data.remarks ? `<p style="margin:12px 0 0;color:#374151;font-size:14px;">${data.remarks}</p>` : ''}
        </div>
        <a href="${config.portalUrl || 'http://localhost:5173'}/track"
           style="display:inline-block;background:#065f38;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Track Application
        </a>
      `);

    // ── Generic fallback ──────────────────────────────────────────────────
    default:
      return base(`
        <p style="color:#374151;line-height:1.6;">
          Dear ${data.name || 'User'},<br/><br/>
          ${data.message || 'You have a new notification from Kakamega County Services.'}
        </p>
      `);
  }
};

// ─── sendEmail ────────────────────────────────────────────────────────────────

export const sendEmail = async ({ email, subject, template, data }) => {
  try {
    const html = renderTemplate(template, data);

    await transporter.sendMail({
      from:    `"Kakamega County" <${config.email.user}>`,
      to:      email,
      subject,
      html,
    });
  } catch (error) {
    // Log but never throw - email failure should never break request flow
    console.error(`Email failed [${template}] to ${email}:`, error.message);
  }
};