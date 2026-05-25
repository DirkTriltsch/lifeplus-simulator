# Setup Paddle: Products, Prices, Discount-Codes

Generischer Leitfaden fuer das Aufsetzen eines Paddle-Sandbox-/-Live-Kontos
mit Produkten, Preisen, Discount-Codes und Webhook-Integration. Konkretes
Beispiel: `LifeFlow360`-Brand. Werte und IDs sind aus einem real
durchgespielten Setup uebernommen — fuer eigene Projekte einfach den
Brand-Namen und die SKUs ersetzen.

Stand: 2026-05-22. Paddle **Billing v2** (Paddle Classic ist hier nicht
beschrieben).

---

## Inhaltsverzeichnis

- [1. Was du danach kannst](#1-was-du-danach-kannst)
- [2. Voraussetzungen](#2-voraussetzungen)
- [3. Architektur-Aha: Paddle als Merchant of Record](#3-architektur-aha-paddle-als-merchant-of-record)
- [4. Namens- und SKU-Konvention](#4-namens--und-sku-konvention)
  - [4.1 Schema](#41-schema)
  - [4.2 Segmente](#42-segmente)
  - [4.3 Beispiele](#43-beispiele)
  - [4.4 Ablage in Paddle](#44-ablage-in-paddle)
  - [4.5 Erweiterungs-Regeln](#45-erweiterungs-regeln)
- [5. Account-Vorbereitung — Settings](#5-account-vorbereitung--settings)
- [6. Approved Domains und Default Payment Link](#6-approved-domains-und-default-payment-link)
- [7. Client-side Token erzeugen](#7-client-side-token-erzeugen)
- [8. API Key plus Permissions-Matrix](#8-api-key-plus-permissions-matrix)
- [9. Produkt anlegen — Felder im Detail](#9-produkt-anlegen--felder-im-detail)
- [10. Preise anlegen — Felder im Detail](#10-preise-anlegen--felder-im-detail)
- [11. Discount-Codes anlegen](#11-discount-codes-anlegen)
- [12. Webhook-Destination und Event-Auswahl](#12-webhook-destination-und-event-auswahl)
- [13. Test-Daten (Karten, SEPA, PayPal)](#13-test-daten-karten-sepa-paypal)
- [14. Test-Ablauf](#14-test-ablauf)
- [15. Code-Bausteine](#15-code-bausteine)
  - [15.1 Webhook-Signatur-Verifikation](#151-webhook-signatur-verifikation)
  - [15.2 Webhook-Idempotenz und Event-Routing](#152-webhook-idempotenz-und-event-routing)
  - [15.3 Customer-Portal-Session mit Email-Fallback](#153-customer-portal-session-mit-email-fallback)
  - [15.4 Checkout-Intent-Endpoint](#154-checkout-intent-endpoint)
- [16. Haeufige Fallstricke](#16-haeufige-fallstricke)
- [17. Pre-Live-Checkliste](#17-pre-live-checkliste)
- [18. Wo weiterlesen](#18-wo-weiterlesen)

---

## 1. Was du danach kannst

- Ein Paddle-Sandbox-Konto mit Produkten, Preisen und Discount-Codes
  nach klarer Namenskonvention anlegen — so, dass neue Brands oder
  Plan-Varianten ohne Code-Refactor angehaengt werden koennen.
- Den Paddle-Checkout in eine eigene Marketing-Seite einbinden,
  inklusive korrekter Steuer-Behandlung (Netto/Brutto, Reverse-Charge).
- Webhook-Events idempotent verarbeiten und Signaturen verifizieren.
- Test-Kaeufe mit Sandbox-Karten und Discount-Codes durchspielen,
  inklusive Refunds und Cancel-Flows.
- Den Live-Gang ohne Ueberraschungen vorbereiten — KYC, Approved
  Domains, identische Konfig wie Sandbox.

---

## 2. Voraussetzungen

```text
Paddle Sandbox-Account     vorhanden (sandbox-vendors.paddle.com)
Eigene Domain              registriert und erreichbar via HTTPS
Backend-Endpoint           erreichbar fuer Webhook (z.B. Cloudflare Pages Functions)
Programmiersprache         beliebig (Beispiele hier in TypeScript)
HTTP/HMAC-Kenntnisse        ueber Webhook-Verifikation
```

Die Code-Beispiele in [Abschnitt 15](#15-code-bausteine) sind in
TypeScript fuer Cloudflare Pages Functions geschrieben. Die Logik
laesst sich aber 1:1 in PHP, Python, Go etc. uebersetzen.

---

## 3. Architektur-Aha: Paddle als Merchant of Record

Paddle ist nicht "nur" ein Payment-Gateway. Paddle ist
**Merchant of Record** — der formelle Verkaeufer gegenueber dem
Endkunden. Konsequenzen:

```text
                ┌─────────────────────────────┐
                │      Endkunde (Browser)     │
                └───────────────┬─────────────┘
                                │
                                ▼
                ┌─────────────────────────────┐
                │     Paddle-Checkout         │ ← Paddle.js, oeffentlich
                │     (Overlay)               │   Client-side Token
                └───────────────┬─────────────┘
                                │
            Webhook (HMAC)      │     Customer-Portal (Paddle-gehostet)
        ◀───────────────────────┤
        │                       ▼
┌───────┴───────────┐   ┌─────────────────┐
│  Backend-API      │   │   Paddle-API    │ ← API Key, privat
│  (Functions)      │──▶│   server2server │   Server-zu-Server
│                   │   └─────────────────┘
└───────────────────┘
```

**Was Paddle uebernimmt:**

- USt./Sales-Tax automatisch nach Kundenstandort
- Rechnungsstellung im Namen von Paddle
- Reverse-Charge bei B2B mit gueltiger EU-VAT-ID
- Compliance (KYC, AML)
- Zahlungs-Disputes und Chargeback-Handling
- Auszahlung an dich periodisch in vereinbarter Waehrung

**Was du uebernimmst:**

- Service-Bereitstellung
- Entitlement-Verwaltung (wer hat heute Zugang)
- Customer-Support fuer Produktfragen

### Paddle hat zwei Credentials — nicht verwechseln

```text
Client-side Token   z.B. "test_fee36ee3e68b2f654e1ad01ab59"
                    Oeffentlich, im Browser-JavaScript einsehbar.
                    Aufgabe: Paddle.Checkout.open() initialisieren.
                    → niemals server-only-Operationen damit ausfuehren.

API Key (Server)    z.B. "pdl_sdbx_apikey_01ks5xdh7b..."
                    Privat, nur im Backend (Cloudflare Secret).
                    Aufgabe: Customer-Portal-Sessions, Customer-Lookup,
                    Subscription-Operationen.
                    → niemals im Browser oder Repository ablegen.
```

Wer einmal versehentlich den API Key oeffentlich gemacht hat: sofort
revoken und neu erzeugen.

---

## 4. Namens- und SKU-Konvention

Die Konvention gilt fuer alle in Paddle angelegten Produkte und Preise
sowie fuer die zugehoerigen `custom_data`-Felder im Checkout. Sie ist
so geschnitten, dass neue Marken, Zielgruppen, Laufzeiten oder
Sitzplatz-Tiers durch Anhaengen eines neuen Segments oder Codes
ergaenzt werden koennen — **ohne dass bestehende Codes geaendert
werden muessen**.

### 4.1 Schema

```text
PRODUCT_CODE  =  <BRAND>-<AUDIENCE>-<TIER>[-<SEATS>]
PRICE_CODE    =  <BRAND>-<AUDIENCE>-<TIER>[-<SEATS>]-<PERIOD>
```

`SEATS` entfaellt bei Einzelplatz-Produkten und wird nur fuer
Mehr-Sitz-Angebote (Sponsor-Paket, Team-Lizenz, Enterprise) gesetzt.

### 4.2 Segmente

**BRAND** — Markenname ohne `360`-Suffix, in CamelCase:

```text
LifeFlow    LifeFlow360
FitFlow     FitFlow360
EqoFlow     EqoFlow360
```

Neue Marken: gleiches Muster (`BodyFlow`, `MindFlow`).

**AUDIENCE:**

```text
IND     Einzelplatz (1 Sitz)
SPO     Sponsor-Paket (Bulk-Lizenzen fuer die Downline eines Sponsors)
TEAM    Team-Lizenz (Firmenteam / Arbeitsgruppe)        - reserviert
ENT     Enterprise / Custom-Vertrag                     - reserviert
```

**TIER:**

```text
PRO     Voller Funktionsumfang (heutiger Standard)
LITE    Reduzierte Variante                              - reserviert
ULT     Premium inklusive priorisiertem Support          - reserviert
```

**SEATS** *(optional, nur wenn AUDIENCE ≠ IND)* — Ganzzahl ohne Einheit:

```text
5 | 10 | 25 | 50 | 100 | 250 | 500 | ...
```

**PERIOD:**

```text
MO      monatlich
QT      quartalsweise (3 Monate)
HY      halbjaehrlich (6 Monate)
YR      jaehrlich
2YR     zweijaehrig                                     - reserviert
LT      Lifetime (Einmalkauf)                           - reserviert
TRI     Trial / Gutschein-Zugang                        - reserviert
```

### 4.3 Beispiele

```text
LifeFlow-IND-PRO                     Produkt: Einzelplatz, Pro, LifeFlow
LifeFlow-IND-PRO-MO                  Preis:   Einzelplatz Pro Monatsabo
LifeFlow-IND-PRO-HY                  Preis:   Einzelplatz Pro Halbjahresabo
LifeFlow-IND-PRO-YR                  Preis:   Einzelplatz Pro Jahresabo

LifeFlow-SPO-PRO-50                  Produkt: Sponsor-Paket 50 Sitze
LifeFlow-SPO-PRO-50-QT               Preis:   Sponsor-Paket 50 Quartalsabo
LifeFlow-SPO-PRO-50-YR               Preis:   Sponsor-Paket 50 Jahresabo

FitFlow-IND-PRO-MO                   Preis:   FitFlow Einzelplatz Monatlich
EqoFlow-SPO-PRO-100-YR               Preis:   EqoFlow Sponsor-Paket 100 jaehrlich

LifeFlow-TEAM-PRO-25-YR              Preis:   Team-Lizenz 25 jaehrlich       (zukuenftig)
LifeFlow-IND-LITE-MO                 Preis:   Einzelplatz Lite Monatlich     (zukuenftig)
LifeFlow-IND-PRO-LT                  Preis:   Einzelplatz Lifetime           (zukuenftig)
```

### 4.4 Ablage in Paddle

Pro **Produkt** in Paddle:

- **Product name** (public): lesbarer Marketing-Name, z.B. `LifeFlow360 Pro`
- **Reference / internal code**: das Schema oben, z.B. `LifeFlow-IND-PRO`
- **custom_data**:
  ```json
  {
    "brand_id": "lifeplus",
    "public_name": "LifeFlow360",
    "audience": "IND",
    "tier": "PRO",
    "seats": 1
  }
  ```

Pro **Preis** in Paddle:

- **Price name** (public): lesbare Variante, z.B. `Monatlich` oder
  `Jahresabo - 15 EUR/Monat`
- **Internal description**: das Schema mit Period, z.B. `LifeFlow-IND-PRO-YR`
- **custom_data**:
  ```json
  {
    "brand_id": "lifeplus",
    "period": "YR"
  }
  ```

### 4.5 Erweiterungs-Regeln

- Niemals einen bestehenden Code umbenennen — Webhook-Daten haengen
  daran.
- Neue Marken: neuen `BRAND`-Eintrag hier in diesem Doc ergaenzen UND
  in der zugehoerigen brand-Konfig (z.B. `brands.json` im Web-Repo).
- Neue Audiences, Tiers, Perioden: erst hier eintragen, dann in Paddle
  anlegen.
- Reservierte Codes (oben markiert) duerfen ohne Aenderung dieses
  Dokuments verwendet werden — sie sind bereits eingeplant.

---

## 5. Account-Vorbereitung — Settings

Vor dem ersten Produkt drei Settings-Blocks ausfuellen.

### 5.1 Business profile

`Settings → Business`

- **Company name**: Firmenname / Einzelunternehmen-Name (laut Impressum)
- **Legal name**: bleibt der echte Rechtsname, z.B. `Dirk Triltsch`
- **Display name / Trading name**: der oeffentliche Name, der dem
  Endkunden in Bestaetigungsmails und Rechnungen erscheint, z.B.
  `LifeFlow360.app`. Wenn nicht gesetzt, faellt Paddle auf den Legal
  name zurueck — was bei einem persoenlichen Firmennamen unprofessionell
  wirkt.
- **Address**: vollstaendige Adresse (wird auf der Rechnung gezeigt)
- **Website**: `https://www.lifeflow360.app` (muss vor Approval auch
  unter [Abschnitt 6](#6-approved-domains-und-default-payment-link) als
  approved Domain eingetragen sein)

### 5.2 Default currency und Zahlungsmethoden

`Settings → Checkout → Payments`

- **Default currency**: `EUR` fuer DE-Markt
- **Erlaubte Zahlungsmethoden**: `Card`, `SEPA`, `PayPal` (alle drei
  empfohlen fuer DE)

### 5.3 Branding

`Settings → Checkout → Branding`

- **Brand color**: z.B. `#1D9E75` (Brand-Akzentfarbe)
- **Logo**: PNG, 90×90 px mit 6 px transparentem Rand (s. **Fallstrick**
  unten — 128 px wirkt im Email-Header riesig). Wichtig fuer Rechnungs-
  und Bestaetigungs-Mails.

**Lesson learned — Logo-Groesse fuer Email:** Paddle bettet das
Product-Icon in Bestaetigungsmails ein. Email-Clients (besonders
Outlook) rendern SVG inkonsistent oder gar nicht. Empfehlung:
**90×90 px PNG mit 6 px transparentem Rand**. Hochaufloesende Originale
(256×256) wirken in Emails uebergross.

---

## 6. Approved Domains und Default Payment Link

`Checkout → Website Approval`

Paddle erlaubt den Checkout nur von Domains, die im Konto explizit
approved sind. Lokale `localhost`-Tests **gehen nicht** — Paddle
akzeptiert keine IP-Adressen oder `localhost`-Eintraege.

```text
Eintrag:    paddle.com                   ✓ vorbelegt
Eintrag:    vendors.paddle.com           ✓ vorbelegt
Neu:        deine-domain.com             "Submit for Approval"
```

Anforderungen fuer Approval:

- Domain muss public erreichbar sein (HTTPS, gueltiges Zertifikat)
- Die Seite muss verlinken auf:
  - Terms of Service / AGB
  - Privacy Notice / Datenschutz
  - Refund Policy / Widerrufsbelehrung (fuer EU-Kunden)
- Sub-Subdomains werden separat approved (z.B. `app.deine-domain.com`
  erfordert eigenen Antrag).

Approval dauert typischerweise wenige Minuten bis wenige Stunden.

**Default payment link domain:** Die Domain, gegen die Paddle einen
gehosteten Payment-Link standardmaessig ausstellt. Sollte deine
Production-Domain sein, sobald approved.

---

## 7. Client-side Token erzeugen

`Developer tools → Authentication → Client-side tokens → + New token`

- **Name**: `LifeFlow360 Website`
- → erzeugt Token im Format `test_...` (Sandbox) oder `live_...` (Live)
- → **einmal sichtbar, sofort kopieren** und sicher ablegen.

Dieser Token ist **oeffentlich**. Er landet in der Frontend-Konfig
(`brands.json` → `paddle.clientToken`) und ist im Browser per
View-Source einsehbar. Das ist OK — er kann nur Checkouts oeffnen,
keine Server-Daten lesen oder schreiben.

---

## 8. API Key plus Permissions-Matrix

`Developer tools → Authentication → API keys → + New API Key`

- **Name**: `LifeFlow360 Production`
- **Permissions**: siehe Matrix unten — Minimalprinzip.
- **Expires**: setzen (z.B. 3 Monate), Rotation als Routine
- → erzeugt Key im Format `pdl_sdbx_apikey_...` (Sandbox) oder
  `pdl_live_apikey_...` (Live)
- → **einmal sichtbar, sofort kopieren** und in das Server-Secret-Store
  einreichen (z.B. Cloudflare Pages Secret).

### Permissions-Matrix

| Permission                       | Setzen?       | Wofuer                                          |
|----------------------------------|---------------|-------------------------------------------------|
| Customer portal sessions: WRITE | ✅ Ja          | `POST /customers/{id}/portal-sessions`         |
| Customers: READ                  | ✅ Ja          | Email-Lookup, Customer-Daten nachladen         |
| Customers: WRITE                 | 🟡 Optional   | Aktuell nicht genutzt, vorsorglich              |
| Subscriptions: READ              | ✅ Ja          | Status-Pruefung, Diagnose                       |
| Subscriptions: WRITE             | 🟡 Optional   | Falls Subscription per Code beendet werden soll |
| Transactions: READ               | ✅ Ja          | Refund-Handling, Status-Lookup                  |
| Transactions: WRITE              | 🟡 Optional   | Aktuell nicht genutzt                           |
| Adjustments: READ                | ✅ Empfohlen   | Refund-Details laden                            |
| **Komplett irrelevant**          | ❌ Nicht setzen | Products, Prices, Addresses, Businesses,        |
|                                  |               | Payment Methods, Notifications, Reports,         |
|                                  |               | API Keys, Client Tokens, Discounts,              |
|                                  |               | Discount Groups                                  |

**Lesson learned — minimaler Scope:** je weniger Permissions der API
Key hat, desto kleiner der Blast-Radius bei einem Leak. Discounts und
Notifications werden ausschliesslich ueber das Paddle-Dashboard
verwaltet, der API-Zugriff darauf ist nicht noetig.

---

## 9. Produkt anlegen — Felder im Detail

`Catalog → Products → + New Product`

Pro Feld: wer es sieht, welche Funktion es hat, welche Eingabe
sinnvoll ist.

### Product name *(Pflicht)*

- **Sichtbar fuer**: Endkunden im Checkout-Overlay, in
  Paddle-Rechnungen, in Bestaetigungsmails
- **Funktion**: marketing-lesbarer Name des Angebots
- **Eintrag**: z.B. `LifeFlow360 Pro`

### Tax category *(Optional, aber bitte setzen)*

- **Sichtbar fuer**: niemand direkt; wirkt sich auf die USt.-Berechnung
  pro Land aus
- **Optionen** (Auszug aus Paddle):
  - `Standard digital goods`
  - `Software as a Service (SaaS)`
  - `eBook`
  - `Implementation services`
  - `Training services`
  - `Website hosting`
- **Eintrag fuer SaaS-Simulator**: `Standard digital goods` oder
  `Software as a Service`

### Description *(Optional)*

- **Sichtbar fuer**: Paddle-Dashboard und teilweise Rechnungs-PDFs
- **Funktion**: Beschreibender Text fuer Audit/Doku
- **Eintrag**: 2-5 Saetze, was das Produkt umfasst (z.B.
  Funktionsumfang, Anzahl Geraete, Nutzungsdauer)

### Product icon URL *(Optional)*

- **Sichtbar fuer**: Endkunden im Checkout-Overlay (kleines Icon
  links vom Produktnamen), in Bestaetigungsmails
- **Funktion**: visueller Anker
- **Eintrag**: HTTPS-URL zu einer **PNG-Datei**, 90×90 px mit 6 px
  transparentem Rand. Z.B. `https://www.lifeflow360.app/paddle-icon.png`

### Custom Data *(Optional, empfohlen)*

- **Sichtbar fuer**: niemand direkt; im Webhook via Paddle-API-Lookup
  verfuegbar
- **Funktion**: Frei definierbare Metadaten
- **Eintrag (Key : Value, jeweils einzeln):**
  ```text
  brand_id     : lifeplus
  public_name  : LifeFlow360
  audience     : IND
  tier         : PRO
  seats        : 1
  ```

**Wichtig:** Die Product-/Price-Custom-Data im Dashboard ist nur
hilfreiche **Dashboard-/Audit-Ergaenzung**, nicht der primaere
Zuordnungspfad. Unser Webhook-Handler erhaelt `brand_id` zusaetzlich
direkt im `customData` des Checkout-Aufrufs (`Paddle.Checkout.open({
customData: { brand_id: 'lifeplus' } })`) — das ist der primaere und
zuverlaessige Weg, weil der Webhook das Feld direkt im Payload sieht
ohne API-Lookup.

---

## 10. Preise anlegen — Felder im Detail

Im Produkt → Tab `Prices` → `+ New Price`

### Base price *(Pflicht)*

- **Sichtbar fuer**: Endkunden im Checkout (Headline-Preis)
- **Funktion**: Betrag und Waehrung
- **Optionen Recurring**: `every 1 month` | `every 3 months` |
  `every 6 months` | `every 1 year` | `every 2 years` | `One-time`
- **Eintrag Beispiel**: `19.00 EUR`, recurring `every 1 month`

### Set local prices by country *(Optional)*

- **Sichtbar fuer**: Endkunden je nach IP-Standort
- **Funktion**: Pro Markt unterschiedliche Preise (CHF, USD, GBP …);
  Paddle erkennt das Land per IP
- **Eintrag**: fuer Start in EU leer lassen — nur EUR. Spaeter bei
  internationaler Expansion ergaenzen.

### Sales tax *(Pflicht)*

- **Sichtbar fuer**: Endkunden indirekt — bestimmt, wie der Preis auf
  der Rechnung ausgewiesen wird
- **Optionen**:
  - `Includes tax` — der eingegebene Preis ist brutto
  - `Excludes tax` — der eingegebene Preis ist netto, Paddle schlaegt
    USt. nach Kundenland drauf
- **Eintrag empfohlen**: `Excludes tax` (Netto).
  - Konsequenz: `19.00 EUR` netto → fuer DE-B2C `22.61 EUR` brutto
  - Bei B2B mit gueltiger EU-VAT-ID: Reverse-Charge greift, Endkunde
    zahlt `19.00 EUR` netto

**Lesson learned — Konsistenz zur Pricing-Seite:** Wenn auf der
Marketing-Site netto Preise stehen ("19 EUR netto, zzgl. USt."), muss
das Paddle-Setting `Excludes tax` sein. Sonst weichen Anzeige und
Checkout-Realitaet ab und der Kunde fuehlt sich getaeuscht.

### Free trial *(Optional)*

- **Sichtbar fuer**: Endkunden im Checkout als "X Tage kostenlos
  testen"
- **Optionen**: Anzahl Tage, z.B. `7` / `14` / `30`
- **Eintrag**: `0 days` (leer), wenn Trials ueber Discount-Codes
  abgewickelt werden

### Price name *(Optional)*

- **Sichtbar fuer**: Endkunden im Checkout-Overlay als Untertitel
- **Funktion**: lesbares Label fuer die Variante
- **Eintrag**: `Monatlich` oder `Jaehrlich`

### Internal description *(Pflicht, fuer SKU-Code)*

- **Sichtbar fuer**: nur im Dashboard
- **Funktion**: SKU / interner Code
- **Eintrag**: SKU laut Namenskonvention,
  z.B. `LifeFlow-IND-PRO-MO`

### Minimum quantity / Maximum quantity

- **Sichtbar fuer**: Endkunden (Mengenauswahl im Checkout)
- **Funktion**: wieviele Stueck pro Bestellung kaufbar
- **Eintrag**: `1 / 1` fuer Einzelplatz; bei Sponsor-Paket bleibt's bei
  `1 / 1`, weil die Sitze IM Paket enthalten sind, nicht als Multiplier
  daneben

### Custom Data *(Optional)*

- **Eintrag**:
  ```text
  brand_id   : lifeplus
  period     : MO     (oder YR, QT, HY)
  ```

→ Speichern → **Price-ID `pri_01...` notieren** und in die
Frontend-Konfig eintragen.

### Beispiel: Jahresabo

```text
Base price            180.00 EUR, recurring every 1 year
Local prices          (leer)
Sales tax             Excludes tax
                      → Brutto in DE: 214.20 EUR
Free trial            0 days
Price name            Jaehrlich
Internal description  LifeFlow-IND-PRO-YR
Min/Max quantity      1 / 1
Custom Data           brand_id : lifeplus
                      period   : YR
```

---

## 11. Discount-Codes anlegen

`Catalog → Discounts → + New discount`

**Lesson learned — alte vs. neue GUI:** Paddle hat das Discount-UI
mehrfach umbenannt. Hier die aktuellen Feldnamen (Stand 2026-05); die
fruehen Doku-Versionen nannten sie noch anders (z.B. "Code" statt
"Checkout discount code", "Usage limit" statt "Limit total redemptions").

### Felder im Detail

**Type:**
- Optionen:
  - `Percentage off` — prozentualer Rabatt
  - `Amount` — fester Betrag (z.B. 5 EUR weniger)
  - `Amount per unit` — fester Betrag pro Einheit (bei `quantity > 1`
    relevant)
- Eintrag fuer 100%-Test-Code: `Percentage off` mit Wert `100`

**Discount description:**
- Nur intern. Wozu ist der Code da?
- Eintrag: `Free access for early test users (no payment)`

**Recurring discount:**
- Optionen:
  - `Yes / Recurring` — Rabatt gilt fuer alle Renewals (dauerhaft)
  - `No / First-time only` — nur beim Erstkauf
- Eintrag fuer Test-User: `Yes`

**Set an expiration date:**
- Sicherheits-Hard-Stop. Code wird danach nicht mehr akzeptiert.
- Eintrag: `2026-12-31` (Test-Phase endet zum Jahresende)

**Limit total redemptions:**
- Maximale Anzahl Einloesungen ueber alle Kunden hinweg.
- Eintrag: `25` (Schutz vor unkontrollierter Verbreitung)

**Checkout discount code:**
- Der String, den der Kunde im Checkout eingibt.
- Eintrag: `EARLY2026`

**Limit to specific products:**
- Begrenzt, fuer welche Produkte/Preise der Rabatt gilt.
- **Wichtig**: bei spaeterem Sponsor-Paket (z.B. 5.000 EUR Lizenz)
  unbedingt einschraenken — sonst verschenkt der Code potenziell
  fuenfstellige Betraege.
- Eintrag fuer Einzelplatz-Test-Code:
  ```text
  Product name        LifeFlow360 Pro
  Prices              (leer = alle Preise dieses Produkts)
                      oder gezielt:
                      - LifeFlow-IND-PRO-MO
                      - LifeFlow-IND-PRO-YR
  ```

### Lesson learned: 100% Discount + keine Karte?

Paddle verlangt bei 100%-Rabatt **trotzdem** eine Zahlungsmethode:

- Discount koennte spaeter ablaufen → Karte wird fuer Renewal gebraucht
- Steuer-/Compliance-Anforderungen erfassen Billing-Details

Wenn du Test-User wirklich **ohne** Karten-Eingabe freischalten willst,
ist ein **eigener Admin-Endpoint** (`POST /api/admin/grant`) die
bessere Loesung. Dieser bypassed Paddle komplett und schreibt ein
Entitlement direkt in deine DB. Siehe Abschnitt
[16. Haeufige Fallstricke](#16-haeufige-fallstricke).

---

## 12. Webhook-Destination und Event-Auswahl

`Notifications → + New destination`

Beispielwerte:

```text
URL:               https://api.lifeflow360.app/api/paddle/webhook
Description:       LifeFlow360 API Sandbox
Notification type: Webhook
Usage type:        Platform
```

### Usage type: Platform vs. Marketplace

- **Platform** — Standard. Webhooks fuer dein eigenes Konto und deine
  eigenen Produkte. **Das brauchst du.**
- **Marketplace / Connect** — fuer Plattformen, auf denen andere
  Verkaeufer ihre Produkte verkaufen (Stripe-Connect-artig). Selten
  relevant.

### Events auswaehlen

Paddle bietet 50+ Events ueber 14 Kategorien. Wir abonnieren nur die,
die der Webhook-Handler tatsaechlich verarbeitet. Alle anderen werden
ohnehin nur ignoriert protokolliert.

**Subscription (8 Events — alle relevant):**

```text
✅ subscription.activated
✅ subscription.canceled
✅ subscription.created
✅ subscription.past_due
✅ subscription.paused
✅ subscription.resumed
✅ subscription.trialing
✅ subscription.updated
   subscription.imported    -- nicht noetig (nur fuer Migrationen)
```

**Transaction (3 ausgewaehlte):**

```text
✅ transaction.paid           (← in Billing v2; war frueher transaction.completed)
✅ transaction.payment_failed
✅ transaction.canceled
   transaction.billed          duplikat zu subscription.updated
   transaction.created         zu frueh im Lifecycle
   transaction.past_due        duplikat zu subscription.past_due
   transaction.ready           interner Zustand
   transaction.updated         zu laut
   transaction.revised         manuelle Korrektur, selten
```

**Adjustment (2 Events):**

```text
✅ adjustment.created         (Refunds, Kulanz, Storno)
✅ adjustment.updated         (Refund-State-Aenderungen)
```

**Alle anderen Kategorien**: bewusst NICHT abonnieren:

| Kategorie       | Warum nicht                                                 |
|-----------------|-------------------------------------------------------------|
| Product/Price   | Verwaltest du im Dashboard, kein Reaktionsbedarf            |
| Customer        | `customer.updated` koennte interessant sein, aktuell unnoetig |
| Payment Method  | Wird im Customer-Portal verwaltet, wir vertrauen Paddle     |
| Address/Business| Daten verwaltet Paddle als MoR komplett                     |
| Payout          | Auszahlung an dich, nicht User-relevant                     |
| Discount        | Verwaltest du im Dashboard                                  |
| Report          | Analytics                                                   |
| API Key/Client  | Security-Audit-Events, eher per Mail-Alert                  |

### Lesson learned: "Send test event" ist versteckt

In der Destinations-Liste fuehrt das `...`-Dropdown nur zu
`Edit destination`, `View logs`, `Copy ID`, `Deactivate`. **Es gibt
keinen offensichtlichen "Send test event"-Eintrag.** Den Test-Button
findest du:

- entweder per Klick auf die **Destination-Zeile** (nicht das
  `...`-Menue) → Detail-Ansicht oeffnet sich, dort gibt's einen
  prominenten "Send test event"-Button
- oder via "Edit destination" → unten im Dialog

### Lesson learned: Signing key

Nach dem ersten Speichern zeigt Paddle den **Signing key** (Webhook-
Secret) **einmal** in einem Popup. Sofort kopieren, sonst musst du
"Rotate signing key" benutzen, um einen neuen zu erzeugen.

```text
Format:  pdl_ntfset_01ks5ybc3wd1cfqaf0jh17baz4_zSkKcvnEOrguT3UC2CIV5xMybjxDExvD
```

Diesen Wert in das Server-Secret-Store einreichen, z.B.:

```powershell
$secret | npx wrangler pages secret put PADDLE_WEBHOOK_SECRET --project-name lifeflow360-api
```

---

## 13. Test-Daten (Karten, SEPA, PayPal)

### Test-Kreditkarten

Alle drei Felder muessen stimmen, sonst lehnt Paddle die Karte sofort
ab.

```text
SUCCESS (sofort erfolgreich, kein 3DS)
  Nummer       4000 0566 5566 5556
  Ablauf       beliebiges zukuenftiges Datum   (z.B. 12/30)
  CVC          100  (3-stellig)
  Name         beliebig

3D-SECURE SUCCESS  (Sandbox simuliert die 3DS-Challenge → "Complete" klicken)
  Nummer       4000 0027 6000 3184
  Ablauf       beliebiges zukuenftiges Datum
  CVC          100

GENERIC DECLINE
  Nummer       4000 0000 0000 0002
  Ablauf       beliebiges zukuenftiges Datum
  CVC          100

INSUFFICIENT FUNDS
  Nummer       4000 0000 0000 9995
  Ablauf       beliebiges zukuenftiges Datum
  CVC          100

EXPIRED CARD
  Nummer       4000 0000 0000 0069
  Ablauf       beliebiges Datum
  CVC          100

INCORRECT CVC
  Nummer       4000 0000 0000 0127
  Ablauf       beliebiges zukuenftiges Datum
  CVC          100
```

Falls eine Karte unerwartet abgelehnt wird: Paddle Sandbox rotiert
die Test-Karten gelegentlich. Aktuelle Liste in der Paddle-Sandbox-Doku.

### Test-SEPA / Test-IBAN

```text
Standard-Test-IBAN     DE89 3704 0044 0532 0130 00
Name                   beliebig
```

In Sandbox wird kein echtes Mandat eingezogen.

### Test-PayPal

In der Paddle-Sandbox triggert der "PayPal"-Button einen simulierten
Flow ohne echten PayPal-Login. Auf "Continue with PayPal" klicken,
Paddle simuliert automatisch einen erfolgreichen Zahlungs-Return.

### Test-Discount-Code

```text
Code        EARLY2026
Effekt      100% Rabatt auf alle Renewals
Gilt fuer   LifeFlow-IND-PRO (Einzelplatz Monatlich + Jaehrlich)
Limit       25 Einloesungen
Ablauf      2026-12-31
```

---

## 14. Test-Ablauf

### 14.1 Voraussetzungen

```text
✅ Approved Domain in Paddle (z.B. www.lifeflow360.app)
✅ Marketing-Site live auf der Domain deployt
✅ Discount-Code EARLY2026 aktiv
✅ brands.json mit Sandbox-Price-IDs und Client-Token befuellt
✅ pricing.html neu gebaut (Tokens reingerendert)
✅ Cloudflare-API erreichbar (Webhook-Endpoint funktioniert)
```

### 14.2 Happy-Path mit Discount-Code (0 EUR, kein Geld bewegt)

```text
1. Browser oeffnet  https://www.lifeflow360.app/pricing.html  (mit Strg+F5)
2. Klick auf "Jetzt monatlich starten" oder "Jetzt jaehrlich starten"
3. Email-Prompt erscheint → z.B. mail@example.com
4. Frontend ruft  POST /api/billing/checkout-intent  mit { priceId, email }
5. API antwortet mit action = "start_checkout"
6. Paddle-Overlay oeffnet sich mit dem Sandbox-Checkout
7. Discount-Code EARLY2026 eingeben → Endpreis 0.00 EUR
8. Restliche Felder ausfuellen (Email vorbefuellt)
9. "Pay" klicken
10. Paddle bestaetigt den Kauf → checkout.completed-Event feuert
11. Browser springt auf
    https://www.lifeflow360.app/app/?checkout=success&email=mail%40example.com
12. App zeigt Magic-Link Login; mit derselben Kauf-E-Mail anmelden.
13. Nach Webhook-Zustellung sieht /api/me ein aktives Entitlement.
14. Im Paddle-Sandbox-Dashboard pruefen:
    - Transactions   → neue Transaction mit 0.00 EUR
    - Subscriptions  → neues Abo im Status "active"
    - Customers      → neuer Customer mit dieser Email
```

### 14.3 Happy-Path mit Testkarte (Sandbox-Geld bewegt)

Wie 14.2, aber:

```text
6. (statt Discount) Zahlungsmethode "Card" waehlen
7. Test-Karte 4000 0566 5566 5556 eingeben, CVC 100, beliebiges Ablaufdatum
8. "Pay" → Transaction in voller Hoehe inkl. USt. sichtbar
```

### 14.4 Negativ-Tests

```text
Abgelehnte Karte
  Karte 4000 0000 0000 0002 → Paddle zeigt Fehler, keine Transaction

Karte ohne Deckung
  Karte 4000 0000 0000 9995 → "insufficient funds"

3D-Secure
  Karte 4000 0027 6000 3184 → 3DS-Fenster mit "Complete" bestaetigen

Refund
  Sandbox-Dashboard → Transactions → "Refund"
  → Webhook adjustment.created   (in Billing v2 KEIN transaction.refunded)
  → handleRefund() setzt Entitlement-valid_until auf jetzt, source = "refund_revoked"

Kuendigung im Customer Portal
  Customer Portal Link aus Sandbox-Dashboard oeffnen → "Cancel subscription"
  → subscription.canceled-Event
  → current_period_ends_at bleibt erhalten, Zugang laeuft bis Periodenende
```

### 14.5 Was im Dashboard zu pruefen ist

```text
Customers      → Eintrag mit Test-Email
Transactions   → jede Zahlung (auch 0 EUR durch Discount) einzeln sichtbar
Subscriptions  → bei Recurring-Plans, Status "active" / "trialing"
Invoices       → PDF-Rechnung automatisch generiert, "PADDLE SANDBOX"-Wasserzeichen
Notifications  → Webhook-Delivery-Status, Retries, Response-Bodies
```

---

## 15. Code-Bausteine

Die folgenden Snippets sind das funktionale Minimum, mit dem die
Paddle-Integration sauber laeuft. TypeScript, gedacht fuer Cloudflare
Pages Functions — 1:1 in andere Backends portierbar.

### 15.1 Webhook-Signatur-Verifikation

`functions/_lib/paddle-sig.ts`:

```typescript
import { hmacSha256Hex, timingSafeEqual } from './crypto';

// Paddle Billing webhook signature format:
//   Paddle-Signature: ts=1700000000;h1=<hex-hmac-sha256>
// The signed payload is `${ts}:${rawBody}`.

const MAX_SKEW_MS = 5 * 60_000;

export async function verifyPaddleSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
  now: number,
): Promise<{ valid: boolean; reason?: string }> {
  if (!signatureHeader) return { valid: false, reason: 'missing_signature' };

  const parts = signatureHeader.split(';').map((p) => p.trim());
  let ts: string | null = null;
  let h1: string | null = null;
  for (const part of parts) {
    if (part.startsWith('ts=')) ts = part.slice(3);
    else if (part.startsWith('h1=')) h1 = part.slice(3);
  }
  if (!ts || !h1) return { valid: false, reason: 'malformed_signature' };

  const tsMs = Number(ts) * 1000;
  if (!Number.isFinite(tsMs)) return { valid: false, reason: 'bad_timestamp' };
  if (Math.abs(now - tsMs) > MAX_SKEW_MS) return { valid: false, reason: 'timestamp_skew' };

  const expected = await hmacSha256Hex(secret, `${ts}:${rawBody}`);
  if (!timingSafeEqual(expected, h1)) return { valid: false, reason: 'bad_hmac' };

  return { valid: true };
}
```

**Drei wichtige Punkte:**

- Der **rohe** Body wird signiert, nicht ein JSON-geparstes Objekt.
  Im Webhook-Handler also `await request.text()` **bevor**
  `JSON.parse()`.
- `MAX_SKEW_MS = 5 Min` schuetzt gegen Replay-Attacken.
- `timingSafeEqual` statt `===` verhindert Timing-Side-Channels.

### 15.2 Webhook-Idempotenz und Event-Routing

`functions/api/paddle/webhook.ts` — Auszug der Kernlogik:

```typescript
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  if (!env.PADDLE_WEBHOOK_SECRET) return error(500, 'webhook_secret_missing');

  // 1. Raw body lesen BEVOR JSON.parse
  const rawBody = await request.text();

  // 2. HMAC-Signatur pruefen
  const verified = await verifyPaddleSignature(
    env.PADDLE_WEBHOOK_SECRET,
    rawBody,
    request.headers.get('paddle-signature'),
    nowMs(),
  );
  if (!verified.valid) return error(401, 'bad_signature', verified.reason);

  // 3. Erst dann JSON parsen
  const event = JSON.parse(rawBody) as PaddleEvent;
  const eventId = event.event_id;
  const eventType = event.event_type;
  if (!eventId || !eventType) return error(400, 'missing_event_fields');

  // 4. Idempotenz via INSERT OR IGNORE
  const insertResult = await env.DB.prepare(
    'INSERT OR IGNORE INTO webhook_events (id, type, payload_json, received_at) VALUES (?, ?, ?, ?)',
  ).bind(eventId, eventType, rawBody, nowMs()).run();
  const isNew = (insertResult.meta?.changes ?? 0) > 0;

  // 5. Wenn schon verarbeitet (processed_at != null), 200 zurueck
  if (!isNew) {
    const existing = await env.DB.prepare(
      'SELECT processed_at FROM webhook_events WHERE id = ? LIMIT 1',
    ).bind(eventId).first<{ processed_at: number | null }>();
    if (existing?.processed_at !== null && existing?.processed_at !== undefined) {
      return text('duplicate', 200);
    }
  }

  // 6. Event verarbeiten
  try {
    await processEvent(env, event);
    await env.DB.prepare('UPDATE webhook_events SET processed_at = ? WHERE id = ?')
      .bind(nowMs(), eventId).run();
  } catch (err) {
    console.error('webhook_process_failed', eventType, err);
    return error(500, 'process_failed', String(err));
  }

  return json({ ok: true });
};

async function processEvent(env: Env, event: PaddleEvent): Promise<void> {
  const type = event.event_type ?? '';
  const data = event.data ?? {};

  switch (type) {
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.activated':
    case 'subscription.canceled':
    case 'subscription.past_due':
    case 'subscription.paused':
    case 'subscription.resumed':
    case 'subscription.trialing':
      await upsertSubscription(env, data);
      break;

    case 'transaction.paid':
      // Billing v2 — frueher hiess das "transaction.completed".
      // Bei Subscription-Plans ist subscription.updated die kanonische
      // Quelle; transaction.paid wird hier nur fuer One-Shots benutzt.
      if (data.subscription_id) {
        await storeTransactionForSubscription(env, data);
      } else {
        await applyOneShotPurchase(env, data);
      }
      break;

    case 'transaction.payment_failed':
    case 'transaction.canceled':
      // Soft events — Subscription-State folgt separat
      break;

    case 'adjustment.created':
    case 'adjustment.updated':
      // Refunds, Credits, Chargeback-Adjustments → Entitlement entziehen
      await handleRefund(env, data);
      break;

    default:
      // Unhandled — bleibt in webhook_events fuer Audit
      break;
  }
}
```

**Lesson learned — Event-Namen Billing v2:**

- `transaction.completed` (Paddle Classic) → in Billing v2 **`transaction.paid`**
- `transaction.refunded` existiert in Billing v2 **nicht** — Refunds
  kommen via `adjustment.created`

### 15.3 Customer-Portal-Session mit Email-Fallback

Edge-Case: Ein User loggt sich per Magic-Link ein, hat aber in der
lokalen DB keinen `paddle_customer_id` (z.B. weil der Subscription-
Webhook bei einem fruehen Test-Kauf verpasst wurde). Der direkte
Customer-Portal-Aufruf wuerde scheitern. Loesung: Fallback ueber
Paddle-Customer-API per Email.

`functions/api/billing/portal.ts`:

```typescript
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return error(401, 'unauthenticated');

  const ctx = await loadSessionFromToken(env, token);
  if (!ctx) return error(401, 'unauthenticated');

  if (!env.PADDLE_API_KEY) return error(500, 'paddle_api_key_missing');

  const apiBase = env.PADDLE_ENV === 'live'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';

  let customerId: string | null = null;

  // 1. D1-Lookup
  const cached = await env.DB.prepare(
    `SELECT paddle_customer_id FROM subscriptions
       WHERE user_id = ? AND paddle_customer_id IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
  ).bind(ctx.user.id).first<{ paddle_customer_id: string }>();

  if (cached?.paddle_customer_id) {
    customerId = cached.paddle_customer_id;
  } else {
    // 2. Fallback: Paddle-API per Email durchsuchen
    customerId = await findPaddleCustomerByEmail(env, apiBase, ctx.user.email);
  }

  if (!customerId) return error(404, 'no_customer');

  // 3. Portal-Session erzeugen
  const res = await fetch(
    `${apiBase}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.PADDLE_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    return error(502, 'paddle_portal_failed', body.slice(0, 200));
  }

  const data = await res.json() as { data?: { urls?: { general?: { overview?: string } } } };
  const url = data.data?.urls?.general?.overview;
  if (!url) return error(502, 'paddle_portal_url_missing');

  return json({ url });
};

async function findPaddleCustomerByEmail(
  env: Env,
  apiBase: string,
  email: string,
): Promise<string | null> {
  const url = `${apiBase}/customers?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${env.PADDLE_API_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json() as { data?: Array<{ id?: string; email?: string }> };
  const match = data.data?.find((c) => c.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}
```

**Aha**: Der Email-Lookup braucht nur **READ**-Permission auf
Customers, kein WRITE. Minimaler API-Key-Scope reicht.

### 15.4 Checkout-Intent-Endpoint

Vor dem Oeffnen des Paddle-Overlays prueft der Server, ob der
gleichnamige User schon ein aktives Abo hat. Verhindert
Doppel-Subscriptions und gibt dem Frontend einen klaren
naechsten-Schritt-Hinweis.

`functions/api/billing/checkout-intent.ts`:

```typescript
interface Body { priceId?: string; email?: string; }
const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function allowedPriceIds(env: Env): Set<string> {
  return new Set([env.PADDLE_PRICE_MONTHLY, env.PADDLE_PRICE_YEARLY].filter(Boolean));
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const body = (await request.json()) as Body;
  const priceId = (body.priceId ?? '').trim();
  if (!priceId) return error(400, 'missing_price_id');
  if (!allowedPriceIds(env).has(priceId)) return error(400, 'invalid_price_id');

  // 1. Logged-in User?
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  let userId: string | null = null;
  let email: string | null = null;

  if (token) {
    const ctx = await loadSessionFromToken(env, token);
    if (ctx) { userId = ctx.user.id; email = ctx.user.email; }
  }

  // 2. Sonst per Email-Hinweis aus dem Frontend
  if (!userId) {
    const claimedEmail = (body.email ?? '').trim().toLowerCase();
    if (claimedEmail && EMAIL_RX.test(claimedEmail)) {
      const existing = await findUserByEmail(env, claimedEmail);
      if (existing) { userId = existing.id; email = existing.email; }
      else return json({ action: 'start_checkout', email: claimedEmail });
    } else return json({ action: 'login_required' });
  }

  if (!userId || !email) return json({ action: 'start_checkout' });

  // 3. Aktiv?
  const entitlement = await getEntitlementForBrand(env, userId, env.BRAND_ID);
  if (isEntitlementActive(entitlement, nowMs())) {
    return json({ action: 'already_active', email });
  }

  // 4. Offene Sub vorhanden?
  const hasOpenSub = await env.DB.prepare(
    `SELECT id, status FROM subscriptions
       WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due')
       LIMIT 1`,
  ).bind(userId).first<{ id: string; status: string }>();

  if (hasOpenSub) return json({ action: 'manage_subscription', email });

  // 5. Default: Checkout starten
  return json({ action: 'start_checkout', email });
};
```

Mapping der Actions im Frontend:

```text
action = "start_checkout"        → Paddle.Checkout.open(...)
action = "already_active"        → redirect zur /app
action = "manage_subscription"   → redirect zum Customer-Portal
action = "login_required"        → Magic-Link-Flow starten
```

---

## 16. Haeufige Fallstricke

### "Send test event fehlt im Dropdown"

**Symptom:** Im `...`-Menue der Webhook-Destination siehst du nur
`Edit destination`, `View logs`, `Copy ID`, `Deactivate`.

**Ursache:** Paddle hat den Test-Button in die Detail-Ansicht
verschoben, nicht ins Dropdown.

**Loesung:** Klick **auf die Destination-Zeile** (nicht das `...`).
In der Detail-Ansicht ist der Button "Send test event" prominent.

### "transaction.completed" und "transaction.refunded" gibt es nicht mehr

**Symptom:** Webhook-Handler ignoriert eingehende Events stillschweigend,
weil die Event-Namen aus alter Doku nicht mehr matchen.

**Ursache:** Paddle Billing v2 hat die Event-Namen geaendert:
- `transaction.completed` → **`transaction.paid`**
- `transaction.refunded` → **`adjustment.created`** (mit Refund-Reason)

**Loesung:** Switch-Case-Statement im Handler an Billing v2 anpassen.
Siehe [15.2](#152-webhook-idempotenz-und-event-routing).

### "Localhost geht nicht im Checkout"

**Symptom:** Paddle-Overlay laesst sich aus einer lokalen Entwicklungs-
URL (`localhost:3000`, `127.0.0.1`) nicht oeffnen.

**Ursache:** Paddle erlaubt Checkouts nur von approved Domains. IP und
`localhost` werden grundsaetzlich nicht akzeptiert.

**Loesung:** Lokal mit einem HTTPS-Tunnel (Cloudflare Tunnel, ngrok)
arbeiten oder direkt gegen eine approved Staging-Domain entwickeln.

### "Discount-Code 100% verlangt trotzdem eine Karte"

**Symptom:** Test-User soll 100% Discount nutzen, Paddle fordert
trotzdem Karteneingabe.

**Ursache:** Paddle verlangt grundsaetzlich Billing-Details, auch bei
0 EUR — Discount koennte ablaufen, Compliance fordert Adresse.

**Loesung:** Fuer Test-User-Zugang ohne Karte einen eigenen
Admin-Endpoint `POST /api/admin/grant` bauen, der direkt ein Entitlement
in der DB anlegt und Paddle umgeht. Empfehlung: Test-User immer ueber
diesen Endpoint freischalten, Paddle-Discount-Code nur fuer echte
Kunden mit Sonderpreis.

### "Customer Portal Button klickt sich tot"

**Symptom:** User klickt "Abo verwalten" → nichts passiert oder
generische Fehlermeldung.

**Ursache:** Keine `paddle_customer_id` in unserer DB fuer diesen User
(z.B. Webhook eines fruehen Test-Kaufs verpasst).

**Loesung:** Email-Fallback im Portal-Endpoint, siehe
[15.3](#153-customer-portal-session-mit-email-fallback). Zusaetzlich
im Frontend den Fehler sichtbar machen statt zu schlucken.

### "Reverse-Charge funktioniert nicht"

**Symptom:** B2B-Kunde aus DE mit gueltiger VAT-ID bekommt trotzdem
USt. berechnet.

**Ursache 1:** Price-Setting `Sales tax` ist auf `Includes tax`
statt `Excludes tax`.

**Ursache 2:** Kunde hat im Checkout keine VAT-ID eingegeben, oder
die VAT-ID ist ungueltig (Paddle pruegt via VIES).

**Loesung:** `Excludes tax` als Standard fuer EU-B2B-faehige Produkte.
Paddle wendet Reverse-Charge automatisch an, sobald eine valide
EU-VAT-ID im Checkout erfasst wird.

### "Webhook 401 bad_signature"

**Symptom:** Paddle zeigt Failed-Webhooks mit HTTP 401, eigene Logs
zeigen `bad_signature`.

**Ursache 1:** `PADDLE_WEBHOOK_SECRET` stimmt nicht (Tippfehler, alter
Wert nach Rotation).

**Ursache 2:** Webhook-Handler parst den Body, **bevor** signiert wird
— gehasht wird dann eine modifizierte Form, nicht das, was Paddle
signiert hat.

**Loesung:** Im Webhook-Handler **zuerst** `await request.text()` →
diesen `rawBody` in `verifyPaddleSignature()` geben → **dann erst**
`JSON.parse(rawBody)`.

### "Alte vs. neue Paddle-GUI verwirrend"

**Symptom:** Doku zeigt Feldnamen, die in der UI nicht zu finden sind.

**Ursache:** Paddle hat das Discount-UI und einige
Notification-Settings mehrfach umbenannt. Beispiele:

```text
ALT (frueher genannt)                       NEU (aktuell)
─────────────────────────────────────────────────────────────────
"Code"                                  →   "Checkout discount code"
"Usage limit"                           →   "Limit total redemptions"
"Restrict to products"                  →   "Limit to specific products"
"Expires"                               →   "Set an expiration date"
"transaction.completed" (Billing v1)    →   "transaction.paid" (Billing v2)
```

**Loesung:** Bei jeder Setup-Session auf die aktuelle UI achten und
ggf. via "Suchen"-Funktion im Paddle-Dashboard nach Stichworten suchen.

---

## 17. Pre-Live-Checkliste

Bevor Sandbox auf Live umgestellt wird:

```text
[ ] KYC vollstaendig in Paddle eingereicht und durch
[ ] Live-API-Key generiert, Permissions identisch zu Sandbox
[ ] Live-Client-Token generiert und in Frontend-Konfig eingetragen
[ ] Live-Webhook-Destination angelegt
[ ] Live-Webhook-Secret im Server-Secret-Store hinterlegt
[ ] Live-Approved-Domain in Paddle gesetzt und genehmigt
[ ] Live-Default-Payment-Link-Domain gesetzt
[ ] Live-Produkte mit identischen SKUs wie Sandbox angelegt
[ ] Live-Preise mit identischem Sales-tax-Verhalten (Excludes tax)
[ ] Live-Discount-Codes (falls oeffentlich) eingerichtet
[ ] PRODUKTIONS-Discount-Code begrenzt (Expiration + Redemptions)
[ ] AGB, Datenschutz, Widerruf live auf der Domain
[ ] Echter Test-Kauf mit eigener Kreditkarte (kleiner Betrag), dann Refund
[ ] Refund-Webhook-Loop validiert
[ ] PADDLE_ENV-Variable im Backend auf "live" umgestellt
[ ] Frontend-brands.json auf Live-IDs umgestellt
[ ] Monitoring fuer Webhook-Failures aktiv
```

---

## 18. Wo weiterlesen

- Paddle Billing v2 — Webhooks und Signature Verification:
  <https://developer.paddle.com/webhooks/signature-verification>
- Paddle API Reference (Customers, Subscriptions, Adjustments):
  <https://developer.paddle.com/api-reference/overview>
- Paddle Sandbox-Testkarten (Liste wird gelegentlich aktualisiert):
  <https://developer.paddle.com/concepts/payment-methods/credit-debit-card>
- Paddle Customer Portal:
  <https://developer.paddle.com/concepts/customer-portal/overview>

### Verwandte Dokumente in diesem Repo

- `_doc/Produkt-Namenskonvention.md` — Quelle der SKU-Konvention,
  hier in [Abschnitt 4](#4-namens--und-sku-konvention) konsolidiert
- `_doc/Product, Pricing and Discount-Codes in Paddle.md` —
  projekt-spezifischer Walkthrough mit `LifeFlow360`-Werten, hier
  generisch aufbereitet
- `_doc/Setup Infrastruktur Cloudflare, Resend und IONOS.md` —
  Infrastruktur-Seite (Hosting, Email, DNS), das Komplementaer-Stueck
  zu diesem Paddle-Doc
- `_doc/Cloudflare, Resend und IONOS - Setup.md` —
  projekt-spezifischer Cloudflare-Walkthrough

---

## Annahmen

- Paddle **Billing v2**, nicht Paddle Classic. Bei Classic sind
  Event-Namen, API-Pfade und manche Felder anders.
- Steuer-Setup auf **EU-Markt** ausgelegt (`Excludes tax` als Default,
  Reverse-Charge fuer EU-B2B). Fuer andere Maerkte ggf. anders.
- Code-Beispiele sind TypeScript fuer Cloudflare Pages Functions. Die
  Logik ist sprachunabhaengig, der HMAC-Algorithmus und das
  Signaturformat sind in jeder Sprache reproduzierbar.
- Naming-Konvention (Abschnitt 4) ist eine Empfehlung aus dem
  Beispiel-Projekt. Andere Projekte koennen ein eigenes SKU-Schema
  fahren — dann diesen Abschnitt entsprechend anpassen.
