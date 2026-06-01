# Umsetzungsplan — Pro/Free-Checkout-Flow

**Stand:** 2026-06-02
**Status:** Phasen 0–3 vollständig umgesetzt, Phase 4 (Tests + Go-Live) vor uns

---

## Aktueller Stand

| Phase | Status | Notiz |
|---|---|---|
| **0 — Unblock** | ✅ | Bug-Fix `checkout-intent`, Dynamic Routes, Pricing-CTAs umgebaut |
| **1 — DB-Schema** | ✅ | Migrationen 0002–0006 lokal angewendet; **0005+0006 remote noch nicht** |
| **2 — Backend APIs** | ✅ | inkl. Review-Fixes: Server-Intent, Token-Kompensation, Dev-Login-Endpoint |
| **3 — Frontend (Astro)** | ✅ | Signup mit Resend, Checkout-Wizard (2 Steps), Option-A-Widerruf-Toggle, Pricing-CTA-Optimierung |
| **4 — Tests + Go-Live** | 🔜 | siehe unten — Migrationen remote, Paddle Setup, E2E, App-`nextUrl` |

---

## Festgelegte Entscheidungen

1. **Free Signup = Option A** — Consent vor Login, persistiert am Magic-Link-Token
2. **Email-Änderung im Checkout = Option B** — Paddle erst nach Email-Bestätigung mounten; bei Änderung Paddle entladen
3. **Kauf für fremde Email = NEIN** — `checkout_email` muss `session_email` entsprechen; Pro-Checkout nur mit Session
4. **Beta-Grace-Bestandsuser** — bei Bedarf löschen + neue Trial-Zeit; kein Migrations-Pfad
5. **Pro-Checkout-UI = Wizard 2 Steps** — Step 1: Daten + Pflicht-Consents; Step 2: Widerruf-Toggle + Paddle + Submit
6. **Widerruf-Reihenfolge in Step 2 (Option A)** — Widerruf-Checkbox VOR Paddle-Mount; dynamischer Button-Label „Sofort starten" vs „Kauf abschliessen"; Paddle wird erst beim Klick auf den Submit-Button gemountet
7. **Server-Intent gegen customData-Manipulation** — `POST /api/billing/checkout-intent` schreibt einen Eintrag in `checkout_intents`; Frontend reicht `intent_id` ans Paddle; Webhook verifiziert intent statt customData zu vertrauen
8. **Access-Policy nach Kauf = Variante 1** — Pro startet sofort, mit oder ohne Widerrufsverzicht. Bei Widerruf binnen 14 Tagen: anteilige Erstattung via Paddle-Refund, Webhook degradiert Entitlement (`handleRefund`)

---

## Identitätsregel (verbindlich)

```
Free Signup:
  Anonym OK → /signup sammelt Email + Consent → POST /api/auth/request-link
  Magic-Link enthält Token; access_intent='free' + consent_payload_json + next_url am Token persistiert
  Magic-Link-Klick (App-Seite) → POST /api/auth/verify-link
    → User-Anlage + Trial-Entitlement (14d Pro) + consent_log + Session
    → App leitet zu nextUrl weiter (siehe 4.8)

Pro Checkout:
  Session zwingend (kein Gast → anonyme Klicks werden via /signup?next=... durchgeleitet)
  checkout_email ist editierbar, MUSS == session_email
  Mismatch → Banner + Paddle entladen + CTA off
  Server-Intent ist authoritative: Webhook nutzt intent.user_id und intent.checkout_email
  (customData.checkout_email muss bei intent_id matchen, sonst Manipulationsverdacht)
```

---

## Phase 0 — Unblock ✅

| # | Step | Status |
|---|---|---|
| 0.1 | `checkout-intent` Free-Bug-Fix (nur paid Sub blockt, Free/Trial darf kaufen) | ✅ |
| 0.2 | Astro Dynamic Routes `pages/checkout/[plan].astro` mit `getStaticPaths()` | ✅ |
| 0.3 | Pricing-CTAs auf Links umgestellt, `paddleCheckout.ts` entfernt | ✅ |

---

## Phase 1 — DB-Schema ✅

| # | Migration | Inhalt | Status |
|---|---|---|---|
| 1.1 | `0002_consent_log.sql` | Append-only Audit-Tabelle, 16 Spalten + 3 Indexes | ✅ local |
| 1.2 | `0003_magic_link_consent.sql` | `magic_login_tokens.access_intent`, `consent_payload_json` | ✅ local |
| 1.3 | `0004_consent_log_client_timestamp.sql` | `consent_log.client_timestamp_iso` | ✅ local |
| 1.4 | `0005_checkout_intents.sql` | Server-Intent gegen customData-Manipulation | ✅ local · ⚠ **remote pending** |
| 1.5 | `0006_magic_link_next_url.sql` | `magic_login_tokens.next_url` für Pro-CTA-Anonym-Flow | ✅ local · ⚠ **remote pending** |

### `consent_log` (Stand 0004)

```sql
CREATE TABLE consent_log (
  id TEXT PRIMARY KEY,
  checkout_user_id TEXT NOT NULL,
  session_user_id TEXT,
  checkout_email TEXT NOT NULL,
  session_email TEXT,
  brand_id TEXT NOT NULL,
  context TEXT NOT NULL,                     -- 'free_signup' | 'pro_checkout'
  accepted_agb INTEGER NOT NULL,
  accepted_privacy INTEGER NOT NULL,
  accepted_withdrawal_waiver INTEGER NOT NULL DEFAULT 0,
  newsletter_opt_in INTEGER NOT NULL DEFAULT 0,
  document_version TEXT NOT NULL,
  client_timestamp_iso TEXT,                 -- Browser-Zeit zum Zustimmungs-Moment
  paddle_transaction_id TEXT,
  paddle_subscription_id TEXT,
  request_ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (checkout_user_id) REFERENCES users(id)
);
```

### `checkout_intents` (Stand 0005)

```sql
CREATE TABLE checkout_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  plan TEXT NOT NULL,                                  -- monthly|halfyear|yearly
  price_id TEXT NOT NULL,
  checkout_email TEXT NOT NULL,                        -- == session.email zur Intent-Erstellung
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,                         -- created_at + 30 Min
  consumed_at INTEGER,                                 -- Webhook setzt beim Match
  consumed_paddle_subscription_id TEXT,
  consumed_paddle_transaction_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Phase 2 — Backend APIs ✅

| # | Step | File | Status |
|---|---|---|---|
| 2.1 | `request-link.ts` — nimmt `consent`, `access='free'`, `next` entgegen | `functions/api/auth/request-link.ts` | ✅ |
| 2.2 | `verify-link.ts` — Trial-Grant + consent_log + Token-Kompensation + next-Url-Response | `functions/api/auth/verify-link.ts` | ✅ |
| 2.3 | `checkout-intent.ts` — `{plan, checkoutEmail}` + Email-Match + Server-Intent | `functions/api/billing/checkout-intent.ts` | ✅ |
| 2.4 | `post-checkout.ts` — kein Entitlement, Magic-Link best-effort | `functions/api/billing/post-checkout.ts` | ✅ |
| 2.5 | `webhook.ts` — Intent-validierung + consent_log + Identitätsregel | `functions/api/paddle/webhook.ts` | ✅ |
| 2.6 | `/api/me` — Lazy-Trial-Degradierung | `functions/api/me.ts`, `functions/_lib/db.ts` | ✅ |

### Review-Fixes (Phase 2 nach externem Review)

| Finding | Fix | Status |
|---|---|---|
| Dev-Token-Helper darf nicht versehentlich deployen | Hinter `DEV_MAGIC_LINK_DEBUG=1` UND `INSECURE_COOKIES=1` — beide nur in `.dev.vars` | ✅ |
| `verify-link` markiert Token vor Side-Effects | `try/catch` → bei Fehler `used_at = NULL` Kompensation | ✅ |
| Mailer-Fehler erzeugt tote Magic-Link-Tokens | DELETE bei Mail-Fail (außer Dev-Mode) | ✅ |
| Free-Verify ohne Consent vergibt trotzdem Trial | `throw` wenn kein gültiger Consent-Payload — kein Trial ohne Audit | ✅ |
| customData wird zu stark vertraut | Server-Intent (Migration 0005) + Webhook-Validierung | ✅ |
| consent_log Idempotenz bei Token-Kompensation | Pre-Check via `(user_id, context, document_version)` | ✅ |

---

## Phase 3 — Frontend (Astro) ✅

| # | Step | File(s) | Status |
|---|---|---|---|
| 3.1 | `/signup` Submit + Resend-Button (30s Cooldown) | `SignupPage.astro`, `signupInline.ts` | ✅ |
| 3.2 | `/checkout/[plan]` Mismatch-Logik | `CheckoutPage.astro`, `checkoutInline.ts` | ✅ |
| 3.3 | Wizard 2 Steps statt Option-B-Standalone | siehe Wizard-Design unten | ✅ |
| 3.4 | Post-Checkout: `checkout.completed` → POST `/api/billing/post-checkout` → Success-View | `checkoutInline.ts`, Success-Block in `CheckoutPage.astro` | ✅ |
| 3.5 | `?next=...` Param durch Magic-Link-Flow | `signupInline.ts`, `request-link.ts`, `verify-link.ts` | ✅ Backend; ⚠ App-Frontend offen → Phase 4.8 |
| 3.6 | Pricing-CTA-Optimierung: anonyme Pro-Klicks direkt zu `/signup?next=...` | `PricingPageDefault.astro` | ✅ |

### Wizard-Design (Phase 3.3, Phase 2-Review-Fix #3 verfeinert)

```
   ●━━━━━━━━━━━━━━━━━○         ●━━━━━━━━━━━━━━━━━●
  Daten          Zahlung       Daten          Zahlung

  ─── STEP 1 ────────────       ─── STEP 2 ────────────

  Email                         Konto · (read-only)
  AGB *                            [← Daten ändern]
  Datenschutz *
  Newsletter (opt)              Sofortstart (Widerruf-
  * Pflichtfeld                  verzicht, optional)

  [Weiter zur Zahlung →]        [Kauf abschliessen]
                                 oder „Sofort starten"
                                 (Button-Label dynamisch
                                  je Checkbox-Zustand)

                                Paddle-Iframe (erst
                                nach Klick auf Submit
                                gemountet)
```

**Wichtige Details:**
- Paddle wird **erst beim Klick auf den Submit-Button** gemountet, nicht beim Step-Wechsel — verhindert „Paddle ist da bevor User Widerruf entschieden hat"
- Bei `checkout.completed`: `post-checkout` API + Success-View (kein sofortiger Redirect zur App)
- Bei Widerruf-Checkbox-Change NACH Paddle-Mount: Paddle wird entladen + muss neu gemountet werden (für korrekte `customData.consent.withdrawal_waiver`)

---

## Phase 4 — Tests + Go-Live 🔜

### Abhängigkeiten

```
4.1 Remote-Migrationen ─┐
4.2 Prod-Safety-Check   ├─→ Voraussetzung 4.7 E2E
4.3 Paddle-Sandbox      ─┤
4.4 Paddle-Dashboard   ─┘
4.5 Legal-Texte         ─→ vor Live-Gang zwingend
4.6 Doku-Update         ─→ DIESES Dokument
4.7 E2E-Tests T1–T15    ─→ nach 4.1–4.4
4.8 App-nextUrl Redirect ─→ vor Live-Gang zwingend
```

### 4.1 — Remote-Migrationen absichern und anwenden

```powershell
# Backup
npx wrangler d1 export lifeflow360-prod --remote --output backup-pre-0005-0006.sql

# Status
npx wrangler d1 migrations list lifeflow360-prod --remote

# Apply
npx wrangler d1 migrations apply lifeflow360-prod --remote

# Verifikation
npx wrangler d1 execute lifeflow360-prod --remote --command "SELECT COUNT(*) FROM checkout_intents"
npx wrangler d1 execute lifeflow360-prod --remote --command "PRAGMA table_info(magic_login_tokens)"
```

**Beide Migrationen sind additiv** (neue Tabelle + nullable Spalte) → kein Datenverlust-Risiko. Backup trotzdem als Best Practice.

### 4.2 — Production-Safety-Check (Cloudflare-Pages-Vars)

Checkliste — diese Vars dürfen in Production **nicht** gesetzt sein:

- ❌ `DEV_MAGIC_LINK_DEBUG`
- ❌ `INSECURE_COOKIES`
- ❌ `PUBLIC_API_BASE_URL` (Astro)

Diese Vars **müssen** gesetzt sein und korrekt:

- ✅ `COOKIE_DOMAIN=.lifeflow360.app`
- ✅ `ALLOWED_ORIGINS=https://www.lifeflow360.app`
- ✅ `PADDLE_ENV=live` (wenn Live-Schaltung) bzw. `sandbox` (vorher)
- ✅ `PADDLE_PRICE_MONTHLY` / `PADDLE_PRICE_HALFYEAR` / `PADDLE_PRICE_YEARLY` (Live-Pricing-IDs)
- ✅ Secrets: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `APP_SESSION_SECRET`, `MAGIC_LINK_SECRET`, `RESEND_API_KEY`
- ✅ Astro `.env.local` ist NICHT in dist/ deployed (Astro-Build-Verhalten verifizieren)

`dev-login.ts`-Endpoint ist durch Dual-Flag-Guard (`DEV_MAGIC_LINK_DEBUG === '1' && INSECURE_COOKIES === '1'`) → 404 in Production. **Trotzdem** vor Deploy doppelt prüfen.

### 4.3 — Paddle-Sandbox vorbereiten

| Schritt | Wo |
|---|---|
| Webhook-Destination angelegt mit `https://api.lifeflow360.app/api/paddle/webhook` | Sandbox-Dashboard → Notifications |
| Signing Key kopiert in `PADDLE_WEBHOOK_SECRET` (Cloudflare Pages Secret) | Pages-Dashboard |
| Events abonniert: `subscription.{created,updated,activated,canceled,past_due,paused,resumed,trialing}`, `transaction.{paid,payment_failed,canceled}`, `adjustment.{created,updated}` | Sandbox-Dashboard |
| „Send test event" → Webhook-Endpoint antwortet 200, `webhook_events` zeigt neuen Eintrag mit `processed_at != NULL` | Diagnose |

### 4.4 — Paddle-Dashboard-Settings

| Setting | Soll-Wert |
|---|---|
| Settings → Checkout → Marketing consent | **deaktiviert** (eigene Newsletter-Checkbox im Frontend) |
| Settings → Business profile → Display name | „LifeFlow360" (statt Personenname „Dirk Triltsch") |
| Settings → Checkout → Payments | Karte ✓, SEPA ✓, PayPal ✓ |
| Settings → Checkout → Default currency | EUR |
| Customer Portal aktiviert | ✓ |

Details: [Memory `project_paddle_dashboard_settings_todo`](memory/project_paddle_dashboard_settings_todo.md)

### 4.5 — Access-Policy: Variante 1 + Legal-Texte

**Variante 1 ist entschieden:** Pro startet sofort, mit/ohne Widerrufsverzicht. Bei Widerruf binnen 14 Tagen → anteilige Erstattung via Paddle-Refund → `handleRefund` im Webhook degradiert Entitlement.

**Kein Code-Change nötig** — `webhook.ts:handleRefund` ([Z. 297](functions/api/paddle/webhook.ts)) ist bereits aktiv.

**Legal-Texte müssen aktualisiert werden** an drei Stellen (EU-Verbraucherrecht für digitale Dienste verlangt vorherige Zustimmung + Anerkennung des Rechtsverlusts; AGB-Klausel allein reicht nicht):

1. **AGB** — Klausel zu sofortigem Pro-Zugang + anteiliger Erstattung bei Widerruf
2. **Checkout-Hinweis** — bereits drin: „Ohne diese Zustimmung bleibt dein 14-tägiges Widerrufsrecht bestehen." Sollte ergänzt werden um: „Bei Widerruf binnen 14 Tagen erstatten wir den anteiligen Betrag."
3. **Bestellbestätigungs-Mail** — Widerrufsbelehrung als PDF im Anhang oder als Link

**Memory:** [project_access_policy_after_purchase](memory/project_access_policy_after_purchase.md)

### 4.6 — Doku-Update ✅ (DIESES Dokument)

### 4.7 — E2E-Tests T1–T15 (manuell mit Sandbox)

| # | Szenario | Erwartet |
|---|---|---|
| T1 | `/signup` mit allen Pflicht-Checks → Magic-Link → Klick | User angelegt, Trial-Entitlement aktiv, `consent_log` mit `context='free_signup'`, `next_url` falls gesetzt |
| T2 | `/signup` ohne AGB | Button disabled |
| T3 | `/signup` mit Newsletter=true | `consent_log.newsletter_opt_in=1` |
| T4 | `/signup` Token nicht geklickt | kein User, kein consent_log (pending am Token) |
| T5 | Pricing → anonym Pro-Klick | Redirect zu `/signup?next=/checkout/{plan}.html` |
| T6 | `/checkout/yearly` eingeloggt + Email gleich | Wizard Step 1 → 2, Paddle lädt nach Submit-Klick, Sandbox-Kauf ok, Webhook + `consent_log` |
| T7 | `/checkout/yearly` eingeloggt + Email ändern | Banner, CTA off, Paddle entladen |
| T8 | `/checkout/yearly` Free/Trial-User | Checkout erlaubt |
| T9 | `/checkout/yearly` aktive paid Sub | `action=manage_subscription` → Customer Portal |
| T10 | Sandbox-Kauf `4000 0566 5566 5556` / CVC `100` | Webhook fires, Entitlement = pro/subscription, `consent_log` mit paddle_subscription_id, `checkout_intents.consumed_at` gesetzt |
| T11 | Webhook 2× mit gleicher event_id | nur einmal verarbeitet (idempotent via `webhook_events`) |
| T12 | Webhook ohne customData.intent_id | Fallback auf `customer.email`, Warning im Log |
| T13 | Webhook mit `customData.checkout_email != intent.checkout_email` | Webhook lehnt ab (Manipulationsschutz), Warning im Log |
| T14 | Widerruf-Checkbox aus | Kauf erlaubt, `consent.withdrawal_waiver=false`, Legal-Hinweis sichtbar |
| T15 | Trial nach 14 Tagen → `/api/me` | Entitlement degradiert zu `free/trial_expired` |
| T16 | Sandbox-Refund über Paddle-Dashboard | `adjustment.created` → `handleRefund` → Entitlement `pro/refund_revoked`, valid_until=now |
| T17 | Sandbox-Karte declined (`4000 0000 0000 0002`) | Paddle zeigt Fehler, kein Webhook, keine DB-Änderung |
| T18 | App-Flow: Magic-Link mit `next_url=/checkout/yearly.html` | App liest `nextUrl` aus verify-link-Response, redirected dorthin |

### 4.8 — App-Frontend `nextUrl`-Redirect

**Pflicht-Punkt** (Reviewer hat zurecht aus „optional" gemacht):

Nach erfolgreichem `POST /api/auth/verify-link` enthält die Response `nextUrl: string | null`. Wenn gesetzt **und** der Wert auf der Whitelist ist (`/checkout/{plan}.html`), muss die App den User dorthin redirecten — nicht zur Default-App-Page.

Code-Stelle: App-Repo, Magic-Link-Token-Handler (vermutlich `src/auth/handleMagicLink.ts` o.ä.).

```ts
const res = await fetch(apiBase + '/api/auth/verify-link', { ... });
const data = await res.json();
if (data.ok && data.nextUrl) {
  window.location.replace(data.nextUrl);
} else if (data.ok) {
  window.location.replace('/app/');
}
```

---

## File-Inventory

### Migrations
- `migrations/0001_init.sql` — initial Schema (users, subscriptions, entitlements, sessions, ...)
- `migrations/0002_consent_log.sql`
- `migrations/0003_magic_link_consent.sql`
- `migrations/0004_consent_log_client_timestamp.sql`
- `migrations/0005_checkout_intents.sql`
- `migrations/0006_magic_link_next_url.sql`

### Backend (Cloudflare Pages Functions)
- `functions/_middleware.ts` — CORS
- `functions/_lib/db.ts` — DB-Helper inkl. `grantTrialEntitlementIfMissing`, `insertConsentLog`, `createCheckoutIntent`, `markCheckoutIntentConsumed`, `degradeExpiredTrial`
- `functions/_lib/cookies.ts` — Session-Cookie (mit `INSECURE_COOKIES`-Override für Dev)
- `functions/api/me.ts` — `/api/me` mit Lazy-Trial
- `functions/api/auth/request-link.ts` — Free-Signup (Consent + access_intent + next_url + dev-token)
- `functions/api/auth/verify-link.ts` — Magic-Link-Verify (Trial + consent_log + Kompensation + nextUrl)
- `functions/api/auth/dev-login.ts` — **LOCAL-DEV-ONLY** (Dual-Flag-Guard)
- `functions/api/auth/logout.ts`
- `functions/api/billing/checkout-intent.ts` — Pre-Check + Server-Intent
- `functions/api/billing/post-checkout.ts` — Bestätigung + Magic-Link best-effort
- `functions/api/billing/portal.ts` — Customer-Portal-Redirect
- `functions/api/paddle/webhook.ts` — Identitätsregel + consent_log + Intent-Validierung

### Frontend (Astro)
- `website-astro/src/brands/lifeplus/pages/pricing.astro`
- `website-astro/src/brands/lifeplus/pages/signup.astro`
- `website-astro/src/brands/lifeplus/pages/checkout/[plan].astro`
- `website-astro/src/shared/components/sections/PricingPageDefault.astro` — mit Phase-3.6 Anonym-Optimierung
- `website-astro/src/shared/components/sections/SignupPage.astro` — Resend-Button + next-Hint
- `website-astro/src/shared/components/sections/CheckoutPage.astro` — Wizard 2 Steps + Success-View
- `website-astro/src/shared/scripts/signupInline.ts`
- `website-astro/src/shared/scripts/checkoutInline.ts`

### Config
- `wrangler.toml` — D1, KV, Vars (kein Dev-Flag, keine Test-Vars)
- `.dev.vars` — **lokal only**, gitignored
- `website-astro/.env.local` — `PUBLIC_API_BASE_URL=` leer (Vite-Proxy)
- `website-astro/astro.config.mjs` — Vite-Proxy `/api/*` → `localhost:8788`

---

## Risiken & offene Punkte (aktualisiert)

| Risiko | Mitigation | Status |
|---|---|---|
| Beta-Grace-Bestandsuser | Bei Bedarf löschen + neue Trial. Kein Migrations-Pfad. | abgeschlossen |
| `magic_login_tokens.access_intent` für Bestands-Tokens NULL | OK, verfallen in 15 Min | abgeschlossen |
| Webhook + post-checkout Race | post-checkout schreibt KEIN Entitlement; Webhook authoritative | abgeschlossen |
| Email-Mismatch-UX | Banner + Hint, Wizard erlaubt einfaches Korrigieren in Step 1 | abgeschlossen |
| Newsletter-Empfänger-Sync (Konzept C) | `consent_log WHERE newsletter_opt_in=1` als Quelle für externen Service | später |
| Buttons-Beschriftung bei First-Time-Pro ohne Trial | Memory zur Erinnerung, Code-Anpassung wenn der Fall auftritt | offen für später |
| Webhook ohne Intent (Bestands-Subs, Edge-Cases) | Fallback auf customer.email, Warning im Log | abgeschlossen |
| `dev-login.ts` versehentlich in Prod aktiv | Dual-Flag-Guard `DEV_MAGIC_LINK_DEBUG && INSECURE_COOKIES`; Code-Review vor Deploy | abgeschlossen |
| Remote-Migration ohne Backup | Phase 4.1 erzwingt `wrangler d1 export` vor Apply | im Plan |
| App-`nextUrl`-Redirect fehlt | Phase 4.8 als Pflicht-Punkt | offen |
| Legal-Texte zu Variante 1 nicht in AGB + Bestätigungs-Mail | Phase 4.5 vor Live-Gang | offen |
