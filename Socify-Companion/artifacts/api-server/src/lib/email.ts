import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] ?? 587);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  const from = process.env["EMAIL_FROM"] ?? "noreply@socify.app";
  const transporter = createTransporter();

  if (!transporter) {
    logger.info({ to: opts.to, subject: opts.subject }, "[MOCK EMAIL] SMTP not configured — email logged");
    logger.info({ html: opts.html }, "[MOCK EMAIL] Content");
    return true;
  }

  try {
    const info = await transporter.sendMail({ from, ...opts });
    logger.info({ messageId: info.messageId, to: opts.to }, "Email sent");
    return true;
  } catch (err) {
    logger.error({ err, to: opts.to }, "Failed to send email");
    return false;
  }
}

export function passwordResetEmail(name: string, resetUrl: string): EmailOptions["html"] {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Reset your SOCIFY password</title></head>
    <body style="font-family:sans-serif;background:#09090B;color:#FAFAFA;padding:40px 20px;margin:0">
      <div style="max-width:480px;margin:0 auto;background:#111113;border:1px solid #27272A;border-radius:12px;padding:32px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#6366F1;border-radius:8px;padding:12px;margin-bottom:16px">
            <span style="font-size:24px;font-weight:bold;color:#fff">SOCIFY</span>
          </div>
          <h1 style="font-size:20px;font-weight:600;color:#FAFAFA;margin:0">Reset your password</h1>
        </div>
        <p style="color:#A1A1AA;font-size:14px;line-height:1.6">Hi ${name},</p>
        <p style="color:#A1A1AA;font-size:14px;line-height:1.6">
          We received a request to reset your SOCIFY password. Click the button below to create a new password.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" style="background:#6366F1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">
            Reset Password
          </a>
        </div>
        <p style="color:#71717A;font-size:12px;line-height:1.6">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;
}
