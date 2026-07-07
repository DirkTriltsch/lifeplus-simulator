import { describe, expect, it } from 'vitest';
import { shouldShowLoginGateForUrl } from './AuthGate';

describe('shouldShowLoginGateForUrl', () => {
  it('shows the app login for magic-token and checkout success return URLs', () => {
    expect(shouldShowLoginGateForUrl('https://app.test/?token=abc')).toBe(true);
    expect(shouldShowLoginGateForUrl('https://app.test/?checkout=success&email=buyer@example.com')).toBe(true);
  });

  it('redirects anonymous users without auth or checkout context', () => {
    expect(shouldShowLoginGateForUrl('https://app.test/')).toBe(false);
    expect(shouldShowLoginGateForUrl('https://app.test/?checkout=cancelled')).toBe(false);
  });
});
