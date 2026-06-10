# Go-Live Content/Legal Checkliste

**Stand:** 2026-06-10 (Datei-Mtime); inhaltlicher Stand 2026-06-09
**Status:** fuehrende Go-Live-/Legal-/Content-Checkliste, aktiv vor LifeFlow360-Launch
**Scope:** LifeFlow360/LifePlus als Go-Live-Fokus; FitFlow360 und EqoFlow360 bleiben Preview/Staging, bis eigene Domain-, API- und Paddle-Setups existieren.
**Quellen:** aktueller Code, [`legal-review-2026-06-03.md`](legal-review-2026-06-03.md), [`../paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](../paddle_checkout/checkout-billing-runbook-b2b-v6-1.md).

## 1. Pflicht vor LifeFlow360-Live

- [ ] Anwaltliche Freigabe fuer AGB, Widerruf, Datenschutz und Impressum.
- [ ] Steuer-/USt-Status klaeren und `contact.vatId` beziehungsweise Kleinunternehmer-Hinweise korrekt setzen.
- [ ] Paddle Production/KYC abschliessen und echte `clientToken`/`priceId*` in `website-astro/src/brands/lifeplus/brand.yaml` eintragen.
- [ ] D1-Migrationsstatus fuer lokal, Preview/Sandbox und Production gegen `0001` bis `0009` verifizieren.
- [ ] Sandbox-Smoke fuer B2B-v6.1 Gast-Checkout dokumentiert ausfuehren.
- [ ] App-Redirect nach `post-checkout` und anschliessendes Webhook-Entitlement testen.
- [ ] Account-/Abo-Verwaltung testen: Paddle-Portal-Links, direkte Abo-Kuendigung, Kuendigungs-Ruecknahme und Webhook-Synchronisierung.
- [ ] Anti-Abuse als Go-Live-Pflicht umsetzen: Limits fuer Checkout-/Pricing-/Portal-Endpunkte gemaess Abschnitt 5 definieren, implementieren und testen.

## 2. Content- und Wording-Pruefung

- [x] Feature-/Pricing-Wording zu "drei Simulationsmodelle" auf Reality-Strategien/Personenbaum aktualisieren.
- [ ] B2B-Header-Banner auf Pricing und Checkout sichtbar pruefen.
- [ ] Netto-/USt-/Reverse-Charge-Hinweise auf Pricing und Checkout konsistent pruefen.
- [ ] AGB/Widerruf: Pro-B2B-only und Free-Fuer-alle konsistent pruefen.
- [ ] Datenschutz: Magic-Link, Session, Paddle, Resend, Cloudflare, IONOS und Newsletter final pruefen.
- [ ] Impressum: Anbieter-, USt- und Verantwortlichkeitsdaten final pruefen.
- [x] Free-Login-UX ist im aktuellen Astro/Auth-Flow vorhanden; vor Go-Live nur noch Smoke-Test noetig.

## 3. Brand-Status

| Brand | Status | Go-Live-Bedingung |
|---|---|---|
| LifeFlow360 | Go-Live-Fokus | echte Paddle-Werte, D1-Status, Legal/Tax-Freigabe, Smoke bestanden |
| FitFlow360 | Preview/Staging | eigene Domain/API/Paddle-Werte und Legal-/Brand-Check |
| EqoFlow360 | Preview/Staging | eigene Domain/API/Paddle-Werte und Legal-/Brand-Check |

## 4. Nicht per Code loesbar

- [ ] Anwaltliche Bewertung B2B-Auszeichnung nach BGH-Rechtsprechung.
- [ ] Steuerberater-Klaerung USt/Kleinunternehmer/Reverse-Charge.
- [ ] Paddle KYC und Production-Aktivierung.
- [ ] Brand-Rollout FitLine/Eqology entscheiden.

## 5. Anti-Abuse vor Go-Live

Entscheidung R8: Anti-Abuse ist Pflicht vor dem LifeFlow360-Go-Live.

Aktueller Code-Stand:

| Bereich | Endpunkt(e) | Ist-Stand | Go-Live-Anforderung |
|---|---|---|---|
| Magic-Link anfordern | `POST /api/auth/request-link` | IP-Limit `5/10min`, E-Mail-Limit `3/30min` vorhanden | Beibehalten und Smoke-Test fuer Rate-Limit-Fehler durchfuehren |
| Magic-Link verifizieren | `/api/auth/verify-link` | IP-Limit `10/10min` vorhanden | Beibehalten und Smoke-Test fuer ungueltige/abgelaufene Tokens |
| Paddle-Preisvorschau | `POST /api/billing/preview-pricing` | IP-Limit `30/5min` vorhanden | Limit bestaetigen oder niedriger setzen; Rabatt-/VAT-Bruteforce pruefen |
| Checkout abschliessen | `POST /api/billing/post-checkout` | IP-Limit `10/10min` vorhanden | Beibehalten; Fehlerfaelle ohne Entitlement pruefen |
| Checkout-Intent / Paddle-Transaction | `POST /api/billing/checkout-intent` | Noch kein dokumentiertes Rate-Limit gefunden | Pflicht: IP- und E-Mail-/Plan-Limit einfuehren, damit nicht massenhaft Paddle-Transactions erzeugt werden koennen |
| Checkout-Intent abbrechen | `POST /api/billing/cancel-checkout-intent` | Kein eigener Go-Live-Befund | Zusammen mit Checkout-Intent pruefen; nur valide Intent-/Transaction-Paare akzeptieren |
| Paddle-Portal | `POST /api/billing/portal` | Authentifiziert, kein dokumentiertes Rate-Limit gefunden | Pflicht: User-/IP-Limit fuer Portal-Session-Erzeugung definieren |
| Abo kuendigen / Kuendigung rueckgaengig | `POST /api/account/cancel-subscription` | Authentifiziert, Paddle-API-Call | Pflicht: User-/IP-Limit oder Idempotenz-/Cooldown-Regel definieren |

Offene Umsetzungspunkte:

- [ ] Konkrete Grenzwerte fuer `checkout-intent`, `portal` und `cancel-subscription` festlegen.
- [ ] Rate-Limits im Code ergaenzen oder vorhandene Schutzlogik dokumentiert begruenden.
- [ ] API-Smoke-Test fuer Rate-Limit-Faelle ergaenzen oder manuell dokumentieren.
- [ ] Fehlertexte im Frontend pruefen: Rate-Limit soll verstaendlich und nicht wie ein Zahlungsfehler wirken.
