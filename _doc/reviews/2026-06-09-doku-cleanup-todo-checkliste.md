# Todo-/Checkliste: Doku-Cleanup und aktuelle offene Punkte

**Stand:** 2026-06-10  
**Basis:** aktueller Workspace und Ist-Analyse [`../cleanup-ist-analyse-2026-06-09.md`](../cleanup-ist-analyse-2026-06-09.md). Alte Review-Snapshots wurden am 2026-06-10 geloescht; neue Reviews lesen wieder den aktuellen Code.  
**Arbeitsregel:** Erst fuehrende Inhalte aktualisieren, dann historische Dateien loeschen oder archivieren.  
**Bearbeitungsstand:** Umsetzbare Punkte erledigt. Punkte mit Live-Zugriff, Loeschfreigabe oder fachlicher Entscheidung stehen unten unter "Rueckfragen / uebersprungen".

## Phase 0 - Review-Korrekturen einarbeiten

- [x] T0.1 In `_doc/cleanup-ist-analyse-2026-06-09.md` `equal` und `lifecycle` trennen: `equal` ist API-Wert fuer gleichverteilten Default, `lifecycle` ist Platzhalter/Backlog fuer ein spaeteres Lifecycle-/Lebensphasen-Modell.
- [x] T0.2 In `_doc/cleanup-ist-analyse-2026-06-09.md` Shopper-Modellierung als hybriden produktiven Zustand beschreiben, nicht als reine Fixture-/Legacy-Frage.
- [x] T0.3 `_doc/Astro Einfuehrung und Dateistruktur.md` zunaechst aus "direkt loeschbar" herausgenommen; durch R10 ueberholt und am 2026-06-10 geloescht, weil Astro produktiv abgeschlossen ist.
- [x] T0.4 Agenten-Referenzen sind keine fuehrende Doku. Relevante Inhalte muessen als human-readable `_doc`-Text oder konkreter Checklistenpunkt vorliegen.
- [x] T0.5 Zielbild um klare Grenze `_doc/` vs. `docs/cross-model/` ergaenzen.

## Phase 1 - Checkout/Billing als fuehrendes Runbook konsolidieren

- [x] T1.1 Entschieden: neues fuehrendes Runbook [`../paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](../paddle_checkout/checkout-billing-runbook-b2b-v6-1.md).
- [x] T1.2 B2B-v6.1/Gast-Checkout-Flow aus aktuellem Code dokumentiert: `/checkout/{plan}.html`, `checkout-intent`, Paddle Transaction, `post-checkout`, Auto-Login, Webhook.
- [x] T1.3 Migrationen 0001-0009 lokal dokumentiert; Remote-/Sandbox-Status explizit als offen/nicht verifiziert markiert.
- [x] T1.4 README Live-Deploy-/Checkout-Checkliste auf v6.1 abgeglichen.
- [x] T1.5 `_doc/paddle_checkout/Umsetzungsplan.md` als historisch markiert und auf neues Runbook verwiesen.
- [x] T1.6 Alte Checkout-Mockups und Codex/Claude-Paralleltexte nach Runbook-Fertigstellung geloescht. Behalten: `lifeplus_checkout_paddle_b2b_v2.html` und `lifeplus_checkout_paddle_b2b_v6.html`.

## Phase 2 - Website-Wording und Legal-Go-Live-Liste

- [x] T2.1 `website-astro/src/shared/components/sections/FeaturesPageDefault.astro` von "drei Simulationsmodelle"/"Standard" auf aktuelles Growth-Zielbild umformuliert.
- [x] T2.2 `website-astro/src/brands/*/content/pricing.yaml` Feature-Text auf "Reality-Strategien (Personenbaum / Zufallsstreuung / Momentum)" aktualisiert.
- [x] T2.3 `website-astro/src/brands/*/pages/features.astro` Meta-Descriptions aktualisiert.
- [x] T2.4 B2B-/Netto-/AGB-/Widerruf-/Datenschutz-Hinweise gegen aktuellen Checkout per Code-Suche geprueft und offene Punkte notiert.
- [x] T2.5 Legal-/Marketing-Review-Befunde in [`../go-live/go-live-content-legal-checklist.md`](../go-live/go-live-content-legal-checklist.md) verdichtet.

## Phase 3 - Growth-/Simulation-Cleanup planen

- [x] T3.1 `fastResult`-Rolle in `simulator-app/src/App.tsx` in [`../growth_models/04-Code-Cleanup-Plan.md`](../growth_models/04-Code-Cleanup-Plan.md) konkret geplant.
- [x] T3.2 `standard`/Aggregatpfad aus `packages/simulator-core/src/simulation.ts` entfernt; `person-tree-equal` ist der Default-/Gleichverteilungs-Pfad. `fastResult`/Aggregat-Fallback aus `simulator-app/src/App.tsx` und `mode: 'aggregate'` aus `ProvisionChart` entfernt.
- [x] T3.3 Aggregat-Fallbacks in Charts/Visualisierungen in [`../growth_models/04-Code-Cleanup-Plan.md`](../growth_models/04-Code-Cleanup-Plan.md) erfasst.
- [x] T3.4 `lifecycle` in `simulator-realistic-growth` als nicht auswählbaren Platzhalter fuer ein spaeteres Lifecycle-/Lebensphasen-Modell behalten und dokumentieren.
- [x] T3.5 `none` durch `equal` im Low-Level-StrategyId und durch `person-tree-equal` als Runtime-/Persistenzwert ersetzt; Legacy-Werte `none`, `person-tree` und `standard` werden auf `person-tree-equal` migriert.
- [x] T3.6 Shopper-Hybridmodell entschieden und umgesetzt: Shopper werden im Simulationsmodell ausschliesslich als `shopperCount` am Sponsor/Member gefuehrt; Legacy-`kind: 'shopper'`-Personen aus Core, Compensation-Kompatibilitaet, Visualisierungslogik und Tests/Fixtures entfernt.
- [x] T3.7 B2-Shopper-Aggregation endgueltig verworfen; geskipptes Benchmark-/Testgeruest `benchmarks/b2-shopper-aggregation/` entfernt. Grund: R5 hat Shopper produktiv auf `shopperCount` konsolidiert.

## Phase 4 - Freemium, Account und externe Quellen

- [x] T4.1 `_doc/Freemium-Modell.md` als Produktstrategie / nicht aktueller Implementierungsplan klassifiziert.
- [x] T4.2 `_doc/Freemium-Modell_Applikation.md` gegen aktuelle Komponenten (`LoginGate`, `AuthGate`, `Paywall`, `DeviceLimitGate`, `AccountPageDefault`) aktualisiert und als historisch markiert.
- [x] T4.3 Nicht existierende Referenzen wie `simulator-app/src/components/AccountPanel.tsx` ersetzt beziehungsweise als veraltet markiert.
- [x] T4.4 Agenten-Notizen nicht als eigene To-do-Quelle fuehren. Fuehrend ist human-readable Doku unter `_doc/`; neue Reviews lesen aktuellen Code und aktuelle Doku.
- [x] T4.5 Account-/Abo-Verwaltung, Testuser-Cleanup und Free-Login-UX einsortiert: Account/Abo laeuft ueber Paddle-/Account-Verwaltung, Testuser-Cleanup-Skripte bleiben erhalten, Free-Login-UX ist im aktuellen Astro/Auth-Flow vorhanden.
- [x] T4.6 Anti-Abuse-Umfang fuer Go-Live entschieden: Option A. Anti-Abuse ist Go-Live-Pflicht; konkrete Limits fuer Checkout, Preview und Portal sind in der Go-Live-Liste zu klaeren/umzusetzen.

## Phase 5 - Dokumentationsstruktur und Archivierung

- [x] T5.1 Dokumentationsregel definiert: [`../documentation-policy.md`](../documentation-policy.md).
- [x] T5.2 Neue Ordner wie `_doc/architecture/`, `_doc/product/`, `_doc/archive/` nicht sofort eingefuehrt; strukturelle Entscheidung jetzt in [`../adr-2026-06-10-dokumentationsstruktur-und-altlasten.md`](../adr-2026-06-10-dokumentationsstruktur-und-altlasten.md).
- [x] T5.3 R9 entschieden und ADR erstellt: fuehrende Doku aktuell halten, alte/redundante Dateien loeschen, `_doc/_old/` nach Extraktion entfernen, `website-legacy/` nach Referenzcheck loeschen.
- [x] T5.4 Astro-Vorlaeufer und Migrationsdokumente geloescht, weil Astro produktiv abgeschlossen ist. `website-astro/README.md` verweist nicht mehr auf alte Plaene.
- [x] T5.5 `_doc/business plans/eqology_business_plan_review.md` gegen Plan-Datei gedifft: identisch, Duplikat-Status geklaert.
- [x] T5.6 Alte Review-Snapshots geloescht und `_doc/reviews/` auf diese aktive Todo-/Checkliste reduziert. Neue Reviews lesen wieder den aktuellen Code statt alte Review-Snapshots fortzuschreiben.

## Phase 6 - Verifikation vor Abschluss

- [x] T6.1 Nach Doku-Aenderungen Links/Referenzen in geaenderten Markdown-Dateien per `rg` geprueft.
- [x] T6.2 Nach Website-Content-Aenderungen Builds ausgefuehrt: `npm --prefix website-astro run build:lifeplus`, `build:fitline`, `build:eqology`. Hinweis: `build:sites` lief zuvor in einen Timeout; ein paralleler FitLine/Eqology-Versuch erzeugte bei Eqology einmal `EBUSY`, der anschliessende Einzelbuild war erfolgreich.
- [x] T6.3 Nach Growth-Code-Aenderungen verifiziert: gezielte Vitest-Laeufe fuer Core/Visualisierungen/LifePlus-Shopper-Modell erfolgreich; `npm run build:lifeplus` erfolgreich. Hinweis: kompletter `npm test` scheitert weiterhin an `tests/api/checkout-api.spec.ts` wegen Playwright/Vitest-Runner-Konflikt, nicht an R2/R5.
- [x] T6.4 Nach Checkout-Runbook-Aenderung geprueft, ob README, Runbook und Code dieselben Endpunkte/Migrationsnummern nennen.
- [x] T6.5 Vor Datei-Loeschungen `git status --short` geprueft und Loeschumfang durch User konkret bestaetigt. Fuer weitere Loeschungen bleibt diese Regel bestehen.

## Rueckfragen / uebersprungen

| ID | Todo | Punkt | Context | Warum uebersprungen | Loesungsoptionen | Frage an dich |
|---|---|---|---|---|---|---|
| R12 | T6.5 | Loeschregel fuer weitere Dateien | T1.6 ist erledigt. Aktualisierte Loeschkandidatenliste anhand aktuell vorhandener Dateien/Ordner wurde als [`2026-06-10-loeschkandidaten-r12.md`](2026-06-10-loeschkandidaten-r12.md) erstellt. | Weitere Loeschungen waeren destruktiv. | A: IDs/Pakete einzeln bestaetigen. B: Nach definierter Policy automatisch loeschen. C: Nur archivieren, nicht loeschen. | Welche IDs oder Pakete gibst du zum Loeschen frei? |
