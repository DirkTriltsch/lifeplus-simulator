import type { Env } from '../../env';
import { error, json, methodNotAllowed } from '../../_lib/responses';

const EXPECTED = {
  monthly: 'pri_01ks580xcmk17mam0qp9tjkwxg',
  halfyear: 'pri_01ksfd0ws71rgxkj7gfrrzkywm',
  yearly: 'pri_01ks5864k3detqr1j2v3cx7dhs',
} as const;

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  if (!env.DIAGNOSTIC_TOKEN) return error(404, 'not_found');

  const url = new URL(request.url);
  const token =
    request.headers.get('x-diagnostic-token') ??
    url.searchParams.get('token') ??
    '';

  if (token !== env.DIAGNOSTIC_TOKEN) return error(403, 'forbidden');

  const prices = {
    monthly: inspectPrice(env.PADDLE_PRICE_MONTHLY, EXPECTED.monthly),
    halfyear: inspectPrice(env.PADDLE_PRICE_HALFYEAR, EXPECTED.halfyear),
    yearly: inspectPrice(env.PADDLE_PRICE_YEARLY, EXPECTED.yearly),
  };

  return json({
    ok: prices.monthly.matchesExpected && prices.halfyear.matchesExpected && prices.yearly.matchesExpected,
    environment: env.PADDLE_ENV,
    prices,
  });
};

function inspectPrice(value: string | undefined, expected: string) {
  const normalized = (value ?? '').trim();
  return {
    configured: normalized.length > 0,
    looksLikePriceId: normalized.startsWith('pri_'),
    matchesExpected: normalized === expected,
    length: normalized.length,
    prefix: normalized.slice(0, 7),
    suffix: normalized.slice(-6),
  };
}
