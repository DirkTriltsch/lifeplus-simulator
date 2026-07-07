import type { Env } from '../../env';
import { error, json, methodNotAllowed } from '../../_lib/responses';

interface Body {
  to?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  if (!env.DIAGNOSTIC_TOKEN) return error(404, 'not_found');

  const url = new URL(request.url);
  const token =
    request.headers.get('x-diagnostic-token') ??
    url.searchParams.get('token') ??
    '';
  if (token !== env.DIAGNOSTIC_TOKEN) return error(403, 'forbidden');

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
    },
    { status: res.ok ? 200 : 502 },
  );
};

function safeJson(value: string): unknown {
  if (!value) return '';
  try {
    return JSON.parse(value);
  } catch {
    return value.slice(0, 1000);
  }
}
