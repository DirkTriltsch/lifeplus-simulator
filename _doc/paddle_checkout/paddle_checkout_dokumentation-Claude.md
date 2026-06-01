# Paddle Checkout Integration — LifePlus 360

**Zweck:** Dokumentation aller Checkout-/Signup-Interfaces der LifePlus-Brand  
**Stand:** 2026-06-01  
**Scope:** Paddle Billing v2 · Inline Checkout · Free-Signup · 3 User-Typen · LifePlus-Branding

---

## 1. Übersicht & Flow

### 1.1 Drei User-Typen

| Typ | DB-Zustand | Zugang | Consent-Pflicht |
|---|---|---|---|
| **A: Free-in-Trial** | `access_level='pro'`, `source='trial'`, `valid_until=signup+14d` | voller Pro-Zugang während Trial | AGB + DSE (beim Signup) |
| **B: Free-post-Trial** | `access_level='free'`, `source='free_signup'`, `valid_until=NULL` | eingeschränkter Free-Zugang | bereits beim Signup gegeben |
| **C: Pro** | `access_level='pro'`, `source='subscription'`, `valid_until=period_end` | voller Zugang | AGB + DSE + Widerruf (beim Pro-Kauf) |

> Anmerkung: „Es gibt keinen Gast-User" — in der DB hat jeder einen Account.
> Der erste Touch (Pricing → Checkout) passiert unangemeldet; beim Pro-Kauf
> legt der Webhook (`upsertUserByEmail`) den Account automatisch an.

### 1.2 Drei Web-Interfaces

| Interface | Datei (Prototyp) | Zielgruppe | Felder |
|---|---|---|---|
| **`/signup`** | `lifeplus_signup_free_Claude.html` | unangemeldet → Typ A | Email, AGB, DSE |
| **`/checkout?priceId=...`** | `lifeplus_checkout_paddle_Claude.html` | unangemeldet / A / B → Typ C | Email, Paddle Inline, AGB, DSE, Widerruf |
| **`/app?manage=1`** | (kein Prototyp — Paddle-gehostet) | Typ C | – (Server-Redirect zum Paddle Customer-Portal) |

### 1.3 Pricing-CTA-Matrix

Welcher User landet bei welchem Klick wo?

| Status | „Kostenlos starten" | „Pro starten" |
|---|---|---|
| Unangemeldet | → `/signup` | → `/checkout?priceId=...` |
| A: Trial | → `/app` (Pro hat er schon) | → `/checkout?priceId=...` (Email vorbefüllt) |
| B: Post-Trial | → `/app` (Free hat er schon) | → `/checkout?priceId=...` (Email vorbefüllt) |
| C: Pro | → `/app` | → `/app?manage=1` |

### 1.4 Flow — Free-Signup

```
Unangemeldet auf /pricing → Klick "Kostenlos starten"
        │
        ▼
/signup zeigt:
  - E-Mail-Feld
  - ☐ AGB    ☐ Datenschutz
  - Button "Kostenlosen Zugang starten" (disabled bis alle ✓)
        │
        ▼
POST /api/auth/request-link
  { email, access: 'free', consent: { agb, dse, ts } }
        │
        ▼
"Schau in dein Postfach" → User klickt Magic-Link in Mail
        │
        ▼
Magic-Link-Login:
  - User anlegen falls neu
  - Entitlement: access_level='pro', source='trial', valid_until=now+14d
  - Session-Cookie setzen → Redirect /app
        │
        ▼  (nach 14 Tagen, per Cron oder lazy-Check)
Trial-Ende: Entitlement degradiert zu
  access_level='free', source='free_post_trial', valid_until=NULL
```

### 1.5 Flow — Pro-Checkout

```
Klick "Pro starten" auf /pricing
        │
        ▼
Server-Check (priceId + Session-Cookie):
  - C (Pro)        → /app?manage=1                 [Customer-Portal]
  - A (Trial)      → /checkout (Email vorbefüllt)
  - B (Post-Trial) → /checkout (Email vorbefüllt)
  - unangemeldet   → /checkout (Email-Feld leer)
        │
        ▼
/checkout zeigt:
  - Plan-Summary (Brand, Preis, Period)
  - E-Mail-Feld (vorbefüllt + read-only wenn login)
  - [Paddle Inline Iframe: Adresse, Karte/SEPA/PayPal]
  - ☐ AGB    ☐ Datenschutz    ☐ Widerrufsverzicht
  - Button "Jetzt kostenpflichtig bestellen" (disabled bis alle ✓)
        │
        ▼
Paddle.Checkout submit → checkout.completed
        │
        ▼
POST /api/billing/post-checkout (neu):
  - Session-Cookie setzen (Auto-Login auf gleichem Gerät)
  - Magic-Link parallel senden (Audit + andere Geräte)
  - Redirect /app
        │
        ▼ (parallel)
Paddle-Webhook subscription.created:
  - Account upsert (falls unangemeldeter Käufer)
  - Subscription anlegen
  - Entitlement: access_level='pro', source='subscription', valid_until=period_end
  - Consent in consent_log persistieren (custom_data)
```

---

## 2. Konfiguration — was du anpassen musst

Am Anfang des `<script>`-Blocks im HTML:

```javascript
const PADDLE_CONFIG = {
  token:   'live_xxxxxxxxxxxxxxxx',   // Paddle Dashboard → Developer → Authentication → Client-side token
  priceId: 'pri_xxxxxxxxxxxxxxxx',    // Paddle Dashboard → Catalog → Prices → Price ID
  sandbox: true                        // true  = Sandbox (Test)
                                       // false = Produktion (Live)
};
```

### Token finden
Paddle Dashboard → **Developer** → **Authentication** → **Client-side tokens**  
Sandbox-Token beginnt mit `test_`, Live-Token mit `live_`.

### Price ID finden
Paddle Dashboard → **Catalog** → **Prices** → gewünschten Preis öffnen → `pri_...`

### Sandbox vs. Produktion
- `sandbox: true` → `Paddle.Environment.set('sandbox')` wird aufgerufen
- `sandbox: false` → kein Aufruf, Paddle läuft automatisch live
- **Vor Go-Live** immer mit Sandbox testen (Testkarten: `4242 4242 4242 4242`)

---

## 3. Die drei Pflicht-Checkboxen

Alle drei müssen angehakt sein, bevor der Paddle-Checkout erscheint und der
Kauf-Button aktiv wird.

| ID | Label (kurz) | Rechtliche Funktion |
|---|---|---|
| `chk-agb` | AGB akzeptieren | Vertragsschluss-Voraussetzung |
| `chk-dse` | Datenschutz gelesen | DSGVO Art. 13 / Informationspflicht |
| `chk-widerruf` | Sofort-Aktivierung + Widerrufsverzicht | § 356 Abs. 5 BGB — Doppelzustimmung |

### Wichtig zur Widerruf-Checkbox (§ 356 Abs. 5 BGB)

Bei digitalen Dienstleistungen, die sofort starten, kann das 14-tägige
Widerrufsrecht erlöschen — **aber nur wenn**:

1. Der Verbraucher **ausdrücklich verlangt**, dass die Leistung vor Fristablauf beginnt, **und**
2. der Verbraucher **bestätigt**, dass er weiß, dass er sein Widerrufsrecht damit verliert.

Beides ist in einem Satz kombiniert (Doppelzustimmung). Fehlt eine der beiden
Komponenten, bleibt das Widerrufsrecht bestehen.

> **Hinweis:** Bei physischen Produkten (z.B. Nahrungsergänzungsmittel) gelten
> andere Regeln — hier gilt das Widerrufsrecht für Warenlieferungen (§ 312g BGB).
> Kläre mit einem Anwalt, ob dein Produkt als Ware oder digitale Dienstleistung
> einzustufen ist.

---

## 4. Paddle.js — technische Details

### Initialisierung

```javascript
// Sandbox aktivieren (vor Initialize aufrufen!)
Paddle.Environment.set('sandbox');

// Paddle mit Client-side Token initialisieren
Paddle.Initialize({
  token: 'live_xxx',
  eventCallback: function(event) {
    if (event.name === 'checkout.completed') {
      window.location.href = '/danke.html';
    }
    if (event.name === 'checkout.error') {
      console.error('Paddle error:', event.data);
    }
  }
});
```

### Inline Checkout öffnen

```javascript
Paddle.Checkout.open({
  settings: {
    displayMode: 'inline',       // 'inline' = im Container | 'overlay' = Modal
    frameTarget: 'paddle-wrap',  // CSS-Klasse des Ziel-Containers
    frameStyle: 'width:100%; min-height:420px; border:none;',
    theme:  'light',             // 'light' | 'dark'
    locale: 'de'                 // Sprache des Paddle-Formulars
  },
  items: [{
    priceId:  'pri_xxx',
    quantity: 1
  }],
  customer: {
    email: 'nutzer@beispiel.de'  // optional — befüllt Paddle-Feld vor
  },
  customData: {
    acceptedAgb:      true,
    acceptedDse:      true,
    waivedWithdrawal: true,
    timestamp:        new Date().toISOString()
  }
});
```

### Overlay-Checkout (Alternative / Fallback)

Ohne `settings.displayMode: 'inline'` öffnet Paddle ein Modal-Overlay.
Im aktuellen Code ist das als Fallback eingebaut, falls das Inline-Mount
fehlschlägt.

```javascript
// Overlay — kein frameTarget nötig
Paddle.Checkout.open({
  items: [{ priceId: 'pri_xxx', quantity: 1 }],
  customer: { email: '...' },
  customData: { ... }
});
```

---

## 5. customData — Zustimmungsnachweis im Webhook

Die `customData` werden bei jedem Checkout an Paddle übergeben und erscheinen
im Webhook-Payload unter `data.custom_data`.

```json
{
  "acceptedAgb":       true,
  "acceptedDse":       true,
  "waivedWithdrawal":  true,
  "timestamp":         "2026-05-31T10:23:45.000Z"
}
```

**Empfehlung:** Im Webhook-Handler in deiner DB persistieren:

```typescript
// Beispiel: Cloudflare Worker / Node
app.post('/webhook/paddle', async (req) => {
  const event = req.body;
  if (event.event_type === 'subscription.created') {
    const custom = event.data.custom_data;
    await db.insert('consent_log', {
      subscription_id:   event.data.id,
      customer_email:    event.data.customer.email,
      accepted_agb:      custom.acceptedAgb,
      accepted_dse:      custom.acceptedDse,
      waived_withdrawal: custom.waivedWithdrawal,
      consent_timestamp: custom.timestamp,
      webhook_timestamp: new Date().toISOString()
    });
  }
});
```

---

## 6. Checkout-Flow im Detail (Schritt für Schritt)

### Schritt 1 — Seite lädt
- Paddle.js wird von `cdn.paddle.com` geladen
- `Paddle.Initialize()` registriert den Event-Callback
- Der `paddle-wrap` Container zeigt einen Platzhalter-Text
- Der Kauf-Button ist `disabled`

### Schritt 2 — Nutzer hakt Checkboxen an
- Jede Checkbox-Änderung ruft `refresh()` auf
- `refresh()` prüft ob alle drei `checked` sind
- Sind alle drei aktiv → `openInlineCheckout()` wird aufgerufen
- Wird eine Checkbox wieder deaktiviert → Paddle-Container wird geleert,
  `checkoutOpened = false`, Button wieder `disabled`

### Schritt 3 — `openInlineCheckout()`
- Guard `if (checkoutOpened) return` verhindert Doppel-Mount
- Container-Inhalt wird geleert (kein Platzhalter mehr)
- `Paddle.Checkout.open()` mountet das Iframe in den Container
- Hinweis-Banner erscheint über dem Container

### Schritt 4 — Nutzer klickt CTA-Button
- Alle Checks ok + `checkoutOpened = true` → scrollt zum Paddle-Iframe
- Alle Checks ok + `checkoutOpened = false` → Fallback Overlay-Checkout
- Checks nicht vollständig → Fehlermeldung + rote Markierung der fehlenden Checks

### Schritt 5 — Paddle-Event
- `checkout.completed` → `window.location.href = '/danke.html'`
- `checkout.error` → `console.error(event.data)`

---

## 7. Design — LifePlus Farbpalette

| Variable | Hex | Verwendung |
|---|---|---|
| `--lp-primary` | `#006F44` | Haupt-Interaktionsfarbe, Checkboxen, Input-Focus |
| `--lp-dark` | `#13322B` | Aside-Gradient Ende, Fließtext |
| `--lp-accent` | `#9FBA37` | Brand-Mark SVG, Plan-Tag, Trust-Icon |
| `--lp-cta` | `#EA7600` | Kauf-Button, Widerruf-Checkbox (checked) |
| `--lp-surface` | `#EEF3EF` | Paddle-Hinweis-Banner Hintergrund |

### Schriften
- **Manrope** — UI-Text, Labels, Button
- **DM Serif Display** — Headlines (`h1`, Plan-Titel, Betrag)
- **JetBrains Mono** — Plan-Tag, technische Labels

---

## 8. Dateistruktur

```
lifeplus_checkout_paddle_Claude.html   ← diese Datei
    │
    ├── <link> Google Fonts (Manrope, DM Serif Display, JetBrains Mono)
    ├── <script src="https://cdn.paddle.com/paddle/v2/paddle.js">
    ├── <style> (inline CSS, LifePlus-Palette)
    ├── .shell
    │     ├── .aside  (links: Brand, Produktzusammenfassung, Preis)
    │     └── .pay    (rechts: Formular, Checkboxen, Paddle-Container, Button)
    └── <script> (Paddle-Init + Checkbox-Logik + Checkout-Handler)
```

---

## 9. Checkliste vor Go-Live

- [ ] `PADDLE_CONFIG.token` auf echten `live_`-Token setzen
- [ ] `PADDLE_CONFIG.priceId` auf echte `pri_`-ID setzen
- [ ] `PADDLE_CONFIG.sandbox` auf `false` setzen
- [ ] Weiterleitung `/danke.html` anlegen (oder Pfad anpassen)
- [ ] AGB-Link `/agb.html` zeigt auf fertiges Dokument
- [ ] Datenschutz-Link `/datenschutz.html` zeigt auf fertiges Dokument
- [ ] Webhook-Endpoint implementiert und in Paddle Dashboard eingetragen
- [ ] `customData` werden in DB persistiert (Zustimmungsnachweis)
- [ ] Mit Paddle Sandbox + Testkarte `4242 4242 4242 4242` getestet
- [ ] Mit `checkout.error`-Szenario getestet (z.B. abgelaufene Karte)
- [ ] Widerrufsbelehrung als PDF in Bestätigungsmail enthalten
- [ ] Rechtliche Prüfung der Widerruf-Checkbox-Formulierung (Anwalt)

---

## 10. Weiterführende Links

- [Paddle Billing v2 Docs](https://developer.paddle.com/build/checkout/build-overlay-checkout)
- [Paddle Inline Checkout](https://developer.paddle.com/build/checkout/build-inline-checkout)
- [Paddle Event Callbacks](https://developer.paddle.com/build/checkout/handle-checkout-events)
- [Paddle customData](https://developer.paddle.com/build/checkout/pass-custom-data)
- [§ 356 BGB — Widerrufsrecht bei digitalen Inhalten](https://www.gesetze-im-internet.de/bgb/__356.html)
