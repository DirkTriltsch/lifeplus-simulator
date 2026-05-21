import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { logout, openBillingPortal } from '../auth/api';

interface PaywallProps {
  pricingUrl: string;
}

export function Paywall({ pricingUrl }: PaywallProps): JSX.Element {
  const { me, refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  const onPortal = async () => {
    setBusy(true);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setBusy(true);
    try {
      await logout();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const entitlement = me?.entitlements?.[0];
  const hasInactiveEntitlement = !!entitlement;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Kein aktiver Zugang
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          {me?.email ? (
            <>
              Du bist als <strong>{me.email}</strong> angemeldet, hast aber aktuell
              keinen aktiven Zugang fuer den Simulator.
            </>
          ) : (
            'Du brauchst einen aktiven Zugang, um den Simulator zu nutzen.'
          )}
        </p>

        <div className="space-y-2">
          <a
            href={pricingUrl}
            className="block w-full text-center rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Zur Pricing-Seite
          </a>
          {hasInactiveEntitlement && (
            <button
              type="button"
              disabled={busy}
              onClick={onPortal}
              className="block w-full text-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Abo verwalten
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onLogout}
            className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 disabled:opacity-60"
          >
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
}
