import { describe, expect, it } from 'vitest';
import type { CheckoutIntentRow } from '../../functions/_lib/db';
import { resolveIntentBackedIdentity } from '../../functions/_lib/webhook/identity';

const intent: CheckoutIntentRow = {
  id: 'ci_123',
  user_id: 'usr_123',
  brand_id: 'lifeplus',
  plan: 'yearly',
  price_id: 'pri_yearly',
  checkout_email: 'buyer@example.com',
  created_at: 1,
  expires_at: 2,
  consumed_at: null,
  consumed_paddle_subscription_id: null,
  consumed_paddle_transaction_id: null,
  company_name: null,
  street: null,
  postal_code: null,
  city: null,
  country_code: null,
  discount_code: null,
  vat_id: null,
  b2b_confirmation_version: null,
  displayed_hints_hash: null,
  ip_address: null,
  user_agent: null,
  paddle_transaction_id: 'txn_123',
};

describe('resolveIntentBackedIdentity', () => {
  it('returns the server intent identity when custom data matches', () => {
    expect(
      resolveIntentBackedIdentity({
        intent,
        eventTransactionId: 'txn_123',
        customDataEmail: 'buyer@example.com',
        requireTransactionMatch: true,
      }),
    ).toEqual({ decision: 'accepted', email: 'buyer@example.com', userId: 'usr_123', intent });
  });

  it('rejects manipulated checkout email in custom data', () => {
    expect(
      resolveIntentBackedIdentity({
        intent,
        eventTransactionId: 'txn_123',
        customDataEmail: 'attacker@example.com',
        requireTransactionMatch: true,
      }),
    ).toEqual({ decision: 'rejected', reason: 'email_mismatch' });
  });

  it('rejects transaction mismatches', () => {
    expect(
      resolveIntentBackedIdentity({
        intent,
        eventTransactionId: 'txn_other',
        customDataEmail: 'buyer@example.com',
        requireTransactionMatch: true,
      }),
    ).toEqual({ decision: 'rejected', reason: 'transaction_mismatch' });
  });

  it('rejects requireTransactionMatch when the event has no transaction id', () => {
    expect(
      resolveIntentBackedIdentity({
        intent,
        eventTransactionId: null,
        customDataEmail: 'buyer@example.com',
        requireTransactionMatch: true,
      }),
    ).toEqual({ decision: 'rejected', reason: 'event_missing_transaction_id' });
  });
});
