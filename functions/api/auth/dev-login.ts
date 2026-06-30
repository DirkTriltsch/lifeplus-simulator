import type { Env } from '../../env';
import { SESSION_COOKIE, serializeCookie } from '../../_lib/cookies';
import { randomId } from '../../_lib/crypto';
import {
  grantTrialEntitlementIfMissing,
  upsertUserByEmail,
} from '../../_lib/db';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { createSessionForNewDevice } from '../../_lib/session';
import { nowMs } from '../../_lib/time';

// LOCAL-DEV-ONLY Login-Helper. Erstellt einen User per Email, vergibt Trial
// (14 Tage Pro) und setzt direkt das Session-Cookie. Erspart den Login-Code-
// Umweg fuer lokale Browser-Tests.
//
// Aktiv NUR wenn DEV_OTP_DEBUG=1 UND INSECURE_COOKIES=1 — beide nur in
// .dev.vars gesetzt. Production = 404.
//
// Aufruf per Browser-URL:
//   http://localhost:4321/api/auth/dev-login?email=dao@triltsch-online.de&next=/checkout/yearly.html
//
// Alternativ per Browser-DevTools-Console:
//   await fetch('/api/auth/dev-login', {
//     method: 'POST',
//     credentials: 'include',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify({ email: 'dao@triltsch-online.de' })
//   }).then(r => r.json())

interface Body {
  email?: string;
  next?: string;
}

const TRIAL_DAYS = 14;
const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NEXT_URL_RX = /^\/(?:checkout\/(?:monthly|halfyear|yearly)\.html|signup\.html|pricing\.html|mein-konto\.html|)$/;

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  // Hard guard — beide Dev-Flags muessen gesetzt sein.
  if (env.DEV_OTP_DEBUG !== '1' || env.INSECURE_COOKIES !== '1') {
    return new Response('not found', { status: 404 });
  }

  let body: Body = {};
  if (request.method === 'GET') {
    const url = new URL(request.url);
    body = {
      email: url.searchParams.get('email') ?? undefined,
      next:  url.searchParams.get('next') ?? undefined,
    };
  } else if (request.method === 'POST') {
    try {
      body = (await request.json()) as Body;
    } catch {
      return error(400, 'bad_json');
    }
  } else {
    return methodNotAllowed(['GET', 'POST']);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !EMAIL_RX.test(email)) {
    return error(400, 'invalid_email');
  }

  const now = nowMs();
  const user = await upsertUserByEmail(env, email, now, randomId);
  await grantTrialEntitlementIfMissing(env, user.id, env.BRAND_ID, now, TRIAL_DAYS, randomId);

  const session = await createSessionForNewDevice(env, {
    userId:    user.id,
    userAgent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
    kind:      'normal',
  });

  const maxAgeSeconds = Math.max(60, Math.floor((session.expiresAt - nowMs()) / 1000));
  const cookie = serializeCookie(SESSION_COOKIE, session.sessionToken, {
    maxAgeSeconds,
    sameSite: 'Lax',
    httpOnly: true,
    secure: false,
  });

  if (request.method === 'GET') {
    const next = typeof body.next === 'string' && NEXT_URL_RX.test(body.next)
      ? body.next
      : '/checkout/yearly.html';
    return new Response(null, {
      status: 303,
      headers: {
        location: next,
        'set-cookie': cookie,
        'cache-control': 'no-store',
      },
    });
  }

  return json(
    {
      ok:    true,
      email: user.email,
      note:  'Dev-only login. Login-Code wird umgangen, host-only localhost Cookie ist gesetzt.',
    },
    {
      headers: {
        'set-cookie': cookie,
      },
    },
  );
};
