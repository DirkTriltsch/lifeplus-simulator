import type { Env } from './env';

// Hybrid topology: API runs on api.lifeflow360.app (Cloudflare Pages),
// the marketing site + app run on www.lifeflow360.app (IONOS).
// We need cross-origin CORS with credentials, locked to the app origin.
//
// ALLOWED_ORIGINS is configured via env var (comma-separated), with a
// sensible default for production.

function allowedOrigins(env: Env): string[] {
  const raw = (env as unknown as { ALLOWED_ORIGINS?: string }).ALLOWED_ORIGINS;
  if (!raw) return ['https://www.lifeflow360.app'];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = allowedOrigins(env);
  if (!origin || !allowed.includes(origin)) {
    return {};
  }
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env);
  const url = new URL(request.url);
  const isApiPath = url.pathname === '/api' || url.pathname.startsWith('/api/');

  if (!isApiPath) {
    return new Response('not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'cache-control': 'no-store',
      },
    });
  }

  const response = await next();
  if (Object.keys(cors).length > 0) {
    const merged = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) merged.set(k, v);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: merged,
    });
  }
  return response;
};
