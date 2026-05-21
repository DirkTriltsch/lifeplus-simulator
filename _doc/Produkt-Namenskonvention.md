# Produkt-Namenskonvention

Diese Konvention gilt fuer alle in Paddle angelegten Produkte und Preise sowie
fuer die zugehoerigen `custom_data`-Felder im Checkout. Sie ist so geschnitten,
dass neue Marken, neue Zielgruppen, neue Laufzeiten oder neue Sitzplatz-Tiers
einfach durch Anhaengen eines neuen Segments oder Codes ergaenzt werden koennen,
ohne dass bestehende Codes geaendert werden muessen.

## Schema

```text
PRODUCT_CODE  =  <BRAND>-<AUDIENCE>-<TIER>[-<SEATS>]
PRICE_CODE    =  <BRAND>-<AUDIENCE>-<TIER>[-<SEATS>]-<PERIOD>
```

`SEATS` entfaellt bei Einzelplatz-Produkten und wird nur fuer Mehr-Sitz-Angebote
(Sponsor-Paket, Team-Lizenz, Enterprise) gesetzt.

## Segmente

### BRAND

Markenname ohne den Suffix "360", in CamelCase.

```text
LifeFlow    LifeFlow360
FitFlow     FitFlow360
EqoFlow     EqoFlow360
```

Neue Marken werden im selben Muster ergaenzt (z.B. `BodyFlow`, `MindFlow`).

### AUDIENCE

```text
IND     Einzelplatz (1 Sitz)
SPO     Sponsor-Paket (Bulk-Lizenzen fuer die Downline eines Sponsors)
TEAM    Team-Lizenz (Firmenteam / Arbeitsgruppe)        - reserviert
ENT     Enterprise / Custom-Vertrag                     - reserviert
```

### TIER

```text
PRO     Voller Funktionsumfang (heutiger Standard)
LITE    Reduzierte Variante                              - reserviert
ULT     Premium inklusive priorisiertem Support          - reserviert
```

### SEATS (optional)

Nur bei `AUDIENCE != IND`. Ganzzahl ohne Einheit.

```text
5 | 10 | 25 | 50 | 100 | 250 | 500 | ...
```

### PERIOD

```text
MO      monatlich
QT      quartalsweise (3 Monate)
HY      halbjaehrlich (6 Monate)
YR      jaehrlich
2YR     zweijaehrig                                     - reserviert
LT      Lifetime (Einmalkauf)                           - reserviert
TRI     Trial / Gutschein-Zugang                        - reserviert
```

## Beispiele

```text
LifeFlow-IND-PRO                     Produkt: Einzelplatz, Pro, LifeFlow
LifeFlow-IND-PRO-MO                  Preis:   Einzelplatz Pro Monatsabo
LifeFlow-IND-PRO-YR                  Preis:   Einzelplatz Pro Jahresabo

LifeFlow-SPO-PRO-50                  Produkt: Sponsor-Paket 50 Sitze
LifeFlow-SPO-PRO-50-QT               Preis:   Sponsor-Paket 50 Quartalsabo
LifeFlow-SPO-PRO-50-YR               Preis:   Sponsor-Paket 50 Jahresabo

FitFlow-IND-PRO-MO                   Preis:   FitFlow Einzelplatz Monatlich
EqoFlow-SPO-PRO-100-YR               Preis:   EqoFlow Sponsor-Paket 100 jaehrlich

LifeFlow-TEAM-PRO-25-YR              Preis:   LifeFlow Team-Lizenz 25 jaehrlich (zukuenftig)
LifeFlow-IND-LITE-MO                 Preis:   LifeFlow Einzelplatz Lite Monatlich (zukuenftig)
LifeFlow-IND-PRO-LT                  Preis:   LifeFlow Einzelplatz Lifetime (zukuenftig)
```

## Ablage in Paddle

Pro Produkt in Paddle:

- **Product Name** (public): lesbarer Marketing-Name, z.B. "LifeFlow360 Pro"
- **Reference / internal code**: das Schema oben, z.B. `LifeFlow-IND-PRO`
- **custom_data** (JSON):
  ```json
  {
    "brand": "LifeFlow",
    "audience": "IND",
    "tier": "PRO",
    "seats": 1
  }
  ```

Pro Preis in Paddle:

- **Description**: lesbare Variante, z.B. "Jahresabo - 15 EUR/Monat (180 EUR/Jahr)"
- **Reference / internal code**: das Schema mit Period, z.B. `LifeFlow-IND-PRO-YR`
- **custom_data** (JSON) optional:
  ```json
  {
    "period": "YR"
  }
  ```

## Verwendung im Code

Beim Oeffnen des Paddle-Checkouts (siehe [pricing.html](../website/templates/pricing.html))
wird der Brand-Code als `custom_data.brand_id` mitgegeben:

```js
Paddle.Checkout.open({
  items: [{ priceId: 'pri_...', quantity: 1 }],
  customData: { brand_id: 'LifeFlow' },
  ...
});
```

Im Webhook (siehe [functions/api/paddle/webhook.ts](../functions/api/paddle/webhook.ts))
wird der Reference-Code geparsed und die Entitlement-Logik faechert sich auf:

```text
<BRAND>-IND-<TIER>[-<PERIOD>]    -> Einzel-Entitlement fuer den Kaeufer
<BRAND>-SPO-<TIER>-<SEATS>[-<PERIOD>] -> license_pool mit <SEATS> Slots
<BRAND>-TEAM-<TIER>-<SEATS>[-<PERIOD>] -> license_pool im Team-Modus (zukuenftig)
```

So sind heutige Codes und zukuenftige Varianten ohne Code-Aenderung
unterscheidbar.

## Erweiterungs-Regeln

- Niemals einen bestehenden Code umbenennen — sonst brechen die Webhook-Daten.
- Neue Marken: neuen `BRAND`-Eintrag in dieser Datei und in
  [website/brands.json](../website/brands.json) ergaenzen.
- Neue Zielgruppen, Tiers, Perioden: hier eintragen, dann in Paddle anlegen.
- Reservierte Codes (oben mit "reserviert" markiert) duerfen ohne Aenderung
  dieser Datei verwendet werden — sie sind bereits eingeplant.
