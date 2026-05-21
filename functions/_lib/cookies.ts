import type { Env } from '../env';

export const SESSION_COOKIE = '__Host-session';

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
  // __Host- prefix REQUIRES Secure, Path=/, and no Domain attribute.
  const isHostPrefixed = name.startsWith('__Host-');
  const parts: string[] = [`${name}=${value}`];

  parts.push(`Path=${isHostPrefixed ? '/' : options.path ?? '/'}`);
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure !== false) parts.push('Secure');
  if (!isHostPrefixed && options.domain) parts.push(`Domain=${options.domain}`);

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
  });
}

export function clearedSessionCookieHeader(_env: Env): string {
  return serializeCookie(SESSION_COOKIE, '', {
    maxAgeSeconds: 0,
    sameSite: 'Lax',
    httpOnly: true,
    secure: true,
  });
}
