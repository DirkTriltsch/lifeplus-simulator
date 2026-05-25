export interface Entitlement {
  brand: string;
  plan: string;
  active: boolean;
  validUntil: number | null;
  source: string;
}

export interface MeResponse {
  authenticated: boolean;
  sessionKind?: 'normal' | 'device_limit_reached';
  email?: string;
  brand?: string;
  entitlements: Entitlement[];
  deviceLimit: number;
  activeDevices: number;
}

export interface DeviceItem {
  id: string;
  label: string;
  lastSeenAt: number;
  firstSeenAt: number;
  isCurrent: boolean;
}

export interface DevicesResponse {
  deviceLimit: number;
  currentDeviceId: string;
  devices: DeviceItem[];
}

// Hybrid topology: API lives on a separate subdomain (e.g. api.lifeflow360.app).
// VITE_API_BASE_URL is set at build time. The hostname fallback protects
// production builds if an env file is missed or an older build config is used.
const API_BASE = resolveApiBase();

function resolveApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'www.lifeflow360.app' || host === 'lifeflow360.app') {
      return 'https://api.lifeflow360.app';
    }
  }

  return '';
}

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html') || detail.trim().startsWith('<!DOCTYPE html')) {
      throw new Error(
        `API nicht erreichbar (${res.status}). Bitte pruefe, ob api.lifeflow360.app auf Cloudflare zeigt und die Pages Functions deployed sind.`,
      );
    }
    throw new Error(`Request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

const headers = { 'content-type': 'application/json' } as const;
const noStore = { cache: 'no-store' } as const;

export function fetchMe(): Promise<MeResponse> {
  return fetch(apiUrl('/api/me'), {
    credentials: 'include',
    ...noStore,
  }).then(asJson<MeResponse>);
}

export function requestMagicLink(email: string): Promise<{ ok: boolean }> {
  return fetch(apiUrl('/api/auth/request-link'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ email }),
  }).then(asJson<{ ok: boolean }>);
}

export function verifyMagicLink(
  token: string,
  access?: 'free',
): Promise<{ ok: boolean; sessionKind: string }> {
  return fetch(apiUrl('/api/auth/verify-link'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(access ? { token, access } : { token }),
  }).then(asJson<{ ok: boolean; sessionKind: string }>);
}

export function logout(): Promise<{ ok: boolean }> {
  return fetch(apiUrl('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  }).then(asJson<{ ok: boolean }>);
}

export function listDevices(): Promise<DevicesResponse> {
  return fetch(apiUrl('/api/devices'), {
    credentials: 'include',
    ...noStore,
  }).then(asJson<DevicesResponse>);
}

export function revokeDevice(deviceId: string): Promise<{ ok: boolean; promoted?: boolean; loggedOut?: boolean }> {
  return fetch(apiUrl('/api/devices/revoke'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ deviceId }),
  }).then(asJson<{ ok: boolean; promoted?: boolean; loggedOut?: boolean }>);
}

export function openBillingPortal(): Promise<{ url: string }> {
  return fetch(apiUrl('/api/billing/portal'), {
    method: 'POST',
    credentials: 'include',
  }).then(asJson<{ url: string }>);
}
