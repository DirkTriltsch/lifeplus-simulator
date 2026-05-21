import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { logout, openBillingPortal } from '../auth/api';

interface PaywallProps {
  pricingUrl: string;
}

export function Paywall({ pricingUrl }: PaywallProps): JSX.Element {
  const { me, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [activationChecks, setActivationChecks] = useState(0);

  const checkoutState = useMemo(() => {
    if (typeof window === 'undefined') {
      return { isSuccess: false, checkoutEmail: null as string | null };
    }
    const url = new URL(window.location.href);
    return {
      isSuccess: url.searchParams.get('checkout') === 'success',
      checkoutEmail: url.searchParams.get('email'),
    };
  }, []);

  useEffect(() => {
    if (!checkoutState.isSuccess) return;
    if (activationChecks >= 20) return;

    const timeout = window.setTimeout(() => {
      setActivationChecks((value) => value + 1);
      void refresh();
    }, activationChecks === 0 ? 1200 : 3000);

    return () => window.clearTimeout(timeout);
  }, [activationChecks, checkoutState.isSuccess, refresh]);

  const onPortal = async () => {
    setBusy(true);
    setPortalError(null);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/404/.test(msg) || /no_customer/i.test(msg)) {
        setPortalError(
          'Wir konnten dein Kundenkonto bei Paddle nicht finden. Bitte schreibe uns kurz an support@lifeflow360.app.',
        );
      } else {
        setPortalError(
          'Das Abo-Portal konnte gerade nicht geoeffnet werden. Bitte spaeter erneut versuchen.',
        );
      }
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
  const isWaitingForCheckoutActivation = checkoutState.isSuccess && activationChecks < 20;
  const hasCheckoutEmailMismatch =
    !!checkoutState.checkoutEmail &&
    !!me?.email &&
    checkoutState.checkoutEmail.toLowerCase() !== me.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          {checkoutState.isSuccess ? 'Kauf wird aktiviert' : 'Kein aktiver Zugang'}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          {isWaitingForCheckoutActivation ? (
            <>
              Deine Zahlung wurde abgeschlossen. Wir warten noch auf die
              Bestaetigung von Paddle und pruefen deinen Zugang automatisch.
            </>
          ) : hasCheckoutEmailMismatch ? (
            <>
              Der Kauf wurde mit <strong>{checkoutState.checkoutEmail}</strong>{' '}
              gestartet, du bist aber als <strong>{me?.email}</strong> angemeldet.
              Melde dich bitte mit der Kauf-E-Mail an oder kontaktiere den Support.
            </>
          ) : checkoutState.isSuccess ? (
            <>
              Deine Zahlung wurde abgeschlossen, aber fuer{' '}
              {me?.email ? <strong>{me.email}</strong> : 'diese Sitzung'} wurde
              noch kein aktiver Zugang gefunden. Bitte pruefe, ob Kauf-E-Mail und
              Login-E-Mail identisch sind.
            </>
          ) : me?.email ? (
            <>
              Du bist als <strong>{me.email}</strong> angemeldet, hast aber aktuell
              keinen aktiven Zugang fuer den Simulator.
            </>
          ) : (
            'Du brauchst einen aktiven Zugang, um den Simulator zu nutzen.'
          )}
        </p>

        <div className="space-y-2">
          {isWaitingForCheckoutActivation && (
            <button
              type="button"
              disabled
              className="block w-full text-center rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white opacity-80"
            >
              Freischaltung wird geprueft...
            </button>
          )}
          {!isWaitingForCheckoutActivation && (
          <a
            href={pricingUrl}
            className="block w-full text-center rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Zur Pricing-Seite
          </a>
          )}
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

        {portalError && (
          <p className="mt-4 text-xs text-red-600">{portalError}</p>
        )}
        {isWaitingForCheckoutActivation && (
          <p className="mt-4 text-xs text-gray-500">
            Pruefung {Math.max(1, activationChecks + 1)} von 20. Das dauert meist
            nur wenige Sekunden.
          </p>
        )}
      </div>
    </div>
  );
}
