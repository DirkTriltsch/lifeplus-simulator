// Checkout-Client (Schritt 1 Rechnungsdaten, Schritt 2 Paddle-Inline-Zahlung).
//
// Bedienkonzept aus TraderScope uebernommen (Verbraucher/Unternehmer,
// zweistufig, gesperrte Bestelluebersicht in Schritt 2), die Anbindung nutzt
// die LifeFlow360-Endpunkte:
//   POST /api/billing/preview-pricing         Paddle-Preisvorschau + Rabattcode
//   POST /api/billing/checkout-intent         Intent + serverseitige Transaktion
//   POST /api/billing/cancel-checkout-intent  "Daten aendern"
// Nach checkout.completed geht es zur Erfolgsseite, die post-checkout aufruft
// und auf den Entitlement-Eintrag wartet (scripts/checkoutSuccess.ts).

import {
  displayTotals,
  escapeHtml,
  isReverseChargePreview,
  normalizeVatId,
  renewalLabelFromSource,
  VAT_ID_RX,
  type PaddleTotalsLike,
} from './checkoutLogic';
import { storeCheckoutReference } from './checkoutReference';
import { formatEur } from '../lib/plans';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Paddle: any;
}

type BuyerType = 'consumer' | 'business';
type BannerKind = 'warn' | 'error' | 'success';

interface PaddleTotals extends PaddleTotalsLike {
  currency_code?: string;
  next_billed_at?: string | null;
  nextBilledAt?: string | null;
}

interface CheckoutIntentResponse {
  action:
    | 'start_checkout'
    | 'paddle_error'
    | 'manage_subscription'
    | 'already_paid'
    | 'email_mismatch'
    | 'login_required'
    | 'invalid_plan';
  transactionId?: string;
  intentId?: string;
  checkoutEmail?: string;
  discountCode?: string | null;
  totals?: PaddleTotals | null;
  errorDetail?: string;
  errorField?: string | null;
}

interface PreviewResult {
  totals: PaddleTotals | null;
  discountApplied: boolean;
  discountError: string | null;
  requestError: string | null;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NAME_MIN = 2;

const FIELD_TO_INPUT_ID: Record<string, string> = {
  email: 'checkoutEmail',
  street: 'street',
  postalCode: 'postalCode',
  city: 'city',
  country: 'countryCode',
  vat: 'vatId',
};

export function setupCheckoutPage(): void {
  if (typeof document === 'undefined') return;
  const root = document.querySelector<HTMLElement>('[data-checkout-page]');
  if (!root) return;

  // ── Konfiguration aus data-Attributen ────────────────────────
  const d = root.dataset;
  const apiBase = (d.apiBase ?? '').replace(/\/$/, '');
  const appUrl = d.appUrl ?? '/app/';
  const paddleToken = d.paddleToken ?? '';
  const paddleEnv = (d.paddleEnv ?? 'sandbox') as 'sandbox' | 'live';
  const plan = d.plan ?? '';
  const periodMonths = Number(d.periodMonths ?? '1');
  const catalog = {
    netCents: Number(d.netCents ?? '0'),
    vatCents: Number(d.vatCents ?? '0'),
    grossCents: Number(d.grossCents ?? '0'),
  };
  const consentVersion = d.consentVersion ?? '';
  const b2bVersion = d.b2bConfirmationVersion ?? '';
  const hintsHash = d.displayedHintsHash ?? '';
  const successUrl = d.successUrl ?? '/checkout/success.html';

  // ── DOM ──────────────────────────────────────────────────────
  const q = <T extends HTMLElement>(sel: string): T | null => root.querySelector<T>(sel);
  const form = q<HTMLFormElement>('[data-checkout-form]');
  const submit = q<HTMLButtonElement>('[data-checkout-submit]');
  const submitHint = q('[data-submit-hint]');
  const banner = q('[data-checkout-banner]');
  const steps = q('[data-step-indicator]');
  const pane1 = q('[data-step-pane="1"]');
  const pane2 = q('[data-step-pane="2"]');
  const backBtn = q<HTMLButtonElement>('[data-step-back]');
  const paddleWrap = q('[data-paddle-wrap]');
  const locked = q('[data-summary-locked]');

  const emailInput = q<HTMLInputElement>('#checkoutEmail');
  const emailHint = q('[data-email-hint]');
  const nameInput = q<HTMLInputElement>('#legalName');
  const nameLabel = q('[data-name-label]');
  const nameHint = q('[data-name-hint]');
  const streetInput = q<HTMLInputElement>('#street');
  const zipInput = q<HTMLInputElement>('#postalCode');
  const cityInput = q<HTMLInputElement>('#city');
  const countrySelect = q<HTMLSelectElement>('#countryCode');
  const vatInput = q<HTMLInputElement>('#vatId');
  const vatFeedback = q('[data-vat-feedback]');

  const chk = (name: string) => q<HTMLInputElement>(`input[name="${name}"]`);
  const chkAgb = chk('agb');
  const chkPrivacy = chk('privacy');
  const chkB2b = chk('b2bConfirmation');
  const chkWaiver = chk('withdrawalWaiver');
  const chkNewsletter = chk('newsletter');

  const discountField = q('[data-discount-field]');
  const discountInput = q<HTMLInputElement>('[data-discount-input]');
  const discountBtn = q<HTMLButtonElement>('[data-discount-apply]');
  const discountFeedback = q('[data-discount-feedback]');

  const heroAmount = q('[data-hero-amount]');
  const heroTaxLabel = q('[data-hero-tax-label]');
  const heroRecurring = q('[data-hero-recurring]');
  const heroHint = q('[data-hero-hint]');
  const lineNet = q('[data-line-net]');
  const lineDiscount = q('[data-line-discount]');
  const lineDiscountLabel = q('[data-line-discount-label]');
  const lineDiscountValue = q('[data-line-discount-value]');
  const lineTaxLabel = q('[data-line-tax-label]');
  const lineTax = q('[data-line-tax]');
  const totalToday = q('[data-total-today]');
  const totalFuture = q('[data-total-future]');
  const renewal = q('[data-renewal]');
  const previewHint = q('[data-preview-hint]');

  if (
    !form || !submit || !emailInput || !nameInput || !streetInput || !zipInput || !cityInput ||
    !countrySelect || !vatInput || !chkAgb || !chkPrivacy || !chkB2b || !chkWaiver || !chkNewsletter ||
    !discountField || !discountInput || !discountBtn || !discountFeedback || !paddleWrap || !backBtn
  ) {
    console.warn('[checkout] missing DOM nodes - abort');
    return;
  }

  const labelTemplate = submit.dataset.labelTemplate ?? '';
  const planName = submit.dataset.planName ?? '';

  // ── State ────────────────────────────────────────────────────
  let buyerType: BuyerType = 'consumer';
  let pendingDiscount: string | null = null;
  let latestTotals: PaddleTotals | null = null;
  let paddleInitialized = false;
  let mounted = false;
  let completedHandled = false;
  let sessionEmail = '';
  let active = { intentId: '', transactionId: '', email: '' };

  // ── Helfer ───────────────────────────────────────────────────
  const apiUrl = (path: string): string => (apiBase ? apiBase + path : path);
  const currentEmail = (): string => emailInput.value.trim().toLowerCase();
  const currentCountry = (): string => (countrySelect.value || 'DE').toUpperCase();
  const currentVat = (): string | null => {
    if (buyerType !== 'business') return null;
    const cleaned = normalizeVatId(vatInput.value);
    return cleaned && VAT_ID_RX.test(cleaned) ? cleaned : null;
  };
  const countryLabel = (): string => countrySelect.options[countrySelect.selectedIndex]?.text ?? countrySelect.value;

  function showBanner(text: string, kind: BannerKind = 'warn'): void {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `ck-banner ck-banner--${kind}`;
    banner.hidden = false;
  }
  function hideBanner(): void {
    if (banner) banner.hidden = true;
  }
  function paddlePlaceholder(msg: string, error = false): void {
    paddleWrap!.innerHTML =
      `<div class="ck-paddle-placeholder${error ? ' ck-paddle-placeholder--error' : ''}">${escapeHtml(msg)}</div>`;
  }

  // ── Kaeufertyp ───────────────────────────────────────────────
  function applyBuyerType(next: BuyerType): void {
    buyerType = next;
    root!.querySelectorAll<HTMLElement>('[data-buyer-only]').forEach((el) => {
      el.hidden = el.dataset.buyerOnly !== next;
    });
    const business = next === 'business';
    if (nameLabel) nameLabel.textContent = (business ? d.businessNameLabel : d.consumerNameLabel) ?? '';
    if (nameHint) nameHint.textContent = (business ? d.businessNameHint : d.consumerNameHint) ?? '';
    nameInput!.placeholder = business ? 'Muster GmbH' : 'Erika Mustermann';
    if (!business) {
      vatInput!.value = '';
      chkB2b!.checked = false;
      setVatFeedback('hide');
    } else {
      chkWaiver!.checked = false;
    }
    syncGating();
    renderTotals();
  }

  // ── Anzeige der Summen ───────────────────────────────────────
  function renderTotals(): void {
    const reverse = isReverseChargePreview(currentCountry(), currentVat());
    const t = displayTotals(catalog, latestTotals, reverse);
    const serverBacked = latestTotals !== null;

    if (lineNet) lineNet.textContent = formatEur(t.netCents + t.discountCents);
    if (lineDiscount && lineDiscountValue) {
      lineDiscount.hidden = t.discountCents <= 0;
      lineDiscountValue.textContent = '-' + formatEur(t.discountCents);
      if (lineDiscountLabel) lineDiscountLabel.textContent = pendingDiscount ? `(${pendingDiscount})` : '';
    }
    if (lineTax) lineTax.textContent = formatEur(t.taxCents);
    if (lineTaxLabel) {
      lineTaxLabel.textContent = reverse ? '(Reverse-Charge, 0 %)' : serverBacked ? '(laut Paddle)' : '(19 %)';
    }
    if (totalToday) totalToday.textContent = formatEur(t.grossCents);
    if (totalFuture) totalFuture.textContent = formatEur(t.grossCents);
    if (renewal) renewal.textContent = `(${renewalLabelFromSource(latestTotals, periodMonths)})`;

    if (heroAmount) heroAmount.textContent = formatEur(t.grossCents);
    if (heroRecurring) heroRecurring.textContent = formatEur(t.grossCents);
    if (heroTaxLabel) heroTaxLabel.textContent = reverse ? 'netto · Reverse-Charge' : 'inkl. USt.';
    if (heroHint) {
      heroHint.textContent = reverse
        ? 'Vorschau mit Reverse-Charge, die Prüfung (VIES) erfolgt im Zahlungsfeld.'
        : `${formatEur(t.netCents)} netto + ${formatEur(t.taxCents)} USt.`;
    }
    if (previewHint) {
      previewHint.textContent = serverBacked
        ? 'Berechnung aus der Paddle-Preisvorschau. Zahlung und Rechnung laufen über Paddle.'
        : 'Vorläufige Berechnung für Deutschland. Die endgültige Steuer richtet sich nach Land und USt-IdNr. und wird von Paddle berechnet.';
    }
    updateSubmitLabel(t.grossCents);
  }

  function updateSubmitLabel(grossCents: number): void {
    if (!labelTemplate || submit!.classList.contains('is-busy')) return;
    submit!.textContent = labelTemplate.replace('{amount}', formatEur(grossCents));
  }

  // ── Preisvorschau (Paddle) ───────────────────────────────────
  async function fetchPreview(): Promise<PreviewResult> {
    try {
      const res = await fetch(apiUrl('/api/billing/preview-pricing'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan, countryCode: currentCountry(), discountCode: pendingDiscount }),
      });
      if (!res.ok) {
        return { totals: null, discountApplied: false, discountError: null, requestError: 'Die Paddle-Preisvorschau ist gerade nicht erreichbar.' };
      }
      const data = (await res.json()) as { totals?: PaddleTotals; discountApplied?: boolean; discountError?: string | null };
      return {
        totals: data.totals ?? null,
        discountApplied: data.discountApplied === true,
        discountError: data.discountError ?? null,
        requestError: null,
      };
    } catch (err) {
      console.warn('[checkout] preview-pricing unreachable:', err);
      return { totals: null, discountApplied: false, discountError: null, requestError: 'Die Paddle-Preisvorschau ist gerade nicht erreichbar.' };
    }
  }

  async function refreshPreview(): Promise<boolean> {
    const result = await fetchPreview();
    if (result.requestError) return false;
    if (pendingDiscount && result.discountError && !result.discountApplied) {
      resetDiscountUi();
      discountField!.classList.add('invalid');
      setDiscountFeedback('error', result.discountError);
      pendingDiscount = null;
    }
    if (result.totals) latestTotals = result.totals;
    renderTotals();
    return true;
  }

  // ── Rabattcode ───────────────────────────────────────────────
  function setDiscountFeedback(kind: 'ok' | 'error' | 'none', text = ''): void {
    discountFeedback!.className = 'ck-inline-feedback' + (kind === 'none' ? '' : ` ${kind}`);
    discountFeedback!.textContent = text;
  }
  function resetDiscountUi(): void {
    discountField!.classList.remove('applied', 'invalid');
    discountInput!.disabled = false;
    discountBtn!.disabled = false;
    discountBtn!.textContent = 'Anwenden';
  }

  async function toggleDiscount(): Promise<void> {
    if (pendingDiscount) {
      pendingDiscount = null;
      resetDiscountUi();
      discountInput!.value = '';
      setDiscountFeedback('none');
      await refreshPreview();
      return;
    }
    const code = discountInput!.value.trim().toUpperCase();
    if (!code) {
      discountField!.classList.add('invalid');
      setDiscountFeedback('error', 'Bitte einen Rabattcode eingeben.');
      return;
    }
    // Optimistisch setzen, serverseitig bestaetigen lassen; bei Ablehnung
    // setzt refreshPreview den Zustand zurueck und zeigt den Paddle-Fehler.
    pendingDiscount = code;
    discountInput!.value = code;
    discountInput!.disabled = true;
    discountBtn!.disabled = true;
    discountBtn!.textContent = 'prüfe …';
    discountField!.classList.remove('invalid');
    discountField!.classList.add('applied');
    setDiscountFeedback('none');
    const ok = await refreshPreview();
    if (!ok && pendingDiscount === code) {
      pendingDiscount = null;
      resetDiscountUi();
      discountField!.classList.add('invalid');
      setDiscountFeedback('error', 'Der Rabattcode konnte gerade nicht bei Paddle geprüft werden. Bitte erneut versuchen.');
      return;
    }
    discountBtn!.disabled = false;
    if (pendingDiscount) {
      discountBtn!.textContent = 'Entfernen';
      setDiscountFeedback('ok', 'Code angewendet. Die finale Prüfung erfolgt bei Paddle.');
    }
  }

  // ── USt-IdNr. ────────────────────────────────────────────────
  function setVatFeedback(kind: 'ok' | 'warn' | 'error' | 'hide', text = ''): void {
    if (!vatFeedback) return;
    vatFeedback.className = 'ck-feedback';
    if (kind === 'hide') {
      vatFeedback.hidden = true;
      vatFeedback.textContent = '';
      return;
    }
    vatFeedback.classList.add(kind);
    vatFeedback.hidden = false;
    vatFeedback.textContent = text;
  }

  function onVatInput(): void {
    const cleaned = normalizeVatId(vatInput!.value);
    if (!cleaned) {
      setVatFeedback('hide');
    } else if (!VAT_ID_RX.test(cleaned)) {
      setVatFeedback('error', 'Format ungültig. Beispiel: AT123456789');
    } else {
      const vatCountry = cleaned.slice(0, 2);
      const country = currentCountry();
      if (vatCountry === country) {
        setVatFeedback('ok', vatCountry === 'DE'
          ? 'Format OK. Im Inland wird die USt. regulär berechnet.'
          : 'Format OK. Die Vorschau zeigt Reverse-Charge; Paddle prüft die ID endgültig (VIES).');
      } else {
        setVatFeedback('warn', `Format OK. Hinweis: USt-IdNr-Land (${vatCountry}) und Rechnungsland (${country}) stimmen nicht überein – Paddle kann die ID dann ablehnen.`);
      }
    }
    syncGating();
    renderTotals();
  }

  // ── Gating ───────────────────────────────────────────────────
  function isFormReady(): boolean {
    const vatRaw = normalizeVatId(vatInput!.value);
    if (buyerType === 'business' && vatRaw && !VAT_ID_RX.test(vatRaw)) return false;
    return (
      EMAIL_RX.test(currentEmail()) &&
      nameInput!.value.trim().length >= NAME_MIN &&
      streetInput!.value.trim().length >= 3 &&
      zipInput!.value.trim().length >= 3 &&
      cityInput!.value.trim().length >= 2 &&
      Boolean(countrySelect!.value) &&
      chkAgb!.checked &&
      chkPrivacy!.checked &&
      (buyerType === 'consumer' || chkB2b!.checked)
    );
  }
  function syncGating(): void {
    const ready = isFormReady();
    if (!submit!.classList.contains('is-busy')) submit!.disabled = !ready;
    if (submitHint) submitHint.hidden = ready;
  }
  function refreshEmailHint(): void {
    if (!emailHint) return;
    const mismatch = sessionEmail && currentEmail() && currentEmail() !== sessionEmail;
    emailHint.textContent = mismatch
      ? 'Diese E-Mail gehört nicht zu deiner aktuellen Sitzung. Bitte verwende deine Konto-E-Mail.'
      : (d.emailHint ?? '');
    emailHint.classList.toggle('error', Boolean(mismatch));
  }

  // ── Schritte ─────────────────────────────────────────────────
  function goToStep(step: 1 | 2): void {
    if (steps) steps.dataset.currentStep = String(step);
    if (pane1) pane1.hidden = step !== 1;
    if (pane2) pane2.hidden = step !== 2;
    if (locked) locked.hidden = step !== 2;
    discountField!.classList.toggle('locked', step === 2);
    discountInput!.readOnly = step === 2;
    discountBtn!.hidden = step === 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function populateReadonly(): void {
    const set = (key: string, value: string): void => {
      const el = root!.querySelector<HTMLElement>(`[data-ro="${key}"]`);
      if (el) el.textContent = value;
    };
    set('email', active.email);
    set('name', nameInput!.value.trim());
    set('address', `${streetInput!.value.trim()}, ${zipInput!.value.trim()} ${cityInput!.value.trim()}, ${countryLabel()}`);
    const vat = currentVat() ?? '';
    const row = root!.querySelector<HTMLElement>('[data-ro-vat-row]');
    if (row) row.hidden = vat === '';
    set('vatId', vat);
    const nameDt = root!.querySelector<HTMLElement>('[data-ro-name-label]');
    if (nameDt) nameDt.textContent = buyerType === 'business' ? 'Firma' : 'Name';
  }

  function backToStep1(): void {
    const intentId = active.intentId;
    const transactionId = active.transactionId;
    if (mounted && typeof Paddle?.Checkout?.close === 'function') {
      try { Paddle.Checkout.close(); } catch { /* ignorieren */ }
    }
    mounted = false;
    active = { intentId: '', transactionId: '', email: '' };
    paddlePlaceholder('Paddle-Zahlungsfeld wird geladen …');
    hideBanner();
    goToStep(1);
    syncGating();
    if (intentId && transactionId) void cancelIntent(intentId, transactionId);
  }

  async function cancelIntent(intentId: string, transactionId: string): Promise<void> {
    try {
      await fetch(apiUrl('/api/billing/cancel-checkout-intent'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intentId, transactionId }),
      });
    } catch (err) {
      console.warn('[checkout] cancel checkout intent failed:', err);
    }
  }

  // ── Paddle ───────────────────────────────────────────────────
  function ensurePaddle(): boolean {
    if (paddleInitialized) return true;
    if (typeof Paddle === 'undefined') {
      paddlePlaceholder('Das Zahlungssystem konnte nicht geladen werden. Bitte Seite neu laden.', true);
      return false;
    }
    if (!paddleToken || paddleToken.startsWith('REPLACE_')) {
      paddlePlaceholder('Die Zahlung ist für diese Marke noch nicht konfiguriert.', true);
      return false;
    }
    if (paddleEnv === 'sandbox') Paddle.Environment.set('sandbox');
    Paddle.Initialize({
      token: paddleToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventCallback: (event: any) => {
        if (event?.name === 'checkout.completed') onCheckoutCompleted();
        if (event?.name === 'checkout.error') console.error('[checkout] Paddle error', event.data);
      },
    });
    paddleInitialized = true;
    return true;
  }

  function mountPaddle(): void {
    if (!ensurePaddle()) return;
    if (!active.transactionId) {
      paddlePlaceholder('Keine Paddle-Transaktion zum Anzeigen.');
      return;
    }
    paddleWrap!.innerHTML = '';
    Paddle.Checkout.open({
      transactionId: active.transactionId,
      settings: {
        displayMode: 'inline',
        frameTarget: 'paddle-wrap',
        frameStyle: 'width:100%; min-height:420px; border:none; background:transparent;',
        theme: 'light',
        locale: 'de',
        allowLogout: false,
      },
    });
    mounted = true;
  }

  function onCheckoutCompleted(): void {
    if (completedHandled) return;
    completedHandled = true;
    storeCheckoutReference({
      intentId: active.intentId,
      transactionId: active.transactionId,
      email: active.email || currentEmail(),
    });
    window.location.href = successUrl;
  }

  // ── Intent ───────────────────────────────────────────────────
  async function requestIntent(): Promise<CheckoutIntentResponse | null> {
    const business = buyerType === 'business';
    const name = nameInput!.value.trim();
    try {
      const res = await fetch(apiUrl('/api/billing/checkout-intent'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan,
          buyerType,
          checkoutEmail: currentEmail(),
          billingName: business ? undefined : name,
          companyName: business ? name : undefined,
          street: streetInput!.value.trim(),
          postalCode: zipInput!.value.trim(),
          city: cityInput!.value.trim(),
          countryCode: currentCountry(),
          discountCode: pendingDiscount,
          vatId: currentVat(),
          b2bConfirmation: business
            ? { checked: chkB2b!.checked, version: b2bVersion, displayedHintsHash: hintsHash }
            : undefined,
          consent: {
            agb: chkAgb!.checked,
            privacy: chkPrivacy!.checked,
            newsletter: chkNewsletter!.checked,
            withdrawal_waiver: business ? false : chkWaiver!.checked,
            version: consentVersion,
            timestamp: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
        return { action: 'paddle_error', errorDetail: requestErrorCopy(res.status, data?.error?.code) };
      }
      return (await res.json()) as CheckoutIntentResponse;
    } catch (err) {
      console.warn('[checkout] checkout-intent unreachable:', err);
      return null;
    }
  }

  function requestErrorCopy(status: number, code?: string): string {
    if (status === 429 || code === 'rate_limited') return 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.';
    if (code === 'invalid_email') return 'Die E-Mail-Adresse ist ungültig.';
    if (code === 'invalid_vat_id') return 'Die USt-IdNr. hat ein ungültiges Format.';
    if (code === 'missing_b2b_confirmation') return 'Bitte bestätige die Unternehmer-Erklärung.';
    if (code === 'missing_required_consent') return 'Bitte akzeptiere AGB und Datenschutzerklärung.';
    return 'Der Checkout konnte nicht gestartet werden. Bitte prüfe deine Eingaben und versuche es erneut.';
  }

  function focusField(name: string | null | undefined): void {
    const id = name ? FIELD_TO_INPUT_ID[name] : undefined;
    const el = id ? document.getElementById(id) : null;
    if (el) {
      el.focus();
      el.classList.add('invalid');
    }
  }

  function setBusy(busy: boolean): void {
    submit!.classList.toggle('is-busy', busy);
    if (busy) {
      submit!.disabled = true;
      submit!.textContent = 'Paddle wird vorbereitet …';
    } else {
      renderTotals();
      syncGating();
    }
  }

  async function onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    syncGating();
    if (!isFormReady()) {
      form!.reportValidity?.();
      return;
    }
    hideBanner();
    setBusy(true);
    const intent = await requestIntent();
    setBusy(false);

    if (!intent) {
      showBanner('Verbindung zur Checkout-API fehlgeschlagen. Bitte später erneut versuchen.', 'error');
      return;
    }

    switch (intent.action) {
      case 'start_checkout': {
        if (!intent.transactionId || !intent.intentId || !intent.checkoutEmail) {
          showBanner('Die Server-Antwort ist unvollständig. Bitte Seite neu laden.', 'error');
          return;
        }
        active = { intentId: intent.intentId, transactionId: intent.transactionId, email: intent.checkoutEmail };
        completedHandled = false;
        if (intent.totals) latestTotals = intent.totals;
        if (intent.discountCode) pendingDiscount = intent.discountCode;
        renderTotals();
        populateReadonly();
        goToStep(2);
        mountPaddle();
        return;
      }
      case 'paddle_error': {
        const text = intent.errorDetail ?? 'Paddle hat den Vorgang abgelehnt.';
        showBanner(text, 'error');
        if (intent.errorField === 'discount') {
          pendingDiscount = null;
          resetDiscountUi();
          discountField!.classList.add('invalid');
          setDiscountFeedback('error', text);
          void refreshPreview();
        }
        focusField(intent.errorField);
        return;
      }
      case 'email_mismatch':
        showBanner('Diese E-Mail gehört nicht zu deiner aktuellen Sitzung. Bitte verwende deine Konto-E-Mail.', 'warn');
        return;
      case 'invalid_plan':
        showBanner('Dieser Plan ist nicht verfügbar. Bitte zurück zur Preisübersicht.', 'error');
        return;
      case 'manage_subscription':
        window.location.href = appUrl + '?manage=1';
        return;
      case 'already_paid':
        window.location.href = appUrl + '?already=1';
        return;
      default:
        showBanner('Unbekannte Server-Antwort. Bitte Seite neu laden.', 'error');
    }
  }

  // ── Events ───────────────────────────────────────────────────
  root.querySelectorAll<HTMLInputElement>('input[name="buyerType"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) applyBuyerType(radio.value === 'business' ? 'business' : 'consumer');
    });
  });
  emailInput.addEventListener('input', () => { refreshEmailHint(); syncGating(); });
  [nameInput, streetInput, zipInput, cityInput].forEach((el) => el.addEventListener('input', syncGating));
  [chkAgb, chkPrivacy, chkB2b, chkWaiver, chkNewsletter].forEach((el) => el.addEventListener('change', syncGating));
  vatInput.addEventListener('input', onVatInput);
  countrySelect.addEventListener('change', () => {
    onVatInput();
    syncGating();
    void refreshPreview();
  });
  discountBtn.addEventListener('click', () => void toggleDiscount());
  discountInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void toggleDiscount();
    }
  });
  discountInput.addEventListener('input', () => {
    if (discountField.classList.contains('invalid')) {
      discountField.classList.remove('invalid');
      setDiscountFeedback('none');
    }
  });
  backBtn.addEventListener('click', backToStep1);
  form.addEventListener('submit', (event) => void onSubmit(event));

  // ── Init ─────────────────────────────────────────────────────
  async function loadSessionEmail(): Promise<string | null> {
    try {
      const res = await fetch(apiUrl('/api/me'), { credentials: 'include' });
      if (!res.ok) return null;
      const data = (await res.json()) as { authenticated?: boolean; email?: string };
      return data.authenticated && data.email ? data.email.toLowerCase() : null;
    } catch (err) {
      console.warn('[checkout] /api/me unreachable:', err);
      return null;
    }
  }

  applyBuyerType('consumer');
  renderTotals();
  void (async () => {
    const urlEmail = new URL(window.location.href).searchParams.get('email')?.trim().toLowerCase() ?? '';
    let initial = EMAIL_RX.test(urlEmail) ? urlEmail : '';
    const session = await loadSessionEmail();
    if (session) sessionEmail = session;
    if (!initial && session) initial = session;
    if (initial) emailInput.value = initial;
    refreshEmailHint();
    syncGating();
    void refreshPreview();
  })();
}
