# Netzwerkwachstum Konzept Erarbeitung 14 - Shopper als Float-Aggregat

**Datum:** 2026-06-05  
**Status:** Umgesetzt im Code, Build und gezielte Tests gruen

## 1. Entscheidung

Die F1a-Regel "nur ganze Personen" gilt weiterhin fuer Member.

Shopper werden ab jetzt bewusst anders modelliert:

- Shopper sind keine eigenstaendigen Personen im Simulationskern.
- Shopper erzeugen keine Downline.
- Shopper haben keinen Status.
- Shopper bilden keine Beine.
- Shopper werden pro Sponsor als Float-Wert gefuehrt: `shopperCount`.
- Dezimalwerte sind erlaubt, z.B. `2,65 Shopper`.
- Umsatz wird direkt berechnet als `shopperCount * shopperMonthlyVolume`.
- Shopper-Volumen zaehlt zu QGV.
- Shopper-Volumen zaehlt nicht zu AV.

Kurzform:

> Member sind Struktur. Shopper sind Volumen.

## 2. Begruendung

Die vorherige F1a-Umstellung war fuer Member korrekt, aber fuer Shopper unnötig schwer.

Member muessen diskret bleiben, weil sie fuer folgende Dinge strukturbildend sind:

- Beine
- Status
- Duplikation
- Downline
- AV
- Churn/Reattachment

Shopper sind dagegen fachlich keine strukturbildenden Akteure. Sie haengen an einem Sponsor und erzeugen Umsatz.

Darum ist eine Float-Modellierung fuer Shopper besser:

- weniger Knoten
- bessere Performance
- einfachere Visualisierung
- direkte Abbildung von Sliderwerten wie `2,5 Shopper/Jahr`
- keine kuenstlichen Shopper-Personen

## 3. Neue Modellregel

### 3.1 Wachstum

Root:

```ts
root.shopperCount += shoppersPerYear;
```

Member:

```ts
member.shopperCount += member.weight * shoppersPerYear * duplicationRate * sourceWeight;
```

`sourceWeight` bleibt relevant fuer Realitaetsstrategien wie Random/Momentum.

### 3.2 Churn

Shopper-Churn wird direkt auf den Float-Wert angewandt:

```ts
lost = shopperCount * attritionRate;
shopperCount -= lost;
```

Es gibt keine ganzen Shopper-Abgaenge und keinen Shopper-Carry.

### 3.3 Umsatz

```ts
shopperVolume = shopperCount * shopperMonthlyVolume;
```

Beispiel:

```text
2,65 Shopper * 45 IP = 119,25 IP
```

### 3.4 Member-Churn

Wenn ein Member vollstaendig churnt:

- seine aktiven Member-Kinder werden zum Parent hochgezogen
- sein `shopperCount` wird zum Parent uebertragen
- der gechurnte Member verliert seinen `shopperCount`

Damit bleibt Shopper-Volumen erhalten und rutscht an die naechste aktive Upline.

## 4. Darstellung

Im Personenbaum wird pro Sponsor maximal ein Shopper-Aggregatknoten angezeigt:

```text
2,65 Shopper
```

Dieser Knoten ist kein echter SimPerson-Knoten, sondern eine UI-Aggregation aus `shopperCount`.

## 5. Geaenderte Dateien

### Core

- `packages/simulator-core/src/person-tree.ts`
- `packages/simulator-core/src/tree-generator.ts`

### LifePlus-Verguetung

- `packages/product-lifeplus/src/tree-compensation.ts`

### UI / Visualisierung

- `simulator-app/src/components/person-tree/person-tree-node.ts`
- `simulator-app/src/components/network/sunburst-node.ts`

### Tests

- `packages/product-lifeplus/tests/tree-simulation.test.ts`
- vorhandene Tests in `packages/product-lifeplus/tests/engine.test.ts`
- vorhandene Tests in `tests/integration/person-tree-reality.test.ts`
- vorhandene UI-Tests fuer PersonTree und Sunburst

## 6. Testergebnis

Gezielter Testlauf:

```powershell
npm test -- packages/product-lifeplus/tests/tree-simulation.test.ts packages/product-lifeplus/tests/engine.test.ts tests/integration/person-tree-reality.test.ts simulator-app/src/components/person-tree/person-tree-node.test.ts simulator-app/src/components/network/sunburst-node.test.ts
```

Ergebnis:

- 5 Testdateien bestanden
- 71 Tests bestanden

Build:

```powershell
npm run build:lifeplus
```

Ergebnis:

- Build erfolgreich
- bekannter Vite-Hinweis zur Chunkgroesse bleibt

## 7. Review-Hinweise

Diese Aenderung betrifft ausschliesslich Shopper.

Member bleiben:

- ganze Personen
- F1a Carry-over
- keine sichtbaren Bruchteils-Member
- status- und beinrelevant

Shopper sind jetzt:

- Float-Wert pro Sponsor
- QGV-relevant
- nicht AV-relevant
- nicht statusrelevant
- nicht beinbildend

## 8. Offene Punkte

1. Der alte Typ `SimPersonKind = 'shopper'` bleibt vorerst aus Kompatibilitaetsgruenden bestehen.
2. Alte manuelle Tests/Fixtures mit echten Shopper-Personen bleiben lesbar.
3. Langfristig kann `kind: 'shopper'` aus dem Simulationskern entfernt werden, wenn alle Fixtures und Legacy-Pfade umgestellt sind.
4. Die Detailberechnung kann bei sehr grossen Member-Baeumen weiterhin schwer werden; die Shopper-Umstellung reduziert aber die Knotenanzahl deutlich.

