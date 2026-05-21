import type { Env } from '../../env';
import { clearedSessionCookieHeader, parseCookies, SESSION_COOKIE } from '../../_lib/cookies';
import { json, methodNotAllowed } from '../../_lib/responses';
import { loadSessionFromToken, revokeSession } from '../../_lib/session';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (token) {
    const ctx = await loadSessionFromToken(env, token);
    if (ctx) await revokeSession(env, ctx.session.id);
  }

  return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookieHeader(env) } });
};
