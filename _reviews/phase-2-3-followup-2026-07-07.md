# Phase-2/3-Doppelbezug - separater Klaerungsauftrag

Status: zurueckgestellt, fachliche Entscheidung offen
Datum: 2026-07-07

## Ausgangspunkt

Die LifePlus-Beispielrechnung und die Personenbaum-Simulation behandeln Phase-2- und Phase-3-Auszahlungen unterschiedlich:

- `packages/product-lifeplus/src/example-line.ts`: Phase 3 schliesst Personen aus, die in derselben Linie bereits Phase 2 erhalten haben.
- `packages/product-lifeplus/src/tree-compensation.ts`: Phase 3 kann aktuell zusaetzlich an Personen gehen, die bereits Phase 2 erhalten haben.

Damit kann dieselbe Linie je nach Rechner zwei verschiedene Auszahlungsbetraege erzeugen. Das ist keine technische Detailfrage, sondern eine fachliche Verguetungsregel.

## Zu klaerende Fachfrage

Darf dieselbe Person fuer dieselbe Order gleichzeitig Phase 2 und Phase 3 erhalten?

Moegliche Antworten:

1. Nein, Phase 2 und Phase 3 sind pro Person und Order exklusiv.
   Dann muss `tree-compensation.ts` dieselben `phase2PaidPersonIds` wie `example-line.ts` beruecksichtigen.

2. Ja, Phase 2 und Phase 3 duerfen kumulieren.
   Dann muss `example-line.ts` den Ausschluss entfernen, und bestehende Tests/Erwartungen muessen angepasst werden.

3. Es haengt von Rang, Slot oder Order-Art ab.
   Dann braucht es eine explizite gemeinsame Kernfunktion, die diese Bedingungen zentral abbildet.

## Empfohlenes Vorgehen im separaten Chat

1. Mit Fachregel oder Original-Verguetungsdokument klaeren, ob Phase 2 und Phase 3 kumulieren.
2. Eine kanonische Beispiel-Linie definieren, in der ein 1*Diamond oder hoeher sowohl Phase-2- als auch Phase-3-faehig waere.
3. Erwartete Payout-Tabelle fuer diese Linie festlegen.
4. Eine gemeinsame reine Funktion extrahieren, z. B. `computePhasePayouts`, die sowohl `example-line.ts` als auch `tree-compensation.ts` verwenden.
5. Regressionstest schreiben, der dieselbe Linie durch beide Wrapper schickt und Summen sowie Empfaenger vergleicht.

## Akzeptanzkriterien fuer die spaetere Umsetzung

- Beispielrechnung und Simulation liefern fuer dieselbe Linie dieselben Phase-2-/Phase-3-Empfaenger.
- Die Summen `phase2IP`, `phase3IP` und `totalIP` stimmen zwischen beiden Rechnern ueberein.
- Der Test beschreibt explizit, ob Doppelbezug erlaubt oder ausgeschlossen ist.
- Keine UI-Anpassung ist notwendig, solange die Rechner dieselben Daten liefern.
