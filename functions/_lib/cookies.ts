import type { Env } from '../env';

// Hybrid topology: cookie must be readable by api.lifeflow360.app AND sent
// when www.lifeflow360.app calls the API with credentials:include.
// We therefore set Domain=.lifeflow360.app (parent domain). That rules out
// the __Host- prefix (which forbids the Domain attribute).
//
// SameSite=None is required for cross-site cookie sending (different
// subdomains count as same-site, but we keep None for safety with
// app.something or other future origins). It requires Secure.

export const SESSION_COOKIE = 'session';

interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  httpOnly?: boolean;
  secure?: boolean;
  domain?: string;
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts: string[] = [`${name}=${value}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure !== false) parts.push('Secure');
  if (options.domain) parts.push(`Domain=${options.domain}`);
  return parts.join('; ');
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

export function sessionCookieHeader(env: Env, value: string, maxAgeSeconds: number): string {
  return serializeCookie(SESSION_COOKIE, value, {
    maxAgeSeconds,
    sameSite: 'Lax',
    httpOnly: true,
    secure: true,
    domain: env.COOKIE_DOMAIN || undefined,
  });
}

export function clearedSessionCookieHeader(env: Env): string {
  return serializeCookie(SESSION_COOKIE, '', {
    maxAgeSeconds: 0,
    sameSite: 'Lax',
    httpOnly: true,
    secure: true,
    domain: env.COOKIE_DOMAIN || undefined,
  });
}
