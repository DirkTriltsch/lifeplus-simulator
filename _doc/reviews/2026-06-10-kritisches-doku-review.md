# Kritisches Doku-Review nach Cleanup

**Stand:** 2026-06-10 (Runde 2; K1-K6 und H2/H4 umgesetzt)
**Status:** Teil-umgesetzt — Linkreparatur, ADR/Checkliste-Nachzug und Statusbloecke sind erledigt. F-03/F-12 (Inhaltliche Ueberarbeitung der "fuehrenden" Altdokumente) und F-05/F-06/F-08/F-09/F-10/F-11/F-14 stehen offen.
**Scope:** `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`, `_doc/`, `_debug/`. Geprueft gegen [`../documentation-policy.md`](../documentation-policy.md) und [`../adr-2026-06-10-dokumentationsstruktur-und-altlasten.md`](../adr-2026-06-10-dokumentationsstruktur-und-altlasten.md).
**Basis:** aktueller Workspace (`rg`/Verzeichnis-Listings 2026-06-10), nicht Erinnerung.
**Folge-Arbeitsstrang:** Phase 7 / "Update Leading Documents" in [`2026-06-09-doku-cleanup-todo-checkliste.md`](2026-06-09-doku-cleanup-todo-checkliste.md).

## 1. Zusammenfassung

- **Gut:** Struktur-ADR und Doku-Policy sind verabschiedet; `_doc/growth_models/`, `_doc/paddle_checkout/checkout-billing-runbook-b2b-v6-1.md` und `_doc/go-live/` sind erkennbar fuehrend und am Code ausgerichtet. README ist gepflegt.
- **Erledigt 2026-06-10 (Runde 2):** Tote Links in fuehrenden Dokumenten (F-01, F-02) repariert; ADR und aktive Checkliste auf den ausgefuehrten Cleanup-Stand nachgezogen (F-13); Statusbloecke nach Policy §3 in 15+ Dateien eingezogen (F-04). Aenderungen sind in den jeweiligen Dateien dokumentiert und in der Checkliste als Phase 7/8 referenziert.
- **Offen / Hoch:** Die in [`2026-06-10-loeschkandidaten-r12.md`](2026-06-10-loeschkandidaten-r12.md) als "behalten und fuehrend ueberarbeiten" markierten Dateien F01-F09 sind weiterhin **nicht** inhaltlich ueberarbeitet (F-03). Zusaetzlich verweist `_doc/Webcontent & Value Proposition.md` noch auf das entfernte `website/`-/Legacy-Template-Modell (F-12). Beide laufen in den separaten Arbeitsstrang **"Update Leading Documents"** = Phase 7 der Checkliste.
- **Offen / Mittel:** Zwei parallele Doku-Roots (`docs/` vs. `_doc/`) — bewusst beibehalten (F-05, geschlossen-im-Beschluss). R12-Schluss-Tabelle mit verwaisten F10-F16 (F-06). Es fehlt zudem ein einfacher automatisierbarer Markdown-Linkcheck, weshalb tote Links nur per Stichprobe auffallen (F-14).
- **Offen / Niedrig:** Doppelung `CLAUDE.md`/`AGENTS.md` und fehlender Cross-Link von Root-Dateien auf `docs/ai/` (F-08); `docs/cross-model/` als Geist-Ordner (F-09); `_debug/` ohne README (F-10); Klartext-E-Mails im `_debug/` (F-11).

## 2. Findings

Schweregrade nach [`../../docs/ai/documentation-output-templates.md`](../../docs/ai/documentation-output-templates.md):
Kritisch = irrefuehrend / Datenverlust-Risiko, Hoch = klare Drift mit Folgekosten, Mittel = Wartbarkeit, Niedrig = Stil/Konvention.

### F-01 [Kritisch] — Tote Links auf geloeschte Vorgaengerdokumente

**Status:** **erledigt 2026-06-10.** Alle in der Tabelle gelisteten Links wurden entfernt, durch Hinweise auf Nachfolger ersetzt oder als historische Erwaehnung umformuliert. Verifikation per `rg`-Suche auf die geloeschten Dateinamen; verbleibende Treffer liegen ausschliesslich in Review-/R12-Dateien, die das Cleanup selbst dokumentieren.

**Beobachtung (urspruenglich):** Mehrere fuehrende Dokumente verlinken Dateien, die in der Cleanup-Welle entfernt wurden:

| Quelle | Zeile | Toter Link |
|---|---|---|
| `_doc/adr-2026-06-10-dokumentationsstruktur-und-altlasten.md` | 7 | `cleanup-ist-analyse-2026-06-09.md` |
| `_doc/reviews/2026-06-09-doku-cleanup-todo-checkliste.md` | 4, 10, 11 | `../cleanup-ist-analyse-2026-06-09.md` |
| `_doc/paddle_checkout/checkout-billing-runbook-b2b-v6-1.md` | 5, 119 | `./Umsetzungsplan.md` |
| `_doc/growth_models/README.md` | 23 | `Basic_model_descriptions.xlsx` |
| `_doc/growth_models/03-Benchmark-Status-B1-B2.md` | 24, 40 | `benchmarks/b1-aggregate-path/`, `benchmarks/b2-shopper-aggregation/` |
| `_doc/Freemium-Modell.md` | 5 | `Konzepte und Umsetzung realistischer Wachstums-Modelle .md` |
| `_doc/Konzept Paddle-Integration und App-Architektur.md` | 14, 757 | `./Produkt-Namenskonvention.md` |
| `_doc/Setup Paddle Products, Prices, Discount-Codes.md` | 1446 | `_doc/Produkt-Namenskonvention.md` |
| `_doc/Setup Infrastruktur Cloudflare, Resend und IONOS.md` | 1041 | `_doc/Produkt-Namenskonvention.md` |
| `README.md` | 17 | `website-legacy/` (Ordner geloescht) |
| `_doc/growth_models/04-Code-Cleanup-Plan.md` | 83 | `benchmarks/b2-shopper-aggregation/` (Ordner geloescht) |

**Auswirkung:** Verstoss gegen [`../documentation-policy.md`](../documentation-policy.md) §4 Pkt. 4 ("Falls Links bestehen, werden sie vor oder zusammen mit der Loeschung angepasst"). Neue Leser folgen Links ins Leere und verlieren genau jenen Kontext, den der Cleanup sichtbar machen sollte.

**Vorschlag:** Pro Eintrag entweder

- Link entfernen und Aussage als Volltext im aktuellen Dokument behalten, oder
- Link auf die Git-Historie referenzieren als Kommentar (z. B. *"frueher in `cleanup-ist-analyse-2026-06-09.md`, geloescht 2026-06-10, Inhalte in §3 ueberfuehrt"*), oder
- Verweis auf aktuelle Nachfolger setzen (z. B. ADR-Bezug → Runbook bzw. ADR selbst).

Konkret: `cleanup-ist-analyse-...` → in ADR/Checkliste durch *"Status-/Begruendungs-Stand im ADR §1-2"* ersetzen; `Umsetzungsplan.md` → Hinweis aus Runbook entfernen (Status "ersetzt" ist redundant, wenn die Quelle nicht mehr existiert); `Basic_model_descriptions.xlsx` → Zeile aus `growth_models/README.md` streichen; `Produkt-Namenskonvention.md` → §4 von `Setup Paddle ...md` als Quelle benennen.

---

### F-02 [Kritisch] — `README.md` beschreibt `website-legacy/` als Bestandteil, Ordner ist weg

**Status:** **erledigt 2026-06-10.** Zeile aus README-Struktur-Block entfernt.

**Datei:** `README.md:17`

**Beobachtung (urspruenglich):** Struktur-Block listet `website-legacy/` als "Archiv der alten statischen Template-Website". `ls website-legacy` schlaegt fehl ("No such file or directory"). Der Ordner wurde gemaess ADR §7 und R12-Aufraeumliste entfernt.

**Auswirkung:** README ist *die* Einstiegsdoku — eine falsche Struktur-Karte wirkt staerker als ein falscher Konzeptverweis. Onboarding-Leser glauben, der Ordner existiere.

**Vorschlag:** Zeile loeschen. Optional einen kurzen Satz ergaenzen: *"Astro hat die alte Template-Website abgeloest; Historie liegt in Git, nicht im Arbeitsbaum."*

---

### F-03 [Hoch] — R12-"behalten und fuehrend ueberarbeiten" ist nicht ausgefuehrt

**Status:** **offen, in eigenen Arbeitsstrang ausgelagert.** Inhaltliche Ueberarbeitung laeuft als Phase 7 der aktiven Checkliste ("Update Leading Documents"). Alle neun Dateien tragen seit 2026-06-10 einen Statusblock mit `Status: in Ueberarbeitung — Phase 7 Update Leading Documents (Fxx)` (siehe F-04).

**Quellen:** [`2026-06-10-loeschkandidaten-r12.md`](2026-06-10-loeschkandidaten-r12.md) Abschnitt "Umschreiben statt loeschen" — Eintraege F01-F09.

**Beobachtung:** Alle neun Dateien tragen heute einen "Hinweis 2026-06-09"-Banner auf veraendertem Datumstand, der Hauptkoerper bleibt der alte Konzeptstand:

| ID | Datei | Beobachtung im Body |
|---|---|---|
| F01 | `_doc/Freemium-Modell.md` | Hinweis-Banner + alter Stand 2026-05-25; Verweis auf geloeschtes "Konzepte und Umsetzung realistischer Wachstums-Modelle.md" |
| F02 | `_doc/Freemium-Modell_Applikation.md` | Hinweis-Banner; Body beschreibt MVP-Entwurf, nicht den Ist-Code |
| F03 | `_doc/Konzept Kundenlinks und Szenario-Freigabe.md` | Status "konsolidiert v3" 2026-05-26, kein Hinweis auf B2B-v6.1-Ist |
| F04 | `_doc/Konzept Paddle-Integration und App-Architektur.md` | Status-Banner 2026-05-22; verweist mehrfach auf geloeschtes `Produkt-Namenskonvention.md` |
| F05 | `_doc/Netzwerk-Modellierung.md` | Stand 2026-05-27; nicht erkennbar mit `growth_models/01-Zielarchitektur.md` synchronisiert |
| F06 | `_doc/Referenznetzwerk-Tests.md` | Stand 2026-05-28; kein Sync mit aktueller `packages/*/tests`-Landschaft sichtbar |
| F07 | `_doc/Rank-Badges.md` | Kein Statusblock, kein Datum, kein Hinweis auf Code-Stand |
| F08 | `_doc/Paddle_API_Commands & Scripts.md` | Kein Statusblock; Script-Sammlung ohne Fuehrend/Historisch-Markierung |
| F09 | `_doc/Webcontent & Value Proposition.md` | Datei beginnt mit Reviewer-Notiz *"Belasse alles unveraendert ..."*; kein Statusblock; gemischt User-Notizen + Konzept |

**Auswirkung:** Diese neun Dateien sind aktuell genau das, was der Cleanup verhindern sollte — alte Konzepte, ueber denen ein duenner *Hinweis*-Schleier liegt. Bei `rg`-Treffern bekommen Leser den alten Text als Antwort, nicht den aktuellen Stand.

**Vorschlag pro Datei:** Entweder

- (a) **Echt fuehrend machen:** Body auf den Ist-Code/-Doku einkuerzen, alte Annahmen klar gekennzeichnet (`> Historisch / nicht mehr gueltig`) in einen eigenen Abschnitt am Ende verschieben.
- (b) **Echt historisch machen:** Statusblock `Status: historisch / abgeloest durch <X>` und Body unveraendert lassen — solange in der fuehrenden Doku ein Nachfolger existiert.
- (c) **Loeschen:** Wenn (a) und (b) keinen klaren Mehrwert haben — z. B. F07 Rank-Badges duplizieren primaer Code, der ohnehin als Master gilt.

Empfehlung pro F-ID (kein Beschluss, Vorschlag):

| ID | Vorschlag | Begruendung |
|---|---|---|
| F01 | (a) fuehrend, Pro-/Free-/Trial-Produktstrategie und Status quo Code | aktuell relevant fuer Go-Live und Compliance |
| F02 | (b) historisch, Verweis auf aktuelle App-Komponenten | Body beschreibt MVP-Phase, Code ist weiter |
| F03 | (a) fuehrend, aber auf B2B-v6.1-Stand verkuerzen | Sharing-Flow gibt es im Code; Konzept ist relevanter Master |
| F04 | (a) fuehrend, aber auf erreichte Architektur reduzieren | redundant zu Runbook ist riskant, ein Architektur-Master ist sinnvoll |
| F05 | (b) historisch, Pointer auf `growth_models/01-Zielarchitektur.md` | dort ist der Master |
| F06 | (a) fuehrend, kuerzer, Sync mit `tests/integration` und `packages/*/tests` | Tests werden ohne diesen Master nicht konsistent |
| F07 | (c) loeschen oder (b) historisch | Single-Source ist Code |
| F08 | (a) fuehrend, ggf. nach `_doc/paddle_checkout/` verschieben | thematisch dort sinnvoller |
| F09 | (a) fuehrend, User-Notizen in eigenen Abschnitt | Reviewer-Notiz am Anfang weicht von Konvention ab |

---

### F-04 [Hoch] — Fehlende oder unvollstaendige Statusbloecke

**Status:** **erledigt 2026-06-10.** Statusbloecke wurden in alle aufgelisteten Dateien plus die F-03-Dateien eingezogen. `Stand` ist das jeweilige Datei-Mtime (oder ein bewusst gesetztes Datum), `Status` markiert `fuehrend`, `historisch`, `in Ueberarbeitung — Phase 7 ...` oder `Konzept-Master / ...`. Folgepruefung in Phase 8 der Checkliste (T8.2 nach Abschluss Phase 7).

**Verstoss gegen:** [`../documentation-policy.md`](../documentation-policy.md) §3 ("Stand, Status, Scope, ggf. Ersetzt/Ersetzt durch/Nicht verifiziert").

**Beobachtung:** Diese Dokumente haben keinen oder nur einen unvollstaendigen Statusblock:

| Datei | Was fehlt |
|---|---|
| `_doc/Rank-Badges.md` | Stand, Status, Scope |
| `_doc/Referenznetzwerk-Tests.md` | nur "Stand: 2026-05-28", kein Status |
| `_doc/Netzwerk-Modellierung.md` | nur "Stand: 2026-05-27", kein Status |
| `_doc/Paddle_API_Commands & Scripts.md` | Stand, Status, Scope |
| `_doc/Webcontent & Value Proposition.md` | Stand, Status, Scope; beginnt mit User-Notiz |
| `_doc/business plans/lifeplus_business_plan.md` | Stand, Status |
| `_doc/business plans/fitline_business_plan.md` | Stand, Status |
| `_doc/business plans/eqology_business_plan.md` | Stand, Status |
| `_doc/business plans/marktstudie_vergutungsplan_simulator.md` | nur "Datumsstand: Mai 2026", kein Status |
| `_doc/Setup Infrastruktur Cloudflare, Resend und IONOS.md` | nur "Stand: 2026-05-22", kein Status |
| `_doc/Setup Paddle Products, Prices, Discount-Codes.md` | nur "Stand: 2026-05-22", kein Status |
| `_doc/paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md` | Stand und Scope vorhanden, aber kein Status; "Aktiver Mockup: v6" widerspricht Body-Status v6.1 aktiv |
| `_doc/paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md` | Datum/Anlass vorhanden, aber kein Status/Scope im Policy-Format |
| `_doc/go-live/go-live-content-legal-checklist.md` | Stand und Scope vorhanden, aber kein Status |
| `_doc/documentation-policy.md` | Stand/Status vorhanden, aber kein Scope/Bezug im Pflichtformat ausser ADR |

**Vorschlag:** Bei jeder Datei einen Block ergaenzen, mindestens:

```text
**Stand:** YYYY-MM-DD
**Status:** fuehrend | historisch | extern unveraendert
**Scope:** <eine Zeile>
```

Bei `Setup ...`-Dateien plausibel **fuehrend** (sind operative Runbooks). Business Plans wahrscheinlich **historisch / Referenz**. `Webcontent & Value Proposition.md` wahrscheinlich **fuehrend** (Wording-Master fuer Astro-Content).

---

### F-05 [Mittel] — Zwei parallele Doku-Roots `docs/` vs. `_doc/`

**Status:** **als Beschluss geschlossen 2026-06-10.** User-Entscheidung: aehnliche Namen, aber bewusst verschiedener Einsatz. `docs/` = Agenten-/Workflow-Konventionen und Cross-Model-Plaene; `_doc/` = Projekt-/Produkt-Doku. Bleibt so. Keine Migration, keine Policy-Aenderung noetig. M1 entfaellt.

**Beobachtung (zur Dokumentation des Beschlusses):** Das Repo hat zwei nicht-deckungsgleiche Doku-Wurzeln:

```text
docs/
├── ai/                  (documentation-agent.md u. a. — Agenten-Konventionen)
└── cross-model/         (cross-model-review-flow.md — Cross-Model-Workflow)

_doc/
├── (Projekt-/Produkt-Doku, Konzepte, Reviews, Growth, Paddle, Go-Live, Business)
├── documentation-policy.md
└── adr-2026-06-10-...md
```

[`../documentation-policy.md`](../documentation-policy.md) §2 listet `docs/cross-model/` als fuehrend, **nennt aber `docs/ai/` nicht**. Default-Verzeichnisstruktur aus [`../../docs/ai/documentation-workflow.md`](../../docs/ai/documentation-workflow.md) wiederum schlaegt `docs/architecture/`, `docs/concepts/`, `docs/guides/` vor — was im Repo bewusst nicht uebernommen wurde.

**Auswirkung:** Neue Dokumente landen unklar (`docs/` oder `_doc/`?). Mittelfristig drohen Schattenstrukturen.

**Vorschlag:** In `_doc/documentation-policy.md` §2 eine Zeile fuer `docs/ai/` aufnehmen ("Agenten- und Workflow-Konventionen, nicht Projekt-Doku") und explizit notieren, dass `_doc/` der Projekt-Doku-Root ist und die Templates aus `docs/ai/documentation-workflow.md` dort sinngemaess umgesetzt werden. Keine strukturelle Migration noetig — nur Klarstellung.

---

### F-06 [Mittel] — R12-Datei enthaelt verwaiste F-IDs

**Datei:** [`2026-06-10-loeschkandidaten-r12.md:89`](2026-06-10-loeschkandidaten-r12.md)

**Beobachtung:** Letzte Tabellenzeile sagt *"F10, F11, F13, F14, F15 und F16 bleiben; F12 ist bereits geloescht"*. In der Datei selbst sind nur F01-F09 definiert. F10-F16 stehen nur in der "Nicht als Loeschkandidat gelistet"-Tabelle als Begruendungstext (z. B. *"Bleibt laut User-Entscheidung zu F10"*), nicht als eigene Eintraege.

**Auswirkung:** Liest sich wie ein dangling reference auf eine frueheres Listing.

**Vorschlag:** Entweder F10-F16 in der Hauptliste rekonstruieren (mit Pfad und Entscheidung), oder die "bleiben"-Tabelle dort referenziert nicht-existente IDs entfernen.

---

### F-07 [Mittel] — Aktive Checkliste meldet sich als "umsetzbare Punkte erledigt", offene Folgepunkte stehen aber im R12-Anhang

**Datei:** [`2026-06-09-doku-cleanup-todo-checkliste.md:6`](2026-06-09-doku-cleanup-todo-checkliste.md)

**Beobachtung:** Header sagt *"Umsetzbare Punkte erledigt"*, die einzige Open-Frage ist R12 (Loeschfreigabe). Tatsaechlich sind die F01-F09-Ueberarbeitungen (F-03 oben) und die Status-Bloecke (F-04 oben) offene Arbeit, die noch keinem Phase-Eintrag zugeordnet ist.

**Vorschlag:** In der Checkliste eine **Phase 7 — Inhaltliche Ueberarbeitung F01-F09** und eine **Phase 8 — Statusblock-Nachzug** ergaenzen, jeweils mit klaren Sub-Tasks. Damit bleibt die Checkliste die fuehrende Stelle.

---

### F-08 [Niedrig] — `CLAUDE.md` und `AGENTS.md` an Root sind faktisch identisch

**Beobachtung:** Beide Dateien enthalten den identischen Cross-Model-Block (nur Whitespace unterscheidet sich). Beide verweisen nur auf `docs/cross-model/`, nicht auf `docs/ai/documentation-*.md` oder `_doc/documentation-policy.md`.

**Vorschlag:**
- Eine Datei ist redundant. Falls beide Agent-Familien (Claude, Codex/OpenAI) gleichberechtigt sein sollen, beide behalten — dann aber **synchron halten**, am besten eine Datei als Master und die andere als 1:1-Kopie mit Hinweis.
- Beide um einen Verweis auf `_doc/documentation-policy.md` und `docs/ai/documentation-agent.md` ergaenzen, damit Agenten beim Erstellen oder Aendern von Doku die Konventionen finden.

---

### F-09 [Niedrig] — `docs/cross-model/` enthaelt nur das Protokoll, kein aktiver Plan

**Beobachtung:** Per `cross-model-review-flow.md` ist `docs/cross-model/` Ort fuer aktive Cross-Model-Plaene. Aktuell liegt dort nur die Protokolldatei selbst. Das ist konsistent zu Policy §2 "Aktive Cross-Model-Plaene gemaess `cross-model-review-flow.md`" — aber wirkt wie ein Geist-Ordner.

**Vorschlag:** Im README oder in der Doku-Policy einen Satz aufnehmen: *"Solange kein aktiver Plan laeuft, ist `docs/cross-model/` leer ausser dem Workflow-Protokoll."* Nicht aenderungsbeduerftig, nur klarstellungsfaehig.

---

### F-10 [Niedrig] — `_debug/` ohne Index/Statusblock

**Beobachtung:** `_debug/` ist laut R12 bewusster Sammelordner fuer manuelle Debug-Tools. Es gibt aber kein `_debug/README.md`, das den Zweck, die Konvention "throw-away" und die Beziehung zu `migrations/` erklaert. `_debug/debug-session-lifeflow360.md` ist eine konkrete Debug-Session aus einer abgeschlossenen Fehlersuche und steht ohne Statusblock daneben.

**Vorschlag:** Mini-README `_debug/README.md`:

- Zweck: ad-hoc, throw-away Debug- und Cleanup-Skripte.
- Nicht-Verantwortung: keine Migrations, keine Tests.
- Hygiene: jede konkrete Session-Datei (z. B. `debug-session-lifeflow360.md`) tragt am Kopf ein `Datum`, einen `Status` (offen/geloest), Verweis auf Loesung im Code.
- Hinweis: SQL-Dateien hier sind **nicht** als Migration auszufuehren.

---

### F-11 [Niedrig] — Klartext-E-Mails in `_debug/`-SQL und Markdown

**Datei:** `_debug/cleanup-test-users.sql:11-20`, `_debug/debug-session-lifeflow360.md`

**Beobachtung:** Test- und Echt-E-Mails (`budweiser.belinda@gmail.com`, `dao@triltsch-online.de`) sind im Repo eingecheckt.

**Auswirkung:** Solange das Repo privat ist, niedrig. Bei einer kuenftigen Veroeffentlichung oder Forks waere das DSGVO-/Privacy-relevant.

**Vorschlag:** Entweder Repo bewusst privat halten und Befund schliessen, oder echte Mails durch Platzhalter ersetzen und die echte Liste lokal/`.gitignore` halten.

---

### F-12 [Kritisch, jetzt Hoch+offen] — `Webcontent & Value Proposition.md` referenziert geloeschte Website-/Template-Pfade

**Status:** **offen, in eigenen Arbeitsstrang ausgelagert.** Datei traegt seit 2026-06-10 einen Statusblock mit Verweis auf Phase 7 (F09, F12). Inhaltliche Ueberarbeitung der `website/templates/*`- und `website/brands.json`-Links erfolgt in Phase 7 "Update Leading Documents" gemeinsam mit den F01-F09-Dateien.

**Datei:** `_doc/Webcontent & Value Proposition.md`

**Beobachtung:** Die Datei ist in R12 als "behalten und fuehrend ueberarbeiten" markiert, enthaelt aber noch zahlreiche Links auf das alte Website-Modell:

| Zeilenbereich | Alter Pfad / Aussage |
|---|---|
| 347-350 | `website/templates/index.html`, `features.html`, `pricing.html`, `website/brands.json` |
| 392-544 | viele Findings zeigen auf `website/templates/...` und alte Zeilennummern |
| 752-805 | Stufen-/Brand-Analyse referenziert `website/brands.json` und alte Template-Dateien |
| 836-839 | Quellenliste nennt erneut `website/templates/*` und `website/brands.json` |

Der aktuelle Code liegt laut README und Workspace unter `website-astro/`, nicht unter `website/` oder `website-legacy/`.

**Auswirkung:** Das ist mehr als ein einzelner toter Link: Das Dokument behauptet implizit, die fachliche Website-Analyse beziehe sich auf das alte Template-System. Wenn dieses Dokument weiter als Value-Proposition- oder Content-Master dienen soll, fuehrt es neue Leser aktiv in die falsche Codebasis.

**Vorschlag:** Datei in zwei Teile trennen:

- oben ein kurzer fuehrender Abschnitt fuer aktuelles Wording und aktuelle Astro-Quellen (`website-astro/src/brands/*/content/*.yaml`, `website-astro/src/shared/components/sections/*`),
- darunter einen klar markierten historischen Abschnitt "Analyse altes Template-System, abgeloest durch Astro".

Alle Links auf `website/templates/*` entweder entfernen, auf Git-Historie umformulieren oder auf aktuelle Astro-Dateien mappen. Falls kein aktueller Wording-Master benoetigt wird, Datei als historisch markieren statt als fuehrend.

---

### F-13 [Hoch] — ADR und aktive Checkliste sind nach ausgefuehrten Loeschungen nicht nachgefuehrt

**Status:** **erledigt 2026-06-10.**
- ADR: Bezug entlinkt, §7/`_doc/_old`/`website-legacy` auf Vergangenheit umgestellt, §9-Schritte als "erledigt" markiert, neuer §12 "Umsetzungsstand 2026-06-10" eingezogen.
- Checkliste: Header von "Umsetzbare Punkte erledigt" auf "Loesch-/Aufraeumphase ausgefuehrt; offene Nacharbeiten siehe Phase 7/8" umgestellt; T0.1/T0.2 von `cleanup-ist-analyse-...` entlinkt; T1.5 um Loesch-Hinweis ergaenzt; **Phase 7 — Update Leading Documents (F01-F09, F12)** und **Phase 8 — Statusblock-Nachzug** neu aufgenommen.

**Dateien:** `_doc/adr-2026-06-10-dokumentationsstruktur-und-altlasten.md`, `_doc/reviews/2026-06-09-doku-cleanup-todo-checkliste.md`

**Beobachtung:** Beide Dokumente sind Steuerdokumente, beschreiben aber teils noch den Zustand vor Abschluss der Loeschwelle:

- ADR §7/§9 sagt, `_doc/_old/` und `website-legacy/` wuerden nach Referenzcheck geloescht; im Workspace sind sie bereits geloescht.
- ADR-Bezug verweist auf `cleanup-ist-analyse-2026-06-09.md`, die laut R12 entfernt wurde.
- Checkliste T1.5 sagt, `_doc/paddle_checkout/Umsetzungsplan.md` sei historisch markiert und verweise auf das neue Runbook; die Datei ist inzwischen geloescht.
- Checkliste-Header sagt "Umsetzbare Punkte erledigt", waehrend R12/F01-F09-Umschreiben, Statusbloecke und Linkreparatur noch offen sind.

**Auswirkung:** Ausgerechnet die Dokumente, die den Doku-Cleanup steuern sollen, bilden den Cleanup-Lebenszyklus nicht sauber ab. Dadurch kann spaeter niemand unterscheiden, ob eine Aufgabe noch offen, erledigt oder durch Loeschung ersetzt wurde.

**Vorschlag:** ADR um einen kurzen Abschnitt "Umsetzungsstand 2026-06-10" ergaenzen:

- `_doc/_old/`, `website-legacy/`, `benchmarks/`, `Umsetzungsplan.md`, alte Review-Snapshots: entfernt.
- offene Nacharbeit: Linkreparatur, F01-F09-Ueberarbeitung, Statusbloecke, Linkcheck-Regel.

Checkliste-Header auf "Cleanup-Welle ausgefuehrt, Nacharbeiten offen" aendern und R12/Folgearbeiten als eigene Phasen aufnehmen. Historische Tasks duerfen erledigt bleiben, brauchen aber keine Links auf geloeschte Dateien.

---

### F-14 [Mittel] — Kein automatisierbarer Markdown-Linkcheck / Doku-Lint

**Beobachtung:** Dieses Review selbst nennt unter "Nicht reviewt", dass kein vollstaendiger Markdown-Linkcheck per Tool lief. Die nachtraegliche `rg`-Pruefung zeigt, dass F-01 wichtige Linkcluster uebersehen hat (`Webcontent & Value Proposition.md`).

**Auswirkung:** Die Policy fordert Link-/Referenzsuche vor Loeschungen, aber der Prozess bleibt manuell und fehleranfaellig. Bei der naechsten Loeschwelle wiederholt sich dasselbe Muster.

**Vorschlag:** Einen kleinen lokalen Doku-Check einfuehren, bevor weitere Doku-Dateien geloescht werden:

- prueft relative Markdown-Links auf existierende Dateien,
- ignoriert bewusst externe URLs, Anker-only Links und dokumentierte historische Git-Hinweise,
- laeuft zunaechst manuell (`npm run docs:check` oder Script unter `scripts/`), spaeter optional in CI.

Das ist kein Ersatz fuer Inhaltsreview, aber ein guenstiger Guardrail gegen tote Links.

## 3. Nicht reviewt

- **Code selbst** ausser punktuell zur Verifikation existierender/geloeschter Pfade.
- **Inhalt der Setup-Dateien** (`Setup Paddle ...md`, `Setup Infrastruktur ...md`) ueber Header und referenzierte Links hinaus — sie sind funktional Runbooks und wuerden eine eigene Code-vs-Doku-Pruefung verdienen.
- **Sketches/`.excalidraw`/PPTX**, `_doc/sketches/` — bewusst laut R12 behalten.
- **Business-Plans** inhaltlich — nur Header-/Status-Konvention geprueft, nicht fachliche Aktualitaet.
- **Cross-Model-Protokoll** inhaltlich.
- **Markdown-Linkcheck per Tool** — manuell gepruefte Stichprobe ueber `rg` auf bekannte geloeschte Dateien und alte Pfadcluster, kein vollstaendiger Linter-Run.

## 4. Empfohlene naechste Schritte als Todo-Liste

Sortiert nach Schweregrad, jeder Eintrag actionable und auf eine konkrete Datei bezogen. Stand 2026-06-10 nach Runde 2 (K1-K6, H2, H3, H4 umgesetzt).

### Sofort (Kritisch)

- [x] **K1** Tote Links aus F-01 reparieren oder entfernen. **erledigt 2026-06-10.**
- [x] **K2** `README.md:17` — `website-legacy/`-Zeile aus Struktur-Block entfernen. **erledigt 2026-06-10.**
- [x] **K3** `_doc/Freemium-Modell.md:5` — Bezug auf `Konzepte und Umsetzung realistischer Wachstums-Modelle .md` durch Verweis auf `_doc/growth_models/01-Zielarchitektur.md` ersetzen. **erledigt 2026-06-10.**
- [x] **K4** `_doc/paddle_checkout/checkout-billing-runbook-b2b-v6-1.md:5, 119` — Verweise auf geloeschtes `Umsetzungsplan.md` streichen; Abschnitt "Historische Dokumente" anpassen. **erledigt 2026-06-10.**
- [x] **K5** `_doc/growth_models/README.md:23` — Zeile fuer `Basic_model_descriptions.xlsx` entfernen. **erledigt 2026-06-10** (Begleitmaterial-Block ersatzlos gestrichen).
- [x] **K6** `_doc/growth_models/03-Benchmark-Status-B1-B2.md:24, 40` und `04-Code-Cleanup-Plan.md:83` — `benchmarks/...`-Pfade als historisch markieren. **erledigt 2026-06-10.**
- [ ] **K7** `_doc/Webcontent & Value Proposition.md` — Links auf `website/templates/*` und `website/brands.json` entfernen, historisch markieren oder auf aktuelle `website-astro/`-Quellen mappen (F-12). **verschoben in Phase 7 Update Leading Documents** (T7.3); Statusblock seit 2026-06-10 vorhanden.

### Inhaltliche Konsolidierung (Hoch)

- [ ] **H1** F01-F09-Dateien jeweils entscheiden: (a) fuehrend ueberarbeiten, (b) historisch markieren mit Pointer auf Master, (c) loeschen. Vorschlag pro ID siehe F-03 Tabelle. **verschoben in Phase 7 Update Leading Documents** (T7.1/T7.2).
- [x] **H2** Statusbloecke nach `documentation-policy.md` §3 in den in F-04 gelisteten Dateien ergaenzen. **erledigt 2026-06-10** (T8.1; Nachpruefung in T8.2 nach Phase 7).
- [x] **H3** Aktive Checkliste [`2026-06-09-doku-cleanup-todo-checkliste.md`](2026-06-09-doku-cleanup-todo-checkliste.md) um **Phase 7 — F01-F09-Ueberarbeitung** und **Phase 8 — Statusblock-Nachzug** ergaenzen. **erledigt 2026-06-10.**
- [x] **H4** ADR und aktive Checkliste um Umsetzungsstand/Nacharbeiten nachziehen; keine Links auf geloeschte Arbeitsdateien als fuehrende Referenzen stehen lassen (F-13). **erledigt 2026-06-10.**

### Strukturklarheit (Mittel)

- [x] ~~**M1** `_doc/documentation-policy.md` §2 um Eintrag `docs/ai/` ergaenzen ...~~ **entfaellt:** User-Beschluss 2026-06-10 — `docs/` und `_doc/` sind aehnlich benannt, aber bewusst verschiedener Einsatz; bleibt unveraendert (F-05).
- [ ] **M2** [`2026-06-10-loeschkandidaten-r12.md`](2026-06-10-loeschkandidaten-r12.md) Schluss-Tabelle bereinigen: F10-F16 entweder rekonstruieren oder Erwaehnung streichen (F-06).
- [ ] **M3** Mini-`_debug/README.md` anlegen, Status- und Hygieneregel klaeren (F-10).
- [ ] **M4** Einfachen Markdown-Linkcheck/Doku-Lint einfuehren oder zumindest als manuellen Pflichtschritt vor weiteren Loeschungen dokumentieren (F-14).

### Kosmetik (Niedrig)

- [ ] **N1** `CLAUDE.md` und `AGENTS.md` synchronisieren oder zusammenfuehren; Verweis auf `_doc/documentation-policy.md` und `docs/ai/documentation-agent.md` ergaenzen (F-08).
- [ ] **N2** In `docs/cross-model/cross-model-review-flow.md` oder Doku-Policy klarstellen: "Ordner enthaelt nur das Protokoll, solange kein Plan laeuft" (F-09).
- [ ] **N3** Entscheiden, ob `_debug/`-Klartext-Mails durch Platzhalter ersetzt werden (F-11).

### Naechster Arbeitsstrang

- Phase 7 / **Update Leading Documents** in der Checkliste — Auftrag fuer F01-F09 und F12 (Webcontent). Eigene Konversation/eigener Thread.

## 5. Annahmen

- (Annahme) Das Repo bleibt vorerst privat; F-11 ist deshalb nicht "Hoch".
- (Annahme) `_doc/business plans/` ist kein operatives Marketing-Material mehr, sondern historische/strategische Referenz — daher Empfehlung "historisch" als Statusblock.
- (Annahme) `docs/ai/documentation-agent.md` ist die Quelle der Doku-Konventionen fuer Agenten; `_doc/documentation-policy.md` die fuer Menschen. Ueberlapp besteht; eine Aufloesung waere zukuenftig sinnvoll, aber nicht Teil dieses Reviews.

## 6. Offene Fragen an dich

Beantwortet 2026-06-10:

1. ~~F-03 / H1 — Soll ich pro F-ID einen konkreten Vorschlag inklusive Patch erstellen ...~~ **Beantwortet:** F-03 laeuft als eigener Thread "Update Leading Documents".
2. ~~F-05 / M1 — Bleibt die Trennung ...~~ **Beantwortet:** bleibt unveraendert.

Weiter offen:

1. **F-06 / M2** — Soll die R12-Schluss-Tabelle die F10-F16 rekonstruieren (mit Pfad und Entscheidung) oder die Erwaehnung ersatzlos entfernt werden?
2. **F-10 / M3** — `_debug/README.md` jetzt anlegen oder erst, wenn das naechste Debug-Skript hinzukommt?
3. **F-11 / N3** — Repo dauerhaft privat, oder soll der Klartext-Mail-Pfad jetzt bereinigt werden?
4. **F-14 / M4** — Soll der Linkcheck nur als manueller Review-Schritt dokumentiert werden, oder als kleines Script ins Repo?
5. **F-08 / N1** — `CLAUDE.md` und `AGENTS.md` zusammenfuehren oder beide gleichberechtigt halten?
