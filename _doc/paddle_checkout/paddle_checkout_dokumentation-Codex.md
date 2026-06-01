# Checkout- und Consent-Flow fuer LifePlus 360

**Konzeptstand:** 2026-06-01  
**Status:** Konzept / Prototypen, keine Produktiv-Implementierung

Diese Doku beschreibt den gewuenschten User-Flow fuer Free- und Pro-User.
Grundannahme: Es gibt keinen Gast-User. Jeder Flow startet mit einem bekannten
Konto und einer bekannten Konto-E-Mail. Die E-Mail wird im Checkout angezeigt,
aber nicht erneut abgefragt.

---

## 1. Grundregeln

- **Kein Gast-User:** User sind vor Free-Start oder Pro-Kauf angemeldet oder
  werden vorher in einen Login-/Konto-Flow gefuehrt.
- **Keine E-Mail-Dopplung:** Die Checkout-/Consent-Interfaces zeigen die
  Konto-E-Mail read-only an. Der User gibt sie in diesen Schritten nicht erneut
  ein.
- **Free-Consent:** Free-User bestaetigen AGB und Datenschutz.
- **Pro-Consent:** Pro-User bestaetigen AGB, Datenschutz und
  Widerrufsverzicht/Sofortbeginn direkt vor dem kostenpflichtigen Checkout.
- **Payment Source of Truth:** Paddle ist fuer Zahlung, Subscription und
  Rechnungsstellung zustaendig. Die App ist fuer Konto, Entitlements und
  Consent-Logs zustaendig.

| User-Typ | Zugang | Pflicht-Zustimmungen | E-Mail-Eingabe im Flow |
|---|---|---|---|
| Free im 14-Tage-Trial | Pro-Funktionen bis Trial-Ende | AGB + Datenschutz | 0x, Konto-E-Mail wird angezeigt |
| Free nach Trial | Eingeschraenkter Free-Zugang | AGB + Datenschutz, falls noch nicht protokolliert | 0x, Konto-E-Mail wird angezeigt |
| Pro | Bezahlter Vollzugang | AGB + Datenschutz + Widerrufsverzicht | 0x, Konto-E-Mail wird an Paddle uebergeben |

> Ziel: Der User gibt seine E-Mail-Adresse im Checkout nicht erneut ein.
> Die E-Mail ist Kontodatenbestandteil und wird nur als nicht editierbare
> Orientierung angezeigt.

---

## 2. Einstiegspunkte

| Ausgangssituation | Klick | Was sieht der User? | Naechster Zustand |
|---|---|---|---|
| Angemeldet, Free-Consent fehlt | App oeffnen oder Free starten | `lifeplus_signup_free_Codex.html`: Konto-E-Mail, AGB, Datenschutz | Free-Trial startet oder bestehender Free-Zugang wird freigeschaltet |
| Free im Trial | Pro starten | `lifeplus_checkout_paddle_Claude.html`: Plan, Konto-E-Mail, Paddle, drei Checkboxen | Bezahltes Pro nach erfolgreichem Paddle-Webhook |
| Free nach Trial | Pro starten | `lifeplus_checkout_paddle_Claude.html`: Plan, Konto-E-Mail, Paddle, drei Checkboxen | Bezahltes Pro nach erfolgreichem Paddle-Webhook |
| Pro | Abo verwalten | Redirect ins Paddle Customer Portal | Pro bleibt Pro, Aboverwaltung bei Paddle |
| Pro | Pro starten | Kein Checkout, Hinweis: "Du hast bereits Pro" | Optional Link zum Customer Portal |

---

## 3. Flow: Free-User im 14-Tage-Trial

```text
User ist angemeldet
        |
        v
App prueft: AGB + Datenschutz bereits bestaetigt?
        |
        +-- nein --> Free-Consent-Interface anzeigen
        |             - Konto-E-Mail nur anzeigen
        |             - Checkbox: AGB akzeptieren
        |             - Checkbox: Datenschutz gelesen
        |             - Button aktiv erst nach beiden Haken
        |             - POST /api/consent/free
        |
        +-- ja ----> Trial-Pro-Zugang oeffnen
                      - Banner: "Trial laeuft noch X Tage"
                      - CTA: "Auf Pro upgraden"
```

Wichtig: Der Widerrufsverzicht gehoert nicht in den Free-Flow, weil noch kein
kostenpflichtiger Vertrag abgeschlossen wird.

---

## 4. Flow: Free-User nach Trial

```text
User ist angemeldet
        |
        v
App erkennt: Trial abgelaufen, access_level = free
        |
        v
Free-Paywall / eingeschraenkte App
        |
        +-- "Free weiter nutzen" --> eingeschraenkte Funktionen
        |
        +-- "Pro starten" -------> Pro-Checkout-Interface
                                   - Konto-E-Mail anzeigen
                                   - Plan anzeigen
                                   - Paddle Zahlungsfeld anzeigen
                                   - AGB + Datenschutz + Widerruf bestaetigen
                                   - kostenpflichtigen Checkout abschliessen
```

---

## 5. Flow: Pro-Kauf aus Free heraus

```text
Free-User klickt "Pro starten"
        |
        v
GET/POST /api/billing/checkout-intent
        |
        +-- aktive bezahlte Subscription --> kein Checkout, Customer Portal anbieten
        |
        +-- Free/Trial-User --------------> Checkout erlauben
        |
        v
Pro-Checkout-Interface
        |
        v
User bestaetigt alle drei Pflichtpunkte:
  [x] AGB
  [x] Datenschutz
  [x] Sofortbeginn + Widerrufsverzicht
        |
        v
Paddle.Checkout.open({
  customer.email = account.email,
  customData = brand_id, user_id, consent_version, consent_timestamp
})
        |
        v
Paddle Webhook subscription.created / subscription.updated
        |
        v
Subscription speichern, Entitlement auf Pro setzen, Consent-Log speichern
```

**Korrektur gegenueber dem alten Stand:** Ein aktives Free- oder
Trial-Entitlement darf den Pro-Checkout nicht blockieren. Blockieren darf nur
eine aktive bezahlte Subscription.

---

## 6. Interfaces

### 6.1 Free-Consent

Datei: `lifeplus_signup_free_Codex.html`

```text
+------------------------------------------------+
| Kostenlosen Zugang aktivieren                  |
|                                                |
| Konto: belinda@example.com                     |
|                                                |
| [ ] Ich akzeptiere die AGB.                    |
| [ ] Ich habe die Datenschutzerklaerung gelesen.|
|                                                |
| [ Free-Zugang aktivieren ] (disabled)          |
|                                                |
| Keine Zahlung. Kein Widerrufsverzicht.         |
| Keine E-Mail-Eingabe.                          |
+------------------------------------------------+
```

### 6.2 Free nach Trial

```text
+------------------------------------------------+
| Dein Trial ist abgelaufen                      |
|                                                |
| Aktueller Plan: Free                           |
|                                                |
| [ Pro starten ]                                |
|                                                |
| Oeffnet den Pro-Checkout.                      |
| Konto-E-Mail bleibt gleich.                    |
+------------------------------------------------+
```

### 6.3 Pro-Checkout

Datei: `lifeplus_checkout_paddle_Claude.html`

```text
+------------------------------------------------+
| LifePlus 360 Pro                               |
|                                                |
| Konto: belinda@example.com                     |
|                                                |
| [ Paddle Zahlungsfeld ]                        |
|                                                |
| [ ] AGB akzeptieren                            |
| [ ] Datenschutz gelesen                        |
| [ ] Sofortbeginn + Widerrufsverzicht           |
|                                                |
| [ Jetzt kostenpflichtig bestellen ] (disabled) |
+------------------------------------------------+
```

### 6.4 Pro vorhanden

```text
+------------------------------------------------+
| Du hast bereits Pro                            |
|                                                |
| Status: aktiv bis 01.06.2027                   |
|                                                |
| [ Abo bei Paddle verwalten ]                   |
|                                                |
| Kein zweiter Checkout fuer dieselbe            |
| aktive Subscription.                           |
+------------------------------------------------+
```

---

## 7. Consent-Daten

| Flow | Daten | Persistenz |
|---|---|---|
| Free-Consent | `user_id`, `brand_id`, `accepted_agb`, `accepted_privacy`, `timestamp`, `document_versions` | Eigene DB, z.B. `consent_log` |
| Pro-Checkout | Free-Daten plus `accepted_withdrawal_waiver`, `price_id`, `paddle_transaction_id` / `subscription_id` | Paddle `customData` + eigene DB im Webhook |

```json
{
  "brand_id": "lifeplus",
  "user_id": "usr_...",
  "checkout_email": "belinda@example.com",
  "consent": {
    "agb": true,
    "privacy": true,
    "withdrawal_waiver": true,
    "version": "2026-06-01",
    "timestamp": "2026-06-01T09:30:00.000Z"
  }
}
```

---

## 8. Dateien in diesem Konzept

| Datei | Rolle |
|---|---|
| `paddle_checkout_dokumentation-Codex.md` | Fuehrende Flow-Doku ohne Gast-User. |
| `lifeplus_signup_free_Codex.html` | Codex-Mockup fuer angemeldete Free-/Trial-User: AGB + Datenschutz. |
| `lifeplus_checkout_paddle_Codex.html` | Codex-Mockup fuer Pro-Checkout: Konto-Anzeige, Paddle-Feld, AGB + Datenschutz + optional Newsletter + Widerrufsverzicht als Pflicht. |
| `lifeplus_checkout_paddle_Claude.html` | Pro-Checkout-Prototyp: Konto-Anzeige statt E-Mail-Feld, Paddle-Feld, AGB + Datenschutz + Widerrufsverzicht als Pflicht. |
| `lifeplus_signup_free.html` | Alter Signup-Prototyp mit E-Mail-Feld; passt nicht mehr zur Praemisse "kein Gast-User". |
| `lifeplus_checkout_paddle.html` | Alter Pro-Checkout-Prototyp; passt nicht mehr vollstaendig zum neuen Flow. |

---

## 9. Technischer Ist-Stand

Aktueller Produktivcode, der fuer die Umsetzung relevant ist:

| Bereich | Datei | Aktueller Stand | Luecke zum Ziel-Flow |
|---|---|---|---|
| Pricing-Checkout | `website-astro/src/shared/scripts/paddleCheckout.ts` | Fragt bei Free und Pro per Browser-Prompt nach E-Mail, ruft dann Paddle Overlay auf. | Kein Gast-User-Ziel wird verletzt; eingeloggte User sollten keine E-Mail erneut eingeben. |
| Preflight | `functions/api/billing/checkout-intent.ts` | Validiert `priceId`, liest Session oder Body-E-Mail, blockt bei aktivem Entitlement. | Free-/Trial-Entitlements duerfen Pro-Checkout nicht blockieren; nur aktive bezahlte Subscriptions. |
| Paddle Open | `Paddle.Checkout.open()` im Frontend | Uebergibt `items`, `customer.email`, `customData`, Overlay-Settings. | Fuer bekannten User sollte `customer.email = account.email` kommen, optional `allowLogout: false`; Consent-Daten fehlen noch vollstaendig. |
| Webhook | `functions/api/paddle/webhook.ts` | Verifiziert Signatur, speichert `webhook_events`, upsertet `subscriptions`, setzt `entitlements`. | Consent-Log, Newsletter-Opt-in und robustes User-Mapping per `user_id` fehlen. |
| Datenbank | `migrations/0001_init.sql` | Tabellen: `users`, `subscriptions`, `entitlements`, `devices`, `sessions`, `magic_login_tokens`, `webhook_events`. | Es fehlen Tabellen fuer `consent_log` und optional `marketing_preferences`. |

Paddle-relevante Punkte aus den offiziellen Docs:

- `Paddle.Checkout.open()` kann `items`, `customer.email`, `settings` und
  `customData` entgegennehmen. `customData` landet auf der erzeugten
  Transaction und ist damit fuer Webhooks geeignet.
- Inline Checkout braucht `displayMode: "inline"`, `frameTarget`,
  ausreichend Breite und eine sichtbare Merchant-of-Record-Footerzeile.
- Fuer bekannte Kunden empfiehlt sich, die E-Mail im Checkout nicht wechselbar
  zu machen, z.B. ueber `allowLogout: false` in den Checkout-Settings.
- Webhook-Events wie `subscription.created`, `subscription.updated` und
  `transaction.paid` bleiben die Quelle fuer bezahlte Aktivierung.

Quellen:

- Paddle Checkout open: https://developer.paddle.com/paddle-js/methods/paddle-checkout-open/
- Paddle Checkout settings: https://developer.paddle.com/build/checkout/set-up-checkout-default-settings/
- Paddle customData: https://developer.paddle.com/build/transactions/custom-data/
- Paddle subscription.created webhook: https://developer.paddle.com/webhooks/subscriptions/subscription-created/
- Paddle transaction.paid webhook: https://developer.paddle.com/webhooks/transactions/transaction-paid/

---

## 10. Umsetzungskonzepte

### Konzept A: Minimaler Umbau, Paddle Overlay bleibt

Der bestehende Pricing-Flow bleibt weitgehend erhalten, aber die Prompts werden
entfernt. Voraussetzung ist eine Session.

```text
Pricing/Paywall -> /api/me -> account.email bekannt
        |
        v
User klickt Pro
        |
        v
Consent-Modal in eigener UI: AGB + Datenschutz + Newsletter optional + Widerruf
        |
        v
/api/billing/checkout-intent { priceId }
        |
        v
Paddle.Checkout.open({ customer.email: account.email, customData })
        |
        v
Webhook setzt Subscription + Entitlement + Consent-Log
```

Vorteile: schnellste Umsetzung, wenig UI-Neubau.  
Nachteil: Paddle Overlay fuehlt sich weniger integriert an als die Mockups.

### Konzept B: Eigene Checkout-Seite mit Inline Paddle

Free-/Trial-User werden von Pricing oder Paywall auf eine eigene Pro-Checkout-
Seite geleitet. Diese Seite zeigt Konto, Plan, Consent und Paddle inline.

```text
Paywall/Pricing -> /checkout/pro?plan=yearly
        |
        v
Server/Client laedt Session + Plan
        |
        v
Inline Checkout Seite
        |
        v
Paddle inline iframe + Consent UI + CTA
        |
        v
Webhook aktiviert Pro
```

Vorteile: beste UX-Kontrolle, passt zu `lifeplus_checkout_paddle_Codex.html`.  
Nachteil: mehr Frontend-Arbeit und saubere Inline-Paddle-Lifecycle-Logik noetig.

### Konzept C: Serverseitig erzeugte Paddle Transaction

Der Server erzeugt vor dem Checkout eine Paddle Transaction mit `custom_data`.
Das Frontend oeffnet danach Paddle mit `transactionId`.

```text
User bestaetigt Consent
        |
        v
POST /api/billing/checkout-session
  - prueft Session
  - prueft aktive paid Subscription
  - speichert pending consent
  - erzeugt Paddle Transaction mit custom_data
        |
        v
Frontend: Paddle.Checkout.open({ transactionId })
        |
        v
Webhook matched transaction/subscription und finalisiert
```

Vorteile: staerkste serverseitige Kontrolle, weniger manipulierbare Client-
Daten, gutes Audit.  
Nachteil: mehr Paddle-API-Aufwand und ein `pending_checkout`/`checkout_sessions`
Modell ist sinnvoll.

Empfehlung: Konzept B fuer UX, kombiniert mit Elementen aus Konzept C fuer
Audit und Manipulationsschutz, sobald der einfache Flow stabil ist.

---

## 11. Daten: Wo wird was gespeichert?

| Daten | Quelle | Speicherung | Zweck |
|---|---|---|---|
| `user_id`, `email`, `email_lower` | App/Auth | `users` | Kontoidentitaet, Checkout-E-Mail aus Session ableiten |
| Session/Device | Magic-Link/Login | `sessions`, `devices` | Kein Gast-User; Checkout nur mit bekannter Session |
| Free-Consent AGB/Datenschutz | App-UI | neue Tabelle `consent_log` | Nachweis fuer Free-/Trial-Nutzung |
| Newsletter Opt-in | App-UI | neue Tabelle `marketing_preferences` oder `consent_log` mit Typ `newsletter` | Marketing-Einwilligung getrennt von Pflicht-Consent |
| Pro-Consent AGB/Datenschutz/Widerruf | App-UI vor Paddle | `consent_log` und Paddle `customData` | Rechtlicher Nachweis fuer kostenpflichtigen Sofortbeginn |
| Paddle Customer/Subscription/Transaction IDs | Paddle Webhooks | `subscriptions`, ggf. `webhook_events.payload_json` | Billing-Status, Customer Portal, Audit |
| Aktiver Zugang | Webhook / App-Logik | `entitlements` | App entscheidet Free/Trial/Pro |
| Raw Webhook Payload | Paddle Webhook | `webhook_events` | Idempotenz, Debugging, Audit |

Vorschlag fuer neue Tabellen:

```sql
CREATE TABLE consent_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  context TEXT NOT NULL, -- free_signup | pro_checkout
  accepted_agb INTEGER NOT NULL,
  accepted_privacy INTEGER NOT NULL,
  accepted_withdrawal_waiver INTEGER NOT NULL DEFAULT 0,
  newsletter_opt_in INTEGER NOT NULL DEFAULT 0,
  document_version TEXT NOT NULL,
  paddle_transaction_id TEXT,
  paddle_subscription_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE marketing_preferences (
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  newsletter_opt_in INTEGER NOT NULL,
  source TEXT NOT NULL, -- free_signup | pro_checkout | account
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, brand_id)
);
```

---

## 12. Noch zu klaeren

- Wo wird `POST /api/consent/free` umgesetzt und wie heisst die Tabelle fuer
  Consent-Logs?
- Wird der Pro-Checkout als eigene Seite, Modal oder eingebetteter Abschnitt in
  der Pricing-/Paywall-Seite umgesetzt?
- Soll Paddle inline sichtbar sein oder erst nach bestaetigten Checkboxen
  eingeblendet werden?
- Soll das Customer Portal direkt aus der App oder auch von der Pricing-Seite
  erreichbar sein?
