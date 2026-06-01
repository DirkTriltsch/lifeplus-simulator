const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RESEND_COOLDOWN_SECONDS = 30;

export function setupLoginInline(): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector<HTMLElement>('.login');
  if (!root) return;

  const apiBase = (root.dataset.apiBase ?? '').replace(/\/$/, '');
  const appUrl = root.dataset.appUrl ?? '/app/';

  const checkingView = document.getElementById('loginCheckingView');
  const formView = document.getElementById('loginFormView');
  const sentView = document.getElementById('loginSentView');
  const notFoundView = document.getElementById('loginNotFoundView');
  const emailInput = document.getElementById('loginEmail') as HTMLInputElement | null;
  const emailHint = document.getElementById('loginEmailHint');
  const btn = document.getElementById('loginBtn') as HTMLButtonElement | null;
  const errMsg = document.getElementById('loginErrMsg');
  const sentEmail = document.getElementById('loginSentEmail');
  const resendBtn = document.getElementById('loginResendBtn') as HTMLButtonElement | null;
  const resendStatus = document.getElementById('loginResendStatus');
  const tryAgainBtn = document.getElementById('loginTryAgainBtn') as HTMLButtonElement | null;

  if (!formView || !sentView || !notFoundView || !emailInput || !btn || !errMsg) {
    console.warn('[login] missing DOM nodes - abort');
    return;
  }

  let lastSubmittedEmail = '';

  function apiUrl(path: string): string {
    return apiBase ? apiBase + path : path;
  }

  function currentEmail(): string {
    return emailInput!.value.trim().toLowerCase();
  }

  function isEmailValid(value: string): boolean {
    return EMAIL_RX.test(value) && value.length <= 254;
  }

  function refreshEmailUI(): void {
    const email = currentEmail();
    const valid = isEmailValid(email);
    emailInput!.classList.toggle('invalid', email.length > 0 && !valid);
    btn!.disabled = !valid;
    if (!emailHint) return;
    if (email.length > 0 && !valid) {
      emailHint.textContent = 'Bitte eine gueltige E-Mail-Adresse eingeben.';
      emailHint.classList.add('error');
    } else {
      emailHint.textContent = 'Wir senden dir einen einmaligen Login-Link.';
      emailHint.classList.remove('error');
    }
  }

  interface LoginLinkResult {
    status: 'ok' | 'error';
  }

  async function requestLoginLink(email: string): Promise<LoginLinkResult> {
    try {
      const res = await fetch(apiUrl('/api/auth/request-link'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        return { status: 'ok' };
      }
      let code = '';
      try {
        const data = (await res.json()) as { error?: { code?: string } };
        code = data.error?.code ?? '';
      } catch {
        // keep generic error below
      }
      if (code === 'account_not_found') return { status: 'ok' };
      return { status: 'error' };
    } catch (err) {
      console.warn('[login] request-link unreachable:', err);
      return { status: 'error' };
    }
  }

  async function redirectAuthenticatedSession(): Promise<boolean> {
    try {
      const res = await fetch(apiUrl('/api/me'), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { authenticated?: boolean };
      if (data.authenticated === true) {
        window.location.replace(appUrl);
        return true;
      }
    } catch (err) {
      console.warn('[login] /api/me unreachable:', err);
    }
    return false;
  }

  function showForm(): void {
    if (checkingView) checkingView.hidden = true;
    formView!.hidden = false;
    sentView!.hidden = true;
    notFoundView!.hidden = true;
    errMsg!.classList.remove('show');
    refreshEmailUI();
  }

  function showSent(email: string): void {
    if (sentEmail) sentEmail.textContent = email;
    formView!.hidden = true;
    if (checkingView) checkingView.hidden = true;
    sentView!.hidden = false;
    notFoundView!.hidden = true;
  }

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

  async function submit(): Promise<void> {
    const email = currentEmail();
    if (!isEmailValid(email)) {
      emailInput!.classList.add('invalid');
      emailInput!.focus();
      return;
    }

    btn!.classList.add('loading');
    btn!.disabled = true;
    errMsg!.classList.remove('show');
    const result = await requestLoginLink(email);
    btn!.classList.remove('loading');

    if (result.status === 'ok') {
      lastSubmittedEmail = email;
      showSent(email);
      startResendCooldown();
      return;
    }

    btn!.disabled = false;
    errMsg!.textContent = 'Der Login-Link konnte gerade nicht gesendet werden. Bitte versuche es gleich noch einmal.';
    errMsg!.classList.add('show');
  }

  async function resend(): Promise<void> {
    if (!lastSubmittedEmail) return;
    if (resendStatus) resendStatus.textContent = '';
    const result = await requestLoginLink(lastSubmittedEmail);
    if (result.status === 'ok') {
      if (resendStatus) resendStatus.textContent = 'Falls ein Konto existiert, wurde erneut ein Login-Link gesendet.';
      startResendCooldown();
    } else if (resendStatus) {
      resendStatus.textContent = 'Senden hat nicht funktioniert. Bitte spaeter erneut versuchen.';
    }
  }

  emailInput.addEventListener('input', refreshEmailUI);
  btn.addEventListener('click', () => void submit());
  resendBtn?.addEventListener('click', () => void resend());
  tryAgainBtn?.addEventListener('click', showForm);

  (async () => {
    if (await redirectAuthenticatedSession()) return;

    const url = new URL(window.location.href);
    const urlEmail = url.searchParams.get('email')?.trim().toLowerCase();
    if (urlEmail && isEmailValid(urlEmail)) emailInput.value = urlEmail;
    refreshEmailUI();

    if (url.searchParams.get('continue') === 'app') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    showForm();
    root.dataset.ready = appUrl;
  })();
}
