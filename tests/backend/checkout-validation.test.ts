import { describe, expect, it } from 'vitest';
import {
  parsePlan,
  validateCheckoutIntentBody,
  type CheckoutIntentBody,
} from '../../functions/_lib/checkout-validation';

const baseAddress = {
  street: 'Musterstrasse 1',
  postalCode: '80331',
  city: 'Muenchen',
  countryCode: 'de',
};

const consentOk = { agb: true, privacy: true, version: '2026-10-31', timestamp: '2026-10-31T10:00:00Z' };

function business(overrides: Partial<CheckoutIntentBody> = {}): CheckoutIntentBody {
  return {
    plan: 'yearly',
    checkoutEmail: ' Buyer@Example.com ',
    buyerType: 'business',
    companyName: 'Muster GmbH',
    ...baseAddress,
    vatId: 'at u123 45678',
    b2bConfirmation: { checked: true, version: 'b2b-v1', displayedHintsHash: 'hints-v1' },
    consent: consentOk,
    ...overrides,
  };
}

function consumer(overrides: Partial<CheckoutIntentBody> = {}): CheckoutIntentBody {
  return {
    plan: 'monthly',
    checkoutEmail: 'privat@example.com',
    buyerType: 'consumer',
    billingName: 'Erika Mustermann',
    ...baseAddress,
    consent: consentOk,
    ...overrides,
  };
}

describe('parsePlan', () => {
  it('accepts the three plans and rejects everything else', () => {
    expect(parsePlan('monthly')).toBe('monthly');
    expect(parsePlan(' halfyear ')).toBe('halfyear');
    expect(parsePlan('yearly')).toBe('yearly');
    expect(parsePlan('weekly')).toBeNull();
    expect(parsePlan(undefined)).toBeNull();
  });
});

describe('validateCheckoutIntentBody - business', () => {
  it('normalizes a valid business request', () => {
    const result = validateCheckoutIntentBody(business());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      buyerType: 'business',
      checkoutEmail: 'buyer@example.com',
      companyName: 'Muster GmbH',
      billingName: null,
      displayName: 'Muster GmbH',
      countryCode: 'DE',
      vatId: 'ATU12345678',
      b2bConfirmationVersion: 'b2b-v1',
      displayedHintsHash: 'hints-v1',
      withdrawalWaiver: false,
    });
  });

  it('defaults to business when buyerType is missing (legacy clients)', () => {
    const body = business();
    delete body.buyerType;
    const result = validateCheckoutIntentBody(body);
    expect(result.ok && result.value.buyerType).toBe('business');
  });

  it('requires the company name, the B2B confirmation and a valid VAT id', () => {
    expect(validateCheckoutIntentBody(business({ companyName: ' ' }))).toEqual({
      ok: false, error: 'invalid_company_name',
    });
    expect(validateCheckoutIntentBody(business({ b2bConfirmation: { checked: false, version: 'v', displayedHintsHash: 'h' } }))).toEqual({
      ok: false, error: 'missing_b2b_confirmation',
    });
    expect(validateCheckoutIntentBody(business({ b2bConfirmation: undefined }))).toEqual({
      ok: false, error: 'missing_b2b_confirmation',
    });
    expect(validateCheckoutIntentBody(business({ vatId: '12' }))).toEqual({
      ok: false, error: 'invalid_vat_id',
    });
  });

  it('allows a missing VAT id', () => {
    const result = validateCheckoutIntentBody(business({ vatId: null }));
    expect(result.ok && result.value.vatId).toBeNull();
  });

  it('ignores a withdrawal waiver for business buyers', () => {
    const result = validateCheckoutIntentBody(
      business({ consent: { ...consentOk, withdrawal_waiver: true } }),
    );
    expect(result.ok && result.value.withdrawalWaiver).toBe(false);
  });
});

describe('validateCheckoutIntentBody - consumer', () => {
  it('accepts a consumer without company, VAT id or B2B confirmation', () => {
    const result = validateCheckoutIntentBody(consumer());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      buyerType: 'consumer',
      billingName: 'Erika Mustermann',
      companyName: null,
      displayName: 'Erika Mustermann',
      vatId: null,
      b2bConfirmationVersion: null,
      displayedHintsHash: null,
      withdrawalWaiver: false,
    });
  });

  it('drops VAT id and company data a consumer might send', () => {
    const result = validateCheckoutIntentBody(
      consumer({ vatId: 'ATU12345678', companyName: 'Schein GmbH' }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.vatId).toBeNull();
    expect(result.value.companyName).toBeNull();
  });

  it('records the optional withdrawal waiver', () => {
    const result = validateCheckoutIntentBody(
      consumer({ consent: { ...consentOk, withdrawal_waiver: true, newsletter: true } }),
    );
    expect(result.ok && result.value.withdrawalWaiver).toBe(true);
    expect(result.ok && result.value.newsletter).toBe(true);
  });

  it('requires a billing name', () => {
    expect(validateCheckoutIntentBody(consumer({ billingName: 'E' }))).toEqual({
      ok: false, error: 'invalid_billing_name',
    });
  });
});

describe('validateCheckoutIntentBody - shared rules', () => {
  it.each([
    ['invalid_email', { checkoutEmail: 'kein-email' }],
    ['invalid_street', { street: 'ab' }],
    ['invalid_postal_code', { postalCode: '1' }],
    ['invalid_city', { city: 'M' }],
    ['invalid_country', { countryCode: 'US' }],
    ['invalid_discount_code', { discountCode: 'X'.repeat(41) }],
    ['missing_required_consent', { consent: { agb: true, privacy: false } }],
  ] as const)('rejects with %s', (error, override) => {
    expect(validateCheckoutIntentBody(consumer(override))).toEqual({ ok: false, error });
  });

  it('uppercases and trims the discount code', () => {
    const result = validateCheckoutIntentBody(consumer({ discountCode: ' dao20 ' }));
    expect(result.ok && result.value.discountCode).toBe('DAO20');
  });
});
