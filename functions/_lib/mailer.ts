import type { Env } from '../env';

export interface OtpCodeMail {
  to: string;
  code: string;
  purpose: 'login' | 'free_signup';
}

export async function sendOtpCode(env: Env, mail: OtpCodeMail): Promise<void> {
  if (env.DEV_OTP_DEBUG === '1') {
    if (env.PUBLIC_PRODUCTION === '1') throw new Error('dev_debug_in_production');
    console.log('[DEV] OTP code for', mail.to, mail.code);
    return;
  }

  const brandName = env.MAIL_FROM_NAME?.trim();
  if (!brandName) throw new Error('MAIL_FROM_NAME is not configured');

  const context = mail.purpose === 'free_signup'
    ? 'deinen kostenlosen Zugang zu aktivieren'
    : 'dich anzumelden';
  await sendViaResend(env, {
    to: mail.to,
    subject: `Dein ${brandName}-Bestaetigungscode`,
    text: otpCodeText(mail.code, brandName, context),
    html: otpCodeHtml(mail.code, brandName, context),
  });
}

interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function sendViaResend(env: Env, args: SendArgs): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const from = `${env.MAIL_FROM_NAME} <${env.MAIL_FROM}>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      text: args.text,
      html: args.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const requestId =
      res.headers.get('resend-request-id') ??
      res.headers.get('x-request-id') ??
      res.headers.get('cf-ray') ??
      'unknown';
    const diagnostic = {
      status: res.status,
      statusText: res.statusText,
      requestId,
      from,
      toDomain: args.to.split('@')[1] ?? 'unknown',
      body: body.slice(0, 1000),
    };
    console.error('resend_send_failed', diagnostic);
    throw new Error(`Resend send failed (${res.status} ${res.statusText}) requestId=${requestId}: ${body.slice(0, 500)}`);
  }
}

function otpCodeText(code: string, brandName: string, context: string): string {
  return [
    `Hallo,`,
    ``,
    `dein ${brandName}-Bestaetigungscode lautet:`,
    ``,
    `    ${code}`,
    ``,
    `Gib den Code im Browser ein, um ${context}.`,
    `Der Code ist 15 Minuten gueltig und kann nur einmal verwendet werden.`,
    `Nach 5 Fehlversuchen wird der Code gesperrt. Du kannst dann einen neuen anfordern.`,
    ``,
    `Falls du den Code nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
  ].join('\n');
}

function otpCodeHtml(code: string, brandName: string, context: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif; line-height: 1.5; color: #1a1a1a;">
      <p>Hallo,</p>
      <p>dein <strong>${escapeHtml(brandName)}</strong>-Bestaetigungscode lautet:</p>
      <p style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 30px; font-weight: 700; letter-spacing: 8px; padding: 16px 20px; background: #F4F8F5; border-radius: 8px; display: inline-block;">${escapeHtml(code)}</p>
      <p>Gib den Code im Browser ein, um ${escapeHtml(context)}.</p>
      <p style="font-size:13px;color:#555;">Der Code ist 15 Minuten gueltig und kann nur einmal verwendet werden. Nach 5 Fehlversuchen wird der Code gesperrt.</p>
      <p style="font-size:12px;color:#888;">Falls du den Code nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
