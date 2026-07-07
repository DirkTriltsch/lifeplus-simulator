import type { CheckoutIntentRow } from '../db';

export type IntentIdentityDecision =
  | {
      decision: 'accepted';
      email: string;
      userId: string | null;
      intent: CheckoutIntentRow;
    }
  | {
      decision: 'rejected';
      reason:
        | 'transaction_mismatch'
        | 'intent_missing_transaction_id'
        | 'event_missing_transaction_id'
        | 'email_mismatch';
    };

export function resolveIntentBackedIdentity(input: {
  intent: CheckoutIntentRow;
  eventTransactionId: string | null;
  customDataEmail: string | null;
  requireTransactionMatch?: boolean;
}): IntentIdentityDecision {
  const { intent, eventTransactionId, customDataEmail } = input;
  const requireTransactionMatch = input.requireTransactionMatch === true;

  if (intent.paddle_transaction_id) {
    if (eventTransactionId && eventTransactionId !== intent.paddle_transaction_id) {
      return { decision: 'rejected', reason: 'transaction_mismatch' };
    }
  } else if (requireTransactionMatch) {
    return { decision: 'rejected', reason: 'intent_missing_transaction_id' };
  }

  if (requireTransactionMatch && !eventTransactionId) {
    return { decision: 'rejected', reason: 'event_missing_transaction_id' };
  }

  if (customDataEmail && customDataEmail !== intent.checkout_email) {
    return { decision: 'rejected', reason: 'email_mismatch' };
  }

  return {
    decision: 'accepted',
    email: intent.checkout_email,
    userId: intent.user_id,
    intent,
  };
}
