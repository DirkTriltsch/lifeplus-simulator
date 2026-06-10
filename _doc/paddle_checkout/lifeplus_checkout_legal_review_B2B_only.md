# Legal Review: LifeFlow360 → B2B-only-Shop

**Stand:** 2026-06-10 (Datei-Mtime); inhaltlicher Review-Stand 2026-06-02
**Status:** Legal-Review-Snapshot; Befunde aktiv abzuarbeiten in [`../go-live/go-live-content-legal-checklist.md`](../go-live/go-live-content-legal-checklist.md)
**Scope:** Rechtliche Bewertung des Architektur-Pivots Pro-Checkout → B2B-only-Shop (Schwerpunkt DACH/DE).
**Skill:** `lifeflow360-legal-review`
**Anlass:** Architektur-Pivot des Pro-Checkouts. LifeFlow360-Shop wird als
B2B-only-Angebot positioniert. User-Vorgabe: "wir schliessen nicht aus, wir
informieren nur" — keine harten Gates, sondern konsistente B2B-Positionierung
plus Pflicht-Bestaetigung im Checkout.

Verwandt:
- Setup-Stand: [`./lifeplus_checkout_paddle_b2b_setup.md`](./lifeplus_checkout_paddle_b2b_setup.md)
- Historischer Befund bezog sich auf Mockup v3. Die v3-Datei wurde nach
  Runbook-Fertigstellung geloescht; erhaltene historische Referenzen sind
  [`./lifeplus_checkout_paddle_b2b_v2.html`](./lifeplus_checkout_paddle_b2b_v2.html)
  und [`./lifeplus_checkout_paddle_b2b_v6.html`](./lifeplus_checkout_paddle_b2b_v6.html).

---

## Einordnung

- **Rechtsraum:** DACH-Schwerpunkt DE. AT und CH sinngemaess analog, ggf.
  lokale Anpassung der Verweise (KSchG, OR) erforderlich.
- **Zielgruppe:** Selbststaendige, Vertriebspartner im Network-Marketing.
- **Geprueft:** BGB §13/14/312g, PAngV, UWG §5, §16 UWG (Schneeballverbot
  — hier nicht direkt relevant, aber Kontext), §36 VSBG, Art. 14
  ODR-VO 524/2013, DDG §5, DSGVO Art. 13/14.
- **Vorgabe User:** keine harten Gates, weiches B2B-Positioning auf der
  Webseite, harter Confirmation-Lever im Checkout.

---

## Findings

### 🟡 GELB — Pricing-Seite mit Netto-Preisen (Punkt 1)

#### Risiko
PAngV §1 gilt nur gegenueber Verbrauchern. Bei *reinem* B2B-Shop sind
Netto-Preise zulaessig.

**Aber:** BGH-Linie (z.B. BGH I ZR 134/16) — wenn die Seite auch von
Verbrauchern wahrgenommen werden kann, gilt PAngV trotzdem. Diese Falle ist
relevant, weil:
- Der Shop oeffentlich erreichbar ist
- Free-Plan-Signup offen bleibt (auch Privatpersonen koennen registrieren)

#### Voraussetzungen fuer rechtssichere Netto-Preise
1. Konsistentes B2B-Bild ueber die *ganze* Webseite (nicht nur eine Stelle)
2. An *jedem* Preis lesbar "zzgl. USt." oder "zzgl. gesetzl. Umsatzsteuer"
3. Brutto-Information zumindest auf Nachfrage / als Sub-Text verfuegbar

#### Wording-Vorschlag (Pricing-Page-Hero)
> **14,95 € / Monat** *zzgl. gesetzlicher Umsatzsteuer*
> *(17,79 € brutto inkl. 19% USt. bei deutscher USt.)*

Die Brutto-Information als kleiner Sub-Text reduziert das Restrisiko erheblich.

#### Einschaetzung
- **Mit konsistenter B2B-Auszeichnung + Netto-zzgl.-Hinweis + Brutto-Sub:** GRUEN
- **Ohne diese Hinweise (Netto nackt):** ROT

---

### 🟡 GELB — Header- / Marketing-Hinweis (Punkt 5)

#### Risiko
Fuer BGH-konforme B2B-Erkennbarkeit reicht *eine* Stelle nicht. Es braucht
ein konsistentes Bild aus mehreren Touchpoints.

#### Pflicht-Stellen (sonst rutscht der B2B-Status)
- **Header-Badge** auf Pricing + Index sichtbar:
  > "Fuer Selbststaendige & Vertriebspartner"
  oder
  > "B2B-Angebot"

- **Footer-Note** auf allen Seiten:
  > "LifeFlow360 ist ein Angebot fuer Unternehmer und Selbststaendige
  > im Sinne §14 BGB."

- **Pricing-Page-Lead** ueber den Plaenen:
  > "Die genannten Preise verstehen sich netto, zzgl. gesetzlicher
  > Umsatzsteuer. LifeFlow360 richtet sich an gewerbliche und
  > selbststaendige Nutzer."

#### Einschaetzung
- **Mit allen drei Hinweisen konsistent deployed:** GRUEN
- **Ohne (einzelne Stelle reicht nicht):** GELB → ROT bei spaeterem Streit

---

### 🔴 ROT (ohne Wording) → 🟢 GRUEN (mit Wording + Logging) — Pflicht-Bestaetigungs-Checkbox (Punkt 2)

#### Bedeutung
Das ist der **juristische Schluessel-Mechanismus** der ganzen Architektur.
Die Checkbox traegt rechtlich das, was die "informieren, nicht ausschliessen"-
Vorgabe erlaubt: aktive, dokumentierte Erklaerung des Kaeufers, dass er als
Unternehmer im Sinne §14 BGB kauft. Daraus folgt: §312g BGB-Widerrufsrecht
greift nicht.

#### Wording-Vorschlag (Pflicht, gating wie AGB + DSE)

> **☐** Ich bestaetige, dass ich diesen Vertrag in Ausuebung meiner
> gewerblichen oder selbststaendigen beruflichen Taetigkeit (§14 BGB)
> abschliesse und nicht als Verbraucher. Mir ist bewusst, dass hierdurch
> **kein Widerrufsrecht** nach §312g BGB besteht. \*

Optionaler Hilfstext darunter (kleiner, italic):
> *LifeFlow360 ist ein Angebot ausschliesslich fuer gewerbliche und
> selbststaendige Nutzer.*

#### Pflicht-Logging (fuer Beweislast, siehe auch Punkt 7)

Bei jeder Pflicht-Bestaetigung im Checkout muss gespeichert werden:
- `timestamp_utc` — wann wurde bestaetigt (== `created_at` im Intent)
- `ip_address` — IP des Bestaetigenden
- `user_agent` — Browser-Identifikation
- `b2b_confirmation_version` — Versionsstring der Checkbox-Erklaerung,
  z.B. `b2b-v2026-06-02`, oder Hash des angezeigten Texts
- `displayed_hints_hash` — Hash der zur Anzeige gebrachten Hinweise
  (Pricing-Lead, Header-Badge, Footer-Note) zum Zeitpunkt der Bestaetigung
- `company_name` — vom Kaeufer angegebener Firmen-/Personenname (stuetzt
  die "objektive Erkennbarkeit als Unternehmer" gegenueber spaeterem Widerruf)
- `country_code` — vom Kaeufer angegebenes Land (Rechnungsland; bestimmt
  Steuerbehandlung und Reverse-Charge-Logik)
- **Aufbewahrungsfrist mindestens 3 Jahre** (Verjaehrungsfristen
  Widerruf-Schadensersatz)

#### Einschaetzung
- **Wording vorhanden + Logging implementiert:** GRUEN
- **Nur Wording ohne Logging:** ROT (Beweislast nicht haltbar)
- **Wording falsch oder fehlt:** ROT
- **Anwaltliche Pruefung des finalen Wordings:** empfohlen

---

### 🟡 GELB — AGB-Refactor zur B2B-Version (Punkt 3)

#### Risiko
Aktuelle AGB sind vermutlich gemischt B2B/B2C. Bei reinem B2B-Shop muessen
Klauseln entweder weichen oder durch B2B-Aequivalente ersetzt werden.

#### Was muss raus (aus aktuellen AGB)
- Widerrufsbelehrung (§312g) — bei B2B nicht anwendbar
- 24-Monats-Gewaehrleistungs-Bezuege — bei B2B auf 12 Monate verkuerzbar
- Verbraucherfreundliche Haftungsklauseln — koennen B2B-uebliche werden
- VSBG-Hinweis kann raus (siehe naechstes Finding)

#### Was REIN sollte (B2B-uebliche Klauseln)
- Gewaehrleistungsfrist **12 Monate** (statt 24 bei Verbrauchern)
  — Ausnahmen: Vorsatz, grobe Fahrlaessigkeit, Personenschaeden, Garantien,
  arglistige Verschleierung
- Haftungsbeschraenkung auf typische, vorhersehbare Schaeden bei leichter
  Fahrlaessigkeit
- Verzugszinsen **9 Prozentpunkte ueber Basiszinssatz** (§288 Abs. 2 BGB)
  statt 5 bei B2C
- Aufrechnungsverbot ausser mit unbestrittenen oder rechtskraeftig
  festgestellten Forderungen
- Erfuellungsort + Gerichtsstandsvereinbarung (§38 ZPO — wirksam zwischen
  Vollkaufleuten)
- Schriftform-/Textform-Vereinbarungen (Kuendigung, Vertragsaenderungen)
- Klarstellung: "Angebot richtet sich an Unternehmer im Sinne §14 BGB,
  nicht an Verbraucher im Sinne §13 BGB"

#### Was UNBERUEHRT bleibt (auch B2B-AGB)
- Haftung fuer Vorsatz, grobe Fahrlaessigkeit, Personenschaeden, Garantien,
  Produkthaftung — gesetzlich nicht abdingbar
- DSGVO-Bezuege
- Salvatorische Klausel
- Wesentliche Vertragsbestandteile (Leistung, Preis, Laufzeit, Kuendigung)

#### Einschaetzung
- **Vollstaendige Anpassung ist Anwalts-Pflicht.** Dieser Skill liefert
  Struktur und Stichpunkte, nicht den Volltext.
- **Live-Schaltung ohne anwaltliche AGB-Freigabe:** ROT
- **Mit anwaltlich freigegebener B2B-AGB:** GRUEN

---

### 🟢 GRUEN — VSBG / ODR-Plattform-Hinweis (Punkt 4)

#### Rechtslage
- §36 VSBG (Verbraucherstreitbeilegungsgesetz): Pflicht zur Information ueber
  Bereitschaft/Verpflichtung zur Teilnahme an Schlichtungsverfahren — **gilt
  nur gegenueber Verbrauchern**.
- Art. 14 ODR-VO 524/2013 (OS-Plattform-Link): Pflicht fuer Online-Haendler,
  die Vertraege mit Verbrauchern abschliessen.

Bei reinem B2B-Shop koennen beide raus.

#### Best Practice bei "informieren, nicht ausschliessen"
Konservativ drin lassen mit B2B-Klarstellung:
> "LifeFlow360 ist nicht bereit und nicht verpflichtet, an einem
> Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
> teilzunehmen. (Hinweis informationshalber, da der Pro-Shop ausschliesslich
> an Unternehmer richtet.)"

OS-Plattform-Link kann ebenfalls raus, **ausser** Free-Plan wird spaeter
bezahlpflichtig — dann bleibt er drin.

#### Einschaetzung
- **"Drin lassen mit B2B-Klarstellung":** GRUEN
- **"Komplett raus":** GRUEN solange Free-Plan unentgeltlich bleibt
- **Impressum-Pflichtangaben nach §5 DDG bleiben unveraendert** —
  unabhaengig von B2B/B2C

---

### 🟢 GRUEN — Free-Plan-Signup unveraendert (Punkt 6)

#### Rechtslage
Free-Plan ist unentgeltlich → kein "entgeltlicher Vertrag" im Sinne §312 BGB
→ keine Widerrufspflicht → kein B2B-Gating noetig.

#### Was bleibt zu pruefen
- Wenn Free → Pro automatisch wechseln wuerde (z.B. nach Trial), waere das
  ein neuer Vertragsabschluss → dann muss die B2B-Bestaetigung dort greifen.
  Aktuell ist das nicht der Fall: Pro startet via expliziten Kauf.
- Hidden-Cost-Patterns vermeiden: keine versteckte Free→Pro-Konversion
  ohne explizite Bestaetigung.

#### Einschaetzung
- **Free-Plan-Signup unveraendert:** GRUEN
- **Aufpassen** bei spaeteren Trial-/Auto-Upgrade-Modellen.

---

### 🟡 → 🟢 — Beweislast bei strittiger Verbraucher-Bestaetigung (Punkt 7)

#### Rechtslage (BGH-Linie)
Wenn ein Verbraucher aktiv und nachweislich als Unternehmer bestaetigt, ist
er spaeter *im Regelfall* an die Bestaetigung gebunden.

**Ausnahme:** Es ist "objektiv erkennbar" Privatperson — z.B. wenn aus
E-Mail-Adresse, Lieferanschrift, Kontext der Bestellung eindeutig auf
Konsumkauf hindeutet. Dann greift Verbraucherrecht trotz Bestaetigung weiter.

**Maßstab:** "objektive Erkennbarkeit" gegen "subjektive Bestaetigung".

#### Mindest-Dokumentation fuer solide Beweislast
1. Timestamp UTC bei Bestaetigung
2. IP-Adresse + User-Agent
3. Wortlaut-Version der Checkbox-Erklaerung (Versions-Hash oder String wie
   `b2b-v2026-06-02`)
4. Hashes der zur Anzeige gebrachten Hinweise (Pricing-Lead, Header-Badge,
   Footer-Note)
5. **Firmen-/Personenname** des Kaeufers (stuetzt "objektive Erkennbarkeit
   als Unternehmer")
6. **Rechnungsland** des Kaeufers (bestimmt Steuerbehandlung; bei DE-Kunde
   greift Inlands-USt, bei EU non-DE + USt-IdNr Reverse-Charge)
7. Speicherung **mindestens 3 Jahre** (Verjaehrung
   Widerruf-Schadensersatz-Anspruch)

Geplante Migration `0006_checkout_intents_b2b.sql` erweitert `checkout_intents`
um: `company_name`, `country_code`, `discount_code`, `vat_id`,
`b2b_confirmation_version`, `displayed_hints_hash`, `ip_address`, `user_agent`.

#### Einschaetzung
- **Ohne Logging:** ROT (faktisch kein Beweis bei Streit)
- **Mit vollstaendigem Logging:** GRUEN (Beweislast verschiebt sich auf den
  Verbraucher, der die Bestaetigung anfechten muesste)
- **Logging ist nicht optional** — Bestandteil der Live-Schaltungs-
  Voraussetzungen.

---

## Empfehlung

### Live-Schaltung erst nach
1. **Anwaltliche Freigabe der AGB-B2B-Version** — zwingend, kein Skill-Ersatz
2. **Anwaltliche Pruefung der Pflicht-Checkbox-Formulierung** — empfohlen
3. **Implementierung des erweiterten Logging-Schemas** — zwingend
4. **Konsistente B2B-Auszeichnung** ueber alle Webseiten-Touchpoints
   (Header-Badge + Footer-Note + Pricing-Lead + Checkout-Confirmation)

### Reihenfolge
1. Erst **Checkout-Refactor** mit der vorgeschlagenen Checkbox + Logging.
2. Parallel **Pricing-Seite-Refactor** mit Netto-Preisen + Hinweisen.
3. **AGB-Refactor zum Anwalt geben** — Wartezeit einplanen, Code parallel.
4. **Header/Footer-Anpassungen** technisch trivial, gleichzeitig deployen.
5. Vor Go-Live: **Gate-Pruefung** (Modus D des Legal-Skills) durchlaufen.

### Risiko-Restrisiko nach vollstaendiger Umsetzung
- **Mit allen vier Punkten erfuellt:** GRUEN (vergleichbar mit etablierter
  B2B-Shop-Praxis im DACH-Raum)
- **Mit einem fehlend:** GELB → bei Streit ROT
- **Mit Logging fehlend:** ROT (Beweislast nicht haltbar, Risiko bei jedem
  potentiellen Verbraucher-Widerruf)

---

## Risiko-Ueberblick

| Bereich | Aktuell | Mit Umsetzung |
|---|---|---|
| Pricing-Seite Netto-Preise (1) | 🟡 | 🟢 |
| Header/Marketing-Hinweise (5) | 🟡 | 🟢 |
| Pflicht-Bestaetigung Checkbox (2) | 🔴 | 🟢 |
| AGB-Refactor B2B (3) | 🟡 | 🟢 nach Anwalt |
| VSBG/ODR-Hinweise (4) | 🟢 | 🟢 |
| Free-Plan unveraendert (6) | 🟢 | 🟢 |
| Beweislast-Logging (7) | 🟡 | 🟢 |

---

## Disclaimer

*Dieser Skill ist ein KI-gestuetzter Risiko-Scan auf Basis publizierter
Rechtslage und Best Practices. Er ersetzt keine anwaltliche Beratung. Vor
Live-Schaltung von Webinhalten mit identifizierten Risiken ist eine
anwaltliche Pruefung dringend empfohlen, bei Hochrisiko-Findings zwingend.*

Insbesondere die folgenden Punkte erfordern anwaltliche Pruefung **vor**
Live-Schaltung:
- AGB-B2B-Refactor (vollstaendiger Volltext)
- Pflicht-Checkbox-Wording (Pruefung empfohlen, nicht zwingend)
- Bei Streitfaellen rund um Verbraucher-Bestaetigung (Einzelfall-Beratung)

---

## Naechste Schritte

- [ ] AGB-Refactor zum Anwalt geben (B2B-Klauseln, siehe Finding 3)
- [ ] Migration `0006_checkout_intents_b2b.sql` mit Logging-Spalten (Finding 7)
- [ ] Pricing-Page-Refactor zu Netto + Hinweisen (Finding 1)
- [ ] Header-Badge + Footer-Note implementieren (Finding 5)
- [ ] Checkout-Refactor mit Pflicht-Checkbox + Firmenname + Land + Logging
  (Finding 2 + 7)
- [ ] VSBG/ODR-Hinweise im Impressum anpassen (Finding 4)
- [ ] Pre-Go-Live: Gate-Pruefung durch Legal-Skill (Modus D)

## Anhang: v6-Architektur-Bezug (final)

Aktueller Implementierungs-Stand ist v6 mit folgenden legal-relevanten
Elementen:
- B2B-Header-Banner ueber dem Shell (Finding 5)
- Rechnungsempfaenger-Block (Step 1): E-Mail + Firma + **Strasse + PLZ + Ort
  + Land** (Pflicht). Die vollstaendige Anschrift gibt Paddle einen klaren
  Bezug zur Rechnung und stuetzt die "objektive Erkennbarkeit als Unternehmer".
- USt-IdNr im selben Rechnungsempfaenger-Block (optional, mit Format-Check).
  Server-Erkennung von Reverse-Charge erfolgt ueber Paddle.
- B2B-Bestaetigungs-Checkbox (Pflicht, Finding 2 — Wording aus diesem Doc)
- Echter Wizard mit Step-2-Lock — Step-2-Lock verhindert Aenderungen nach
  Intent-Erstellung (saubere Audit-Spur)
- **Server-side Paddle-Transaction**: Backend erstellt vor Step 2 die
  Paddle-Transaktion via API. Damit ist die Steuerlogik und VIES-Validierung
  Paddles Verantwortung; der Client zeigt nur formatted_totals.
- Server-Logging via `checkout_intents`-Erweiterung (Finding 7) PLUS
  consent_log-Erweiterung um `b2b_confirmation`, `b2b_confirmation_version`,
  `displayed_hints_hash`. Der Webhook reicht IP + UA aus dem Intent ins
  consent_log durch.

Setup: [`./lifeplus_checkout_paddle_b2b_setup.md`](./lifeplus_checkout_paddle_b2b_setup.md)
Mockup: [`./lifeplus_checkout_paddle_b2b_v6.html`](./lifeplus_checkout_paddle_b2b_v6.html)
- [ ] VSBG/ODR-Hinweise im Impressum anpassen (Finding 4)
- [ ] Pre-Go-Live: Gate-Pruefung durch Legal-Skill (Modus D)
