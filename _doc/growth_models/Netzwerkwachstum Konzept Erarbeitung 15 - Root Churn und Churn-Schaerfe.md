# Netzwerkwachstum Konzept Erarbeitung 15 - Root Churn und Churn-Schaerfe

Stand: 2026-06-06

## Anlass

In der Detailansicht fiel auf, dass Downliner nicht plausibel um ein Jahr versetzt zum Root-Knoten im Status wachsen. Besonders sichtbar war dies bei hoher Fluktuation, z.B.:

- `Members / Jahr = 2`
- `Shopper / Jahr = 2`
- `Duplikation = 100%`
- `Fluktuation = 50%`
- `Umsatz / Monat = 50 IP`

Vor der letzten Korrektur waren direkte Root-Member von der Member-Fluktuation ausgenommen. Dadurch wurde der Root-Knoten strukturell bevorzugt: Root konnte seine direkten Beine stabil behalten, waehrend Downliner ihre direkten Member durch Churn verloren.

## Umgesetzte Aenderung: Churn auch bei Root-Direktmembern

Die Sonderregel wurde entfernt.

Alt:

- direkte Root-Member churnen nicht
- Downline-Member churnen
- Root erreicht Status deutlich frueher als vergleichbare Downliner
- Statusversatz war nicht nur zeitlich, sondern strukturell verzerrt

Neu:

- Root bleibt selbst immer aktiv
- Root rekrutiert weiterhin jedes Jahr direkt `membersPerYear`
- direkte Root-Member unterliegen aber derselben Member-Fluktuation wie andere direkte Kinder eines Sponsors
- Downliner werden dadurch als zeitversetzte Sponsoren vergleichbarer bewertet

Betroffene Datei:

- `packages/simulator-core/src/tree-generator.ts`

Ergaenzte/angepasste Tests:

- `packages/product-lifeplus/tests/engine.test.ts`
- neuer Regressionstest: direkte Downliner unter Fluktuation werden als zeitversetzte Sponsoren bewertet
- angepasster Compression-Test: der Cap begrenzt neue Rekrutierung, nicht zwingend komprimierte aktive Subtrees

Verifikation:

- betroffene Core-/UI-Tests: 68 Tests bestanden
- `npm.cmd run build:lifeplus`: erfolgreich

## Neue Beobachtung: Churn wirkt zu scharf

Nach der Root-Churn-Korrektur ist ein zweites fachliches Problem sichtbarer geworden.

Bei `2 Members/Jahr` und `50% Churn` erwartet der Nutzer fuer Jahr 6 beim Root-Knoten ca. 6 aktive direkte Member:

```text
6 Jahre * 2 neue Member/Jahr = 12 brutto
50% Churn = 6 aktive Member
```

Die aktuelle Logik erzeugt aber eher 4 aktive direkte Member im stabilisierten Pool.

Grund:

Die aktuelle Implementierung interpretiert Churn als wiederkehrenden jaehrlichen Churn auf den aktiven Bestand eines Sponsors.

Vereinfacht:

```text
aktive Kinder nach Churn = aktive Kinder - floor(aktive Kinder * churn + carry)
danach kommen neue Kinder aus membersPerYear hinzu
```

Bei `2 Members/Jahr` und `50% Churn` entsteht dadurch ungefaehr:

```text
Jahr 1: +2 => 2 aktiv
Jahr 2: -1 +2 => 3 aktiv
Jahr 3: -1 +2, Carry entsteht => 4 aktiv
Jahr 4: -2 +2 => 4 aktiv
Jahr 5: -2 +2 => 4 aktiv
Jahr 6: -2 +2 => 4 aktiv
```

Das ist mathematisch konsistent fuer ein kompoundierendes Jahres-Churn-Modell. Es ist aber offenbar nicht das Modell, das fuer die UX und die Erwartungslogik der Simulation gewuenscht ist.

## Fachlicher Konflikt

Es gibt mindestens zwei moegliche Interpretationen von `Fluktuation = 50%`.

### Modell A: Bestand-Churn, kompoundierend

Jedes Jahr verliert ein Sponsor einen Anteil seines aktiven Kinder-Bestands.

Vorteile:

- entspricht klassischem Retention-/Churn-Verstaendnis
- bildet wiederkehrenden Bestandsverlust ab
- langfristig konservativ

Nachteile:

- bei hohen Churn-Werten extrem hart
- direkte Kinderzahl stabilisiert sich bei `growth / churn`
- `2 Members/Jahr` und `50% Churn` fuehrt langfristig zu ca. 4 aktiven direkten Membern
- widerspricht der Nutzererwartung `12 brutto * 50% = 6 aktiv`

### Modell B: Zuwachs-Churn, nicht kompoundierend

Churn reduziert primaer den jaehrlichen Brutto-Zuwachs bzw. den aufgebauten Brutto-Pool, nicht jedes Jahr erneut den gesamten aktiven Bestand.

Vereinfacht:

```text
netto neue aktive Member/Jahr = membersPerYear * (1 - churn)
```

Bei `2 Members/Jahr` und `50% Churn`:

```text
netto +1 aktiver Member/Jahr
Jahr 6 => ca. 6 aktive direkte Member
```

Vorteile:

- entspricht der im Screenshot geaeusserten Erwartung
- UX ist intuitiver
- Wachstum wirkt weniger abrupt und weniger "zu scharf"
- Statusentwicklung der Ebenen wird ruhiger und besser nachvollziehbar

Nachteile:

- weniger realistisch, wenn Churn als wiederkehrender Bestandsverlust verstanden wird
- kann bei langen Laufzeiten optimistischer sein
- benoetigt eine klare fachliche Benennung, z.B. "Netto-Fluktuation auf Neuzuwachs" statt klassischer Churn

## Einschaetzung

Die letzte Aenderung "Churn auch bei Root" war notwendig, weil die Root-Sonderbehandlung einen echten Bias erzeugt hat.

Die neue Beobachtung ist aber ebenfalls berechtigt: Der aktuelle Churn-Algorithmus ist fuer die erwartete UX zu aggressiv, weil er Churn als wiederkehrenden Bestandsverlust modelliert.

Wenn die Tabelle und das Dendrogramm bei `2 Members/Jahr`, `50% Churn`, Jahr 6 etwa 6 aktive direkte Root-Member zeigen sollen, muss das Churn-Modell geaendert werden.

## Empfehlung fuer den naechsten Schritt

Empfohlen wird eine explizite Entscheidung zwischen:

1. **Bestand-Churn beibehalten**
   - fachlich konservativer
   - aktuelle Werte sind erklaerbar
   - UX-Erwartung aus dem Screenshot bleibt aber verletzt

2. **Auf Zuwachs-/Netto-Churn wechseln**
   - passt zur geaeusserten Erwartung `12 brutto, 50% weg, 6 aktiv`
   - weniger sprunghaft
   - Statusentwicklung wirkt nachvollziehbarer
   - muss in UI und Dokumentation klar benannt werden

Aus UX-Sicht und fuer die Nachvollziehbarkeit der Slider wird Option 2 bevorzugt.

