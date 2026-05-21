import { hmacSha256Hex, timingSafeEqual } from './crypto';

// Paddle Billing webhook signature format:
//   Paddle-Signature: ts=1700000000;h1=<hex-hmac-sha256>
// The signed payload is `${ts}:${rawBody}`.

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

const MAX_SKEW_MS = 5 * 60_000;

export async function verifyPaddleSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
  now: number,
): Promise<VerifyResult> {
  if (!signatureHeader) return { valid: false, reason: 'missing_signature' };

  const parts = signatureHeader.split(';').map((p) => p.trim());
  let ts: string | null = null;
  let h1: string | null = null;
  for (const part of parts) {
    if (part.startsWith('ts=')) ts = part.slice(3);
    else if (part.startsWith('h1=')) h1 = part.slice(3);
  }
  if (!ts || !h1) return { valid: false, reason: 'malformed_signature' };

  const tsMs = Number(ts) * 1000;
  if (!Number.isFinite(tsMs)) return { valid: false, reason: 'bad_timestamp' };
  if (Math.abs(now - tsMs) > MAX_SKEW_MS) return { valid: false, reason: 'timestamp_skew' };

  const expected = await hmacSha256Hex(secret, `${ts}:${rawBody}`);
  if (!timingSafeEqual(expected, h1)) return { valid: false, reason: 'bad_hmac' };

  return { valid: true };
}
