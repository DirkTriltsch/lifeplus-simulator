// Free-Signup / Consent client script (Phase 3.1 + 3.5 erweitert).
//
// Email-Quellen-Priorität: URL ?email > /api/me Session > leer.
// next-Param: URL ?next=/checkout/{plan}[.html] wird an request-code
// weitergereicht und am OTP-Token persistiert; nach Verify-Code redirected
// die App dorthin (siehe verify-code Response).
//
// Submit: POST /api/auth/request-code mit { email, access:'free', consent, next }.
// Erfolg: Code-View + Resend-Button (Cooldown
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
  const appUrl         = root.dataset.appUrl ?? '/app/';
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
  const codeInput    = document.getElementById('signupCode') as HTMLInputElement | null;
  const verifyBtn    = document.getElementById('verifySignupBtn') as HTMLButtonElement | null;
  const codeErrMsg   = document.getElementById('codeErrMsg');
  const resendBtn    = document.getElementById('resendBtn') as HTMLButtonElement | null;
  const resendStatus = document.getElementById('resendStatus');
  const nextHint     = document.getElementById('nextHint');

  if (
    !emailInput || !btn || !chkAgb || !chkDse || !chkNl || !errMsg ||
    !formView || !sentView || !codeInput || !verifyBtn || !codeErrMsg
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
        'Wir senden dir einen 6-stelligen Code an diese Adresse.';
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
      const res = await fetch(apiUrl('/api/auth/request-code'), {
        method:      'POST',
        credentials: 'include',
        headers:     { 'content-type': 'application/json' },
        body:        JSON.stringify(body),
      });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      console.warn('[signup] request-code unreachable:', err);
      return { ok: false };
    }
  }

  async function verifySignupCode(email: string, code: string): Promise<{
    ok: boolean;
    status?: 'invalid' | 'locked' | 'error';
    nextUrl?: string | null;
  }> {
    try {
      const res = await fetch(apiUrl('/api/auth/verify-code'), {
        method:      'POST',
        credentials: 'include',
        headers:     { 'content-type': 'application/json' },
        body:        JSON.stringify({ email, code }),
      });
      if (res.ok) {
        const data = (await res.json()) as { nextUrl?: string | null };
        return { ok: true, nextUrl: data.nextUrl ?? null };
      }
      let errCode = '';
      try {
        const data = (await res.json()) as { error?: { code?: string } };
        errCode = data.error?.code ?? '';
      } catch {
        // keep generic error below
      }
      if (errCode === 'code_locked') return { ok: false, status: 'locked' };
      if (errCode === 'code_invalid' || errCode === 'invalid_code') {
        return { ok: false, status: 'invalid' };
      }
      return { ok: false, status: 'error' };
    } catch (err) {
      console.warn('[signup] verify-code unreachable:', err);
      return { ok: false, status: 'error' };
    }
  }

  function showSent(email: string): void {
    if (sentEmail) sentEmail.textContent = email;
    formView!.hidden = true;
    sentView!.hidden = false;
    codeInput!.value = '';
    verifyBtn!.disabled = true;
    codeErrMsg!.classList.remove('show');
    codeInput!.focus();
  }

  function currentCode(): string {
    return codeInput!.value.replace(/\D/g, '').slice(0, 6);
  }

  function refreshCodeUI(): void {
    const code = currentCode();
    if (codeInput!.value !== code) codeInput!.value = code;
    verifyBtn!.disabled = code.length !== 6 || !lastSubmittedEmail;
    codeErrMsg!.classList.remove('show');
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
      if (resendStatus) resendStatus.textContent = `Code wurde erneut an ${lastSubmittedEmail} gesendet.`;
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
  codeInput.addEventListener('input', refreshCodeUI);
  codeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') void handleVerify();
  });

  async function handleVerify(): Promise<void> {
    const code = currentCode();
    if (!lastSubmittedEmail || code.length !== 6) {
      codeInput!.focus();
      return;
    }
    verifyBtn!.classList.add('loading');
    verifyBtn!.disabled = true;
    codeErrMsg!.classList.remove('show');
    const result = await verifySignupCode(lastSubmittedEmail, code);
    verifyBtn!.classList.remove('loading');
    if (result.ok) {
      window.location.replace(result.nextUrl || appUrl);
      return;
    }
    verifyBtn!.disabled = false;
    codeErrMsg!.textContent = result.status === 'locked'
      ? 'Zu viele falsche Versuche. Bitte fordere einen neuen Code an.'
      : 'Der Code ist ungueltig oder abgelaufen.';
    codeErrMsg!.classList.add('show');
  }

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
        'Der Code konnte gerade nicht gesendet werden. Bitte versuche es gleich noch einmal.';
      errMsg.classList.add('show');
    }
  });

  verifyBtn.addEventListener('click', () => void handleVerify());

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
