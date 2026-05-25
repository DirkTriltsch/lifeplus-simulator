// 1:1 uebernommen aus dem Inline-Script in website/templates/mein-konto.html.
export interface AccountPageConfig {
  apiBase: string;
  appUrl: string;
  contactEmail: string;
}

interface Entitlement {
  active?: boolean;
  plan?: string;
  validUntil?: string;
}
interface Me {
  authenticated?: boolean;
  email?: string;
  entitlements?: Entitlement[];
  deviceLimit?: number;
  activeDevices?: number;
}

export function setupAccountPage(cfg: AccountPageConfig): void {
  if (typeof document === 'undefined') return;
  const API_BASE = (cfg.apiBase || '').replace(/\/$/, '');
  const APP_URL = cfg.appUrl;
  const CONTACT_EMAIL = cfg.contactEmail;

  const states = ['state-loading', 'state-anonymous', 'state-sent', 'state-verifying', 'state-account'];
  function show(id: string) {
    states.forEach((s) => document.getElementById(s)?.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');
  }
  function setText(id: string, text: string) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function setMsg(id: string, text: string, kind?: 'error' | 'success') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden', 'error', 'success');
    if (kind) el.classList.add(kind);
  }
  function hideMsg(id: string) {
    document.getElementById(id)?.classList.add('hidden');
  }

  async function apiFetch(path: string, init?: RequestInit) {
    return fetch(API_BASE + path, Object.assign({ credentials: 'include' as RequestCredentials }, init || {}));
  }

  async function loadMe(): Promise<Me> {
    try {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('me_failed');
      return (await res.json()) as Me;
    } catch {
      return { authenticated: false };
    }
  }

  function renderAccount(me: Me) {
    setText('account-email', me.email || '—');
    const ent = (me.entitlements && me.entitlements[0]) || null;
    if (ent) {
      const el = document.getElementById('account-status');
      if (el) {
        if (ent.active) {
          el.innerHTML = '<span class="account-status-active">Aktiv</span>';
          setText('account-until-label', 'Naechste Verlaengerung');
        } else {
          el.innerHTML = '<span class="account-status-inactive">Abgelaufen / inaktiv</span>';
          setText('account-until-label', 'Endete am');
        }
      }
      setText('account-plan', ent.plan || '—');
      if (ent.validUntil) {
        const d = new Date(ent.validUntil);
        setText('account-until', d.toLocaleDateString('de-DE'));
        document.getElementById('account-row-until')?.classList.remove('hidden');
      } else {
        document.getElementById('account-row-until')?.classList.add('hidden');
      }
      document.getElementById('account-row-plan')?.classList.remove('hidden');
    } else {
      const el = document.getElementById('account-status');
      if (el) el.innerHTML = '<span class="account-status-inactive">Kein aktives Abo</span>';
      document.getElementById('account-row-plan')?.classList.add('hidden');
      document.getElementById('account-row-until')?.classList.add('hidden');
    }
    const limit = me.deviceLimit || 3;
    const active = me.activeDevices || 0;
    setText('account-devices', active + ' von ' + limit);
  }

  async function verifyMagicLink(token: string) {
    show('state-verifying');
    try {
      const res = await apiFetch('/api/auth/verify-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error('verify_failed');
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
      const me = await loadMe();
      if (me.authenticated) {
        renderAccount(me);
        show('state-account');
      } else {
        show('state-anonymous');
      }
    } catch {
      show('state-anonymous');
      setMsg('login-msg', 'Login-Link ungueltig oder abgelaufen. Bitte neuen Link anfordern.', 'error');
    }
  }

  async function init() {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (token) {
      await verifyMagicLink(token);
      return;
    }
    const me = await loadMe();
    if (me.authenticated) {
      renderAccount(me);
      show('state-account');
    } else {
      const prefill = url.searchParams.get('email');
      if (prefill) {
        const input = document.getElementById('login-email') as HTMLInputElement | null;
        if (input) input.value = prefill;
      }
      show('state-anonymous');
    }
  }

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email') as HTMLInputElement | null;
    const btn = document.getElementById('login-btn') as HTMLButtonElement | null;
    if (!emailInput || !btn) return;
    hideMsg('login-msg');
    const email = (emailInput.value || '').trim();
    if (!email) return;
    btn.disabled = true;
    btn.textContent = 'Sende Link…';
    try {
      const res = await apiFetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('request_failed');
      show('state-sent');
    } catch {
      setMsg('login-msg', 'Konnte den Link nicht senden. Bitte spaeter erneut versuchen.', 'error');
      btn.disabled = false;
      btn.textContent = 'Login-Link senden';
    }
  });

  document.getElementById('portal-btn')?.addEventListener('click', async function (this: HTMLButtonElement) {
    this.disabled = true;
    hideMsg('account-msg');
    try {
      const res = await apiFetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) {
        if (res.status === 404) {
          setMsg('account-msg', 'Wir konnten dein Kundenkonto bei Paddle nicht finden. Bitte schreibe uns an ' + CONTACT_EMAIL + '.', 'error');
        } else {
          setMsg('account-msg', 'Das Abo-Portal konnte gerade nicht geoeffnet werden. Bitte spaeter erneut versuchen.', 'error');
        }
        this.disabled = false;
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        setMsg('account-msg', 'Antwort von Paddle ungueltig. Bitte spaeter erneut versuchen.', 'error');
        this.disabled = false;
      }
    } catch {
      setMsg('account-msg', 'Netzwerkfehler. Bitte spaeter erneut versuchen.', 'error');
      this.disabled = false;
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', async function (this: HTMLButtonElement) {
    this.disabled = true;
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    window.location.href = '/mein-konto.html';
  });

  // Silence unused warning if APP_URL changes pattern later
  void APP_URL;

  init();
}
