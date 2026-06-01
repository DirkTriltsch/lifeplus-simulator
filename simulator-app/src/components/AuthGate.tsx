import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { LoginGate } from './LoginGate';
import { Paywall } from './Paywall';
import { DeviceLimitGate } from './DeviceLimitGate';

interface AuthGateProps {
  pricingUrl: string;
  loginUrl: string;
  children: ReactNode;
}

export function AuthGate({ pricingUrl, loginUrl, children }: AuthGateProps): JSX.Element {
  const { status } = useAuth();

  switch (status) {
    case 'loading':
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Pruefe Zugang...</p>
        </div>
      );
    case 'anonymous':
      return hasMagicToken() ? (
        <LoginGate pricingUrl={pricingUrl} />
      ) : (
        <RedirectToLogin loginUrl={loginUrl} />
      );
    case 'device_limit_reached':
      return <DeviceLimitGate />;
    case 'authenticated_no_entitlement':
      return <Paywall pricingUrl={pricingUrl} />;
    case 'authenticated_active':
    case 'authenticated_past_due':
    default:
      return <>{children}</>;
  }
}

function hasMagicToken(): boolean {
  if (typeof window === 'undefined') return false;
  return new URL(window.location.href).searchParams.has('token');
}

function RedirectToLogin({ loginUrl }: { loginUrl: string }): JSX.Element {
  useEffect(() => {
    window.location.replace(loginUrl);
  }, [loginUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Weiter zur Anmeldung...</p>
    </div>
  );
}
