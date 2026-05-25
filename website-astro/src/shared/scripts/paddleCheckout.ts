// Paddle-Checkout-Init und Click-Handler.
// 1:1 uebernommen aus dem Inline-Script in website/templates/pricing.html.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Paddle: any;
}

export interface PaddleCheckoutOptions {
  clientToken: string;
  env: 'sandbox' | 'live';
  appUrl: string;
  brandId: string;
  apiBaseUrl: string;
}

export function setupPaddleCheckout(opts: PaddleCheckoutOptions): void {
  if (typeof document === 'undefined') return;

  const { clientToken, env, appUrl, brandId } = opts;
  const apiBaseUrl = (opts.apiBaseUrl || '').replace(/\/$/, '');
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // Remembered for the global Paddle eventCallback, which cannot
  // receive arguments from the per-button click handler.
  let lastCheckoutEmail = '';

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showMailSentScreen(email: string): void {
    const existing = document.getElementById('mail-sent-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'mail-sent-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;' +
      'display:flex;align-items:center;justify-content:center;padding:16px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif;';
    overlay.innerHTML =
      '<div role="dialog" aria-live="polite" style="background:#fff;border-radius:12px;max-width:480px;width:100%;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
        '<h2 style="font-size:24px;font-weight:600;margin:0 0 12px;color:#1a1a1a;text-align:center;">Schau in dein Postfach</h2>' +
        '<p style="color:#333;line-height:1.55;margin:0 0 16px;text-align:center;font-size:15px;">Wir haben dir einen Login-Link an <strong>' + escapeHtml(email) + '</strong> gesendet.</p>' +
        '<p style="color:#555;font-size:14px;line-height:1.5;margin:0 0 20px;text-align:center;">Klicke auf den Link in der Mail, um dich anzumelden. Der Link ist 15 Minuten gueltig.</p>' +
        '<p style="color:#888;font-size:13px;line-height:1.5;margin:0;text-align:center;">Keine Mail erhalten? Schau auch im Spam-Ordner nach.</p>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  async function requestMagicLink(email: string, access?: 'free'): Promise<void> {
    try {
      const res = await fetch(apiBaseUrl + '/api/auth/request-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(access ? { email, access } : { email }),
      });
      if (!res.ok) throw new Error('request_link_failed_' + res.status);
    } catch (err) {
      console.warn('request-link unreachable:', err);
      throw err;
    }
  }

  document.querySelectorAll<HTMLAnchorElement>('[data-free-start]').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const freeEmail = window.prompt(
        'Mit welcher E-Mail-Adresse moechtest du deinen kostenlosen Zugang starten?',
      );
      if (!freeEmail) return;
      const normalizedEmail = freeEmail.trim().toLowerCase();
      if (!emailPattern.test(normalizedEmail)) {
        alert('Bitte gib eine gueltige E-Mail-Adresse ein.');
        return;
      }
      try {
        await requestMagicLink(normalizedEmail, 'free');
        showMailSentScreen(normalizedEmail);
      } catch {
        alert('Der Login-Link konnte gerade nicht gesendet werden. Bitte versuche es gleich noch einmal.');
      }
    });
  });

  if (!clientToken || clientToken.startsWith('REPLACE_')) {
    console.warn('Paddle client token not configured. Checkout disabled.');
    document.querySelectorAll<HTMLButtonElement>('[data-price-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Checkout ist noch nicht konfiguriert.');
      });
    });
    return;
  }

  if (typeof Paddle === 'undefined') {
    console.error('Paddle.js failed to load.');
    return;
  }

  if (env === 'sandbox') {
    Paddle.Environment.set('sandbox');
  }
  Paddle.Initialize({
    token: clientToken,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventCallback: (event: any) => {
      if (event && event.name === 'checkout.completed') {
        let email = lastCheckoutEmail;
        try {
          const customerEmail = event?.data?.customer?.email;
          if (customerEmail) email = String(customerEmail).trim().toLowerCase();
        } catch {
          /* ignore */
        }
        if (email) {
          requestMagicLink(email).then(() => {
            showMailSentScreen(email);
          }).catch(() => {
            alert('Der Login-Link konnte gerade nicht gesendet werden. Du wirst zur App weitergeleitet.');
            window.location.href = appUrl + '?checkout=success&email=' + encodeURIComponent(email);
          });
        } else {
          window.location.href = appUrl + '?checkout=success';
        }
      }
    },
  });

  document.querySelectorAll<HTMLButtonElement>('[data-price-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const priceId = btn.getAttribute('data-price-id');
      if (!priceId || priceId.startsWith('REPLACE_')) {
        alert('Price-ID ist noch nicht konfiguriert.');
        return;
      }

      const checkoutEmail = window.prompt(
        'Mit welcher E-Mail-Adresse moechtest du kaufen oder deinen bestehenden Zugang pruefen?',
      );
      if (!checkoutEmail) return;
      const normalizedEmail = checkoutEmail.trim().toLowerCase();
      if (!emailPattern.test(normalizedEmail)) {
        alert('Bitte gib eine gueltige E-Mail-Adresse ein.');
        return;
      }

      btn.disabled = true;
      try {
        const res = await fetch(apiBaseUrl + '/api/billing/checkout-intent', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ priceId, email: normalizedEmail }),
        });
        if (res.ok) {
          const intent = (await res.json()) as { action?: string };
          if (intent.action === 'already_active') {
            window.location.href = appUrl;
            return;
          }
          if (intent.action === 'manage_subscription') {
            window.location.href = appUrl + '?manage=1';
            return;
          }
          if (intent.action === 'login_required') {
            alert(
              'Bitte melde dich zuerst in der App an oder nutze die gleiche E-Mail-Adresse wie fuer dein Konto.',
            );
            return;
          }
          if (intent.action !== 'start_checkout') {
            alert('Checkout konnte nicht vorbereitet werden. Bitte versuche es gleich noch einmal.');
            return;
          }
        } else {
          alert('Checkout konnte nicht vorbereitet werden. Bitte versuche es gleich noch einmal.');
          return;
        }
      } catch (err) {
        console.warn('checkout-intent unreachable:', err);
        alert('Checkout konnte nicht vorbereitet werden. Bitte pruefe deine Verbindung und versuche es erneut.');
        return;
      } finally {
        btn.disabled = false;
      }

      lastCheckoutEmail = normalizedEmail;
      Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: normalizedEmail },
        customData: { brand_id: brandId, checkout_email: normalizedEmail },
        settings: {
          successUrl: appUrl + '?checkout=success&email=' + encodeURIComponent(normalizedEmail),
          displayMode: 'overlay',
          theme: 'light',
          locale: 'de',
        },
      });
    });
  });
}
