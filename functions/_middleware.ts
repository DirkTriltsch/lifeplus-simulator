import type { Env } from './env';

// Same-origin only — the API is deployed on the same Pages project as the app,
// so we do not need permissive CORS. We just lock down preflight responses.

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        allow: 'GET, POST, OPTIONS',
        'cache-control': 'no-store',
      },
    });
  }
  return next();
};
