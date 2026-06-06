# Netzwerkwachstum Konzept Erarbeitung 09 - Zielarchitektur

**Projekt:** lifeflow360 — Multi-Brand MLM-Plattform (Fokus dieses Audits: LifePlus / lifeflow360)
**Datum:** Juni 2026
**Vorgängerdokumente:** Erarbeitung 01, 02, 03, 05, 06, 07; Netzwerk-Modellierung.md; dynamik-mit-verguetung.md
**Zweck dieses Dokuments:** Vollständige, ungekürzte Dokumentation des Audit-Prozesses zur Zielarchitektur. Soll einem detaillierten Review zugänglich sein.

---

## Inhalt

1. Anlass und Vorgehen
2. Material-Sichtung
3. Schritt 1 — Bewertungsraster
4. Schritt 2 — Parameter-Inventar
5. Schritt 3 — Single-Source-of-Truth aufdröseln
6. Offene Fragen vor Schritt 4
7. Glossar

---

## 1. Anlass und Vorgehen

### 1.1 Anlass — beobachteter Drift in den vorherigen Reviews

Der Anlass für dieses Dokument ist die Beobachtung, dass die vorherigen Review-Runden (Erarbeitung 02, 03, 06) nicht stabil waren:

- Review 03 wurde zweimal geschrieben — erst „ausgewogen mit Lob am Ende", nach User-Rückmeldung „konsequent kritisch"
- Review 06 ebenso — erst gemischt, dann durchgängig kritisch
- Bias-Muster: der Reviewer (Claude) tendierte dazu, dem jeweils letzten User-Stichwort zu folgen, statt eine stabile Position zu halten

Das heißt: die bisherigen Bewertungen tragen den Schwankungsfehler des Bewerters mit. Sie sind nicht ohne weiteres als objektive Grundlage für eine Architektur-Entscheidung nutzbar.

Hinzu kommen zwei substanzielle Änderungen in den User-Anforderungen, die das Bewertungsbild verschieben:

1. Über mehrere Sessions hinweg wurden Parameter sukzessive erweitert (Reality-Strategien, mehrere Wachstumsachsen, Provisionen pro Knoten). Damit ist offen, ob früher verworfene Lösungen unter den heutigen Parametern besser dastehen.
2. Der User hat explizit das Dogma „Single Source of Truth" aufgegeben:

> „wenn wir im Chart eine Performante Lösung haben, die mit den Slidern funktioniert, dann können wir auch auf die Diagramme umrechnen, wenn dieser Weg nachvollziehbar und mit geringer Fehlerquote behaftet ist."

Diese Aussage öffnet den Lösungsraum für eine **Two-Path-Architektur** — Aggregat-Pfad für Chart, Tree-Pfad für Diagramme — die in den vorherigen Dokumenten nicht systematisch geprüft wurde.

### 1.2 Beschlossenes Vorgehen — strukturierter Audit-Prozess

Um Drift in der Bewertung zu vermeiden, wurde ein fünfstufiges Vorgehen vereinbart:

| Schritt | Inhalt | Status |
|---|---|---|
| 1 | Bewertungsraster — schriftlich, vom User bestätigt | ✅ abgeschlossen (Kap. 3) |
| 2 | Parameter-Inventar — vollständig | ✅ abgeschlossen (Kap. 4) |
| 3 | Single-Source-of-Truth aufdröseln — pro Datenklasse | ✅ abgeschlossen (Kap. 5) |
| 4 | Lösungsmatrix gegen das Raster | offen |
| 5 | Konsolidierte Empfehlung | offen |

**Prinzip:** Schritt 1 muss vom User bestätigt sein, bevor Schritt 2 beginnt; Schritt 2 muss bestätigt sein, bevor Schritt 3 beginnt; usw. Schritt 4 darf erst beginnen, wenn die Bewertungsbasis (1-3) steht. So kann die Bewertung in Schritt 4 nicht mehr auf den letzten Diskussionsimpuls reagieren — die Achsen sind festgenagelt.

User-Rahmenbedingungen für den Audit:

> „Der aktuelle Code darf vollständig überarbeitet oder ersetzt werden. der Aufwand hier ist egal."

> „UX, also Performance mit Slider und Nachvollziehbarkeit/kleiner Fehler zwischen Chart und Diagramm sind wichtig."

---

## 2. Material-Sichtung

### 2.1 Vom User bereitgestellte Dokumente

| Dokument | Inhalt | Status für Audit |
|---|---|---|
| Erarbeitung 01 | Grundparameter, F1a, Churn, Reattachment | gelesen |
| Erarbeitung 02 | Bewertete Top-3 (Knoten / Hybrid / Aggregat) | gelesen |
| Erarbeitung 03 | Review zu 02 | reserviert für Schritt 4 |
| Erarbeitung 05 | Umsetzungsvorschläge A-J | gelesen |
| Erarbeitung 06 | Review zu 05 + Code-Vergleich | reserviert für Schritt 4 |
| Erarbeitung 07 | Performance-Caps, UX-Strategie | gelesen |
| dynamik-mit-verguetung.md | Tier-Klassifizierung, Smart Invalidation, Snapshot Stream | gelesen |
| Netzwerk-Modellierung.md | LifePlus-Vergütungslogik Phase 1-3, Ein-Phase-Regel | gelesen |

### 2.2 Bewusste Reservierungen

Die Reviews 03 und 06 wurden für Schritt 4 (Lösungsmatrix) reserviert. Grund: Sie enthalten bereits Bewertungen mit eingebautem Drift; das Raster aus Schritt 1 muss unabhängig von ihren Bewertungsachsen aufgebaut sein, sonst übernimmt es deren Schwankungen.

---

## 3. Schritt 1 — Bewertungsraster

### 3.1 Methodisches Vorgehen

Das Bewertungsraster wurde nicht aus einer der bisherigen Lösungen abgeleitet, sondern aus zwei Quellen:

- User-Aussage zu Wichtigkeit: UX (Slider-Performance) und Nachvollziehbarkeit (Konsistenz Chart ↔ Diagramm)
- Fachlich notwendige Korrektheit: LifePlus-Vergütungslogik Phase 1-3 inkl. Ein-Phase-Regel (aus Netzwerk-Modellierung.md)

Test der Voreingenommenheit: Das Raster wurde gegen drei extreme Lösungstypen (Echtes Knotenmodell / Aggregat-only / Two-Path) probehalber bewertet, um sicherzustellen, dass keine Lösung systematisch bevorzugt wird. Alle drei landen mit unterschiedlichen Stärken/Schwächen in plausiblen Wertebereichen.

### 3.2 Initialer Vorschlag

Der initiale Vorschlag bestand aus 9 Kriterien mit Gewichtung 3× / 2× / 1×:

| # | Kriterium | Gewicht |
|---|---|---|
| 1 | Korrektheit der Vergütungsberechnung | 3× |
| 2 | Slider-Latenz | 3× |
| 3 | Konsistenz Chart ↔ Diagramme | 3× |
| 4 | Skalierbarkeit / Cap-Verhalten | 2× |
| 5 | Erweiterbarkeit auf andere Pläne | 2× |
| 6 | Determinismus | 2× |
| 7 | Testbarkeit | 1× |
| 8 | Speicher Mobile | 1× |
| 9 | Implementierungsaufwand | 1× |

Pro Kriterium wurde eine konkrete Skala 1-5 mit messbaren Schwellen sowie ein Test-Szenario formuliert.

### 3.3 User-Klarstellungen — Iteration 1

Der User hat pro Kriterium die akzeptablen Bewertungsbereiche definiert:

| # | User-Vorgabe | Auslegung |
|---|---|---|
| 1 | „5" | Vollständige Korrektheit ist Pflicht (KO-Kriterium) |
| 2 | „5 oder 4, (3 tbd, muss ich sehen)" + Spezifikation: gilt für **Hero-Zahl, Chartverlauf, Erreichung von Zielen**; nicht für Netzwerk-Diagramme oder Personenbaum-Diagramme | Latenz-Anforderung ist auf Chart-Pfad begrenzt; Diagramm-Pfad darf langsamer sein |
| 3 | „4 (3 tbd)" | Mittlere bis hohe Konsistenz nötig |
| 4 | „5 oder 4, zur not 3" | Cap-Verhalten muss klar sein |
| 5 | „2 bis 1 (andere Brands brauchen anderen Code und evtl. sogar anderer Parameter)" | Plan-Engine-Flexibilität ist nicht das Ziel |
| 6 | „5 oder 4, zur not 3" | Determinismus wichtig |
| 7 | „5 bis 3" | Testbarkeit wünschenswert, aber Spielraum |
| 8 | „5 oder 4, zur not 3" | Mobile muss laufen |
| 9 | „2 bis 1" | Aufwand explizit unkritisch |

Zusätzlich die fundamentale Klarstellung zur Konsistenz:

> „knotenweise Rückführbarkeit: wird mit Performanter UX und Slider nicht möglich sein"

### 3.4 Konsequenzen-Analyse (Claude)

Aus den User-Klarstellungen ergeben sich vier substanzielle Verschiebungen gegenüber dem ursprünglichen Vorschlag:

**(K1) Two-Path-Architektur ist faktisch zulässig.** Die Aussage „knotenweise Rückführbarkeit unmöglich" + „Latenz nur für Chart" definiert implizit die Two-Path-Architektur als zulässige Lösungsklasse. Stufe 5 in Kriterium #3 (exakte knotenweise Rückführbarkeit) wird zur theoretischen Spitze, nicht zum Anspruch. Ziel ist Stufe 4 = statistische Konsistenz im Mittel.

**(K2) Latenz-Kriterium wird gespalten.** Kriterium #2 misst nur noch Chart-Pfad (Hero-Zahl, Chartverlauf, Goals). Damit fehlt eine Achse für die Diagramm-Performance. Ein neues Kriterium #10 wird ergänzt.

**(K3) Erweiterbarkeit auf andere Pläne wird umgewertet.** Da der User andere Brands explizit als „anderer Code und evtl. andere Parameter" verbucht, ist Plan-Engine-Flexibilität kein Bewertungskriterium mehr. Stattdessen bleibt eine schwächere Achse: Wie sehr verschmilzt LifePlus-Logik mit dem Wachstumscode? Das ist Code-Hygiene, kein Multi-Brand-Feature. Gewicht 1×.

**(K4) Implementierungsaufwand bleibt drin, aber entspannt.** Trotz „Aufwand egal" wird das Kriterium nicht entfernt, weil hoher Aufwand mit hohem Bug-Risiko und schlechter Wartbarkeit korreliert. Niedrige Gewichtung (1×), Mindest-Schwelle entsprechend lax (Stufe 1 akzeptabel, Ziel Stufe 2).

### 3.5 User-Klarstellungen — Iteration 2

Auf die Konsequenzen-Analyse hat der User mit präzisierenden Vorgaben reagiert:

- Klarstellung passt
- **Mindest-Wert für #2:** „4 ist das ziel. 3 wäre ok, dazu muss ich aber die Vorteile in anderen Aspekten kennen."
- **Mindest-Wert für #3:** „4 wäre gut. 3 wäre ok. ignoriere das tbd"
- **#10 Klarstellung — neue Erkenntnis:** „Personen-Baum- und Netzwerk-Diagramm sind nicht sichtbar, wenn die Slider aktiv sind. bei den Diagrammen, ist nur der Jahres-Slider aktiv (1 bis 10 Jahre), der arbeitet aber auf dem fertigen Diagramm, oder wir bauen das Diagramm stückweise auf: jahr 1, jahr2 ...dann sind zwischenergebnisse da"

Die letzte Klarstellung führt zur **Variante B**, die später (in Schritt 2) als Standard für den Jahres-Slider auf Diagrammen fixiert wird.

### 3.6 Finales Bewertungsraster

| # | Kriterium | Gewicht | KO-Schwelle | Ziel |
|---|---|:---:|:---:|:---:|
| 1 | Korrektheit Vergütung (Phase 1-3 + Ein-Phase-Regel) | 3× | **<5 = KO** | 5 |
| 2 | Slider-Latenz für **Hero-Zahl, Chart, Goals** | 3× | <3 = KO; 3 nur mit Rechtfertigung | 4 |
| 3 | Konsistenz Chart ↔ Diagramme | 3× | <3 = KO | 4 |
| 4 | Skalierbarkeit / Cap-Verhalten | 2× | <3 = KO | 4 |
| 5 | LifePlus-Code aus Wachstumscode entkoppelt | 1× | kein KO | 4 |
| 6 | Determinismus | 2× | <3 = KO | 4 |
| 7 | Testbarkeit | 1× | <3 = KO | 4 |
| 8 | Speicher Mobile bei Default-Szenario | 1× | <3 = KO | 4 |
| 9 | Implementierungsaufwand | 1× | kein KO | 1-2 (entspannt) |
| 10 | Diagramm-Aufbau + Jahres-Scrubbing | 1× | <3 = KO | 4 |

**Max möglich:** 3·3·5 + 3·2·5 + 4·1·5 = **115 Punkte**

**Disqualifikations-Regel:** Eine Lösung, die in einem KO-Kriterium unter die Schwelle fällt, wird als nicht weiter zu betrachten markiert. Der Gesamtscore wird in diesem Fall nicht ausgerechnet, sondern stattdessen der Knock-out vermerkt. Das verhindert, dass eine Lösung mit fataler Schwäche durch Punkte in unwichtigen Kriterien kompensiert werden kann.

### 3.7 Vollständige Skalen pro Kriterium

#### Kriterium 1 — Korrektheit der Vergütungsberechnung (×3)

- 1 = nur Schätzung, Phase 2/3 nicht modellierbar
- 2 = Phase 1 korrekt, Phase 2/3 grob geschätzt
- 3 = alle drei Phasen korrekt für Beispiellinien, aber im Wachstumsbaum approximiert
- 4 = alle drei Phasen exakt für jeden Knoten/jede Order, **außer** Ein-Phase-Regel ist Approximation
- 5 = alle drei Phasen + Phase-1-Kompression + chronologische Slot-Vergabe + Ein-Phase-Regel exakt

**Test:** Das Referenzbeispiel aus `Netzwerk-Modellierung.md` (Order bei Anna, Georg = 3% Diamant Phase 2, Heidi = 3% 1*Diamant Phase 3) muss exakt herauskommen.

#### Kriterium 2 — Slider-Latenz Chart/Hero/Goals (×3)

Gemessen bei Default-Szenario (m=2, d=1, c=0, s=3, 10 Jahre ≈ 98k Member):

- 1 = >2s pro Slider-Move
- 2 = 500ms-2s, App fühlt sich „schwer" an
- 3 = 100-500ms, debounced akzeptabel
- 4 = 16-100ms während Drag (Preview), ≤500ms Commit
- 5 = <16ms während Drag (60fps), Commit asynchron im Hintergrund

**Misst nur:** Hero-Zahl, Chartlinie, Goal-Status.
**Misst NICHT:** Personen-Baum, Sunburst, Netzwerk-Diagramme.

#### Kriterium 3 — Konsistenz Chart ↔ Diagramme (×3)

- 1 = Chart-Summe und Diagramm-Summe können widersprüchlich sein
- 2 = Abweichung möglich, nicht bemerkbar/kommunizierbar
- 3 = Abweichung möglich, aber bekannt und im UI gekennzeichnet (Mindest)
- 4 = Aggregat = Erwartungswert, Tree = Realisierung, statistisch konsistent ±5% (Ziel)
- 5 = exakte knotenweise Rückführbarkeit (nicht angestrebt — verletzt Kriterium #2)

#### Kriterium 4 — Skalierbarkeit / Cap-Verhalten (×2)

- 1 = App friert oder crasht ab N>50k ohne Vorwarnung
- 2 = funktioniert bis Default, jenseits davon stiller Fail
- 3 = Cap eingebaut, aber unerklärt; User sieht abgeschnittene Zahlen
- 4 = Cap mit klarem UI-Hinweis, Fallback auf Aggregat-Modus
- 5 = Vorschätzung vor Tree-Build, automatischer Moduswechsel, alle Modi klar kommuniziert

**Test:** m=4 einstellen (17,6 Mio Member) — was passiert?

#### Kriterium 5 — LifePlus-Code aus Wachstumscode entkoppelt (×1)

- 1 = LifePlus-Slot-Vergabe ist direkt in den Wachstumsschleifen eingewachsen
- 2 = LifePlus konfigurierbar, aber Phase-2/3-Logik im selben Modul
- 3 = `CompensationPlan`-Struktur vorhanden, klare Modul-Grenzen
- 4 = Provisionslogik lebt in eigenem Modul, Wachstumscode kennt sie nicht
- 5 = Plan-Engine datengetrieben, Brands wären austauschbar (auch wenn nicht das Ziel)

#### Kriterium 6 — Determinismus (×2)

- 1 = jedes Slider-Move erzeugt anderen Tree (Knoten erscheinen/verschwinden zufällig)
- 2 = stabil bei Seed-Fix, aber Tree-IDs ändern sich bei Slider-Hin-und-Her
- 3 = Tree stabil, aber Slot-Vergabe Phase 2/3 nicht-deterministisch
- 4 = vollständig deterministisch, aber Knoten „flackern" bei Slider-Bewegung um g≈1
- 5 = vollständig deterministisch, stabile Knoten-IDs, visuell stabilisiertes Verschwinden

**Test:** Slider m=2 → m=2,5 → m=2 — sind die Provisionsergebnisse bitidentisch zur Ausgangslage?

#### Kriterium 7 — Testbarkeit (×1)

- 1 = keine Provisionslogik isoliert testbar
- 2 = Phase 1 isoliert testbar, Phase 2/3 nicht
- 3 = alle Phasen testbar, aber nur über kompletten Simulationslauf
- 4 = `calculateExampleLine()` aus aktuellem Code als Test-Frontend, Excel-Beispiele als Tests übernehmbar
- 5 = + Wachstumssimulation deterministisch reproduzierbar (Golden Tests pro Seed)

#### Kriterium 8 — Speicher Mobile (×1)

Gemessen bei Default-Szenario (~100k Member) auf iPhone:

- 1 = OOM-Crash
- 2 = >500 MB, App wird vom OS gekillt
- 3 = 200-500 MB, andere Apps werden verdrängt
- 4 = 50-200 MB, akzeptabel
- 5 = <50 MB, kein Druck

#### Kriterium 9 — Implementierungsaufwand (×1)

User hat explizit „Aufwand egal" gesagt. Kriterium bleibt als Risikoindikator drin, niedriges Gewicht.

- 1 = >3 Monate Vollzeit, hohes Bug-Risiko (akzeptabel laut User)
- 2 = 6-12 Wochen (Ziel)
- 3 = 4-6 Wochen
- 4 = 2-4 Wochen, inkrementell migrierbar
- 5 = <2 Wochen, kleine Erweiterung des Bestehenden

#### Kriterium 10 — Diagramm-Aufbau + Jahres-Scrubbing (×1)

Misst zwei Dinge zusammen — (a) Erstaufbau beim Wechsel zur Diagramm-Ansicht, (b) Jahres-Slider 1→10 auf fertigem Diagramm.

- 1 = >30s oder OOM
- 2 = 10-30s ohne Progress-Indikator
- 3 = 2-10s mit Progress-Indikator, Jahres-Slider 100-500ms (Mindest)
- 4 = 500ms-2s mit klarem Wartezustand, Jahres-Slider <100ms (Ziel)
- 5 = progressiver Aufbau (Jahr 1 sofort sichtbar, weitere streamen ein), Jahres-Slider <16ms

### 3.8 Was bewusst NICHT im Raster steht

- **Single-Source-of-Truth als Dogma** — vom User aufgegeben. Konsistenz (#3) misst stattdessen das Ergebnis: Sind Chart und Diagramm in der Wirkung konsistent, egal aus wie vielen Quellen.
- **„Fachliche Sauberkeit" als Selbstzweck** — Korrektheit (#1) misst das beobachtbare Resultat, nicht architektonische Eleganz.
- **Animations-/Visualisierungs-Qualität** — orthogonal zur Lösungsarchitektur, gehört in separates UI-Audit.

---

## 4. Schritt 2 — Parameter-Inventar

### 4.1 Methodik

Das Inventar gruppiert alle in den Dokumenten genannten Parameter nach **Zweck**, nicht nach Quelldokument. Grund: Lücken werden nur sichtbar, wenn man pro Funktionsbereich alle Parameter beisammen sieht. Pro Parameter wird notiert: Quelle, Slider-Relevanz, Datenform, Bemerkung.

### 4.2 Initiale Gruppierung

Fünf Gruppen wurden definiert:

- **A. Wachstumsparameter** (Strukturwachstum)
- **B. Volumen-/Pro-Knoten-Parameter**
- **C. Vergütungsparameter** (LifePlus-Plan)
- **D. UI / Anzeige**
- **E. Performance / Caps**

Plus drei Beobachtungen, die sich beim Zusammentragen aufdrängten (siehe 4.7).

### 4.3 User-Klarstellungen zum Inventar

Der User hat auf die initiale Liste mit folgenden Korrekturen reagiert:

> „minShopperVolume, minMemberVolume: der gleiche Slider"

> „Jahres-Slider: die idee ist neu? den ansatz würde ich gerne weiter erörtern und nutzen"

> „Brand-Wahl: Lifeflow360"

> „Filter ‚ab Status X': was meinst du damit?"

> Caps: „passen so. sollten an einer Stelle definiert/configuiert sein für schnelle änderung im code. externe config-datei nur, wenn keine performance einbuse, sonst im code"

Zum offenen Punkt Churn-Ziel/Aktivität:

> „hängen die zusammen, um ein ‚aktives' von ‚passivem' konten zu unterscheiden? mindest aktivität bei Lifeplus sind 45 IP, die haben wir über ‚minMemberVolume' festgelegt und unterscheiten ausgeschlossen."

> „benötigen wir eine klärung wie wachstum und churn ihn verteilen? ala Zufall, Momentum, etc."

Zur Beobachtung 2:

> „erkläre im detail, ich verstehe die frage nicht genau."

### 4.4 Detaillierte Erläuterungen und Folge-Entscheidungen

#### 4.4.1 Filter „ab Status X" — Erklärung

Aus dem dynamik-Dokument: Reines UI-Render-Feature, z.B. „Zeige im Sunburst nur Knoten ab Silver-Rang", andere ausgegraut. Tier 1 (<50ms — DOM-Filterung, keine Neuberechnung).

**User-Entscheidung:**
> „im Chart kann es raus, für Diagramm eine gute idee (ich würde da alle anderen ‚ausgrauen' dann sieht man im Diagramm die Entfernung zu den Status"

→ Filter wird ein Render-Setting im Diagramm-Pfad, hat keine Synchronisation zum Chart.

#### 4.4.2 Jahres-Slider auf Diagramm — neue Idee, weiter erörtert

Im dynamik-Dokument §4.2 gibt es den konzeptionellen Vorläufer (Snapshot Stream), aber dort als reines Performance-Pattern, nicht als bewusstes UX-Feature.

Zwei Varianten wurden vorgeschlagen:

- **Variante A (eager):** alle Jahre vorberechnen, User wartet 2-10s mit Progress, danach ist Jahres-Slider 1→10 instant.
- **Variante B (progressiv):** Jahr 1 sofort sichtbar, Jahr 2 streamt nach, etc. User kann Slider schon nutzen, während gerechnet wird. Wenn er auf Jahr 7 zieht und nur 1-4 fertig sind, sieht er einen Ladezustand.

Speicheraufwand: ~10× single tree. Bei N=100k ggf. 50-150 MB — am Mobile-Cap (Kriterium #8).

**User-Entscheidung:**
> „ja, Variante B (progressiv) als Standard"

→ Jahres-Slider arbeitet auf vorberechneten Snapshots, die progressiv aufgebaut werden. Kriterium #10 Stufe 5 entspricht dieser Variante.

#### 4.4.3 Aktivität — eine Achse statt zwei

In der ursprünglichen Modellierung (Erarbeitung 01) gab es zwei Aktivitäts-Begriffe:

- **Werbeaktivität:** `duplicationRate` (z.B. 75%) — wirbt der Knoten neue Member?
- **Umsatzaktivität:** `minActivityVolume` (45 IP) — macht der Knoten genug eigenen Umsatz für Provisionen?

Der User hat klargestellt, dass Knoten unter 45 IP ausgeschlossen werden — also alle modellierten Knoten machen ≥45 IP. Damit ist Umsatzaktivität keine Variable mehr, sondern Eintrittsbedingung.

→ Es bleibt nur eine Aktivitätsachse: **Werbeaktivität** (gesteuert über `duplicationRate`).

#### 4.4.4 Wachstums-/Churn-Verteilung — fehlender Parameter

Aus Netzwerk-Modellierung.md geht hervor, dass aktuell vier Reality-Strategien existieren: `standard / dirichlet / momentum / lifecycle`. Diese fehlten im initialen Inventar.

**Erste Annahme (Claude):** „Wir machen ‚Churn nur Nicht-Werber' zur fixen Regel, kein User-Slider."

**User-Korrektur:**
> „‚Wir machen Churn nur Nicht-Werber zur fixen Regel, kein User-Slider' ist keine Lösung. die Höhe vom Churn wird über den Slider eingestellt. die Verteilung des Churn, wird über 3. Wachstums-/Churn-Verteilung geregelt. wir sollten standard / dirichlet / momentum / (lifecycle später) umsetzen. Zufall ist Zufall, da brauchen wir keine Regel nach Aktivität. Momentum hat ehe eine Aktivität mit drin, die wir nutzen können"

→ Die Trennung lautet:
- **Churn-Höhe** = Slider (z.B. 30%)
- **Churn-Verteilung** = folgt der gewählten `growthDistribution`-Strategie

Bei `standard`/`dirichlet` ist Churn zufällig verteilt. Bei `momentum` korreliert sie automatisch mit Aktivität, weil Knoten mit Momentum weniger Churn-Wahrscheinlichkeit haben. Es braucht keine separate „Churn-Ziel"-Achse.

#### 4.4.5 Beobachtung 2 — detaillierte Erklärung

Da der User explizit um Erläuterung gebeten hat, folgt die volle Darstellung:

**Setup**

Eine Order entsteht bei Anna. Anna hat genau eine Upline:

```
Anna (Order, Ebene 0)
 └ Bernd  (Ebene 1)
   └ Cornelia (Ebene 2)
     └ Daniela (Ebene 3)
       └ Eva (Ebene 4) — Bronze
         └ Frank (Ebene 5) — Silber
           └ Georg (Ebene 6) — Diamant
             └ ... (höher)
```

Für die Provisionsberechnung dieser Order spielt der Rest des Baums keine Rolle. Geschwister von Bernd, Kinder von Eva — nichts davon beeinflusst, wer wieviel von Annas Order bekommt.

**Phase 1 nach Plan**

- Ebene 1 (Bernd) bekommt 25% wenn Anna Shopper, 5/25/10 wenn Member je nach IP
- Ebene 2 (Cornelia) bekommt 10% / 25% / 5%
- Ebene 3 (Daniela) bekommt 5% / 10% / 5%

Falls Bernd nicht qualifiziert, geht Bernds Stück per Phase-1-Kompression zur nächst-qualifizierten Upline — Cornelia, dann Daniela, dann Eva. Lineare Verarbeitung entlang der Upline.

**Phase 2 nach Plan**

Slot-Engine geht ab Ebene 4 hoch: Eva (Bronze) → Frank (Silber) → Georg (Diamant). Eva nimmt Bronze-Slot. Frank nimmt Silber-Slot. Georg nimmt Gold + Diamant. Linear durch die Upline-Sequenz.

**Phase 3 analog**

Ein-Phase-Regel überspringt Georg, gibt 1*-Diamant-Slot an die nächsten Diamond-Plus-Statuses oberhalb. Linear.

**Was bedeutet „linear durch die Upline"?**

Algorithmus für eine Order: gehe von Order-Knoten nach oben durch Sponsoren, sammle deren Ränge in eine Liste, verarbeite die Liste sequenziell.

Komplexität: O(Tiefe), praktisch maximal 10-15 Schritte pro Order. **Keine Tree-Operation**, kein Subtree-Walk, keine Geschwister-Betrachtung.

**Was ist Tree-Operation, was nicht?**

| Aufgabe | Was wird gebraucht? | Komplexität |
|---|---|---|
| Rang von Eva bestimmen | Evas eigenen Subtree (QGV, Bein-Anzahl etc.) | O(Subtree-Größe) |
| Provision aus Annas Order berechnen | Liste der Sponsor-Ränge von Anna aufwärts | O(Tiefe) |

Die Rangbestimmung ist Tree-Operation. Die Provisionsberechnung pro Order ist Linien-Operation.

**Warum ist das wichtig?**

Für die Chart-Aktualisierung (Hero-Zahl, Gesamtprovision pro Jahr) muss die Summe aller Provisionen aller Orders gezeigt werden. Es gibt zwei Wege:

- **Weg 1 (pro-Order-exakt):** Für jede Order im Tree die Upline-Liste extrahieren und durch die Slot-Engine schicken. Bei N=100k Knoten × 12 Monate × ~10 Schritte = 12 Millionen Operationen pro Jahr × 10 Jahre = 120 Millionen. **Tier 4, kein Slider-Tempo.**
- **Weg 2 (algebraisch):** Wenn die Rangverteilung pro Ebene bekannt ist (z.B. „Ebene 4: 30% Bronze, 20% Silber, ..."), kann der Erwartungswert der Slot-Vergabe für eine durchschnittliche Order auf Ebene 0 ausgerechnet werden. Komplexität: O(Ebenen × Ränge) ≈ 120 Operationen. **Tier 1, instant.**

Voraussetzung für Weg 2: Die Rangverteilung pro Ebene kommt aus dem Tree (Rangbestimmung = Tree-Operation, einmal pro Slider-Commit). Aber sobald sie bekannt ist, ist der Chart algebraisch berechenbar — und Slider auf `minActivityVolume` (was nur die Provisions-Raten ändert, nicht den Tree) wird Tier 1.

**Offenes Risiko**

Weg 2 ist Erwartungswert. Er stimmt im Mittel mit Weg 1 überein, aber pro konkreter Order/Linie nicht. Das ist genau das „knotenweise Rückführbarkeit nicht möglich" — vom User bewusst akzeptiert.

Was noch nicht geklärt ist: Stimmt Weg 2 wirklich exakt im Mittel, oder gibt es Korrelationen (z.B. Cluster-Effekte durch Dirichlet-Strategie), die einen systematischen Bias erzeugen? Dieses Risiko wird in Schritt 3 (Bias-Validierung) explizit aufgenommen.

**User-Bestätigung:**
> „Beobachtung 2: korrekt, das ist linear pro knoten."

### 4.5 Finales Parameter-Inventar

#### A. Wachstumsparameter (Strukturwachstum)

| Parameter | Quelle | Slider? | Datenform | Bemerkung |
|---|---|---|---|---|
| `years` | 01, 05 | ja (1-10) | Int | Auch Achse des Jahres-Sliders auf Diagrammen |
| `membersPerYear` | 01, 05 | ja, Bruchwerte | Float | Slider-relevant; Apportioning nötig |
| `duplicationRate` | 01 | ja (0-1) | Float | Anteil aktiver (werbender) Member |
| `shoppersPerYear` | 05 | ja, Bruchwerte | Float | Pro Member, pro Jahr |
| `churnRate` | 05 | ja (0-1) | Float | Eine UI-Achse; Höhe wird hier eingestellt |
| `maxDirectMembersPerMember` | 01 (impl.) | nein | Int | Strukturgrenze, derzeit unbegrenzt |
| `seed` | 05 | nein | Int | Reproduzierbarkeit |
| `growthDistribution` | Netzwerk-Mod. (impl.) | ja (Picker) | Enum | standard / dirichlet / momentum / lifecycle (später); regelt **Verteilung** von Wachstum und Churn |
| Reattachment-Regel | 01 §6.2 | nein, fix | Konstante | Kinder rücken zu Großeltern |
| Churn-Zeitpunkt | 01 §6.1 | nein, fix | Konstante | Nach Wachstum |
| Carry-over-Logik (F1a) | 01 §4.5 | nein, fix | Algorithmus | Member erscheint erst bei ≥1,0 |

#### B. Volumen-/Pro-Knoten-Parameter

| Parameter | Quelle | Slider? | Datenform | Bemerkung |
|---|---|---|---|---|
| `minActivityVolume` | 05 (vereint) | ja | Float (IP) | 45 IP. Gilt für Member und Shopper gleich. Knoten unter dieser Schwelle existieren nicht im Modell. |
| `ownVolume[node]` | 05 | abgeleitet | Float[] | Pro Knoten, aus Aktivität × minActivityVolume |
| `shopperCount[node]` | 05 | abgeleitet | Float[] | Pro Member als Aggregat (Shopper kein eigener Knoten) |
| `shopperVolume[node]` | 05 | abgeleitet | Float[] | shopperCount × minActivityVolume |
| `personalVolume[node]` | 05 | abgeleitet | Float[] | ownVolume + shopperVolume |
| `groupVolume[node]` | 05 | abgeleitet | Float[] | Subtree-Summe (bottom-up) |
| `qualifyingGroupVolume[node]` | 05 | abgeleitet | Float[] | Eigene Spalte, weil später Kompressionsregeln greifen |

#### C. Vergütungsparameter (LifePlus-Plan)

| Parameter | Quelle | Slider? | Datenform | Bemerkung |
|---|---|---|---|---|
| `rank[node]` | Netzwerk-Mod. | abgeleitet | Enum | Believer / Builder / Bronze / Silber / Gold / Diamant / 1*-7*-Diamant |
| Phase-1-Raten (Shopper) | Netzwerk-Mod. | nein | Plan-Konfig | 25/10/5 % auf Ebene 1/2/3 |
| Phase-1-Raten (Member ≤150 IP) | Netzwerk-Mod. | nein | Plan-Konfig | 5/25/10 % |
| Phase-1-Raten (Member ≥151 IP) | Netzwerk-Mod. | nein | Plan-Konfig | 10/5/5 % |
| Phase-1-Kompression | Netzwerk-Mod. | nein | Plan-Regel | Stück geht zu nächster qualifizierter Upline |
| Phase-2-Slots | Netzwerk-Mod. | nein | Plan-Konfig | Bronze/Silber/Gold/Diamant je 3 %, chronologisch ab Ebene 4 |
| Phase-3-Slots | Netzwerk-Mod. | nein | Plan-Konfig | 1*-Dia 3 %, 2*-Dia 3 %, 3*-Dia 2 % |
| Ein-Phase-Regel | Netzwerk-Mod. | nein | Plan-Regel | Person nicht doppelt P2+P3 pro Order |
| Order (`personId`, `kind`, `ip`) | Netzwerk-Mod. | nein | Pro Order | shopper / member_order; jede Order erzeugt eigene Slot-Vergabe |

#### D. UI / Anzeige

| Parameter | Quelle | Slider? | Datenform | Bemerkung |
|---|---|---|---|---|
| Jahres-Slider (auf Diagramm) | Klärung Schritt 2 | ja (1-10) | Int | Arbeitet auf vorberechnetem Snapshot pro Jahr (Variante B); Slider-Latenz Kriterium #2 gilt nicht; Kriterium #10 gilt |
| `highlightFromRank` (Diagramm-Filter) | Klärung Schritt 2 | ja | Enum | „Ab Status X farbig, Rest ausgegraut" — reines Render-Setting auf fertigem Snapshot |
| Modus-Anzeige (Exakt / Geschätzt / Gecappt) | 07 | nein, abgeleitet | Enum | UX-Hinweis bei Cap-Wechsel |
| Hero-Zahl / Chart / Goals | (Hauptanzeige) | abgeleitet | Skalar pro Jahr | **Aggregierbar — entscheidend für Kriterium #2** |

#### E. Performance / Caps

| Parameter | Quelle | Slider? | Datenform | Bemerkung |
|---|---|---|---|---|
| `MAX_EXACT_MEMBERS` | 07 | nein | Konstante | 100k empfohlen |
| `WARN_EXACT_MEMBERS` | 07 | nein | Konstante | 75k |
| `WORKER_THRESHOLD_MEMBERS` | 07 | nein | Konstante | 25k |
| `MAX_DISPLAY_MONTHLY_EUR` | 07 | nein | Konstante | 500k EUR/Monat |

Alle Caps werden an **einer Stelle im Code** gepflegt (z.B. `packages/simulator-core/src/config/limits.ts`). Keine externe Konfigurationsdatei, weil null Performance-Gewinn.

### 4.6 Abgelegte / fixierte Punkte

Folgende ursprünglich offene Punkte sind durch die Diskussion entschieden:

| Frage | Status | Ergebnis |
|---|---|---|
| Multi-Brand-Strategie | fixiert | Audit-Scope = lifeflow360 (LifePlus); andere Brands = anderer Code |
| Aktivitäts-Achse | fixiert | Nur Werbeaktivität (`duplicationRate`); Umsatzaktivität ist Eintrittsbedingung |
| min*Volume separat oder gemeinsam | fixiert | Ein Slider, `minActivityVolume` |
| Jahres-Slider Variante | fixiert | Variante B (progressiv) |
| Churn-Ziel | fixiert | Folgt `growthDistribution`-Strategie, keine eigene Achse |
| Filter „ab Status X" | fixiert | Nur Diagramm, „ab Rang colored, Rest ausgegraut" |
| Caps-Speicherort | fixiert | Eine Code-Konstanten-Datei |

### 4.7 Beobachtungen aus dem Inventar

Drei strukturelle Befunde, die in Schritt 3 und 4 relevant werden:

**(B1) Aggregierbarkeit der Slider-Outputs.** Alle Größen, die im Chart, in der Hero-Zahl und bei Goals erscheinen, lassen sich als Skalar pro Jahr abbilden: Member-Anzahl, Shopper-Anzahl, Personalvolumen-Summe, Provisions-Summe Phase 1+2+3. Das ist ein algebraischer Befund — er gilt unabhängig von der gewählten Architektur. Die Größen *können* aus einem Aggregat-Pfad kommen.

**(B2) Per-Knoten-Daten sind nur für Phase 2/3 und Diagramme nötig — und auch dort nur linear.** Bestätigt durch User. Phase 1, Phase 2, Phase 3 brauchen pro Order nur die Upline-Sequenz, nicht den ganzen Baum. Was wirklich Tree-Struktur braucht, ist die Bottom-up-Rang-Bestimmung und die Diagramm-Visualisierung.

**(B3) Offene Spec-Punkte.** Drei Stellen sind unabhängig von der Architektur noch nicht final entschieden:

- Mindest-Aktivität je Status (Schwellen aus LifePlus-Plan) — Schritt 5 in Dok 05 als TODO; nicht im Audit-Scope, aber sollte vor Schritt-4-Implementierung geklärt werden.
- Wie inaktive Member mit Shoppern behandelt werden (Dok 05 §13.8).
- Wie Komprimierung bei höheren Rängen exakt verläuft.

Diese Punkte werden in Schritt 4 *nicht* gegen die Lösungen gemessen, sondern als Spec-Klärung markiert, die jede Lösung gleichermaßen trifft.

---

## 5. Schritt 3 — Single-Source-of-Truth aufdröseln

### 5.1 Ziel

Pro Datenklasse aus dem Inventar entscheiden, welche **synchron** sein muss, welche **statistisch konsistent** sein darf, welche **unabhängig** ist. Daraus ergeben sich die Synchronisations-Anforderungen, gegen die in Schritt 4 die Lösungen geprüft werden.

### 5.2 Sechs Datenklassen

**Klasse 1 — Slider-Inputs (Quelle)**

Alle direkt vom User steuerbaren Parameter:
`years, membersPerYear, duplicationRate, shoppersPerYear, churnRate, minActivityVolume, seed, growthDistribution`

Plus eine abgeleitete Funktion:
`growthAllocator(strategy, seed) → Verteilungsfunktion pro Werber`

**Klasse 2 — Tree-Struktur (pro Jahr)**

Die konkrete Realisierung des Netzwerks: `nodes[], parentIds[], yearOfBirth[], isActive[]`.

**Klasse 3 — Aggregat-Statistiken (pro Jahr)**

Verteilungen pro Ebene: `membersByLevel[], activeByLevel[], rankDistributionByLevel[]`.

**Klasse 4 — Chart-Skalare**

Alles, was bei Slider-Drag aktualisiert wird: `heroNumber, chartLine[], goalStatus, provisionPerYear`.

**Klasse 5 — Diagramm-Daten**

Personenbaum, Sunburst, Netzwerk-Visualisierung — plus Render-Settings wie `highlightFromRank`.

**Klasse 6 — Provisions-Daten**

Provision pro Order, pro Knoten, pro Ebene, pro Jahr.

### 5.3 Synchronisations-Matrix

| Datenklasse | Muss synchron mit | Darf abweichen von | Update-Frequenz |
|---|---|---|---|
| 1 Slider-Inputs | — *(Quelle)* | — | bei Slider-Event |
| 2 Tree-Struktur | 1 *(gleicher Snapshot)* | 3 *(Tree=Sample, Aggregat=Erwartungswert)* | bei Slider-**Commit** |
| 3 Aggregat-Statistiken | 1 *(gleicher Snapshot)* | 2 *(im konkreten Sample)* | bei Slider-**Drag** |
| 4 Chart-Skalare | 3 *(streng)* | 5 *(im konkreten Diagramm)* | bei Slider-**Drag** |
| 5 Diagramm-Daten | 2 *(streng)* | 4 *(im Erwartungswert)* | bei Wechsel zur Vis-Ansicht |
| 6 Provisionen Chart | 3 *(streng)* | 6 Diagramm *(im Mittel)* | bei Slider-**Drag** |
| 6 Provisionen Diagramm | 2 *(streng)* | 6 Chart *(im Mittel)* | beim Diagramm-Aufbau |

**Lesart:** Klasse 4 (Chart-Zahlen) muss exakt aus Klasse 3 (Aggregat) folgen, darf aber von Klasse 5 (konkretes Diagramm) abweichen. Klasse 5 muss exakt aus Klasse 2 (Tree) folgen. Klasse 3 und Klasse 2 dürfen voneinander abweichen — sie stehen zueinander wie Erwartungswert zu Realisierung.

**Das ist die formale Definition der Two-Path-Architektur.**

### 5.4 Drei Härtestufen

#### Stufe A — Hart synchron

Diese Beziehungen dürfen nie auseinanderlaufen, sonst lügt die App:

- **Slider-Inputs → alle abgeleiteten Daten:** jeder Pfad rechnet vom gleichen Parameter-Snapshot. Wenn der User einen Slider bewegt, müssen alle laufenden Berechnungen entweder zu Ende laufen oder abgebrochen werden, bevor ein neuer Snapshot beginnt.
- **Tree-Struktur → Diagramm:** was im Sunburst angezeigt wird, ist exakt der Tree dieses Snapshots. Kein „veralteter" Diagramm-Stand neben aktuellem Slider.
- **Aggregat → Chart-Skalare:** die Hero-Zahl ist eine deterministische Funktion der Aggregat-Werte.
- **Pro Order: Upline → Slot-Vergabe:** Phase 1/2/3 für eine konkrete Order folgt nur ihrer eigenen Upline. Das ist Beobachtung B2.

#### Stufe B — Statistisch konsistent

Diese Beziehungen müssen im Mittel stimmen, dürfen aber pro Sample abweichen:

- **Tree-Sample ↔ Aggregat-Erwartungswert** für Wachstumszahlen:
  - Bei `standard`-Strategie: deterministisch gleich (Erwartungswert = Realisierung, keine Streuung).
  - Bei `dirichlet`/`momentum`: gleich im Mittel ±Streuung. Die Streuung pro Ebene ist im Tree höher als im Aggregat.
- **Chart-Provision ↔ Diagramm-Provision:**
  - Phase 1 (Unilevel, keine Rangbedingungen): exakt im Mittel, keine Bias-Quelle.
  - Phase 2/3 (Slot-Vergabe mit Rangbedingungen): systematischer Bias möglich. Grund: Slot-Vergabe ist nicht-linear (`min(verfügbar, qualifiziert)`), Jensen-Ungleichung greift. Wenn auf Ebene 5 im Aggregat 3,2 Diamond-Knoten erwartet werden, im Tree-Sample aber 0 oder 5 — die Aggregat-Erwartungswert-Rechnung trifft nicht zwingend den Tree-Durchschnitt.

#### Stufe C — Unabhängig

- **`highlightFromRank` (Diagramm-Filter):** reines DOM-Styling auf fertigem Diagramm-Snapshot. Tier 1, keine Synchronisation nötig.
- **Jahres-Slider auf Diagramm:** schaltet zwischen vorberechneten Snapshots in Klasse 5. Hat keine Wirkung auf Klassen 1-4.
- **`growthDistribution`-Wahl:** ändert Klasse 2 (Tree) und damit Klasse 5/6-Diagramm. Klasse 3 (Aggregat) ist **strategie-invariant** — Erwartungswert ändert sich nicht durch Dirichlet vs. standard.

### 5.5 Mechanische Sicherstellung

Aus den Härtestufen ergeben sich drei harte Anforderungen an jede Lösung:

**(M1) Snapshot-Konsistenz.** Ein Slider-Commit erzeugt einen versiegelten Parameter-Snapshot mit ID. Alle abgeleiteten Berechnungen tragen diese ID. Die UI rendert nur Daten mit der jüngsten ID.

```
type ParameterSnapshot = {
  snapshotId: number;
  years: number;
  membersPerYear: number;
  duplicationRate: number;
  shoppersPerYear: number;
  churnRate: number;
  minActivityVolume: number;
  seed: number;
  growthDistribution: GrowthStrategy;
};
```

Aus dem laufenden Worker kommen Ergebnisse mit `{ snapshotId, payload }`. Nur Payloads mit aktuellem `snapshotId` werden in den Render-State übernommen.

**(M2) Pfad-Trennung.** Klasse-3-Pfad (Aggregat → Chart) und Klasse-2-Pfad (Tree → Diagramm) sind unabhängig berechenbar. Sie teilen sich Klasse 1 (Inputs), aber sonst nichts. Tree-Berechnung darf Chart nicht blockieren.

```
                    ┌─────────────────────────────┐
ParameterSnapshot ─►│ Aggregat-Pfad (Klasse 3)    │─► Chart, Hero, Goals
                    │ • estimateNetwork           │
                    │ • aggregateRankDistribution │
                    │ • expectedProvision         │
                    │ → Tier 1 (<16 ms)           │
                    └─────────────────────────────┘

                    ┌─────────────────────────────┐
ParameterSnapshot ─►│ Tree-Pfad (Klasse 2/5/6)    │─► Diagramme
                    │ • buildTree                 │
                    │ • computeRanks              │
                    │ • computeOrderProvisions    │
                    │ → Tier 4, Worker, progressiv│
                    └─────────────────────────────┘
```

**(M3) Konsistenz-Check.** Nach Tree-Aufbau muss verifizierbar sein, dass das Tree-Sample im Mittel mit Aggregat übereinstimmt:

```
assert |aggregateMembers(year) − sum(tree.members(year))| < ε
```

Bei `standard`-Strategie: ε = 0 (deterministisch gleich). Bei `dirichlet`/`momentum`: ε = relative Streuung der Strategie, typischerweise <5% relative Abweichung pro Ebene.

**Status hart/weich:** Offene Frage. Vorschlag: hart in Dev-Build, weich in Production (Logging, kein Crash).

### 5.6 Bias-Risiko bei Phase 2/3

Das größte offene Risiko aus der SSOT-Analyse: Bei nicht-linearen Slot-Vergaben (Phase 2/3) ist nicht garantiert, dass Aggregat-Erwartungswert und Tree-Mittelwert übereinstimmen.

**Mechanismus des Bias:**

Slot-Vergabe ist Sättigung. Wenn pro Order vier Diamant-Slots vorhanden sind und im Tree-Sample auf einer bestimmten Ebene 0 oder 5 Diamond-Knoten existieren, ergibt die Aggregat-Rechnung mit „3,2 erwartete Diamond-Knoten" einen Provisionsbetrag, der nicht dem Tree-Sample-Durchschnitt entspricht — weil 0 oder 5 unterschiedlich viele Slots wirklich auffüllen.

**Konkretes Risiko-Spektrum:**

- Drift <5%: Stufe 4 in Kriterium #3 ist erreichbar — Two-Path funktioniert wie geplant.
- Drift 5-20%: muss im UI als „ungefähr"-Range angezeigt werden (Stufe 3 in #3).
- Drift >20%: Aggregat-Pfad für Provisionen ist nicht tragfähig; Chart-Provision muss aus Tree gezogen werden, was den Slider-Pfad bremst.

**Was getan werden muss:**

Diese Frage kann nicht aus den Dokumenten beantwortet werden. Sie muss durch ein **Mini-Experiment** geklärt werden:

- Zwei Implementierungen parallel (Aggregat-Provision vs. Tree-summierte Provision)
- Vergleich der Summen für N=10k und N=100k bei `dirichlet`-Strategie
- Drift-Messung pro Phase (1, 2, 3 separat)

Das ist nicht Teil des Audits, sondern eine punktuelle Validierung vor der Entscheidung für die finale Architektur.

**Konsequenz für Schritt 4:**

Lösungen werden mit der Annahme bewertet, dass der Bias <5% bleibt. Falls eine Lösung diese Annahme nicht aushalten würde (z.B. keine pro-Order-Provisionsberechnung im Tree-Pfad anbietet), kommt das als Schwäche in die Matrix.

### 5.7 Architektur-Anforderungen — Tabelle

Aus Schritt 3 ergeben sich folgende harte Anforderungen an jede Lösung:

| Anforderung | Quelle | Begründung |
|---|---|---|
| Versionierte Snapshot-ID für jeden Parameter-Commit | M1 | Verhindert Anzeige veralteter Daten neben aktuellen Slidern |
| Aggregat-Pfad und Tree-Pfad als unabhängige Berechnungen | M2 | Two-Path-Architektur; Tree darf Slider nicht bremsen |
| Konsistenz-Assertion zwischen beiden Pfaden bei `standard`-Strategie | M3 | Mindestens deterministische Strategie muss bitidentisch sein |
| Vorberechnete Per-Jahr-Snapshots für Diagramm-Jahres-Slider | Variante B | UX: Jahres-Slider <16ms |
| Tree wird nur bei Slider-**Commit** gebaut, nie bei Slider-Drag | Klasse 2 Update-Frequenz | Slider darf nicht durch Tree-Build geblockt werden |
| Aggregat-Berechnung muss Tier 1 (<16ms) für Default-Szenario sein | Kriterium #2 | Hero/Chart/Goals während Drag |
| Tree-Aufbau muss progressiv pro Jahr funktionieren | Variante B + Kriterium #10 | User sieht Jahr 1 bevor Jahr 10 fertig ist |
| Bias-Validierung bei `dirichlet`/`momentum` als Test | M3 + Kriterium #3 | Statistische Konsistenz <5% muss messbar sein |
| Caps an einer Code-Stelle | User-Klärung | Pflegbarkeit, kein Konfigurations-Overhead |

### 5.8 Strategie-Invarianz von Klasse 3 (Aggregat) — eine Konsequenz

Aus Stufe C (Klasse 3 ist strategie-invariant) folgt eine interessante UX-Konsequenz:

> Wenn der User die Strategie von `standard` auf `dirichlet` umstellt, ändern sich Chart-Skalare **nicht**, nur das Diagramm.

Das ist mathematisch korrekt: der Erwartungswert ist strategie-invariant. Aber UX-seitig könnte das überraschen — der User stellt eine Strategie um und sieht im Chart keine Änderung.

Es gibt zwei Optionen:

- **Option 1 (strategie-invariant):** Chart zeigt Erwartungswert, ist robust gegen Strategie-Wechsel. UX-Hinweis: „Die Strategie beeinflusst die Verteilung im Diagramm, nicht die Erwartungswerte im Chart."
- **Option 2 (strategie-spezifisch):** Aggregat-Berechnung wird strategie-spezifisch — komplexer, aber Chart und Diagramm bewegen sich konsistent.

Option 1 ist einfacher und korrekt; Option 2 ist konsistenter in der UX. Diese Entscheidung ist eine offene Frage vor Schritt 4.

---

## 6. Offene Fragen vor Schritt 4

Drei Punkte sind explizit offen und müssen vor der Lösungsmatrix entschieden sein:

### 6.1 Bias-Annahme

Soll in Schritt 4 als Annahme gesetzt werden, dass der Bias zwischen Aggregat- und Tree-Provision <5% bleibt (Validierung später durch Experiment), oder soll der Bias als variable Größe in die Lösungsbewertung einfließen?

- **Annahme <5%:** Schritt 4 wird klarer, weil alle Lösungen unter gleicher Voraussetzung bewertet werden. Risiko: Wenn das Experiment später zeigt, dass Bias >5%, muss Schritt 4 teilweise wiederholt werden.
- **Bias als Variable:** Schritt 4 enthält pro Lösung eine Bias-Sensitivität — komplexer, aber robuster.

### 6.2 Strategie-Invarianz von Aggregat (siehe 5.8)

Option 1 (strategie-invariant, einfacher) oder Option 2 (strategie-spezifisch, konsistenter)?

### 6.3 M3 hart oder weich

Soll die Konsistenz-Assertion zwischen Aggregat und Tree im Release-Build aktiv sein (kostet Laufzeit, schützt vor Drift) oder nur in Tests (kein Schutz vor Produktions-Drift)?

---

## 7. Glossar

| Begriff | Bedeutung |
|---|---|
| **Aggregat-Pfad** | Berechnungspfad, der Chart-Skalare aus Verteilungsstatistiken pro Ebene direkt ableitet, ohne den Tree zu materialisieren. Tier 1, Slider-tauglich. |
| **Apportioning** | Deterministisches Verfahren, gebrochene Slider-Werte (z.B. 2,5 Member/Jahr) in ganze Personen umzuwandeln, ohne den Erwartungswert zu verfälschen. Siehe Dok 05 Vorschlag B. |
| **B (Variante)** | Progressiver Diagramm-Aufbau: Jahr 1 sofort sichtbar, weitere Jahre streamen nach. Standard für Jahres-Slider auf Diagramm. |
| **Carry-over (F1a)** | Restwert pro Knoten wird ins Folgejahr übertragen; Member erscheint erst, wenn der akkumulierte Fortschritt ≥1,0 ist. Aus Erarbeitung 01. |
| **CompensationPlan** | Daten-Struktur, die LifePlus-Phase-1/2/3-Regeln beschreibt; austauschbar pro Brand. |
| **Drift (im Audit-Kontext)** | Beobachtetes Phänomen, dass Bewertungen über Sessions hinweg ihre Position ändern, ohne dass die zu bewertenden Fakten sich verändert haben. Anlass für diesen Audit. |
| **Ein-Phase-Regel** | LifePlus-Regel: Eine Person kann für dieselbe Order nicht gleichzeitig aus Phase 2 und Phase 3 bezahlt werden. |
| **growthDistribution / Reality-Strategie** | Verteilung der Werbe-Erfolge (und damit auch des Churns) pro werbender Person. Werte: `standard / dirichlet / momentum / lifecycle`. |
| **Hero-Zahl** | Die zentrale große Zahl in der Chart-Ansicht (z.B. „Provisionseinkommen Jahr 10"); muss bei Slider-Drag in <16ms reagieren. |
| **Jensen-Ungleichung** | Mathematischer Effekt bei nicht-linearen Funktionen: Erwartungswert der Funktion ≠ Funktion des Erwartungswerts. Quelle des Bias-Risikos bei Phase 2/3. |
| **Lineage / Linien-Operation** | Algorithmus, der nur die Upline-Sequenz einer Order verarbeitet (O(Tiefe)), nicht den ganzen Baum. Beobachtung B2. |
| **M1 / M2 / M3** | Drei mechanische Anforderungen aus Schritt 3: Snapshot-Konsistenz, Pfad-Trennung, Konsistenz-Check. |
| **minActivityVolume** | 45 IP. Mindest-Umsatz pro Knoten. Knoten unter dieser Schwelle existieren nicht im Modell. |
| **Phase-1-Kompression** | Wenn eine Person in Phase 1 nicht qualifiziert ist, geht ihr Stück zur nächsten qualifizierten Upline. |
| **Slider-Commit** | Ende einer Slider-Bewegung (z.B. mouseup); löst teure Berechnungen aus. Im Gegensatz zu Slider-Drag (jede Bewegung). |
| **Snapshot Stream** | Pro-Jahr-Caching von Tree und abgeleiteten Daten. Macht Jahres-Slider 1→10 instant. Aus dynamik-Dok §4.2. |
| **SoA (Structure of Arrays)** | Datenlayout: separate typisierte Arrays für jedes Knoten-Attribut. Cache-freundlicher, transferierbar via Transferable an Worker. Aus Dok 05. |
| **Tier 1/2/3/4** | Latenz-Klassen für UX. Tier 1 = <16ms, Tier 4 = >50ms. Definitionen aus dynamik-Dok §3. |
| **Two-Path-Architektur** | Aggregat-Pfad für Chart (Slider-Drag), Tree-Pfad für Diagramme (Slider-Commit, on-demand). Vom User explizit zugelassen, indem „Single Source of Truth" als Dogma aufgegeben wurde. |
| **Werbeaktivität** | Anteil der Knoten, die neue Member werben (gesteuert über `duplicationRate`). Im Modell die einzige Aktivitäts-Achse, weil Umsatz-Aktivität (≥45 IP) als Eintrittsbedingung gilt. |

---

## Anhang — Diskussionschronologie (gerafft)

Zur Nachverfolgung: die wichtigsten Entscheidungspunkte in chronologischer Reihenfolge.

1. Anlass-Anerkennung — Drift im bisherigen Review-Prozess bestätigt, 5-Schritt-Audit beschlossen.
2. Material-Sichtung — Netzwerk-Modellierung.md gelesen (LifePlus-Vergütungslogik); Reviews 03/06 für Schritt 4 reserviert.
3. **Schritt 1 — Bewertungsraster.**
   3.1. Initialer Vorschlag: 9 Kriterien, Skalen 1-5, Test-Szenarien.
   3.2. User-Klarstellung: Latenz nur Chart/Hero/Goals; knotenweise Rückführbarkeit unmöglich; Erweiterbarkeit auf andere Pläne minimal.
   3.3. Two-Path-Architektur faktisch zugelassen.
   3.4. Kriterium #10 (Diagramm-Pfad) ergänzt.
   3.5. Mindest-Schwellen und KO-Regel finalisiert.
4. **Schritt 2 — Parameter-Inventar.**
   4.1. Initial fünf Gruppen + drei Beobachtungen.
   4.2. User-Klarstellung: min*Volume = ein Slider; Brand = lifeflow360 only; Caps zentral; Aktivität entwirrt.
   4.3. Wachstums-/Churn-Verteilung als fehlender Parameter ergänzt: standard/dirichlet/momentum/lifecycle.
   4.4. Filter „ab Status X" → Diagramm-only.
   4.5. Jahres-Slider Variante B (progressiv) als Standard fixiert.
   4.6. Beobachtung B2 (Phase 1/2/3 = Linien-Operation) auf User-Bitte hin im Detail erklärt und vom User bestätigt.
5. **Schritt 3 — SSOT aufdröseln.**
   5.1. Sechs Datenklassen definiert.
   5.2. Synchronisations-Matrix erstellt → Two-Path-Architektur formal definiert.
   5.3. Drei Härtestufen A/B/C dokumentiert.
   5.4. M1/M2/M3 als harte Anforderungen formuliert.
   5.5. Bias-Risiko bei Phase 2/3 als offenes Validierungs-Risiko markiert (Mini-Experiment vor Schritt 4 vorgeschlagen).
   5.6. Drei offene Fragen für Schritt 4 dokumentiert (Bias-Annahme, Strategie-Invarianz, M3 hart/weich).

**Stand am Ende dieses Dokuments:** Bewertungsbasis steht. Schritt 4 (Lösungsmatrix gegen das Raster) wartet auf Entscheidungen zu den drei offenen Fragen in Kapitel 6.
