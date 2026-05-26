import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchMe, type MeResponse } from './api';

export type AuthStatus =
  | 'loading'
  | 'anonymous'
  | 'authenticated_no_entitlement'
  | 'authenticated_active'
  | 'authenticated_past_due'
  | 'device_limit_reached';

interface AuthState {
  status: AuthStatus;
  me: MeResponse | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function deriveStatus(me: MeResponse | null): AuthStatus {
  if (!me) return 'loading';
  if (!me.authenticated) return 'anonymous';
  if (me.sessionKind === 'device_limit_reached') return 'device_limit_reached';
  const entitlement = me.entitlements[0];
  if (!entitlement || !entitlement.active) return 'authenticated_no_entitlement';
  // Past-due is signalled by source: subscription + plan still 'pro' but
  // backend logic puts validUntil within grace. We treat any active=true as active.
  return 'authenticated_active';
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const devAuthBypass = isDevAuthBypassEnabled();
  const [me, setMe] = useState<MeResponse | null>(
    devAuthBypass ? createDevMeResponse() : null,
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (devAuthBypass) {
      setMe(createDevMeResponse());
      setError(null);
      return;
    }

    try {
      const result = await fetchMe();
      setMe(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Treat backend unreachable as anonymous so the UI keeps moving.
      setMe({
        authenticated: false,
        entitlements: [],
        deviceLimit: 3,
        activeDevices: 0,
      });
    }
  }, [devAuthBypass]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      status: deriveStatus(me),
      me,
      error,
      refresh,
    }),
    [me, error, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isDevAuthBypassEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true';
}

function createDevMeResponse(): MeResponse {
  const brand = import.meta.env.VITE_PRODUCT ?? 'lifeplus';

  return {
    authenticated: true,
    sessionKind: 'normal',
    email: 'dev@lifeflow360.local',
    brand,
    entitlements: [
      {
        brand,
        plan: 'pro',
        active: true,
        validUntil: null,
        source: 'dev',
      },
    ],
    deviceLimit: 3,
    activeDevices: 1,
  };
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
