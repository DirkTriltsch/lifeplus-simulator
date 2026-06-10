# Webcontent und Value Proposition

**Stand:** 2026-06-10
**Status:** fuehrend fuer Positionierung, Wording-Regeln und Copy-Leitlinien der Marketing-Microsite. Die operativ gerenderten Texte leben inline in Astro (`shared/components/sections/*.astro`) und in `pricing.yaml`; dieses Dokument ist der Master fuer Kernpositionierung, Disclaimer und Wording-Konsistenz, gegen den jede Aenderung am Inline-Astro gemessen wird.
**Scope:** Kritisches Review, fuehrende Positionierung, Copy-Regeln und Code-Anker fuer Marketing-Site, Pricing, Free-Signup und Checkout. Rechtstexte bleiben in den Legal-Dokumenten fuehrend.
**Ersetzt:** [`Webcontent & Value Proposition.md`](./Webcontent%20%26%20Value%20Proposition.md) als operative Referenz. Die Originaldatei ist historischer Kontext.

## 0. Kritisches Review dieses Updates

Das bisherige Update war in der Richtung richtig, aber nicht voll belastbar:

- **Encoding defekt:** Mojibake und Box-Drawing-Zeichen machten die Datei schwer lesbar und ungeeignet als fuehrenden Review-Artefakt.
- **Status zu absolut:** "fuehrend" war zu stark formuliert. Der echte Content-Master ist derzeit verteilt: Hero/Features/Signup/Checkout inline in Astro, Pricing strukturiert in `pricing.yaml`.
- **Aktiver Hero-CTA falsch:** Im Code lautet der Haupt-CTA aktuell `Jetzt starten` und verlinkt auf `/login.html`, nicht `Simulator starten`.
- **Free-CTA unvollstaendig beschrieben:** `pricing.yaml` enthaelt fuer Free zwar `url: "/app/"`, `PricingPageDefault.astro` biegt Free aber bewusst auf `/signup.html` um.
- **B2B-Scope zu grob:** Pro ist B2B-only, Free ist laut Legal-Review nicht identisch zu behandeln. Das Dokument muss diese Trennung ausdruecklich fuehren.
- **Externe Projektverweise nicht repo-stabil:** Externe Projektverweise sind fuer Wartung im Repository nicht ausreichend. Fuehrend sind die verlinkten Markdown-/Astro-Dateien.
- **Feature-Wording teils ueberzogen:** "realer Verguetungsplan" ist nur zulaessig, wenn die konkrete Planlogik und aktuelle Tests dahinterstehen. Fuer Marketing besser: "modelliert den Verguetungsplan auf Basis dokumentierter Annahmen".
- **FitLine/Eqology fehlen als Wording-Ebene:** Shared Sections werden zwar brand-variabel gerendert, es gibt aber noch kein eigenes Brand-Copy-Mastering fuer FitLine und Eqology.

## 1. Aktueller Stand

Die Marketing-Microsites laufen unter `website-astro/`. Es gibt Brand-spezifische Pages und gemeinsame Sections.

```text
website-astro/src/
  brands/<brand>/
    brand.yaml
    content/pricing.yaml
    pages/index.astro
    pages/features.astro
    pages/pricing.astro
    pages/signup.astro
    pages/login.astro
    pages/checkout/[plan].astro
    pages/mein-konto.astro
    pages/agb.astro
    pages/datenschutz.astro
    pages/impressum.astro
    pages/widerruf.astro
  shared/components/sections/
    IndexPageDefault.astro
    FeaturesPageDefault.astro
    PricingPageDefault.astro
    SignupPage.astro
    LoginPage.astro
    CheckoutPage.astro
    AccountPageDefault.astro
    LegalAgbDefault.astro
    LegalDatenschutzDefault.astro
    LegalImpressumDefault.astro
    LegalWiderrufDefault.astro
```

Die alte `website/templates/*`-Struktur und `website/brands.json` sind nicht mehr operativ. Einzelne Kommentare im Astro-Code erwaehnen sie noch als Migrationsherkunft, nicht als Pflegeort.

## 2. Code-Anker

| Kontext | Fuehrende Quelle | Hinweis |
|---|---|---|
| Brand-Domain, App-URL, Paddle-IDs, Farben | [`website-astro/src/brands/lifeplus/brand.yaml`](../website-astro/src/brands/lifeplus/brand.yaml) | Pendants fuer `fitline` und `eqology` vorhanden |
| Pricing-Tiers, Preise, Vergleich, FAQ | [`website-astro/src/brands/lifeplus/content/pricing.yaml`](../website-astro/src/brands/lifeplus/content/pricing.yaml) | Strukturierte Pricing-Copy |
| Startseite, Hero, Trust, Core, Pricing-Teaser | [`website-astro/src/shared/components/sections/IndexPageDefault.astro`](../website-astro/src/shared/components/sections/IndexPageDefault.astro) | Wording inline |
| Feature-Seite | [`website-astro/src/shared/components/sections/FeaturesPageDefault.astro`](../website-astro/src/shared/components/sections/FeaturesPageDefault.astro) | Wording inline |
| Pricing-Rendering und CTA-Logik | [`website-astro/src/shared/components/sections/PricingPageDefault.astro`](../website-astro/src/shared/components/sections/PricingPageDefault.astro) | Free wird auf `/signup.html` umgebogen |
| Free-Signup | [`website-astro/src/shared/components/sections/SignupPage.astro`](../website-astro/src/shared/components/sections/SignupPage.astro) | 14 Tage Pro, danach eingeschraenkter Free-Zugang |
| Pro-Checkout | [`website-astro/src/shared/components/sections/CheckoutPage.astro`](../website-astro/src/shared/components/sections/CheckoutPage.astro) | B2B-Wizard, Pflichtzustimmungen, Paddle |
| B2B-Hinweis | [`website-astro/src/shared/components/checkout/B2BHeaderBanner.astro`](../website-astro/src/shared/components/checkout/B2BHeaderBanner.astro) | Auf Pricing, Checkout und Index-Pricing-Teaser sichtbar |
| Rechtstexte | `Legal*.astro` | Inhaltlich gegen Legal-Review pruefen |

## 3. Kernpositionierung

Der Simulator ist kein Einkommensversprechen und kein generischer Zinseszins-Rechner. Er ist ein Gespraechs- und Fuehrungswerkzeug fuer Sponsoren.

**Primaere Jobs-to-be-done:**

1. Im Interessentengespraech: Aus Vortrag wird gemeinsames Rechnen mit eigenen Annahmen.
2. In der Downline: Partner koennen Durststrecken einordnen, weil Zeit, Duplikation und Fluktuation sichtbar werden.
3. In der Selbstplanung: Sponsoren sehen, welche Aktivitaetsannahmen zu welchen Stufen, Zielen und Netzwerkbildern fuehren.

**Master-Aussage:**

> Der Simulator macht sichtbar, was im Kopf abstrakt bleibt: wenige wiederholbare Aktivitaeten, Duplikation, Fluktuation und Zeit veraendern ein Netzwerk schrittweise. Er zeigt keine Garantie, sondern die Folgen konkreter Modellannahmen.

**Nicht verwenden:**

- "Garantiert", "sicher", "typisch verdient", "so wirst du Diamond".
- Konkrete Ertragsbeispiele ohne unmittelbaren Modellrechnungs-Disclaimer.
- "passives Einkommen" als Nutzenversprechen.
- "realer Verguetungsplan" ohne Einschraenkung auf dokumentierte Annahmen und aktuelle Tests.

**Bevorzugtes Wording:**

- "Modellrechnung"
- "Annahmen"
- "Szenario"
- "Planungstiefe"
- "Erwartungen klaeren"
- "kein Versprechen typischer Ertraege"
- "auf Basis dokumentierter Verguetungslogik"

## 4. Aktives Wording im Code

### 4.1 Startseite

Hero-Claim in `IndexPageDefault.astro`:

> Netzwerk-Wachstum versteht man nicht in Tabellen. Man versteht es, wenn man es veraendert.

Subline:

> Mit fuenf Basiswerten simulierst du live, wie Member, Shopper, Umsatz, Duplikation und Fluktuation ueber Jahre auf Verguetung, Ziele und Teamstruktur wirken. Fuer ruhigere Gespraeche mit Interessenten und mehr Orientierung in deiner Downline.

Aktueller Haupt-CTA:

```text
Jetzt starten -> /login.html
```

Wertung: Der Claim ist stark und konsistent. Der CTA ist sachlich, aber weniger spezifisch als `Simulator starten`. Eine Aenderung sollte bewusst entschieden werden, weil `/login.html` sowohl Free-/Magic-Link- als auch Bestandsnutzer-Kontext abdeckt.

### 4.2 Pricing

Free wird als Reverse-Trial kommuniziert:

```text
14 Tage Pro testen, danach automatisch zurueck in Free.
Kostenlos starten -> /signup.html
```

Wichtig: In `pricing.yaml` steht fuer Free noch `url: "/app/"`; die Rendering-Komponente ueberschreibt das fuer `tier.id === "free"` auf `/signup.html`. Diese Sonderlogik muss erhalten bleiben oder in YAML konsolidiert werden.

Pro-Preislogik:

- 1 Monat: `14,95 EUR` netto monatlich.
- 6 Monate: `82,23 EUR` netto alle 6 Monate, rechnerisch `13,71 EUR/Monat`.
- 12 Monate: `149,50 EUR` netto jaehrlich, rechnerisch `12,46 EUR/Monat`.
- Alle Pro-Plaene: netto, zzgl. USt.; Paddle als Merchant of Record im Checkout.

#### Pricing-Tier-Wording (Quelle: `pricing.yaml`)

Diese Tabelle ist die Marketing-Wording-Sicht auf die Pricing-Tiers. Die produktstrategische Sicht steht in [`Freemium-Modell_updated.md`](./Freemium-Modell_updated.md) §1.

| Tier | YAML-ID | Preis-Text | Subline | Description | Featured |
|---|---|---|---|---|---|
| Frei (Reverse-Trial) | `free` | `0 EUR` | "kostenlos · mit Magic-Link · ohne Kreditkarte" | "14 Tage Pro testen — danach automatisch zurueck in Free." | nein |
| 1 Monat | `monthly` | `14,95 EUR / Monat` netto | "14,95 EUR netto monatlich · zzgl. USt. · monatlich kuendbar" | "Flexibel, monatlich kuendbar." | nein |
| 6 Monate | `halfyear` | `13,71 EUR / Monat` netto, Badge "Halber Monat gratis" | "82,23 EUR netto alle 6 Monate · zzgl. USt. · halber Monat gratis" | "Halbjaehrlich planen, ein halber Monat gratis." | nein |
| 12 Monate | `yearly` | `12,46 EUR / Monat` netto, Badge "2 Monate sparen ggue. Monatsabo" | "149,50 EUR netto jaehrlich · zzgl. USt. · 2 Monate gratis" | "Jaehrlich sparen, zwei Monate gratis." | **ja** |

### 4.3 Signup

Free-Signup kommuniziert:

- 14 Tage Pro kostenlos testen.
- Keine Zahlungsdaten.
- Keine automatische Verlaengerung.
- Danach eingeschraenkter Free-Zugang.
- Pflichtzustimmungen: AGB und Datenschutz; Newsletter optional.

Das passt zur Produktstrategie. Kritisch bleibt: "Alle Pro-Features sofort" muss mit der tatsaechlichen Entitlement-Implementierung synchron bleiben.

### 4.4 Checkout

Checkout kommuniziert B2B-only fuer Pro:

- Rechnungsdatenpflicht.
- B2B-Bestaetigung nach Paragraf 14 BGB.
- Kein Verbraucher-Widerrufsrecht fuer B2B-Pro.
- Zahlung und Rechnung ueber Paddle.
- Netto-/USt.-Darstellung und Reverse-Charge-Hinweis.

Diese Texte duerfen nicht isoliert geaendert werden; AGB, Widerruf, Datenschutz und Checkout muessen gemeinsam geprueft werden.

## 5. Feature-Wording

| Feature | Saubere Aussage | Risiko bei falschem Wording |
|---|---|---|
| Fuenf Slider | Member/Jahr, Shopper/Jahr, IP/Monat, Duplikation und Fluktuation veraendern das Szenario live. | Nicht als "nur fuenf Werte fuer sichere Prognose" verkaufen. |
| 10-Jahres-Verlauf | Die Entwicklung wird als Kurve und Kennzahlen ueber Zeit sichtbar. | Keine Ergebnisgarantie, kein "typischer Verlauf". |
| Stufen-Prognose | Rank-/Stufenlogik wird aus Annahmen berechnet und als Wegmarke gezeigt. | "Du wirst Rank X" vermeiden. |
| Reality-Strategien | Personenbaum, Zufallsstreuung und Momentum zeigen unterschiedliche Strukturannahmen. | Nicht mehr "Standard / Random / Momentum" als alte Modellarchitektur fuehren. |
| Ziele-Leiter | Zwischenziele machen Szenarien alltagsnaher. | Finanzielle Ziele immer als Modellziele, nicht als Versprechen. |
| Netzwerk-Visualisierungen | Tabelle, Sunburst, Bein-Spalten und Hybrid-Tree helfen beim Verstehen der Struktur. | Keine Visualisierung als Realwelt-Prognose darstellen. |
| Szenario teilen | Werte koennen per URL-Kontext weitergegeben werden, soweit umgesetzt. | Kundenlinks/Freigaben nicht ueberclaimen, solange Sharing-Konzept nicht voll implementiert ist. |

## 6. B2B- und Legal-Copy-Regeln

- Pro ist als Angebot fuer Unternehmer/Selbstaendige zu fuehren.
- Free darf nicht automatisch wie Pro-B2B-only formuliert werden; Legal trennt Free und Pro.
- Netto-Preise immer mit `zzgl. USt.` oder gleichwertigem Hinweis.
- Steuerliche Absetzbarkeit nur vorsichtig: "kann steuerlich relevant sein; bitte mit Steuerberater klaeren".
- Beispielzahlen brauchen unmittelbaren Disclaimer.
- Keine Recruiting-, Investment- oder Rendite-Sprache.
- Keine Aussagen, die eine Kooperation, Freigabe oder Billigung durch LifePlus, FitLine oder Eqology suggerieren, solange sie nicht dokumentiert ist.

## 7. Verbesserungsbedarf

| Prioritaet | Thema | Verbesserung |
|---|---|---|
| Hoch | Zentralisierung | Hero-/Feature-/Signup-/Checkout-Copy ist inline verteilt. Bei groesseren Aenderungen sollte entschieden werden, ob Brand-Copy in YAML ausgelagert wird. |
| Hoch | Free-CTA-Doppelquelle | `pricing.yaml` sagt `/app/`, Astro erzwingt `/signup.html`. Besser: YAML auf `/signup.html` korrigieren oder Override kommentiert als Produktentscheidung belassen. |
| Hoch | Legal-Konsistenz | Jede Aenderung an B2B, Widerruf, Free/Trial oder Refund-Texten gegen Legal-Review und Go-Live-Checklist pruefen. |
| Mittel | Brand-spezifische Copy | FitLine/Eqology nutzen shared Sections. Vor Launch pro Brand braucht es mindestens eine kurze Claim-/Disclaimer-Pruefung. |
| Mittel | Claims zu Verguetungslogik | "realer Verguetungsplan" nur nutzen, wenn Tests/Referenznetzwerk fuer die jeweilige Brand aktuell sind. Sonst "auf Basis dokumentierter Annahmen". |
| Mittel | A/B-Varianten | Alte Hero-Varianten sind nicht aktiv. Entweder entfernen oder als bewusstes Backlog mit Messkonzept fuehren. |
| Niedrig | Historische Pfade | Alte Template-Pfade nur noch in Anhang/History erwaehnen, nie als Pflegehinweis. |

## 7a. Hero-A/B-Varianten (Backlog, nicht aktiv)

Aus dem Original-Konzept dokumentiert, falls A/B-Tests spaeter eingefuehrt werden. Aktuell aktiv ist die Empfehlung (siehe §4.1).

| Variante | Hero-Claim |
|---|---|
| **A** | "Zeig Interessenten und Partnern, wie Netzwerk-Wachstum wirklich entsteht." |
| **B** | "Der Simulator, der aus Verguetungsplan, Aktivitaet und Zeit ein verstaendliches Bild macht — fuer Interessenten und Partner." |
| **C** | "Mach sichtbar, warum Dranbleiben zaehlt, bevor es sich gross anfuehlt." |
| **D (aktiv)** | "Netzwerk-Wachstum versteht man nicht in Tabellen. Man versteht es, wenn man es veraendert." |

Bei A/B-Test-Einfuehrung: A bis C sind als Backlog-Varianten dokumentiert. Vor Test braucht es ein Messkonzept (welche Metriken? Conversion auf `/signup`? Bounce-Rate?). Reine Hero-Varianten sind ohne Messmethode unentscheidbar.

## 7b. Feature-Wording-Vorlagen (Begleitend zu Astro-Inline)

Diese Texte sind die fuehrenden Wording-Master fuer die Feature-Seite. Astro-Code (`FeaturesPageDefault.astro`) sollte gegen diese Texte konsistent bleiben.

### Feature 1: Fuenf Slider

> **Website-Text:** "Fuenf Regler reichen, um ein Gespraech zu drehen: neue Member pro Jahr, neue Shopper pro Jahr, Umsatz pro Person, Duplikationsrate und Fluktuationsrate. Jede Aenderung berechnet die Entwicklung ueber die Zeit sofort neu."

### Feature 2: Live-Simulation auf Basis dokumentierter Verguetungslogik

> **Website-Text:** "Hinter der Oberflaeche rechnet kein pauschaler Prozentwert, sondern die Logik des dokumentierten Verguetungsplans. So sieht der Sponsor, wie Aktivitaet, Teamaufbau und Planmechanik zusammenwirken."

Wichtig: Wording "dokumentierter Verguetungsplan" statt "realer Verguetungsplan" — siehe §3 Wording-Konventionen.

### Feature 3: Reality-Strategien (Personenbaum / Zufallsstreuung / Momentum)

> **Website-Text:** "Starte einfach und schalte bei Bedarf mehr Realitaet hinzu: gleichmaessiges Wachstum, zufaellige Teamdynamik oder Momentum mit staerkeren und schwaecheren Beinen."

Hinweis: nicht mehr "Standard / Random / Momentum" als alte Modellarchitektur fuehren. Modi heissen heute `person-tree-equal`, `person-tree-random`, `person-tree-momentum` (siehe `growth_models/01-Zielarchitektur.md`).

### Feature 4: Ziele-Leiter

> **Website-Text:** "Statt nur auf Jahr 10 zu schauen, zeigt die Ziele-Leiter konkrete Zwischenziele im Verlauf: Produktkosten refinanziert, Auto finanziert, Mietfreiwohnen geschafft, vollwertiges Einkommen erreicht — oder eigene, frei definierte Ziele."

### Feature 5: Netzwerk im Zeitverlauf

> **Website-Text:** "Die Simulation zeigt nicht nur Ergebniszahlen, sondern auch die Struktur dahinter: als Tabelle, Sunburst, Bein-Spalten oder Hybrid-Tree."

## 7c. Trust-Strip- und Final-CTA-Vorlagen (Backlog)

Falls in Astro-Code Trust-Strip / FAQ / Final-CTA als eigene Abschnitte gebaut werden, dienen folgende Vorlagen als Wording-Master. Aktuell teilweise in `IndexPageDefault.astro` inline; bei Aenderungen gegen diese Texte abgleichen.

**Trust-Strip (Kernpositionierung in einer Zeile):**

> "Keine Garantie, keine Recruiting-Sprache — Modellrechnung mit fuenf Reglern, dokumentierter Verguetungslogik und ehrlicher Disclaimer."

**FAQ-Vorlagen (Auswahl):**

- *"Ist das ein Einkommensversprechen?"* — "Nein. Der Simulator zeigt Modellrechnungen auf Basis der Annahmen, die du selbst einstellst. Tatsaechliche Ergebnisse haengen von Einsatz, Markt, Teamdynamik und weiteren Faktoren ab."
- *"Brauche ich einen Account?"* — "Ja. Auch die Free-Variante laeuft ueber Magic-Link-Login, damit Account-Status, Trial und Reaktivierung sauber funktionieren — ohne Passwort."
- *"Was passiert nach 14 Tagen?"* — "Dein Konto bleibt bestehen. Der Trial-Status wechselt automatisch auf Free; du kannst jederzeit auf Pro upgraden."
- *"Kann ich monatlich kuendigen?"* — "Im 1-Monatsplan jederzeit zum Monatsende. In den laengeren Plaenen ab der ersten Verlaengerung monatlich; nicht genutzte volle Restmonate erstatten wir anteilig."

**Final-CTA:**

> "Bereit, dein Netzwerk zu simulieren? Starte kostenlos mit 14 Tagen Pro — ohne Karte, ohne Risiko."
> CTA: "Kostenlos starten" -> `/signup.html`

## 8. Empfohlene Copy-Leitlinie

**Kurzpositionierung:**

> LifeFlow360 macht Netzwerk-Wachstum sichtbar. Sponsoren simulieren mit wenigen Annahmen, wie Member, Shopper, IP, Duplikation und Fluktuation ueber Jahre auf Ziele, Stufen und Teamstruktur wirken.

**Ehrlicher Disclaimer:**

> Alle Werte sind Modellrechnungen. Tatsaechliche Ergebnisse haengen von individuellem Einsatz, Markt, Produktnutzung, Teamdynamik und weiteren Faktoren ab.

**B2B-Pricing-Hinweis:**

> Pro richtet sich an Unternehmer und Selbstaendige. Alle Preise verstehen sich netto zzgl. gesetzlicher USt.; die konkrete steuerliche Behandlung klaerst du bitte mit deinem Steuerberater.

**Free-Hinweis:**

> Kostenlos starten: 14 Tage Pro testen, ohne Zahlungsdaten. Danach bleibt dein Konto mit eingeschraenktem Free-Zugang bestehen.

## 9. Verwandte Dokumente

- [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §1 - Free/Trial/Pro-Produktstrategie und offene Drift; §3 - Sharing-/Kundenlink-Wording nur daraus ableiten, solange das Feature nicht implementiert ist.
- [`Konzept Paddle-Integration und App-Architektur_updated.md`](./Konzept%20Paddle-Integration%20und%20App-Architektur_updated.md) - Billing-, Entitlement- und Checkout-Architektur.
- [`Referenznetzwerk-Tests_updated.md`](./Referenznetzwerk-Tests_updated.md) - Absicherung von Netzwerk-/Planlogik.
- [`go-live/go-live-content-legal-checklist.md`](./go-live/go-live-content-legal-checklist.md) - Go-Live-Checks fuer Content und Legal.
- [`go-live/legal-review-2026-06-03.md`](./go-live/legal-review-2026-06-03.md) - letzter dokumentierter Legal-Review.
- [`paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md`](./paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md) - B2B-Checkout-Review.

## Anhang: Historischer Kontext

Die alte Datei `Webcontent & Value Proposition.md` enthaelt umfangreiche Konzeptvarianten, alte Website-Pfade und Copy-Ideen aus der Zeit vor der Astro-Konsolidierung. Sie bleibt als Ideenspeicher nuetzlich, ist aber keine operative Quelle.

Bei Konflikten gilt:

1. Code und YAML fuer aktuell gerenderten Content.
2. Legal-/Go-Live-Dokumente fuer rechtliche Aussagen.
3. Dieses Dokument fuer Positionierung und Review-Einordnung.
4. Die alte Konzeptdatei nur als Historie.
