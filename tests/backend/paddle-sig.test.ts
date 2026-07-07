import { describe, expect, it } from 'vitest';
import { hmacSha256Hex } from '../../functions/_lib/crypto';
import { verifyPaddleSignature } from '../../functions/_lib/paddle-sig';

const secret = 'webhook-secret';
const body = JSON.stringify({ event_id: 'evt_123' });
const ts = '1700000000';
const now = 1_700_000_000_000;

async function signedHeader(payload = body, timestamp = ts): Promise<string> {
  const h1 = await hmacSha256Hex(secret, `${timestamp}:${payload}`);
  return `ts=${timestamp};h1=${h1}`;
}

describe('verifyPaddleSignature', () => {
  it('accepts a valid signature', async () => {
    await expect(verifyPaddleSignature(secret, body, await signedHeader(), now)).resolves.toEqual({
      valid: true,
    });
  });

  it.each([
    [null, 'missing_signature'],
    ['h1=abc', 'malformed_signature'],
    ['ts=not-a-number;h1=abc', 'bad_timestamp'],
  ])('rejects %s as %s', async (header, reason) => {
    await expect(verifyPaddleSignature(secret, body, header, now)).resolves.toEqual({
      valid: false,
      reason,
    });
  });

  it('accepts signatures exactly at the timestamp skew boundary', async () => {
    const boundaryNow = now + 5 * 60_000;

    await expect(verifyPaddleSignature(secret, body, await signedHeader(), boundaryNow)).resolves.toEqual({
      valid: true,
    });
  });

  it('rejects signatures beyond timestamp skew', async () => {
    await expect(verifyPaddleSignature(secret, body, await signedHeader(), now + 5 * 60_000 + 1)).resolves.toEqual({
      valid: false,
      reason: 'timestamp_skew',
    });
  });

  it('rejects bad hmac values', async () => {
    await expect(verifyPaddleSignature(secret, body, 'ts=1700000000;h1=00', now)).resolves.toEqual({
      valid: false,
      reason: 'bad_hmac',
    });
  });
});
