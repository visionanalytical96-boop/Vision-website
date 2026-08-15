import 'server-only';

/**
 * Outgoing email.
 *
 * nodemailer is loaded at point of use rather than imported at module scope:
 * it drags in a large tree that every route touching this file's callers would
 * otherwise pull into the build, and mail is sent on a handful of paths.
 *
 * When SMTP is not configured this reports that plainly instead of pretending
 * to send. A password reset that silently goes nowhere is worse than one that
 * says it could not be sent — the person waits for an email that will never
 * arrive, and nothing in the logs says why.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailResult {
  sent: boolean;
  error?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim() ?? process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) return null;

  // 465 is implicit TLS; 587 upgrades with STARTTLS. Getting this wrong is the
  // usual reason a correct username and password still fail to connect.
  const port = Number(process.env.SMTP_PORT ?? 465);

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || user,
  };
}

export function isMailConfigured(): boolean {
  return readSmtpConfig() !== null;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = readSmtpConfig();

  if (!config) {
    console.error(
      'Mail not sent: SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD.',
    );
    return { sent: false, error: 'Email is not configured on this server.' };
  }

  try {
    const nodemailer = (await import('nodemailer')).default;

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });

    await transporter.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return { sent: true };
  } catch (error) {
    // The reason matters and is usually specific — wrong port, app password
    // not created, relay refused. Logging it is the difference between a
    // five-minute fix and an afternoon.
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Mail to ${message.to} failed: ${reason}`);
    return { sent: false, error: 'The email could not be sent. Please try again shortly.' };
  }
}

/** The reset email. Plain text as well as HTML, because some clients show only the former. */
export function passwordResetEmail(params: {
  companyName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): { subject: string; text: string; html: string } {
  const { companyName, resetUrl, expiresInMinutes } = params;

  return {
    subject: `Reset your ${companyName} password`,
    text: [
      `Someone asked to reset the password for your ${companyName} account.`,
      '',
      'Open this link to choose a new one:',
      resetUrl,
      '',
      `The link works once and expires in ${expiresInMinutes} minutes.`,
      '',
      "If this wasn't you, ignore this email — your password stays as it is.",
    ].join('\n'),
    html: `
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#131a23">
  <h1 style="font-size:20px;margin:0 0 16px">Reset your password</h1>
  <p style="margin:0 0 16px;line-height:1.6">
    Someone asked to reset the password for your ${companyName} account.
  </p>
  <p style="margin:0 0 24px">
    <a href="${resetUrl}"
       style="display:inline-block;background:#0b5fa5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
      Choose a new password
    </a>
  </p>
  <p style="margin:0 0 16px;line-height:1.6;color:#667585;font-size:14px">
    The link works once and expires in ${expiresInMinutes} minutes.
  </p>
  <p style="margin:0;line-height:1.6;color:#667585;font-size:14px">
    If this wasn't you, ignore this email — your password stays as it is.
  </p>
</div>`.trim(),
  };
}
