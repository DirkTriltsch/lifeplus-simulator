# ADR 2026-06-10 - Dokumentationsstruktur und Altlasten-Loeschung

**Status:** angenommen, Loeschwelle ausgefuehrt (siehe §12)
**Datum:** 2026-06-10  
**Entscheider:** Projekt-Owner  
**Scope:** `_doc/`, `docs/cross-model/`, ehemals `website-legacy/`, alte Doku-/Review-/Planungsdateien
**Bezug:** [`documentation-policy.md`](documentation-policy.md), [`reviews/2026-06-09-doku-cleanup-todo-checkliste.md`](reviews/2026-06-09-doku-cleanup-todo-checkliste.md). Frueherer Bezug `cleanup-ist-analyse-2026-06-09.md` wurde am 2026-06-10 entfernt; relevante Befunde sind in §1 und in der Checkliste enthalten.

## 1. Kontext

Das Repository hat in mehreren Bereichen einen deutlichen Stand erreicht:

- Astro ist produktiv abgeschlossen und live. `website-astro/` ist die fuehrende Website-Implementierung.
- Checkout/Billing ist auf B2B-v6.1 konsolidiert und im Runbook dokumentiert.
- Growth-/Simulation-Doku wurde auf den aktuellen Personenbaum-Pfad, `shopperCount`, `person-tree-equal`, Random und Momentum aktualisiert.
- Alte Review-Snapshots, Vor-Migrationsplaene, Codex-/Claude-Paralleltexte und Mockup-Iterationen enthalten teilweise ueberholte oder widerspruechliche Informationen.
- `_doc/_old/` markiert bereits alte Inhalte, fuehrt aber weiterhin zu Suchtreffern und mentaler Last.
- `website-legacy/` ist nach abgeschlossener Astro-Migration kein produktiver Bestandteil mehr.

Die bisherige Idee, alte Dokumente in einen neuen Archivordner zu verschieben, loest das Grundproblem nur teilweise: veraltete Informationen bleiben im Repository sichtbar und werden bei Reviews erneut gelesen oder mit aktuellem Stand verwechselt.

## 2. Entscheidung

Die Projektdokumentation wird kuenftig nach dem Prinzip **fuehrende aktuelle Doku statt internes Dateiarchiv** gepflegt.

Konkret gilt:

1. Relevante aktuelle Informationen werden in wenige fuehrende, human-readable Dokumente ueberfuehrt.
2. Alte, redundante oder durch Code/Runbook ueberholte Dateien werden geloescht, sobald ihre noch relevanten Inhalte extrahiert sind.
3. `_doc/_old/` wird nicht als dauerhaftes Archiv erhalten. Der Ordner wird nach Extraktion relevanter Inhalte geloescht.
4. `website-legacy/` wird als obsolet eingestuft. Nach Link-/Referenzcheck und Sicherstellung, dass keine Build-/Deploy-/Content-Abhaengigkeit mehr besteht, wird der Ordner geloescht.
5. Ein neues `_doc/archive/` wird nicht als Standardziel eingefuehrt. Historie lebt primaer in Git. Ausnahmen brauchen einen klaren Grund.
6. Neue Reviews lesen aktuellen Code und fuehrende Doku, nicht alte Review- oder Planungs-Snapshots.

## 3. Zielbild

Die Dokumentation soll nach dem Cleanup so aussehen:

| Ort | Rolle |
|---|---|
| `README.md` | Einstieg, Repo-Struktur, Build/Test/Deploy, aktueller Brand-/Website-Status |
| `_doc/documentation-policy.md` | Doku-Regeln und Pflegeprinzipien |
| `_doc/growth_models/` | Fuehrende Doku fuer Simulation, Personenbaum, Shopper, Churn, Benchmarks und Code-Cleanup |
| `_doc/paddle_checkout/` | Fuehrendes Checkout-/Billing-/Paddle-Runbook plus relevante aktuelle Referenzen |
| `_doc/go-live/` | Go-Live-, Legal-, Content- und Anti-Abuse-Checklisten |
| `_doc/business plans/` | Aktuelle oder bewusst historische Business-/Marketingplaene mit Statusblock |
| `_doc/reviews/` | Nur aktive Review-/Todo-Dateien, keine alten Snapshots |
| `docs/cross-model/` | Aktive Cross-Model-Plaene gemaess dortigem Review-Flow |
| `website-astro/` | Produktive Website-Implementierung |

Nicht mehr vorgesehen:

- `_doc/_old/` als Sammelordner fuer ueberholte Inhalte.
- `website-legacy/` als dauerhaftes Website-Archiv.
- alte `Claude`-/`Codex`-Parallelfassungen, wenn das Ergebnis in fuehrender Doku aufgegangen ist.
- Vor-Migrationsplaene, wenn die Migration abgeschlossen und der Zielzustand dokumentiert ist.

## 4. Begruendung

Diese Entscheidung reduziert Fehlinterpretationen:

- Veraltete Dateien erzeugen bei `rg` Treffer, die wie aktuelle Arbeit wirken.
- Alte Plaene beschreiben Wege, die nach abgeschlossener Umsetzung nicht mehr handlungsleitend sind.
- Git bewahrt Historie bereits; ein zusaetzliches internes Archiv verdoppelt die Pflege.
- Reviews werden schneller und praeziser, wenn sie aktuelle Doku und aktuellen Code lesen.
- Neue Mitwirkende sehen zuerst den Zielzustand, nicht alte Entscheidungswege.

## 5. Alternativen

### Alternative A - Alles in `_doc/archive/` verschieben

Verworfen.

Vorteil waere eine sichtbare lokale Historie. Nachteil ist, dass veraltete Inhalte weiterhin im Arbeitsbaum liegen, Suchtreffer erzeugen und spaeter wieder geprueft werden muessen.

### Alternative B - `_old` und `website-legacy` dauerhaft behalten

Verworfen.

Das widerspricht dem Ziel, die Doku auf aktuelle, human-readable und handlungsleitende Inhalte zu reduzieren.

### Alternative C - Nur Policy, keine strukturelle Aktion

Verworfen.

Die bisherige Drift zeigt, dass reine Regeln ohne Loeschung nicht reichen. Alte Dateien bleiben sonst praktische Gegen-Dokumentation.

### Alternative D - Fuehrende Doku konsolidieren, Altlasten loeschen

Angenommen.

Diese Alternative passt zum aktuellen Ziel: relevante Inhalte bleiben, redundante oder ueberholte Dateien verschwinden.

## 6. Loesch- und Extraktionsregeln

Eine Datei oder ein Ordner darf geloescht werden, wenn alle folgenden Punkte zutreffen:

1. Der aktuelle Code oder ein fuehrendes Dokument beschreibt den gueltigen Stand.
2. Relevante offene Punkte sind in einer aktuellen Checkliste oder einem fuehrenden Dokument aufgenommen.
3. `rg` zeigt keine produktive Referenz, die nach der Loeschung brechen wuerde.
4. Falls Links bestehen, werden sie vor oder zusammen mit der Loeschung angepasst.
5. Bei fachlich wichtigen Entscheidungen ist die Entscheidung im fuehrenden Dokument oder in einem ADR notiert.

Eine Datei bleibt nur dann erhalten, wenn mindestens einer dieser Punkte zutrifft:

- Sie ist fuehrend fuer aktuellen Code, Produkt, Go-Live, Runbook oder Architektur.
- Sie enthaelt rechtlich, fachlich oder operativ relevante Informationen, die noch nicht extrahiert wurden.
- Sie ist ein aktuelles Mockup oder eine bewusst behaltene Referenzdatei.
- Sie wird von Build, Test, Deploy oder Dokumentationslinks aktiv benoetigt.

## 7. Konkrete Anwendung

### `_doc/_old/`

Status: am 2026-06-10 vollstaendig geloescht. Relevante Inhalte wurden vor der Loeschung in fuehrende Dokumente ueberfuehrt.

Kein Zielzustand: `_doc/_old/` in `_doc/archive/` umbenennen.

### `website-legacy/`

Status: am 2026-06-10 vollstaendig geloescht. `README.md`-Struktur-Block wurde nachgezogen; keine aktive Build-/Deploy-Abhaengigkeit bestand.

Begruendung: Astro ist vollstaendig migriert und live; der Ursprung und Migrationsweg sind nicht mehr handlungsleitend.

### Alte Review-Snapshots

Status: bereits weitgehend geloescht.

Regel: Review-Snapshots duerfen nur bleiben, wenn sie aktive, nicht extrahierte Findings enthalten. Sonst werden Findings in aktuelle Checklisten ueberfuehrt und die Snapshots geloescht.

### Alte Checkout-/Website-Mockups

Status: ueberwiegend geloescht.

Regel: Nur explizit behaltene Referenzen bleiben. Aktueller Stand ist das Runbook und produktiver Code. Alte Varianten werden nicht als historisches Set bewahrt.

Aktuell explizit behalten:

- `_doc/paddle_checkout/lifeplus_checkout_paddle_b2b_v2.html`
- `_doc/paddle_checkout/lifeplus_checkout_paddle_b2b_v6.html`

## 8. Konsequenzen

Positive Folgen:

- Weniger widerspruechliche Suchtreffer.
- Schnellere Reviews.
- Klarere Onboarding-Sicht.
- Aktuelle Doku gewinnt gegen alte Plaene.
- Weniger Pflegeaufwand fuer historische Dateien.

Kosten und Risiken:

- Lokale Dateihistorie ist nicht mehr direkt im Arbeitsbaum sichtbar.
- Bei fehlerhafter Extraktion koennen Details nur ueber Git-Historie rekonstruiert werden.
- Vor dem Loeschen braucht es sorgfaeltige Link- und Inhaltspruefung.

Risikominderung:

- Loeschungen erfolgen nach `rg`-Referenzcheck.
- Fuehrende Dokumente bekommen Status-/Scope-Bloecke.
- Relevante offene Punkte landen in der aktiven Checkliste.
- Git-Historie bleibt die technische Rueckfallquelle.

## 9. Umsetzungsplan

Schritte 1-8 sind am 2026-06-09/2026-06-10 ausgefuehrt. Aktueller Stand:

1. Dieses ADR als angenommenes Zielbild einchecken. **erledigt**
2. [`documentation-policy.md`](documentation-policy.md) auf dieses ADR verweisen. **erledigt**
3. R9/T5.3 in der aktiven Checkliste als entschieden markieren. **erledigt**
4. `_doc/_old/` inventarisieren und relevante Inhalte extrahieren. **erledigt**
5. `_doc/_old/` loeschen. **erledigt**
6. `website-legacy/` referenzieren und technische Abhaengigkeiten pruefen. **erledigt**
7. `website-legacy/` loeschen, wenn keine aktive Abhaengigkeit mehr existiert. **erledigt**
8. README und betroffene Doku-Links aktualisieren. **erledigt** am 2026-06-10.
9. Danach Suchchecks ausfuehren:
   - `rg -n "_doc/_old|website-legacy|archive|Claude|Codex" _doc README.md package.json scripts website-astro`
   - gezielte Linkchecks fuer geaenderte Markdown-Dateien

## 10. Nicht-Ziele

Dieses ADR entscheidet nicht:

- Eine vollstaendige neue Ordnerstruktur fuer alle `_doc`-Root-Dateien.
- Eine externe Wissensdatenbank.
- Eine automatische Markdown-Linkvalidierung.
- Eine Loeschung von produktiven Backup-/SQL-Dateien ohne gesonderten Check.

## 11. Folgefragen

Noch separat zu klaeren:

1. Sollen verbleibende Root-Dokumente spaeter in Themenordner wie `_doc/product/` oder `_doc/architecture/` umziehen?
2. Soll es fuer langfristig relevante rechtliche Nachweise einen separaten, klar benannten Evidence-Ort geben?
3. Soll eine einfache Linkcheck- oder Doku-Lint-Regel in `npm test`/CI aufgenommen werden?

## 12. Umsetzungsstand 2026-06-10

Die in §7 und §9 beschriebene Loeschwelle ist ausgefuehrt:

- `_doc/_old/` entfernt.
- `website-legacy/` entfernt; `README.md`-Struktur-Block am 2026-06-10 nachgezogen.
- `benchmarks/` (inkl. `b1-aggregate-path/` und `b2-shopper-aggregation/`) entfernt; growth_models-Doku verweist nur noch historisch darauf.
- `_doc/paddle_checkout/Umsetzungsplan.md` entfernt; das Runbook ist jetzt allein fuehrend.
- `_doc/cleanup-ist-analyse-2026-06-09.md` entfernt; Inhalte sind in dieses ADR bzw. die Checkliste eingeflossen.
- Alte Codex/Claude-Paralleltexte, Mockups (`v1.html`, `v3.html`, `v4.html`, `v5.html`, `option_a_mockup.html`), Business-Plan-Reviews und Backup-/Diag-Dateien entfernt; vollstaendige Liste in [`reviews/2026-06-10-loeschkandidaten-r12.md`](reviews/2026-06-10-loeschkandidaten-r12.md).

Offene Nacharbeit (nicht ADR-blockierend, aber Cleanup-Folge):

- Inhaltliche Ueberarbeitung der in R12 als "behalten und fuehrend ueberarbeiten" markierten Dateien F01-F09 (eigener Arbeitsstrang "Update Leading Documents").
- Statusbloecke gemaess `documentation-policy.md` §3 in alle bisher unvollstaendig markierten Dateien einziehen.
- Linkreparatur in fuehrenden Dokumenten ist erfolgt (Stand 2026-06-10); ein automatisierter Linkcheck ist Folgefrage 3.
