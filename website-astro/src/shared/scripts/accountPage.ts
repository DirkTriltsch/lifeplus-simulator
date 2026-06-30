// "Mein Konto" — Hybrid-Variante 2 (siehe
// design concepts/mein-konto-paddle-portal-options.html). Wir zeigen
// Zahlungsdaten + Rechnungen direkt auf unserer Seite. Kuendigen/Resume
// laufen ueber unsere eigene API (direkter Paddle-Call), Karten-Wechsel
// und "Alle Rechnungen" bleiben Paddle-Portal-Deep-Links (PCI).

export interface AccountPageConfig {
  apiBase: string;
  appUrl: string;
  contactEmail: string;
}

// ─── /api/me ───────────────────────────────────────────────────────

interface Entitlement {
  active?: boolean;
  plan?: string;
  validUntil?: string;
  source?: string;
  billingCycle?: 'monthly' | 'halfyear' | 'yearly' | null;
}
interface Me {
  authenticated?: boolean;
  email?: string;
  entitlements?: Entitlement[];
  deviceLimit?: number;
  activeDevices?: number;
}

// ─── /api/account/subscription-details ─────────────────────────────

interface SubscriptionPaymentMethod {
  type: string;
  cardBrand: string | null;
  last4: string | null;
}
interface SubscriptionDetails {
  id: string;
  status: string;
  nextBilledAt: string | null;
  scheduledChange: { action: string; effectiveAt: string } | null;
  nextTransaction: {
    total: string | null;
    currencyCode: string | null;
    formattedTotal: string | null;
  } | null;
  paymentMethod: SubscriptionPaymentMethod | null;
}

// ─── /api/account/payments ─────────────────────────────────────────

interface PaymentItem {
  id: string;
  status: string;
  billedAt: string | null;
  invoiceNumber: string | null;
  total: string | null;
  currencyCode: string | null;
  formattedTotal: string | null;
  origin: string | null;
}

// ─── Labels ────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  pro: 'Pro',
  free: 'Free',
  lifetime: 'Pro · Lifetime',
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: '1 Monat',
  halfyear: '6 Monate',
  yearly: '1 Jahr',
};

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  american_express: 'American Express',
  amex: 'American Express',
  discover: 'Discover',
  diners_club: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  maestro: 'Maestro',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Karte',
  paypal: 'PayPal',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  alipay: 'Alipay',
  sepa_direct_debit: 'SEPA-Lastschrift',
  ideal: 'iDEAL',
  bancontact: 'Bancontact',
  wire_transfer: 'Überweisung',
  unknown: 'Nicht hinterlegt',
};

const TXN_ORIGIN_LABELS: Record<string, string> = {
  web: 'Erstkauf',
  subscription_recurring: 'Verlängerung',
  subscription_payment_method_change: 'Zahlungsmethoden-Wechsel',
  subscription_update: 'Plan-Update',
  subscription_charge: 'Einmalbuchung',
};

function renderPlanLabel(ent: Entitlement): string {
  const base = PLAN_LABELS[ent.plan ?? ''] ?? ent.plan ?? '—';
  const cycle = ent.billingCycle ? CYCLE_LABELS[ent.billingCycle] : null;
  return cycle ? `${base} · ${cycle}` : base;
}

function renderPaymentMethodLabel(pm: SubscriptionPaymentMethod | null): string {
  if (!pm) return 'Nicht hinterlegt';
  if (pm.type === 'card') {
    const brand = pm.cardBrand ? (CARD_BRAND_LABELS[pm.cardBrand] ?? pm.cardBrand) : 'Karte';
    return pm.last4 ? `${brand} **** ${pm.last4}` : brand;
  }
  return PAYMENT_METHOD_LABELS[pm.type] ?? pm.type;
}

function formatGermanDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('de-DE');
}

// ─── Hauptfunktion ─────────────────────────────────────────────────

export function setupAccountPage(cfg: AccountPageConfig): void {
  if (typeof document === 'undefined') return;
  const API_BASE = (cfg.apiBase || '').replace(/\/$/, '');
  const APP_URL = cfg.appUrl;
  const CONTACT_EMAIL = cfg.contactEmail;
  let pendingLoginEmail = '';

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
  function toggleHidden(id: string, hidden: boolean) {
    document.getElementById(id)?.classList.toggle('hidden', hidden);
  }

  async function apiFetch(path: string, init?: RequestInit) {
    return fetch(API_BASE + path, Object.assign({ credentials: 'include' as RequestCredentials }, init || {}));
  }

  // ─── Daten laden ──────────────────────────────────────────────

  async function loadMe(): Promise<Me> {
    try {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('me_failed');
      return (await res.json()) as Me;
    } catch {
      return { authenticated: false };
    }
  }

  async function loadSubscriptionDetails(): Promise<SubscriptionDetails | null> {
    try {
      const res = await apiFetch('/api/account/subscription-details');
      if (!res.ok) return null;
      const data = (await res.json()) as { subscription: SubscriptionDetails | null };
      return data.subscription ?? null;
    } catch {
      return null;
    }
  }

  async function loadPayments(): Promise<PaymentItem[]> {
    try {
      const res = await apiFetch('/api/account/payments?limit=5');
      if (!res.ok) return [];
      const data = (await res.json()) as { items: PaymentItem[] };
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  }

  // ─── Rendering: Basis-Konto-Daten ─────────────────────────────

  function renderAccount(me: Me) {
    setText('account-email', me.email || '—');
    const ent = (me.entitlements && me.entitlements[0]) || null;
    const cancelBtn = document.getElementById('cancel-sub-btn');
    if (ent) {
      const el = document.getElementById('account-status');
      if (el) {
        if (ent.active) {
          el.innerHTML = '<span class="account-status-active">Aktiv</span>';
          setText('account-until-label', 'Nächste Verlängerung');
        } else {
          el.innerHTML = '<span class="account-status-inactive">Abgelaufen / inaktiv</span>';
          setText('account-until-label', 'Endete am');
        }
      }
      setText('account-plan', renderPlanLabel(ent));
      if (ent.validUntil) {
        const formatted = formatGermanDate(ent.validUntil);
        setText('account-until', formatted);
        setText('cancel-modal-until', formatted);
        toggleHidden('account-row-until', false);
      } else {
        setText('cancel-modal-until', 'Ende der bezahlten Laufzeit');
        toggleHidden('account-row-until', true);
      }
      toggleHidden('account-row-plan', false);
      if (cancelBtn) {
        const showCancel = ent.active === true && ent.source === 'subscription';
        cancelBtn.classList.toggle('hidden', !showCancel);
      }
    } else {
      const el = document.getElementById('account-status');
      if (el) el.innerHTML = '<span class="account-status-inactive">Kein aktives Abo</span>';
      toggleHidden('account-row-plan', true);
      toggleHidden('account-row-until', true);
      cancelBtn?.classList.add('hidden');
    }
    const limit = me.deviceLimit || 3;
    const active = me.activeDevices || 0;
    setText('account-devices', active + ' von ' + limit);
  }

  // ─── Rendering: Zahlung & Abrechnung ──────────────────────────

  function renderBilling(sub: SubscriptionDetails | null) {
    if (!sub) {
      toggleHidden('billing-section', true);
      return;
    }
    toggleHidden('billing-section', false);

    setText('billing-method', renderPaymentMethodLabel(sub.paymentMethod));

    if (sub.scheduledChange?.action === 'cancel') {
      setText('billing-next', 'Keine — Abo endet am ' + formatGermanDate(sub.scheduledChange.effectiveAt));
    } else if (sub.nextTransaction?.formattedTotal && sub.nextBilledAt) {
      setText(
        'billing-next',
        `${sub.nextTransaction.formattedTotal} am ${formatGermanDate(sub.nextBilledAt)}`,
      );
    } else if (sub.nextBilledAt) {
      setText('billing-next', formatGermanDate(sub.nextBilledAt));
    } else {
      setText('billing-next', '—');
    }
  }

  // ─── Rendering: Rechnungen ────────────────────────────────────

  function renderPayments(items: PaymentItem[]) {
    const section = document.getElementById('payments-section');
    const list = document.getElementById('payments-list');
    const empty = document.getElementById('payments-empty');
    if (!section || !list || !empty) return;

    // Nur sichtbar, wenn Sub existiert (Billing-Section nicht hidden).
    const billingVisible = !document.getElementById('billing-section')?.classList.contains('hidden');
    section.classList.toggle('hidden', !billingVisible);
    if (!billingVisible) return;

    list.innerHTML = '';

    if (items.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    for (const item of items) {
      const li = document.createElement('li');
      li.className = 'payment-row';

      const meta = document.createElement('span');
      meta.className = 'payment-meta';
      const dateSpan = document.createElement('span');
      dateSpan.className = 'payment-date';
      dateSpan.textContent = formatGermanDate(item.billedAt);
      meta.appendChild(dateSpan);
      const descSpan = document.createElement('span');
      descSpan.className = 'payment-desc';
      const originLabel = item.origin ? (TXN_ORIGIN_LABELS[item.origin] ?? item.origin) : '';
      descSpan.textContent = originLabel || (item.invoiceNumber ?? '');
      meta.appendChild(descSpan);
      li.appendChild(meta);

      const amount = document.createElement('span');
      amount.className = 'payment-amount';
      amount.textContent = item.formattedTotal ?? '—';
      if (item.status === 'refunded' || item.status === 'partially_refunded') {
        const refund = document.createElement('span');
        refund.className = 'payment-status-refunded';
        refund.textContent = item.status === 'refunded' ? ' (erstattet)' : ' (teil-erstattet)';
        amount.appendChild(refund);
      }
      li.appendChild(amount);

      // PDF-Download nur, wenn die Transaction wirklich bezahlt ist.
      if (item.status === 'paid' || item.status === 'completed' || item.status === 'billed') {
        const link = document.createElement('a');
        link.className = 'payment-pdf';
        link.href = `${API_BASE}/api/account/invoice?txn=${encodeURIComponent(item.id)}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'PDF ↓';
        li.appendChild(link);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'payment-desc';
        placeholder.textContent = '';
        li.appendChild(placeholder);
      }

      list.appendChild(li);
    }
  }

  // ─── Rendering: Scheduled-Cancel-Banner ───────────────────────

  function renderScheduledCancel(sub: SubscriptionDetails | null) {
    const banner = document.getElementById('scheduled-cancel-banner');
    const cancelBtn = document.getElementById('cancel-sub-btn');
    if (!banner) return;
    if (sub?.scheduledChange?.action === 'cancel') {
      setText('scheduled-cancel-date', formatGermanDate(sub.scheduledChange.effectiveAt));
      banner.classList.remove('hidden');
      // Wenn schon gekuendigt: Kuendigen-Button verstecken.
      cancelBtn?.classList.add('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  // ─── Sub-Daten laden + alle abhaengigen Sektionen rendern ─────

  async function loadAndRenderSubscriptionSections() {
    const sub = await loadSubscriptionDetails();
    renderBilling(sub);
    renderScheduledCancel(sub);
    const payments = sub ? await loadPayments() : [];
    renderPayments(payments);
  }

  // Login-Code-Flow

  async function verifyLoginCode(email: string, code: string) {
    show('state-verifying');
    try {
      const res = await apiFetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) throw new Error('verify_failed');
      const me = await loadMe();
      if (me.authenticated) {
        renderAccount(me);
        show('state-account');
        void loadAndRenderSubscriptionSections();
      } else {
        show('state-anonymous');
      }
    } catch {
      show('state-sent');
      setMsg('login-code-msg', 'Code ungueltig oder abgelaufen. Bitte pruefe die Eingabe oder fordere einen neuen Code an.', 'error');
    }
  }

  async function init() {
    const url = new URL(window.location.href);
    const me = await loadMe();
    if (me.authenticated) {
      renderAccount(me);
      show('state-account');
      void loadAndRenderSubscriptionSections();
    } else {
      const prefill = url.searchParams.get('email');
      if (prefill) {
        const input = document.getElementById('login-email') as HTMLInputElement | null;
        if (input) input.value = prefill;
      }
      show('state-anonymous');
    }
  }

  // ─── Login-Form ───────────────────────────────────────────────

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email') as HTMLInputElement | null;
    const btn = document.getElementById('login-btn') as HTMLButtonElement | null;
    if (!emailInput || !btn) return;
    hideMsg('login-msg');
    const email = (emailInput.value || '').trim();
    if (!email) return;
    btn.disabled = true;
    btn.textContent = 'Sende Code...';
    try {
      const res = await apiFetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('request_failed');
      pendingLoginEmail = email.toLowerCase();
      show('state-sent');
      const codeInput = document.getElementById('login-code') as HTMLInputElement | null;
      if (codeInput) {
        codeInput.value = '';
        codeInput.focus();
      }
    } catch {
      setMsg('login-msg', 'Konnte den Code nicht senden. Bitte spaeter erneut versuchen.', 'error');
      btn.disabled = false;
      btn.textContent = 'Code senden';
    }
  });

  // ─── Paddle-Portal-Deep-Links (Karte ändern, Alle Rechnungen) ─

  document.getElementById('login-code')?.addEventListener('input', function (this: HTMLInputElement) {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
    hideMsg('login-code-msg');
  });

  document.getElementById('login-code-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeInput = document.getElementById('login-code') as HTMLInputElement | null;
    const btn = document.getElementById('login-code-btn') as HTMLButtonElement | null;
    if (!codeInput || !btn) return;
    const code = codeInput.value.replace(/\D/g, '').slice(0, 6);
    if (!pendingLoginEmail || code.length !== 6) return;
    hideMsg('login-code-msg');
    btn.disabled = true;
    btn.textContent = 'Pruefe...';
    await verifyLoginCode(pendingLoginEmail, code);
    btn.disabled = false;
    btn.textContent = 'Einloggen';
  });

  async function openPortalSession(
    btn: HTMLButtonElement,
    action: 'overview' | 'payment_method',
  ): Promise<void> {
    const prevLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Öffne Paddle …';
    hideMsg('account-msg');
    try {
      const res = await apiFetch('/api/billing/portal?action=' + action, { method: 'POST' });
      if (!res.ok) {
        if (res.status === 404) {
          setMsg('account-msg', 'Wir konnten dein Kundenkonto bei Paddle nicht finden. Bitte schreibe uns an ' + CONTACT_EMAIL + '.', 'error');
        } else if (res.status === 409) {
          setMsg('account-msg', 'Für diese Aktion ist kein aktives Abo hinterlegt.', 'error');
        } else {
          setMsg('account-msg', 'Das Paddle-Portal konnte gerade nicht geöffnet werden. Bitte später erneut versuchen.', 'error');
        }
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        setMsg('account-msg', 'Antwort von Paddle ungültig. Bitte später erneut versuchen.', 'error');
      }
    } catch {
      setMsg('account-msg', 'Netzwerkfehler. Bitte später erneut versuchen.', 'error');
    } finally {
      btn.disabled = false;
      if (prevLabel !== null) btn.textContent = prevLabel;
    }
  }

  const changePaymentBtn = document.getElementById('change-payment-btn') as HTMLButtonElement | null;
  changePaymentBtn?.addEventListener('click', () => {
    void openPortalSession(changePaymentBtn, 'payment_method');
  });

  const overviewBtn = document.getElementById('portal-overview-btn') as HTMLButtonElement | null;
  overviewBtn?.addEventListener('click', () => {
    void openPortalSession(overviewBtn, 'overview');
  });

  // ─── Cancel-Flow (direkter API-Call, kein Paddle-Redirect) ────

  const modal = document.getElementById('cancel-modal');
  const cancelBtn = document.getElementById('cancel-sub-btn') as HTMLButtonElement | null;
  const modalConfirm = document.getElementById('cancel-modal-confirm') as HTMLButtonElement | null;
  const modalAbort = document.getElementById('cancel-modal-abort') as HTMLButtonElement | null;
  const undoCancelBtn = document.getElementById('undo-cancel-btn') as HTMLButtonElement | null;

  function openCancelModal() {
    hideMsg('cancel-modal-msg');
    modal?.classList.remove('hidden');
  }
  function closeCancelModal() {
    modal?.classList.add('hidden');
  }

  cancelBtn?.addEventListener('click', openCancelModal);
  modalAbort?.addEventListener('click', closeCancelModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeCancelModal();
  });

  modalConfirm?.addEventListener('click', async () => {
    if (!modalConfirm) return;
    const prev = modalConfirm.textContent;
    modalConfirm.disabled = true;
    modalConfirm.textContent = 'Kündige …';
    hideMsg('cancel-modal-msg');
    try {
      const res = await apiFetch('/api/account/cancel-subscription', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        if (res.status === 409) {
          setMsg('cancel-modal-msg', 'Es ist kein aktives Abo zum Kündigen vorhanden.', 'error');
        } else {
          setMsg('cancel-modal-msg', 'Kündigung gerade nicht möglich. Bitte später erneut versuchen oder ' + CONTACT_EMAIL + ' kontaktieren.', 'error');
        }
        return;
      }
      closeCancelModal();
      await loadAndRenderSubscriptionSections();
      setMsg('account-msg', 'Kündigung erfolgreich geplant. Dein Zugang bleibt bis zum Ende der Laufzeit aktiv.', 'success');
    } catch {
      setMsg('cancel-modal-msg', 'Netzwerkfehler. Bitte später erneut versuchen.', 'error');
    } finally {
      modalConfirm.disabled = false;
      if (prev !== null) modalConfirm.textContent = prev;
    }
  });

  undoCancelBtn?.addEventListener('click', async () => {
    if (!undoCancelBtn) return;
    const prev = undoCancelBtn.textContent;
    undoCancelBtn.disabled = true;
    undoCancelBtn.textContent = 'Rückgängig …';
    hideMsg('account-msg');
    try {
      const res = await apiFetch('/api/account/cancel-subscription', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ undo: true }),
      });
      if (!res.ok) {
        setMsg('account-msg', 'Kündigung konnte gerade nicht zurückgenommen werden. Bitte später erneut versuchen.', 'error');
        return;
      }
      await loadAndRenderSubscriptionSections();
      setMsg('account-msg', 'Kündigung wurde zurückgenommen. Dein Abo läuft normal weiter.', 'success');
    } catch {
      setMsg('account-msg', 'Netzwerkfehler. Bitte später erneut versuchen.', 'error');
    } finally {
      undoCancelBtn.disabled = false;
      if (prev !== null) undoCancelBtn.textContent = prev;
    }
  });

  // ─── Logout ───────────────────────────────────────────────────

  document.getElementById('logout-btn')?.addEventListener('click', async function (this: HTMLButtonElement) {
    this.disabled = true;
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    window.location.href = '/mein-konto.html';
  });

  void APP_URL;

  init();
}
