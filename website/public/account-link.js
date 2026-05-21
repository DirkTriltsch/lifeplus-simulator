// Toggles visibility of "Mein Konto" links across the marketing site.
// Links carry the class "js-account-link" and are hidden via CSS by default.
// On page load we hit /api/me; if the user has a session, we reveal the links.
//
// The API base URL is expected at window.LFL_API_BASE (set per-brand by the
// build pipeline in each HTML template).

(function () {
  const apiBase = (window.LFL_API_BASE || '').replace(/\/$/, '');
  if (!apiBase) return;

  fetch(apiBase + '/api/me', { credentials: 'include' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (me) {
      if (me && me.authenticated) {
        document.querySelectorAll('.js-account-link').forEach(function (el) {
          el.classList.add('is-visible');
        });
      }
    })
    .catch(function () {
      // network/CORS failure or unauthenticated → leave links hidden
    });
})();
