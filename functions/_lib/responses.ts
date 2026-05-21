export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

export function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function error(status: number, code: string, message?: string): Response {
  return json({ error: { code, message: message ?? code } }, { status });
}

export function methodNotAllowed(allow: string[]): Response {
  return new Response(null, { status: 405, headers: { allow: allow.join(', ') } });
}
