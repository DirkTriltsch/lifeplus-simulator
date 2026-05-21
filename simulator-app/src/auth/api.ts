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
// VITE_API_BASE_URL is set at build time; if absent we fall back to same-origin
// for any future "all-on-Cloudflare" rebuild.
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

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
    throw new Error(`Request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

const headers = { 'content-type': 'application/json' } as const;

export function fetchMe(): Promise<MeResponse> {
  return fetch(apiUrl('/api/me'), { credentials: 'include' }).then(asJson<MeResponse>);
}

export function requestMagicLink(email: string): Promise<{ ok: boolean }> {
  return fetch(apiUrl('/api/auth/request-link'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ email }),
  }).then(asJson<{ ok: boolean }>);
}

export function verifyMagicLink(token: string): Promise<{ ok: boolean; sessionKind: string }> {
  return fetch(apiUrl('/api/auth/verify-link'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ token }),
  }).then(asJson<{ ok: boolean; sessionKind: string }>);
}

export function logout(): Promise<{ ok: boolean }> {
  return fetch(apiUrl('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  }).then(asJson<{ ok: boolean }>);
}

export function listDevices(): Promise<DevicesResponse> {
  return fetch(apiUrl('/api/devices'), { credentials: 'include' }).then(asJson<DevicesResponse>);
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
