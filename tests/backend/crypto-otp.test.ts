import { describe, expect, it } from 'vitest';
import { generateOtpCode } from '../../functions/_lib/crypto';

describe('generateOtpCode', () => {
  it('returns a zero-padded six digit numeric code', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateOtpCode()).toMatch(/^[0-9]{6}$/);
    }
  });

  it('does not return the same code for every call', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 200; i += 1) codes.add(generateOtpCode());
    expect(codes.size).toBeGreaterThan(1);
  });
});
