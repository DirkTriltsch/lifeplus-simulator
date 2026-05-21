import type { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { LoginGate } from './LoginGate';
import { Paywall } from './Paywall';
import { DeviceLimitGate } from './DeviceLimitGate';

interface AuthGateProps {
  pricingUrl: string;
  children: ReactNode;
}

export function AuthGate({ pricingUrl, children }: AuthGateProps): JSX.Element {
  const { status } = useAuth();

  switch (status) {
    case 'loading':
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Pruefe Zugang...</p>
        </div>
      );
    case 'anonymous':
      return <LoginGate />;
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
