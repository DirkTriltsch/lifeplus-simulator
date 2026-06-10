# Phase 7 Update Leading Documents - Abschluss-Review

**Stand:** 2026-06-10
**Status:** offen fuer Freigabe (Original ersetzen / Updated verwerfen / Original loeschen)
**Scope:** Ergebnis-Review der neun in [`2026-06-10-loeschkandidaten-r12.md`](2026-06-10-loeschkandidaten-r12.md) F01-F09 markierten Dateien (plus Review-F-12 fuer Webcontent).
**Basis:** [`2026-06-10-phase-7-arbeitsplan.md`](2026-06-10-phase-7-arbeitsplan.md), [`2026-06-10-kritisches-doku-review.md`](2026-06-10-kritisches-doku-review.md), Code-Anker laut Arbeitsplan §3.

## 1. Mapping Original -> Ergebnis -> Empfehlung

Alle Updates sind als `*_updated.md` neben dem Original abgelegt. **F02 ist die Ausnahme:** Direkt im Original geschrieben, kein `_updated.md`-Artefakt.

| ID | Original | Ergebnis | Strategie | Empfehlung Abschluss |
|---|---|---|---|---|
| F01 | [`Freemium-Modell.md`](../Freemium-Modell.md), [`Freemium-Modell_updated.md`](../Freemium-Modell_updated.md) | konsolidiert in [`_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) §1 | (a) fuehrend ueberarbeitet, dann als Ideenspeicher konsolidiert | **Konsolidiert in Ideenspeicher.** Originale und Updated bleiben als historischer Kontext. Aktualisierung weiterer Drift jetzt im Ideenspeicher §1. |
| F02 | [`Freemium-Modell_Applikation.md`](../Freemium-Modell_Applikation.md), [`Freemium-Modell_Applikation_updated.md`](../Freemium-Modell_Applikation_updated.md) | konsolidiert in [`_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) §2 | (b) historisch + Capability-Backlog | **Konsolidiert in Ideenspeicher.** Originale bleiben; weitere Capability-/Free-Renderer-Arbeit jetzt im Ideenspeicher §2. |
| F03 | [`Konzept Kundenlinks und Szenario-Freigabe.md`](../Konzept%20Kundenlinks%20und%20Szenario-Freigabe.md), [`Konzept Kundenlinks und Szenario-Freigabe_updated.md`](../Konzept%20Kundenlinks%20und%20Szenario-Freigabe_updated.md) | konsolidiert in [`_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) §3 | Konzept-Master / **nicht implementiert** | **Konsolidiert in Ideenspeicher.** Originale bleiben als v3-Detailspezifikation; Sharing-Konzept weiter im Ideenspeicher §3. |
| F04 | [`Konzept Paddle-Integration und App-Architektur.md`](../Konzept%20Paddle-Integration%20und%20App-Architektur.md) | [`Konzept Paddle-Integration und App-Architektur_updated.md`](../Konzept%20Paddle-Integration%20und%20App-Architektur_updated.md) | (a) fuehrend reduziert | **Updated in Original mergen.** Updated ist Architektur-Master; Original ist im Anhang als Begruendungsspeicher referenziert (nicht inline kopiert, weil ueber 2000 Zeilen). |
| F05 | [`Netzwerk-Modellierung.md`](../Netzwerk-Modellierung.md) | [`Netzwerk-Modellierung_updated.md`](../Netzwerk-Modellierung_updated.md) | (b) historisch mit Pointer auf `growth_models/` | **Updated in Original mergen oder Original spaeter loeschen.** Fuehrender Master ist `growth_models/`. Pruefen, ob das Original im Anhang noch Begruendung enthaelt, die in `growth_models/` fehlt. |
| F06 | [`Referenznetzwerk-Tests.md`](../Referenznetzwerk-Tests.md) | [`Referenznetzwerk-Tests_updated.md`](../Referenznetzwerk-Tests_updated.md) | (a) fuehrend, kuerzer | **Updated in Original mergen.** Updated traegt aktuelle Test-Landschaft; alte Begruendung der Konvention im Anhang. |
| F07 | [`Rank-Badges.md`](../Rank-Badges.md) | [`Rank-Badges_updated.md`](../Rank-Badges_updated.md) | (a) fuehrend, korrigiert nach Review | **Updated in Original mergen.** Visueller Master fuer Badges (Varianten, Groessen, Label-Modi, Icon-Galerie als SVG, Bedienregeln) bleibt erhalten; nur Statusblock und Master-Rolle wurden geklaert. Die zuerst notierte Loeschempfehlung war falsch (SVG-Galerie und Regeln sind nicht aus Code rekonstruierbar). |
| F08 | [`Paddle_API_Commands & Scripts.md`](../Paddle_API_Commands%20%26%20Scripts.md) | [`Paddle_API_Commands & Scripts_updated.md`](../Paddle_API_Commands%20%26%20Scripts_updated.md) | (a) fuehrend, ggf. spaeter Verschiebung | **Updated in Original mergen.** Verschiebung nach `_doc/paddle_checkout/` erst, wenn mehr als ein Kommando dokumentiert ist. |
| F09 (= Review-F-12) | [`Webcontent & Value Proposition.md`](../Webcontent%20%26%20Value%20Proposition.md) | [`Webcontent & Value Proposition_updated.md`](../Webcontent%20%26%20Value%20Proposition_updated.md) | (a) fuehrend auf Astro-Stand | **Updated in Original mergen.** Tote `website/templates/*`-Pfade im Anhang aufgeloest. |

**Strategie-Spalte** verweist auf den Plan §3 und das Originalprotokoll (a) fuehrend / (b) historisch + Pointer / (c) loeschen.

## 2. Code-Anker pro Datei

| ID | Anker im Updated genannt | Bemerkung |
|---|---|---|
| F01 | `functions/api/auth/request-link.ts`, `functions/api/auth/verify-link.ts` (`TRIAL_DAYS=14`), `functions/_lib/db.ts` (`grantTrial`, `degradeExpiredTrial`, `grantFreeEntitlementIfMissing`, `grantProEntitlementIfMissing`), `functions/api/me.ts`, `simulator-app/src/auth/useAuth.tsx`, `simulator-app/src/components/AuthGate.tsx`, `Paywall.tsx`, `LoginGate.tsx`, `DeviceLimitGate.tsx`, `website-astro/src/brands/lifeplus/content/pricing.yaml`, `website-astro/src/shared/components/sections/SignupPage.astro` | alle gelesen; korrigiertes Review der ersten Updated-Fassung notierte vier konkrete Fehler |
| F02 | `simulator-app/src/auth/useAuth.tsx`, `auth/api.ts`, `components/AuthGate.tsx`, `LoginGate.tsx`, `Paywall.tsx`, `DeviceLimitGate.tsx`, `simulator-app/src/App.tsx`, `website-astro/src/shared/components/sections/AccountPageDefault.astro`, `website-astro/src/shared/scripts/accountPage.ts` | alle gelesen; Drift-Register sauber gegen Code |
| F03 | `functions/api/share/*` (existiert **nicht**), Migrationen `00XX_shared_scenarios.sql` (existiert **nicht**), Turnstile (existiert **nicht**) | `rg`-Befund war: nichts implementiert -> Konzept-Master |
| F04 | `functions/api/auth/*`, `functions/api/billing/*`, `functions/api/paddle/webhook.ts`, `functions/api/me.ts`, `functions/_lib/paddle.ts`, `functions/_lib/paddle-sig.ts`, `functions/_lib/db.ts`, `migrations/0001`-`0009`, `wrangler.toml`, `website-astro/src/brands/lifeplus/brand.yaml`, `website-astro/src/shared/scripts/checkoutInline.ts`, `accountPage.ts`, `website-astro/src/shared/components/sections/CheckoutPage.astro` | alle gelesen |
| F05 | `packages/simulator-core/src/person-tree.ts`, `tree-generator.ts`, `simulation.ts`, `network-snapshot.ts`, `contracts.ts`; Pointer auf `growth_models/01-04` | Verweise gepflegt; Code nur indirekt geprueft (Modi und `personTreeToNetworkSnapshot` aus `index.ts`/`simulation.ts` bestaetigt) |
| F06 | `tests/integration/person-tree-reality.test.ts`, `tests/contracts/product-pack.test.ts`, `tests/api/checkout-api.spec.ts`, `packages/simulator-core/tests/person-tree-equivalence.test.ts`, `packages/product-lifeplus/tests/reference-rank.test.ts`, `engine.test.ts`, `example-line.test.ts`, `profile-sim.test.ts`, `tree-simulation.test.ts`, `packages/simulator-realistic-growth/tests/dirichlet.test.ts`, `momentum.test.ts`, `rng.test.ts`, `packages/product-lifeplus/tests/helpers/tree-fixture.ts` | alle Dateien existieren laut `find`; `helpers/tree-fixture.ts` aus `reference-rank.test.ts`-Import abgeleitet, Inhalt nicht inline gelesen |
| F07 | `simulator-app/src/components/RankBadge.tsx` (41 Zeilen), `lineage/RankIcon.tsx` (181), `lineage/rankStats.ts` (76), `packages/product-lifeplus/src/ranks.ts` (154) | Groessen via `wc -l`; Header von `RankBadge.tsx` gelesen. Korrektur 2026-06-10: SVG-Icon-Galerie und Bedienregeln aus Original Zeilen 15-141 in das Updated nachgezogen — sie waren faelschlich als reines Code-Duplikat eingestuft. |
| F08 | `scripts/*` (4 Build-/Deploy-Skripte, keine Paddle-Wartung), `_debug/delete-dao-user.ps1` (nicht Paddle), `functions/_lib/paddle.ts`, `paddle-sig.ts`, `functions/api/paddle/webhook.ts`, `functions/api/billing/*` | `find` zeigt keine Paddle-Wartungsskripte im Repo |
| F09 | `website-astro/src/brands/lifeplus/brand.yaml`, `pricing.yaml`, `website-astro/src/brands/lifeplus/pages/*`, `website-astro/src/shared/components/sections/IndexPageDefault.astro`, `FeaturesPageDefault.astro`, `PricingPageDefault.astro`, `SignupPage.astro`, `CheckoutPage.astro`, `AccountPageDefault.astro`, Legal-Sections | gelesen; nur `pricing.yaml` ist Content-YAML, Rest ist inline Astro |

### Nicht gelesen / bewusst ausgelassen

- F04: D1-Schema-Details der Migrations 0001-0009 wurden nur ueber `ls migrations/` referenziert, nicht jeder SQL-Inhalt einzeln.
- F06: `helpers/tree-fixture.ts` nicht inline gelesen; aus dem Test-Import als existent angenommen.
- F08: keine Tests gegen das Wartungs-Snippet.
- F09: Body der einzelnen Legal-Sections nicht inline gelesen — sie sind in `go-live/legal-review-2026-06-03.md` separat dokumentiert.

## 3. Offene Punkte je Datei

| ID | Offene Punkte |
|---|---|
| F01 | Konsolidiert in [`_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) §1. Offene Drift dort dokumentiert (Trial-Wiederholung, Refund, Output-Limit, Promo/Founder). |
| F02 | Konsolidiert in [`_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) §2. Capability-Schicht und Free-Renderer als Backlog dort. |
| F03 | Konsolidiert in [`_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) §3. ADR vor Bau noetig; DSGVO und Turnstile-Kosten Pre-Go-Live-Check. |
| F04 | LifePlus Paddle-Production-Werte stehen aus. FitLine/Eqology Paddle-Setup offen. DSGVO-Loesch-Endpoint fehlt. Anti-Abuse-Limits auf `checkout-intent`/`portal` offen. `webhook_events`-Prune-Policy nicht definiert. |
| F05 | Loeschung im naechsten Cleanup pruefen, sobald sicher ist, dass keine Begruendung im growth_models-Master fehlt. |
| F06 | `npm test` faellt an `tests/api/checkout-api.spec.ts` reproduzierbar (Playwright/Vitest-Runner-Konflikt). Endloesung steht aus. Brand-spezifische Referenztests fuer FitLine/Eqology erst sinnvoll, wenn eigene Plaene existieren. |
| F07 | Visueller Master jetzt vollstaendig im Updated; keine offenen Punkte. Falls spaeter ein Style-Guide / Storybook entsteht, koennte die Galerie dorthin wandern. |
| F08 | Verschiebung nach `_doc/paddle_checkout/` aufgeschoben (erst ab drei aktiven Kommandos). |
| F09 | Wording-Aenderungen passieren ueber `*.astro`-PRs; kein CMS. A/B-Test-Varianten nicht aktiv. Brand-spezifisches Wording fuer FitLine/Eqology nur ueber `brand.productName`/`lockup`. |

## 4. Neue oder verbliebene tote Links

Stichprobenpruefung per `rg` auf bereits geloeschte Dateinamen ergab:

- **Keine** neuen toten Markdown-Links durch die Updated-Dateien.
- Im Anhang **bewusst stehen geblieben**: textuelle Erwaehnungen geloeschter Dateien (`Konzepte und Umsetzung realistischer Wachstums-Modelle .md`, `Produkt-Namenskonvention.md`, `cleanup-ist-analyse-2026-06-09.md`, `Umsetzungsplan.md`, `Basic_model_descriptions.xlsx`). Diese stehen in Backticks als Hinweis "frueher hier", nicht als Markdown-Link.
- Aus dem alten F09-Body referenzierte `website/templates/*.html`-Pfade tauchen im neuen Updated-Body **nicht** mehr auf; sie sind nur noch im Anhang als "siehe Git-Historie" benannt.

## 5. Empfehlung fuer Phase 8 (Statusblock-Nachzug)

Wenn die Updated-Versionen freigegeben werden, muss die Statusblock-Pruefung (Phase 8 / T8.2) folgende Punkte abgleichen:

- Original-Statusbloecke werden durch Updated-Statusbloecke ersetzt; aktuelle `Stand`-Daten 2026-06-10.
- `Status: in Ueberarbeitung — Phase 7 Update Leading Documents` faellt weg; ersetzt durch finale Status-Werte (`fuehrend`, `historisch`, `Konzept-Master / nicht implementiert`, `Loeschempfehlung`).
- Pointer-Bezuege (`Ersetzt:`, `Ersetzt durch:`) konsistent mit der finalen Entscheidung.
- Bei Loeschung F07: Verweis aus `Referenznetzwerk-Tests_updated.md` §5 *"Netzwerk-Modellierung.md (historisch)"* gegen die finale Master-Struktur pruefen.

## 6. Konkrete Freigabe-Fragen

Diese Fragen brauchen explizite Entscheidung, bevor Original-Dateien angefasst werden:

1. **F04:** Updated als neuen Body in Original mergen; alte 2000-Zeilen-Konzeptdatei nach Merge auf den im Updated benannten Anhang kuerzen (Listen-Form, nicht inline) — bestaetigen?
2. **F05:** Updated mergen plus `Netzwerk-Modellierung.md` als Loeschkandidat fuer naechsten Cleanup markieren, oder Anhang als historischen Volltext erhalten?
3. **F06:** Updated mergen — bestaetigen?
4. **F08:** Updated mergen; Verschiebung nach `_doc/paddle_checkout/paddle-maintenance-commands.md` erst bei drei dokumentierten Kommandos — bestaetigen?
5. **F09:** Updated mergen; alte `website/templates/*`-Inhalt fuer Anhang in kondensierter Linkform belassen — bestaetigen?

**F01, F02, F03 brauchen keine zusaetzliche Freigabe-Frage** — Inhalte sind nach User-Entscheidung 2026-06-10 in [`_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) konsolidiert; Originaldateien und `_updated.md` bleiben als historischer Kontext erhalten. **F07** ist nach Nachzug der SVG-Galerie und Bedienregeln erledigt.

## 7. Verbleibende Doku-Drift nach Phase 7

Auch nach Merge der Updated-Versionen bleiben einige offene Punkte aus dem kritischen Review:

- **F-06** R12-Schluss-Tabelle mit verwaisten F10-F16.
- **F-08** CLAUDE.md/AGENTS.md sind weiter Duplikate.
- **F-09** `docs/cross-model/` ohne aktiven Plan.
- **F-10** `_debug/` ohne README.
- **F-11** Klartext-Mails in `_debug/`.
- **F-14** Markdown-Linkcheck/Doku-Lint fehlt.

Diese sind nicht Teil von Phase 7; sie gehoeren in eigene Cleanup-Tickets.

## 8. Erzeugte Dateien (Inventar)

Updated-Dateien (Review-Artefakte):

- [`_doc/Freemium-Modell_updated.md`](../Freemium-Modell_updated.md)
- [`_doc/Konzept Kundenlinks und Szenario-Freigabe_updated.md`](../Konzept%20Kundenlinks%20und%20Szenario-Freigabe_updated.md)
- [`_doc/Konzept Paddle-Integration und App-Architektur_updated.md`](../Konzept%20Paddle-Integration%20und%20App-Architektur_updated.md)
- [`_doc/Netzwerk-Modellierung_updated.md`](../Netzwerk-Modellierung_updated.md)
- [`_doc/Paddle_API_Commands & Scripts_updated.md`](../Paddle_API_Commands%20%26%20Scripts_updated.md)
- [`_doc/Rank-Badges_updated.md`](../Rank-Badges_updated.md)
- [`_doc/Referenznetzwerk-Tests_updated.md`](../Referenznetzwerk-Tests_updated.md)
- [`_doc/Webcontent & Value Proposition_updated.md`](../Webcontent%20%26%20Value%20Proposition_updated.md)

Direktaenderung (F02, Ausnahme):

- [`_doc/Freemium-Modell_Applikation.md`](../Freemium-Modell_Applikation.md) (Original mit Pointer-Block ueber dem historischen Body)

Plan- und Review-Dateien:

- [`_doc/reviews/2026-06-10-phase-7-arbeitsplan.md`](./2026-06-10-phase-7-arbeitsplan.md)
- [`_doc/reviews/2026-06-10-phase-7-review.md`](./2026-06-10-phase-7-review.md) (diese Datei)
