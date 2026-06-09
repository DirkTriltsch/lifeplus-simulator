# 02 — Wachstums- und Churn-Regeln

**Stand:** 2026-06-09
**Konsolidiert aus:** Erarbeitung 14 (Shopper als Float), 15 (Churn-Schärfe), 16 (Reattachment, QGV/AV, Status-Sichtbarkeit), Umsetzung Bericht §3, 17/18 (Shopper-/Strategy-Legacy-Backlog). Ergänzt um Memory-Notizen `feedback_growth_year_offset`, `feedback_network_single_source`.

---

## 1. Member-Regeln

### 1.1 Grundsatz „ganze Personen"

Member sind diskrete Personen im Personenbaum. Sie sind strukturbildend für:

- Beine
- Status
- Duplikation
- Downline
- AV (Eigenverbrauch)
- Churn und Reattachment

Bruchteile von Membern werden **nicht** als sichtbare halbe Personen modelliert.

### 1.2 F1a-Carry für fractional `membersPerYear`

Slider-/Stepper-Eingaben wie `2,5 Member/Jahr` oder `4,5 Member/Jahr` werden über `memberCarry` deterministisch akkumuliert:

```text
neue Member im Jahr   = floor(geplante Member + carry)
neuer Carry           = (geplante Member + carry) - neue Member
```

So entstehen aus zwei aufeinanderfolgenden 0,5-Carry-Anteilen ein ganzer neuer Member im Folgejahr. Ganze Member aus Jahr 1 duplizieren regulär in Jahr 2.

### 1.3 Year-Offset

Neu rekrutierte Member werben **erst im Folgejahr** selbst Member an. Implementierung: `sourceMembers`-Snapshot **vor** den Direct-Adds des laufenden Jahres.

(Memory: `feedback_growth_year_offset` — frühere Versionen ließen neue Member im selben Jahr werben, was zu unplausibel schnellem Hochlauf führte.)

### 1.4 Direct-Cap

```text
Default maxDirectMembersPerMember = 29
```

Der Cap begrenzt **nur Neu-Rekrutierung**, nicht die maximale direkte Beinanzahl insgesamt. Durch Reattachment (§1.5) kann ein Sponsor mehr direkte Beine haben als der Cap.

**Konsolidierungs-TODO (aus 18 Z8):** Default-Wert lebt aktuell an vier Stellen
([packages/simulator-core/src/tree-generator.ts:5](../../packages/simulator-core/src/tree-generator.ts#L5),
[packages/simulator-core/src/simulation.ts:283](../../packages/simulator-core/src/simulation.ts#L283),
[simulator-app/src/App.tsx:124](../../simulator-app/src/App.tsx#L124),
diverse `product-*/src/index.ts`). Soll auf eine zentrale Konstante in `simulator-core` reduziert werden.

### 1.5 Reattachment

Wenn ein Member vollständig churnt:

- seine aktiven Member-Kinder werden zum Sponsor hochgezogen
- sein `shopperCount` wird zum Sponsor übertragen
- der gechurnte Member verliert seinen `shopperCount`

So bleibt aktive Struktur erhalten und Shopper-Volumen rutscht in die nächste aktive Upline.

**Implikation:** „direkte Beine" eines Sponsors ist nach Reattachment nicht mehr identisch mit „aus Rekrutierung entstandene Beine". UI-Tooltip muss das klarstellen, sonst wirkt der Cap inkonsistent (vgl. [01-Zielarchitektur.md §6](01-Zielarchitektur.md#6-bekannte-drift-risiken)).

## 2. Shopper-Regeln

### 2.1 Modellentscheidung (Erarbeitung 14)

> **Member sind Struktur. Shopper sind Volumen.**

Shopper sind keine eigenständigen Personen mehr im Simulationskern. Sie laufen als Float-Wert `shopperCount` pro Sponsor.

| Eigenschaft | Wert |
|---|---|
| Person im Personenbaum | nein |
| Eigene Downline | nein |
| LifePlus-Status | nein |
| Bilden Beine | nein |
| Dezimalwerte erlaubt | ja (z. B. `2,65 Shopper`) |
| QGV-relevant | ja |
| AV-relevant | nein |

### 2.2 Wachstum

```ts
// Root
root.shopperCount += shoppersPerYear;

// Member
member.shopperCount += member.weight * shoppersPerYear * duplicationRate * sourceWeight;
```

`sourceWeight` bleibt für Reality-Strategien (Random/Momentum) relevant.

### 2.3 Churn

```ts
lost = shopperCount * attritionRate;
shopperCount -= lost;
```

Keine ganzen Shopper-Abgänge, kein Shopper-Carry.

### 2.4 Umsatz

```text
shopperVolume = shopperCount * shopperMonthlyVolume
```

Beispiel: `2,65 Shopper × 45 IP = 119,25 IP`.

### 2.5 Member-Churn-Folge

Siehe §1.5 Reattachment — `shopperCount` wandert mit zum Sponsor.

## 3. Churn-Regeln

### 3.1 Selektiver Member-Churn nach Vorjahresstatus

Nicht alle Member sind dem Churn ausgesetzt. Für LifePlus churnen aktuell nur:

- Member
- Believer
- Builder
- Bronze

Silver, Gold und Diamond gelten als stabilisiert.

**Grundlage:** Vorjahresstatus, ermittelt über `calculateTreeCompensation` auf einem Eligibility-Snapshot. Kandidatenauswahl in `selectTreeMemberChurnCandidates`, deterministisch „neueste zuerst".

**Begründung (Erarbeitung 16 P2):** Globaler Churn auf alle aktiven Member führte zu kontraintuitiven Effekten — höhere Fluktuation konnte durch Strukturverschiebung Status/Provision sogar verbessern, hohe Status wurden unrealistisch stark entfernt.

### 3.2 Root-Churn

- Root selbst churnt nie.
- Root rekrutiert weiterhin jedes Jahr `membersPerYear` neue direkte Member.
- **Direkte Root-Member unterliegen demselben Churn wie alle anderen** (frühere Sonderbefreiung wurde in Erarbeitung 15 entfernt — sie bevorzugte den Root strukturell).

### 3.3 Mindest-Churn-Regel

Damit aggressive Wachstumsannahmen nicht zu unplausiblen Zahlen führen, gilt im Produktmodus eine Mindest-Fluktuation in Abhängigkeit von `membersPerYear`:

| `membersPerYear` | Mindest-Churn |
|---:|---:|
| ≥ 2,0 | 10 % |
| ≥ 2,5 | 18 % |
| ≥ 3,0 | 25 % |
| ≥ 3,5 | 30 % |

P3 (Stresstest ohne Churn) bricht diese Regel bewusst — nur Vergleichszweck, kein UX-Ziel.

### 3.4 Churn-Modell — offene Entscheidung

Erarbeitung 15 hat zwei mögliche Interpretationen von „Fluktuation = 50 %" sichtbar gemacht. Die Wahl beeinflusst die Erwartungslogik der UX deutlich.

#### Modell A — Bestand-Churn (kompoundierend, aktuell implementiert)

```text
aktive Kinder nach Churn = aktive Kinder − floor(aktive Kinder × churn + carry)
danach neue Kinder aus membersPerYear
```

Bei `2 Member/Jahr` und `50 % Churn` stabilisiert sich der direkte aktive Bestand auf ca. **4 Member** ab Jahr 4.

- *Vorteil:* klassisches Retention-/Bestandsverständnis.
- *Nachteil:* widerspricht der intuitiven Nutzererwartung `12 brutto × 50 % = 6 aktiv`.

#### Modell B — Zuwachs-Churn (nicht-kompoundierend)

```text
netto neue aktive Member/Jahr = membersPerYear × (1 − churn)
```

Bei `2 Member/Jahr` und `50 % Churn`: netto +1 aktiver Member/Jahr → Jahr 6 ≈ **6 aktive direkte Member**.

- *Vorteil:* intuitiv, weniger sprunghaft, Statusentwicklung nachvollziehbarer.
- *Nachteil:* weniger realistisch bei langen Laufzeiten; muss als „Netto-Fluktuation auf Neuzuwachs" benannt werden.

**Empfehlung Erarbeitung 15:** Modell B (Zuwachs-Churn) — passt zur UX-Erwartung und macht Slider-Zusammenhänge nachvollziehbar. Entscheidung steht noch aus.

### 3.5 Shopper-Churn

Wird direkt auf `shopperCount` als Float angewandt (§2.3). Keine Sonderregel, keine Carry-Logik.

## 4. Provision, QGV und AV

### 4.1 Definitionen

| Größe | Bedeutung | Statusrelevant | QGV-relevant |
|---|---|---|---|
| **AV** (Aktiv-Volumen) | eigener Member-Verbrauch | ja | indirekt über Status |
| **QGV** (qualifiziertes Gruppen-Volumen) | Downline-QGV + eigene Shopper | ja | ja |
| Member-Umsatz | `av × weight` | – | wird im Subtree-`ownVolume` aufgenommen |
| Shopper-Umsatz | `shopperCount × shopperMonthlyVolume` | nein | ja |

### 4.2 Phasenstruktur

| Phase | Charakter | Aggregat-Tauglichkeit |
|---|---|---|
| Phase 1 | linear (40 % Pool, Ebenen 1–3, Kompression auf qualifizierte Upline) | exakt im Mittel |
| Phase 2 | nicht-linear (Slot-Vergabe nach Rang) | strukturell verzerrt aggregiert |
| Phase 3 | nicht-linear (Slot-Vergabe + Ein-Phase-Regel) | strukturell verzerrt aggregiert |

Daraus folgt: Im Zielmodell zieht das UI alle Phasen-Provisionen aus dem Personenbaum (siehe [01-Zielarchitektur.md §4](01-Zielarchitektur.md#4-datenquelle-pro-ui-bereich)). Der historische Aggregat-Pfad bleibt nur in Benchmark-Vergleichen relevant.

### 4.3 Root-eigene Shopper-Provision

Root-eigene Shopper erzeugen Phase-1-Root-Provision. Damit die Summe der visuellen Beine zur Hero-Zahl passt, wird Root-eigene Shopper-Provision in der Visualisierung als **virtueller Eintrag** dargestellt.

**Wichtig:** Dieser virtuelle Eintrag zählt **nicht als GL**. Tabelle und Hero-Zahl müssen das eindeutig unterscheiden:

- *GL* = echte direkte Member-Beine
- *Eigene Shopper* = Root-Shopper-Provision, kein Bein

→ Label, Farbe und Tooltip in der Visualisierung müssen das klarstellen (vgl. [01-Zielarchitektur.md §6](01-Zielarchitektur.md#6-bekannte-drift-risiken)).

### 4.4 Tabellen-Spalte „DL (B/S/G/Dia)"

Zählt **alle aktiven Member in der Downline** nach Status — nicht nur direkte. Bei Compressed-Mode werden gewichtete Aggregatknoten als Anzahl gezählt und gerundet.

→ Tooltip/Caption nötig: „DL = gesamte aktive Downline, gewichtete Aggregate werden als Anzahl gezählt".

## 5. Reality-Strategien

| Strategie | Modus-Suffix | Verhalten |
|---|---|---|
| Deterministisch | `person-tree` | gleichmäßige Verteilung auf Beine; reproduzierbar |
| Random | `person-tree-random` | Dirichlet-basierte Verteilung; Seed-gesteuert |
| Momentum | `person-tree-momentum` | erfolgreiche Beine wachsen schneller (lock-in-Effekt) |

Im Benchmark-Kontext werden zusätzlich `standard`, `dirichlet`, `momentum` als Strategie-Namen ohne `person-tree-`-Präfix verwendet. Das ist bewusst getrennt — Runtime-Begriffe sind die `person-tree*`-Werte, Benchmark-Begriffe sind die kurzen.

## 6. UI-Glossar

| Begriff | Bedeutung |
|---|---|
| GL | echte direkte Member-Beine (ohne Eigene Shopper) |
| DL | gesamte aktive Downline (statusgezählt, alle Tiefen) |
| Eigene Shopper | Root-eigene Shopper-Float — Volumen, kein Bein |
| live / grau | Aggregat-Pfad-Daten während Slider-Drag |
| exakt / dunkelgrün | Personenbaum-Detaildaten nach Debounce |
| wartet | Detailberechnung läuft, Hero hält letzten exakten Stand |
| Compressed | gewichtete Member-Aggregate ab `MAX_EXPLICIT_MEMBER_PERSONS` |

## 7. Migrations-Backlog Shopper-/Strategy-Legacy

Aus Erarbeitung 18 §P3, Z7, Z19:

| ID | Datei(en) | Maßnahme |
|---|---|---|
| P3.1 | [packages/simulator-core/src/person-tree.ts](../../packages/simulator-core/src/person-tree.ts), [packages/simulator-core/src/tree-generator.ts](../../packages/simulator-core/src/tree-generator.ts), [packages/product-lifeplus/src/tree-compensation.ts](../../packages/product-lifeplus/src/tree-compensation.ts) | `shopper` aus `SimPersonKind` entfernen; alle `kind === 'shopper'`-Branches entfernen. Vorher Tests/Fixtures migrieren. |
| P3.2 | [packages/simulator-core/src/person-tree.ts](../../packages/simulator-core/src/person-tree.ts), [packages/simulator-core/src/tree-generator.ts](../../packages/simulator-core/src/tree-generator.ts) | `shopperCarry` und `shopperAttritionCarry` prüfen und entfernen, falls nach Float-Shopper-Logik nicht mehr genutzt |
| P3.3 | [packages/product-lifeplus/tests/helpers/tree-fixture.ts](../../packages/product-lifeplus/tests/helpers/tree-fixture.ts), [simulator-app/src/components/network/sunburst-node.test.ts](../../simulator-app/src/components/network/sunburst-node.test.ts), [simulator-app/src/components/person-tree/person-tree-node.test.ts](../../simulator-app/src/components/person-tree/person-tree-node.test.ts) | Fixtures auf `shopperCount` migrieren; alte Shopper-Personen-Assertions entfernen |
| P3.4 | [simulator-app/src/components/person-tree/person-tree-node.ts](../../simulator-app/src/components/person-tree/person-tree-node.ts), [simulator-app/src/components/network/sunburst-node.ts](../../simulator-app/src/components/network/sunburst-node.ts) | Shopper nur noch als kompakter Wert am Member anzeigen, nicht als einzelne Person |
| Z7 | [packages/simulator-realistic-growth/src/contracts.ts](../../packages/simulator-realistic-growth/src/contracts.ts), [packages/simulator-realistic-growth/src/index.ts](../../packages/simulator-realistic-growth/src/index.ts), [packages/simulator-realistic-growth/tests/dirichlet.test.ts](../../packages/simulator-realistic-growth/tests/dirichlet.test.ts) | `StrategyId`-Werte `'none'` und `'lifecycle'` plus zugehörige Switch-Cases und Tests entfernen — kein produktiver Aufrufer mehr |
| Z19 | [packages/simulator-core/src/contracts.ts](../../packages/simulator-core/src/contracts.ts) | `personalMonthlyVolume` im Contract-Kommentar als „UI bietet keinen Eingang, nur Tests / Backdoor" markieren, um spätere „Warum wirkt das nicht?"-Bugs zu vermeiden |

## 8. Modell-Invarianten (Test-Empfehlung)

Aus Erarbeitung 16 §„Empfohlene nächste Schritte" — diese Invarianten sollten dauerhaft als Regressionstests laufen:

- `root.totalEUR == sum(visualLeg.eur including own shoppers)`
- `compensation.networkSize == table.networkSize`
- `compensation.qgv == table.qgv`
- Eigene Shopper zählen zu QGV, aber nicht zu GL
- `directLegs` meint echte direkte Member-Beine, nicht virtuelle Shopper
- Keine Doppelzählung bei Shopper-Floats vs. legacy `kind: 'shopper'`-Personen
- Steigende Fluktuation darf das Netzwerk nicht vergrößern (außer durch klar erklärten Rang-/Kompressionsmechanismus)
- Silver+-Kandidaten dürfen nicht churnen (§3.1)
- 35/37/38/39/40/50 %-Churn-Szenarien als feste Regressionsbenchmarks einfrieren
