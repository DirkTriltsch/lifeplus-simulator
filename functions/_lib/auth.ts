import type { Env } from '../env';
import { parseCookies, SESSION_COOKIE } from './cookies';
import { error } from './responses';
import { loadSessionFromToken, type SessionContext } from './session';

export async function requireSession(
  request: Request,
  env: Env,
): Promise<SessionContext | Response> {
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'unauthenticated');

  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'unauthenticated');

  return ctx;
}
