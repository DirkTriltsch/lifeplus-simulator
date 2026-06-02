// Pro-Plan-Inline-Checkout client script — B2B-only Wizard, v6.
//
// Architektur siehe _doc/paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md.
//
// Step 1 (Rechnungsdaten):
//   E-Mail, Firma, Strasse, PLZ, Ort, Land sind Pflicht. AGB+DSE+B2B-
//   Bestaetigung sind Pflicht-Consents. USt-IdNr + Rabattcode + Newsletter
//   optional. Validierung erfolgt clientseitig nur fuer Format (Email, VAT).
//   Die echte Validierung (Discount existiert? VAT in VIES?) macht der
//   Server beim Erstellen der Paddle-Transaktion.
//
// Step 2 (Zahlung):
//   Konto-readonly mit Email + Firma + Anschrift. Linke Eingaben (Rabattcode)
//   sind gelockt. Paddle-Iframe oeffnet mit transactionId, die der Server
//   beim Erstellen der Transaktion zurueckgegeben hat.
//
// "Daten aendern" geht zurueck zu Step 1, Iframe wird unmounted. Beim
// naechsten "Weiter zur Zahlung" wird ein neuer Intent + neue Paddle-
// Transaktion erstellt.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Paddle: any;
}

interface MeResponse {
  authenticated: boolean;
  email?: string;
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
  // start_checkout payload
  transactionId?: string;
  intentId?: string;
  priceId?: string;
  checkoutEmail?: string;
  sessionUserId?: string;
  brandId?: string;
  discountCode?: string | null;
  totals?: PaddleTotals | null;
  // paddle_error payload
  errorCode?: string;
  errorDetail?: string;
  errorField?: string | null;
}

interface PaddleTotals {
  subtotal?: string;
  discount?: string;
  tax?: string;
  total?: string;
  currency_code?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const VAT_RX = /^[A-Z]{2}[A-Z0-9]{8,12}$/;
const COMPANY_MIN = 2;

// Field-IDs, die der Backend-Mapper kennt — wir hovern an die echten DOM-IDs.
const FIELD_TO_INPUT_ID: Record<string, string> = {
  email:      'checkoutEmail',
  street:     'checkoutStreet',
  postalCode: 'checkoutZip',
  city:       'checkoutCity',
  country:    'checkoutCountry',
  vat:        'checkoutVat',
  discount:   'discountInput',
};

export function setupCheckoutInline(): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector<HTMLElement>('.checkout');
  if (!root) return;

  // ── Config aus data-attrs ────────────────────────────────────
  const apiBase                  = (root.dataset.apiBase ?? '').replace(/\/$/, '');
  const brandId                  = root.dataset.brandId ?? '';
  const appUrl                   = root.dataset.appUrl ?? '/app/';
  const paddleToken              = root.dataset.paddleToken ?? '';
  const paddleEnv                = (root.dataset.paddleEnv ?? 'sandbox') as 'sandbox' | 'live';
  const plan                     = root.dataset.plan ?? '';
  const consentVersion           = root.dataset.consentVersion ?? '';
  const b2bConfirmationVersion   = root.dataset.b2bConfirmationVersion ?? '';
  const displayedHintsHash       = root.dataset.displayedHintsHash ?? '';
  void brandId; // wird in customData implizit gesetzt (server-side)

  // ── DOM ──────────────────────────────────────────────────────
  const step1         = document.getElementById('step1');
  const step2         = document.getElementById('step2');
  const summary       = document.getElementById('summary');
  const stepLine      = document.getElementById('stepLine');
  const dot1          = document.getElementById('dot1');
  const dot2          = document.getElementById('dot2');
  const label1        = document.getElementById('label1');
  const label2        = document.getElementById('label2');

  const emailInput    = document.getElementById('checkoutEmail')   as HTMLInputElement | null;
  const emailHint     = document.getElementById('emailHint');
  const companyInput  = document.getElementById('checkoutCompany') as HTMLInputElement | null;
  const streetInput   = document.getElementById('checkoutStreet')  as HTMLInputElement | null;
  const zipInput      = document.getElementById('checkoutZip')     as HTMLInputElement | null;
  const cityInput     = document.getElementById('checkoutCity')    as HTMLInputElement | null;
  const countrySelect = document.getElementById('checkoutCountry') as HTMLSelectElement | null;
  const vatInput      = document.getElementById('checkoutVat')     as HTMLInputElement | null;
  const vatFeedback   = document.getElementById('vatFeedback');

  const nextBtn       = document.getElementById('nextBtn') as HTMLButtonElement | null;
  const backBtn       = document.getElementById('backBtn') as HTMLButtonElement | null;
  const missingHint   = document.getElementById('missingHint');
  const errMsg        = document.getElementById('errMsg');
  const intentBanner  = document.getElementById('intentBanner');
  const intentBannerText = document.getElementById('intentBannerText');

  const paddleWrap    = document.getElementById('paddleWrap');
  const kontoEmail    = document.getElementById('kontoEmail');
  const kontoCompany  = document.getElementById('kontoCompany');
  const kontoAddress  = document.getElementById('kontoAddress');
  const kontoVatRow   = document.getElementById('kontoVatRow');
  const kontoVat      = document.getElementById('kontoVat');
  const syncBanner    = document.getElementById('syncBanner');

  const successView   = document.getElementById('successView');
  const successEmail  = document.getElementById('successEmail');
  const successMail   = document.getElementById('successMail');

  const chkAgb = document.getElementById('chk-agb') as HTMLInputElement | null;
  const chkDse = document.getElementById('chk-dse') as HTMLInputElement | null;
  const chkB2B = document.getElementById('chk-b2b') as HTMLInputElement | null;
  const chkNl  = document.getElementById('chk-newsletter') as HTMLInputElement | null;

  // Rabattcode-DOM
  const discountField    = document.getElementById('discountField');
  const discountInput    = document.getElementById('discountInput') as HTMLInputElement | null;
  const discountBtn      = document.getElementById('discountApplyBtn') as HTMLButtonElement | null;
  const discountFeedback = document.getElementById('discountFeedback');
  const heroAmount       = document.getElementById('heroAmount');
  const heroTaxLabel     = document.getElementById('heroTaxLabel');
  const periodRecurring  = document.getElementById('periodRecurring');
  const grossHint        = document.getElementById('grossHint');
  const lineNet          = document.getElementById('lineNet');
  const lineDiscount     = document.getElementById('lineDiscount');
  const lineDiscountLabel = document.getElementById('lineDiscountLabel');
  const lineDiscountValue = document.getElementById('lineDiscountValue');
  const lineTaxRate      = document.getElementById('lineTaxRate');
  const lineTaxValue     = document.getElementById('lineTaxValue');
  const totalToday       = document.getElementById('totalToday');
  const totalFuture      = document.getElementById('totalFuture');
  const previewHint      = document.getElementById('previewHint');

  if (
    !step1 || !step2 || !summary ||
    !emailInput || !companyInput || !streetInput || !zipInput || !cityInput || !countrySelect ||
    !vatInput || !vatFeedback ||
    !nextBtn || !backBtn || !paddleWrap ||
    !chkAgb || !chkDse || !chkB2B || !chkNl ||
    !discountField || !discountInput || !discountBtn || !discountFeedback ||
    !errMsg || !missingHint
  ) {
    console.warn('[checkout] missing DOM nodes — abort');
    return;
  }

  // ── State ────────────────────────────────────────────────────
  let paddleInitialized = false;
  let mounted           = false;
  let sessionEmail      = '';

  // Im Frontend halten wir Discount und VAT nur als "wurde gespeichert"-Flag.
  // Server validiert beim Erstellen der Paddle-Transaktion.
  let pendingDiscountCode: string | null = null;
  let pendingVatId: string | null = null;

  // Snapshot der Rechnungsdaten zum Zeitpunkt von "Weiter zur Zahlung",
  // damit Step 2 read-only die richtigen Werte zeigt.
  let activeIntentId    = '';
  let activeTransactionId = '';
  let activeIntentEmail = '';
  let activeCompany     = '';
  let activeAddressHtml = '';
  let activeVatDisplay  = '';

  // ── Helpers ──────────────────────────────────────────────────
  function currentEmail(): string {
    return emailInput!.value.trim().toLowerCase();
  }
  function isEmailValid(v: string): boolean {
    return EMAIL_RX.test(v) && v.length <= 254;
  }
  function escapeHtml(v: string): string {
    return v.replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function apiUrl(path: string): string {
    return apiBase ? apiBase + path : path;
  }
  function showBanner(text: string, kind: 'info' | 'warn' | 'error' = 'info'): void {
    if (!intentBanner || !intentBannerText) return;
    intentBannerText.textContent = text;
    intentBanner.className = 'intent-banner intent-banner--' + kind + ' show';
  }
  function hideBanner(): void {
    if (intentBanner) intentBanner.className = 'intent-banner';
  }
  function placeholderInPaddleWrap(msg: string, kind: 'info' | 'warn' | 'error' = 'info'): void {
    paddleWrap!.innerHTML =
      '<div class="paddle-placeholder paddle-placeholder--' + kind + '">' +
      escapeHtml(msg) + '</div>';
  }
  function isLocalDevHost(): boolean {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }
  function selectedCountryLabel(): string {
    const opt = countrySelect!.options[countrySelect!.selectedIndex];
    return opt ? opt.text : countrySelect!.value;
  }
  function minorToNumber(value: string | undefined): number | null {
    if (typeof value !== 'string' || !/^-?\d+$/.test(value)) return null;
    return Number(value) / 100;
  }
  function eur(value: number): string {
    return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }).replace('€', 'EUR');
  }
  function renderPaddleTotals(totals: PaddleTotals | null | undefined, code: string | null | undefined): void {
    if (!totals) return;
    const subtotal = minorToNumber(totals.subtotal);
    const discount = minorToNumber(totals.discount) ?? 0;
    const tax      = minorToNumber(totals.tax);
    const total    = minorToNumber(totals.total);
    const netAfterDiscount = subtotal !== null ? Math.max(0, subtotal - discount) : null;

    if (lineNet && subtotal !== null) lineNet.textContent = eur(subtotal);
    if (lineDiscount && lineDiscountValue) {
      const showDiscount = discount > 0;
      (lineDiscount as HTMLElement).style.display = showDiscount ? 'flex' : 'none';
      lineDiscountValue.textContent = '-' + eur(discount);
      if (lineDiscountLabel) lineDiscountLabel.textContent = code ? '(' + code + ')' : '';
    }
    if (lineTaxValue && tax !== null) lineTaxValue.textContent = eur(tax);
    if (lineTaxRate) lineTaxRate.textContent = tax === 0 ? '(Paddle: 0%)' : '(Paddle)';
    if (totalToday && total !== null) totalToday.textContent = eur(total);
    if (totalFuture && total !== null) totalFuture.textContent = eur(total);
    if (heroAmount && netAfterDiscount !== null) heroAmount.textContent = eur(netAfterDiscount);
    if (periodRecurring && netAfterDiscount !== null) periodRecurring.textContent = eur(netAfterDiscount);
    if (heroTaxLabel) heroTaxLabel.textContent = tax === 0 ? 'netto' : 'zzgl. USt.';
    if (grossHint) grossHint.textContent = total !== null
      ? 'Finaler Paddle-Betrag: ' + eur(total)
      : 'Finale Berechnung von Paddle synchronisiert.';
    if (previewHint) {
      previewHint.textContent = 'Finale Berechnung aus der Paddle-Transaktion. Zahlung und Rechnung laufen ueber Paddle.';
    }
  }

  // ── Step-Switching ──────────────────────────────────────────
  function goToStep1(): void {
    const intentIdToCancel = activeIntentId;
    const transactionIdToCancel = activeTransactionId;
    step2!.hidden = true;
    step1!.hidden = false;
    summary!.classList.remove('locked');
    if (dot1) dot1.className = 'step-dot active';
    if (dot2) dot2.className = 'step-dot';
    if (label1) label1.className = 'step-label active';
    if (label2) label2.className = 'step-label';
    if (stepLine) stepLine.className = 'step-line';
    if (mounted) unmountPaddle();
    activeIntentId = '';
    activeTransactionId = '';
    if (intentIdToCancel && transactionIdToCancel) {
      void cancelActiveCheckoutIntent(intentIdToCancel, transactionIdToCancel);
    }
    refreshGating();
  }
  function goToStep2(): void {
    step1!.hidden = true;
    step2!.hidden = false;
    summary!.classList.add('locked');
    if (dot1) dot1.className = 'step-dot done';
    if (dot2) dot2.className = 'step-dot active';
    if (label1) label1.className = 'step-label';
    if (label2) label2.className = 'step-label active';
    if (stepLine) stepLine.className = 'step-line done';
    if (kontoEmail) kontoEmail.textContent = activeIntentEmail;
    if (kontoCompany) kontoCompany.textContent = activeCompany;
    if (kontoAddress) kontoAddress.innerHTML = activeAddressHtml;
    if (kontoVatRow) (kontoVatRow as HTMLElement).style.display = activeVatDisplay ? 'flex' : 'none';
    if (kontoVat) kontoVat.textContent = activeVatDisplay;
    if (syncBanner) syncBanner.classList.add('show');
    mountPaddle();
  }

  // ── Paddle initialisieren ───────────────────────────────────
  function ensurePaddleInitialized(): boolean {
    if (paddleInitialized) return true;
    if (typeof Paddle === 'undefined') {
      placeholderInPaddleWrap('Zahlungssystem konnte nicht geladen werden. Bitte Seite neu laden.', 'error');
      return false;
    }
    if (!paddleToken || paddleToken.startsWith('REPLACE_')) {
      placeholderInPaddleWrap('Paddle ist noch nicht konfiguriert.', 'error');
      return false;
    }
    if (paddleEnv === 'sandbox') Paddle.Environment.set('sandbox');
    Paddle.Initialize({
      token: paddleToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventCallback: (event: any) => {
        if (event?.name === 'checkout.completed') void handleCheckoutCompleted();
        if (event?.name === 'checkout.error')     console.error('[checkout] Paddle error', event.data);
      },
    });
    paddleInitialized = true;
    return true;
  }

  function mountPaddle(): void {
    if (!ensurePaddleInitialized()) return;
    if (!activeTransactionId) {
      placeholderInPaddleWrap('Keine Paddle-Transaktion zum Anzeigen.', 'warn');
      return;
    }
    paddleWrap!.innerHTML = '';
    Paddle.Checkout.open({
      settings: {
        displayMode:  'inline',
        frameTarget:  'paddle-wrap',
        frameStyle:   'width:100%; min-height:420px; border:none;',
        theme:        'light',
        locale:       'de',
        allowLogout:  false,
      },
      transactionId: activeTransactionId,
    });
    mounted = true;
  }

  function unmountPaddle(): void {
    if (mounted && typeof Paddle?.Checkout?.close === 'function') {
      try { Paddle.Checkout.close(); } catch { /* ignore */ }
    }
    mounted = false;
    placeholderInPaddleWrap('Paddle-Zahlungsfeld wird geladen ...');
  }

  // ── checkout.completed → post-checkout ───────────────────────
  async function handleCheckoutCompleted(): Promise<void> {
    const email = activeIntentEmail || currentEmail();
    let mailMessage = '';
    try {
      const res = await fetch(apiUrl('/api/billing/post-checkout'), {
        method:      'POST',
        credentials: 'include',
        headers:     { 'content-type': 'application/json' },
        body:        JSON.stringify({ checkoutEmail: email }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        mailMessage = data?.message ?? '';
      }
    } catch (err) {
      console.warn('[checkout] post-checkout unreachable:', err);
    }
    if (successEmail) successEmail.textContent = email;
    if (successMail) {
      successMail.textContent = 'Dein Pro-Zugang wird nach der Paddle-Bestaetigung aktiviert.';
      if (mailMessage) successMail.textContent += ' ' + mailMessage;
    }
    step1!.hidden = true;
    step2!.hidden = true;
    if (successView) successView.hidden = false;
  }

  // ── Step-1-Gating ────────────────────────────────────────────
  function refreshCheckedVisual(): void {
    [chkAgb!, chkDse!, chkB2B!, chkNl!].forEach((cb) => {
      const wrap = cb.closest('.check');
      if (!wrap) return;
      wrap.classList.toggle('checked', cb.checked);
      if (cb.checked) wrap.classList.remove('error');
    });
  }
  function refreshGating(): void {
    refreshCheckedVisual();
    const missing: string[] = [];
    if (!isEmailValid(currentEmail())) missing.push('E-Mail');
    if (companyInput!.value.trim().length < COMPANY_MIN) missing.push('Firma/Name');
    if (streetInput!.value.trim().length < 3) missing.push('Strasse');
    if (zipInput!.value.trim().length < 3) missing.push('PLZ');
    if (cityInput!.value.trim().length < 2) missing.push('Ort');
    if (!countrySelect!.value) missing.push('Land');
    if (!chkAgb!.checked) missing.push('AGB');
    if (!chkDse!.checked) missing.push('Datenschutz');
    if (!chkB2B!.checked) missing.push('Unternehmer-Bestaetigung');

    nextBtn!.disabled = missing.length > 0;
    if (!missingHint) return;
    if (missing.length === 0) {
      missingHint.textContent = '';
      missingHint.classList.remove('show');
    } else if (missing.length <= 3) {
      missingHint.textContent = 'Noch fehlt: ' + missing.join(', ');
      missingHint.classList.add('show');
    } else {
      missingHint.textContent = 'Bitte alle Pflichtfelder ausfuellen.';
      missingHint.classList.add('show');
    }
  }

  function refreshEmailHint(): void {
    const email = currentEmail();
    const valid = isEmailValid(email);
    emailInput!.classList.toggle('invalid', email.length > 0 && !valid);
    if (!emailHint) return;
    if (email.length > 0 && !valid) {
      emailHint.textContent = 'Bitte eine gueltige E-Mail-Adresse eingeben.';
      emailHint.classList.add('error');
    } else if (sessionEmail && email !== sessionEmail) {
      emailHint.textContent = 'Diese E-Mail gehoert nicht zu deiner Sitzung. Bitte verwende deine Konto-Email.';
      emailHint.classList.add('error');
    } else {
      emailHint.textContent = 'Fuer Rechnung, Zugang und Login.';
      emailHint.classList.remove('error');
    }
  }

  // ── Inline-Field-Feedback (Rabattcode) ───────────────────────
  function setDiscountErr(text: string): void {
    discountFeedback!.classList.add('show');
    discountFeedback!.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
      '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" stroke-linecap="round"/></svg>' +
      '<span>' + escapeHtml(text) + '</span>';
  }
  function clearDiscountFb(): void { discountFeedback!.classList.remove('show'); }

  function applyDiscount(): void {
    if (pendingDiscountCode) {
      pendingDiscountCode = null;
      discountField!.classList.remove('applied', 'invalid');
      discountInput!.value = ''; discountInput!.disabled = false;
      clearDiscountFb();
      discountBtn!.textContent = 'Anwenden';
      discountBtn!.classList.remove('remove');
      return;
    }
    const code = discountInput!.value.trim().toUpperCase();
    if (!code) {
      discountField!.classList.add('invalid');
      setDiscountErr('Bitte einen Code eingeben.');
      return;
    }
    pendingDiscountCode = code;
    discountField!.classList.remove('invalid');
    discountField!.classList.add('applied');
    discountInput!.value = code; discountInput!.disabled = true;
    discountBtn!.textContent = 'Entfernen';
    discountBtn!.classList.add('remove');
    clearDiscountFb();
  }

  // ── USt-IdNr (rechts) — nur Format-Check ────────────────────
  function setVatFeedback(kind: 'ok' | 'error' | 'hide', text?: string): void {
    if (!vatFeedback) return;
    vatFeedback.className = 'vat-field-feedback';
    if (kind === 'hide') return;
    vatFeedback.classList.add('show', kind);
    if (kind === 'ok') {
      vatFeedback.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span>' + escapeHtml(text ?? '') + '</span>';
    } else {
      vatFeedback.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" stroke-linecap="round"/></svg>' +
        '<span>' + escapeHtml(text ?? '') + '</span>';
    }
  }
  function updateVatFromInput(): void {
    const cleaned = (vatInput!.value || '').replace(/\s/g, '').toUpperCase();
    if (cleaned.length === 0) {
      pendingVatId = null;
      vatInput!.classList.remove('invalid');
      setVatFeedback('hide');
      return;
    }
    if (!VAT_RX.test(cleaned)) {
      pendingVatId = null;
      vatInput!.classList.add('invalid');
      setVatFeedback('error', 'Format ungueltig. Beispiel: AT123456789');
      return;
    }
    pendingVatId = cleaned;
    vatInput!.classList.remove('invalid');
    setVatFeedback('ok', 'Format OK. Paddle prueft VIES bei "Weiter zur Zahlung".');
  }

  // ── Intent erstellen ─────────────────────────────────────────
  async function requestIntent(): Promise<CheckoutIntentResponse | null> {
    try {
      const res = await fetch(apiUrl('/api/billing/checkout-intent'), {
        method:      'POST',
        credentials: 'include',
        headers:     { 'content-type': 'application/json' },
        body:        JSON.stringify({
          plan,
          checkoutEmail: currentEmail(),
          companyName:   companyInput!.value.trim(),
          street:        streetInput!.value.trim(),
          postalCode:    zipInput!.value.trim(),
          city:          cityInput!.value.trim(),
          countryCode:   (countrySelect!.value || '').toUpperCase(),
          discountCode:  pendingDiscountCode,
          vatId:         pendingVatId,
          b2bConfirmation: {
            checked:               chkB2B!.checked,
            version:               b2bConfirmationVersion,
            displayedHintsHash:    displayedHintsHash,
          },
          // bestehende Felder aus alten Versionen (consent_version etc.)
          consent: {
            agb:        chkAgb!.checked,
            privacy:    chkDse!.checked,
            newsletter: chkNl!.checked,
            version:    consentVersion,
            timestamp:  new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as CheckoutIntentResponse;
    } catch (err) {
      console.warn('[checkout] checkout-intent unreachable:', err);
      return null;
    }
  }

  async function cancelActiveCheckoutIntent(intentId: string, transactionId: string): Promise<void> {
    try {
      await fetch(apiUrl('/api/billing/cancel-checkout-intent'), {
        method:      'POST',
        credentials: 'include',
        headers:     { 'content-type': 'application/json' },
        body:        JSON.stringify({ intentId, transactionId }),
      });
    } catch (err) {
      console.warn('[checkout] cancel checkout intent failed:', err);
    }
  }

  function focusFieldByName(name: string | null | undefined): void {
    if (!name) return;
    const inputId = FIELD_TO_INPUT_ID[name];
    if (!inputId) return;
    const el = document.getElementById(inputId);
    if (el && 'focus' in el) (el as HTMLElement).focus();
    if (el) el.classList.add('invalid');
  }

  async function nextClick(): Promise<void> {
    refreshGating();
    if (nextBtn!.disabled) return;
    hideBanner();
    nextBtn!.classList.add('loading');
    nextBtn!.disabled = true;
    const intent = await requestIntent();
    nextBtn!.classList.remove('loading');

    if (!intent) {
      showBanner('Verbindung zur Checkout-API ist fehlgeschlagen. Bitte spaeter erneut versuchen.', 'error');
      nextBtn!.disabled = false;
      return;
    }

    switch (intent.action) {
      case 'start_checkout': {
        if (!intent.transactionId || !intent.intentId || !intent.checkoutEmail) {
          showBanner('Server-Antwort unvollstaendig. Bitte Seite neu laden.', 'error');
          nextBtn!.disabled = false;
          break;
        }
        activeIntentId      = intent.intentId;
        activeTransactionId = intent.transactionId;
        activeIntentEmail   = intent.checkoutEmail;
        activeCompany       = companyInput!.value.trim();
        const lines = [
          streetInput!.value.trim(),
          zipInput!.value.trim() + ' ' + cityInput!.value.trim(),
          selectedCountryLabel(),
        ];
        activeAddressHtml = lines.map(escapeHtml).join('<br>');
        activeVatDisplay  = pendingVatId ?? '';
        renderPaddleTotals(intent.totals, intent.discountCode ?? pendingDiscountCode);
        goToStep2();
        break;
      }
      case 'paddle_error': {
        const text = intent.errorDetail ?? 'Paddle hat den Vorgang abgelehnt.';
        showBanner(text, 'error');
        if (intent.errorField === 'discount') {
          pendingDiscountCode = null;
          discountField!.classList.remove('applied');
          discountField!.classList.add('invalid');
          discountInput!.disabled = false;
          discountBtn!.textContent = 'Anwenden';
          discountBtn!.classList.remove('remove');
          setDiscountErr(text);
        }
        focusFieldByName(intent.errorField ?? null);
        nextBtn!.disabled = false;
        break;
      }
      case 'login_required': {
        if (isLocalDevHost()) {
          showBanner(
            'Keine lokale Session gefunden. Fuehre in der Browser-Konsole await fetch("/api/auth/dev-login", { method:"POST", credentials:"include", headers:{ "content-type":"application/json" }, body: JSON.stringify({ email: "' + currentEmail() + '" }) }).then(r => r.json()) aus, lade die Seite neu und versuche es erneut.',
            'warn',
          );
          nextBtn!.disabled = false;
          break;
        }
        const nextPath = '/checkout/' + plan + '.html';
        window.location.href = '/signup.html?next=' + encodeURIComponent(nextPath);
        break;
      }
      case 'email_mismatch':
        showBanner('Diese E-Mail gehoert nicht zu deiner aktuellen Sitzung. Bitte verwende deine Konto-Email.', 'warn');
        nextBtn!.disabled = false;
        break;
      case 'invalid_plan':
        showBanner('Plan ist nicht verfuegbar. Bitte zur Pricing-Seite zurueckgehen.', 'error');
        nextBtn!.disabled = false;
        break;
      case 'manage_subscription':
        window.location.href = appUrl + '?manage=1';
        break;
      case 'already_paid':
        window.location.href = appUrl + '?already=1';
        break;
      default:
        showBanner('Unbekannte Server-Antwort. Bitte Seite neu laden.', 'error');
        nextBtn!.disabled = false;
    }
  }

  // ── Event-Bindings ───────────────────────────────────────────
  emailInput.addEventListener('input', () => {
    refreshEmailHint();
    refreshGating();
  });
  [companyInput, streetInput, zipInput, cityInput].forEach((el) =>
    el!.addEventListener('input', refreshGating),
  );
  countrySelect.addEventListener('change', refreshGating);
  vatInput.addEventListener('input', updateVatFromInput);
  [chkAgb, chkDse, chkB2B, chkNl].forEach((cb) =>
    cb!.addEventListener('change', refreshGating),
  );
  discountBtn.addEventListener('click', applyDiscount);
  discountInput.addEventListener('input', () => {
    if (discountField!.classList.contains('invalid')) {
      discountField!.classList.remove('invalid');
      clearDiscountFb();
    }
  });
  nextBtn.addEventListener('click', () => void nextClick());
  backBtn.addEventListener('click', goToStep1);

  // ── Init ─────────────────────────────────────────────────────
  async function loadSessionEmail(): Promise<string | null> {
    try {
      const res = await fetch(apiUrl('/api/me'), { credentials: 'include' });
      if (!res.ok) return null;
      const data = (await res.json()) as MeResponse;
      return data.authenticated && data.email ? data.email.toLowerCase() : null;
    } catch (err) {
      console.warn('[checkout] /api/me unreachable:', err);
      return null;
    }
  }

  void errMsg; // reserviert fuer spaetere Iframe-Fehler

  (async () => {
    const urlEmail = new URL(window.location.href).searchParams.get('email')?.trim().toLowerCase();
    let initial = urlEmail && isEmailValid(urlEmail) ? urlEmail : '';

    const session = await loadSessionEmail();
    if (session) sessionEmail = session;
    if (!initial && session) initial = session;

    if (initial) emailInput.value = initial;
    refreshEmailHint();
    refreshGating();
  })();
}
