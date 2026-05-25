# Konzept: Paddle-Integration und App-Architektur

> **Dokument-Typ:** Architektur-/Konzeptpapier — beantwortet das **Warum**
> hinter Brand-Trennung, App-Auth (Magic-Link + Devices), Webhook-Strategie,
> DSGVO, Hosting-Wahl und Phasen-Roadmap.
>
> **Nicht hier zu suchen** (operativ, "wie macht man Schritt X"):
>
> - **Paddle-Setup** (Produkte, Preise, Discount-Codes, Webhook-Events,
>   Test-Karten) → [Setup Paddle Products, Prices, Discount-Codes.md](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md)
> - **Infrastruktur-Setup** (Cloudflare-CLI, Resend, IONOS-DNS, Secrets,
>   Custom Domain) → [Setup Infrastruktur Cloudflare, Resend und IONOS.md](./Setup%20Infrastruktur%20Cloudflare%2C%20Resend%20und%20IONOS.md)
> - **Namens-/SKU-Konvention** → bleibt in eigenem Dokument:
>   [Produkt-Namenskonvention.md](./Produkt-Namenskonvention.md)
>   und in [Setup Paddle …](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md) §4.
>
> **Stand 2026-05-22 — was abweichend von urspruenglichen Konzept-Optionen
> tatsaechlich umgesetzt ist:**
>
> - **Mailer:** Resend (urspruenglich "Brevo oder Resend").
> - **Datenbank:** Cloudflare D1 in WEUR (urspruenglich "Neon Frankfurt").
>   Schema in [migrations/0001_init.sql](../migrations/0001_init.sql).
> - **Hosting:** Cloudflare Pages Functions (wie konzipiert).
> - **Paddle-Events (Billing v2):** `transaction.paid` und
>   `adjustment.created`/`updated` (statt der Konzept-Namen aus Classic-Era).
>   Aktive Event-Liste im Webhook-Handler:
>   [functions/api/paddle/webhook.ts](../functions/api/paddle/webhook.ts).
> - **Pricing-Quelle:** kein `website/pricing.json`. Tokens kommen aus
>   `website/brands.json` (`paddle.clientToken`, `priceIdMonthly`,
>   `priceIdYearly`, `apiBaseUrl`) und werden in
>   `website/templates/pricing.html` gerendert.
> - **Checkout-Schutz:** Pricing-Seite fragt vor Paddle eine E-Mail ab und
>   ruft `POST /api/billing/checkout-intent` auf. Paddle oeffnet nur bei
>   `action = "start_checkout"`; ein unerreichbarer Intent blockiert
>   bewusst.
> - **Umsetzungsstand:** LifePlus voll verdrahtet. FitLine und Eqology
>   haben Microsites + App-Builds, aber noch Platzhalter fuer
>   Paddle-/API-Konfiguration.
>
> Konzept-Passagen, die alte Event-Namen, Mailer-/DB-Alternativen,
> `pricing.json` oder einen direkten Checkout-ohne-Intent nennen, sind als
> historischer Kontext zu lesen. **Maßgeblich** sind heute der Code und die
> beiden Setup-Dokumente oben.

## Ziel

Die App soll auf Desktop und Mobilgeraeten nutzbar sein, ohne dass die Zahlung
oder die Zugangspruefung hart an ein einzelnes Geraet gebunden ist. Der Nutzer
soll kaufen, sich spaeter auf PC und Handy anmelden koennen und bei aktivem
Zugang den Simulator verwenden.

Die sinnvolle Zielarchitektur ist:

```text
pricing.html / Marketing-Site (pro Brand)
        |
        | Paddle Overlay Checkout
        v
Paddle Billing (Merchant of Record)
        |
        | Webhooks: subscription.created, subscription.updated,
        |           subscription.activated, subscription.canceled,
        |           subscription.past_due, subscription.paused,
        |           subscription.resumed, subscription.trialing,
        |           transaction.paid, transaction.payment_failed,
        |           transaction.canceled, adjustment.created,
        |           adjustment.updated
        v
Serverless API (eine Instanz pro Brand)
        |
        v
Datenbank: users, subscriptions, entitlements, devices, sessions
        |
        v
Simulator-App prueft /api/me und zeigt App oder Paywall
```

## Brand-Modell und Identitaet

Das Projekt betreibt drei eigenstaendige Marken auf eigenen Domains:

```text
LifeFlow360  -> www.lifeflow360.app
FitFlow360   -> fitflow360.triltsch.com  (Zielzustand: fitflow360.de)
EqoFlow360   -> eqoflow360.triltsch.com  (Zielzustand: eqoflow360.de)
```

Entscheidung: **Pro Brand getrennte Identitaeten und getrennte Abrechnung.**
Cross-Sell ueber mehrere Brands wird bewusst nicht als Kernfunktion gebaut.
Das ist in diesem Produktkontext eher ungewoehnlich und erzeugt mehr
Komplexitaet als Nutzen.

Konsequenzen:

- Jede Brand hat eine eigene Datenbank oder ein eigenes DB-Schema mit eigener
  `users`-Tabelle. Eine E-Mail kann bei drei Brands existieren, aber jeweils
  als separater Datensatz.
- Jede Brand hat ein eigenes Paddle-Produkt-/Preisset und einen eigenen
  Webhook-Endpunkt. Paddle stellt damit pro Verkauf eine eigene Rechnung pro
  Brand aus.
- Cookies bleiben auf eine Brand-Domain begrenzt. Session-Sharing zwischen
  Brands ist nicht vorgesehen und auch nicht noetig.
- Die Magic-Link-E-Mail kommt jeweils von der Brand-Absenderdomain
  (z.B. `no-reply@lifeflow360.app`) und linkt auf die Brand-App-URL.
- Entitlement-Pruefungen kennen nur eine Brand pro Request. Der `brand_id`
  bleibt im Schema als sichernde Spalte fuer Audit/Migration, ist im Alltag
  aber faktisch konstant pro DB.
- Cross-Brand-Bundles werden bewusst nicht angeboten. Wer LifeFlow360 und
  FitFlow360 wirklich separat nutzen will, kann das spaeter ueber zwei
  getrennte Kaufprozesse tun. Es wird aber nicht aktiv als Cross-Sell in der
  App beworben.

Vorteile:

- Klare DSGVO-Trennung. Keine Cross-Domain-Cookies, kein verzweigtes
  Datenmodell, keine Diskussionen ueber Datenfluss zwischen Marken.
- Jede Brand bleibt jederzeit verkaufbar, abschaltbar oder auslagerbar, ohne
  die anderen zu beruehren.
- Ein einziger, kleiner Codebase fuer die API; Konfiguration pro Brand erfolgt
  ueber Environment-Variablen (Datenbankhost, Paddle-Keys, Mailer).

Nachteile, die akzeptiert werden:

- Cross-Sell ueber das Kundenkonto ist nicht direkt moeglich. Wird ueber die
  Marketing-Sites geloest, nicht ueber die App.
- Kein zentraler Cross-Brand-Account bedeutet: Falls ein Kunde bewusst mehrere
  Brands nutzt, passiert das ueber getrennte Kauf- und Login-Flows. Innerhalb
  derselben Brand werden Mehrfachkaeufe aktiv verhindert.

## Kaufstrategie und Mehrfachkaeufe

Mehrfachkaeufe innerhalb derselben Brand sollten verhindert werden. Ein Kunde
soll nicht versehentlich zweimal dasselbe Jahresabo kaufen koennen. Er soll nur
dann erneut durch einen Checkout gefuehrt werden, wenn es fachlich ein Upgrade,
ein Wechsel oder eine Reaktivierung ist.

Empfohlene Regeln:

```text
1. Ein User darf pro Brand nur ein aktives Abo haben.
2. Gleiche Price-ID erneut kaufen -> blockieren und zur App/Billing Portal leiten.
3. Hoeherer Plan -> Upgrade erlauben.
4. Niedrigerer Plan -> Downgrade zum Periodenende erlauben.
5. Gekuendigtes, aber noch aktives Abo -> Reaktivierung statt Neukauf.
6. Vollstaendig abgelaufenes Abo -> neuer Checkout erlaubt.
```

Die API prueft vor jedem Checkout:

```text
POST /api/billing/checkout-intent

Input:
- requested_price_id
- brand_id
- optional email, wenn der User noch nicht eingeloggt ist

Output:
- action = "start_checkout"
- action = "already_active"
- action = "upgrade"
- action = "manage_subscription"
- action = "login_required"
```

Beispiele:

```text
User hat aktives LifeFlow360 Jahresabo
-> klickt nochmal "Jahresabo kaufen"
-> API antwortet already_active
-> UI: "Du hast bereits Zugang. Simulator oeffnen / Abo verwalten"

User hat Basic und klickt Pro
-> API antwortet upgrade
-> Paddle Subscription Change oder Checkout fuer Upgrade starten

User hat gekuendigt, Zugang laeuft noch bis 2027-03-01
-> API antwortet manage_subscription
-> UI: "Dein Zugang ist noch aktiv. Du kannst die Kuendigung im Portal verwalten."
```

Wichtig: Die reine `pricing.html` kann einen Paddle Checkout zwar direkt
oeffnen, aber fuer Mehrfachkauf-Schutz ist ein kurzer API-Schritt davor besser.
Der Kaufen-Button sollte deshalb nicht direkt `Paddle.Checkout.open()` starten,
sondern zuerst einen Checkout Intent bei der API anfragen.

## Was funktioniert gut

Paddle passt gut zu dieser App, weil der Checkout im Browser geoeffnet werden
kann. Die Marketing-Site bleibt statisch, die React-App bleibt eine schnelle
Client-App, und Paddle uebernimmt Zahlung, Rechnungen, Steuern und Abo-Status.

Gut geeignet sind:

- `pricing.html` mit Produkt- und Preisuebersicht.
- Paddle Overlay Checkout per `Paddle.Checkout.open()`.
- Ein Preis pro Plan. Empfehlung fuer den Start: Jahresabo mit automatischer
  Verlaengerung. Monatlich und Lifetime erst spaeter pruefen.
- Ein Produkt-/Preis-Set pro Brand: LifeFlow360, FitFlow360, EqoFlow360.
- Rueckleitung nach erfolgreichem Checkout auf `/app/`.
- Serverseitige Freischaltung ueber Paddle Webhooks.

Im Frontend duerfen verwendet werden:

- Paddle client-side token.
- Paddle price IDs.
- Oeffentliche Planinformationen wie Name, Preislabel und Features.

## Was nicht ohne Backend funktioniert

Ohne Backend gibt es keinen sicheren Zugangsschutz. Ein reiner Redirect wie
`/app/?checkout=success` ist nur ein UX-Signal. Er beweist nicht, dass der User
bezahlt hat.

Nicht sicher sind:

- `localStorage`-Flags wie `paid=true`.
- Query-Parameter wie `checkout=success`.
- Frontend-only Pruefungen.
- Direkte Freischaltung nach Paddle Checkout ohne Webhook.
- Speichern geheimer Paddle API Keys im Browser.

Die App darf deshalb nie allein aus dem Frontend entscheiden, ob ein Nutzer
bezahlt hat. Diese Entscheidung muss aus der API kommen.

## Paddle als Merchant of Record

Kurz: Paddle uebernimmt USt./Sales-Tax, Rechnungsstellung, KYC,
Compliance, Disputes und Auszahlung. Wir bleiben fuer Service und
Entitlements verantwortlich.

Konsequenzen fuer die App:

- Kein Stripe-Connect-artiges Setup noetig.
- Kein eigenes Steuer- oder Rechnungssystem noetig.
- Im Frontend keine eigenen Brutto-Preise hartkodieren — Paddle ist die
  Quelle der Wahrheit.

→ Operative Setup-Details (KYC-Schritte, Reverse-Charge-Konfig, MoR-
Auswirkungen auf Code) in
[Setup Paddle Products, Prices, Discount-Codes.md](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md) §3.

## Empfohlene Komponenten

### 1. pricing.html

`pricing.html` ist die oeffentliche Produkt- und Preisliste. In der aktuellen
Implementierung wird sie nicht aus `website/pricing.json`, sondern aus
[website/brands.json](../website/brands.json) und
[website/templates/pricing.html](../website/templates/pricing.html) gerendert:

```text
website/brands.json
- siteName, siteDomain, appUrl, apiBaseUrl
- paddle.env
- paddle.clientToken
- paddle.priceIdMonthly
- paddle.priceIdYearly
```

Historische Beispielstruktur fuer ein separates Pricing-JSON:

```json
{
  "lifeplus": [
    {
      "id": "pro-yearly",
      "name": "Pro Jaehrlich",
      "priceLabel": "79 EUR / Jahr",
      "paddlePriceIdSandbox": "pri_...",
      "paddlePriceIdLive": "pri_...",
      "billingInterval": "year",
      "renewsAutomatically": true,
      "features": [
        "Voller Simulator",
        "10-Jahres-Prognose",
        "Netzwerk-Ansichten",
        "3 aktive Geraete"
      ],
      "highlight": true
    }
  ]
}
```

Die Seite sollte pro Plan einen Kaufen-Button haben. Dieser Button oeffnet den
Paddle Overlay Checkout. Auf Mobile ist das angenehmer als ein komplexes eigenes
Formular, weil Paddle die Zahlungsmaske, Steuerdaten, Rechnungsdaten und
Zahlungsmethoden selbst fuehrt.

Empfehlung: Die endgueltigen, lokalisierten Preise werden zur Laufzeit ueber
`Paddle.PricePreview` aus Paddle gezogen, statt sie im JSON statisch zu pflegen.
Das verhindert, dass auf der Marketing-Site falsche oder veraltete Preise
stehen.

### 2. Paddle Checkout

Der Checkout wird im Browser gestartet:

```text
User klickt auf Plan
-> Paddle.js oeffnet Checkout
-> User zahlt
-> Paddle leitet zu /app/?checkout=success zurueck
-> App wartet auf serverseitig bestaetigten Zugang
```

Der Redirect nach erfolgreicher Zahlung ist nicht die eigentliche
Freischaltung. Die echte Freischaltung passiert erst, wenn der Paddle Webhook
bei der API angekommen und verifiziert wurde.

Eigene Daten an den Checkout binden:

- `customData` mit `brand_id` und ggf. einem App-internen Pre-Identifier
  mitsenden. Paddle gibt diese Daten im Webhook zurueck. Damit kann der
  Webhook eindeutig zuordnen, fuer welche Brand er gilt.

### 3. Serverless API (pro Brand)

Die Serverless API ist die kleine Backend-Schicht zwischen Paddle, Datenbank und
Simulator-App. Sie muss nicht gross sein. Fuer den Start reichen wenige
Endpunkte:

```text
POST /api/auth/request-link
POST /api/auth/verify-link
GET  /api/me
POST /api/paddle/webhook
POST /api/billing/portal
GET  /api/devices
POST /api/devices/revoke
POST /api/sessions/revoke
POST /api/account/delete
```

Aufgaben der API:

- Magic-Link Login erzeugen und pruefen.
- Paddle Webhooks verifizieren.
- User anhand der Paddle Customer E-Mail oder Customer ID finden.
- Subscription-Status speichern.
- Entitlements setzen, zum Beispiel `lifeplus:pro`.
- Aktive Sessions und Geraete verwalten.
- Der App sagen, ob der aktuelle Nutzer Zugriff hat.
- DSGVO-Aufgaben: Datenexport, Loeschung auf Anfrage.

Die API laeuft pro Brand getrennt. Das kann sein:

```text
Variante A: eine API pro Subdomain
  api.lifeflow360.app
  api.fitflow360.triltsch.com
  api.eqoflow360.triltsch.com

Variante B: ein Code, drei Deployments
  Gleicher Quellcode, pro Brand mit eigener Environment-Variable
  (DB, Paddle-Keys, Mailer) deployt.
```

Variante B ist empfohlen, weil Wartung und Updates einmal passieren.

### 4. Datenbank

Fuer den Start reichen einfache Tabellen:

```text
users
- id
- email
- created_at
- deleted_at  -> Soft-Delete fuer DSGVO

subscriptions
- id
- user_id
- paddle_customer_id
- paddle_subscription_id
- paddle_transaction_id
- brand_id
- plan_id
- status                  -> active, past_due, canceled, paused
- current_period_ends_at
- canceled_at
- created_at
- updated_at

entitlements
- id
- user_id
- brand_id
- access_level            -> pro, lifetime, trial
- valid_until
- source                  -> subscription, refund_revoked, manual_grant
- created_at
- updated_at

devices
- id
- user_id
- device_token_hash
- label
- user_agent
- first_seen_at
- last_seen_at
- revoked_at

sessions
- id
- user_id
- device_id
- refresh_token_hash
- expires_at
- last_seen_at
- revoked_at

magic_login_tokens
- id
- user_id
- token_hash
- expires_at
- used_at
- created_at
- request_ip

webhook_events
- id                      -> Paddle Event-ID, fuer Idempotenz
- type
- payload_json
- received_at
- processed_at
```

`entitlements` sind wichtig, weil Zahlung und App-Zugang nicht immer dasselbe
sind. Ein Nutzer kann zum Beispiel ein aktives Abo haben, einen Kulanz-Zugang
bekommen, einen Trial nutzen oder nach einem Upgrade einen anderen Plan haben.

`webhook_events` ist die Single Source of Truth fuer Idempotenz. Jedes Event
wird vor der Verarbeitung mit `INSERT ... ON CONFLICT DO NOTHING` gesichert.
Wird dasselbe Event erneut zugestellt, wird es ignoriert.

## Drei aktive Geraete pro User

### Ziel

Der Nutzer soll die App normal auf PC, Handy und Tablet verwenden koennen.
Gleichzeitig soll verhindert werden, dass ein Account breit geteilt wird.

Die faire Regel:

```text
Ein User darf maximal 3 aktive Geraete gleichzeitig verwenden.
```

Das deckt den normalen Alltag ab:

- Laptop oder Desktop.
- Handy.
- Tablet.

### Was ist ein Geraet?

Ein Geraet ist kein aggressiver Browser-Fingerprint. Es ist ein zufaellig
erzeugter Device Token, der beim ersten Login auf diesem Browser gespeichert
wird.

Beim ersten erfolgreichen Login:

```text
1. App bekommt Session von der API.
2. API erstellt device_id.
3. App speichert einen Device Token lokal im Browser.
4. API speichert nur den Hash dieses Tokens.
```

Der Device Token bleibt im Browser, zum Beispiel in einem sicheren
HttpOnly-Cookie. Das ist besser als `localStorage`, weil JavaScript ihn nicht
direkt auslesen kann und XSS-Angriffe ihn nicht trivial mitlesen koennen.

### Login auf bekanntem Geraet

Wenn der User spaeter auf demselben PC wiederkommt:

```text
1. App sendet Session/Refresh Token.
2. API erkennt user_id und device_id.
3. API aktualisiert last_seen_at.
4. Zugriff bleibt aktiv.
```

Das zaehlt weiterhin als dasselbe Geraet.

### Login auf neuem Handy

Beispiel: Der User hat bisher nur seinen Laptop und sein Tablet verwendet und
moechte nun sein Handy anmelden.

```text
1. User oeffnet /app/ auf dem Handy.
2. App zeigt Login per E-Mail.
3. User gibt seine E-Mail ein.
4. API sendet Magic Link an diese E-Mail.
5. User klickt den Link auf dem Handy.
6. API prueft den Magic Link.
7. API sieht: User hat erst 2 aktive Geraete.
8. API registriert das Handy als drittes aktives Geraet.
9. App erhaelt eine neue Session.
10. User kann die App auf Laptop, Tablet und Handy verwenden.
```

Das ist der gewuenschte Normalfall.

### Wenn bereits drei Geraete aktiv sind

Beispiel: Laptop, Tablet und altes Handy sind aktiv. Der User kauft ein neues
Handy.

```text
1. User loggt sich auf dem neuen Handy per Magic Link ein.
2. API prueft die aktiven Geraete.
3. API erkennt: Limit von 3 Geraeten ist erreicht.
4. App zeigt eine Geraeteverwaltung.
5. User waehlt ein altes Geraet zum Abmelden.
6. API setzt revoked_at beim alten Geraet und dessen Sessions.
7. API registriert das neue Handy.
8. User kann die App auf dem neuen Handy nutzen.
```

Die UI sollte dabei freundlich sein:

```text
Du nutzt deinen Zugang bereits auf 3 Geraeten.
Melde ein altes Geraet ab, um dieses Geraet zu verwenden.
```

Angezeigt werden koennen:

- "Windows Chrome, zuletzt heute"
- "iPhone Safari, zuletzt vor 12 Tagen"
- "Android Chrome, zuletzt vor 2 Monaten"

### Wie kann der User ein Geraet abmelden?

Der User sollte Geraete an zwei Stellen abmelden koennen:

```text
1. Direkt beim Login auf einem neuen Geraet, wenn das Limit erreicht ist.
2. Spaeter in einem Account-Bereich innerhalb der App.
```

Direkt beim Login ist wichtig, weil es den haeufigsten Fall loest: Der User
steht mit einem neuen Handy vor der App, hat aber sein altes Handy noch als
aktives Geraet registriert. Er sollte dann nicht den Support kontaktieren
muessen.

Der Ablauf beim Login:

```text
1. User klickt Magic Link auf neuem Geraet.
2. API erkennt: Magic Link ist gueltig.
3. API erkennt: 3 aktive Geraete sind bereits vorhanden.
4. API erstellt noch keine voll aktive App-Session.
5. API gibt eine temporaere "device_limit_reached"-Session zurueck.
6. App zeigt die Liste der aktiven Geraete.
7. User waehlt ein altes Geraet aus.
8. App sendet POST /api/devices/revoke.
9. API widerruft altes Geraet und dessen Sessions.
10. API registriert das neue Geraet.
11. API gibt die normale App-Session frei.
```

Die temporaere Session darf nur fuer die Geraeteverwaltung gelten, nicht fuer
den Simulator selbst. Dadurch kann ein User sauber umziehen, ohne dass das
Geraetelimit kurzzeitig umgangen wird.

Im Account-Bereich sollte es einen einfachen Bereich geben:

```text
Meine Geraete
- Windows Chrome, zuletzt heute
- iPhone Safari, dieses Geraet
- iPad Safari, zuletzt vor 5 Tagen
```

Neben jedem fremden Geraet steht:

```text
Abmelden
```

Das aktuelle Geraet sollte man ebenfalls abmelden koennen, aber dann wird der
User sofort ausgeloggt.

### Geraetewechsel begrenzen

Damit ein Account nicht staendig weitergereicht wird, kann man zusaetzlich
eine Wechselregel einfuehren:

```text
Maximal 3 neue Geraete pro 30 Tage.
```

Diese Regel ist gut, weil sie zwei Dinge trennt:

```text
Aktive Geraete: maximal 3 gleichzeitig.
Neue Geraete: maximal 3 Registrierungen innerhalb von 30 Tagen.
```

Ein normaler Nutzer kann damit problemlos PC, Handy und Tablet verwenden. Wenn
er ein neues Handy bekommt, kann er ein altes Geraet abmelden und das neue
aktivieren. Wenn aber alle paar Tage ein neues Geraet auftaucht, ist das ein
starkes Sharing-Signal.

Bei echten Supportfaellen kann man das Wechsel-Limit manuell zuruecksetzen.

### Was diese Loesung verhindert

Sie verhindert nicht jede technische Umgehung. Aber sie verhindert
uebermaessiges Teilen im normalen Alltag.

Verhindert oder erschwert wird:

- Account-Nutzung durch viele verschiedene Personen.
- Staendiges Login auf neuen Geraeten.
- Gleichzeitige Nutzung auf vielen Browsern.
- Weitergabe an Gruppen.

Nicht vollstaendig verhindert wird:

- Ein Nutzer gibt seine E-Mail und seinen E-Mail-Zugang weiter.
- Jemand kopiert Browserdaten technisch manuell.
- Mehrere Personen teilen sich bewusst dieselben drei Geraete.

Das ist fuer ein kleines SaaS-Produkt meistens die richtige Balance: genug
Schutz, wenig Reibung, keine invasive Ueberwachung.

## Magic-Link Login

### Idee

Magic-Link Login bedeutet: Der Nutzer braucht kein Passwort. Er gibt seine
E-Mail-Adresse ein und bekommt einen einmaligen Link. Wer Zugriff auf die
E-Mail hat, kann sich anmelden.

Das passt gut zu Paddle, weil Paddle beim Checkout ebenfalls eine E-Mail
erfasst. Diese E-Mail kann als zentrale User-Identitaet dienen.

### Ablauf

```text
1. User oeffnet /app/.
2. App ruft GET /api/me auf.
3. API antwortet: nicht eingeloggt.
4. App zeigt E-Mail-Feld.
5. User gibt E-Mail ein.
6. App sendet POST /api/auth/request-link.
7. API erzeugt zufaelligen Token.
8. API speichert nur den Hash des Tokens.
9. API sendet E-Mail mit Login-Link.
10. User klickt Link.
11. App sendet Token an POST /api/auth/verify-link.
12. API prueft Token, Ablaufzeit und used_at.
13. API erstellt Session und registriert/aktualisiert Geraet.
14. App ruft GET /api/me erneut auf.
15. API gibt User und Entitlements zurueck.
```

### Magic-Link Eigenschaften

Ein Magic Link sollte:

- nur einmal verwendbar sein.
- kurz gueltig sein, zum Beispiel 10 bis 15 Minuten.
- nur gehasht in der Datenbank gespeichert werden.
- nach Verwendung `used_at` setzen.
- IP/User-Agent fuer Missbrauchserkennung speichern.

Beispiel-Link pro Brand:

```text
https://www.lifeflow360.app/app/auth/callback?token=...
https://fitflow360.triltsch.com/app/auth/callback?token=...
https://eqoflow360.triltsch.com/app/auth/callback?token=...
```

### Mobile-Besonderheit: Magic Link aus der Mail-App

Wenn der User den Magic Link in einer Mail-App auf dem Handy klickt, oeffnet
sich der Link manchmal in einem In-App-Browser (Gmail, Outlook). Der bringt
zwei Probleme:

- Cookies aus dem Standard-Browser sind dort nicht verfuegbar. Die Session
  wird im In-App-Browser angelegt, nicht im Browser, in dem der User die App
  spaeter wieder oeffnet.
- Der User landet beim spaeteren Oeffnen der App scheinbar wieder als nicht
  eingeloggt.

Workaround in der App:

- Auf der Auth-Callback-Seite kurz erklaeren: "Falls du diesen Link aus einer
  Mail-App geoeffnet hast, oeffne ihn im Browser, in dem du den Simulator
  nutzen willst."
- Optional Button "In Browser oeffnen" mit `intent://`-Link auf Android und
  `safari-view-controller`-Hinweis auf iOS.

### Vorteil

Magic Link ist fuer dieses Produkt elegant, weil:

- kein Passwortsystem noetig ist.
- Mobile und Desktop einfach funktionieren.
- Nutzer nach Kauf schnell in die App kommen.
- Support einfacher bleibt.
- weniger Angriffsoberflaeche durch Passwort-Reuse entsteht.

### Login und Zahlung nur per Handy

Der User kann den kompletten Ablauf auch nur auf dem Handy machen. Ein PC ist
nicht erforderlich.

Mobile-only Flow:

```text
1. User oeffnet pricing.html auf dem Handy.
2. User waehlt einen Plan.
3. Paddle Checkout oeffnet sich mobil im Browser.
4. User zahlt mit Karte, Wallet oder anderer verfuegbarer Paddle-Zahlmethode.
5. Paddle leitet zur App zurueck.
6. App zeigt Login oder erkennt eine vorhandene Session.
7. User fordert Magic Link an.
8. User oeffnet den Magic Link in seiner Mail-App auf demselben Handy.
9. App registriert das Handy als aktives Geraet.
10. User nutzt den Simulator direkt auf dem Handy.
```

Wichtig fuer gute Mobile-UX:

- `pricing.html` muss auf kleinen Displays klar und kompakt sein.
- Der Paddle Checkout sollte als Overlay oder klarer Redirect funktionieren.
- Der Magic Link sollte auf dieselbe Domain/App zurueckfuehren.
- Nach dem Klick aus der Mail-App muss die App den Login-Status neu pruefen.
- Der User sollte nicht gezwungen werden, zwischen PC und Handy zu wechseln.

### Nachteil

Der Zugang haengt an der E-Mail. Wenn jemand seinen E-Mail-Zugang teilt, kann
er auch den App-Zugang teilen. Deshalb ist das Device-Limit die passende zweite
Schutzschicht.

## Webhook-Verarbeitung im Detail

### SKU-Routing — wie der Webhook den Audience-Typ erkennt

Aus der Namenskonvention (siehe
[Setup Paddle §4](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md#4-namens--und-sku-konvention)
und [Produkt-Namenskonvention.md](./Produkt-Namenskonvention.md)) liest
der Webhook-Handler den `internal description`-Code des Preises
(z.B. `LifeFlow-IND-PRO-MO`) und faechert die Entitlement-Logik
entsprechend des Audience-Segments auf:

```text
<BRAND>-IND-<TIER>[-<PERIOD>]            -> Einzel-Entitlement fuer den Kaeufer
<BRAND>-SPO-<TIER>-<SEATS>[-<PERIOD>]    -> license_pool mit <SEATS> Slots
<BRAND>-TEAM-<TIER>-<SEATS>[-<PERIOD>]   -> license_pool im Team-Modus   (zukuenftig)
<BRAND>-ENT-<TIER>[-<SEATS>][-<PERIOD>]  -> Custom-Vertrag, manuell      (zukuenftig)
```

So bleiben heutige und zukuenftige Codes ohne Code-Aenderung
unterscheidbar — neue Audience-Codes (z.B. `EDU` fuer Bildungslizenzen)
ergaenzen die Switch-Logik ohne Refactor der bestehenden Pfade.

### Subscription Lifecycle

Folgende Paddle-Events werden verarbeitet (Paddle Billing v2):

```text
subscription.created        -> Neues Abo
subscription.updated        -> Plan-Wechsel, Reaktivierung, Pausierung
subscription.activated      -> Trial endet, Abo wird abrechnungspflichtig
subscription.canceled       -> Kuendigung wirksam (ggf. mit Periodenende)
subscription.past_due       -> Zahlung fehlgeschlagen, Retry laeuft
subscription.paused         -> Abo pausiert
subscription.resumed        -> Pause aufgehoben
subscription.trialing       -> Trial-Phase
transaction.paid            -> Erstkauf oder Renewal (frueher transaction.completed)
transaction.payment_failed  -> Frueh-Warnung vor past_due
transaction.canceled        -> Cart-Abbruch (nur Monitoring)
adjustment.created          -> Refund / Kulanz / Chargeback (Entitlement entziehen)
adjustment.updated          -> Adjustment-State-Wechsel
```

`customer.updated` wird bewusst nicht abonniert — User-Anlage laeuft ueber
Subscription-Events, E-Mail-Aenderungen sind im aktuellen Flow kein
Trigger fuer Folgelogik.

Allgemeines Vorgehen pro Event:

```text
1. Function liest raw body.
2. Function liest Paddle-Signature Header.
3. Function prueft Signatur mit PADDLE_WEBHOOK_SECRET.
4. Function liest event_id.
5. Function versucht INSERT INTO webhook_events (event_id, ...).
   Bei Konflikt: bereits verarbeitet, 200 antworten, fertig.
6. Function verarbeitet das Event:
   - User per E-Mail/Customer-ID finden oder anlegen.
   - Subscription-Status updaten.
   - Entitlement neu berechnen.
7. Function setzt processed_at.
8. Function antwortet 200.
```

### Grace Period und Past-Due

Wichtig: Beim Wechsel auf `past_due` darf der Zugang nicht sofort enden. Paddle
versucht die Zahlung mehrfach erneut.

Empfohlenes Verhalten:

```text
status = past_due:
- Entitlement bleibt aktiv bis current_period_ends_at + 7 Tage Grace.
- App zeigt einen weichen Hinweisbanner: "Zahlung fehlgeschlagen, bitte
  Zahlungsdaten aktualisieren" mit Link auf das Billing Portal.

status = canceled (durch User selbst):
- Entitlement bleibt aktiv bis current_period_ends_at.
- App zeigt Hinweis "Abo endet am ...".

status = canceled (durch Paddle nach mehreren past_due-Retries):
- Entitlement endet am current_period_ends_at.
- App zeigt Paywall ab diesem Zeitpunkt.

status = paused:
- Entitlement endet sofort.
- App zeigt "Abo pausiert".
```

### Jahresabo mit automatischer Verlaengerung

Empfehlung fuer dieses Produkt: **Jahresabo mit automatischer Verlaengerung**.
Das passt besser als ein Monatsabo, weil der Simulator kein taegliches
Produktivitaetstool ist, sondern eher ein Planungs- und Entscheidungswerkzeug,
zu dem Kunden phasenweise zurueckkommen.

Die Strategie sollte kundenfreundlich sein:

```text
Jahresabo
-> automatische Verlaengerung
-> klare Erinnerung vor Renewal
-> einfache Kuendigung ueber Paddle Portal
-> kulante 14-Tage-Erstattung nach Renewal
```

Das Ziel ist nicht, den Kunden in der Verlaengerung "zu fangen". Der Kunde soll
das Gefuehl haben, dass er gefahrlos wiederkommen kann und im Zweifel fair
behandelt wird.

Empfohlener Ablauf:

```text
30 Tage vor Renewal:
- E-Mail: "Dein LifeFlow360 Zugang verlaengert sich am ..."
- Link: Abo verwalten / kuendigen

7 Tage vor Renewal:
- Kurze Reminder-Mail, freundlich und unaufgeregt
- In-App Banner, falls der User die App oeffnet

Renewal Tag:
- Paddle belastet automatisch
- Webhook transaction.paid (bzw. subscription.updated) verlaengert Entitlement

0-14 Tage nach Renewal:
- Kulanzfenster fuer Rueckerstattung, wenn der Kunde sagt:
  "Die Verlaengerung hat mich erst daran erinnert."
```

Die bessere Strategie ist also nicht "Reminder oder 14 Tage Widerruf", sondern
beides:

```text
1. Rechtzeitig erinnern, damit der Kunde selbst entscheiden kann.
2. Trotzdem 14 Tage kulant sein, falls die Erinnerung uebersehen wurde.
```

### Widerruf, Kulanz und Zugriff nach Renewal

Rechtlich muss geklaert werden, welche Widerrufsregeln fuer digitale Inhalte,
Subscriptions und B2B/B2C-Konstellationen gelten. Produktstrategisch ist aber
eine klare Kulanzregel sinnvoll:

```text
Wenn ein Kunde innerhalb von 14 Tagen nach automatischer Jahresverlaengerung
eine Erstattung wuenscht, wird sie ohne Diskussion gewaehrt, solange keine
offensichtliche missbraeuchliche Nutzung vorliegt.
```

Technische Umsetzung:

```text
1. Renewal kommt als Paddle transaction.paid (verknuepft mit Subscription).
2. API verlaengert Entitlement bis current_period_ends_at + Grace.
3. API speichert paddle_transaction_id auf der Subscription.
4. Bei Refund innerhalb von 14 Tagen:
   - Webhook adjustment.created kommt an
     (transaction.refunded gibt es in Paddle Billing v2 nicht mehr).
   - Entitlement valid_until wird auf now gesetzt, source = refund_revoked.
   - Subscription wird je nach Paddle-Status beendet oder bleibt gemaess Portal.
5. App zeigt: "Dein Zugang wurde erstattet und ist beendet."
```

Wenn der Kunde innerhalb der 14 Tage intensiv weiter nutzt, ist eine manuelle
Pruefung moeglich. Trotzdem sollte die Grundhaltung kulant bleiben. Gerade bei
einem kleinen Tool ist Vertrauen wertvoller als eine einzelne erzwungene
Renewal-Zahlung.

### Kuendigungserinnerung statt versteckte Verlaengerung

Die Renewal-Kommunikation sollte offen sein:

```text
Betreff: Dein LifeFlow360 Jahreszugang verlaengert sich bald

Inhalt:
- Datum der Verlaengerung
- Preis
- Link zum Abo-Portal
- Hinweis auf 14 Tage Kulanz nach der Verlaengerung
```

Paddle fuegt in Subscription-E-Mails selbst Kuendigungslinks ein und bietet das
Customer Portal fuer Aboverwaltung. Laut Paddle bleibt ein ueber Portal
gekuendigtes Abo bis zum Periodenende aktiv; danach wird es beendet. Das ist
genau das richtige Verhalten fuer diese App.

Referenzen:

- Paddle Cancel Subscriptions:
  https://developer.paddle.com/build/subscriptions/cancel-subscriptions/
- Paddle Payment Recovery / Dunning:
  https://developer.paddle.com/build/retain/configure-payment-recovery-dunning/

### Refunds und Chargebacks

Bei `adjustment.created` / `adjustment.updated` (Refund, Kulanz, Chargeback):

```text
1. Webhook erkennt Erstattung.
2. API setzt Entitlement-source auf "refund_revoked".
3. Entitlement wird sofort beendet (valid_until = now).
4. Beim naechsten /api/me sieht die App den fehlenden Zugang.
5. App zeigt Paywall.
```

Bei Teilrueckerstattungen wird zunaechst nicht widerrufen. Solche Faelle
werden manuell vom Operator (Dirk) im Admin geprueft.

### Idempotenz

Webhooks koennen mehrfach zugestellt werden. Die Idempotenz-Sicherung passiert
ueber die `webhook_events`-Tabelle mit der Paddle-Event-ID als Primary Key.
Sollte das Insert auf einen Konflikt laufen, wird die weitere Verarbeitung
uebersprungen und 200 geantwortet.

## Rate-Limiting und Anti-Abuse

Das Device-Limit ist der wichtigste Schutz gegen uebermaessiges Teilen. Weitere
Anti-Abuse-Massnahmen sollten schlank bleiben und vor allem Login, Magic Links
und Webhooks schuetzen. Ziel ist nicht, normale Kunden zu nerven.

Dieser Abschnitt ist bewusst ein Arbeitsstand. Vor der Implementierung sollten
die konkreten Grenzwerte noch einmal anhand des finalen Hostings entschieden
werden.

Sicherheitsmassnahmen, die nicht optional sind:

### Magic-Link Anfragen

```text
Endpunkt:        POST /api/auth/request-link
Risiko:          E-Mail-Enumeration, Spam, Account-Lockout.
Schutz:
- Maximal 5 Anfragen pro IP pro 10 Minuten.
- Maximal 3 Anfragen pro E-Mail pro 30 Minuten.
- Antwort immer neutral: "Wenn die E-Mail existiert, wurde ein Link
  versendet." Niemals verraten, ob der Account existiert.
- captcha (z.B. hCaptcha oder Cloudflare Turnstile) ab dem dritten Versuch
  pro IP innerhalb des Zeitfensters.
```

### Magic-Link Verifikation

```text
Endpunkt:        POST /api/auth/verify-link
Risiko:          Token-Brute-Force.
Schutz:
- Token ist 32+ Bytes Zufall (cryptographically secure).
- Maximal 10 fehlgeschlagene Versuche pro IP pro 10 Minuten.
- Nach 3 fehlgeschlagenen Versuchen mit gueltigem Token-Prefix wird der
  betroffene Token invalidiert.
```

### Allgemeines API-Rate-Limit

```text
/api/me und Lese-Endpunkte: 60 Requests pro Minute pro Session.
Schreib-Endpunkte:          20 Requests pro Minute pro Session.
Webhook:                    Kein User-Rate-Limit, aber Body-Size Limit (z.B. 256 KB).
```

### Noch zu klaeren

Vor Umsetzung sollte konkret entschieden werden:

- Welcher Rate-Limit-Speicher wird genutzt: Cloudflare Turnstile/Rules, D1,
  KV, Redis, MySQL oder einfache Log-Tabelle?
- Ab wann wird Captcha/Turnstile angezeigt?
- Werden IPs gehasht gespeichert, um Datenschutzrisiko zu reduzieren?
- Wie lange werden Login- und Abuse-Logs aufbewahrt?
- Was passiert bei auffaelligen Device-Wechseln: blockieren, warnen oder
  manuelle Pruefung?
- Wie sieht der Support-Flow aus, wenn ein echter Kunde ausgesperrt wird?

Empfehlung: Erst minimal starten:

```text
1. Device-Limit: 3 aktive Geraete.
2. Wechsel-Limit: 3 neue Geraete pro 30 Tage.
3. Magic-Link Rate-Limits.
4. Neutrale Auth-Antworten gegen E-Mail-Enumeration.
5. Webhook-Signaturpruefung und Idempotenz.
```

Alles Weitere erst nach echten Nutzungsdaten verschaerfen.

### Session-Sicherheit

```text
- Session-Cookies: HttpOnly, Secure, SameSite=Lax (oder Strict, wo moeglich).
- Refresh-Token rotieren bei jedem Refresh; alter Token sofort widerrufen.
- Bei verdaechtiger Aktivitaet (neuer Standort, neue IP-Range): zusaetzliche
  Magic-Link-Bestaetigung anfordern.
- CSRF-Schutz fuer alle State-aendernden Endpunkte (Double-Submit-Token oder
  SameSite-Cookies in Kombination mit Origin-Check).
```

### Webhook-Sicherheit

```text
- Signaturpruefung Pflicht. Ohne gueltige Signatur direkt 401.
- IP-Allowlist fuer Paddle ist optional, aber nicht zuverlaessig (Paddle
  kann IP-Bloecke aendern); Signatur ist der echte Schutz.
- Body groesser als z.B. 256 KB direkt ablehnen.
```

## E-Mail-Versand

Magic-Link, Receipt-Hinweise und Account-Mails erfordern einen
Transaktions-Mailer. Anforderungen:

- Hohe Zustellrate (Magic-Link in 60 Sekunden im Posteingang).
- SPF, DKIM, DMARC pro Brand-Domain einrichtbar.
- Webhook fuer Bounces und Beschwerden.
- Faire Preise im Bereich von einigen 1000 Mails pro Monat.

Realistische Optionen Stand Mai 2026:

```text
Resend       -> Modern, gute DX, gute Zustellraten, Free-Tier reicht initial.
Postmark     -> Sehr starke Zustellraten bei Transactional Mail, etwas teurer.
Brevo        -> Guenstig, EU-basiert (Frankreich), gut fuer DSGVO-Argumente.
Amazon SES   -> Sehr guenstig, aber mehr Setup-Aufwand.
```

Empfehlung: **Brevo oder Resend**. Brevo ist EU-basiert, Resend ist
entwicklerfreundlich. Welcher konkret hier passt, wird in Phase 3 entschieden.

> Entscheidung umgesetzt: **Resend** (Region EU/Frankfurt). DKIM und
> Bounce-Subdomain sind in IONOS-DNS verifiziert. Setup-Details siehe
> [Cloudflare, Resend und IONOS - Setup.md](./Cloudflare,%20Resend%20und%20IONOS%20-%20Setup.md)
> Abschnitt 5.

Setup pro Brand-Domain (Resend mit Amazon-SES-Backend nutzt eine
`send.<domain>` Bounce-Subdomain — SPF/MX liegen dort, nicht auf der Root):

```text
DKIM:        TXT  resend._domainkey    p=<von Resend>
Bounce-MX:   MX   send                 feedback-smtp.eu-west-1.amazonses.com  Prio 10
Bounce-SPF:  TXT  send                 v=spf1 include:amazonses.com ~all
DMARC:       TXT  _dmarc               v=DMARC1; p=none; rua=mailto:mail@triltsch-online.de
```

DMARC startet mit `p=none` (nur reporten), spaeter auf `p=quarantine` oder
`p=reject` hochziehen, wenn alle Sender sauber konfiguriert sind. Exakte
Werte und Stolpersteine in
[Cloudflare, Resend und IONOS - Setup.md](./Cloudflare,%20Resend%20und%20IONOS%20-%20Setup.md)
Abschnitt 5/6.

Absender-Adressen je Brand (Mailer-Domain in Resend verifiziert):

```text
no-reply@lifeflow360.app           (aktiv)
no-reply@fitflow360.<domain>       (FitFlow360 — Domain wird mit Live-Schaltung gesetzt)
no-reply@eqoflow360.<domain>       (EqoFlow360 — Domain wird mit Live-Schaltung gesetzt)
```

Solange die FitLine/Eqology-Brands nur unter `*.triltsch.com` erreichbar
sind, laeuft der Mail-Versand weiter ueber `no-reply@lifeflow360.app` —
Resend verlangt eine verifizierte Absender-Domain, und `triltsch.com` ist
nicht als Brand-Domain verifiziert. Mit dem Umzug auf die finalen
Brand-Domains werden die dortigen DKIM/SPF-Records gesetzt und die
Absender-Adresse umgestellt.

## Sandbox vs. Live

Paddle hat zwei voneinander getrennte Logins:
`sandbox-vendors.paddle.com` und `vendors.paddle.com`. Customer-IDs und
Subscription-IDs sind nicht identisch — Sandbox-Daten werden nicht
uebernommen.

Konfigurationsorte (kein `pricing.json` im Repo):

- `website/brands.json` → `paddle.env`, `paddle.clientToken`,
  `paddle.priceIdMonthly`, `paddle.priceIdYearly` pro Brand.
- Cloudflare Pages Env: `PADDLE_ENV`, `PADDLE_PRICE_MONTHLY`,
  `PADDLE_PRICE_YEARLY` als plain vars + `PADDLE_API_KEY` /
  `PADDLE_WEBHOOK_SECRET` als secrets.

→ Detaillierter Test-Ablauf (Happy-Path, Negativ-Tests inkl. Refund,
Cancel, past_due, Idempotenz) und Pre-Live-Checkliste in
[Setup Paddle Products, Prices, Discount-Codes.md](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md)
§14 und §17.

## DSGVO und Datenschutz

Da die Marken in Deutschland verkaufen, gilt DSGVO. Konkrete Punkte:

### Datenfluss klar dokumentieren

- **Verantwortlicher** ist Dirk Triltsch (siehe `website/brands.json
  ._contact`).
- **Auftragsverarbeiter** sind:
  - Paddle (Zahlung, Steuer, Rechnungen)
  - der gewaehlte E-Mail-Dienst
  - der gewaehlte Hoster der API
  - die gewaehlte Datenbank
- Mit Paddle und dem E-Mail-Dienst muss ein DPA (Auftragsverarbeitungsvertrag)
  abgeschlossen werden. Paddle stellt das standardisiert ueber das Dashboard
  bereit.

### Datenschutzerklaerung erweitern

[website/templates/datenschutz.html](website/templates/datenschutz.html) muss
um folgende Punkte ergaenzt werden:

- Zweck, Datenarten und Rechtsgrundlage fuer Paddle-Checkout (Art. 6 Abs. 1
  lit. b DSGVO, Vertragserfuellung).
- Hinweis auf Drittlandtransfer (Paddle hat Konzernteile in den USA).
- Zweck, Datenarten und Rechtsgrundlage fuer das User-Konto (Magic-Link,
  Geraeteverwaltung).
- Speicherdauer pro Datenart (Rechnungsdaten: gesetzliche Aufbewahrungsfrist;
  Magic-Link-Tokens: 24h; Sessions: bis Logout; Devices: bis Revoke).
- Rechte des Betroffenen (Auskunft, Loeschung, Widerspruch, Beschwerde).

### Cookie- und Tracking-Hinweise

- Paddle setzt fuer den Checkout Cookies; das ist im Rahmen der
  Vertragserfuellung in der Regel zulaessig, sollte aber im Cookie-Hinweis
  erwaehnt werden.
- Eigene Session-Cookies sind technisch notwendig (Art. 25 Abs. 2 TTDSG
  bzw. TDDDG analog) und brauchen kein Einwilligungs-Banner.
- Falls Analytics (z.B. Plausible, Matomo) eingebaut wird, separate
  Cookie-Pruefung noetig.

### Datenexport und Loeschung

API-Endpunkte vorsehen:

```text
GET  /api/account/export    -> JSON-Export aller User-Daten
POST /api/account/delete    -> Loeschung (Soft-Delete, mit gesetzlich
                               zwingenden Restdaten in Rechnungen)
```

Bei Loeschung:

- `users.deleted_at` setzen.
- Magic-Link-Tokens, Sessions, Devices sofort widerrufen.
- Persoenliche Daten anonymisieren (E-Mail durch Hash ersetzen).
- Rechnungsbezogene Daten (Paddle Customer/Subscription IDs, Zahlbetrag)
  bleiben aufgrund handelsrechtlicher Aufbewahrungspflicht (i.d.R. 10 Jahre)
  erhalten, aber nicht mehr mit der natuerlichen Person verknuepfbar.

### Datenresidenz

Wenn moeglich, **Datenbank und Mailer in EU-Region** waehlen. Konkret heisst
das:

- Bei Cloudflare D1: aktuell kein harter EU-Region-Pin. Wer das vermeiden
  will, nimmt Neon (Frankfurt) oder Supabase (Frankfurt/Frankfurt Pro).
- Beim Mailer: Brevo (Paris) ist hier am unkritischsten.

## Hosting-Optionen

Aktueller Stand: Das statische Frontend wird per SFTP zu klassischem
Webhosting deployt (siehe [.vscode/sftp.json] und
[scripts/build-webroot.mjs](scripts/build-webroot.mjs)). Fuer den API-Teil
sind drei realistische Optionen evaluiert worden. Die getroffene Entscheidung
ist **Option 3 (Cloudflare Pages Functions)** als Startloesung — Begruendung
am Ende des Kapitels. Optionen 1 und 2 bleiben dokumentiert, weil sie als
Fallback relevant sind oder den Vergleich begruenden.

### Option 1: API als eigene Subdomain bei IONOS

```text
api.lifeflow360.app  ->  PHP auf IONOS Webhosting
MySQL/MariaDB         ->  IONOS Datenbank
```

Pro:
- Keine neue Infrastruktur.
- Bestehender Deploy-Flow via SFTP.
- Im vorhandenen IONOS-Vertrag sind PHP 8.3, Datenbankspeicher und
  MySQL/MariaDB bereits enthalten. Zusatzkosten fuer den API-Start:
  voraussichtlich 0 EUR.
- Webhooks von Paddle sind normale HTTPS-POST-Requests und koennen grundsaetzlich
  auch von PHP verarbeitet werden.
- 2 GB Datenbankspeicher reichen fuer die ersten Kunden und sehr wahrscheinlich
  auch fuer deutlich mehr als 50 Produkte, solange nur User, Sessions,
  Subscriptions, Devices und Webhook-Events gespeichert werden.
- `18 max_user_connections` ist fuer dieses API-Profil unkritisch, weil die App
  nur kurze Requests macht und keine dauerhaften DB-Verbindungen offenhalten
  sollte.

Kontra:
- Die API muesste wahrscheinlich in PHP gebaut werden, waehrend der Rest des
  Projekts TypeScript/Node ist.
- Secrets, Logs, Deployments und lokale Tests sind meist unbequemer.
- Kein nativer Serverless-Workflow mit Preview-Deployments.
- Sicherheits-Updates und PHP-Versionen muessen im IONOS-Vertrag sauber
  beobachtet werden.
- Wenn keine serverseitigen Cronjobs oder keine brauchbaren Logs verfuegbar sind,
  wird Betrieb und Debugging schwieriger.

IONOS ist also moeglich, wenn folgende Dinge im Vertrag vorhanden sind:

```text
[x] PHP 8.3 nutzbar.
[x] MySQL oder MariaDB vorhanden.
[x] 2 GB Datenbankspeicher vorhanden.
[x] 18 max_user_connections vorhanden.
[ ] HTTPS auf API-Subdomain.
[ ] Externe eingehende Webhooks erreichbar.
[ ] Ausgehende HTTPS-Requests zu Paddle und Mailer erlaubt.
[ ] Cronjobs oder vergleichbarer Scheduler vorhanden.
[ ] Fehlerlogs einsehbar.
```

Bewertung der bekannten Limits:

```text
2 GB Datenbankspeicher:
- Fuer Auth, Sessions, Devices, Subscriptions und Webhook-Events sehr grosszuegig.
- Groesster Wachstumstreiber waeren lange Log-Aufbewahrung und Webhook-Event-Archiv.
- Loesung: Webhook raw payloads nur begrenzt speichern oder nach 90/180 Tagen
  archivieren/kuerzen.

18 max_user_connections:
- Fuer wenige bis mittlere Kundenzahlen ausreichend.
- PHP oeffnet pro Request kurz eine DB-Verbindung und schliesst sie wieder.
- Wichtig: keine langen Transaktionen, keine Polling-Endpunkte, kein Live-Stream.
```

Referenz: IONOS nennt fuer Webhosting je nach Paket PHP, MySQL/MariaDB und
Cronjobs als verfuegbare Funktionen:
https://www.ionos.com/php-web-hosting

### Option 2: Vercel oder Netlify

```text
Frontend bleibt SFTP/klassisch oder zieht auf Vercel um.
API laeuft als Serverless Functions bei Vercel/Netlify.
```

Pro:
- Sehr einfache Deploys per Git.
- Free-Tier fuer kleine Projekte gut.
- Gute DX, Logs, Preview-Deployments.

Kontra:
- Bei Free-Tier teils kalte Funktionen.
- Datenresidenz unter Umstaenden in den USA, je nach Region/Plan.

### Option 3: Cloudflare Pages Functions

```text
Frontend zieht von SFTP auf Pages um.
API laeuft als Pages Functions.
Datenbank: Cloudflare D1 oder Neon/Supabase.
```

Pro:
- Sehr guenstig, sehr schnell.
- Einheitliche Plattform fuer statische Assets und API.
- File-based Routing (`functions/api/me.ts` -> `/api/me`).

Kontra:
- Migration des bestehenden SFTP-Deployments noetig.
- D1 hat aktuell keinen harten EU-Region-Pin.
- Wenn man mit Cloudflare nicht vertraut ist, gibt es eine Lernkurve.

### Kosten von Option 3

Stand Mai 2026:

```text
Cloudflare Workers/Pages Functions Free:
- 100.000 Requests pro Tag.
- Statische Asset-Requests sind kostenlos/unlimited.

Cloudflare Workers Paid:
- 5 USD pro Monat Basis.
- 10 Millionen Worker-Requests pro Monat enthalten.
- Danach ca. 0,30 USD pro weitere Million Requests.
- CPU-Zeit oberhalb des Inklusivkontingents wird nutzungsbasiert berechnet.

Cloudflare D1 Free:
- 5 Millionen gelesene Zeilen pro Tag.
- 100.000 geschriebene Zeilen pro Tag.
- 5 GB Speicher gesamt.

Cloudflare D1 Paid:
- Erste 25 Milliarden gelesene Zeilen pro Monat enthalten.
- Erste 50 Millionen geschriebene Zeilen pro Monat enthalten.
- Erste 5 GB Speicher enthalten.
- Danach nutzungsbasiert.
```

Fuer 3 bis 50 Kunden liegt diese App sehr wahrscheinlich im Free-Bereich, wenn
sie sparsam gebaut ist. Realistisch relevante Zusatzkosten:

```text
Cloudflare Option 3 minimal:
- 0 USD/Monat, wenn Free-Tier reicht.

Cloudflare Option 3 konservativ:
- 5 USD/Monat fuer Workers Paid, wenn man Reserven, hoehere Limits oder
  weniger Free-Tier-Risiko will.

Externe EU-Datenbank statt D1:
- Neon/Supabase kann zusaetzliche Kosten verursachen, je nach Plan.
```

Offizielle Preisreferenzen:

- Cloudflare Workers Pricing:
  https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare D1 Pricing:
  https://developers.cloudflare.com/d1/platform/pricing/

### Kann man alles ueber IONOS loesen?

Technisch ja. Mit den bekannten Vertragsdaten ist IONOS eine vollstaendig
gangbare Startloesung:

```text
PHP 8.3 verfuegbar
2 GB Speicherkapazitaet fuer Datenbank
18 max_user_connections
MariaDB/MySQL unterstuetzt
Cronjobs verfuegbar (im Vertrag enthalten)
```

Wenn zusaetzlich Subdomains, HTTPS, Webhook-Erreichbarkeit, ausgehende
HTTPS-Requests und brauchbare Logs funktionieren, waere die guenstigste
Variante:

```text
Statische Website/App: weiter IONOS Webspace
API: PHP unter /api oder api.lifeflow360.app
Datenbank: IONOS MySQL/MariaDB
Mail: IONOS SMTP oder externer Transactional Mailer
Paddle: Webhooks an IONOS API
```

Auch das ist fuer den Anfang mit wenigen Kunden vertretbar und vermutlich
0 EUR Zusatzkosten, weil die wichtigsten Bausteine im Vertrag bereits
enthalten sind.

**Der entscheidende Punkt ist:** Cloudflare Option 3 ist in der Startphase
exakt genauso teuer (0 USD im Free-Tier) und vermeidet zugleich den
Stack-Bruch zwischen PHP und dem TypeScript-Rest des Projekts. Damit ist der
einzige relevante IONOS-Vorteil — die fehlende Lernkurve — der einzige Grund,
der ihn noch gegen Cloudflare bringen koennte.

Der Tradeoff in Stichpunkten:

```text
IONOS:
+ wahrscheinlich keine Zusatzkosten
+ kein Umzug der statischen Sites
+ vorhandener Vertrag wird genutzt
- PHP/API neben TypeScript-Codebase
- weniger moderne Deploy-/Log-/Preview-Workflows
- Skalierung und Betrieb haengen am Hostingpaket

Cloudflare Option 3:
+ moderne Serverless API
+ sehr guenstig
+ gut versionierbar und per Git deploybar
+ statische Assets + API sauber integriert
- Umzug oder Teilumzug noetig
- D1 ohne harte EU-Region; alternativ externe DB
- neue Plattform lernen
```

Pragmatische Empfehlung:

```text
Phase 1:
- Cloudflare Pages Functions + Neon Frankfurt aufsetzen.
- API von Anfang an in TypeScript bauen, durchgaengig mit dem Rest-Codebase.
- Paddle Webhook und Magic-Link End-to-End testen.
- Kosten in dieser Phase: 0 EUR / 0 USD pro Monat (Free-Tiers).

Phase 2:
- Wenn Cloudflare Free-Tier-Limits naeher rueckt oder Reserven gewollt sind:
  Workers Paid Plan fuer 5 USD/Monat aktivieren. Schalter, kein Umbau.

Phase 3:
- Falls Datenbank-Volumen oder Branching-Bedarf waechst:
  Neon Pro oder Supabase Pro je nach Bedarf.
- IONOS bleibt als Fallback verfuegbar, falls Cloudflare oder Neon strukturell
  nicht passen (z.B. wegen harter EU-Region-Anforderung an Workers selbst,
  nicht nur an die DB).
```

### Empfehlung

**Start direkt mit Cloudflare Option 3, IONOS bleibt als Fallback.**

Die urspruengliche Empfehlung "kurzfristig IONOS, langfristig Cloudflare"
wurde nach Kosten- und Aufwandsabwaegung verworfen. Begruendung im Detail:

1. **Beide Optionen kosten bei wenigen Kunden gleich viel: 0 EUR.** IONOS hat
   in der Startphase keinen Kostenvorteil, weil die App im Cloudflare Free-Tier
   muehelos Platz findet (Details siehe Abschnitt "Kosten-Einschaetzung
   inklusive Nutzer-Szenarien").
2. **Stack-Bruch vermeiden:** Eine PHP-API fuer die Startphase zu bauen und
   spaeter eine TypeScript-API zu schreiben ist doppelter Entwicklungsaufwand.
   Der Rest des Projekts ist TypeScript/Node — Cloudflare Pages Functions
   bleibt im selben Stack.
3. **Migration entfaellt:** Wenn die App erfolgreich skaliert, ist der
   IONOS-zu-Cloudflare-Umzug spaeter teuerer als ein direkter Cloudflare-Start
   jetzt — sowohl in Code- als auch in Betriebsrisiko.
4. **Lernkurve frueh einplanen:** Cloudflare Pages Functions in einer ruhigen
   Aufbauphase zu lernen ist einfacher als unter Produktionsdruck mit
   Bestandskunden zu migrieren.

**Option 1 (IONOS PHP 8.3 + MySQL/MariaDB) bleibt eine valide Fallback-Option**
und wird im Dokument bewusst dokumentiert behalten. Sie kommt zum Einsatz,
wenn einer dieser Faelle eintritt:

- Cloudflare-Setup scheitert an einer konkreten Anforderung (z.B. harter
  EU-Pin auch fuer Worker-Compute, nicht nur fuer die DB).
- Neon/Supabase Free-Tier-Limits werden in der DB-Wahl ausgeschlossen.
- Die Lernkurve fuer Cloudflare wird im Einzelfall zu hoch eingeschaetzt und
  PHP ist im Moment produktiver.

Mit PHP 8.3, MySQL/MariaDB, 2 GB Datenbankspeicher, 18 `max_user_connections`
und enthaltenen Cronjobs ist IONOS technisch fuer den Start vollstaendig
geeignet — die Entscheidung gegen IONOS ist eine strategische
(Stack-Konsistenz, vermiedene spaetere Migration), keine technische.

**Option 3 (Cloudflare Pages Functions + Neon EU oder D1) ist sowohl
kurzfristig kostenfrei als auch langfristig die bessere Entwicklerplattform**,
weil:

- Statische Site und API liegen auf einer Plattform.
- Skalierung ist quasi gratis.
- Mit Neon (Frankfurt) ist die Datenresidenz in der EU geklaert.

Wer einen weniger invasiven Schritt will, startet mit **Option 1** und betreibt
nur die API auf einer Subdomain beim bestehenden Hoster, ohne das Frontend zu
beruehren.

### Beispielstruktur Cloudflare Pages

```text
functions/
  api/
    me.ts
    auth/
      request-link.ts
      verify-link.ts
    paddle/
      webhook.ts
    billing/
      portal.ts
    devices/
      index.ts        -> GET /api/devices
      revoke.ts       -> POST /api/devices/revoke
    sessions/
      revoke.ts
    account/
      export.ts
      delete.ts
```

### Secrets und Konfiguration

Secrets gehoeren nicht ins Repo. Sie werden beim Hoster als Environment
Variables/Secrets gesetzt:

```text
PADDLE_API_KEY
PADDLE_WEBHOOK_SECRET
APP_SESSION_SECRET
MAGIC_LINK_SECRET
EMAIL_API_KEY
DATABASE_URL
BRAND_ID                 -> lifeplus | fitline | eqology
```

Oeffentliche Frontend-Werte duerfen dagegen in Vite-Env liegen:

```text
VITE_PRODUCT=lifeplus
VITE_BASE_PATH=/app/
VITE_API_BASE_URL=https://api.lifeflow360.app
```

Paddle-Client-Token und Price-IDs liegen fuer die statische Pricing-Seite in
`website/brands.json`. Die Simulator-App selbst benoetigt sie nicht.

### Datenbankoptionen

```text
Cloudflare D1
```

Gut fuer eine kleine SQL-Datenbank direkt im Cloudflare-Umfeld. Fuer User,
Subscriptions, Sessions und Devices reicht das zu Beginn. Aktuell kein
harter EU-Region-Pin.

```text
Neon (Postgres, Frankfurt)
```

Empfohlen, wenn DSGVO und EU-Residenz wichtig sind. Free-Tier vorhanden,
sehr gute DX, leichtes Branching fuer Tests.

```text
Supabase (Postgres, Frankfurt verfuegbar)
```

Empfehlenswert, falls man auch Auth- oder Storage-Features spaeter nutzen
will. Sonst gleichwertig zu Neon.

```text
KV allein
```

Nicht ideal als Hauptdatenbank fuer Subscriptions und Geraete, weil
relationale Abfragen und konsistente Updates fehlen. KV kann fuer Caches oder
Rate-Limits helfen, aber nicht als einzige Quelle der Wahrheit.

### Kosten-Einschaetzung inklusive Nutzer-Szenarien

Stand Mai 2026 ist Cloudflare fuer einen sehr kleinen Start realistisch
kostenarm bis kostenlos nutzbar. Offizielle Referenzen:

- Cloudflare Workers/Pages Functions Pricing:
  https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers Limits:
  https://developers.cloudflare.com/workers/platform/limits/

#### Free-Tier-Kapazitaeten

```text
Cloudflare Workers / Pages Functions Free:
- 100.000 Requests pro Tag
- 10 ms CPU-Zeit pro Invocation
- Statische Asset-Requests unlimited

Cloudflare D1 Free:
- 5 Millionen gelesene Zeilen pro Tag
- 100.000 geschriebene Zeilen pro Tag
- 5 GB Speicher gesamt

Neon (Postgres, Frankfurt) Free:
- 1 Compute, 0,5 GB Speicher
- Branching fuer Tests verfuegbar
- Auto-Suspend bei Inaktivitaet (Cold Start ~hundertstel Sekunde)

Brevo Free (E-Mail):
- 300 Mails pro Tag

Resend Free (E-Mail):
- 3.000 Mails pro Monat, 100 pro Tag
```

#### Wie viele Nutzer passen ins Free-Tier?

Die Rechnung haengt am Request-Verhalten pro User. Realistische Annahmen pro
aktivem User pro Tag, basierend auf den geplanten Endpunkten:

```text
- /api/me bei App-Oeffnung + Session-Refresh:  ~5-20 Requests
- Magic-Link Request + Klick:                  ~3 Requests (selten, ~1x/Woche)
- Simulator-Nutzung:                           0-50 Requests
  (Default: clientseitige Berechnung -> 0)
- Paddle-Webhooks:                             ~5 Events pro Verkauf, einmalig
- Billing-Portal-Aufrufe:                      vernachlaessigbar
```

Daraus ergeben sich drei Bandbreiten:

```text
Sparsam (Simulator clientseitig, kurze Sessions):
  ~10 Requests / aktiver User / Tag
  -> max. ~10.000 DAU im Free-Tier

Normal (mehrfaches Re-Auth, moderate API-Nutzung):
  ~30 Requests / aktiver User / Tag
  -> max. ~3.300 DAU im Free-Tier

Intensiv (viele API-Calls pro Session):
  ~100 Requests / aktiver User / Tag
  -> max. ~1.000 DAU im Free-Tier
```

Wichtig: Das sind **taeglich aktive User (DAU)**, nicht zahlende Gesamtkunden.
Bei einem Planungs-Tool wie dem Simulator liegt die DAU/MAU-Ratio
erfahrungsgemaess bei 10-20 %, und MAU/Gesamtkunden ebenfalls deutlich unter
100 % (nicht jeder zahlende Kunde oeffnet die App jeden Monat).

#### Konkrete Szenarien

```text
Szenario A: 200 zahlende Kunden pro Brand
- Annahme: 20-30 % DAU-Ratio ueber alle Kunden, normaler Request-Verbrauch
- DAU: ~40-60
- Tages-Requests: ~1.200-1.800
- Free-Tier-Auslastung: ~1-2 %
- Laufende Kosten Cloudflare/DB:  0 EUR / 0 USD pro Monat

Szenario B: 500 zahlende Kunden pro Brand
- DAU: ~100-150
- Tages-Requests: ~3.000-4.500
- Free-Tier-Auslastung: ~3-5 %
- Laufende Kosten Cloudflare/DB:  0 EUR / 0 USD pro Monat

Szenario C: 1.000 zahlende Kunden pro Brand
- DAU: ~200-300
- Tages-Requests: ~6.000-9.000
- Free-Tier-Auslastung: ~6-9 %
- Laufende Kosten Cloudflare/DB:  0 EUR / 0 USD pro Monat
  (Workers Paid fuer 5 USD/Monat optional als Reserve)

Szenario D: 5.000 zahlende Kunden pro Brand
- DAU: ~1.000-1.500
- Tages-Requests: ~30.000-45.000
- Free-Tier-Auslastung: ~30-45 %
- Laufende Kosten Cloudflare/DB:  weiterhin im Free-Tier moeglich,
                                  Workers Paid fuer 5 USD/Monat empfohlen.

Szenario E: 20.000 zahlende Kunden pro Brand
- DAU: ~4.000-6.000
- Tages-Requests: ~120.000-180.000
- Free-Tier reicht nicht mehr.
- Workers Paid (5 USD/Monat + 10 Mio. Requests inkl.) deckt das ab,
  CPU-Time-Limits beobachten.
```

**Einschaetzung fuer die Startphase:**

Bei realistisch erwarteten Kundenzahlen in den ersten 12-24 Monaten — also
unter 1.000 Kunden pro Brand — entstehen auf Cloudflare und Neon Free-Tier
**keine laufenden Infrastrukturkosten**. Bei 200 Kunden pro Brand liegt die
Free-Tier-Auslastung bei wenigen Prozent. Bei drei Brands kommen sogar
zusammengerechnet drei separate Free-Tier-Kontingente in Frage, falls pro
Brand ein eigenes Cloudflare-Projekt angelegt wird. (Workers Free-Tier-Limits
gelten pro Account, nicht pro Projekt — Vorteil entsteht also nur, wenn man
bewusst getrennte Accounts pro Brand fahren wollte. Im Default reicht ein
Account problemlos.)

#### Realistische Kostenpositionen

Die wahrscheinlicheren Kostenpositionen am Anfang sind nicht
Infrastruktur, sondern:

```text
Position                              Kosten/Monat (geschaetzt)
-----------------------------------   ------------------------
Domain pro Brand (3x)                 ~2-5 EUR
E-Mail Versand (Free reicht initial)  0 EUR -> 0-25 EUR bei Volumen
Cloudflare Workers/Pages              0 USD -> optional 5 USD
Cloudflare D1 oder Neon Free          0 USD
Paddle-Gebuehren pro Verkauf          5 % + 0,50 USD pro Transaktion
Optional Datenbank-Paid-Tier          ab ~19 USD/Monat (Neon Pro)
```

**Paddle ist mit Abstand der groesste Kostenblock** — siehe naechster
Abschnitt zur Tickethoehe und Abrechnungsfrequenz.

#### Paddle-Gebuehren in Relation

Paddle berechnet aktuell (Mai 2026) 5 % + 0,50 USD pro Transaktion ohne
monatliche Grundgebuehr. Das wirkt sich je nach Tickethoehe und
Abrechnungsfrequenz sehr unterschiedlich aus:

```text
Bei 1.000 Kunden mit 3 EUR/Monat Monatsabo:
- Bruttoumsatz:           3.000 EUR/Monat
- Paddle 5 % Anteil:        150 EUR
- Paddle 0,46 EUR x 1.000:  460 EUR
- Paddle-Last gesamt:       610 EUR (~20 % des Bruttoumsatzes)

Bei 1.000 Kunden mit 36 EUR/Jahr Jahresabo (rechnerisch 3 EUR/Monat):
- Bruttoumsatz:           3.000 EUR/Monat (umgerechnet)
- Paddle 5 % Anteil:        150 EUR
- Paddle 0,46 EUR x ~83:     38 EUR
- Paddle-Last gesamt:       188 EUR (~6,3 % des Bruttoumsatzes)
```

Die 0,50-USD-Pauschale wirkt bei niedrigem Ticketpreis dramatisch.
**Differenz zwischen Monats- und Jahresabo bei 1.000 Kunden: ~420 EUR/Monat
zugunsten Jahresabo.** Das untermauert die Empfehlung weiter oben ("Jahresabo
mit automatischer Verlaengerung").

Paddle selbst weist darauf hin, dass fuer Produkte unter 10 USD
Sonderkonditionen ueber den Sales-Kontakt moeglich sind. Bei einem 3 EUR
Monatsabo lohnt sich diese Anfrage. Bei einem 36 EUR Jahresabo liegt das
Ticket ueber der Schwelle und die Standardrate ist akzeptabel.

#### Vergleich mit IONOS-Variante

Zum Vergleich: IONOS verursacht in der Startphase ebenfalls keine
Zusatzkosten, weil PHP 8.3, MySQL/MariaDB, Datenbankspeicher und Cronjobs
bereits im bestehenden Vertrag enthalten sind. **Der Kostenvorteil von
Cloudflare gegenueber IONOS in der Startphase ist also nicht "guenstiger",
sondern "gleich teuer, aber im selben Stack wie der Rest des Projekts und
ohne spaetere Migration".**

```text
Kostenvergleich Startphase (< 1.000 Kunden pro Brand):

                              IONOS Option 1     Cloudflare Option 3
Hosting/API:                  0 EUR (Vertrag)    0 USD (Free)
Datenbank:                    0 EUR (Vertrag)    0 USD (Free, D1 oder Neon)
Cronjobs:                     0 EUR (Vertrag)    0 USD (Cron Triggers)
TLS auf API-Subdomain:        zu pruefen         enthalten
EU-Datenresidenz Compute:     ja                 nein (Cloudflare Edge global)
EU-Datenresidenz DB:          ja                 ja, wenn Neon Frankfurt
Stack:                        PHP                TypeScript (wie Rest)
Spaetere Migration noetig:    wahrscheinlich     unwahrscheinlich
```

Wichtig: Preise und Free-Tiers koennen sich aendern. Vor Livegang die
aktuellen offiziellen Preis-Seiten pruefen.

### Paddle Webhook auf Cloudflare

Der Webhook-Endpunkt muss die rohe Request-Body pruefen. Das ist wichtig, weil
Paddle die Signatur ueber den originalen Body bildet.

Flow:

```text
1. Paddle sendet Event an /api/paddle/webhook.
2. Function liest raw body (kein Re-Encoding, keine Body-Parsing-Middleware).
3. Function liest Paddle-Signature Header.
4. Function prueft Signatur mit PADDLE_WEBHOOK_SECRET.
5. Function verarbeitet nur verifizierte Events.
6. Function speichert Event-ID idempotent.
7. Function aktualisiert User, Subscription und Entitlement.
8. Function antwortet 200.
```

## App-Integration konkret

### Brand-Zuordnung zur Laufzeit

Die App wird pro Brand gebaut via `npm run build:lifeplus|fitline|eqology`.
Damit ist die Brand bereits im Build-Artefakt enthalten. In der App wird der
`BRAND_ID` als Vite-Env-Konstante exponiert:

```text
VITE_BRAND_ID=lifeplus  // oder fitline | eqology
```

Die App sendet bei API-Aufrufen die `BRAND_ID` mit (z.B. als Header
`X-Brand-Id`) und stellt damit sicher, dass die richtige API-Instanz
angesprochen wird. Da pro Brand eine eigene API laeuft, ist das primaer eine
Audit-Sicherung.

### Auth-Bootstrapping

Beim Start der App (in [simulator-app/src/App.tsx](simulator-app/src/App.tsx))
wird vor dem Rendern des Simulators einmal `/api/me` aufgerufen. Drei
Ergebnisse:

```text
1. Nicht eingeloggt   -> <LoginGate /> rendern (E-Mail-Feld, Magic-Link senden).
2. Eingeloggt, kein   -> <Paywall /> rendern (Verweis auf pricing.html,
   Entitlement              "Du hast noch keinen aktiven Zugang").
3. Eingeloggt, aktiv  -> <SimulatorShell /> rendern (bestehende App).
```

Die `<Paywall />`-Komponente liegt neu unter
[simulator-app/src/components/Paywall.tsx](simulator-app/src/components/Paywall.tsx)
und uebernimmt:

- Hinweis "Kein aktiver Zugang"
- Link zum Brand-Pricing
- Falls Abo `past_due`: Banner mit Link zum Billing Portal
- Falls Abo gekuendigt aber noch in Grace: Banner "Aktiv bis ..."

Bestehende Komponenten ([ProvisionChart.tsx](simulator-app/src/components/ProvisionChart.tsx),
[NetworkVisualizations.tsx](simulator-app/src/components/NetworkVisualizations.tsx))
bleiben unberuehrt; sie werden nur unterhalb von `<SimulatorShell />` gerendert.

### Auth-State im Client

```text
useAuth() Hook
- state: 'loading' | 'anonymous' | 'no_entitlement' | 'active' | 'past_due'
        | 'device_limit_reached'
- email?: string
- entitlement?: { plan, validUntil }
- activeDevices?: number
- deviceLimit?: number
- actions: requestMagicLink, verifyMagicLink, logout, listDevices,
           revokeDevice, openBillingPortal
```

### Goal-Editor und andere Komponenten

Die aktuell unversionierten Komponenten
([GoalsEditorDialog.tsx](simulator-app/src/components/GoalsEditorDialog.tsx),
[AdvancedSettingsPanel.tsx](simulator-app/src/components/AdvancedSettingsPanel.tsx))
bleiben Teil der `<SimulatorShell />` und sind damit hinter der Paywall.

### Pricing-Seite Anbindung

`pricing.html` liegt in [website/templates/](../website/templates/) und wird
vom Website-Build mit den Tokens aus
[website/brands.json](../website/brands.json) gerendert. Die Plan-Karten sind
im Template enthalten; pro Brand werden Client-Token, Price-IDs, App-URL und
API-Base-URL eingesetzt. Paddle.js wird als `<script>` eingebunden.

Beim Klick auf "Kaufen" passiert heute bewusst **nicht** sofort
`Paddle.Checkout.open()`, sondern:

```text
1. E-Mail per Browser-Prompt abfragen.
2. POST <API_BASE_URL>/api/billing/checkout-intent
   Body: { priceId, email }
3. Nur bei action = "start_checkout" Paddle oeffnen.
4. Bei already_active zur App leiten.
5. Bei manage_subscription zur App mit ?manage=1 leiten.
6. Bei Fehler oder nicht erreichbarer API keinen Checkout starten.
```

Aktueller Checkout-Aufruf im Template:

```text
Paddle.Checkout.open({
  items: [{ priceId, quantity: 1 }],
  customer: { email: normalizedEmail },
  customData: { brand_id: brandId, checkout_email: normalizedEmail },
  settings: {
    successUrl: appUrl + '?checkout=success&email=' + encodeURIComponent(normalizedEmail),
    displayMode: 'overlay',
    theme: 'light',
    locale: 'de'
  }
})
```

## Empfohlener Kauf- und Login-Flow

### Neuer Kunde

```text
1. User besucht pricing.html.
2. User waehlt Plan.
3. Paddle Checkout oeffnet sich.
4. User bezahlt mit E-Mail-Adresse.
5. Paddle sendet transaction.paid und subscription.created.
6. API verifiziert Webhook.
7. API erstellt oder aktualisiert User.
8. API setzt Entitlement fuer die gekaufte Brand.
9. User landet auf /app/?checkout=success.
10. App zeigt Login per Magic Link, falls noch keine Session besteht.
11. User klickt Magic Link.
12. App ruft /api/me auf und bekommt aktiven Zugang.
```

### Bestehender Kunde auf neuem Geraet

```text
1. User oeffnet /app/ auf neuem Geraet.
2. App zeigt Login.
3. User fordert Magic Link an.
4. User klickt Link auf dem neuen Geraet.
5. API prueft aktive Geraete.
6. Wenn weniger als 3 aktiv sind: neues Geraet registrieren.
7. Wenn 3 aktiv sind: Geraeteverwaltung anzeigen.
8. Nach Freigabe gibt /api/me aktiven Zugang zurueck.
```

### Abo gekuendigt oder Zahlung fehlgeschlagen

```text
1. Paddle sendet subscription.updated, subscription.canceled oder subscription.past_due.
2. API verifiziert Webhook.
3. API aktualisiert Subscription-Status.
4. API setzt Entitlement gemaess Grace-Regeln (siehe oben).
5. Beim naechsten /api/me sieht die App den neuen Status.
6. App zeigt Hinweis, Billing Portal oder Pricing-Link.
```

## Billing Portal

Fuer Abo-Verwaltung sollte der User nicht intern herumklicken muessen. Die API
kann einen Paddle Customer Portal Link erzeugen und an die App zurueckgeben.

Damit kann der User:

- Zahlungsdaten aktualisieren.
- Rechnung ansehen.
- Abo verwalten.
- Kuendigung oder Reaktivierung durchfuehren, je nach Paddle-Konfiguration.

Die App braucht dafuer nur einen Button:

```text
"Abo verwalten"
```

Dieser ruft `/api/billing/portal` auf und leitet den User zurueck zum
Paddle-Portal.

## Umsetzung in Phasen

### Phase 0: Paddle-Onboarding

- Paddle Account anlegen (Sandbox + Live).
- KYC-Daten einreichen (Identitaet, Steuerdaten, Bankverbindung,
  Webseiten-URL pro Brand). Achtung: Dieser Schritt kann mehrere Werktage
  dauern.
- Cloudflare Account anlegen, Pages-Projekt pro Brand vorbereiten.
- Datenbank: Cloudflare D1 pro Brand anlegen und Schema migrieren.
  *Entschieden: D1 (WEUR-Region) — siehe Setup-Doku.*
- E-Mail-Dienst: Resend pro Brand-Domain vorbereiten.
  *Entschieden: Resend (EU/Frankfurt) — siehe Setup-Doku.*

Ergebnis: Konten und Dienste sind grundsaetzlich verfuegbar.

### Phase 1: Oeffentliche Preis-Seite und Checkout

- `pricing.html` pro Brand bauen.
- Brand-/Paddle-Werte in `website/brands.json` pflegen.
- Paddle.js integrieren.
- Sandbox-Produkte und -Preise pro Brand anlegen.
- Checkout testen.

Ergebnis: User koennen zahlen, aber die App ist noch nicht hart geschuetzt.

### Phase 2: Webhook und Entitlements

- Serverless API einrichten (pro Brand eine Instanz).
- Paddle Webhook verifizieren.
- User und Subscription speichern.
- `/api/me` bauen.
- App zeigt Paywall, wenn kein Entitlement vorhanden ist.

Ergebnis: Zahlung fuehrt zu echtem serverseitigem Zugang.

### Phase 3: Magic-Link Login

- Magic-Link Endpunkte bauen.
- E-Mail Versand integrieren (Brevo/Resend).
- SPF/DKIM/DMARC pro Brand-Domain einrichten.
- Session Cookies einfuehren.
- App Login UI bauen.
- Rate-Limits auf Auth-Endpunkten aktivieren.

Ergebnis: User kann auf PC, Handy und Tablet sauber einloggen.

### Phase 4: Device-Limit

- `devices` und `sessions` aktiv nutzen.
- Maximal 3 aktive Geraete erlauben.
- Geraeteverwaltung bauen.
- Wechsel-Limit einfuehren.

Ergebnis: Normale Nutzung bleibt bequem, uebermaessiges Teilen wird begrenzt.

### Phase 5: Billing Portal, Refunds und Edge-Cases

- Paddle Customer Portal anbinden.
- Refund- und Adjustment-Webhooks behandeln.
- Grace Periods und `past_due`-Banner.
- Abo-Status in der App anzeigen.

Ergebnis: Realistische Abo-Lifecycles werden sauber gefahren.

### Phase 6: DSGVO und Betrieb

- Datenschutzerklaerung pro Brand erweitern.
- DPA mit Paddle und Mailer abschliessen.
- `/api/account/export` und `/api/account/delete` umsetzen.
- Monitoring (Webhook-Failures, Login-Failures) einrichten.
- Admin-/Support-Ansicht fuer User, Devices, Subscriptions.

Ergebnis: Sauberer Live-Betrieb.

## Setup-Checkliste vor Livegang

Die **operativen** Checklisten-Punkte (Paddle-KYC, Live-Webhook,
Mailer-Verify, D1-Backups, DNS-Records, Live-Real-Kauf) sind in den
Setup-Docs gepflegt:

- Paddle-Live-Items: [Setup Paddle Products, Prices, Discount-Codes.md §17](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md#17-pre-live-checkliste)
- Infrastruktur-Items: [Setup Infrastruktur Cloudflare, Resend und IONOS.md §12](./Setup%20Infrastruktur%20Cloudflare%2C%20Resend%20und%20IONOS.md#12-verifikation-und-smoke-tests)

Konzept-spezifische Items, die in den Setup-Docs **nicht** abgedeckt
sind und vor Live-Schaltung der App stehen muessen:

```text
[ ] Rate-Limits an Auth-Endpunkten aktiv und unter Last getestet
[ ] Geraete-Limit-UX einmal durchgespielt (4. Geraet, Abmelde-Flow)
[ ] DPA mit Paddle und Mailer unterzeichnet
[ ] Datenschutzerklaerung pro Brand auf Resend, Cloudflare, Paddle erweitert
[ ] Impressum-Hinweis auf Paddle (Merchant of Record) ergaenzt
[ ] Cookie-Hinweis aktualisiert (Paddle-Cookies, Session-Cookies)
[ ] /api/account/export liefert vollstaendigen JSON-Export
[ ] /api/account/delete loescht und anonymisiert wie vorgesehen
```

## Offene Entscheidungen

- Renewal-Reminder-Texte und exakte Kulanzregeln nach automatischer
  Verlaengerung.
- Kostenlose Demo: aktuell ist der Simulator hinter Auth/Paywall. Noch zu
  entscheiden ist, ob es spaeter eine zeitlich oder funktional begrenzte
  Demo-Version geben soll.
- Konkrete Preise fuer FitLine und Eqology, sobald deren Paddle-Produkte
  angelegt werden. LifePlus ist aktuell mit 19 EUR netto monatlich und
  180 EUR netto jaehrlich dokumentiert.
- Rate-Limiting und Anti-Abuse: finale Grenzwerte festlegen, aber Device-Limit
  als Hauptschutz beibehalten.
- Admin-/Support-Endpunkte fuer manuelle Revoke-, Export- und Loeschfaelle.

## Empfehlung

Die beste Balance fuer dieses Projekt, angepasst an den aktuellen Code:

- `pricing.html` als statische Pricing-Seite pro Brand, gerendert aus
  `website/brands.json`. Ein separates `pricing.json` existiert nicht.
- Monatsabo und Jahresabo parallel anbieten. Das Jahresabo bleibt die
  wirtschaftlich bevorzugte Option, weil die fixe Paddle-Gebuehr pro
  Transaktion bei niedrigen Monatspreisen deutlich staerker wirkt.
- Keine Cross-Sell-Mechanik zwischen Brands.
- Mehrfachkaeufe derselben Brand ueber `/api/billing/checkout-intent`
  abfangen; bei nicht erreichbarer API keinen Checkout starten.
- Paddle Overlay Checkout fuer Mobile und Desktop mit `customData.brand_id`
  und `customData.checkout_email`.
- Pro Brand getrennte Identitaeten, getrennte API-Instanz, getrennte
  Datenbank.
- Cloudflare Pages Functions + Cloudflare D1 + KV als aktuelle
  Implementierung; IONOS liefert Marketing-Site und App per SFTP aus.
- Resend als Mailer, mit verifizierter Brand-Domain und HTTPS-API.
- 3 aktive Geraete pro User. Ein zusaetzliches Wechsel-Limit pro 30 Tage ist
  noch nicht implementiert.
- Webhook-basierte Freischaltung mit Idempotenz via `webhook_events`.
- Rate-Limits und neutrale Antworten an allen Auth-Endpunkten.
- Grace Period bei `past_due` und Refund-/Adjustment-Handler.
- Datenschutz: DPA mit Paddle und Mailer, Datenresidenz EU, Datenexport-
  und Loesch-Endpunkte.

So bleibt die App leichtgewichtig, mobilfreundlich und statisch deploybar,
bekommt aber trotzdem eine echte Zahlungs-, Zugriffs- und Datenschicht, die
auch der ersten Pruefung standhaelt — und das in einem durchgaengigen
TypeScript-Stack ohne spaetere Migrations-Schmerzen.
