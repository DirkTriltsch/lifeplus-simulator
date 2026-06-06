# Netzwerkwachstum Konzept Erarbeitung 16

## Kritisches Review der zusammengefassten Entwickler-Aenderungen

Stand: 2026-06-06

Dieses Dokument reviewed den aktuellen Stand der zuletzt integrierten und weiterentwickelten Aenderungen rund um:

- Personenbaum/F1a-Wachstum
- Fractional Member Carry
- Shopper als Float-Aggregate
- selektiven Member-Churn nach Vorjahresstatus
- Reattachment von Member-Kindern und Shoppern
- Tree-Compensation fuer LifePlus
- Detailberechnung/UX mit schneller Kurve und nachgelieferter exakter Tabelle
- Netzwerkvisualisierung/Sunburst/Beinansicht

Wichtig: Der aktuelle uncommitted Arbeitsbaum enthaelt sichtbar nur Aenderungen in drei Dateien:

- `simulator-app/src/App.tsx`
- `simulator-app/src/components/network/sunburst-node.ts`
- `simulator-app/src/components/network/sunburst-node.test.ts`

Fuer dieses Review wurden aber auch die bereits im Code vorhandenen Modell-Aenderungen betrachtet, insbesondere:

- `packages/simulator-core/src/tree-generator.ts`
- `packages/simulator-core/src/person-tree.ts`
- `packages/simulator-core/src/simulation.ts`
- `packages/simulator-core/src/contracts.ts`
- `packages/product-lifeplus/src/plan.ts`
- `packages/product-lifeplus/src/tree-compensation.ts`
- `packages/product-lifeplus/src/tree-simulation.ts`
- `packages/product-lifeplus/tests/engine.test.ts`
- `packages/product-lifeplus/tests/tree-simulation.test.ts`
- `simulator-app/src/components/YearlySummaryTable.tsx`
- `simulator-app/src/components/network/sunburst-node.ts`

## Kurzfazit

Die Richtung ist fachlich deutlich besser als der vorherige Stand. Besonders positiv sind:

- Member-Fractionals werden nicht mehr als sichtbare halbe Personen dargestellt, sondern per Carry akkumuliert.
- Shopper werden jetzt als Float-Wert am Sponsor gefuehrt. Das passt zum fachlichen Wunsch und verbessert Performance.
- Shopper-Volumen wird in QGV und Tree-Compensation beruecksichtigt.
- Selektiver Churn nach Vorjahresstatus verhindert die extremen Spruenge, bei denen hoehere Status unplausibel stark churnen.
- Die App trennt schnelle Aggregatkurve und nachgelieferte Detaildaten inzwischen besser.
- Eigene Shopper-Provision des Root wird in der Visualisierung als eigener virtueller Eintrag sichtbar gemacht.

Trotzdem gibt es noch relevante Risiken. Die groessten sind:

1. Das Modell ist nicht mehr rein "ganze Member-Personen", sobald `MAX_EXPLICIT_MEMBER_PERSONS` greift.
2. Reattachment veraendert die Bedeutung von "direkte Beine" und kann den Cap semantisch aufweichen.
3. Es gibt mehrere leicht unterschiedliche Sichtbarkeits- und Aggregationsregeln fuer Beine.
4. Die Performance ist deutlich besser, aber fuer grosse Szenarien noch nicht ausreichend als harte UX-Garantie spezifiziert.
5. Einige Anzeigen koennen fachlich korrekt sein, aber fuer Nutzer missverstaendlich wirken, weil virtuelle Eintraege und echte Beine gemischt werden.

## Kritische Findings

### P1: "Member sind ganze Personen" gilt nicht mehr absolut

In `tree-generator.ts` gibt es `MAX_EXPLICIT_MEMBER_PERSONS = 5_000`. Wenn die explizite Personenanzahl plus neue Member ueber diesen Wert steigt, erzeugt der Generator gewichtete Member-Knoten:

```ts
weight: count
```

Das ist performanceseitig verstaendlich und wahrscheinlich notwendig. Es widerspricht aber der zuletzt klaren fachlichen Aussage:

> Shopper als Float, Member als ganze Person.

Aktuell ist die Wahrheit also:

- bis zur expliziten Grenze: Member sind ganze Personen
- ab der Performance-Grenze: Member werden teilweise als gewichtete Aggregatknoten gefuehrt

Das ist nicht zwingend falsch, muss aber explizit als Modellmodus beschrieben werden. Sonst wirkt es spaeter wie ein Berechnungsfehler, wenn ein Knoten intern `weight > 1` hat.

Empfehlung:

- Begrifflich sauber trennen:
  - `Exact person mode`: explizite ganze Member
  - `Compressed member mode`: gewichtete Member-Aggregate ab Cap
- In UI/Docs anzeigen, wenn Kompression aktiv wurde.
- Tests ergaenzen, die absichern, dass Kompression nicht zu falschem Rank/QGV/Provision fuehrt.

### P1: Reattachment macht den Cap nicht mehr zu einem harten Bein-Cap

Der Code erlaubt Reattachment:

- Wenn ein Member churnt, werden aktive Kinder an den Sponsor des churned Member gehaengt.
- Shopper des churned Member werden ebenfalls an den Sponsor verschoben.

Das ist fachlich gewollt und verhindert Umsatzverlust durch abgeschnittene aktive Subtrees.

Aber: Der direkte Member-Cap (`maxDirectMembersPerMember`) begrenzt nur neue Rekrutierung. Durch Reattachment kann ein Sponsor spaeter mehr direkte Member haben als der Cap erlaubt. Ein Test dokumentiert das sogar:

```ts
expect(snapshots[35].directLegs).toBeGreaterThan(5);
```

Das ist kein Bug, wenn der Cap als "maximale aktive Direktbetreuung aus Rekrutierung" gemeint ist. Es ist aber ein Bug, wenn der User "maxDirectMembersPerMember" als harte Obergrenze fuer direkte Beine versteht.

Empfehlung:

- Einstellung umbenennen oder Tooltip praezisieren:
  - "Max. neue direkte Members je Sponsor"
  - oder "Rekrutierungs-Cap; Reattachment kann direkte Beine erhoehen"
- Alternativ fachlich entscheiden, ob Reattachment unter Cap-Bedingungen anders verteilt werden muss.

### P1: Bein-Sichtbarkeit ist nicht ueberall gleich

Im aktuellen Stand gibt es mindestens drei Bein-Sichtbarkeitsregeln:

1. `personTreeToNetworkSnapshot`:
   - nimmt nur aktive direkte Member-Kinder von Root als Legs.

2. `buildLegsFromPersons` / `buildSunburstTreeFromPersons`:
   - nimmt aktive direkte Member-Kinder plus inaktive direkte Kinder, wenn darunter aktive Struktur liegt.

3. Tree-Compensation:
   - berechnet Auszahlung entlang Sponsor-Pfaden und kann durch Reattachment/Shopper-Aggregate eigene Logik haben.

Diese Trennung ist technisch nachvollziehbar, aber riskant. In Sonderfaellen kann die Tabelle/Chart andere Beinanzahlen ausweisen als Sunburst/Beinansicht. Das Risiko ist besonders relevant bei:

- Legacy-Snapshots
- teilweise reattachten Strukturen
- inaktiven Zwischenknoten mit aktiven Kindern
- gemischten expliziten und aggregierten Membern

Empfehlung:

- Eine gemeinsame Hilfsfunktion fuer "displayable root legs" einfuehren.
- Tests fuer folgende Invariante:
  - `sum(visualLeg.eur) == root.totalEUR`
  - `sum(leg.members/shopper/qgv) + rootOwnShopper == displayed network totals`
  - `table GL` und Visualisierungs-Legs haben bewusst dokumentierte Beziehung.

### P1: Eigene Root-Shopper werden als virtuelles Bein angezeigt, sind aber kein echtes GL

Die Aenderung in `sunburst-node.ts` ist fachlich richtig: Root-eigene Shopper erzeugen Root-Provision und muessen sichtbar werden, sonst ist die Summe der Beine kleiner als die Hero-Provision.

Problem: Der virtuelle Eintrag `Eigene Shopper` sieht in der Visualisierung wie ein weiteres Bein aus. In der Tabelle steht aber GL als echte direkte Member-Beine. Dadurch koennen Nutzer denken:

- GL = Anzahl visueller Legs
- oder `Eigene Shopper` sei ein echtes Bein

Das ist fachlich falsch.

Empfehlung:

- Virtuellen Eintrag visuell klar trennen:
  - Label: "Eigene Shopper (kein GL)"
  - andere Farbe/Pattern
  - Tooltip: "Root-eigene Shopper-Provision, kein Member-Bein"
- In Leg-Summen intern weiterhin mitzaehlen, aber nicht als GL ausgeben.

### P2: Selektiver Churn ist plausibler, aber teuer und noch nicht ausreichend als Invariante getestet

Der selektive Churn wird ueber `selectTreeMemberChurnCandidates` gesteuert. LifePlus churnt aktuell nur:

- Member
- Believer
- Builder
- Bronze

Grundlage ist der Vorjahresstatus, berechnet via `calculateTreeCompensation` auf einem Eligibility-Snapshot.

Das ist fachlich gut, weil es Status-Stabilitaet ab Silver/Gold/Diamond modelliert. Es reduziert auch die vorher gesehenen unplausiblen Spruenge bei steigender Fluktuation.

Risiken:

- Fuer jedes Jahr wird zusaetzlich Tree-Compensation zur Eligibility-Bestimmung gerechnet.
- Bei grossen Snapshots ist das zusaetzliche O(N)-Arbeit.
- Die Auswahl ist deterministisch "neueste zuerst". Das ist nachvollziehbar, aber modelliert eine Annahme, keine neutrale Churn-Verteilung.
- Es fehlen Regressionstests fuer die konkreten 35/37/38/39/40%-Szenarien, die vorher auffaellig waren.

Empfehlung:

- Benchmarks fuer Churn 35-40% wiederholen und dokumentieren.
- Test ergaenzen:
  - steigende Fluktuation darf Netzwerk nicht vergroessern, ausser wenn klar erklaerter Rang-/Kompressionsmechanismus greift.
  - Silver+ Kandidaten duerfen nicht churnen.
  - Bronze darf im Folgejahr churnen, Silver im Folgejahr nicht.

### P2: Shopper-Floats sind richtig, aber Legacy-`kind: shopper` bleibt aktiv

Das neue Modell fuehrt Shopper als Float am Sponsor:

- `shopperCount`
- `shopperMonthlyVolume`
- `shopper_order` mit `weight = shopperCount`

Das ist exakt die gewuenschte Vereinfachung fuer Shopper.

Der Code unterstuetzt aber weiterhin explizite Shopper-Personen (`kind === 'shopper'`). Das ist fuer alte Tests/Snapshots vielleicht hilfreich, erhoeht aber das Risiko von Doppelzaehlung, wenn beide Modellarten gemischt werden.

Beispiele:

- `personTreeToNetworkSnapshot` zaehlt Root-`shopperCount` und explizite Root-Shopper.
- `tree-compensation.ts` behandelt `shopper_order` ueber `getShopperAggregateUplinePath`.
- `sunburst-node.ts` kann `kind === 'shopper'` noch in Subtree-Stats zaehlen.

Empfehlung:

- Explizite Shopper-Personen als Legacy markieren.
- Tests ergaenzen:
  - Mixed Snapshot mit `shopperCount` und explizitem Shopper darf nicht doppelt zaehlen, oder wird bewusst verboten.
- Optional: In neuen Generatorpfaden keine `kind: shopper` mehr erzeugen und per Type/Validation absichern.

### P2: QGV/AV-Logik in Tree-Compensation ist fachlich besser, aber komplex und erklaerungsbeduerftig

Positiv:

- Member-Orders werden mit effektivem AV bewertet.
- Shopper-Volumen zaehlt zum QGV.
- AV ist eigener Member-Verbrauch und qualifiziert Status.
- Phase 1/2/3 werden entlang echter Upline berechnet.

Kritisch:

- In `calculateRankStates` wird der eigene Member-Umsatz als `ownVolume = av * weight` in den Subtree aufgenommen.
- QGV fuer Status selbst wird als Downline-QGV plus eigene Shopper berechnet, aber nicht inklusive eigener AV.
- Das kann fachlich korrekt sein, muss aber exakt zur LifePlus-Definition passen.

Empfehlung:

- In `Netzwerk-Modellierung.md` oder einem neuen technischen Appendix explizit definieren:
  - AV
  - QGV
  - eigener Member-Umsatz
  - eigene Shopper
  - Downline-Shopper
  - was fuer Status qualifiziert
  - was fuer Provision zaehlt
- Tests fuer Grenzfaelle:
  - Root nur eigene Shopper
  - Member mit hoher AV aber ohne QGV
  - Member mit Shopper-QGV und niedrigem AV

### P2: Tabelle "DL (B/S/G/Dia)" zaehlt alle Downline-Status, nicht Beine

`YearlySummaryTable.tsx` zaehlt alle aktiven Member in der Downline nach Status:

- Bronze
- Silver
- Gold
- Diamond

Das entspricht der Spaltenbeschreibung "DL", nicht "Beine". Es ist kompakt und nuetzlich.

Risiko:

- Bei gewichteten Member-Aggregaten werden Gewichte gezaehlt und gerundet.
- Bei sehr grossen Szenarien kann eine aggregierte Person mit `weight > 1` wie viele Status-Personen wirken. Das ist rechnerisch korrekt fuer Kompressionsmodus, aber nicht anschaulich.
- Es wird nicht zwischen direkter Downline und gesamter Downline unterschieden.

Empfehlung:

- Tooltip/Caption:
  - "DL = gesamte aktive Downline, gewichtete Aggregate werden als Anzahl gezaehlt"
- Optional separate Spalte/Tooltip fuer "Status-Beine", falls das fuer n*Diamond wichtiger ist.

### P2: UX-Status "schnell" vs. "exakt" ist besser, aber noch nicht narrensicher

Die App berechnet:

- schnelle Aggregatkurve live
- Detaildaten verzögert/debounced
- Tabelle nur bei fertigen Detaildaten
- Hero bleibt auf letztem exakten Stand oder zeigt initial Skeleton

Das ist deutlich besser als der fruehere träge Zustand.

Risiko:

- Ziele und Chart koennen live aggregiert sein, waehrend Hero noch den letzten exakten Wert zeigt.
- Das ist UX-seitig okay, aber nur wenn der Hinweis klar genug ist.
- Nutzer koennen sonst denken, Hero und Chart widersprechen sich.

Empfehlung:

- Hinweis textlich noch eindeutiger:
  - "Chart live approximiert, Hero/Tabelle exakt nach Berechnung"
- Optional kleine Status-Badges direkt an Chart und Hero:
  - "live"
  - "exakt"
  - "wartet"

### P3: Kommentar in `buildLegAncestorMap` ist veraltet

Der Kommentar sagt sinngemaess, dass Root-eigene Beitraege per Konstruktion keine Payouts erzeugen. Durch eigene Shopper-Payouts ist das nicht mehr korrekt.

Empfehlung:

- Kommentar anpassen:
  - "Root-eigene Shopper-Payouts werden separat als virtueller Eintrag ausgewiesen."

### P3: Kleine Codequalitaets-Themen

In `sunburst-node.ts` gibt es eine Einrueckungsstelle:

```ts
for (const childId of p.childrenIds) {
const child = personsById.get(childId);
```

Das ist kein Laufzeitfehler, aber ein Zeichen, dass Formatierung/Prettier nicht konsequent greift.

Empfehlung:

- Formatierung fuer geaenderte TS/TSX-Dateien laufen lassen.
- Optional Prettier/ESLint in CI erzwingen.

## Positive Bewertung der aktuellen Richtung

### 1. Fractional Member Carry loest den urspruenglichen Kernfehler

Der vom Nutzer gemeldete Fehler bei `2,5 Member/Jahr` war fachlich gravierend:

- Es durften keine sichtbaren 0,5 Member entstehen.
- Zwei 0,5 Carry-Anteile aus Jahr 1 und 2 muessen einen ganzen Member ergeben.
- Ganze Member aus Jahr 1 muessen im Folgejahr voll duplizieren.

Die aktuelle F1a-Logik mit `memberCarry` behebt dieses Grundproblem.

### 2. Shopper als Float ist die richtige Vereinfachung

Shopper haben:

- keinen Status
- keine eigene Downline
- keinen AV-Statusanstieg
- aber Umsatz/QGV/Provision

Als Float-Aggregat am Sponsor sind sie daher fachlich und technisch sauberer als eigene Personen. Diese Aenderung reduziert Node-Zahl, Speicher und Renderlast deutlich.

### 3. Selektiver Churn ist fachlich plausibler als globaler Churn

Globaler Churn auf alle aktiven Member hat zu kontraintuitiven Effekten gefuehrt:

- hoehere Fluktuation konnte durch Strukturverschiebung Status/Provision verbessern
- hohe Status wurden unrealistisch stark entfernt

Die Begrenzung auf Member bis Bronze ist ein plausibler Modellschritt.

### 4. Tree-Compensation ist der richtige Pfad fuer exakte Daten

Die App sollte fuer Status, Provision und Tabelle nicht aus dem Aggregatmodell ableiten, wenn echte Personenbaumdaten verfuegbar sind.

Der aktuelle Ansatz:

- schnelle Aggregatkurve fuer Slider-Responsiveness
- echte Tree-Compensation als nachgelieferte Detaildaten

ist aus UX- und Performance-Sicht richtig.

## Performance-Einschaetzung

### Was verbessert wurde

Shopper als Float reduziert die groesste vermeidbare Explosion:

- vorher: jeder Shopper konnte als eigener Knoten wirken
- jetzt: pro Sponsor nur `shopperCount`

Das senkt:

- Personenzahl
- Snapshot-Groesse
- Tree-Layout-Kosten
- SVG/Canvas/DOM-Komplexitaet
- Compensation-Order-Anzahl

Auch das Debounce-Verhalten in der App reduziert Slider-Blockaden:

- schnelle Kurve reagiert sofort
- Detailberechnung wird erst nach kurzer Ruhephase gestartet

### Was weiterhin teuer bleibt

Die Tree-Compensation bleibt O(N) bis O(N * Tiefe) je Snapshot/Year-End, je nachdem wie viele Orders und Upline-Pfade verarbeitet werden.

Besonders teuer:

- viele explizite Member
- tiefe Upline-Pfade
- viele Year-End-Berechnungen
- zusaetzliche Eligibility-Compensation fuer Churn
- Visualisierung grosser Personenbaeume

### Performance-Risiko durch `MAX_EXPLICIT_MEMBER_PERSONS`

Der Cap von 5.000 expliziten Membern schuetzt die App, aber erzeugt ein hybrides Modell. Das ist vermutlich notwendig, sollte aber transparent gemacht werden.

Ohne Transparenz entsteht fachliches Drift-Risiko:

- Nutzer glaubt an voll exakte Personenlogik.
- Code nutzt ab Grenze gewichtete Aggregatknoten.
- Tabelle/Status/Provision bleiben rechnerisch plausibel, aber nicht mehr "jede Person einzeln".

Empfehlung:

- Wenn Kompression aktiv ist, UI-Badge:
  - "Komprimierte Detailrechnung"
- Benchmark-Dokumentation:
  - Zeit bis Detaildaten
  - Anzahl explizite Member
  - Anzahl aggregierte Member
  - Anzahl Orders
  - Renderzeit Chart
  - Renderzeit Personenbaum

## Empfohlene naechste Schritte

### Schritt 1: Modellmodus explizit machen

Dokumentieren und optional in UI anzeigen:

- `Exact`: alle Member explizit
- `Compressed`: Member-Aggregate ab Cap
- Shopper immer Float

Das verhindert Drift in spaeteren Reviews.

### Schritt 2: Invarianten-Tests einfuehren

Wichtige Invarianten:

- `root totalEUR == sum(visual legs eur including own shoppers)`
- `compensation.networkSize == table.networkSize`
- `compensation.qgv == table.qgv`
- `own shoppers` zaehlen zu QGV, aber nicht zu GL
- `directLegs` meint echte direkte Member-Beine, nicht virtuelle Shopper
- keine Doppelzaehlung bei Shopper-Floats

### Schritt 3: 35-40%-Churn-Szenarien erneut benchmarken

Die auffaelligen Szenarien sollten als feste Regressionen erhalten bleiben:

- 3 Member/Jahr
- 4 Shopper/Jahr
- 50 IP und 70 IP
- 35%, 37%, 38%, 39%, 40%, 50% Churn
- 100% Duplikation

Zu pruefen:

- Netzwerk-Groesse
- Rank
- Provision/Monat
- GL
- DL (B/S/G/Dia)
- ob Provision bei steigender Fluktuation plausibel monoton oder erklaerbar nicht-monoton ist

### Schritt 4: Begriffe in UI schaerfen

Besonders wichtig:

- GL = echte direkte Member-Beine
- `Eigene Shopper` = kein GL
- DL = gesamte aktive Downline-Statuszaehlung
- "exakt" nur fuer fertige Tree-Compensation
- "live" oder "schnell" fuer Aggregatkurve

### Schritt 5: Kommentar- und Formatierungsbereinigung

Kleine, aber reviewrelevante Bereinigungen:

- veraltete Kommentare zu Root-eigenen Payouts aktualisieren
- Einrueckung in `sunburst-node.ts` korrigieren
- ggf. Prettier fuer betroffene Dateien laufen lassen

## Gesamturteil

Die Aenderungen sind insgesamt eine deutliche Verbesserung gegenueber dem vorherigen Zustand. Der groesste fachliche Fehler mit Fractional Membern wurde korrigiert, Shopper-Floats sind die richtige Vereinfachung, und die App trennt schnelle UX von nachgelieferter Detailrechnung inzwischen besser.

Der aktuelle Stand ist aber noch kein "fertig spezifiziertes Zielmodell". Er ist ein leistungsfaehiger Hybrid:

- exakt fuer kleinere/mittlere Personenbaeume
- komprimiert fuer grosse Szenarien
- shopper-float-basiert
- statusselektiv im Churn
- mit Reattachment-Kompression in der Struktur

Das ist wahrscheinlich der richtige Weg. Aber genau diese Hybriditaet muss aktiv benannt, getestet und in der UX sichtbar gemacht werden. Sonst entsteht wieder Drift: fachlich wird "ganze Personen" gesagt, technisch werden ab Cap gewichtete Personen genutzt; fachlich wird "GL" gesagt, visuell gibt es virtuelle eigene Shopper; fachlich wird "exakt" gesagt, waehrend Chart und Ziele kurzfristig live/aggregiert sein koennen.

Meine Empfehlung: Nicht zurueckbauen. Stattdessen die Hybrid-Architektur bewusst machen, mit Invarianten absichern und die grossen Churn-Szenarien als feste Regressionen einfrieren.
