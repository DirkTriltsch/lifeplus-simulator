// Pro-Plan-Inline-Checkout client script — Wizard 2 Steps.
//
// Step 1 (Daten):
//   E-Mail, AGB+DSE Pflicht, Newsletter optional.
//   "Weiter zur Zahlung" → checkout-intent → Step 2 anzeigen.
//
// Step 2 (Zahlung):
//   Konto-Anzeige read-only + "Daten aendern"-Link (zurueck zu Step 1).
//   Widerrufsverzicht optional, danach Paddle inline-Iframe laden.
//   "Daten aendern": entlaedt Paddle und zeigt Step 1.

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
    | 'manage_subscription'
    | 'already_paid'
    | 'email_mismatch'
    | 'login_required'
    | 'invalid_plan';
  priceId?: string;
  checkoutEmail?: string;
  sessionUserId?: string;
  brandId?: string;
  intentId?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function setupCheckoutInline(): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector<HTMLElement>('.checkout');
  if (!root) return;

  // ── Config aus data-attrs ────────────────────────────────────
  const apiBase        = (root.dataset.apiBase ?? '').replace(/\/$/, '');
  const brandId        = root.dataset.brandId ?? '';
  const appUrl         = root.dataset.appUrl ?? '/app/';
  const paddleToken    = root.dataset.paddleToken ?? '';
  const paddleEnv      = (root.dataset.paddleEnv ?? 'sandbox') as 'sandbox' | 'live';
  const plan           = root.dataset.plan ?? '';
  const consentVersion = root.dataset.consentVersion ?? '';

  // ── DOM ──────────────────────────────────────────────────────
  const step1         = document.getElementById('step1');
  const step2         = document.getElementById('step2');
  const dot1          = document.getElementById('dot1');
  const dot2          = document.getElementById('dot2');
  const label1        = document.getElementById('label1');
  const label2        = document.getElementById('label2');
  const stepLineFill  = document.getElementById('stepLineFill');
  const emailInput    = document.getElementById('checkoutEmail') as HTMLInputElement | null;
  const emailHint     = document.getElementById('emailHint');
  const paddleWrap    = document.getElementById('paddleWrap');
  const nextBtn       = document.getElementById('nextBtn') as HTMLButtonElement | null;
  const backBtn       = document.getElementById('backBtn') as HTMLButtonElement | null;
  const payBtn        = document.getElementById('payBtn') as HTMLButtonElement | null;
  const errMsg        = document.getElementById('errMsg');
  const errMsgStep1   = document.getElementById('errMsgStep1');
  const payBtnLabel   = document.getElementById('payBtnLabel');
  const intentBanner  = document.getElementById('intentBanner');
  const intentBannerText = document.getElementById('intentBannerText');
  const optHint       = document.getElementById('optHint');
  const kontoEmailEl  = document.getElementById('kontoEmail');
  const activeForm    = document.querySelector<HTMLElement>('.form-active');
  const successView   = document.getElementById('successView');
  const successEmail  = document.getElementById('successEmail');
  const successMail   = document.getElementById('successMail');
  const chkAgb        = document.getElementById('chk-agb') as HTMLInputElement | null;
  const chkDse        = document.getElementById('chk-dse') as HTMLInputElement | null;
  const chkNl         = document.getElementById('chk-newsletter') as HTMLInputElement | null;
  const chkWid        = document.getElementById('chk-widerruf') as HTMLInputElement | null;

  if (
    !step1 || !step2 || !emailInput || !nextBtn || !backBtn || !payBtn ||
    !chkAgb || !chkDse || !chkNl || !chkWid || !paddleWrap || !errMsg ||
    !errMsgStep1
  ) {
    console.warn('[checkout] missing DOM nodes — abort');
    return;
  }

  // ── State ────────────────────────────────────────────────────
  let paddleInitialized = false;
  let activeIntentId    = '';
  let activeIntentEmail = '';
  let activePriceId     = '';
  let mounted           = false;
  let sessionEmail      = '';

  // ── Helpers ──────────────────────────────────────────────────
  function currentEmail(): string {
    return emailInput!.value.trim().toLowerCase();
  }
  function isEmailValid(value: string): boolean {
    return EMAIL_RX.test(value) && value.length <= 254;
  }
  function placeholder(msg: string, kind: 'info' | 'warn' | 'error' = 'info'): void {
    paddleWrap!.innerHTML =
      '<div class="paddle-placeholder paddle-placeholder--' + kind + '">' +
      escapeHtml(msg) + '</div>';
  }
  function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  function isLocalDevHost(): boolean {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }

  // ── Step-Switching ──────────────────────────────────────────
  function goToStep1(): void {
    step2!.hidden = true;
    step1!.hidden = false;
    dot1!.className = 'step-dot step-dot--active';
    dot2!.className = 'step-dot';
    label1!.className = 'step-label step-label--active';
    label2!.className = 'step-label';
    stepLineFill?.classList.remove('full');
    if (mounted) unmountPaddle(true);
    refreshStep1Gating();
  }
  function goToStep2(): void {
    step1!.hidden = true;
    step2!.hidden = false;
    dot1!.className = 'step-dot step-dot--done';
    dot2!.className = 'step-dot step-dot--active';
    label1!.className = 'step-label';
    label2!.className = 'step-label step-label--active';
    stepLineFill?.classList.add('full');
    if (kontoEmailEl) kontoEmailEl.textContent = activeIntentEmail;
    refreshStep2Gating();
  }

  // ── customData fuer Paddle ───────────────────────────────────
  function buildCustomData(): Record<string, unknown> {
    return {
      brand_id:       brandId,
      intent_id:      activeIntentId,
      checkout_email: activeIntentEmail,
      plan,
      consent: {
        agb:               chkAgb!.checked,
        privacy:           chkDse!.checked,
        newsletter:        chkNl!.checked,
        withdrawal_waiver: chkWid!.checked,
        version:           consentVersion,
        timestamp:         new Date().toISOString(),
      },
    };
  }

  // ── API-Calls ────────────────────────────────────────────────
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

  async function requestIntent(): Promise<CheckoutIntentResponse | null> {
    try {
      const res = await fetch(apiUrl('/api/billing/checkout-intent'), {
        method:      'POST',
        credentials: 'include',
        headers:     { 'content-type': 'application/json' },
        body:        JSON.stringify({ plan, checkoutEmail: currentEmail() }),
      });
      if (!res.ok) return null;
      return (await res.json()) as CheckoutIntentResponse;
    } catch (err) {
      console.warn('[checkout] checkout-intent unreachable:', err);
      return null;
    }
  }

  // ── Paddle init + mount ──────────────────────────────────────
  function ensurePaddleInitialized(): boolean {
    if (paddleInitialized) return true;
    if (typeof Paddle === 'undefined') {
      placeholder('Zahlungssystem konnte nicht geladen werden. Bitte Seite neu laden.', 'error');
      return false;
    }
    if (!paddleToken || paddleToken.startsWith('REPLACE_')) {
      placeholder('Paddle ist noch nicht konfiguriert.', 'error');
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

  function mountPaddle(priceId: string): void {
    if (!ensurePaddleInitialized()) return;
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
      items:      [{ priceId, quantity: 1 }],
      customer:   { email: activeIntentEmail },
      customData: buildCustomData(),
    });
    mounted = true;
  }

  function unmountPaddle(clearIntent: boolean): void {
    if (mounted && typeof Paddle?.Checkout?.close === 'function') {
      try { Paddle.Checkout.close(); } catch { /* ignore */ }
    }
    mounted = false;
    if (clearIntent) {
      activeIntentId = '';
      activeIntentEmail = '';
      activePriceId = '';
    }
    placeholder('Waehle zuerst, ob du sofort starten moechtest. Danach laden wir das sichere Paddle-Zahlungsfeld.');
  }

  // ── checkout.completed → post-checkout ───────────────────────
  async function handleCheckoutCompleted(): Promise<void> {
    const email = activeIntentEmail || currentEmail();
    const immediateStart = chkWid!.checked;
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
      successMail.textContent = immediateStart
        ? 'Du hast den Sofortstart gewaehlt. Dein Pro-Zugang wird nach der Paddle-Bestaetigung aktiviert.'
        : 'Du hast keinen Sofortstart gewaehlt. Dein Kauf ist abgeschlossen; der Zugang wird nicht automatisch vor Ablauf der Widerrufsfrist gestartet.';
      if (mailMessage) successMail.textContent += ' ' + mailMessage;
    }
    if (activeForm) activeForm.hidden = true;
    if (successView) successView.hidden = false;
  }

  // ── Gating ───────────────────────────────────────────────────
  function refreshStep1Gating(): void {
    [chkAgb!, chkDse!, chkNl!].forEach((cb) => {
      const wrap = cb.closest('.check');
      if (!wrap) return;
      wrap.classList.toggle('checked', cb.checked);
      if (cb.checked) wrap.classList.remove('error');
    });
    const requiredOk = chkAgb!.checked && chkDse!.checked;
    const emailOk    = isEmailValid(currentEmail());
    nextBtn!.disabled = !(requiredOk && emailOk);
    if (requiredOk && emailOk) errMsgStep1!.classList.remove('show');
  }
  function refreshStep2Gating(): void {
    const wid = chkWid!;
    const wrap = wid.closest('.check');
    if (wrap) wrap.classList.toggle('checked', wid.checked);

    if (payBtnLabel) {
      payBtnLabel.textContent = chkWid!.checked ? 'Sofort starten' : 'Kauf abschliessen';
    }
    payBtn!.disabled = !activePriceId;
    if (activePriceId) errMsg!.classList.remove('show');
    if (optHint) optHint.classList.toggle('show', !chkWid!.checked);
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
      emailHint.textContent =
        'Diese E-Mail gehoert nicht zu deiner Sitzung. Bitte verwende deine Konto-Email.';
      emailHint.classList.add('error');
    } else {
      emailHint.textContent = 'Wird fuer Rechnung, Zugang und Login verwendet.';
      emailHint.classList.remove('error');
    }
  }

  // ── "Weiter zur Zahlung" → Intent + Mount + Step 2 ──────────
  async function nextClick(): Promise<void> {
    const email = currentEmail();
    if (!isEmailValid(email) || !chkAgb!.checked || !chkDse!.checked) {
      errMsgStep1!.classList.add('show');
      return;
    }
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
        if (!intent.priceId || !intent.intentId || !intent.checkoutEmail) {
          showBanner('Server-Antwort unvollstaendig. Bitte Seite neu laden.', 'error');
          nextBtn!.disabled = false;
          break;
        }
        activeIntentId    = intent.intentId;
        activeIntentEmail = intent.checkoutEmail;
        activePriceId     = intent.priceId;
        root!.dataset.priceId = intent.priceId;
        goToStep2();
        placeholder('Waehle zuerst, ob du sofort starten moechtest. Danach laden wir das sichere Paddle-Zahlungsfeld.');
        refreshStep2Gating();
        break;
      }
      case 'login_required': {
        if (isLocalDevHost()) {
          showBanner(
            'Keine lokale Session gefunden. Fuehre in der Browser-Konsole await fetch("/api/auth/dev-login", { method:"POST", credentials:"include", headers:{ "content-type":"application/json" }, body: JSON.stringify({ email: "' + email + '" }) }).then(r => r.json()) aus, lade die Seite neu und versuche es erneut.',
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
        showBanner(
          'Diese E-Mail gehoert nicht zu deiner aktuellen Sitzung. Bitte verwende deine Konto-Email.',
          'warn',
        );
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

  // ── Zahlungsfeld laden / erneut fokussieren ──────────────────
  function payClick(): void {
    if (!activePriceId) {
      errMsg!.classList.add('show');
      return;
    }
    payBtn!.classList.add('loading');
    if (!mounted) {
      mountPaddle(activePriceId);
      refreshStep2Gating();
    }
    paddleWrap!.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => payBtn!.classList.remove('loading'), 600);
  }

  function withdrawalChanged(): void {
    if (mounted) {
      unmountPaddle(false);
      placeholder('Deine Sofortstart-Auswahl wurde geaendert. Bitte lade das Zahlungsfeld erneut.');
    }
    refreshStep2Gating();
  }

  // ── Event-Bindings ───────────────────────────────────────────
  emailInput.addEventListener('input', () => {
    refreshEmailHint();
    refreshStep1Gating();
  });
  [chkAgb, chkDse, chkNl].forEach((cb) =>
    cb!.addEventListener('change', refreshStep1Gating),
  );
  chkWid.addEventListener('change', withdrawalChanged);
  nextBtn.addEventListener('click', () => void nextClick());
  backBtn.addEventListener('click', goToStep1);
  payBtn.addEventListener('click', payClick);

  // ── Init ─────────────────────────────────────────────────────
  (async () => {
    // Email-Quellen-Priorität: URL ?email > /api/me Session > leer
    const urlEmail = new URL(window.location.href).searchParams.get('email')?.trim().toLowerCase();
    let initial = urlEmail && isEmailValid(urlEmail) ? urlEmail : '';

    const session = await loadSessionEmail();
    if (session) sessionEmail = session;
    if (!initial && session) initial = session;

    if (initial) emailInput.value = initial;
    refreshEmailHint();
    refreshStep1Gating();
  })();
}
