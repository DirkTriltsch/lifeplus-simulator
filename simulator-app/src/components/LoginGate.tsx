import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { requestOtpCode, verifyOtpCode } from '../auth/api';

interface LoginGateProps {
  pricingUrl: string;
}

export function LoginGate({ pricingUrl }: LoginGateProps): JSX.Element {
  const { refresh } = useAuth();
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URL(window.location.href).searchParams.get('email') ?? '';
  });
  const [code, setCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'error'>(
    'idle',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isCheckoutSuccess =
    typeof window !== 'undefined' &&
    new URL(window.location.href).searchParams.get('checkout') === 'success';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('token') && !url.searchParams.has('access')) return;
    url.searchParams.delete('token');
    url.searchParams.delete('access');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setPhase('sending');
    setErrorMsg(null);
    try {
      await requestOtpCode(cleanEmail);
      setPendingEmail(cleanEmail);
      setCode('');
      setPhase('sent');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      setPhase('error');
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (!pendingEmail || cleanCode.length !== 6) return;
    setPhase('verifying');
    setErrorMsg(null);
    try {
      const result = await verifyOtpCode(pendingEmail, cleanCode);
      await refresh();
      if (result.nextUrl) {
        window.location.href = result.nextUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      setPhase('sent');
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
      <CenteredCard title="Code eingeben">
        <p className="text-sm text-gray-700">
          Wenn die E-Mail-Adresse bei uns bekannt ist, hast du in den naechsten
          Minuten einen 6-stelligen Code in deinem Postfach.
        </p>
        <form onSubmit={onVerify} className="space-y-3 mt-4">
          <input
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-xl font-semibold tracking-[0.2em] focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
          <button
            type="submit"
            disabled={code.length !== 6}
            className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Code pruefen
          </button>
          {errorMsg && (
            <p className="text-xs text-red-600 mt-2">Fehler: {errorMsg}</p>
          )}
        </form>
        <button
          type="button"
          onClick={() => setPhase('idle')}
          className="mt-3 block w-full text-center text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          Andere E-Mail verwenden
        </button>
        <a
          href={pricingUrl}
          className="mt-4 block text-center text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          Noch keinen Zugang? Jetzt Plan auswaehlen
        </a>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard title={isCheckoutSuccess ? 'Kauf abgeschlossen' : 'Anmelden'}>
      <p className="text-sm text-gray-600 mb-4">
        {isCheckoutSuccess
          ? 'Fast fertig: Melde dich mit der Kauf-E-Mail an, damit wir deinen Zugang diesem Geraet zuordnen koennen.'
          : 'Gib deine E-Mail-Adresse ein. Wir schicken dir einen einmaligen Login-Code.'}
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
          {phase === 'sending' ? 'Sende Code...' : 'Code anfordern'}
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
