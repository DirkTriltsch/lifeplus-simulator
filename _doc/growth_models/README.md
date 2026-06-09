# Growth Models — Dokumentationsindex

**Stand:** 2026-06-09
**Geltungsbereich:** Wachstums-, Churn- und Vergütungsmodell des LifePlus-Simulators (gilt analog für FitLine/Eqology).

## Lese-Reihenfolge

1. [01-Zielarchitektur.md](01-Zielarchitektur.md) — Was gilt: Single-Path Personenbaum mit Debounce-UX, Simulationsmodi, Hybridmodell (Exact/Compressed), Drift zwischen Code und Entscheidung.
2. [02-Wachstums-und-Churn-Regeln.md](02-Wachstums-und-Churn-Regeln.md) — Wie es rechnet: Member-/Shopper-/Churn-/Provisionsregeln, Reality-Strategien, UI-Glossar.
3. [03-Benchmark-Status-B1-B2.md](03-Benchmark-Status-B1-B2.md) — B1 architektonisch obsolet (Two-Path verworfen), B2 nicht implementiert, plus Folge-Backlog.

## Pflege-Regel

Modelländerungen werden **direkt** in 01/02/03 eingearbeitet. Es entstehen keine neuen `Erarbeitung XX`-Iterationsdokumente mehr. Wer eine größere Architekturänderung diskutieren will, nutzt einen PR/Branch auf diese Dateien und führt die Diskussion in der PR-Beschreibung oder in `docs/cross-model/` (vgl. CLAUDE.md).

## Historie

Die früheren Iterationsdokumente (`Erarbeitung 01`–`18`, `dynamik-mit-verguetung.md`, `Umsetzung Bericht`) wurden am 2026-06-09 entfernt, nachdem ihr Inhalt in die obigen drei Dateien überführt war. Frühere Stände werden bei Bedarf neu erarbeitet, nicht aus dem Archiv geholt.

## Begleitmaterial

- [Basic_model_descriptions.xlsx](Basic_model_descriptions.xlsx) — externe Beschreibungstabelle, unverändert.
