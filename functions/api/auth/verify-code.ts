import type { Env } from '../../env';
import { sessionCookieHeader } from '../../_lib/cookies';
import { randomId } from '../../_lib/crypto';
import {
  getActiveDevices,
  grantTrialEntitlementIfMissing,
  insertConsentLog,
  upsertUserByEmail,
} from '../../_lib/db';
import { consumeOtpToken } from '../../_lib/otpTokens';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { createSessionForNewDevice } from '../../_lib/session';
import { nowMs } from '../../_lib/time';

interface Body {
  email?: string;
  code?: string;
}

interface ConsentSnapshot {
  accepted_agb?: 0 | 1;
  accepted_privacy?: 0 | 1;
  newsletter_opt_in?: 0 | 1;
  document_version?: string;
  client_timestamp?: string | null;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CODE_RX = /^[0-9]{6}$/;
const TRIAL_DAYS = 14;

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const code = (body.code ?? '').trim();
  if (!email || !EMAIL_RX.test(email) || email.length > 254) {
    return error(400, 'invalid_email');
  }
  if (!CODE_RX.test(code)) return error(400, 'invalid_code');

  const ip = clientIp(request);
  if (!ip) return error(429, 'rate_limited');
  const ipLimit = await consumeRateLimit(env, `rl:auth:verify-code:ip:${ip}`, 10, 600, {
    failMode: 'closed',
  });
  if (!ipLimit.allowed) return error(429, 'rate_limited');

  const emailLimit = await consumeRateLimit(env, `rl:auth:verify-code:email:${email}`, 10, 600, {
    failMode: 'closed',
  });
  if (!emailLimit.allowed) return error(429, 'rate_limited');

  const result = await consumeOtpToken(env, email, code, nowMs());
  if (result.status === 'locked') return error(400, 'code_locked');
  if (result.status !== 'ok') return error(400, 'code_invalid');

  try {
    const now = nowMs();
    let freeSignupConsent: ConsentSnapshot | null = null;
    if (result.purpose === 'free_signup') {
      if (!result.consent_payload_json) throw new Error('consent_required_for_free_signup');
      try {
        freeSignupConsent = JSON.parse(result.consent_payload_json) as ConsentSnapshot;
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

    const user = await upsertUserByEmail(env, result.email_lower, now, randomId);

    if (result.purpose === 'free_signup' && freeSignupConsent) {
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
        nextUrl:     result.next_url,
      },
      { headers: { 'set-cookie': cookie } },
    );
  } catch (err) {
    console.error('verify_code_post_consume_failed', err);
    return error(500, 'verify_failed');
  }
};
