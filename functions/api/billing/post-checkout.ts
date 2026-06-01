import type { Env } from '../../env';
import { parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { randomId, randomToken, sha256Hex } from '../../_lib/crypto';
import { sendMagicLink } from '../../_lib/mailer';
import { clientIp, consumeRateLimit } from '../../_lib/rate-limit';
import { error, json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken } from '../../_lib/session';
import { minutesFromNow, nowMs } from '../../_lib/time';

// Phase 2.4 — Post-Checkout-Bestaetigung.
//
// Wird vom Frontend NACH Paddle's checkout.completed-Event aufgerufen.
// Aufgaben:
//   - Session pruefen + Email-Match (defense-in-depth; checkout-intent hat
//     schon gegated, aber post-checkout ist eigener Endpoint und muss
//     unabhaengig sicher sein).
//   - Magic-Link an checkoutEmail senden (Best-Effort), damit der User sich
//     auf anderen Geraeten mit derselben Adresse einloggen kann.
//   - KEIN Entitlement schreiben — der Paddle-Webhook ist authoritative.
//   - transactionId optional fuers Logging mitnehmen, kein DB-Write hier.
//
// Response: { ok, mailSent, message }. mailSent=false ist OK — Frontend kann
// dann einen Resend-Hinweis zeigen.

interface Body {
  checkoutEmail?: string;
  transactionId?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return error(400, 'bad_json');
  }

  // 1. Session zwingend
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'login_required');
  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'login_required');

  // 2. checkoutEmail validieren + Email-Match Pflicht
  const checkoutEmail = (body.checkoutEmail ?? '').trim().toLowerCase();
  if (!checkoutEmail || !EMAIL_RX.test(checkoutEmail) || checkoutEmail.length > 254) {
    return error(400, 'invalid_email');
  }
  if (ctx.user.email.toLowerCase() !== checkoutEmail) {
    return error(409, 'email_mismatch');
  }

  // 3. Rate-Limit pro IP — verhindert Spam-Magic-Links
  const ip = clientIp(request);
  const ipLimit = await consumeRateLimit(env, `rl:billing:post-checkout:ip:${ip}`, 5, 600);
  if (!ipLimit.allowed) return error(429, 'rate_limited');

  // 4. Magic-Link ausstellen (normal-Login, kein access_intent, kein Consent)
  const ttlMinutes = Number(env.MAGIC_LINK_TTL_MINUTES || '15');
  const linkToken = randomToken(32);
  const linkTokenHash = await sha256Hex(linkToken);
  const tokenId = randomId();
  const now = nowMs();
  const expires = minutesFromNow(ttlMinutes);

  await env.DB.prepare(
    `INSERT INTO magic_login_tokens
       (id, email_lower, token_hash, expires_at, created_at,
        request_ip, request_user_agent,
        access_intent, consent_payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      tokenId,
      checkoutEmail,
      linkTokenHash,
      expires,
      now,
      ip,
      request.headers.get('user-agent')?.slice(0, 500) ?? null,
      null,
      null,
    )
    .run();

  const link = `${trimSlash(env.APP_URL)}/?token=${encodeURIComponent(linkToken)}`;

  // 5. Best-Effort: Mail senden. Failure ist nicht-fatal — der User ist hier
  //    bereits eingeloggt, der Magic-Link dient nur fuer weitere Geraete.
  //
  //    Dev-Helper analog zu request-link.ts: wenn DEV_MAGIC_LINK_DEBUG=1
  //    UND INSECURE_COOKIES=1 gesetzt sind (nur in .dev.vars), wird bei
  //    Mailer-Fehler der Klartext-Token in den Worker-Log geschrieben und
  //    in der Response zurueckgegeben — fuer lokales Browser-Testing ohne
  //    Resend-Setup.
  const isDevDebug =
    env.DEV_MAGIC_LINK_DEBUG === '1' && env.INSECURE_COOKIES === '1';

  let mailSent = true;
  let devLink: string | null = null;
  try {
    await sendMagicLink(env, {
      to: checkoutEmail,
      link,
      brandName: env.MAIL_FROM_NAME || env.BRAND_ID,
      expiresInMinutes: ttlMinutes,
    });
  } catch (err) {
    mailSent = false;
    if (isDevDebug) {
      console.log('[DEV] post-checkout mailer not configured. Magic-Link for', checkoutEmail, ':', linkToken);
      console.log('[DEV] full link:', link);
      devLink = link;
    } else {
      console.warn('post_checkout_mail_failed', err);
      try {
        await env.DB.prepare('DELETE FROM magic_login_tokens WHERE id = ?').bind(tokenId).run();
      } catch (cleanupErr) {
        console.warn('post_checkout_token_cleanup_failed', cleanupErr);
      }
    }
  }

  if (mailSent || devLink) {
    try {
      const invalidatedAt = nowMs();
      await env.DB.prepare(
        `UPDATE magic_login_tokens
            SET used_at = ?
          WHERE email_lower = ?
            AND id != ?
            AND used_at IS NULL
            AND expires_at > ?`,
      )
        .bind(invalidatedAt, checkoutEmail, tokenId, invalidatedAt)
        .run();
    } catch (err) {
      console.warn('post_checkout_old_token_invalidation_failed', err);
    }
  }

  // 6. Optional: transactionId fuers Audit-Log mitnehmen — der Webhook
  //    korreliert spaeter ueber die paddle_transaction_id-Spalten.
  if (body.transactionId) {
    console.info('post_checkout_received', {
      user_id: ctx.user.id,
      email: checkoutEmail,
      transaction_id: body.transactionId,
    });
  }

  return json({
    ok: true,
    mailSent,
    message: mailSent
      ? `Wir verarbeiten deine Zahlung. Ein Login-Link wurde an ${checkoutEmail} gesendet — damit kannst du dich auf anderen Geraeten anmelden.`
      : 'Wir verarbeiten deine Zahlung. Der Login-Link konnte nicht versendet werden — du kannst ihn jederzeit auf der Login-Seite neu anfordern.',
    ...(devLink ? { dev_link: devLink, dev_token: linkToken } : {}),
  });
};

function trimSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
