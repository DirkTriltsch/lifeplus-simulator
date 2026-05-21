import type { Env } from '../env';

export interface MagicLinkMail {
  to: string;
  link: string;
  brandName: string;
  expiresInMinutes: number;
}

export async function sendMagicLink(env: Env, mail: MagicLinkMail): Promise<void> {
  const subject = `Dein Login-Link fuer ${mail.brandName}`;
  const text = magicLinkText(mail);
  const html = magicLinkHtml(mail);

  await sendViaResend(env, {
    to: mail.to,
    subject,
    text,
    html,
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
    // In local dev without a configured mailer, log to console instead of failing.
    console.log('[mailer:disabled]', args.to, args.subject, args.text);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM}>`,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

function magicLinkText(mail: MagicLinkMail): string {
  return [
    `Hallo,`,
    ``,
    `Klicke auf den folgenden Link, um dich bei ${mail.brandName} anzumelden:`,
    mail.link,
    ``,
    `Der Link ist ${mail.expiresInMinutes} Minuten gueltig und kann nur einmal verwendet werden.`,
    ``,
    `Falls du den Login nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
  ].join('\n');
}

function magicLinkHtml(mail: MagicLinkMail): string {
  const escapedLink = escapeHtml(mail.link);
  const escapedBrand = escapeHtml(mail.brandName);
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif; line-height: 1.5; color: #1a1a1a;">
      <p>Hallo,</p>
      <p>Klicke auf den folgenden Link, um dich bei <strong>${escapedBrand}</strong> anzumelden:</p>
      <p><a href="${escapedLink}" style="display:inline-block;background:#1D9E75;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Login bestaetigen</a></p>
      <p style="font-size:13px;color:#555;">Oder kopiere diesen Link in deinen Browser:<br /><span style="word-break: break-all;">${escapedLink}</span></p>
      <p style="font-size:13px;color:#555;">Der Link ist ${mail.expiresInMinutes} Minuten gueltig und kann nur einmal verwendet werden.</p>
      <p style="font-size:12px;color:#888;">Falls du den Login nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
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
