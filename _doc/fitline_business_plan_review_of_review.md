# Review des Reviews: fitline_business_plan_review.md

Dieses Dokument prueft das gelieferte Review auf `fitline_business_plan.md` und haelt fest, welche Punkte ich uebernommen, korrigiert oder bewusst nicht uebernommen habe.

## Kurzfazit

Das Review ist insgesamt nuetzlich und fachlich aufmerksam. Besonders stark sind die Hinweise zu:

- expliziter EB-Basis `directTeamPartnerBusinessPoints`
- strukturierten `defaultInputs` statt flacher Mischung aus Growth/Volume/Bonus-Defaults
- Tests fuer getrennte Punktwerte und `cashEUR` vs. `benefitsEUR`
- besserer Herleitung des numerischen Jahr-3-Beispiels
- klarerer Dokumentation der Rang-Varianten

Ich wuerde das Review aber an zwei Stellen korrigieren:

1. **Komprimierung nicht als gesicherte Regel formulieren.**  
   Die gelieferte PDF belegt Komprimierung nicht eindeutig. Sie ist als moegliche V2- oder Szenario-Regel sinnvoll, sollte aber nicht als Pflichtmechanik oder Fakt dargestellt werden.

2. **Management-Bonus V1 nicht pauschal auf Ebene 7+ verschieben.**  
   Die PDF-Tabelle zeigt explizit `TB + MB` fuer Ebene 1-6. Eine V1-Approximation sollte daher MB als Differentialanteil auf denselben Ebenen modellieren, aber mit einer klaren Obergrenze/Rate-Pruefung und geschaetztem bereits gezahltem Downline-Satz. Eine exakte Loesung braucht ein Node-Modell.

## Uebernommene Korrekturen

In der korrigierten `fitline_business_plan.md` wurden folgende Punkte umgesetzt:

- `directTeamPartnerBusinessPoints` als abgeleitete, optional override-faehige EB-Basis in Abschnitt 3.2 ergaenzt.
- `applyCompression` und `compressionThresholdPoints` ergaenzt, aber als optional und nicht PDF-gesichert formuliert.
- `simulateCompression` als eigener Schalter ergaenzt.
- Jahr-3-Beispiel mit Rechenweg erweitert.
- Tiefenbonus-Code so formuliert, dass optionale Komprimierung ueber `buildCompressedLevels(...)` moeglich ist.
- Management-Bonus-V1 neu gefasst: Differentialanteil auf Ebenen 1-6 statt pauschal ab Ebene 7.
- Rangtabelle um Aktivitaetsbedingung erweitert.
- Manager-Konfiguration mit `requiresActiveAutoship` und Kommentar zu `managementRate: 0` ergaenzt.
- Auswahlregel fuer Rang-Varianten ergaenzt.
- `defaultInputs` in `growth`, `volume` und `bonusToggles` aufgeteilt.
- Tests 11-14 ergaenzt.
- Offene Punkte und Glossar um Komprimierung/Rang-Bein erweitert.

## Bewusst nicht uebernommen

Folgende Review-Empfehlungen wurden nicht 1:1 uebernommen:

- **Komprimierung als Pflichtpunkt:** nicht uebernommen, weil sie aus der PDF nicht belastbar hervorgeht.
- **MB nur auf Volumen ab Ebene 7+:** nicht uebernommen, weil die PDF-Tabelle `TB + MB` auf Ebene 1-6 ausweist.
- **Dritter Punktwert `firstLinePointToEUR`:** nicht ergaenzt. Besser ist zuerst ein klares Zwei-Faktoren-Modell (`pointToRetailEUR`, `pointToBonusEUR`) plus spaetere Kalibrierung gegen echte Fact-Sheets.
- **Umbenennung von `membersByLevel`/`shoppersByLevel`:** nicht uebernommen. Der Core sollte generisch bleiben; FitLine setzt UI-Labels ueber `terminology`.

## Ergebnis

Das korrigierte Paket enthaelt:

- `fitline_business_plan.md` als verbesserte Hauptdatei
- `fitline_business_plan_review.md` als Original-Review
- `fitline_business_plan_review_of_review.md` als Meta-Review
- `fitline_marketingplan_logik.svg` und `.png` aus der gelieferten ZIP

Die Grafik bleibt inhaltlich brauchbar, sollte aber bei spaeterer visueller Ueberarbeitung den Satz zur Komprimierung ebenfalls als optional kennzeichnen.
