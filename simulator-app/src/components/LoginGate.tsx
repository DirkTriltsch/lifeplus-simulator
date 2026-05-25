import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { requestMagicLink, verifyMagicLink } from '../auth/api';

export function LoginGate(): JSX.Element {
  const { refresh } = useAuth();
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URL(window.location.href).searchParams.get('email') ?? '';
  });
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'error'>(
    'idle',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isCheckoutSuccess =
    typeof window !== 'undefined' &&
    new URL(window.location.href).searchParams.get('checkout') === 'success';

  // Auto-verify if there is a ?token=... in the URL (magic link redirect).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (!token) return;
    const access = url.searchParams.get('access') === 'free' ? 'free' : undefined;

    setPhase('verifying');
    verifyMagicLink(token, access)
      .then(async () => {
        url.searchParams.delete('token');
        url.searchParams.delete('access');
        window.history.replaceState({}, '', url.toString());
        await refresh();
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setPhase('error');
      });
  }, [refresh]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setPhase('sending');
    setErrorMsg(null);
    try {
      await requestMagicLink(email.trim());
      setPhase('sent');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  if (phase === 'verifying') {
    return (
      <CenteredCard title="Login wird geprueft">
        <p className="text-sm text-gray-600">Einen Moment bitte...</p>
      </CenteredCard>
    );
  }

  if (phase === 'sent') {
    return (
      <CenteredCard title="Link gesendet">
        <p className="text-sm text-gray-700">
          Wenn die E-Mail-Adresse bei uns bekannt ist, hast du in den naechsten
          Minuten einen Login-Link in deinem Postfach.
        </p>
        <p className="text-xs text-gray-500 mt-3">
          Du kannst dieses Fenster offen lassen und auf den Link in der Mail klicken.
        </p>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard title={isCheckoutSuccess ? 'Kauf abgeschlossen' : 'Anmelden'}>
      <p className="text-sm text-gray-600 mb-4">
        {isCheckoutSuccess
          ? 'Fast fertig: Melde dich mit der Kauf-E-Mail an, damit wir deinen Zugang diesem Geraet zuordnen koennen.'
          : 'Gib deine E-Mail-Adresse ein. Wir schicken dir einen einmaligen Login-Link.'}
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="du@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
        <button
          type="submit"
          disabled={phase === 'sending'}
          className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {phase === 'sending' ? 'Sende Link...' : 'Login-Link senden'}
        </button>
        {errorMsg && (
          <p className="text-xs text-red-600 mt-2">Fehler: {errorMsg}</p>
        )}
      </form>
    </CenteredCard>
  );
}

function CenteredCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-3">{title}</h1>
        {children}
      </div>
    </div>
  );
}
