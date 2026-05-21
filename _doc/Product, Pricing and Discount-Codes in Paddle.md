# Product, Pricing and Discount-Codes in Paddle

Vollstaendiger Walkthrough fuer die Sandbox-Einrichtung der LifePlus-Brand.
Erklaert jedes Feld in der Paddle-UI (wer sieht es, welche Funktion, welche
Eingabe) und dokumentiert die konkreten Werte, die wir eingetragen haben.

Stand: Mai 2026. Sandbox.

---

## A. Vorbereitung – Settings

### A.1 Business profile

`Settings -> Business`

- **Company name**: Firmenname / Einzelunternehmen-Name (laut Impressum)
- **Address**: Adresse aus `_contact` in [website/brands.json](../website/brands.json)
- **Website**: `https://www.lifeflow360.app`

### A.2 Default currency

`Settings -> Checkout -> Payments`

- **Default currency**: `EUR`
- **Erlaubte Zahlungsmethoden**: Card, SEPA, PayPal

### A.3 Branding

`Settings -> Checkout -> Branding`

- **Brand color**: `#1D9E75` (LifeFlow360-Akzent)
- **Logo**: spaeter, sobald die Brand-Seite live ist. In Sandbox optional.

---

## B. Product 1 – Einzelplatz Pro

`Catalog -> Products -> + New Product`

### Felder im Detail

**Product name**
- Sichtbar fuer: Endkunden im Checkout-Overlay, in Paddle-Rechnungen und in Bestaetigungsmails.
- Funktion: Marketing-lesbarer Name des Angebots.
- Eintrag: `LifeFlow360 Pro`

**Tax category** *(Optional, bitte setzen)*
- Sichtbar fuer: niemand direkt. Wirkt sich auf USt.-Berechnung pro Land aus.
- Funktion: Paddle wendet je nach Kategorie und Kundenland die richtige Steuer an.
- Eintrag: `Standard digital goods`

**Description** *(Optional)*
- Sichtbar fuer: in der Regel nicht im Checkout, aber im Paddle-Dashboard und teilweise in Rechnungs-PDFs.
- Funktion: Beschreibender Text zum Produkt.
- Eintrag:
  ```text
  Voller Zugang zum LifeFlow360-Verguetungs-Simulator fuer einen Sponsor.
  Alle Funktionen ohne Einschraenkung: 5-Slider-Simulator, 10-Jahres-Verlauf,
  Ziele-Leiter, Netzwerk-Visualisierungen.

  Nutzbar auf bis zu 3 Geraeten gleichzeitig (Handy, Tablet, Desktop).
  ```

**Product icon URL** *(Optional)*
- Sichtbar fuer: Endkunden im Checkout-Overlay als kleines Icon links neben dem Produktnamen.
- Funktion: Visueller Anker, erhoeht Vertrauen.
- Eintrag: leer. Sobald die Marketing-Site live ist, eintragen:
  `https://www.lifeflow360.app/favicon.svg`

**Custom Data** *(Optional)*
- Sichtbar fuer: niemand. Im Webhook ueber den Paddle-API-Lookup verfuegbar.
- Funktion: Frei definierbare Metadaten zum Produkt.
- Eintrag (Key : Value):
  ```text
  brand : LifeFlow360
  ```

Hinweis zur Konsistenz: in der Namenskonvention ist `LifeFlow` der SKU-Praefix
(ohne 360). Hier verwenden wir den vollen Marketing-Namen `LifeFlow360`. Beide
nebeneinander sind OK — der eine ist Code-Praefix, der andere ist
Anzeige-/Routing-Name.

### B.1 Preis: Monatsabo

Im neu erstellten Product → Tab `Prices` → `+ New Price`

**Base price**
- Sichtbar fuer: Endkunden im Checkout (Headline-Preis).
- Funktion: Preisbetrag und Waehrung.
- Eintrag: `19.00 EUR`, recurring **every 1 month**

**Set local prices by country** *(Optional)*
- Sichtbar fuer: Endkunden, je nachdem aus welchem Land sie kaufen.
- Funktion: Pro Markt unterschiedlicher Preis (z.B. CHF, USD). Paddle erkennt das Land per IP.
- Eintrag: leer. Nur EUR fuer den Start.

**Sales tax**
- Sichtbar fuer: Endkunden indirekt — bestimmt, wie der Preis auf der Rechnung aufgeschluesselt wird.
- Funktion: Legt fest, ob der eingegebene Base price brutto oder netto ist.
- Eintrag: **`Excludes tax`** (= Netto).

  Konsequenz: 19 EUR ist der Nettopreis. Paddle schlaegt im Checkout die
  laenderspezifische USt. drauf. Fuer Deutschland: Endkunde zahlt **22,61 EUR
  brutto**. Bei B2B mit gueltiger VAT-ID greift Reverse-Charge und es bleiben
  19 EUR netto.

  **Anpassungsbedarf in [pricing.html](../website/templates/pricing.html):**
  Aktuell steht dort `19 EUR/Monat` und `€19 monatlich`. Das muss entweder zu
  `19 EUR netto / 22,61 EUR brutto` oder zu reinen Brutto-Werten geaendert
  werden, damit der Preis im Overlay zur Erwartung auf der Seite passt.

**Free trial** *(Optional)*
- Sichtbar fuer: Endkunden im Checkout als "X Tage kostenlos testen".
- Funktion: Trial-Periode vor der ersten Abbuchung.
- Eintrag: leer / `0 days`. Trial-Logik laeuft bei uns ueber Discount-Codes.

**Price name** *(Optional)*
- Sichtbar fuer: Endkunden im Checkout-Overlay als Untertitel zur Variante.
- Funktion: Lesbares Label fuer diese Preisvariante.
- Eintrag: `Monatlich`

**Internal description**
- Sichtbar fuer: nur im Paddle-Dashboard / fuer dich.
- Funktion: SKU / interner Code. Hier landet unser Namenskonvention-Code.
- Eintrag: `LifeFlow-IND-PRO-MO`

**Minimum quantity / Maximum quantity**
- Sichtbar fuer: Endkunden im Checkout (Mengenauswahl).
- Funktion: Wieviele Stueck dieses Preises koennen pro Bestellung gekauft werden.
- Eintrag: `1` / `1`

**Custom Data** *(Optional)*
- Sichtbar fuer: niemand. Im Webhook ueber den Paddle-API-Lookup verfuegbar.
- Funktion: Metadaten zur Preisvariante.
- Eintrag:
  ```text
  period : MO
  ```

→ Speichern → **Price-ID `pri_01...` notieren**

### B.2 Preis: Jahresabo

Gleiches Product, `+ New Price` erneut.

```text
Base price            180.00 EUR, recurring every 1 year
Local prices          (leer)
Sales tax             Excludes tax
                      → Brutto in DE: 214,20 EUR
Free trial            0 days
Price name            Jaehrlich
Internal description  LifeFlow-IND-PRO-YR
Min/Max quantity      1 / 1
Custom Data           period : YR
```

→ Speichern → **Price-ID notieren**

---

## C. Product 2 – Sponsor-Paket 50 Lizenzen

**Verschoben.** Wird angelegt, wenn:

- die Preise ermittelt sind (vorlaeufige Vorschlaege: 1.350 EUR/Quartal,
  4.800 EUR/Jahr — beide netto)
- die Produkt-Beschreibung steht
- die Sponsor-Dashboard-Seite (`/sponsor`) existiert
- das `license_pool`-Backend gebaut ist (Tabelle, API, Webhook-Pfad fuer
  `audience = SPO`)

Geplante SKUs:

```text
Produkt   LifeFlow-SPO-PRO-50
Preis     LifeFlow-SPO-PRO-50-QT   Quartalsabo
Preis     LifeFlow-SPO-PRO-50-YR   Jahresabo
```

---

## D. Client-side Token

`Developer tools -> Authentication -> Client-side tokens -> + New token`

- **Name**: `LifeFlow360 Website`
- → erzeugt Token im Format `test_...` (Sandbox-Praefix)
- → **einmal sichtbar, sofort kopieren und sicher ablegen**

Dieser Token ist *oeffentlich*. Er landet in
[website/brands.json](../website/brands.json) → `paddle.clientToken` und ist
im Browser per View-Source einsehbar. Das ist OK, er ist nur fuer
Checkout-Initialisierung gedacht.

---

## E. Discount-Code fuer Test-User

`Catalog -> Discounts -> + New discount`

### Felder im Detail

**Type**
- Sichtbar fuer: niemand direkt. Bestimmt, wie der Rabatt verrechnet wird.
- Optionen:
  - `Percentage off` — prozentualer Rabatt auf den Preis
  - `Amount` — fester Betrag (z.B. 5 EUR weniger)
  - `Amount per unit` — fester Betrag pro Einheit (relevant bei `quantity > 1`)
- Eintrag: **`Percentage off`** mit Wert `100`

**Discount description**
- Sichtbar fuer: nur im Paddle-Dashboard / fuer dich.
- Funktion: Interne Beschreibung, wofuer dieser Code gedacht ist.
- Eintrag: `Free access for early test users (no payment)`

**Recurring discount**
- Sichtbar fuer: Endkunden indirekt — entscheidet, ob der Rabatt nur beim Erstkauf greift oder auch bei jedem Renewal.
- Funktion:
  - `Yes / Recurring` — gilt auch fuer alle Folgeabrechnungen (also dauerhaft kostenlos)
  - `No / First-time only` — nur Erstkauf, danach voller Preis
- Eintrag: **`Yes`** (Test-User sollen dauerhaft kostenlos bleiben, bis wir den Code manuell deaktivieren)

**Set an expiration date**
- Sichtbar fuer: niemand direkt. Code wird nach Ablauf nicht mehr akzeptiert.
- Funktion: Sicherung gegen "vergessen, abzuschalten".
- Eintrag: **`2026-12-31`** (Test-Phase endet am Jahresende)

**Limit total redemptions**
- Sichtbar fuer: niemand. Begrenzt, wie oft der Code insgesamt eingeloest werden kann.
- Funktion: Schutz vor unkontrollierter Verbreitung.
- Eintrag: **`25`**

**Checkout discount code**
- Sichtbar fuer: Endkunden — sie geben diesen Code im Checkout-Overlay ein.
- Funktion: der eigentliche String, der den Rabatt aktiviert.
- Eintrag: **`EARLY2026`**

**Limit to specific products**
- Sichtbar fuer: niemand. Begrenzt, fuer welche Produkte/Preise der Rabatt gilt.
- Funktion: verhindert versehentliche Anwendung auf andere Produkte (wichtig bei spaeterem Sponsor-Paket – sonst verschenkst du 5.000-EUR-Pakete).
- Eintrag:
  ```text
  Product name        LifeFlow360 Pro
  Prices              (leer = alle Preise dieses Produkts)
                      oder gezielt:
                      - LifeFlow-IND-PRO-MO
                      - LifeFlow-IND-PRO-YR
  ```

→ Speichern.

---

## F. Was du danach an mich zurueckgibst

Damit ich [website/brands.json](../website/brands.json) befuellen und die
Pricing-Seite scharfschalten kann, brauche ich:

```text
PADDLE_CLIENT_TOKEN              test_...                  (aus D)
PRICE_ID_INDIVIDUAL_MONTHLY      pri_01...                 (aus B.1)
PRICE_ID_INDIVIDUAL_YEARLY       pri_01...                 (aus B.2)
```

Sponsor-Preise (Schritt C) entfallen vorerst.

---

## G. Was bewusst NICHT in diesem Schritt passiert

- **Webhook-Destination** anlegen → erst, sobald die Cloudflare-URL existiert
- **Live-Produkte** parallel anlegen → erst nach erfolgreichem Sandbox-Loop
- **KYC fuer Live** abschicken → kann parallel im Hintergrund starten,
  blockiert hier nichts
- **Sponsor-Paket** anlegen → wenn Preise, Beschreibung und Sponsor-Dashboard stehen

---

## H. Offene Anpassungen am Code, die aus diesen Eintragungen folgen

- [website/templates/pricing.html](../website/templates/pricing.html):
  Preis-Anzeige von 19/15 EUR umstellen entweder auf
  - "ab 19 EUR netto / 22,61 EUR brutto"
  - oder konsequent auf Brutto-Werte (22,61 monatlich / 17,85 jaehrlich)

  Empfehlung: Brutto-Anzeige fuer B2C-Optik, zusaetzlich Hinweis "fuer
  Unternehmer / mit VAT-ID gilt netto".

- Bei spaeterem Live-Gang dasselbe Steuer-Verhalten konsistent uebernehmen
  (`Excludes tax`) – andernfalls weichen Sandbox- und Live-Preise im Checkout
  ab.

---

## I. Test-Ablauf (Sandbox)

Voraussetzungen:
- Approved Domain in Paddle (z.B. `www.lifeflow360.app`)
- Marketing-Site mit aktueller `dist/site-lifeplus/` auf die Domain deployt
- Discount-Code `EARLY2026` aktiv (siehe E)
- [website/brands.json](../website/brands.json) → `paddle.*` mit echten Sandbox-IDs befuellt
- pricing.html mit den IDs neu gebaut (`npm run build:site:lifeplus`)

### I.1 Happy-Path mit Discount-Code (kein Geld bewegt)

```text
1. Browser oeffnet  https://www.lifeflow360.app/pricing.html
   (mit Strg+F5 fuer Hard-Reload)
2. Klick auf "Jetzt monatlich starten" oder "Jetzt jaehrlich starten"
3. Email-Prompt erscheint  -> z.B. mail@example.com
4. Browser-Konsole zeigt:
     checkout-intent unreachable, opening Paddle overlay anyway
   (erwartet — kein Cloudflare-Backend deployt)
5. Paddle-Overlay oeffnet sich mit dem Sandbox-Checkout
6. Discount-Code  EARLY2026  eingeben  -> Endpreis 0,00 EUR
7. Restliche Felder ausfuellen (Email kommt vorbefuellt)
8. "Pay" klicken
9. Paddle bestaetigt den Kauf  -> checkout.completed-Event feuert
10. Browser springt auf  https://www.lifeflow360.app/app/?checkout=success
    (App noch nicht deployt -> Browser-Fehler, ist OK)
11. Im Paddle-Sandbox-Dashboard pruefen:
    - Transactions   -> neue Transaction mit 0,00 EUR sichtbar
    - Subscriptions  -> neues Abo im Status "active"
    - Customers      -> neuer Customer mit dieser Email
```

### I.2 Happy-Path mit Testkarte (Sandbox-Geld bewegt)

```text
Schritt 1 - 5 wie I.1.
6. Statt Discount: Zahlungsmethode "Card" waehlen.
7. Test-Kreditkarte eingeben (siehe I.4 unten).
8. "Pay" klicken.
9. Paddle bestaetigt  -> wie I.1.
10. Im Sandbox-Dashboard ist die Transaction jetzt mit dem vollen Betrag
    plus laenderspezifischer USt. sichtbar.
```

### I.3 Negativ-Tests (zum spaeteren Validieren mit echtem Backend)

Diese Tests werden voll erst sinnvoll, wenn der Cloudflare-Webhook aktiv ist.
Sandbox kann sie aber jetzt schon ausloesen, damit das Verhalten in
Paddle nachvollziehbar wird.

```text
- Abgelehnte Karte
  -> Karte 4000 0000 0000 0002 verwenden  (Generic decline)
  -> Erwartung: Paddle zeigt Fehler, keine Transaction.

- Karte ohne Deckung
  -> Karte 4000 0000 0000 9995  (Insufficient funds)
  -> Erwartung: Paddle zeigt Fehler "insufficient funds".

- 3D-Secure-Pruefung
  -> Karte 4000 0027 6000 3184
  -> Erwartung: Paddle blendet 3DS-Fenster ein, mit "Complete" bestaetigen.

- Refund / Erstattung
  -> Nach erfolgreichem Kauf im Sandbox-Dashboard:
     Transactions -> Transaction oeffnen -> "Refund" klicken.
  -> Erwartung: Webhook-Event "transaction.refunded" wird gesendet
     (geht aktuell ins Leere, weil Cloudflare-Endpunkt fehlt).
  -> Wenn Webhook aktiv: Entitlement wird entzogen, App zeigt Paywall.

- Kuendigung im Customer Portal
  -> Customer Portal Link aus Sandbox-Dashboard oeffnen.
  -> Subscription kuendigen.
  -> Erwartung: "subscription.canceled"-Event,
     current_period_ends_at bleibt erhalten, Zugang laeuft bis Periodenende.
```

### I.4 Paddle-Sandbox-Testdaten

#### Test-Kreditkarten

Alle drei Felder muessen stimmen, sonst lehnt Paddle die Karte sofort ab.

```text
SUCCESS (sofort erfolgreich, kein 3DS)
  Nummer       4000 0566 5566 5556
  Ablauf       beliebiges zukuenftiges Datum   (z.B. 12/30)
  CVC          100  (3-stellig)
  Name         beliebig

3D-SECURE SUCCESS  (Sandbox simuliert die 3DS-Challenge, mit "Complete" bestaetigen)
  Nummer       4000 0027 6000 3184
  Ablauf       beliebiges zukuenftiges Datum
  CVC          100

GENERIC DECLINE  (wird mit allgemeiner Ablehnung zurueckgewiesen)
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

Falls eine Karte unerwartet abgelehnt wird: in der Paddle-Sandbox-Doku
gegenpruefen, ob die Nummern noch aktuell sind. Paddle rotiert die Test-Karten
gelegentlich.

#### Test-SEPA / Test-IBAN

```text
Standard-Test-IBAN     DE89 3704 0044 0532 0130 00
Name                   beliebig
```

In Sandbox wird kein echtes Mandat eingezogen.

#### Test-PayPal

In Paddle Sandbox triggert der "PayPal"-Button einen simulierten Flow ohne
echten PayPal-Login. Auf "Continue with PayPal" klicken, Paddle simuliert
automatisch einen erfolgreichen Zahlungs-Return.

#### Test-Discount-Code

```text
Code        EARLY2026
Effekt      100% Rabatt auf alle Renewals
Gilt fuer   LifeFlow-IND-PRO (Einzelplatz Monatlich + Jaehrlich)
Limit       25 Einloesungen
Ablauf      2026-12-31
```

### I.5 Was im Paddle-Dashboard zu pruefen ist

Nach jedem Test sollten diese Datensaetze im Sandbox-Dashboard erscheinen:

```text
Customers      -> neuer Eintrag mit der Test-Email
Transactions   -> jede Zahlung (auch 0-EUR-Discount-Kaeufe) erscheint einzeln
Subscriptions  -> nur bei Recurring-Plans, mit Status "active" / "trialing"
Invoices       -> PDF-Rechnung wird automatisch generiert,
                  Sandbox-Watermark "PADDLE SANDBOX"
```

### I.6 Was lokal nicht funktioniert

- **Localhost / 127.0.0.1**: Paddle akzeptiert nur approved Domains. Lokale
  Tests des Overlays sind nicht moeglich. Alles ueber die echte Domain.
- **Webhook-Loop**: solange Cloudflare nicht deployt ist, gehen
  `subscription.created` etc. ins Leere. Im Paddle-Dashboard sind sie
  trotzdem als "Notification attempts" mit Status "failed" sichtbar — das ist
  erwartet.
- **App-Zugang nach Kauf**: `/app/?checkout=success` produziert noch keinen
  echten Login. Das kommt mit der Cloudflare-Phase (Magic-Link + `/api/me`).
