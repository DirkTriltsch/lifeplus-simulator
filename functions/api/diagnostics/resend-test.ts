import type { Env } from '../../env';
import { error, json, methodNotAllowed } from '../../_lib/responses';

interface Body {
  to?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    const rawBody = await request.text();
    body = JSON.parse(rawBody.replace(/^\uFEFF/, '')) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  const to = (body.to ?? '').trim().toLowerCase();
  if (!EMAIL_RX.test(to)) return error(400, 'invalid_email');
  if (!env.RESEND_API_KEY) return error(500, 'resend_key_missing');

  const payload = {
    from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM}>`,
    to: [to],
    subject: 'LifeFlow360 Cloudflare Resend Diagnose',
    text: 'Das ist ein direkter Resend-Test aus Cloudflare Pages Functions.',
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  const keyFingerprint = await sha256Hex(env.RESEND_API_KEY);

  return json(
    {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      resendBody: safeJson(responseText),
      payload: {
        from: payload.from,
        toDomain: to.split('@')[1] ?? 'unknown',
        subject: payload.subject,
      },
      keyDiagnostics: {
        length: env.RESEND_API_KEY.length,
        prefix: env.RESEND_API_KEY.slice(0, 6),
        sha256First12: keyFingerprint.slice(0, 12),
      },
    },
    { status: res.ok ? 200 : 502 },
  );
};

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeJson(value: string): unknown {
  if (!value) return '';
  try {
    return JSON.parse(value);
  } catch {
    return value.slice(0, 1000);
  }
}
