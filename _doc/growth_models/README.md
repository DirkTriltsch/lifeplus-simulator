# Growth Models - Dokumentationsindex

**Stand:** 2026-06-10  
**Geltungsbereich:** Wachstums-, Churn- und Verguetungsmodell des LifePlus-Simulators; gilt analog fuer FitLine/Eqology.

## Lese-Reihenfolge

1. [01-Zielarchitektur.md](01-Zielarchitektur.md) - Was gilt: Single-Path Personenbaum mit Debounce-UX, Simulationsmodi, Exact/Compressed, bekannte Drift-Risiken.
2. [02-Wachstums-und-Churn-Regeln.md](02-Wachstums-und-Churn-Regeln.md) - Wie es rechnet: Member-/Shopper-/Churn-/Provisionsregeln, Reality-Strategien, UI-Glossar.
3. [03-Benchmark-Status-B1-B2.md](03-Benchmark-Status-B1-B2.md) - B1 architektonisch obsolet und produktiv entfernt; B2 durch `shopperCount`-Konsolidierung erledigt.
4. [04-Code-Cleanup-Plan.md](04-Code-Cleanup-Plan.md) - Folgeplan fuer verbleibende Cleanup-Fragen; `none`/`lifecycle` ist entschieden und dokumentiert.

## Pflege-Regel

Modellaenderungen werden direkt in 01/02/03 eingearbeitet. Es entstehen keine neuen `Erarbeitung XX`-Iterationsdokumente mehr. Groessere Architekturfragen laufen ueber Branch/PR auf diese Dateien oder ueber `docs/cross-model/` nach dem dortigen Review-Flow.

## Historie

Die frueheren Iterationsdokumente (`Erarbeitung 01`-`18`, `dynamik-mit-verguetung.md`, `Umsetzung Bericht`) wurden am 2026-06-09 entfernt, nachdem ihr Inhalt in die fuehrenden Dateien ueberfuehrt war. Die externe Beschreibungstabelle `Basic_model_descriptions.xlsx` wurde am 2026-06-10 mit entfernt; sie wird hier nicht mehr gepflegt.
