import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { logout, openBillingPortal } from '../auth/api';

interface AccountPanelProps {
  pricingUrl: string;
  onClose: () => void;
}

export function AccountPanel({ pricingUrl, onClose }: AccountPanelProps): JSX.Element {
  const { me, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/404/.test(msg) || /no_customer/i.test(msg)) {
        setError(
          'Wir konnten dein Kundenkonto bei Paddle nicht finden. Bitte schreibe uns kurz an support@lifeflow360.app.',
        );
      } else {
        setError(
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
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const entitlement = me?.entitlements?.[0];
  const hasActiveEntitlement = entitlement?.active === true;
  const validUntilText = entitlement?.validUntil
    ? new Date(entitlement.validUntil).toLocaleDateString('de-DE')
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-xl mt-12 sm:mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Mein Konto</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schliessen"
            className="text-gray-400 hover:text-gray-700 p-1 -m-1 rounded"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Angemeldet als</p>
            <p className="text-sm font-medium text-gray-900">{me?.email ?? '—'}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Status</p>
            {entitlement ? (
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {hasActiveEntitlement ? (
                    <span className="text-brand-700">
                      Aktiv ({entitlement.plan})
                    </span>
                  ) : (
                    <span className="text-amber-700">Abgelaufen ({entitlement.plan})</span>
                  )}
                </p>
                {validUntilText && (
                  <p className="text-xs text-gray-500 mt-1">
                    {hasActiveEntitlement ? 'Gueltig bis' : 'Endete am'} {validUntilText}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                Du hast aktuell kein aktives Abo.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Geraete</p>
            <p className="text-sm text-gray-700">
              {me?.activeDevices ?? 0} von {me?.deviceLimit ?? 3} aktiv
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={onPortal}
            className="block w-full text-center rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Abo bei Paddle verwalten
          </button>

          <a
            href={pricingUrl}
            className="block w-full text-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Plan wechseln oder neu kaufen
          </a>

          <button
            type="button"
            disabled={busy}
            onClick={onLogout}
            className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 disabled:opacity-60"
          >
            Abmelden
          </button>

          {error && (
            <p className="text-xs text-red-600 pt-2">{error}</p>
          )}
        </div>

        <div className="px-6 pb-5 pt-1 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Zahlung, Rechnung und Kuendigung laufen ueber Paddle als Verkaufsabwickler
            (Merchant of Record). Klicke "Abo bei Paddle verwalten" um Zahlungsdaten zu
            aendern oder Rechnungen herunterzuladen.
          </p>
        </div>
      </div>
    </div>
  );
}
