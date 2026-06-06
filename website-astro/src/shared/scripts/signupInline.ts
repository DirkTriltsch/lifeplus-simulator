// Free-Signup / Consent client script (Phase 3.1 + 3.5 erweitert).
//
// Email-Quellen-Priorität: URL ?email > /api/me Session > leer.
// next-Param: URL ?next=/checkout/{plan}[.html] wird an request-link
// weitergereicht und am Magic-Link-Token persistiert; nach Verify-Link
// redirected die App dorthin (siehe verify-link Response).
//
// Submit: POST /api/auth/request-link mit { email, access:'free', consent, next }.
// Erfolg: Success-View "Schau in dein Postfach" + Resend-Button (Cooldown
// 30 Sekunden, damit User nicht spammed).

interface MeResponse {
  authenticated: boolean;
  email?: string;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NEXT_URL_RX = /^\/checkout\/(monthly|halfyear|yearly)(?:\.html)?$/;
const RESEND_COOLDOWN_SECONDS = 30;

export function setupSignupInline(): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector<HTMLElement>('.signup');
  if (!root) return;

  // ── Config aus data-attrs ────────────────────────────────────
  const apiBase        = (root.dataset.apiBase ?? '').replace(/\/$/, '');
  const brandId        = root.dataset.brandId ?? '';
  const consentVersion = root.dataset.consentVersion ?? '';

  // ── DOM ──────────────────────────────────────────────────────
  const emailInput   = document.getElementById('signupEmail') as HTMLInputElement | null;
  const emailHint    = document.getElementById('emailHint');
  const btn          = document.getElementById('signupBtn') as HTMLButtonElement | null;
  const errMsg       = document.getElementById('errMsg');
  const chkAgb       = document.getElementById('chk-agb') as HTMLInputElement | null;
  const chkDse       = document.getElementById('chk-dse') as HTMLInputElement | null;
  const chkNl        = document.getElementById('chk-newsletter') as HTMLInputElement | null;
  const formView     = document.getElementById('formView');
  const sentView     = document.getElementById('sentView');
  const sentEmail    = document.getElementById('sentEmail');
  const resendBtn    = document.getElementById('resendBtn') as HTMLButtonElement | null;
  const resendStatus = document.getElementById('resendStatus');
  const nextHint     = document.getElementById('nextHint');

  if (
    !emailInput || !btn || !chkAgb || !chkDse || !chkNl || !errMsg ||
    !formView || !sentView
  ) {
    console.warn('[signup] missing DOM nodes — abort');
    return;
  }

  // ── State ────────────────────────────────────────────────────
  const urlParams = new URL(window.location.href).searchParams;
  const rawNext = urlParams.get('next') ?? '';
  const nextUrl: string | null = NEXT_URL_RX.test(rawNext) ? rawNext : null;
  let lastSubmittedEmail = '';

  if (nextHint && nextUrl) {
    nextHint.hidden = false;
  }

  // ── Helpers ──────────────────────────────────────────────────
  function currentEmail(): string {
    return emailInput!.value.trim().toLowerCase();
  }
  function isEmailValid(value: string): boolean {
    return EMAIL_RX.test(value) && value.length <= 254;
  }
  function apiUrl(path: string): string {
    return apiBase ? apiBase + path : path;
  }
  function refreshEmailUI(): void {
    const email = currentEmail();
    const valid = isEmailValid(email);
    emailInput!.classList.toggle('invalid', email.length > 0 && !valid);
    if (!emailHint) return;
    if (email.length > 0 && !valid) {
      emailHint.textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      emailHint.classList.add('error');
    } else {
      emailHint.textContent =
        'Wir senden dir einen Login-Link an diese Adresse.';
      emailHint.classList.remove('error');
    }
  }
  function refreshGating(): void {
    [chkAgb!, chkDse!, chkNl!].forEach((cb) => {
      const wrap = cb.closest('.check');
      if (!wrap) return;
      wrap.classList.toggle('checked', cb.checked);
      if (cb.checked) wrap.classList.remove('error');
    });
    const requiredOk = chkAgb!.checked && chkDse!.checked;
    const emailOk    = isEmailValid(currentEmail());
    btn!.disabled = !(requiredOk && emailOk);
    if (requiredOk && emailOk) errMsg!.classList.remove('show');
  }

  async function loadSessionEmail(): Promise<string | null> {
    try {
      const res = await fetch(apiUrl('/api/me'), { credentials: 'include' });
      if (!res.ok) return null;
      const data = (await res.json()) as MeResponse;
      return data.authenticated && data.email ? data.email : null;
    } catch (err) {
      console.warn('[signup] /api/me unreachable:', err);
      return null;
    }
  }

  async function submitSignup(email: string): Promise<{ ok: boolean; status?: number }> {
    try {
      const body: Record<string, unknown> = {
        email,
        access: 'free',
        consent: {
          agb:        true,
          privacy:    true,
          newsletter: chkNl!.checked,
          brand_id:   brandId,
          version:    consentVersion,
          timestamp:  new Date().toISOString(),
        },
      };
      if (nextUrl) body.next = nextUrl;
      const res = await fetch(apiUrl('/api/auth/request-link'), {
        method:      'POST',
        credentials: 'include',
        headers:     { 'content-type': 'application/json' },
        body:        JSON.stringify(body),
      });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      console.warn('[signup] request-link unreachable:', err);
      return { ok: false };
    }
  }

  function showSent(email: string): void {
    if (sentEmail) sentEmail.textContent = email;
    formView!.hidden = true;
    sentView!.hidden = false;
  }

  // ── Resend mit Cooldown ─────────────────────────────────────
  function startResendCooldown(): void {
    if (!resendBtn) return;
    let remaining = RESEND_COOLDOWN_SECONDS;
    resendBtn.disabled = true;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        resendBtn!.textContent = `Erneut senden (${remaining}s)`;
      } else {
        clearInterval(interval);
        resendBtn!.textContent = 'Erneut senden';
        resendBtn!.disabled = false;
      }
    }, 1000);
    resendBtn.textContent = `Erneut senden (${remaining}s)`;
  }

  async function handleResend(): Promise<void> {
    if (!lastSubmittedEmail) return;
    if (resendStatus) resendStatus.textContent = '';
    const result = await submitSignup(lastSubmittedEmail);
    if (result.ok) {
      if (resendStatus) resendStatus.textContent = `Login-Link wurde erneut an ${lastSubmittedEmail} gesendet.`;
      startResendCooldown();
    } else {
      if (resendStatus) resendStatus.textContent = 'Senden hat nicht funktioniert. Bitte später erneut versuchen.';
    }
  }

  // ── Event-Bindings ───────────────────────────────────────────
  emailInput.addEventListener('input', () => {
    refreshEmailUI();
    refreshGating();
  });
  [chkAgb, chkDse, chkNl].forEach((cb) =>
    cb!.addEventListener('change', refreshGating),
  );

  btn.addEventListener('click', async () => {
    const email = currentEmail();
    if (!isEmailValid(email)) {
      emailInput.classList.add('invalid');
      emailInput.focus();
      return;
    }
    if (!(chkAgb.checked && chkDse.checked)) {
      errMsg.classList.add('show');
      [chkAgb, chkDse].filter((cb) => !cb.checked)
        .forEach((cb) => cb.closest('.check')?.classList.add('error'));
      return;
    }
    btn.classList.add('loading');
    btn.disabled = true;
    const result = await submitSignup(email);
    btn.classList.remove('loading');
    if (result.ok) {
      lastSubmittedEmail = email;
      showSent(email);
      startResendCooldown();
    } else {
      btn.disabled = false;
      errMsg.textContent =
        'Der Login-Link konnte gerade nicht gesendet werden. Bitte versuche es gleich noch einmal.';
      errMsg.classList.add('show');
    }
  });

  if (resendBtn) {
    resendBtn.addEventListener('click', () => void handleResend());
  }

  // ── Init ─────────────────────────────────────────────────────
  (async () => {
    const urlEmail = urlParams.get('email')?.trim().toLowerCase();
    let initial = urlEmail && isEmailValid(urlEmail) ? urlEmail : '';
    if (!initial) {
      const sessionEmail = await loadSessionEmail();
      if (sessionEmail && isEmailValid(sessionEmail)) initial = sessionEmail;
    }
    if (initial) emailInput.value = initial;
    refreshEmailUI();
    refreshGating();
  })();
}
