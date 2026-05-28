# Referenznetzwerk-Tests fuer Verguetungsplaene

Stand: 2026-05-28

Dieses Dokument schreibt vor, wie Verguetungsplaene jedes Brands getestet werden. Es ist verbindlich fuer neue Produkte (z. B. `product-fitline`, `product-eqology`), nicht nur fuer LifePlus.

## Warum Referenznetzwerke

Simulationstests (Slider → erwartete Provision in 10 Jahren) beantworten die Frage:

> "Waechst das Modell plausibel?"

Sie beantworten **nicht** die Frage:

> "Berechnet die Engine fuer ein bekanntes Netzwerk exakt das Richtige?"

Diese zweite Frage ist die wichtige. Verguetungs-Bugs treten typischerweise dort auf, wo Slider-Tests keine Sensitivitaet haben:

- Raenge knapp an der Schwelle (z. B. n*Diamond-Staffel)
- Bronze-/Diamond-Bein-Zaehlung bei gewichteten Knoten
- Auto-AV-Bestimmung in tiefen Linien
- Phase-2/3-Slot-Verteilung bei gemischter Upline
- Shopper-Beine, die irrtuemlich als qualifiziert zaehlen

Genau dafuer sind Referenznetzwerke da: ein **handgebautes, lesbares Netzwerk**, dessen erwartetes Ergebnis ein Mensch verifizieren kann.

## Verantwortlichkeit pro Test

Ein Test darf nur **eine** fachliche Eigenschaft pruefen. Konkret heisst das: trenne Rang-Tests von Auszahlungs-Tests.

| Datei                       | Prueft                                | Bricht, wenn                          |
|-----------------------------|---------------------------------------|----------------------------------------|
| `reference-rank.test.ts`    | Rangbestimmung, QGV, qualifizierte/Bronze/Diamond-Beine, Auto-AV | Rang-Logik kaputt                   |
| `reference-payout.test.ts`  | Phase-1/2/3-Auszahlung (EUR pro Bestellung, pro Empfaenger) | Slot-Allokator oder Raten verschoben |

**Nicht** beides im selben Test mischen. Sonst bricht der Rang-Test bei jeder Rate-Aenderung in `constants.ts`, und niemand weiss, ob die Engine kaputt ist oder nur die erwarteten Betraege veraltet.

## Quelle der Wahrheit: das Fixture

Ein Referenznetzwerk wird als geschachteltes JS-Objekt aufgebaut, mit sprechenden IDs und einer kleinen Helper-DSL. Beispiel:

```ts
const NET_4_STAR_DIAMOND = networkFixture({
  monthIndex: 11,
  root: member('du', { vol: 150 }, [
    member('anna',     { vol: 150 }, [
      member('anna-a', { vol: 1250 }),
      member('anna-b', { vol: 1250 }),
      member('anna-c', { vol: 1250 }),
    ]),
    member('bernd',    { vol: 150 }, [/* analog */]),
    member('cornelia', { vol: 150 }, [/* analog */]),
    member('daniel',   { vol: 150 }, [/* analog */]),

    member('eva',      { vol: 150 }),
    member('frank',    { vol: 150 }),
    member('georg',    { vol: 150 }),
    member('heidi',    { vol: 150 }),
    member('ivan',     { vol: 150 }),
    member('julia',    { vol: 150 }),
    member('karl',     { vol: 150 }),
    member('ludwig',   { vol: 150 }),
  ]),
});
```

### Konventionen

- **Sprechende IDs.** Vornamen fuer Personen auf gleicher Ebene (`anna`, `bernd`), Suffix `-a/-b/-c` fuer deren Direkte. Keine technischen IDs wie `m-1`, `m-2`.
- **Keine ASCII-Bauminskommentar.** Der Baum wird beim Test-Fehlschlag ueber `treeToAscii(snapshot, rankStates)` ausgegeben — eine Quelle, keine Drift. Siehe Abschnitt _Pretty-Printer_.
- **`monthIndex` explizit.** Damit `joinedMonth < monthIndex` klar ist und kein Knoten als "frisch im aktuellen Monat" gilt.
- **Flach halten.** Mehr als ~25 Personen pro Netzwerk macht den Test unueberpruefbar. Lieber mehrere kleine Netze.
- **Keine Zufallselemente.** Kein Seed, keine Wachstumsstrategie, kein `simulatePersonTree`. Ausschliesslich `calculateTreeCompensation(snapshot, ...)` aufrufen.

## Welche Netze ein neuer Brand mindestens braucht

Pro Produkt sind diese sechs Referenznetzwerke Pflicht:

| Netz                          | Fokus                                            |
|-------------------------------|--------------------------------------------------|
| **PHASE_1_LINIE**             | 1 Wurzel + 3-Ebenen-Linie, ueberprueft Ebene-1/2/3-Auszahlung |
| **PHASE_2_TIEFE_LINIE**       | gestaffelte Upline (z. B. Bronze → Silver → Gold → Diamond), prueft Slot-Verteilung |
| **N_DIAMOND_SCHWELLE_UNTEN**  | exakt 1 IP unter dem n*Diamond-QGV-Schwellwert → Rang faellt zurueck |
| **N_DIAMOND_SCHWELLE_OBEN**   | exakt auf dem Schwellwert → Rang wird vergeben |
| **GEWICHTETE_AEQUIVALENZ**    | Knoten mit `weight=N` ergibt denselben Rang wie N Knoten mit `weight=1` |
| **SHOPPER_NICHT_QUALIFIZIERT**| 12 Shopper unter Wurzel → kein Phase-2-Diamond, weil Shopper keine qualifizierten Beine sind |

Brand-spezifische Zusatznetze (z. B. besondere Bonusstufen eines Plans) kommen dazu, ersetzen aber keines dieser sechs.

## Pflicht-Assertions pro Netz

Ein Referenznetzwerk-Test prueft fuer alle relevanten Personen — nicht nur die Wurzel — diese Felder:

```ts
expect(state(comp, 'du').rank.name).toBe('4*Diamond');
expect(state(comp, 'du').qualifiedLegs).toBe(12);
expect(state(comp, 'du').diamondLegs).toBe(4);
expect(state(comp, 'du').bronzeLegs).toBe(4);
expect(state(comp, 'du').av).toBe(150);
expect(comp.qgv).toBe(30000);

expect(state(comp, 'anna').rank.name).toBe('Diamond');
expect(state(comp, 'eva').rank.name).toBe('Member');
```

Die Auszahlungsbetraege gehoeren in `reference-payout.test.ts`, nicht hier.

## Pretty-Printer fuer Fail-Output

Statt eines ASCII-Kommentars **ueber** dem Fixture muss ein Helper `treeToAscii(snapshot, rankStates)` existieren, der bei rotem Test den vollstaendigen Baum mit Rang-Zustaenden druckt:

```
du                       4*Diamond  qgv=30.000  qLegs=12  dLegs=4  av=150
├─ anna                  Diamond    qgv=15.000  qLegs=12  dLegs=0  av=150
│  ├─ anna-a             Member     qgv=     0  qLegs= 0  dLegs=0  av=1250
│  ├─ anna-b             Member     qgv=     0  qLegs= 0  dLegs=0  av=1250
│  └─ anna-c             Member     qgv=     0  qLegs= 0  dLegs=0  av=1250
├─ bernd                 Diamond    qgv=15.000  qLegs=12  dLegs=0  av=150
...
└─ ludwig                Member     qgv=     0  qLegs= 0  dLegs=0  av=150
```

So liest man im CI-Output sofort, _welche_ Person falsche Werte hat, ohne den Code zu oeffnen.

## Datei- und Ordnerstruktur pro Brand

```
packages/product-<brand>/tests/
├─ reference-rank.test.ts        ← die 6 Pflichtnetze, Rang/QGV/Beine
├─ reference-payout.test.ts      ← kleines Netz + Cent-genaue Phase 1/2/3
└─ helpers/
   ├─ tree-fixture.ts            ← member(), shopper(), networkFixture()
   └─ tree-ascii.ts              ← treeToAscii() fuer Failure-Output
```

Die Helper duerfen **nicht** zwischen Brands geteilt werden, solange jeder Brand sein eigenes `SimPerson`/`SimOrder`-Schema haben kann. Erst wenn drei Brands denselben Helper kopiert haben, lohnt sich `@mlm/test-fixtures`.

## Was NICHT in Referenznetzwerk-Tests gehoert

- **Wachstumsdynamik** (`simulatePersonTree`) → eigene Tests in `tree-simulation.test.ts`.
- **Realistic-Growth-Strategien** (Dirichlet, Momentum) → `tests/integration/person-tree-reality.test.ts`.
- **UI-Verhalten** → Komponententests in `simulator-app/`.
- **Auszahlungsbetraege im Rang-Test** → gehoert in `reference-payout.test.ts`.

## Workflow beim Hinzufuegen eines neuen Brands

1. Verguetungsplan in `packages/product-<brand>/src/constants.ts` definieren.
2. Die sechs Pflichtnetze aus dieser Tabelle uebernehmen, IDs umbenennen, Volumina an den neuen Plan anpassen.
3. Erwartete Raenge per Hand am Plan **ausrechnen**, nicht aus der Engine ablesen. Ein Test, dessen Erwartung von der getesteten Engine kommt, prueft nichts.
4. Engine-Ergebnis dagegenhalten. Abweichungen sind entweder Plan-Spezifika (dann Erwartung anpassen) oder Bug (dann Engine anpassen).
5. Pretty-Printer-Output von einem zweiten Augenpaar gegenpruefen lassen.

## Verhaeltnis zu Simulations- und Reality-Tests

| Testart                         | Was sie schuetzt                                       |
|---------------------------------|---------------------------------------------------------|
| Referenznetzwerk-Tests          | Verguetungsplan-Logik (Rang, Auto-AV, Slots, QGV)        |
| `tree-simulation.test.ts`       | Wachstumsmechanik (Duplikation, Fluktuation, Membergrowth)|
| `person-tree-reality.test.ts`   | Realistic-Growth-Strategien (Dirichlet, Momentum)        |
| App-Slider-Tests                | UI-Verdrahtung und Rendering                             |

Wenn ein Bug in Produktion landet, soll man am Test-Bruch sofort sehen koennen, in welche Schicht er gehoert. Referenznetzwerk-Tests sind die unterste Schicht — wenn die brechen, ist die Verguetung selbst kaputt.
