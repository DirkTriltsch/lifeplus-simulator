# Dokumentationsregel

**Stand:** 2026-06-10 (Datei-Mtime); inhaltlicher Stand 2026-06-09
**Status:** fuehrend fuer Doku-Cleanup und kuenftige Ablageentscheidungen
**Scope:** Pflegeregeln fuer Projekt-Doku unter `_doc/` und `docs/`; Statusbloecke, Loeschregeln und fuehrende Orte.
**ADR-Historie:** Die strukturelle Cleanup-Entscheidung (ADR 2026-06-10) wurde am 2026-06-10 in diese Policy konsolidiert; ADR-Datei wurde entfernt. Historischer Stand: Git-Historie.

## 1. Grundsatz

Der aktuelle Code ist die massgebliche Quelle. Dokumentation beschreibt den
Codezustand, erklaert bewusste Abweichungen oder markiert offene Drift
ausdruecklich.

## 2. Fuehrende Orte

| Ort | Zweck |
|---|---|
| `README.md` | Einstieg, Struktur, Build/Test/Deploy, Brand-Status |
| `_doc/growth_models/` | Simulation, Personenbaum, Growth-Regeln, Benchmark-Status |
| `_doc/paddle_checkout/` | Checkout, Billing, Paddle, B2B-v6.1, Go-Live-Runbook |
| `_doc/go-live/` | Go-Live-Checklisten, Legal-/Content-Offenpunkte |
| `_doc/` Root | Bestehende Produkt-/Architekturkonzepte, solange kein Unterordner existiert |
| `_doc/reviews/` | Aktive Review-Checklisten; alte Snapshots werden nach Extraktion geloescht |
| `docs/cross-model/` | Aktive Cross-Model-Plaene gemaess `cross-model-review-flow.md` |

## 3. Statusblock

Fuehrende Dokumente brauchen am Kopf mindestens:

- `Stand`
- `Status`
- `Scope` oder `Bezug`
- falls zutreffend: `Ersetzt`, `Ersetzt durch`, `Nicht verifiziert`

Datierte Reviews duerfen historisch bleiben. Wenn ein Review offene Arbeit
ausloest, wird diese in eine aktuelle Checkliste ueberfuehrt statt im Review
still umgeschrieben.

## 4. Archivierung und Loeschung

Vor dem Verschieben oder Loeschen:

1. Link-/Referenzsuche per `rg`.
2. Sicherstellen, dass ein fuehrendes Nachfolgedokument existiert.
3. `git status --short` pruefen.
4. Loeschliste separat bestaetigen lassen, wenn Dateien entfernt werden.

Mockups, alte Codex/Claude-Paralleltexte, Vor-Migrationsplaene und bereits als
alt markierte Ordner sind Loeschkandidaten, sobald aktuelle Runbooks oder
Architekturtexte die noch relevanten Inhalte tragen. Strukturelle Cleanup-Regel
(aus dem 2026-06-10-ADR, hier konsolidiert): keine dauerhafte `_old`-/Legacy-Ablage
als Ersatz fuer fuehrende Doku. Historie liegt in Git.

## 5. Remote- und Dashboard-Zustand

Remote-Migrationen, Cloudflare-Settings und Paddle-Dashboard-Werte werden nicht
geraten. Sie bleiben `nicht verifiziert`, bis eine aktuelle lokale Quelle, ein
CLI-Befehl, Export oder Screenshot vorliegt.

Agenten-Notizen sind keine fuehrende Projektdokumentation. Wenn ein solcher
Inhalt weiter gelten soll, wird er als normaler human-readable Text in `_doc/`
ueberfuehrt oder als konkreter Checklistenpunkt formuliert. Reine Links oder
absolute Pfade auf lokale Agentenordner sind nicht handlungsleitend.
