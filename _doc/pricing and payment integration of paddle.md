# Pricing and Payment Integration of Paddle

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
        | Webhooks: transaction.completed, subscription.created,
        |           subscription.updated, subscription.canceled,
        |           subscription.past_due, transaction.refunded,
        |           adjustment.created
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
  FitFlow360 will, kauft zwei Abos, kriegt zwei Rechnungen, hat zwei Konten.

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
- Bei Mehrfachkaeufen bekommt der Kunde mehrere Magic-Link-Mails und muss pro
  Brand getrennt einloggen. Wird in den Mails klar kommuniziert.

## Was funktioniert gut

Paddle passt gut zu dieser App, weil der Checkout im Browser geoeffnet werden
kann. Die Marketing-Site bleibt statisch, die React-App bleibt eine schnelle
Client-App, und Paddle uebernimmt Zahlung, Rechnungen, Steuern und Abo-Status.

Gut geeignet sind:

- `pricing.html` mit Produkt- und Preisuebersicht.
- Paddle Overlay Checkout per `Paddle.Checkout.open()`.
- Ein Preis pro Plan, zum Beispiel monatlich, jaehrlich und optional Lifetime.
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

Paddle ist nicht nur eine Zahlungs-API, sondern Merchant of Record. Das hat
praktische Folgen:

- **USt./Sales Tax**: Paddle berechnet, sammelt und fuehrt landesabhaengige
  Steuern selbst ab. Das Pricing kann brutto oder netto angezeigt werden.
  Paddle erkennt den Kunden-Standort und passt die angezeigten Preise an.
- **Rechnungen**: Paddle erstellt die Rechnung an den Endkunden im Namen von
  Paddle. Der Endkunde sieht Paddle auf der Rechnung, nicht den Verkaeufer
  direkt. Die Auszahlung an den Verkaeufer kommt periodisch von Paddle.
- **KYC / Onboarding**: Vor Live-Schaltung muss Paddle KYC-Daten pruefen
  (Identitaet, Steuer-ID, Bankverbindung, ggf. Webseite). Das dauert
  typischerweise einige Werktage und sollte vor jeder weiteren Planung
  angestossen werden.
- **B2B / VAT-ID**: Paddle bietet im Checkout die Eingabe einer
  Umsatzsteuer-ID an. Bei gueltiger EU-VAT-ID wird Reverse-Charge angewendet.
- **Auszahlung**: Paddle zahlt in vereinbarter Waehrung (z.B. EUR) periodisch
  aus. Wechselkurse, Auslandsgebuehren etc. uebernimmt Paddle.

Was bedeutet das fuer die App:

- Es ist **kein Stripe-Connect-artiges Setup noetig**.
- Es ist **kein eigenes Steuer- oder Rechnungssystem noetig**.
- Im Frontend keine eigenen Preisangaben mit USt. ausweisen, die spaeter
  abweichen koennten. Stattdessen das offizielle Paddle-Pricing als
  Quelle anzeigen (z.B. via `Paddle.PricePreview`).

## Empfohlene Komponenten

### 1. pricing.html

`pricing.html` sollte die oeffentliche Produkt- und Preisliste sein. Sie kann
aus einer zentralen Config generiert werden, zum Beispiel:

```text
website/pricing.json
```

Beispielstruktur:

```json
{
  "lifeplus": [
    {
      "id": "pro-monthly",
      "name": "Pro Monatlich",
      "priceLabel": "9 EUR / Monat",
      "paddlePriceIdSandbox": "pri_...",
      "paddlePriceIdLive": "pri_...",
      "features": [
        "Voller Simulator",
        "10-Jahres-Prognose",
        "Netzwerk-Ansichten"
      ]
    },
    {
      "id": "pro-yearly",
      "name": "Pro Jaehrlich",
      "priceLabel": "79 EUR / Jahr",
      "paddlePriceIdSandbox": "pri_...",
      "paddlePriceIdLive": "pri_...",
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
sind. Ein Nutzer kann zum Beispiel ein aktives Abo haben, ein Kulanz-Zugang
bekommen oder spaeter mehrere Brands freigeschaltet haben.

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

### Subscription Lifecycle

Folgende Paddle-Events werden verarbeitet:

```text
transaction.completed       -> Erstkauf oder Renewal
subscription.created        -> Neues Abo
subscription.updated        -> Plan-Wechsel, Reaktivierung, Pausierung
subscription.canceled       -> Kuendigung wirksam (ggf. mit Periodenende)
subscription.past_due       -> Zahlung fehlgeschlagen, Retry laeuft
transaction.refunded        -> Volle Rueckzahlung
adjustment.created          -> Teilrueckerstattung, Kulanz, Korrektur
customer.updated            -> E-Mail-Adresse geaendert
```

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

### Refunds und Chargebacks

Bei `transaction.refunded` oder Chargeback-Adjustments:

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

Setup pro Brand-Domain:

```text
SPF:    v=spf1 include:<mailer-spf-host> -all
DKIM:   Selektor und Public Key wie vom Mailer vorgegeben
DMARC:  v=DMARC1; p=quarantine; rua=mailto:dmarc@lifeflow360.app
```

Absender-Adressen je Brand:

```text
no-reply@lifeflow360.app
no-reply@fitflow360.triltsch.com  (spaeter no-reply@fitflow360.de)
no-reply@eqoflow360.triltsch.com  (spaeter no-reply@eqoflow360.de)
```

## Sandbox vs. Live

Paddle stellt eine Sandbox-Umgebung. Die ist nicht ein zweiter Account, sondern
ein paralleles Login unter `sandbox-vendors.paddle.com`. Sandbox-Webhooks
zeigen das Praefix `pdl_` etwas anders, vor allem aber sind die Customer IDs
und Subscription IDs nicht mit Live identisch.

Vorgehensweise:

```text
Schritt 1: Sandbox-Account anlegen.
Schritt 2: Sandbox-Produkte und -Preise pro Brand anlegen.
Schritt 3: VITE_PADDLE_ENV=sandbox lokal nutzen.
Schritt 4: Sandbox-Webhook-Endpunkt einrichten und mit ngrok/cloudflared
            lokal testen.
Schritt 5: Den vollen Happy Path testen: Kauf, Webhook, /api/me, Paywall weg.
Schritt 6: Negativ-Tests:
            - Refund -> Zugang weg
            - Cancel -> Zugang bleibt bis Periodenende
            - past_due simulieren -> Grace
            - Falsche Webhook-Signatur -> 401
            - Doppelter Webhook -> Idempotenz greift
Schritt 7: KYC bei Paddle Live anstossen.
Schritt 8: Live-Produkte/-Preise spiegeln.
Schritt 9: Live-Webhook umstellen, Vite-Env auf live.
Schritt 10: Einen kleinen Realkauf mit eigener Kreditkarte machen und
            sofort refunden, um den vollen Live-Loop zu validieren.
```

`pricing.json` fuehrt sowohl Sandbox- als auch Live-Price-IDs. Welche
verwendet wird, haengt an `VITE_PADDLE_ENV`.

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

Das Dokument geht in einem fruehen Entwurf von Cloudflare Pages aus. Tatsache
ist: Das aktuelle Deployment laeuft per SFTP zu klassischem Webhosting (siehe
[.vscode/sftp.json] und [scripts/build-webroot.mjs](scripts/build-webroot.mjs)).
Fuer den API-Teil gibt es deshalb drei realistische Optionen.

### Option 1: API als eigene Subdomain beim aktuellen Hoster

```text
api.lifeflow360.app  ->  PHP/Node am gleichen Server
```

Pro:
- Keine neue Infrastruktur.
- Bestehender Deploy-Flow via SFTP.

Kontra:
- Wartung, TLS, Sicherheits-Updates selbst.
- Cold-Starts und Skalierung muss manuell bedacht werden.
- Mehr Konfigurationsaufwand fuer Datenbank.

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

### Empfehlung

**Option 3 (Cloudflare Pages Functions + Neon EU) ist langfristig die beste
Loesung**, weil:

- Statische Site und API liegen auf einer Plattform.
- Skalierung ist quasi gratis.
- Mit Neon (Frankfurt) ist die Datenresidenz in der EU geklaert.

Wer einen weniger invasiven Schritt will, nimmt **Option 1** und betreibt nur
die API auf einer Subdomain beim bestehenden Hoster, ohne das Frontend zu
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
VITE_PADDLE_ENV=sandbox
VITE_PADDLE_CLIENT_TOKEN=test_...
VITE_PADDLE_PRICE_ID_PRO_MONTHLY=pri_...
VITE_PADDLE_PRICE_ID_PRO_YEARLY=pri_...
VITE_API_BASE_URL=https://api.lifeflow360.app
```

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

### Kosten-Einschaetzung

Stand Mai 2026 ist Cloudflare fuer einen sehr kleinen Start realistisch
kostenarm bis kostenlos nutzbar. Offizielle Referenzen:

- Cloudflare Workers/Pages Functions Pricing:
  https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers Limits:
  https://developers.cloudflare.com/workers/platform/limits/

Cloudflare Workers/Pages Functions Free Plan: 100.000 Requests pro Tag.

Cloudflare D1 Free Plan: 5 Millionen Reads/Tag, 100.000 Writes/Tag, 5 GB
Speicher.

Fuer ein Tool mit nur wenigen Kunden ist das API- und Datenbankvolumen sehr
klein. Die wahrscheinlicheren Kosten am Anfang sind:

- Domain.
- E-Mail Versanddienst, falls das Free-Kontingent nicht reicht.
- Paddle-Gebuehren pro Verkauf (5 % + 0,50 USD pro Transaktion typisch,
  aktuelle Werte beim Paddle-Pricing pruefen).
- Optional Datenbank-Paid-Tier fuer Backups/Branching.

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

`pricing.html` wird als neuer Eintrag in [website/templates/](website/templates/)
hinzugefuegt und in `build-webroot.mjs` mitgeneriert. Die Seite liest
`pricing.json` und rendert pro Brand die Plan-Karten. Paddle.js wird als
`<script>` eingebunden; beim Klick auf "Kaufen":

```text
Paddle.Checkout.open({
  items: [{ priceId: <PRICE_ID> }],
  customData: { brand_id: '<BRAND_ID>' },
  successUrl: '<BRAND_APP_URL>?checkout=success'
})
```

## Empfohlener Kauf- und Login-Flow

### Neuer Kunde

```text
1. User besucht pricing.html.
2. User waehlt Plan.
3. Paddle Checkout oeffnet sich.
4. User bezahlt mit E-Mail-Adresse.
5. Paddle sendet transaction.completed und subscription.created.
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
- Hosting-Entscheidung treffen (Option 1, 2 oder 3 oben).
- Datenbank-Wahl treffen (Neon EU empfohlen).
- E-Mail-Dienst-Wahl treffen (Brevo empfohlen).

Ergebnis: Konten und Dienste sind grundsaetzlich verfuegbar.

### Phase 1: Oeffentliche Preis-Seite und Checkout

- `pricing.html` pro Brand bauen.
- `pricing.json` einfuehren.
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

```text
[ ] Paddle KYC abgeschlossen.
[ ] Paddle Live-Produkte und -Preise pro Brand angelegt.
[ ] Webhook-Endpunkt Live erreichbar und Signaturpruefung getestet.
[ ] DPA mit Paddle unterzeichnet.
[ ] DPA mit Mailer unterzeichnet.
[ ] Datenbank in EU-Region (Neon Frankfurt o.ae.) angelegt.
[ ] Datenbank-Backups aktiviert.
[ ] SPF/DKIM/DMARC pro Brand-Domain in DNS gesetzt und verifiziert.
[ ] Magic-Link Mail-Template pro Brand getestet (Posteingang, nicht Spam).
[ ] Datenschutzerklaerung pro Brand aktualisiert und veroeffentlicht.
[ ] Impressum-Hinweis auf Paddle (Merchant of Record) ergaenzt.
[ ] Cookie-Hinweis aktualisiert (Paddle-Cookies, Session-Cookies).
[ ] Rate-Limits an Auth-Endpunkten aktiv und getestet.
[ ] Refund-Loop einmal mit Echtkauf durchgespielt (kleiner Realkauf + Refund).
[ ] Logging und Webhook-Failure-Alert aktiv (Mail oder Slack).
[ ] Geraete-Limit-UX einmal durchgespielt (4. Geraet, Abmelde-Flow).
[ ] /api/account/export liefert vollstaendigen JSON-Export.
[ ] /api/account/delete loescht und anonymisiert wie vorgesehen.
```

## Offene Entscheidungen

- Monatliches Abo, jaehrliches Abo oder Lifetime-Kauf? (Empfehlung: monatlich
  und jaehrlich; Lifetime erst, wenn das Produkt klar steht.)
- Kostenlose Demo: zeitlich begrenzt (z.B. 14 Tage Vollzugang) oder
  funktional begrenzt (z.B. nur 3-Jahres-Prognose)?
- Konkrete Preise pro Brand: zunaechst gleicher Preis ueber alle Brands,
  oder pro Brand differenziert?
- Hosting-Option: 1, 2 oder 3 oben? Sofort umziehen oder spaeter migrieren?
- Datenbank: Cloudflare D1 (mit Datenresidenz-Vorbehalt) oder Neon
  Frankfurt?
- E-Mail-Dienst: Brevo oder Resend?
- Money-Back-Garantie: Soll Paddle einen automatischen Refund-Zeitraum
  anbieten (z.B. 14 Tage)?

## Empfehlung

Die beste Balance fuer dieses Projekt:

- `pricing.html` als statische Pricing-Seite pro Brand, mit Paddle
  `PricePreview` fuer lokalisierte Preise.
- Paddle Overlay Checkout fuer Mobile und Desktop.
- Pro Brand getrennte Identitaeten, getrennte API-Instanz, getrennte
  Datenbank.
- Cloudflare Pages Functions als Serverless API, mit Neon Frankfurt als
  Datenbank. Wer das vermeiden will: API als Subdomain beim bestehenden
  Hoster.
- Magic-Link Login statt Passwort, mit Brevo oder Resend als Mailer und
  sauber gesetztem SPF/DKIM/DMARC.
- 3 aktive Geraete pro User, plus maximal 3 neue Geraete pro 30 Tage.
- Webhook-basierte Freischaltung mit Idempotenz via `webhook_events`.
- Rate-Limits und neutrale Antworten an allen Auth-Endpunkten.
- Grace Period bei `past_due` und sauberer Refund-Handler.
- Datenschutz: DPA mit Paddle und Mailer, Datenresidenz EU, Datenexport-
  und Loesch-Endpunkte.

So bleibt die App leichtgewichtig, mobilfreundlich und statisch deploybar,
bekommt aber trotzdem eine echte Zahlungs-, Zugriffs- und Datenschicht, die
auch der ersten Pruefung standhaelt.
