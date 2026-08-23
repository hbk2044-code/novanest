import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "NovaNest <no-reply@novanest.local>";

const configured = Boolean(SMTP_HOST);

let transport = null;
if (configured) {
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

export function isMailConfigured() {
  return configured;
}

export async function sendMail({ to, subject, text, html }) {
  const mail = { from: MAIL_FROM, to, subject, text, html };
  if (configured) {
    await transport.sendMail(mail);
    return;
  }
  // Dev fallback: no SMTP configured, so the message can't actually be sent.
  // Log it so reset links remain usable locally. Never returns the content to
  // the API caller.
  console.log("\n[NovaNest:mail] SMTP not configured - dev fallback, email NOT actually sent:");
  console.log(`[NovaNest:mail] To: ${to} | Subject: ${subject}`);
  console.log(`[NovaNest:mail] Body: ${text}`);
}
