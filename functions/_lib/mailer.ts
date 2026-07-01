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

  await sendViaResend(env, {
    to: mail.to,
    subject: `Dein ${brandName}-Bestaetigungscode`,
    text: otpCodeText(mail.code, brandName, mail.purpose),
    html: otpCodeHtml(mail.code, brandName, mail.purpose),
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

interface OtpCopy {
  intro: string;
  ignoreHint: string;
}

function otpCopy(brandName: string, purpose: 'login' | 'free_signup'): OtpCopy {
  if (purpose === 'free_signup') {
    return {
      intro: `Gib diesen Code im Browser ein, um deinen kostenlosen Zugang bei ${brandName} zu aktivieren:`,
      ignoreHint: 'Falls du den Zugang nicht angefordert hast, kannst du diese E-Mail ignorieren.',
    };
  }
  return {
    intro: `Gib diesen Code im Browser ein, um deinen Login bei ${brandName} abzuschliessen:`,
    ignoreHint: 'Falls du den Login nicht angefordert hast, kannst du diese E-Mail ignorieren.',
  };
}

function otpCodeText(code: string, brandName: string, purpose: 'login' | 'free_signup'): string {
  const copy = otpCopy(brandName, purpose);
  return [
    `Dein ${brandName}-Bestaetigungscode:`,
    ``,
    `    ${code}`,
    ``,
    copy.intro,
    `Der Code ist 15 Minuten gueltig und kann nur einmal verwendet werden.`,
    `Nach 5 Fehlversuchen wird der Code gesperrt. Du kannst dann einen neuen anfordern.`,
    ``,
    copy.ignoreHint,
  ].join('\n');
}

// Card-Layout nach TraderScope-Vorbild: neutraler grauer Body, weisse Card mit
// Rundung, grosser monospace Code-Block. Table-based fuer Outlook-Kompatibilitaet.
function otpCodeHtml(code: string, brandName: string, purpose: 'login' | 'free_signup'): string {
  const copy = otpCopy(brandName, purpose);
  const dark = '#0F1B17';
  const text = '#2C4138';
  const muted = '#7A8983';
  const paperBg = '#F4F6F8';
  const codeBg = '#F4F8F5';
  const cardShadow = '0 1px 3px rgba(15,27,23,0.08)';
  const brand = escapeHtml(brandName);
  const intro = escapeHtml(copy.intro).replace(brand, `<strong>${brand}</strong>`);

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${paperBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paperBg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:12px;padding:32px;box-shadow:${cardShadow};">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:20px;color:${dark};font-weight:600;">Dein ${brand}-Bestaetigungscode</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:${text};">${intro}</p>
          <p style="margin:0 0 26px;text-align:center;">
            <span style="display:inline-block;padding:18px 36px;background:${codeBg};color:${dark};font-weight:700;font-size:32px;letter-spacing:8px;border-radius:8px;font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(code)}</span>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:${muted};">Der Code ist 15 Minuten gueltig und kann nur einmal verwendet werden.</p>
          <p style="margin:0 0 8px;font-size:13px;color:${muted};">Nach 5 Fehlversuchen wird der Code gesperrt. Du kannst dann einen neuen anfordern.</p>
          <p style="margin:0;font-size:12px;color:${muted};">${escapeHtml(copy.ignoreHint)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
