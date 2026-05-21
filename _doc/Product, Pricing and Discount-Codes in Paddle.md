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
