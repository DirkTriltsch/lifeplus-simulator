// Aus website/public/account-link.js uebernommen.
// Blendet alle .js-account-link Elemente nur dann ein, wenn /api/me eine
// authentifizierte Session zurueckgibt.
export function setupAccountLink(apiBase: string | undefined | null): void {
  if (typeof document === 'undefined') return;
  const base = (apiBase || '').replace(/\/$/, '');
  if (!base) return;
  fetch(base + '/api/me', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((me: { authenticated?: boolean }) => {
      if (me && me.authenticated) {
        document.querySelectorAll<HTMLElement>('.js-account-link').forEach((el) => {
          el.classList.add('is-visible');
        });
      }
    })
    .catch(() => {
      // Netzwerk-/CORS-Fehler oder nicht eingeloggt -> Links bleiben versteckt
    });
}
