import type { Env } from '../../env';
import { sessionCookieHeader } from '../../_lib/cookies';
import { randomId, sha256Hex } from '../../_lib/crypto';
import {
  getActiveDevices,
  grantTrialEntitlementIfMissing,
  insertConsentLog,
  upsertUserByEmail,
} from '../../_lib/db';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { createSessionForNewDevice } from '../../_lib/session';
import { nowMs } from '../../_lib/time';

interface Body {
  token?: string;
  access?: string;
}

interface TokenRow {
  id: string;
  email_lower: string;
  token_hash: string;
  expires_at: number;
  used_at: number | null;
  access_intent: string | null;
  consent_payload_json: string | null;
  next_url: string | null;
}

interface ConsentSnapshot {
  accepted_agb?: 0 | 1;
  accepted_privacy?: 0 | 1;
  newsletter_opt_in?: 0 | 1;
  document_version?: string;
  client_timestamp?: string | null;
}

const TRIAL_DAYS = 14;

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  const token = (body.token ?? '').trim();
  if (!token || token.length < 16 || token.length > 200) {
    return error(400, 'invalid_token');
  }
  const requestedFreeAccess = body.access === 'free';

  const ip = clientIp(request);
  const limit = await consumeRateLimit(env, `rl:auth:verify-link:ip:${ip}`, 10, 600);
  if (!limit.allowed) return error(429, 'rate_limited');

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT id, email_lower, token_hash, expires_at, used_at,
            access_intent, consent_payload_json, next_url
       FROM magic_login_tokens WHERE token_hash = ? LIMIT 1`,
  )
    .bind(tokenHash)
    .first<TokenRow>();

  if (!row) return error(400, 'invalid_token');
  if (row.used_at !== null) return error(400, 'token_used');
  if (row.expires_at < nowMs()) return error(400, 'token_expired');
  if (requestedFreeAccess && row.access_intent !== 'free') {
    return error(409, 'free_signup_token_missing_intent');
  }

  // Token early-marken: schuetzt vor Replay durch konkurrente Requests. Falls
  // einer der nachfolgenden Schritte (User-Upsert, Trial, Consent, Session)
  // scheitert, geben wir den Token im catch-Block wieder frei (used_at=NULL),
  // damit der User es ohne neuen Magic-Link erneut versuchen kann.
  const markResult = await env.DB.prepare(
    'UPDATE magic_login_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL',
  )
    .bind(nowMs(), row.id)
    .run();

  const markedRows = markResult.meta?.changes ?? 0;
  if (markedRows === 0) return error(400, 'token_used');

  try {
    const now = nowMs();

    // Free-Signup-Flow (access_intent='free'): Consent ist Pflicht. Ohne
    // gueltigen Payload brechen wir ab — User bekommt KEINEN Trial ohne
    // dokumentierte Zustimmung. Der Token wird im catch-Block wieder
    // freigegeben, der User kann den Link nochmal klicken (was bei
    // strukturellem Fehler nicht helfen wird → er muss /signup erneut
    // durchlaufen). Audit-relevant.
    let freeSignupConsent: ConsentSnapshot | null = null;
    if (row.access_intent === 'free') {
      if (!row.consent_payload_json) {
        throw new Error('consent_required_for_free_signup');
      }
      try {
        freeSignupConsent = JSON.parse(row.consent_payload_json) as ConsentSnapshot;
      } catch (parseErr) {
        console.warn('consent_payload_parse_failed', parseErr);
        throw new Error('consent_payload_corrupt');
      }
      if (
        !freeSignupConsent ||
        freeSignupConsent.accepted_agb !== 1 ||
        freeSignupConsent.accepted_privacy !== 1
      ) {
        throw new Error('consent_invalid_agb_or_privacy_missing');
      }
    }

    const user = await upsertUserByEmail(env, row.email_lower, now, randomId);

    // Side-Effect-Idempotenz: prueft, ob fuer DIESEN Token bereits
    // consent_log/trial geschrieben wurden (z.B. nach kompensiertem Fehler
    // und Retry). insertConsentLog ist NICHT inherent idempotent, grantTrial
    // schon (via getEntitlementForBrand).
    if (row.access_intent === 'free' && freeSignupConsent) {
      await grantTrialEntitlementIfMissing(env, user.id, env.BRAND_ID, now, TRIAL_DAYS, randomId);

      const consentAlreadyLogged = await env.DB.prepare(
        `SELECT 1 AS hit FROM consent_log
           WHERE checkout_user_id = ? AND context = 'free_signup'
             AND document_version = ?
           LIMIT 1`,
      )
        .bind(user.id, freeSignupConsent.document_version ?? 'unknown')
        .first<{ hit: number }>();

      if (!consentAlreadyLogged) {
        await insertConsentLog(env, now, randomId, {
          checkoutUserId:    user.id,
          sessionUserId:     null,
          checkoutEmail:     user.email,
          sessionEmail:      null,
          brandId:           env.BRAND_ID,
          context:           'free_signup',
          acceptedAgb:       true,
          acceptedPrivacy:   true,
          newsletterOptIn:   freeSignupConsent.newsletter_opt_in === 1,
          documentVersion:   freeSignupConsent.document_version ?? 'unknown',
          clientTimestampIso: freeSignupConsent.client_timestamp ?? null,
          requestIp:         ip,
          userAgent:         request.headers.get('user-agent')?.slice(0, 500) ?? null,
        });
      }
    }

    const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;
    const devices = await getActiveDevices(env, user.id);
    const deviceLimit = Number(env.DEVICE_LIMIT || '3');
    const wouldExceed = devices.length >= deviceLimit;

    const session = await createSessionForNewDevice(env, {
      userId: user.id,
      userAgent,
      kind: wouldExceed ? 'device_limit_reached' : 'normal',
    });

    const cookie = sessionCookieHeader(
      env,
      session.sessionToken,
      Math.max(60, Math.floor((session.expiresAt - nowMs()) / 1000)),
    );

    return json(
      {
        ok:          true,
        sessionKind: session.kind,
        email:       user.email,
        nextUrl:     row.next_url,
      },
      { headers: { 'set-cookie': cookie } },
    );
  } catch (err) {
    // Kompensation: Token wieder freigeben, damit der User es ohne neuen
    // Magic-Link erneut versuchen kann. Rate-Limit-Counter sind bereits
    // konsumiert — bei wiederholten Server-Fehlern blockt das Rate-Limiting
    // weiteren Spam.
    try {
      await env.DB.prepare(
        'UPDATE magic_login_tokens SET used_at = NULL WHERE id = ?',
      )
        .bind(row.id)
        .run();
    } catch (cleanupErr) {
      console.warn('verify_link_token_release_failed', cleanupErr);
    }
    console.error('verify_link_post_mark_failed', err);
    return error(500, 'verify_failed');
  }
};
