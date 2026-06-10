# Referenznetzwerk-Tests

**Stand:** 2026-06-10  
**Status:** fuehrender Test-Konventionsentwurf. Diese `_updated.md`-Datei ist ein Phase-7-Review-Artefakt und muss nach Freigabe in die Originaldatei ueberfuehrt oder verworfen werden.  
**Scope:** Konvention und aktuelle Test-Matrix fuer Verguetungslogik, Personenbaum, Reality-Strategien, UI-Baumdarstellung und Checkout-Smokes.  
**Ersetzt nach Freigabe:** [`Referenznetzwerk-Tests.md`](./Referenznetzwerk-Tests.md).

## 0. Kritisches Review dieses Updates

Die bisherige Fassung war in der Grundidee richtig, hatte aber mehrere fachliche Unschaerfen:

1. **`person-tree-equivalence.test.ts` war falsch beschrieben.** Der Test prueft Personenbaum-Snapshots und Churn-Reihenfolge, nicht die Equivalenz verschiedener Reality-Strategien.
2. **Checkout-API-Tests gehoeren nicht in dieselbe Kategorie wie Referenznetzwerke.** Sie sind Playwright/API-Smokes mit externen Laufbedingungen und separatem Script `npm run test:checkout-api`, nicht Vitest-Referenztests.
3. **"Ein Test prueft entweder Rang oder Auszahlung" war zu absolut.** Als Regel fuer lesbare Referenztests ist das gut; Integrations-/Regressionstests duerfen bewusst Struktur, Rang und Auszahlung zusammen pruefen.
4. **FitLine/Eqology waren zu optimistisch eingeordnet.** Aktuell haben sie Product-Pack-Smokes mit shared placeholder plan, aber keine eigenen fachlichen Referenznetzwerke.
5. **Der Fixture-Helper wurde nur indirekt bestaetigt.** `packages/product-lifeplus/tests/helpers/tree-fixture.ts` existiert und ist die aktuelle DSL fuer handgebaute LifePlus-Netzwerke.

## 1. Testklassen und Zweck

Verguetungs- und Simulationslogik wird heute in mehreren Testklassen abgesichert:

| Testklasse | Zweck | Typische Dateien |
|---|---|---|
| Referenznetzwerk | Handgebautes Netzwerk -> exakter Rang, QGV, Legs oder Auszahlung. | `reference-rank.test.ts`, Teile von `tree-simulation.test.ts`. |
| Simulationsregression | Slider-/Input-Szenario -> plausibles Personenbaum-/Netzwerkergebnis. | `engine.test.ts`, `tree-simulation.test.ts`, `person-tree-equivalence.test.ts`. |
| Reality-Strategie | Random/Momentum/equal laufen auf Personenbaum und bleiben deterministisch/strukturwirksam. | `person-tree-reality.test.ts`, `dirichlet.test.ts`, `momentum.test.ts`, `rng.test.ts`. |
| Product-Pack-Contract | Product-Pack erfuellt gemeinsame Simulator-Schnittstelle. | `tests/contracts/product-pack.test.ts`, `packages/product-*/tests/product.test.ts`. |
| UI-Struktur | Personenbaum-/Sunburst-Knoten, Shopper-Aggregate, inaktive Personen. | `simulator-app/src/components/**/*.test.ts`. |
| API-Smoke | Deployed/local API gegen Checkout-/Paddle-Flow pruefen. | `tests/api/checkout-api.spec.ts` via Playwright. |
| Benchmark | Performance-Profiling, standardmaessig nicht im normalen Testlauf. | `profile-sim.test.ts` mit `describe.skip`. |

Leitprinzip: Fachliche Plan-Eigenschaften brauchen mindestens einen lesbaren Test, der das relevante Netzwerk direkt erkennen laesst. Lange Doku-Tabellen sind kein Ersatz fuer Fixtures.

### Hierarchie der Testklassen

```text
              API-Smoke (Playwright, langsam, deployed/local)
              ┌─────────────────────────────────────────────┐
              │  tests/api/checkout-api.spec.ts             │
              └─────────────────────────────────────────────┘
                                  ▲
                                  │
         Integration (Vitest, mittel, repo-uebergreifend)
         ┌────────────────────────────────────────────────┐
         │  tests/integration/person-tree-reality.test.ts │
         │  tests/contracts/product-pack.test.ts          │
         └────────────────────────────────────────────────┘
                                  ▲
                                  │
    Unit / Referenznetzwerk (Vitest, schnell, paketlokal)
    ┌──────────────────────────────────────────────────────┐
    │  packages/product-lifeplus/tests/reference-rank.ts   │
    │  packages/product-lifeplus/tests/example-line.ts     │
    │  packages/product-lifeplus/tests/tree-simulation.ts  │
    │  packages/simulator-core/tests/*                     │
    │  packages/simulator-realistic-growth/tests/*         │
    │  simulator-app/src/**/*.test.ts                      │
    └──────────────────────────────────────────────────────┘
```

Pyramide: viele Unit/Referenztests, weniger Integration, sehr wenige API-Smokes. Referenznetzwerk-Tests sind Unit-Tests mit fachlicher Lesbarkeit; sie ersetzen keinen Integrationstest, machen aber die Plan-Logik durchsuchbar.

## 2. Aktuelle Test-Matrix

### Repo-uebergreifend

| Datei | Verantwortung | Einordnung |
|---|---|---|
| [`tests/integration/person-tree-reality.test.ts`](../tests/integration/person-tree-reality.test.ts) | Random/Momentum auf dem Personenbaum; Single-Source-Truth; Momentum-Asymmetrie. | Integration / Reality. |
| [`tests/contracts/product-pack.test.ts`](../tests/contracts/product-pack.test.ts) | Alle registrierten Product-Packs koennen `runSimulation()` ausfuehren und haben eindeutige IDs/Domains. | Contract-Smoke, keine fachliche Referenz. |
| [`tests/api/checkout-api.spec.ts`](../tests/api/checkout-api.spec.ts) | B2B-v6.1 Checkout-API gegen deployed/local API; read-only und optional write sandbox. | Playwright/API, nicht Vitest-Referenznetzwerk. |
| [`tests/api/README.md`](../tests/api/README.md) | Laufanleitung fuer Checkout-Smokes. | Operative Testdoku. |

### `packages/simulator-core`

| Datei | Verantwortung | Einordnung |
|---|---|---|
| [`packages/simulator-core/tests/person-tree-equivalence.test.ts`](../packages/simulator-core/tests/person-tree-equivalence.test.ts) | Personenbaum liefert Aggregat-Snapshots; Member-Fluktuation passiert vor neuem Wachstum. | Core-Regression. |

### `packages/product-lifeplus`

| Datei | Verantwortung | Einordnung |
|---|---|---|
| [`packages/product-lifeplus/tests/reference-rank.test.ts`](../packages/product-lifeplus/tests/reference-rank.test.ts) | Lesbare Referenznetzwerke fuer Rangberechnung: 4*Diamond, Shopper-QGV ohne QL, gewichtete Knoten, n*Diamond-Schwellen, Diamond-vs-Bronze-Beine. | Referenznetzwerk-Master fuer Rang. |
| [`packages/product-lifeplus/tests/helpers/tree-fixture.ts`](../packages/product-lifeplus/tests/helpers/tree-fixture.ts) | DSL: `root`, `member`, `networkFixture`, `treeToAscii`, `expectRankState`. | Fixture-Quelle. |
| [`packages/product-lifeplus/tests/tree-simulation.test.ts`](../packages/product-lifeplus/tests/tree-simulation.test.ts) | Personenbaum-Simulation, Phase 1, Auto-AV, tiefe Diamond-Beine, gewichtete Downline, Shopper-only, Cap/Reattachment, Legs und Carry. | Breite fachliche Regression; teils Referenznetzwerk. |
| [`packages/product-lifeplus/tests/example-line.test.ts`](../packages/product-lifeplus/tests/example-line.test.ts) | Konkrete Upline-Beispielreihen fuer Phase 1/2/3, Slotverteilung, Kompression und n*Diamond-Normalisierung. | Beispielreihen-Referenz. |
| [`packages/product-lifeplus/tests/engine.test.ts`](../packages/product-lifeplus/tests/engine.test.ts) | Legacy-/Aggregat-nahe Planfunktionen, Netzwerk-Wachstum, Rangbestimmung und vollstaendige Simulation. | Regression; nicht alleiniger Master. |
| [`packages/product-lifeplus/tests/profile-sim.test.ts`](../packages/product-lifeplus/tests/profile-sim.test.ts) | Performance-Benchmark fuer Knoten/Weight/Orders; `describe.skip`. | Manuell, nicht normaler CI-Test. |

### Reality-Growth

| Datei | Verantwortung |
|---|---|
| [`packages/simulator-realistic-growth/tests/dirichlet.test.ts`](../packages/simulator-realistic-growth/tests/dirichlet.test.ts) | Dirichlet-Gewichte fuer Random-Strategie. |
| [`packages/simulator-realistic-growth/tests/momentum.test.ts`](../packages/simulator-realistic-growth/tests/momentum.test.ts) | Momentum-Verteilung und Asymmetrie. |
| [`packages/simulator-realistic-growth/tests/rng.test.ts`](../packages/simulator-realistic-growth/tests/rng.test.ts) | Seedbarer RNG bleibt deterministisch. |

### UI-Komponenten

| Datei | Verantwortung |
|---|---|
| [`simulator-app/src/App.test.ts`](../simulator-app/src/App.test.ts) | Migration alter Reality-Strategie-Werte auf aktuelle Runtime-Werte. |
| [`simulator-app/src/components/person-tree/person-tree-node.test.ts`](../simulator-app/src/components/person-tree/person-tree-node.test.ts) | UI-Hierarchie, Shopper-Aggregate, inaktive Personen, Rank-/QGV-/Provision-Daten. |
| [`simulator-app/src/components/network/sunburst-node.test.ts`](../simulator-app/src/components/network/sunburst-node.test.ts) | Sunburst-Struktur und visuelle Netzwerkaggregation. |

### FitLine und Eqology

| Datei | Aktueller Status |
|---|---|
| [`packages/product-fitline/tests/product.test.ts`](../packages/product-fitline/tests/product.test.ts) | Branding/defaults plus shared placeholder plan laufen durch `runSimulation()`. |
| [`packages/product-eqology/tests/product.test.ts`](../packages/product-eqology/tests/product.test.ts) | Branding/defaults plus shared placeholder plan laufen durch `runSimulation()`. |

Wichtig: Diese Tests sind noch keine fachlichen Referenznetzwerke fuer FitLine/Eqology-Plaene.

## 3. Konvention fuer neue Referenznetzwerk-Tests

1. **Fixture im Test lesbar halten.** Nutze eine DSL wie `root(...)`, `member(...)`, `networkFixture(...)`; keine grossen JSON-Fixtures als fuehrende Wahrheit.
2. **Ein Referenztest hat einen primaeren Zweck.** Rang, QGV/Legs, Phase-1-Kompression oder Slotverteilung sollten im Testnamen klar sein. Integrationsregressionen duerfen mehrere Effekte koppeln, muessen dann aber als solche benannt sein.
3. **Fehlerausgabe muss das Netzwerk zeigen.** `expectRankState()` haengt via `treeToAscii()` den Baum an den Fehler, das ist gut und sollte erhalten bleiben.
4. **Gewichtete Knoten explizit testen.** Jede Logik, die Legs, QGV oder Rang zaehlt, muss auch `weight > 1` abdecken.
5. **Shopper getrennt testen.** Shopper zaehlen zu QGV und Umsatz, aber nicht als qualifiziertes Bein und nicht als `SimPerson`.
6. **Schwellenwerte testen.** Ranggrenzen wie 29.999 vs. 30.000 QGV fuer 4*Diamond sind wertvoller als nur "grosses Netzwerk ergibt hohen Rang".
7. **Reality-Strategien mit Seed testen.** Random/Momentum-Tests duerfen keine nichtdeterministische Erwartung haben.

### Beispiel: lesbare Fixture aus `reference-rank.test.ts`

So sieht ein Referenztest in der Praxis aus — die DSL macht das Netzwerk direkt lesbar:

```ts
import { networkFixture, root, member, expectRankState } from './helpers/tree-fixture';

it('berechnet ein festes 4*Diamond-Netzwerk aus echten Personen', () => {
  const snapshot = networkFixture({
    root: root('du', 50, [
      ...Array.from({ length: 4 }, (_, i) => diamondLeg(`diamond-leg-${i + 1}`)),
      ...Array.from({ length: 8 }, (_, i) => member(`member-leg-${i + 1}`, 150)),
    ]),
  });

  const comp = calculateTreeCompensation(snapshot, {
    rootPersonalMonthlyVolume: 50,
  });

  expectRankState(snapshot, comp.rankStates, 'du', {
    rank: { name: '4*Diamond' },
    av: 150,
  });
});
```

`expectRankState` haengt im Fehlerfall einen ASCII-Baum an die Assertion (`treeToAscii()`), damit man im Test-Output sofort sieht, welche Netzwerkstruktur falsch berechnet wurde.

## 4. Bekannte Luecken und Risiken

| Luecke / Risiko | Bedeutung | Empfehlung |
|---|---|---|
| FitLine/Eqology haben keine eigenen Plan-Referenznetzwerke. | Aktuell okay, solange sie shared placeholder plan nutzen; riskant bei eigenen Verguetungsplaenen. | Bei eigenem Plan sofort `reference-rank.test.ts`-Aequivalent und Fixture-DSL anlegen. |
| `engine.test.ts` enthaelt noch aggregat-nahe Hilfslogik. | Kann historisch wirken und mit Single-Path-Doku verwechselt werden. | Bei naechstem Cleanup pruefen, welche Tests als Legacy bleiben und welche in Baumtests ueberfuehrt werden. |
| `profile-sim.test.ts` ist `describe.skip`. | Kein CI-Schutz fuer Performance. | Als manuelles Benchmark-Dokument behandeln; Performance-Gates separat definieren. |
| Checkout-API-Tests laufen ueber Playwright und externe API-Ziele. | `npm test`/Vitest ist dafuer nicht der richtige Runner. | Weiter ueber `npm run test:checkout-api`; README aktuell halten. |
| Kein zentrales Referenznetzwerk-Register. | Kann bei wachsender Brand-Anzahl unuebersichtlich werden. | Vorerst Fixtures als Quelle; Register erst einfuehren, wenn mehrere Brand-Plaene echte Referenzen haben. |

## 5. Laufempfehlung

Normale fachliche Tests:

```powershell
npm test
```

Gezielte Checkout-Smokes:

```powershell
npm run test:checkout-api
```

Profil-Benchmark:

```powershell
# Vorher in profile-sim.test.ts describe.skip gezielt auf describe umstellen.
npm test -- --run packages/product-lifeplus/tests/profile-sim.test.ts
```

Hinweis: Falls `npm test` durch `tests/api/checkout-api.spec.ts` in den Vitest-Run geraet, ist das ein Tooling-Problem. Playwright-API-Specs gehoeren ueber das separate Script ausgefuehrt oder aus dem Vitest-Include ausgeschlossen.

Konkrete Loesungsoption (in `vitest.config.ts`):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      'tests/api/**',          // Playwright-API-Specs nicht ueber Vitest laufen lassen.
      'website-astro/**',
      'dist/**',
    ],
  },
});
```

Damit gehen Playwright-Specs ausschliesslich ueber `npm run test:checkout-api`, und `npm test` deckt die fachliche Vitest-Pyramide ab.

## 6. Verwandte Dokumente

- [`growth_models/02-Wachstums-und-Churn-Regeln.md`](./growth_models/02-Wachstums-und-Churn-Regeln.md) - fachliche Regeln, gegen die Tests laufen.
- [`growth_models/03-Benchmark-Status-B1-B2.md`](./growth_models/03-Benchmark-Status-B1-B2.md) - Status von Aggregatpfad und Shopper-Aggregation.
- [`Netzwerk-Modellierung_updated.md`](./Netzwerk-Modellierung_updated.md) - historischer Snapshot und aktuelle Single-Path-Einordnung.
- [`Rank-Badges_updated.md`](./Rank-Badges_updated.md) - Rank-/Badge-Code bleibt Single Source fuer UI.
- [`business plans/lifeplus_business_plan.md`](./business%20plans/lifeplus_business_plan.md) - fachlicher LifePlus-Plan.
- [`tests/api/README.md`](../tests/api/README.md) - Checkout-API-Smoke-Laufanleitung.

## Anhang: Historischer Kontext

Original-Datei: [`Referenznetzwerk-Tests.md`](./Referenznetzwerk-Tests.md), Stand 2026-05-28.

Historischer Inhalt:

- Warum Referenznetzwerke noetig sind.
- Unterschied zwischen Simulationstests und handgebauten Netzwerken.
- Fruehe Regel "lesbares Netzwerk, ein Test = eine Eigenschaft".
- Bug-Muster, gegen die Referenznetzwerke schuetzen: Rangschwellen, Bronze-/Diamond-Beine, Auto-AV, Phase-2/3-Slots, Shopper-Beine.

Die Grundidee bleibt gueltig. Der aktuelle Test-Master ist aber der Code plus diese Test-Matrix, nicht die alte Konzeptdatei.
