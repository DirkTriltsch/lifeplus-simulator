# Website Marketing and Legal Review v1 — Korrekturen

Begleitdatei zu [Website Marketing and Legal Review v1.md](Website%20Marketing%20and%20Legal%20Review%20v1.md). Enthält ausformulierte Korrektur-Vorschläge zu den dort identifizierten Befunden.

---

## zu R-01 — FAQ-Antwort „Sind die Zahlen wirklich realistisch — oder Marketing?"

**Quelle:** [IndexPageDefault.astro:406-407](website-astro/src/shared/components/sections/IndexPageDefault.astro#L406-L407)
**Legal-Befund:** R-01 (rot) — konkrete Einkommensangaben „€4.000–€10.000/Monat" mit Suggestion typischer Erreichbarkeit. UWG §5 (Irreführung) und §16 Abs. 2 (Schneeball) relevant.

**Inhaltliche Vorgaben aus User-Briefing:**
- Tool berechnet Eingaben entsprechend dem Vergütungsplan
- Mathematisch korrekt
- Simulator macht Wachstum im Netzwerk und den Effekt der Zeit sichtbar
- Unrealistische Eingaben zeigen hohe Werte
- Realitätsnahe Eingaben und Steuergrößen wie Duplikations- und Fluktuationsrate helfen, realitätsnahe Ausgaben zu berechnen
- Ziel: den Effekt von Zeit und Wachstum im Netzwerk sichtbar und verständlich machen

---

### Variante A — Ausführlich (empfohlen, ~180 Wörter)

> Realistisch heißt: **realistisch für deine Eingaben.**
>
> Der Simulator rechnet mathematisch exakt nach dem offiziellen Vergütungsplan — keine geschönten Zahlen, keine versteckte Optimierung. Fünf Slider, zehn Jahre, jede Bewegung sofort neu berechnet.
>
> Setzt du extreme Werte (100 % Duplikation, 0 % Fluktuation), kommt eine Milliarden-Zahl heraus — mathematisch korrekt, praktisch unmöglich. Setzt du Steuergrößen wie Duplikations- und Fluktuationsrate, die zu deinem Markt und deiner Erfahrung passen, biegt sich die Kurve deutlich flacher und nachvollziehbarer.
>
> Genau dazu ist der Simulator gebaut: **den Effekt von Zeit und Wachstum im Netzwerk sichtbar und verständlich zu machen.** Welche konkreten Ergebnisse sich für dich ergeben, hängt von deinem Markt, deinem Einsatz und vielen weiteren Faktoren ab — wie in jedem unternehmerischen Aufbau.
>
> Der Simulator lügt nicht. Er rechnet exakt das, was du eingibst — und macht so etwas greifbar, das in Tabellen und Folien meist abstrakt bleibt.

---

### Variante B — Mittel (~110 Wörter)

> Realistisch heißt: **realistisch für deine Eingaben.**
>
> Der Simulator rechnet mathematisch exakt nach dem offiziellen Vergütungsplan. Setzt du extreme Werte (100 % Duplikation, 0 % Fluktuation), kommt eine Milliarden-Zahl heraus — mathematisch korrekt, praktisch unmöglich. Setzt du Steuergrößen wie Duplikations- und Fluktuationsrate, die zu deinem Markt passen, wird die Kurve nachvollziehbar.
>
> Welche konkreten Ergebnisse sich für dich ergeben, hängt von deinem Markt, deinem Einsatz und vielen weiteren Faktoren ab — wie in jedem unternehmerischen Aufbau. Was der Simulator leistet: Er macht **den Effekt von Zeit und Wachstum im Netzwerk sichtbar** — etwas, das in Tabellen und Folien meist abstrakt bleibt.

---

### Variante C — Knapp (~70 Wörter)

> Der Simulator rechnet **mathematisch exakt nach dem offiziellen Vergütungsplan** — keine geschönten Zahlen. Extreme Eingaben ergeben extreme Zahlen (mathematisch korrekt, praktisch unmöglich). Realitätsnahe Steuergrößen für Duplikation und Fluktuation ergeben nachvollziehbare Kurven.
>
> Welche Ergebnisse sich konkret für dich ergeben, hängt von deinem Markt und Einsatz ab. Ziel des Simulators ist nicht das Versprechen, sondern: **den Effekt von Zeit und Wachstum im Netzwerk sichtbar machen.**

---

### Bilanz

**Marketing:**
- Behält die rhetorische Pointe des Originals („Simulator lügt nicht / rechnet exakt das, was du eingibst")
- Stärkt das Tool-Vertrauen über mathematische Korrektheit + offiziellen Vergütungsplan
- Schließt mit einem positiven Wertversprechen („greifbar machen, was abstrakt bleibt") — aktiviert weiter Richtung Simulator-Start
- „wie in jedem unternehmerischen Aufbau" adressiert Sponsoren als Unternehmer auf Augenhöhe — kein verzärtelter Disclaimer

**Legal:**
- ✅ Keine konkreten Eurobeträge mehr (war Legal R-01 Hauptpunkt)
- ✅ Keine Typizitätsbehauptung („engagierter Sponsor erreicht X")
- ✅ Klarer Sponsor-=-Unternehmer-Hinweis („unternehmerischer Aufbau") → §16 UWG-Schneeball-Verdacht wird entkräftet
- ✅ „Faktoren-Disclaimer" („Markt, Einsatz, weitere Faktoren") DSGVO-/UWG-konform
- ✅ Tool-Zweck wird als „Sichtbarmachen", nicht „Versprechen", positioniert

---

### Umsetzung

Die gewählte Variante ersetzt in [IndexPageDefault.astro:406-407](website-astro/src/shared/components/sections/IndexPageDefault.astro#L406-L407) den aktuellen `<p>`-Block der ersten FAQ-Antwort.

**Empfehlung:** Variante A für die Index-FAQ (steht standardmäßig offen → braucht inhaltliche Substanz). Variante B/C als Fallback, falls aus Layout-Gründen knapper formuliert werden soll.

---

## zu R-02 — Hero-Mockup: Provisions-Zahl im Product-Frame

**Quelle:** [IndexPageDefault.astro:64-71, 113-114](website-astro/src/shared/components/sections/IndexPageDefault.astro#L64-L71)
**Legal-Befund:** R-02 (rot) — konkrete Eurozahl „€8.420/Mon" im Hero über der Faltlinie, ohne klare Beispiel-Kennzeichnung. §5 UWG / §5a UWG (Irreführung durch Unterlassen wesentlicher Informationen).

**Inhaltliche Vorgaben aus User-Briefing:**
- „Provision · Jahr 10 · pro Monat" auf **„Provision · Jahr 10"** kürzen
- Für „8.420" zwei Varianten prüfen:
  - (a) Zahl bleibt — mit klarer Beispiel-Kennzeichnung
  - (b) Zahl wird Platzhalter „?.???"
- „Realistisch · 30% Dup · 20% Fluk" ersetzen durch **„Beispiel: 30% Duplikation · 20% Fluktuation"**
- Das Bild + die Zahl sollen zwei Dinge kommunizieren:
  1. Es gibt eine **Hero-Zahl**, die **live** berechnet wird — je nach den eingestellten Annahmen
  2. Der Nutzer hat **5 Slider**, mit denen er Annahmen ändert und die Hero-Zahl live verändert
- Die 5 Slider sind **nur ein ausgewählter Teil** der Annahmen für die Simulation — das gesamte Modell beruht auf weiteren Annahmen

---

### Aktuell vs. Vorschläge — Übersicht

| Element | Aktuell | Variante X (Zahl bleibt) | Variante Y (Platzhalter) |
|---|---|---|---|
| **pf-hero-num-label** | „Provision · Jahr 10 · pro Monat" | „Beispiel-Rechnung · Provision Jahr 10" | „Provision · Jahr 10" |
| **pf-hero-num** | „€8.420 /Mon" | „€8.420 /Mon" | „€?.??? /Mon" |
| **pf-hero-delta** | „Realistisch · 30% Dup · 20% Fluk" | „Beispiel: 30% Duplikation · 20% Fluktuation" | „Beispiel: 30% Duplikation · 20% Fluktuation" |
| **a1 (Annotation rechts)** | „Hero-Zahl · live" | „Live · ändert sich mit jedem Slider" | „Live · sobald du Slider bewegst" |
| **a2 (Annotation links)** | „5 Slider" | „5 Slider · Teil vieler Modell-Annahmen" | „5 Slider · Teil vieler Modell-Annahmen" |

---

### Variante X — Zahl bleibt mit Beispiel-Kennzeichnung (visuell stärker)

**Inhalt:**
- **Label:** „Beispiel-Rechnung · Provision Jahr 10"
- **Hero-Zahl:** „€8.420 /Mon" (visuell wie bisher)
- **Delta unter Zahl:** „Beispiel: 30% Duplikation · 20% Fluktuation"
- **Annotation a1 (rechts):** „Live · ändert sich mit jedem Slider"
- **Annotation a2 (links):** „5 Slider · Teil vieler Modell-Annahmen"

**Wirkung:**
- „Beispiel-Rechnung" steht **über** der Hero-Zahl — der Disclaimer ist die erste Information, die der Nutzer liest, bevor er die Zahl sieht.
- „Beispiel" wird im Delta-Untertitel ein zweites Mal aufgegriffen — doppelte Verankerung.
- a1 erklärt die **Live-Eigenschaft** der Zahl (Kommunikationsziel 1).
- a2 erklärt **5 Slider als ausgewählter Teil** der Annahmen — direktes Aufgreifen der User-Vorgabe „nur ein ausgewählter Teil".

---

### Variante Y — Platzhalter „?.???" (visuell ruhiger, juristisch sichersten)

**Inhalt:**
- **Label:** „Provision · Jahr 10"
- **Hero-Zahl:** „€?.??? /Mon"
- **Delta unter Zahl:** „Beispiel: 30% Duplikation · 20% Fluktuation"
- **Annotation a1 (rechts):** „Live · sobald du Slider bewegst"
- **Annotation a2 (links):** „5 Slider · Teil vieler Modell-Annahmen"

**Wirkung:**
- Hero-Zahl als Platzhalter visualisiert direkt **„hier entsteht deine Zahl"** — Aufforderung zum Selbstausprobieren.
- a1 verspricht: Sobald du Slider bewegst, wird der Platzhalter zur echten Zahl. Damit wird Kommunikationsziel 1 (Live-Berechnung) **stärker** kommuniziert als bei X.
- Delta-Block zeigt trotzdem konkrete Slider-Werte (30% / 20%) — Kommunikationsziel 2 (Slider als Eingaben) bleibt erhalten.
- Juristisch praktisch risikofrei: keine konkrete Zahl, kein Werteversprechen.

---

### Bilanz

**Marketing — Variante X:**
- ✅ Erhält den visuellen Wow-Moment (konkrete Zahl als Demo des Wert-Versprechens)
- ✅ Erstbesucher sieht sofort, was der Simulator „kann" (eine konkrete Ergebniszahl produzieren)
- ⚠ Risiko: trotz „Beispiel"-Framing bleibt die Zahl im Gedächtnis hängen — psychologische Wirkung ähnlich der Originalfassung

**Marketing — Variante Y:**
- ✅ Stärker aktivierend („?.???" ist eine optische Einladung zum Mitmachen)
- ✅ Konsistent mit der Hero-Botschaft „Man versteht es, wenn man es verändert"
- ⚠ Weniger demonstrativ — Erstbesucher sieht nicht direkt, welche Größenordnung der Simulator produziert

**Legal — Variante X:**
- 🟡 Reduziert Risiko aus R-02, beseitigt es aber nicht vollständig — bei Abmahnung käme es auf Gesamtschau an
- ✅ Doppelte „Beispiel"-Verankerung (Label + Delta) ist die juristische Mindestabsicherung für eine konkrete Zahl

**Legal — Variante Y:**
- ✅ Praktisch risikofrei aus R-02 — keine konkrete Zahl mehr
- ✅ Vermeidet zusätzlich die zugespitzten Begriffe „realistisch" / „ehrlich" (s. R-08)

---

### Empfehlung

**Variante Y (Platzhalter).** Begründung:
- Juristisch sicherer, ohne nennenswerten Verlust an Marketing-Wirkung.
- Konsistent mit der Hero-Headline („Man versteht es, wenn man es verändert") — der Platzhalter ist optisch die direkteste Aufforderung, den Simulator selbst zu bewegen.
- Wenn später bei A/B-Test 1 (Hero-Repositionierung, siehe Sektion 2.6 im Haupt-Review) Performance gemessen wird, ist Variante Y die saubere Basis.

**Fallback:** Variante X — wenn der visuelle Wow-Moment der konkreten Zahl strategisch wichtig bleibt (z.B. für Performance-Kampagnen mit Screenshots), dann Variante X mit konsequenter „Beispiel-Rechnung"-Kennzeichnung **plus** eine ergänzende Caption unter dem Frame:

> *„Modellrechnung. Deine Werte können abweichen. → [Wie der Simulator rechnet]"*

(Letzteres setzt die in Legal S-01 empfohlene Einkommens-Disclosure-Seite voraus.)

---

### Umsetzung

Die Änderungen betreffen in [IndexPageDefault.astro:64-71](website-astro/src/shared/components/sections/IndexPageDefault.astro#L64-L71) den Hero-Mockup-Block sowie die beiden Annotation-Divs in [IndexPageDefault.astro:113-114](website-astro/src/shared/components/sections/IndexPageDefault.astro#L113-L114).

**Hinweis zur Unit `/Mon`:** Die Mockup-Unit „/Mon" neben der Zahl bleibt erhalten — ohne sie wäre unklar, ob „Provision · Jahr 10" einen Monats- oder Jahreswert meint. Das Label wurde nur entlang der User-Vorgabe um „· pro Monat" gekürzt, die Unit am Zahlende übernimmt diese Klärung kompakter.

---

## zu R-03 — Ziele-Leiter: Wegmarken, Werte, Jahreszahlen

**Quelle:**
- Feature-Block: [FeaturesPageDefault.astro:259-303](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L259-L303)
- Body-Texte: [FeaturesPageDefault.astro:270-283](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L270-L283)
- Mockup: [FeaturesPageDefault.astro:286-301](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L286-L301)

**Legal-Befund:** R-03 (rot) — Ziele-Leiter mit konkreten Eurobeträgen (~50€, ~350€, ~1.200€, ~3.500€, ~6.000€) und Jahresangaben (J1, J3, J5, J7) als „achieved" markiert. Suggeriert Planbarkeit und Typizität von Einkommens-Wegmarken. §5 UWG (Irreführung) und §16 Abs. 2 UWG (Schneeball).

**Inhaltliche Vorgaben aus User-Briefing:**
- Alle **Werte und Namen** der Zwischenziele sind vom Nutzer **frei wählbar und definierbar**
- Das **Erreichen** wird im Übersichts-Diagramm angezeigt
- Das Erreichen ist von den **Slider-Einstellungen abhängig** (nicht vom Anbieter gesetzt)
- **Emotionale Bezeichnungen** (Auto, Mietfrei, Pension) sollen nach Möglichkeit **bleiben**
- Werte und Jahreszahlen aus dem Mockup **weg**
- **Zweiter Mockup-Ausschnitt** zeigt das Eingabe-Form mit einem Beispiel, z.B. „Mietfrei wohnen ~1.200 €/Monat"

---

### Text-Vorschläge

#### Feature-Headline

| # | Variante | Bewertung |
|---|---|---|
| H-1 | „Ziele-Leiter. *Eigene Zwischenziele* statt nur Endsumme." | Behält Antithese-Struktur, kleine Schärfung über „Eigene" |
| H-2 | „Ziele-Leiter. *Du definierst*, was zählt." | Aktivierender, betont User-Hebel |
| H-3 | „Ziele-Leiter. *Deine Wegmarken*, nicht unsere." | Schärfster Differenzierungs-Hook |

**Empfehlung:** H-2 oder H-3. H-2 fügt sich tonal in die bestehenden Feature-Headlines („Sein Plan, nicht deiner") ein und betont das User-Engagement-Differenzmerkmal.

---

#### Intro-Absatz

**Aktuell:**
> „Für Motivation sind Endzahlen oft zu weit weg. Statt nur auf Jahr 10 zu schauen, zeigt die Ziele-Leiter konkrete Zwischenziele im Verlauf — und in welchem Jahr sie nach den eigenen Annahmen erreicht werden."

**Probleme:**
- „konkrete Zwischenziele" suggeriert vom Anbieter vordefinierte Ziele
- „in welchem Jahr sie erreicht werden" liest sich als Erfolgsversprechen

**Vorschlag (Variante I-1, empfohlen):**
> „Endzahlen sind weit weg. Eine Auto-Finanzierung, eine Miete oder ein Standbein-Einkommen sind greifbar. **Du definierst** deine eigenen Wegmarken — der Simulator zeigt im Verlauf, in welchem Jahr deine Slider-Annahmen das Ziel laut Modell erreichen würden."

**Vorschlag (Variante I-2, knapper):**
> „Du definierst deine Wegmarken — Name, Betrag, Bedeutung. Im Übersichts-Diagramm siehst du, wann deine Slider-Annahmen jedes Ziel laut Modell erreichen würden."

---

#### Highlight-Box (Hervorhebung im Feature-Block)

**Aktuell:**
> „Für bestehende Partner ist das oft entscheidender als die Endzahl: **Wegmarken machen Fortschritt greifbar**, gerade in den ersten Jahren, in denen die Provision noch klein wirkt."

**Vorschlag:**
> „Für Partner in der Aufbauphase ist das oft entscheidender als die Endzahl: **Eigene Wegmarken machen den Modell-Verlauf greifbar**, gerade in den ersten Jahren — in denen die berechneten Provisionen klein wirken."

Damit:
- „bestehende Partner" → „Partner in der Aufbauphase" (klarer Durchhalte-Pfad)
- „Fortschritt" → „Modell-Verlauf" (entkoppelt von Versprechen)
- „die Provision noch klein wirkt" → „die berechneten Provisionen klein wirken" (Bezug auf Berechnung, nicht auf Realität)

---

#### Bullet-Liste (Wegmarken-Inspiration)

**Aktuell:**
- Produktkosten refinanziert — der erste, leicht erreichbare Anker.
- Auto finanziert — Zwischenziel mit greifbarer Wirkung im Alltag.
- Mietfrei wohnen — Wegmarke, an der viele Partner durchhalten.
- Vollwertiges Einkommen — der Punkt, an dem aus Nebenher ein echtes Standbein wird.
- Eigene, frei definierte Ziele — was immer den Sponsor oder Partner motiviert.

**Vorschlag — Lead-In + 5 Bullets:**

> **Beispiele für Wegmarken, die viele Sponsoren wählen — oder eigene definieren:**
>
> - **Produktkosten refinanziert** — ein erster, motivierender Anker.
> - **Auto finanziert** — Wegmarke mit greifbarer Alltagswirkung.
> - **Mietfrei wohnen** — Wegmarke, an der viele Partner durchhalten.
> - **Vollwertiges Einkommen** — der Punkt, an dem aus Nebenher ein Standbein werden kann.
> - **Eigene Ziele** — Frühpension, Reisen, Ausbildung der Kinder — was immer dich motiviert.

**Was sich geändert hat:**
- Lead-In macht explizit: das sind **Beispiele**, nicht vorgegebene Anker.
- „der erste, **leicht erreichbare** Anker" → „ein erster, motivierender Anker" (Erfolgsversprechen entschärft)
- „aus Nebenher ein echtes Standbein **wird**" → „ein Standbein werden **kann**" (Konjunktiv)
- Letzter Bullet erweitert um lebensweltliche Alternativen (Reisen, Ausbildung der Kinder) — stärkt den „eigene Ziele"-Gedanken

---

### Mockup-Vorschläge

#### Ausschnitt 1 — Ziele-Leiter (Übersicht)

**Aktuell:**
```
[Header] Zwischenziele im Jahresverlauf
✓ Produktkosten refinanziert · ~ 50 €/Monat · J1
✓ Auto finanziert · ~ 350 €/Monat · J3
✓ Mietfrei wohnen · ~ 1.200 €/Monat · J5
✓ Vollwertiges Einkommen · ~ 3.500 €/Monat · J7
○ Eigenes Ziel · Frühpension · ~ 6.000 €/Monat · —
```

**Vorschlag:**
```
[Header] Deine Wegmarken · Status laut Modell
✓ Produktkosten refinanziert
✓ Auto finanziert
●—— Mietfrei wohnen                   (Fortschrittsbalken bis ~70%)
○ Vollwertiges Einkommen
○ Frühpension
[+ Eigenes Ziel hinzufügen]
```

**Was sich geändert hat:**
- Header: „Deine Wegmarken · Status laut Modell" — macht klar, dass es um vom Nutzer definierte Ziele geht und der Status sich aus dem Modell ergibt.
- **Keine Eurobeträge** mehr.
- **Keine Jahreszahlen** mehr.
- Status nur visuell (erreicht / in Bearbeitung / offen) — z.B. Häkchen, Balken, leerer Kreis.
- Letztes Item: aktiver CTA „+ Eigenes Ziel hinzufügen" — visualisiert direkt die User-Hebel-Funktion und überleitet zu Ausschnitt 2.

---

#### Ausschnitt 2 — Eingabe-Form (Demo: „So definierst du ein Ziel")

**Komplett neu.** Visualisiert das in der User-Vorgabe gewünschte Eingabe-Mockup, das die Definitionsfunktion sichtbar macht und das einzige verbleibende Eurobeispiel klar im **Eingabe-Kontext** rahmt.

**Layout-Vorschlag (kleine Form-Box neben oder unter Ausschnitt 1):**

```
[Header] Neues Ziel definieren

  Name              [Mietfrei wohnen          ]
  Betrag pro Monat  [  1.200 €                ]

  [Hinzufügen]
```

**Was das kommuniziert:**
- „Mietfrei wohnen" als **Beispiel-Eingabe** in einem Form-Feld — keine Tool-Aussage, sondern User-Demo.
- „1.200 €" als **Beispiel-Wert in einem Eingabefeld** — visuell klar als User-Input, nicht als Versprechen.
- Form-Layout macht ohne Worte klar: **du gibst das ein, du bestimmst die Werte.**

**Optional Header-Eyebrow über Ausschnitt 2:**
> „So definierst du deine Wegmarken"

---

#### Layout-Empfehlung für die Visual-Frame-Komposition

Aktuell ist im Feature-Block der `feature-visual` eine einzelne `.v-rank`-Tabelle. Mit zwei Ausschnitten gibt es drei Layout-Optionen:

| Option | Layout | Vor- / Nachteil |
|---|---|---|
| **L-1** | Ausschnitt 1 oben (groß), Ausschnitt 2 unten (kleinere Form) | Beste Lesefluss-Reihenfolge: erst Übersicht, dann Demo der Definition. |
| **L-2** | Beide Ausschnitte nebeneinander (Split-Layout) | Visuell stärker, aber bei <900px Mobile schwierig. |
| **L-3** | Ausschnitt 1 als Hauptfläche, Ausschnitt 2 als kleines „Overlay-Panel" mit Pfeil von „+ Eigenes Ziel hinzufügen" | Erzählerisch am stärksten, aber CSS-Aufwand höher. |

**Empfehlung: L-1.** Sauberes Stack-Layout, mobile-kompatibel, klare Reihenfolge.

---

### Bilanz

**Marketing:**
- ✅ Emotionale Bezeichnungen (Auto, Mietfrei, Pension) bleiben in Body-Text und Mockup-Übersicht.
- ✅ User-Engagement-Hebel („Du definierst") wird stärker — sogar conversion-positiver als die Ursprungsversion.
- ✅ Ausschnitt 2 (Eingabe-Form) macht das zentrale Differenzmerkmal („eigene Ziele") **sichtbar** statt nur zu behaupten.
- ✅ Body-Text gewinnt durch Aktivierungs-Sprache („Du definierst") an Conversion-Wirkung.
- ⚠ Visueller „Wow"-Moment der konkreten Wegmarken-Tabelle geht etwas zurück — wird durch die Eingabe-Form-Demo aber funktional aufgefangen.

**Legal:**
- ✅ Keine Eurobeträge mehr im Übersichts-Mockup (war Hauptpunkt R-03).
- ✅ Keine Jahreszahlen im Übersichts-Mockup — keine Suggestion von Planbarkeit.
- ✅ Eurobeispiel „1.200 €" steht ausschließlich im Eingabe-Form-Kontext — eindeutig als User-Input, nicht als Tool-Aussage.
- ✅ „aus Nebenher ein Standbein werden **kann**" entkräftet die Typizitätssuggestion.
- ✅ Lead-In „**Beispiele** für Wegmarken, die viele Sponsoren wählen — oder eigene definieren" erfüllt die juristische Mindestkennzeichnung als Beispiel.

---

### Empfehlung

Komplette Umsetzung aller drei Komponenten:

1. **Texte:** Headline H-2 + Intro I-1 + Highlight-Box-Vorschlag + Bullet-Liste mit Lead-In.
2. **Mockup-Ausschnitt 1:** Ziele-Leiter neu — ohne Eurobeträge, ohne Jahreszahlen, mit Status-Visualisierung + „+ Eigenes Ziel hinzufügen"-CTA.
3. **Mockup-Ausschnitt 2:** Neues Eingabe-Form mit „Mietfrei wohnen / 1.200 €" als Beispiel-Eingabe.

**Layout:** Option L-1 (Stack, Ausschnitt 1 oben, Ausschnitt 2 darunter).

---

### Umsetzung

- **Body-Texte:** ersetzen in [FeaturesPageDefault.astro:269-283](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L269-L283)
- **Mockup:** umbauen in [FeaturesPageDefault.astro:286-301](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L286-L301) — die bestehende `.v-rank`-Struktur wird Ausschnitt 1, eine neue Form-Komponente kommt darunter
- **CSS:** Ausschnitt 2 braucht ein paar neue Styles für die Form-Felder (Label, Input-Look, Button) — bestehende `paper-2`-/`line`-Tokens reichen aus, kein neues Token-System nötig.

---

## zu R-04 — AGB-Footer „Vorlage. Vor Live-Schaltung prüfen lassen"

**Quelle:** [LegalAgbDefault.astro:178-179](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L178-L179)
**Legal-Befund:** R-04 (rot) — Selbstauskunft zur Mangelhaftigkeit live sichtbar.

### Status (User-Entscheidung)

> **Anwaltlicher Review der AGB ist noch ToDo. Bis dahin bleibt die Seite per `.htaccess` gesperrt.**

→ Aktion entfällt im Code, solange die Sperre besteht. Der Hinweis im AGB-Footer bleibt korrekt, weil die AGB tatsächlich noch ungeprüft sind.

**Erinnerung:** Vor Aufheben der `.htaccess`-Sperre den Vorlage-Hinweis aus [LegalAgbDefault.astro:178-179](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L178-L179) entfernen — und parallel die analogen Vermerke in [LegalDatenschutzDefault.astro:146](website-astro/src/shared/components/sections/LegalDatenschutzDefault.astro#L146) und [LegalImpressumDefault.astro:37](website-astro/src/shared/components/sections/LegalImpressumDefault.astro#L37) (jeweils „Grundlage: angepasst aus dem bestehenden eRecht24-Text.") prüfen lassen und ebenfalls entfernen.

---

## zu R-05 — AGB §13 Änderungsklausel

**Quelle:** [LegalAgbDefault.astro:155-162](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L155-L162)
**Legal-Befund:** R-05 (rot) — Klausel mit fingiertem Einverständnis ohne Hinweispflicht. §308 Nr. 5 BGB, BGH XI ZR 26/20 („Postbank-Urteil").

**Hinweis vorab:** Die folgenden Vorschläge sind Struktur-Entwürfe für die anwaltliche Endabnahme. AGB-Klauseln sind kein klassisches Marketing-Feld — die Marketing-Wirkung kommt hier ausschließlich aus **klarer, verständlicher Sprache, die Vertrauen schafft.**

---

### Variante A — Konservativ-streng (keine Schweige-Fiktion, höchster Schutz)

Verzichtet komplett auf die Annahme-Fiktion. Jeder wesentliche Vertragsbestandteil wird nur mit aktiver Zustimmung geändert. Sicher gegen §308 Nr. 5 BGB-Angriffe.

> **§ 13 Änderungen dieser AGB**
>
> (1) Der Anbieter ist berechtigt, diese AGB anzupassen, soweit dies aus rechtlichen oder regulatorischen Gründen erforderlich wird oder zur Behebung von Lücken nach Vertragsabschluss notwendig ist.
>
> (2) Über geplante Änderungen informiert der Anbieter den Nutzer mindestens **sechs Wochen** vor Inkrafttreten per E-Mail. Die Mitteilung beschreibt die Änderungen verständlich und enthält einen Hinweis auf das Sonderkündigungsrecht.
>
> (3) Stimmt der Nutzer den geänderten AGB nicht zu, kann er den Vertrag bis zum geplanten Wirksamkeitsdatum **mit Wirkung zum geplanten Änderungsdatum kündigen**. Der Vertrag läuft in diesem Fall zu den bisherigen Bedingungen bis zum Wirksamkeitsdatum weiter.
>
> (4) Stimmt der Nutzer ausdrücklich zu, gelten die geänderten AGB ab dem Wirksamkeitsdatum.

**Marketing-Wirkung:** Der Nutzer sieht „aktive Zustimmung nötig" — sehr starkes Vertrauenssignal. Gleichzeitig administrativer Aufwand für den Anbieter (Zustimmungs-Tracking).

---

### Variante B — Mittel (Schweige-Fiktion mit klarer Hinweispflicht, praktikabel)

Behält die Schweige-Fiktion, erfüllt aber alle §308 Nr. 5 BGB-Anforderungen und nimmt wesentliche Änderungen (Preise, Hauptpflichten) explizit aus.

> **§ 13 Änderungen dieser AGB**
>
> (1) Der Anbieter ist berechtigt, diese AGB anzupassen, soweit dies aus rechtlichen, regulatorischen oder technischen Gründen erforderlich wird oder zur Behebung von Lücken nach Vertragsabschluss notwendig ist. Eine Anpassung wird nur wirksam, wenn sie das vertragliche Gleichgewicht zwischen den Parteien nicht zu Lasten des Nutzers wesentlich verändert.
>
> (2) Der Anbieter informiert den Nutzer per E-Mail spätestens **sechs Wochen vor dem geplanten Wirksamkeitsdatum** über die Änderungen. Die Mitteilung enthält:
>   - eine verständliche Beschreibung der geänderten Bestimmungen,
>   - **einen ausdrücklichen Hinweis auf die Bedeutung des Schweigens** (Zustimmung kraft Schweigens),
>   - **einen Hinweis auf die Frist und das Recht zum Widerspruch**.
>
> Widerspricht der Nutzer nicht innerhalb der Frist, gelten die Änderungen als angenommen.
>
> (3) **Für wesentliche Vertragsänderungen** — insbesondere Preisanpassungen, Erweiterung der Pflichten des Nutzers oder Einschränkung der vertraglichen Hauptleistung — ist eine **ausdrückliche Zustimmung** des Nutzers erforderlich. Stimmt der Nutzer nicht zu, läuft der Vertrag zu den bisherigen Bedingungen weiter; jede Partei kann den Vertrag bis zum geplanten Änderungsdatum mit Wirkung zum geplanten Änderungsdatum kündigen.

**Marketing-Wirkung:** „Ausdrückliche Zustimmung für Preisänderungen" ist Pro-Verbraucher-Signal und kommunikativ stark. Schweige-Fiktion gilt nur für unwesentliche Anpassungen — administrativ schlank.

---

### Bilanz

| Aspekt | Variante A | Variante B |
|---|---|---|
| Rechtssicherheit (§308 Nr. 5 BGB / Postbank) | ✅✅✅ höchste | ✅✅ hoch (sofern Hinweispflicht in Praxis sauber umgesetzt) |
| Administrativer Aufwand | Hoch (jede Änderung braucht Zustimmungs-Workflow) | Mittel (Schweige-Fiktion für Kleinigkeiten, Zustimmung für Wesentliches) |
| Marketing-Vertrauenssignal | ✅✅✅ stärkstes | ✅✅ stark (vor allem Absatz 3) |
| SaaS-Marktüblichkeit | Selten — meist B2C-Premium-Anbieter | Üblich bei seriösen Anbietern |

**Empfehlung:** **Variante B** — sie balanciert Vertrauen und Praktikabilität und schließt das §308 Nr. 5 BGB-Loch sauber. Variante A ist die rechtssicherere, aber operativ aufwändigere Option — sinnvoll, falls LifeFlow360 langfristig auf maximale Verbraucher-Konformität setzen will.

**Wichtig (für beide Varianten):** Der finale Wortlaut muss anwaltlich abgenommen werden. Die obigen Struktur-Vorschläge folgen den Anforderungen aus §308 Nr. 5 BGB und dem Postbank-Urteil, ersetzen aber keine Einzelfall-Prüfung.

---

### Umsetzung

Ersetzt §13 in [LegalAgbDefault.astro:155-162](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L155-L162). Findet **nach** anwaltlicher Abnahme statt — bis dahin bleibt die `.htaccess`-Sperre aktiv (siehe R-04).

---

## zu R-06 — Domain in AGB und Impressum

**Quelle:** [brand.yaml:2](website-astro/src/brands/lifeplus/brand.yaml#L2), [LegalAgbDefault.astro:21-22](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L21-L22), [LegalImpressumDefault.astro](website-astro/src/shared/components/sections/LegalImpressumDefault.astro)
**Legal-Befund:** R-06 (rot) — Domain-Strategie und Pflichttext-Konsistenz.

### Status (User-Entscheidung)

> **ToDo: Domain in AGB und Impressum manuell ergänzen.**

→ Aktion erfolgt manuell, kein Marketing-Vorschlag nötig.

**Hinweis zur Umsetzung:**
- AGB §1: aktuell `{brand.siteDomain}` — funktioniert über Astro-Template. Sicherstellen, dass `brand.yaml siteDomain` final auf der Produktiv-Domain steht (aktuell „www.lifeflow360.app").
- Impressum: nennt aktuell keine Domain explizit. Empfohlen ist eine Ergänzung im Abschnitt „Anbieter": „… betreibt LifeFlow360 unter `www.lifeflow360.app`".
- Bei Mehrfach-Domain-Strategie (falls zusätzliche `.de`-Domain hinzukommt): Impressum/Datenschutz auf allen Live-Domains erreichbar machen.

---

## zu R-07 — Magic-Link-Login: Datenschutz-Hinweis im Form-Kontext

**Quelle:** [AccountPageDefault.astro:31-51](website-astro/src/shared/components/sections/AccountPageDefault.astro#L31-L51)
**Legal-Befund:** R-07 (rot) — Datenschutz-Hinweis fehlt am Erhebungspunkt (Art. 13 DSGVO).

### Status (User-Entscheidung)

> **ToDos:**
> 1. Kontaktformular statt mailto-Erstellung
> 2. Checkbox: Einverständnis AGB
> 3. Checkbox: Einverständnis Datenschutz
> 4. Checkbox: Einverständnis „Verzicht auf 14 Tage Rücktrittrecht, wenn sofort freigeschaltet" (nur bei Pro relevant)

### Konzept-Vorschläge zur Umsetzung

#### ToDo 1 — Kontaktformular statt mailto

**Hinweis:** Reines mailto ist nicht falsch (DSGVO-konform), aber UX-schwach (kein Tracking, kein Validierung, keine Spam-Filter). Ein Kontaktformular mit Server-Endpoint ist Best Practice.

**Felder-Vorschlag (minimal):**
- Name (Pflicht)
- E-Mail (Pflicht)
- Betreff (Dropdown: Allgemein / Abrechnung / Technik / Datenschutz)
- Nachricht (Pflicht)
- ✅ Checkbox: „Ich habe die [Datenschutzerklärung](/datenschutz.html) gelesen und akzeptiere die Verarbeitung meiner Angaben zur Bearbeitung der Anfrage." (Pflicht)

**Disclaimer-Text unter dem Form:**
> *Mit Klick auf »Anfrage senden« werden deine Angaben zur Beantwortung der Anfrage verarbeitet (Art. 6 Abs. 1 lit. b/f DSGVO). Details siehe [Datenschutzerklärung](/datenschutz.html).*

---

#### ToDo 2 + 3 — Checkboxen AGB & Datenschutz

**Wichtig:** Die zwei Einwilligungen müssen **getrennt** und **aktiv** (kein Pre-Checked) sein — EuGH C-673/17 „Planet49" Urteil.

**Vorschlag — Checkboxen vor Bestell-Button im Pricing-Checkout (vor Paddle-Übergabe):**

> ☐ Ich akzeptiere die [Allgemeinen Geschäftsbedingungen](/agb.html).
>
> ☐ Ich habe die [Datenschutzerklärung](/datenschutz.html) zur Kenntnis genommen.

Beide als Pflicht-Checkboxen. Button „Zahlungspflichtig bestellen" bleibt **deaktiviert**, bis beide aktiv angeklickt sind.

**Standort:** vor dem Paddle-Checkout-Aufruf, also clientseitig in [pricing.astro](website-astro/src/brands/lifeplus/pages/pricing.astro) bzw. in der gemeinsamen Komponente [PricingPageDefault.astro](website-astro/src/shared/components/sections/PricingPageDefault.astro).

Beim Magic-Link-Login auf AccountPage genügt ein **Hinweis** (keine Checkboxen — Login ist Vertragsdurchführung):

> *Mit Klick auf »Login-Link senden« erlauben wir uns, deine E-Mail-Adresse zur Authentifizierung und Vertragsdurchführung zu verarbeiten (Art. 6 Abs. 1 lit. b DSGVO). Details siehe [Datenschutzerklärung](/datenschutz.html).*

---

#### ToDo 4 — Checkbox „Verzicht auf 14 Tage Rücktrittrecht"

**Wichtig:** Die Voraussetzungen aus §356 Abs. 5 BGB (Erlöschen des Widerrufsrechts bei digitalen Dienstleistungen) verlangen drei Schritte. Eine einzelne Checkbox reicht **nicht** — die Bestätigung muss zusätzlich in Textform (Bestätigungsmail) erfolgen.

**Vorschlag — zwei getrennte Checkboxen vor Pro-Bestellung:**

> ☐ Ich stimme ausdrücklich zu, dass die Bereitstellung der Pro-Funktionen **sofort nach Vertragsschluss beginnt** — vor Ablauf der 14-tägigen Widerrufsfrist.
>
> ☐ Ich nehme zur Kenntnis, dass mein Widerrufsrecht **mit vollständiger Vertragserfüllung erlischt**, sobald die Pro-Funktionen vollständig bereitgestellt wurden.

**Plus Pflicht im System:**
- Beide Checkboxen müssen einzeln aktiv geklickt werden (kein Pre-Check, kein Block-Click).
- Die Bestätigung wird in der **Order-Confirmation-Mail** noch einmal explizit wiederholt: „Du hast bestätigt, dass die Bereitstellung sofort beginnt und das Widerrufsrecht damit erlischt."
- Bei **Free-Plan** sind diese Checkboxen **nicht** nötig (keine Vergütung, kein Widerrufsfall).

**Marketing-Hinweis:** Den Sprach-Tonalität der Checkboxen klar und nüchtern halten — nicht „Du verzichtest auf…", sondern „Ich stimme zu, dass…". Das ist juristisch korrekter und nimmt der Aussage die Wucht.

---

### Umsetzung-Übersicht

| ToDo | Wo | Aufwand |
|---|---|---|
| 1. Kontaktformular | Neue Komponente + Server-Endpoint (z.B. Resend-Mail) | 4-8h |
| 2. AGB-Checkbox | Pricing-Page vor Paddle-Aufruf | 1-2h |
| 3. Datenschutz-Checkbox | Pricing-Page vor Paddle-Aufruf | 1-2h (gemeinsam mit 2) |
| 4. Widerruf-Checkboxen | Pricing-Page nur bei Pro-Plans + Bestätigungsmail-Anpassung | 2-4h |
| Plus Magic-Link-Hinweis | AccountPage Login-Form | 30 min |

**Hinweis zur Reihenfolge:** ToDo 2-4 hängen alle am Pricing-Checkout-Flow — sinnvoll, sie zusammen umzusetzen. ToDo 1 ist davon unabhängig.

---

## zu R-08 — Inventur „realistisch / ehrlich / realitätsnah / echt"

**Legal-Befund:** R-08 (rot) — Begriffe sind objektive Beschaffenheits-Behauptungen mit §5 UWG-Risiko bei Häufung.

**Suchscope:** alle `.astro` und `.yaml`-Dateien in `website-astro/src/` (LifePlus + Shared). FitLine/Eqology hier mit aufgelistet, weil die SEO-Description identisch ist und beim Anpassen mitgezogen werden sollte.

**Suchbegriffe:** `realistisch`, `Realistisch`, `realistischere`, `Realität`, `realitätsnah`, `ehrlich(e/en)`, `echt(e/es)`, `Wahrheit`.

---

### Befunde im Detail

#### Stelle 1 — Hero-Mockup-Delta

**Fundstelle:** [IndexPageDefault.astro:70](website-astro/src/shared/components/sections/IndexPageDefault.astro#L70)

**Kontext:** *„**Realistisch** · 30% Dup · 20% Fluk"*

→ **Cross-Reference R-02.** Bereits behandelt: Vorschlag „Beispiel: 30% Duplikation · 20% Fluktuation".

---

#### Stelle 2 — Core-Card 02 (Durstrecken-Block)

**Fundstelle:** [IndexPageDefault.astro:219](website-astro/src/shared/components/sections/IndexPageDefault.astro#L219)

**Kontext:** *„Der Simulator zeigt, warum Jahr 1 oft klein aussieht, **welche Zwischenziele trotzdem realistisch sind** und was 12, 24 oder 36 Monate Kontinuität bewirken."*

**Alternativen:**
- **Alt A:** „… welche **Zwischenziele trotzdem in Reichweite scheinen** …"
- **Alt B:** „… welche **Zwischenziele dein Modell trotzdem hergibt** …"
- **Alt C:** „… **welche Wegmarken sich aus deinen Annahmen ergeben** …"

---

#### Stelle 3 — FAQ-Frage

**Fundstelle:** [IndexPageDefault.astro:401](website-astro/src/shared/components/sections/IndexPageDefault.astro#L401)

**Kontext:** *„Sind die Zahlen wirklich **realistisch** — oder Marketing?"*

**Alternativen:**
- **Alt A:** „Sind die Zahlen wirklich **belastbar** — oder Marketing?"
- **Alt B:** „**Wie kommen die Zahlen zustande** — und sind sie Marketing?"
- **Alt C:** **behalten** — die Frage selbst ist als Verbraucher-Sicht okay; die problematische Aussage steckte in der Antwort (R-01).

---

#### Stelle 4 — FAQ-Antwort (Index)

**Fundstelle:** [IndexPageDefault.astro:406](website-astro/src/shared/components/sections/IndexPageDefault.astro#L406)

**Kontext:** Mehrfach „realistisch" + „ehrlichen €4.000–€10.000".

→ **Cross-Reference R-01.** Bereits behandelt: Variante A/B/C in eigenem R-01-Block oben.

---

#### Stelle 5 — Feature 01 Slider Body

**Fundstelle:** [FeaturesPageDefault.astro:35](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L35)

**Kontext:** *„Fünf Regler reichen, um ein Gespräch zu drehen — der Interessent oder Partner stellt selbst ein, **was er für realistisch hält.** Jede Änderung berechnet die Entwicklung über die Zeit sofort neu."*

**Diagnose:** Hier ist „realistisch" eigentlich harmlos — es bezieht sich auf die **Selbst-Einschätzung** des Interessenten, nicht auf eine Aussage des Anbieters. Niedriges Risiko.

**Alternativen:**
- **Alt A:** „… stellt selbst ein, **was er sich zutraut.**" (Aktivierungs-fokussiert)
- **Alt B:** „… stellt selbst ein, **was er für plausibel hält.**" (synonym-saubere Variante)
- **Alt C:** **behalten** — Kontext rechtlich unkritisch.

---

#### Stelle 6 — Feature 01 Slider Bullet (Fluktuation)

**Fundstelle:** [FeaturesPageDefault.astro:45](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L45)

**Kontext:** *„**Fluktuation** — **ehrliche Reibung**, statt mathematischer Märchenwelt."*

**Diagnose:** „ehrliche Reibung" ist literarisch stark, juristisch mittleres Risiko — „ehrlich" als Werbe-Attribut.

**Alternativen:**
- **Alt A:** „**Fluktuation** — **realistische Reibung**, statt mathematischer Märchenwelt." ← würde von „ehrlich" zu „realistisch" wechseln — gleiches Risiko, nicht empfohlen
- **Alt B:** „**Fluktuation** — **tatsächliche Reibung** ist immer dabei."
- **Alt C:** „**Fluktuation** — **Schwund einrechnen**, statt mathematischer Märchenwelt."

**Empfehlung:** Alt C — sachlich, mit Aktivierungs-Verb.

---

#### Stelle 7 — Feature 02 Verlauf Body

**Fundstelle:** [FeaturesPageDefault.astro:80](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L80)

**Kontext:** *„Im 1. Jahr passiert wenig. Im 4. wird's spürbar. Ab dem 7. wird's eindrucksvoll. **Das ist die Wahrheit jedes Netzwerks** — und die einzige Visualisierung, die **diese Geschichte ehrlich erzählt**, ist der Verlauf."*

**Diagnose:** **Stärkste Häufung der Site.** „Wahrheit jedes Netzwerks" + „ehrlich erzählt" + die konkreten Jahres-Aussagen („Im 4. wird's spürbar", „Ab dem 7. wird's eindrucksvoll") sind in Kombination angreifbar — sie etablieren typische Verläufe als Norm.

**Alternativen (für den ganzen Block):**
- **Alt A:** „Im 1. Jahr passiert wenig. Im 4. wird die Kurve spürbar. Ab dem 7. läuft die Berechnung in den Hockeystick. **So zeigt das Modell die Wirkung von Zeit im Netzwerk** — eine Visualisierung, die in Tabellen und Folien meist abstrakt bleibt."
- **Alt B:** „Im 1. Jahr ist die Berechnung flach. Im 4. wird die Kurve sichtbar. Ab dem 7. wird sie steiler. **Genau diesen Modell-Verlauf** zeigt der Chart — was in Tabellen schwer fassbar ist."
- **Alt C:** „Anfangs ist die Modell-Kurve flach. Ab der Mitte wird sie steiler. Genau diese Dynamik macht der Verlauf sichtbar — eine Perspektive, die Tabellen nicht leisten."

**Empfehlung:** Alt A — behält die Drei-Phasen-Struktur, entkoppelt aber von „Wahrheit" und „ehrlich".

---

#### Stelle 8 — Feature 04 Modelle Body

**Fundstelle:** [FeaturesPageDefault.astro:210](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L210)

**Kontext:** *„Nicht jedes Team wächst gleich. Ein einfaches Modell hilft beim Einstieg, **realistischere Modelle** zeigen Streuung und Dynamik. Starte einfach und schalte bei Bedarf **mehr Realität** hinzu."*

**Alternativen:**
- **Alt A:** „… **differenziertere Modelle** zeigen Streuung und Dynamik. Starte einfach und schalte bei Bedarf **mehr Differenzierung** hinzu."
- **Alt B:** „… **erweiterte Modelle** zeigen Streuung und Dynamik. Starte einfach und schalte bei Bedarf **mehr Tiefe** hinzu."
- **Alt C:** „… **detailliertere Modelle** zeigen Streuung und Dynamik. Starte einfach und schalte bei Bedarf **mehr Detail** hinzu."

**Empfehlung:** Alt A — am nächsten am Original, sauber entkoppelt.

---

#### Stelle 9 — Feature 04 Momentum Bullet

**Fundstelle:** [FeaturesPageDefault.astro:215](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L215)

**Kontext:** *„**Momentum** — **realitätsnah**: einzelne Beine entwickeln Dynamik, andere bleiben kleiner. **Spiegelt echte Team-Erfahrung.**"*

**Alternativen:**
- **Alt A:** „**Momentum** — einzelne Beine entwickeln Dynamik, andere bleiben kleiner. **Spiegelt die Streuung wieder, die viele Teams beschreiben.**"
- **Alt B:** „**Momentum** — **mit Schwung-Effekt**: einzelne Beine entwickeln Dynamik, andere bleiben kleiner. Spiegelt typische Team-Dynamiken im Modell."
- **Alt C:** „**Momentum** — einzelne Beine entwickeln Dynamik, andere bleiben kleiner. **Modelliert die Streuung, die in Teams häufig vorkommt.**"

**Empfehlung:** Alt A — entkoppelt von „realitätsnah" und „echte Team-Erfahrung", behält den Inhalt.

---

#### Stelle 10 — Feature 05 Ziele Bullet (Standbein)

**Fundstelle:** [FeaturesPageDefault.astro:281](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L281)

**Kontext:** *„**Vollwertiges Einkommen** — der Punkt, an dem aus Nebenher ein **echtes Standbein wird**."*

→ **Cross-Reference R-03.** Im R-03-Block oben bereits behandelt: „der Punkt, an dem aus Nebenher ein Standbein **werden kann**" — entkoppelt durch Konjunktiv.

---

#### Stelle 11 — Index-Seite SEO-Description

**Fundstelle:** [brands/lifeplus/pages/index.astro:9](website-astro/src/brands/lifeplus/pages/index.astro#L9)

**Kontext:** ``const description = `Simuliere **realistisch**, was dein ${brand.productName}-Netzwerk über zehn Jahre einspielen kann.`;``

**Alternativen:**
- **Alt A:** ``const description = `Simuliere mit eigenen Annahmen, was dein ${brand.productName}-Netzwerk über zehn Jahre laut Modell einspielen kann.`;``
- **Alt B:** ``const description = `Live-Simulation für ${brand.productName}-Sponsoren — fünf Slider, zehn Jahre Modell-Verlauf, eigene Wegmarken.`;``
- **Alt C:** ``const description = `Sieh als ${brand.productName}-Sponsor, wie sich dein Netzwerk laut Vergütungsplan-Modell über zehn Jahre entwickeln kann.`;``

**Empfehlung:** Alt B — Marketing-stark (USP „fünf Slider, zehn Jahre"), juristisch sauber, SEO-tauglich.

**Hinweis:** Parallel auch die Pendants in [brands/fitline/pages/index.astro:9](website-astro/src/brands/fitline/pages/index.astro#L9) und [brands/eqology/pages/index.astro:9](website-astro/src/brands/eqology/pages/index.astro#L9) ändern, sonst entstehen widersprüchliche Meta-Beschreibungen. (Aktuell out of scope, aber Konsistenz-Hinweis.)

---

### Cross-Reference — verwandte „Werbe-Adjektiv"-Stellen

Außerhalb des engeren R-08-Scopes, aber gehören zur selben Familie:

| Stelle | Begriff | Befund-Link |
|---|---|---|
| [IndexPageDefault.astro:307](website-astro/src/shared/components/sections/IndexPageDefault.astro#L307) | „Faires Werkzeug, fairer Preis" | Legal G-05 |
| [IndexPageDefault.astro:309](website-astro/src/shared/components/sections/IndexPageDefault.astro#L309) | „ohne Risiko, ohne Jahresfalle" | Legal G-04 |
| [IndexPageDefault.astro:379](website-astro/src/shared/components/sections/IndexPageDefault.astro#L379) | „Ohne Risiko:" Pricing-Note | Legal G-04 |
| [IndexPageDefault.astro:484](website-astro/src/shared/components/sections/IndexPageDefault.astro#L484) | „kein Hype" | Mittel — „Hype" als Negativ-Anker ist okay, aber Wortwahl unsachlich |
| [IndexPageDefault.astro:418](website-astro/src/shared/components/sections/IndexPageDefault.astro#L418) | „Komprimierung wird **korrekt** berücksichtigt" | Legal G-06 |
| [FeaturesPageDefault.astro:278](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L278) | „der erste, **leicht erreichbare** Anker" | Cross-Ref R-03 (bereits behandelt) |
| [pricing.yaml:94](website-astro/src/brands/lifeplus/content/pricing.yaml#L94) | „Jahresrabatt ohne Jahresfalle" | Legal G-04 |

---

### Mapping-Tabelle (für deine Entscheidung)

Trage in der Spalte „Deine Wahl" einfach `A`, `B`, `C`, `behalten` oder eigenen Wunschtext ein.

| # | Stelle | Original-Schlüsselwörter | Empfehlung | Deine Wahl |
|---|---|---|---|---|
| 1 | Hero-Mockup-Delta [IndexPageDefault.astro:70](website-astro/src/shared/components/sections/IndexPageDefault.astro#L70) | „Realistisch · Dup · Fluk" | → siehe R-02 | _____ |
| 2 | Core-Card 02 Body [IndexPageDefault.astro:219](website-astro/src/shared/components/sections/IndexPageDefault.astro#L219) | „trotzdem realistisch sind" | C | _____ |
| 3 | FAQ-Frage [IndexPageDefault.astro:401](website-astro/src/shared/components/sections/IndexPageDefault.astro#L401) | „wirklich realistisch — oder Marketing" | C (behalten) | _____ |
| 4 | FAQ-Antwort [IndexPageDefault.astro:406](website-astro/src/shared/components/sections/IndexPageDefault.astro#L406) | mehrfach „realistisch / ehrlichen" | → siehe R-01 | _____ |
| 5 | Feature 01 Slider Body [FeaturesPageDefault.astro:35](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L35) | „was er für realistisch hält" | A | _____ |
| 6 | Feature 01 Slider Bullet [FeaturesPageDefault.astro:45](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L45) | „ehrliche Reibung" | C | _____ |
| 7 | Feature 02 Verlauf Body [FeaturesPageDefault.astro:80](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L80) | „Wahrheit jedes Netzwerks / ehrlich erzählt" | A | _____ |
| 8 | Feature 04 Modelle Body [FeaturesPageDefault.astro:210](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L210) | „realistischere Modelle / mehr Realität" | A | _____ |
| 9 | Feature 04 Momentum Bullet [FeaturesPageDefault.astro:215](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L215) | „realitätsnah / echte Team-Erfahrung" | A | _____ |
| 10 | Feature 05 Ziele Bullet [FeaturesPageDefault.astro:281](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L281) | „aus Nebenher ein echtes Standbein wird" | → siehe R-03 | _____ |
| 11 | SEO-Description [brands/lifeplus/pages/index.astro:9](website-astro/src/brands/lifeplus/pages/index.astro#L9) | „Simuliere realistisch" | B | _____ |

**Nach deiner Wahl:** Ich setze die Änderungen sitewide um. Bei Cross-Reference-Stellen (1, 4, 10) bitte zusätzlich die R-Block-Entscheidung mitgeben (welche Variante aus R-01 / R-02 / R-03).

---

### Empfehlungs-Set in einem Satz

Wenn du keine Detail-Mappings machen möchtest: die obigen Empfehlungen (Alt A / B / C bzw. „behalten") liefern in Summe eine **conversion-arme, juristisch saubere Gesamt-Lösung** ohne Verlust der jeweiligen Funktionalität.

---

## Umsetzungs-Status (Stand 2026-05-30)

| Befund | Status | Notiz |
|---|---|---|
| R-01 | ✅ umgesetzt — Variante A | [IndexPageDefault.astro:404-411](website-astro/src/shared/components/sections/IndexPageDefault.astro#L404-L411) |
| R-02 | ✅ umgesetzt — Variante X | [IndexPageDefault.astro:64-71, 113-114](website-astro/src/shared/components/sections/IndexPageDefault.astro#L64-L71) |
| R-03 Texte | ✅ umgesetzt — H-2 + I-1 + Highlight-Box (Sponsor statt Partner) + Lead-In + 5 Bullets | [FeaturesPageDefault.astro:270-284](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L270-L284) |
| R-03 Mockup Ausschnitt 1 | ✅ umgesetzt — neue `.v-goals`-Komponente | [FeaturesPageDefault.astro:293-319](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L293-L319), CSS folgt direkt nach `.v-rank`-Block |
| R-03 Mockup Ausschnitt 2 | 🔄 zurückgestellt — wird im Video-Tutorial erklärt | — |
| R-04 | ⏸ on-hold | `.htaccess`-Sperre bleibt, bis Anwalt-Review der AGB durch ist |
| R-05 | ✅ umgesetzt — Variante B | [LegalAgbDefault.astro:155-181](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L155-L181). Finaler Wortlaut **muss vor Live-Schaltung anwaltlich abgenommen werden.** |
| R-06 | 📋 Wiedervorlage — siehe Reminder unten | — |
| R-07 | 📋 Wiedervorlage — siehe Reminder unten | — |
| R-08 | 📋 wartet auf Mapping-Entscheidung — siehe Reminder unten | — |

---

## 📋 Reminder R-06 — Domain in AGB und Impressum manuell ergänzen

**Was zu tun ist:**

1. **Produktiv-Domain in `brand.yaml` festlegen**
   Datei: [brands/lifeplus/brand.yaml](website-astro/src/brands/lifeplus/brand.yaml) — Zeile 2 (`siteDomain`)
   Aktueller Wert: `"www.lifeflow360.app"`
   → Prüfen, ob das die finale Produktiv-Domain ist (Memory-Hinweis: `.de`-Variante war als Zielzustand vorgesehen).

2. **Impressum-Ergänzung: Domain im Anbieter-Abschnitt**
   Datei: [shared/components/sections/LegalImpressumDefault.astro](website-astro/src/shared/components/sections/LegalImpressumDefault.astro) — Zeile 17-23 (Anbieter-Block)
   Vorschlag: Ergänzung um eine Zeile, z.B.:
   ```
   {contact.name}<br />
   betreibt LifeFlow360 unter {brand.siteDomain}<br />
   {contact.addressLine1}<br />
   ...
   ```
   Das setzt voraus, dass `brand` als Prop verfügbar ist (aktuell nur `contact`). Falls nicht: `brand` in den Props des Impressum-Templates ergänzen + im Page-Wrapper durchreichen.

3. **AGB §1 → bereits dynamisch**
   Datei: [shared/components/sections/LegalAgbDefault.astro:21-22](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L21-L22) nutzt schon `{brand.siteDomain}` → kein manueller Eingriff nötig, läuft mit Punkt 1.

4. **Bei Mehrfach-Domain-Strategie** (`.app` + `.de`): Impressum und Datenschutz auf **beiden** Domains erreichbar machen.

---

## 📋 Reminder R-07 — Magic-Link / Pflicht-Einwilligungen (Wiedervorlage)

**Status:** alle vier ToDos zurückgestellt.

**Was offen ist** (Konzept im R-07-Block oben):

| # | ToDo | Wo |
|---|---|---|
| 1 | Kontaktformular statt mailto-Erstellung | Neue Komponente + Server-Endpoint (z.B. Resend-Mail). Aktuell sind alle Kontakt-Punkte als `mailto:`-Link umgesetzt (z.B. [Footer.astro:28](website-astro/src/shared/components/layout/Footer.astro#L28), AGB §5, Impressum, Widerruf). |
| 2 | Checkbox „Einverständnis AGB" | [shared/components/sections/PricingPageDefault.astro](website-astro/src/shared/components/sections/PricingPageDefault.astro) vor Paddle-Checkout-Aufruf |
| 3 | Checkbox „Einverständnis Datenschutz" | gleiche Stelle wie 2 |
| 4 | Checkbox „Verzicht 14-Tage-Rücktrittrecht" (nur Pro) | gleiche Stelle wie 2, nur bei Pro-Plans aktiv; zusätzlich Bestätigung in Order-Confirmation-Mail wiederholen |
| 5 (Bonus) | Datenschutz-Hinweis am Magic-Link-Login-Form | [AccountPageDefault.astro:31-51](website-astro/src/shared/components/sections/AccountPageDefault.astro#L31-L51) |

**Empfohlene Reihenfolge bei späterer Umsetzung:** ToDos 2-5 hängen am Pricing-Checkout-Flow → zusammen umsetzen. ToDo 1 (Kontaktformular) ist davon unabhängig und kann separat laufen.

---

## 📋 Reminder R-08 — „realistisch / ehrlich / realitätsnah"-Inventur

**Status:** wartet auf deine Mapping-Entscheidung.

**Was zu tun ist:** In der Mapping-Tabelle oben (Sektion R-08) die Spalte „Deine Wahl" pro Zeile mit `A` / `B` / `C` / `behalten` / Custom-Text füllen. Danach setze ich alle 11 Stellen sitewide um.

**Betroffene Dateien (alle innerhalb LifeFlow360-Scope):**

| # | Datei | Stellen-Count |
|---|---|---|
| 1 | [IndexPageDefault.astro](website-astro/src/shared/components/sections/IndexPageDefault.astro) | 4 Stellen (Zeilen 70, 219, 401, 406) |
| 2 | [FeaturesPageDefault.astro](website-astro/src/shared/components/sections/FeaturesPageDefault.astro) | 6 Stellen (Zeilen 35, 45, 80, 210, 215, 281) |
| 3 | [brands/lifeplus/pages/index.astro](website-astro/src/brands/lifeplus/pages/index.astro) | 1 Stelle (Zeile 9, SEO-Description) |

**Cross-Reference-Stellen (bereits abgearbeitet, kein erneuter Eingriff nötig):**
- Stelle 1 (Hero-Mockup-Delta) → erledigt mit R-02 ✅
- Stelle 4 (FAQ-Antwort Index) → erledigt mit R-01 ✅
- Stelle 10 (Vollwertiges Einkommen Bullet) → erledigt mit R-03 ✅

→ **Offen sind also nur noch 8 Stellen** (Zeilen 219, 401 in IndexPageDefault + alle 5 in FeaturesPageDefault außer Zeile 281 + 1 in lifeplus/pages/index.astro).

**Nachgelagerte Konsistenz-Aufgabe (out of scope, aber vormerken):**
- [brands/fitline/pages/index.astro:9](website-astro/src/brands/fitline/pages/index.astro#L9) und [brands/eqology/pages/index.astro:9](website-astro/src/brands/eqology/pages/index.astro#L9) — beide SEO-Descriptions enthalten ebenfalls „Simuliere realistisch". Sollten beim FitLine/Eqology-Sprint analog angepasst werden, um Marken-Konsistenz zu halten.

---

## zu R-08 (erweitert) — Vollständige Inventur aller rechtlich kritischen Stellen

**Erweiterung gegenüber der ersten R-08-Suche:** Diesmal nicht nur „realistisch / ehrlich / realitätsnah" — sondern **alle** rechtlich relevanten Aussagen-Familien:

1. **Wachstums- und Erfolgs-Suggestion** (§5 UWG, §16 Abs. 2 UWG Schneeball)
2. **Wahrheits-/Realismus-Suggestion** (§5 UWG)
3. **Vergleichende Werbung** (§6 UWG)
4. **Garantie-/Performance-Behauptungen** (§5 UWG)
5. **Einkommens-/Geld-Mockup-Inhalte** (§5 UWG, §16 UWG)
6. **Steuer-Aussagen** (§3 StBerG, §5 UWG)
7. **Mockup-Werte mit konkreten Jahres-Markierungen** (§5 UWG)

### Risiko-Skala für diese Inventur

- 🔴 **ROT** — Abmahn-Hochrisiko, vor Live-Schaltung zwingend zu ändern
- 🟠 **ORANGE** — mittleres Risiko, in Kombination mit anderen Aussagen abmahnrelevant
- 🟡 **GELB** — niedriges Risiko isoliert, bei Häufung problematisch

---

### A) IndexPageDefault.astro

#### A-1 🟠 Hero-Headline (Wachstums-Versprechen, vergleichende Werbung)

**Fundstelle:** [IndexPageDefault.astro:25-26](website-astro/src/shared/components/sections/IndexPageDefault.astro#L25-L26)

**Original:** *„**Netzwerk-Wachstum** versteht man nicht in *Tabellen*. Man versteht es, wenn man es verändert."*

**Risiko:** „Netzwerk-Wachstum" als positives Versprechen + „nicht in Tabellen" als implizite Wettbewerber-Kritik. Standalone ORANGE; in Kombination mit den restlichen Aussagen verstärkend.

**Alternativen (marketing-stark + legal):**
- **Alt A:** „**Netzwerk-Aufbau** wird in *Tabellen* schwer fassbar. *Man versteht ihn, wenn man ihn simuliert.*" — „Aufbau" ist neutraler als „Wachstum", „simuliert" ist faktisch
- **Alt B:** „Den **Vergütungsplan** erklärt jeder. *Du zeigst, wie er sich entfalten kann.*" — verschiebt Fokus auf Produkt-Differenzierung
- **Alt C:** „**Vergütungsplan-Simulation** für Sponsoren — *fünf Slider, zehn Jahre, ein Bild.*" — sachlich, klar, marketing-stark

**Empfehlung:** Alt B (siehe auch Marketing-Review-Befund 2.2.1).

---

#### A-2 🟡 Hero-Subline (Wachstums-Vokabular dicht)

**Fundstelle:** [IndexPageDefault.astro:30](website-astro/src/shared/components/sections/IndexPageDefault.astro#L30)

**Original:** *„Mit fünf Basiswerten simulierst du live, wie Member, Shopper, Umsatz, Duplikation und Fluktuation über Jahre auf **Vergütung, Ziele und Teamstruktur wirken**."*

**Risiko:** „auf Vergütung … wirken" könnte als Verdienst-Versprechen gelesen werden. Niedriges Standalone-Risiko.

**Alternative:**
- **Alt A:** „… simulierst du live, wie diese Stellgrößen sich über Jahre laut Modell auf **Provisionsverlauf, Stufen-Prognose und Teamstruktur** auswirken."

**Empfehlung:** Alt A. „Provisionsverlauf" und „Stufen-Prognose" sind faktisch-deskriptiv (was die Engine liefert), „Vergütung wirken" ist suggestiv.

---

#### A-3 🟡 Hero-Proof „Sofort einsatzbereit"

**Fundstelle:** [IndexPageDefault.astro:51](website-astro/src/shared/components/sections/IndexPageDefault.astro#L51)

**Original:** *„Sofort einsatzbereit"*

**Risiko:** Niedrig. „Sofort" als absolute Aussage ist nur bei tatsächlicher Sofort-Verfügbarkeit unproblematisch.

**Alternative:**
- **Alt A:** „Ohne Installation" — sachlicher, nicht angreifbar
- **Alt B:** behalten (geringes Risiko)

---

#### A-4 🟠 Hero-Proof „Abo · als Betriebsausgabe absetzbar"

**Fundstelle:** [IndexPageDefault.astro:47](website-astro/src/shared/components/sections/IndexPageDefault.astro#L47)

**Original:** *„Abo · als Betriebsausgabe absetzbar"*

**Risiko:** §3 StBerG (Steuerberatungsvorbehalt) + §5 UWG. Pauschale Steuer-Behauptung ohne Disclaimer.

**Alternativen:**
- **Alt A:** „Abo · steuerlich geltend machbar*" mit Sternchen-Verweis auf eine Fußzeile „*Bei Nutzung im Rahmen einer Sponsoring-Tätigkeit. Steuerliche Behandlung bitte mit Steuerberater klären."
- **Alt B:** „Abo · für Sponsoren steuerlich relevant" — schwächere, sauberere Formulierung ohne Versprechen

**Empfehlung:** Alt B.

---

#### A-5 🟡 Trust-Strip „<100ms Reaktion"

**Fundstelle:** [IndexPageDefault.astro:135](website-astro/src/shared/components/sections/IndexPageDefault.astro#L135)

**Original:** *„<100ms Reaktion"*

**Risiko:** Niedrig. Performance-Behauptung müsste belegbar sein (ist sie wahrscheinlich), aber Zielgruppen-Schräge: Sponsoren verstehen das nicht.

**Alternative:**
- **Alt A:** „Sofort sichtbar" — Sponsor-Sprache
- **Alt B:** „Live-Reaktion" — kürzer, neutral

**Empfehlung:** Alt A. Bonus: Marketing-Befund 2.2.3 schon erkannt.

---

#### A-6 🟠 Trust-Strip „Believer → 3* Diamond — alle Stufen abgedeckt"

**Fundstelle:** [IndexPageDefault.astro:134](website-astro/src/shared/components/sections/IndexPageDefault.astro#L134)

**Original:** *„Believer → 3* Diamond — alle Stufen abgedeckt"*

**Risiko:** „alle Stufen abgedeckt" suggeriert Erreichbarkeit aller Stufen — kombiniert mit Mockup „Höchste Stufe: Gold, erreicht in Jahr 6" entsteht Aufstiegs-Suggestion.

**Alternative:**
- **Alt A:** „Vom Einstieg bis Diamond — alle Karrierestufen im Modell" (Begriffs-Tausch: „Karrierestufen im Modell" statt „abgedeckt")
- **Alt B:** „Alle Vergütungsphasen abgebildet" (sachlich, ohne Stufen-Aufzählung)

**Empfehlung:** Alt B.

---

#### A-7 🟠 Core-Card 02 Body (Wegmarken-Erreichbarkeits-Suggestion)

**Fundstelle:** [IndexPageDefault.astro:219](website-astro/src/shared/components/sections/IndexPageDefault.astro#L219)

**Original:** *„Der Simulator zeigt, warum Jahr 1 oft klein aussieht, **welche Zwischenziele trotzdem realistisch sind** und was 12, 24 oder 36 Monate Kontinuität bewirken. Transparenz statt Hype."*

**Risiko:** „trotzdem realistisch sind" + „was X Monate Kontinuität bewirken" = Erfolgs-Suggestion. „Transparenz statt Hype" = vergleichende Werbung gegen Wettbewerber.

**Alternative:**
- **Alt A:** „Der Simulator zeigt, warum Jahr 1 klein aussieht, **welche Wegmarken sich aus deinen Annahmen ergeben** und wie sich Kontinuität über 12, 24 oder 36 Monate im Modell auswirkt. Transparenz über das Modell, nicht über deine Zukunft."
- **Alt B:** „Der Simulator zeigt, warum Jahr 1 klein aussieht und **wie sich Kontinuität laut Modell auf den Verlauf auswirkt** — was viele Sponsoren in der Aufbauphase besser einordnen lässt."

**Empfehlung:** Alt A — behält die „Transparenz statt"-Pointe und entschärft Versprechen.

---

#### A-8 🟡 Feat-Card Ziele-Leiter Teaser

**Fundstelle:** [IndexPageDefault.astro:279](website-astro/src/shared/components/sections/IndexPageDefault.astro#L279)

**Original:** *„Produktkosten refinanziert, Auto finanziert, mietfrei wohnen, vollwertiges Einkommen — eigene Wegmarken im Jahresverlauf machen **Fortschritt greifbar**."*

**Risiko:** Wegmarken werden auch hier emotional aufgeladen aufgelistet. Konsistenz-Problem: in R-03 wurde der Block auf Features-Seite neu strukturiert — der Index-Teaser sollte mitziehen.

**Alternative:**
- **Alt A:** „**Du definierst deine Wegmarken** — Produktkosten, Auto, Miete, vollwertiges Einkommen oder eigene Ziele. Der Verlauf zeigt, in welchem Jahr deine Annahmen sie laut Modell erreichen würden."

**Empfehlung:** Alt A. Konsistenz mit R-03-Umsetzung auf Features-Seite.

---

#### A-9 🟠 Pricing-Teaser Headline „Faires Werkzeug, fairer Preis."

**Fundstelle:** [IndexPageDefault.astro:307](website-astro/src/shared/components/sections/IndexPageDefault.astro#L307)

**Original:** *„Faires Werkzeug, *fairer Preis.*"*

**Risiko:** „fair" zweimal in vier Wörtern. Bei mehrfachem Vorkommen wird „fair" zur prüfbaren Beschaffenheits-Aussage statt subjektivem Werturteil.

**Alternative:**
- **Alt A:** „Klares Werkzeug, *klarer Preis.*"
- **Alt B:** „Ein Werkzeug, *kein Lock-in.*"
- **Alt C:** „Ein Preis, *kein Risiko.*" — würde aber das „ohne Risiko"-Thema verstärken (siehe A-10)

**Empfehlung:** Alt B.

---

#### A-10 🔴 Pricing-Teaser Subline „ohne Risiko, ohne Jahresfalle"

**Fundstelle:** [IndexPageDefault.astro:309-310](website-astro/src/shared/components/sections/IndexPageDefault.astro#L309-L310)

**Original:** *„… Auch der günstigere Jahresplan bleibt monatlich kündbar — **ohne Risiko, ohne Jahresfalle.**"*

**Risiko:** „ohne Risiko" ist absolute Aussage (es gibt immer Restrisiko: Insolvenz, Service-Verschlechterung). „Jahresfalle" ist versteckte vergleichende Werbung (§6 UWG).

**Alternative:**
- **Alt A:** „… Auch der günstigere Jahresplan bleibt monatlich kündbar. **Du gehst keine Jahresbindung ein.**"
- **Alt B:** „… Auch der günstigere Jahresplan bleibt monatlich kündbar — **mit Rückerstattung anteiliger Restmonate.**"

**Empfehlung:** Alt B — macht das Differenzierungs-Merkmal noch konkreter.

---

#### A-11 🟠 Pricing-Teaser Note „Ohne Risiko:" (Wiederholung)

**Fundstelle:** [IndexPageDefault.astro:379](website-astro/src/shared/components/sections/IndexPageDefault.astro#L379)

**Original:** *„**Ohne Risiko:** Auch 6- und 12-Monats-Pläne sind monatlich kündbar. Nicht genutzte volle Restmonate erstatten wir anteilig. Du erhältst eine ordnungsgemäße Rechnung für deine Unterlagen."*

**Risiko:** Wie A-10. „Ohne Risiko" als Stempel/Aufzählungs-Anker.

**Alternative:**
- **Alt A:** „**Keine Jahresbindung:** Auch 6- und 12-Monats-Pläne sind monatlich kündbar. Nicht genutzte volle Restmonate erstatten wir anteilig. Du erhältst eine ordnungsgemäße Rechnung für deine Unterlagen."

**Empfehlung:** Alt A.

---

#### A-12 🟡 Pricing-Card Free-Tier-Feature „Magic-Link, kein Passwort"

**Fundstelle:** [IndexPageDefault.astro:331](website-astro/src/shared/components/sections/IndexPageDefault.astro#L331)

**Original:** *„Magic-Link, kein Passwort"*

**Risiko:** Niedrig. Gilt für alle Plans, aber als Free-Vorteil gelistet → suggeriert: Pro hat Passwort. Marketing-irreführend (kein Legal-Punkt).

**Alternative:**
- **Alt A:** Aus Free-Tier-Features entfernen, an anderer Stelle als universelles Trust-Signal platzieren

**Empfehlung:** Alt A. (Bereits in Marketing-Befund I-… berührt.)

---

#### A-13 🟠 Core-Card 02 Headline „Durststrecken einordnen, statt sie wegreden"

**Fundstelle:** [IndexPageDefault.astro:218](website-astro/src/shared/components/sections/IndexPageDefault.astro#L218)

**Original:** *„Durststrecken einordnen, statt sie **wegreden**."*

**Risiko:** „wegreden" impliziert, dass andere Sponsoren/Anbieter Durststrecken wegreden — leichte vergleichende Werbung gegen die Branchen-Praxis.

**Alternative:**
- **Alt A:** „Durststrecken **einordnen**, statt sie auszuhalten."
- **Alt B:** „Geduldsphasen einordnen, statt sie wegzudrücken." — entschärft, gleicher Sinn
- **Alt C:** behalten (Risiko gering)

**Empfehlung:** Alt B oder behalten (geschmacksabhängig).

---

#### A-14 🟠 FAQ-Headline „Was Sponsoren am häufigsten fragen"

**Fundstelle:** [IndexPageDefault.astro:395](website-astro/src/shared/components/sections/IndexPageDefault.astro#L395)

**Original:** *„Was Sponsoren *am häufigsten* fragen."*

**Risiko:** Suggeriert empirische Datenbasis (große Sponsoren-Reichweite mit erfassten Fragen). Mittel — §5 UWG-Risiko bei reiner Behauptung.

**Alternative:**
- **Alt A:** „Häufige Fragen — und wo wir sie ehrlich beantworten."
- **Alt B:** „Was wir oft gefragt werden."

**Empfehlung:** Alt B.

---

#### A-15 🟠 FAQ-Frage „Sind die Zahlen wirklich realistisch — oder Marketing?"

**Fundstelle:** [IndexPageDefault.astro:401](website-astro/src/shared/components/sections/IndexPageDefault.astro#L401)

**Original:** *„Sind die Zahlen wirklich **realistisch** — oder Marketing?"*

**Risiko:** Niedriges Risiko in der Frage selbst. Aber Konsistenz-Problem mit der bereits umgesetzten R-01-Antwort: die Antwort spricht nicht mehr von „realistisch", die Frage tut es noch.

**Alternative:**
- **Alt A:** „Sind die Zahlen wirklich **belastbar** — oder Marketing?"
- **Alt B:** „Wie kommen die Zahlen zustande — und sind sie Marketing?"

**Empfehlung:** Alt B — passt direkt zur R-01-Antwort, die mit „Realistisch heißt: realistisch für deine Eingaben." einsteigt. Alt B macht die Antwort zur logischen Folge der Frage.

---

#### A-16 🟠 FAQ-Antwort „Komprimierung wird korrekt berücksichtigt"

**Fundstelle:** [IndexPageDefault.astro:421](website-astro/src/shared/components/sections/IndexPageDefault.astro#L421)

**Original:** *„Alle drei Phasen des Vergütungsplans sind in der Engine abgebildet … Komprimierung wird **korrekt** berücksichtigt."*

**Risiko:** „korrekt" ist objektive, prüfbare Aussage. Bei jeder Abweichung von der Plan-Praxis = §5 UWG.

**Alternative:**
- **Alt A:** „… **Komprimierung ist nach den im Plan dokumentierten Regeln abgebildet.**"
- **Alt B:** „… **Komprimierung ist berücksichtigt.**" (knapper)

**Empfehlung:** Alt A — sauber, sachlich, nicht angreifbar.

---

#### A-17 🟠 FAQ-Antwort „Genau dafür ist es gebaut. Fünf Slider sind in 30 Sekunden erklärt."

**Fundstelle:** [IndexPageDefault.astro:432](website-astro/src/shared/components/sections/IndexPageDefault.astro#L432)

**Original:** *„Genau dafür ist es gebaut. Fünf Slider sind in **30 Sekunden** erklärt. …"*

**Risiko:** Niedriges Risiko. „30 Sekunden" als konkrete Behauptung muss belegbar sein.

**Alternative:**
- **Alt A:** „Genau dafür ist es gebaut. Fünf Slider sind **schnell erklärt.**"
- **Alt B:** behalten (geringes Risiko, Marketing-stark)

**Empfehlung:** Behalten. „30 Sekunden" ist eine glaubwürdige Performance-Aussage, die im Streitfall mit einem Video belegbar ist.

---

#### A-18 🟠 FAQ-Antwort „Die Engine wird nachgezogen"

**Fundstelle:** [IndexPageDefault.astro:466](website-astro/src/shared/components/sections/IndexPageDefault.astro#L466)

**Original:** *„Die Engine wird nachgezogen, sobald ein offizielles Update erscheint. Du arbeitest immer mit dem aktuellen Stand — **kein manuelles Update auf deiner Seite.**"*

**Risiko:** „immer mit dem aktuellen Stand" + „nachgezogen, sobald" sind Versprechen ohne Frist. Bei Verzögerungen abmahnbar.

**Alternative:**
- **Alt A:** „Die Engine wird **in der Regel zeitnah** an Plan-Updates angepasst. Du arbeitest mit dem jeweils integrierten Stand — kein manuelles Update auf deiner Seite."
- **Alt B:** „Bei offiziellen Plan-Updates pflegen wir die Engine zeitnah nach. Die genauen Bedingungen ergeben sich aus den AGB."

**Empfehlung:** Alt A.

---

#### A-19 🟠 Final-CTA „Keine Folien, kein Hype"

**Fundstelle:** [IndexPageDefault.astro:487](website-astro/src/shared/components/sections/IndexPageDefault.astro#L487)

**Original:** *„… Slider bewegen, Verlauf anschauen, Zwischenziele setzen. **Keine Folien, kein Hype.**"*

**Risiko:** „kein Hype" ist vergleichende Werbung gegen Wettbewerber-Praxis. Niedrig-Mittel.

**Alternative:**
- **Alt A:** „… Slider bewegen, Verlauf anschauen, Zwischenziele setzen. **Eine Berechnung, kein Vortrag.**"
- **Alt B:** „… Slider bewegen, Verlauf anschauen, Zwischenziele setzen. **In wenigen Minuten zum eigenen Bild.**"

**Empfehlung:** Alt B — aktivierend statt vergleichend.

---

### B) FeaturesPageDefault.astro

#### B-1 🟡 Feature 01 Slider Body „was er für realistisch hält"

**Fundstelle:** [FeaturesPageDefault.astro:35](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L35)

**Original:** *„… stellt selbst ein, **was er für realistisch hält**. Jede Änderung berechnet die Entwicklung über die Zeit sofort neu."*

**Risiko:** Niedrig — „realistisch" bezieht sich auf die Selbst-Einschätzung des Interessenten, nicht auf Anbieter-Aussage.

**Alternativen:**
- **Alt A:** „… stellt selbst ein, **was er sich zutraut**." (aktivierend)
- **Alt B:** „… stellt selbst ein, **was er für plausibel hält**."

**Empfehlung:** Alt A.

---

#### B-2 🟠 Feature 01 Bullet „Fluktuation — ehrliche Reibung"

**Fundstelle:** [FeaturesPageDefault.astro:45](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L45)

**Original:** *„**Fluktuation** — **ehrliche Reibung**, statt mathematischer Märchenwelt."*

**Risiko:** „ehrlich" als Werbe-Attribut. „mathematischer Märchenwelt" als Pseudo-vergleichende Werbung.

**Alternative:**
- **Alt A:** „**Fluktuation** — **Schwund einrechnen**, statt mathematischer Märchenwelt."
- **Alt B:** „**Fluktuation** — **realer Schwund** wird mitkalkuliert."
- **Alt C:** „**Fluktuation** — **die Reibung, die jedes Team hat**, ist im Modell drin."

**Empfehlung:** Alt A.

---

#### B-3 🔴 Feature 02 Body „Das ist die Wahrheit jedes Netzwerks"

**Fundstelle:** [FeaturesPageDefault.astro:80](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L80)

**Original:** *„Im 1. Jahr passiert wenig. Im 4. wird's spürbar. Ab dem 7. wird's eindrucksvoll. **Das ist die Wahrheit jedes Netzwerks** — und die einzige Visualisierung, die diese Geschichte **ehrlich erzählt**, ist der Verlauf."*

**Risiko:** **Stärkste Häufung der Site.** Drei Probleme:
- „Im 4. wird's spürbar. Ab dem 7. wird's eindrucksvoll" = Typizitätsbehauptung über Netzwerk-Verläufe
- „Wahrheit jedes Netzwerks" = absolute Aussage
- „ehrlich erzählt" = Werbe-Attribut
- „einzige Visualisierung" = unzulässige Alleinstellungs-Behauptung (§5 UWG)

**Alternative:**
- **Alt A:** „Im 1. Jahr ist die Berechnung flach. Im 4. wird die Kurve im Modell sichtbar. Ab dem 7. läuft sie steiler. **So zeigt der Simulator die Wirkung von Zeit im Netzwerk** — eine Perspektive, die in Tabellen und Folien schwer fassbar bleibt."
- **Alt B:** „Anfangs ist die Modell-Kurve flach. Ab der Mitte wird sie steiler. Genau diese Dynamik macht der Verlauf sichtbar — eine Perspektive, die Tabellen nicht leisten."

**Empfehlung:** Alt A.

---

#### B-4 🟡 Feature 02 Bullet „Live-Update — sofort"

**Fundstelle:** [FeaturesPageDefault.astro:85](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L85)

**Original:** *„**Live-Update** — bewegt er einen Slider, biegt sich die Kurve **sofort** mit. Keine Ladezeit, keine Submit-Buttons."*

**Risiko:** Niedrig. „sofort" ist Performance-Aussage, faktisch korrekt.

**Empfehlung:** Behalten.

---

#### B-5 🟠 Feature 03 Headline „Vom Believer zum Diamond. Und wann?"

**Fundstelle:** [FeaturesPageDefault.astro:153](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L153)

**Original:** *„Vom Believer zum *Diamond.* **Und wann?**"*

**Risiko:** „Und wann?" suggeriert: nicht ob, sondern wann. Implizite Garantie des Aufstiegs.

**Alternative:**
- **Alt A:** „Vom Believer zum *Diamond.* **In welchem Jahr laut Modell?**"
- **Alt B:** „Vom Believer bis Diamond — **wann erreichen deine Annahmen welche Stufe?**"
- **Alt C:** „Stufen-Prognose. **Vom Einstieg bis Diamond.**" (ganz neutralisiert)

**Empfehlung:** Alt B.

---

#### B-6 🟠 Feature 03 Body „basierend auf seinen eigenen Werten"

**Fundstelle:** [FeaturesPageDefault.astro:155](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L155)

**Original:** *„… {brand.siteName} zeigt nicht nur, **ob er aufsteigt**, sondern in welchem Jahr — basierend auf seinen eigenen Werten."*

**Risiko:** „ob er aufsteigt" kombiniert mit „in welchem Jahr" suggeriert Aufstiegs-Sicherheit.

**Alternative:**
- **Alt A:** „… {brand.siteName} zeigt, **welche Stufe laut Modell wann erreicht wird** — basierend auf seinen eigenen Slider-Werten."
- **Alt B:** „… zeigt, **welche Karrierestufen seine Annahmen rechnerisch in welchem Jahr ergeben.**"

**Empfehlung:** Alt A.

---

#### B-7 🟠 Feature 03 Bullet „er sieht sofort, wie weit sein Szenario trägt"

**Fundstelle:** [FeaturesPageDefault.astro:158](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L158)

**Original:** *„**Erreichte Stufen markiert** — er sieht sofort, **wie weit sein Szenario trägt**."*

**Risiko:** „wie weit sein Szenario trägt" suggeriert reale Tragfähigkeit.

**Alternative:**
- **Alt A:** „**Erreichte Stufen markiert** — er sieht, **welche Stufen das Modell mit seinen Werten ausgibt.**"
- **Alt B:** „**Erreichte Stufen markiert** — er sieht das Modell-Ergebnis sofort."

**Empfehlung:** Alt B.

---

#### B-8 🔴 Feature 03 Mockup KPIs

**Fundstellen:**
- [FeaturesPageDefault.astro:170-181](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L170-L181) — „Netzwerk · Jahr 10: 412" + „Höchste Stufe: Gold, erreicht in Jahr 6"
- [FeaturesPageDefault.astro:184-188](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L184-L188) — Stufen-Tabelle mit Jahreszahlen J1, J2, J3, J5, J6

**Risiko:** Gleicher Mechanismus wie R-03 (Ziele-Leiter): konkrete Jahres-Versprechen suggerieren Planbarkeit. **Identisches Abmahnrisiko.**

**Alternative — Konsistenz mit R-03-Lösung:**
- KPI-Block: „Höchste Stufe: Gold" — **Jahresangabe entfernen** oder durch „laut Beispiel-Modell" relativieren
- Stufen-Tabelle: **Jahreszahlen entfernen** oder durch „J1–J?" als Range darstellen
- Header umbenennen: „Beispiel-Aufstieg laut Modell" statt „Aufstieg über 10 Jahre"

**Empfehlung:** Komplett-Umbau analog zur Ziele-Leiter aus R-03:
- KPI-Box „Netzwerk · Jahr 10: 412" → behalten, ist Strukturwert, neutral
- KPI-Box „Höchste Stufe: Gold / erreicht in Jahr 6" → ändern zu „Höchste Stufe: **Gold (Beispiel)** / erreicht in: **Jahr X laut Modell**"
- Stufen-Tabelle Header → „Beispiel-Aufstieg · Modell-Ergebnis"
- Jahreszahlen-Spalte → entweder entfernen oder durch Symbol/Marker ersetzen, der mit Tooltip „Jahr ergibt sich aus deinen Slider-Werten" erklärt wird

**Hinweis:** Diese Umsetzung ist umfangreicher (CSS + HTML-Struktur). Wenn dringlich, kann ich einen separaten Umsetzungs-Plan analog zu R-03 erstellen.

---

#### B-9 🟠 Feature 04 Headline „Vom einfachen Wachstum bis zur realen Team-Dynamik"

**Fundstelle:** [FeaturesPageDefault.astro:208](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L208)

**Original:** *„Drei Modelle. *Vom einfachen Wachstum bis zur **realen Team-Dynamik.***"*

**Risiko:** „realen Team-Dynamik" + „Wachstum" als Versprechen. Mittel.

**Alternative:**
- **Alt A:** „Drei Modelle. *Vom linearen Wachstum bis zur differenzierten Team-Dynamik.*"
- **Alt B:** „Drei Modelle. *Von linear bis lebensnah.*"

**Empfehlung:** Alt B (kürzer + stärker).

---

#### B-10 🟠 Feature 04 Body „realistischere Modelle / mehr Realität"

**Fundstelle:** [FeaturesPageDefault.astro:210](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L210)

**Original:** *„Nicht jedes Team wächst gleich. Ein einfaches Modell hilft beim Einstieg, **realistischere Modelle** zeigen Streuung und Dynamik. Starte einfach und schalte bei Bedarf **mehr Realität** hinzu."*

**Risiko:** Doppelte Verwendung von „Realität". §5 UWG-Risiko.

**Alternative:**
- **Alt A:** „Nicht jedes Team wächst gleich. Ein einfaches Modell hilft beim Einstieg, **differenziertere Modelle** zeigen Streuung und Dynamik. Starte einfach und schalte bei Bedarf **mehr Differenzierung** hinzu."

**Empfehlung:** Alt A.

---

#### B-11 🟡 Feature 04 Bullet „Standard — alle Teams wachsen gleichmäßig"

**Fundstelle:** [FeaturesPageDefault.astro:213](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L213)

**Original:** *„**Standard** — alle Teams wachsen gleichmäßig. Klare Einstiegs-Sicht für das erste Gespräch."*

**Risiko:** Niedrig. „wachsen" als Modell-Beschreibung okay.

**Empfehlung:** Behalten.

---

#### B-12 🟠 Feature 04 Bullet „Momentum — realitätsnah / echte Team-Erfahrung"

**Fundstelle:** [FeaturesPageDefault.astro:215](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L215)

**Original:** *„**Momentum** — **realitätsnah**: einzelne Beine entwickeln Dynamik, andere bleiben kleiner. **Spiegelt echte Team-Erfahrung.**"*

**Risiko:** Mittel. Wie Feature 02 Body: „realitätsnah" + „echte" als doppelte Realismus-Behauptung.

**Alternative:**
- **Alt A:** „**Momentum** — einzelne Beine entwickeln Dynamik, andere bleiben kleiner. **Spiegelt die Streuung wieder, die viele Teams beschreiben.**"
- **Alt B:** „**Momentum** — **mit Schwung-Effekt:** einzelne Beine entwickeln Dynamik, andere bleiben kleiner."

**Empfehlung:** Alt A.

---

#### B-13 🟠 Feature 04 Mockup-Captions

**Fundstellen:**
- [FeaturesPageDefault.astro:233](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L233) — „Gleichmäßig — alle Beine im Gleichschritt."
- [FeaturesPageDefault.astro:242](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L242) — „Streuung — Bandbreite statt Durchschnitt."
- [FeaturesPageDefault.astro:251](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L251) — „Stärkere und schwächere Beine."

**Risiko:** Niedrig — sachliche Modell-Beschreibungen.

**Empfehlung:** Behalten.

---

#### B-14 🟡 Lite-Feature „Sub-100ms-Reaktion"

**Fundstelle:** [FeaturesPageDefault.astro:431-437](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L431-L437)

**Original:** *„**Sub-100ms-Reaktion** · Slider bewegen, Zahl springt. Keine Wartezeit unterbricht den Gesprächsfluss."*

**Risiko:** Niedrig. Wie A-5.

**Alternative:**
- **Alt A:** „**Sofort-Reaktion**" als Titel; Body „Slider bewegen, Zahl springt sofort." (Sponsor-Sprache)

**Empfehlung:** Alt A.

---

### C) PricingPageDefault.astro

Die Pricing-Page ist dynamisch durch YAML — kritische Stellen siehe Block D (pricing.yaml).

#### C-1 🟡 Pricing-Hero h1 + sub

**Fundstellen über YAML:** [pricing.yaml:6-8](website-astro/src/brands/lifeplus/content/pricing.yaml#L6-L8)

Siehe D-1.

---

### D) pricing.yaml (LifePlus)

#### D-1 🟠 Pricing-Hero subHtml „Bezahlpläne sind als Betriebsausgabe absetzbar"

**Fundstelle:** [pricing.yaml:8](website-astro/src/brands/lifeplus/content/pricing.yaml#L8)

**Original:** *„… Die Bezahlpläne sind als **Betriebsausgabe** absetzbar."*

**Risiko:** §3 StBerG + §5 UWG. Wie A-4.

**Alternative:**
- **Alt A:** „… Bei Nutzung im Rahmen einer Sponsoring-Tätigkeit sind die Bezahlpläne **steuerlich relevant.** Bitte mit Steuerberater klären."

**Empfehlung:** Alt A.

---

#### D-2 🟠 Pricing-FAQ „Ist LifeFlow360 als Betriebsausgabe absetzbar?"

**Fundstelle:** [pricing.yaml:143-146](website-astro/src/brands/lifeplus/content/pricing.yaml#L143-L146)

**Original:** *„Für Sponsoren, die mit dem Abo ihre Sponsoring-Tätigkeit unterstützen, ist es **in aller Regel als Betriebsausgabe absetzbar**. Die Rechnung enthält alle steuerlich relevanten Angaben. // Wir sind keine Steuerberater — sprich im Zweifelsfall mit deinem."*

**Risiko:** „in aller Regel als Betriebsausgabe absetzbar" ist pauschale Steuer-Auskunft. §3 StBerG. Der Disclaimer mildert das Risiko, hebt es aber nicht auf.

**Alternative:**
- **Alt A:** „**Frage:** Kann ich das Abo steuerlich geltend machen?
   **Antwort:** Wenn du den Pro-Plan im Rahmen deiner Sponsoring-Tätigkeit nutzt, kann das Abo steuerlich relevant sein. Die konkrete steuerliche Behandlung hängt von deiner Situation ab und ist mit deinem Steuerberater zu klären. Wir stellen eine ordnungsgemäße Rechnung aus."

**Empfehlung:** Alt A. Plus Frage-Titel umformulieren: „**Kann ich das Abo steuerlich geltend machen?**" statt der direkten Bejahung „Ist LifeFlow360 als Betriebsausgabe absetzbar?".

---

#### D-3 🟠 Pricing-Note „Jahresrabatt ohne Jahresfalle"

**Fundstelle:** [pricing.yaml:94-95](website-astro/src/brands/lifeplus/content/pricing.yaml#L94-L95)

**Original:** *„**Jahresrabatt ohne Jahresfalle.** Automatisch verlängert? Kein Problem. Wir sind von unserem Nutzen überzeugt — und du hoffentlich auch. Wenn du aber nicht weitermachen möchtest, kündigst du einfach monatlich. Was du an vollen Restmonaten schon bezahlt hast, bekommst du anteilig zurück."*

**Risiko:** „Jahresfalle" = §6 UWG vergleichende Werbung (siehe A-10/A-11).

**Alternative:**
- **Alt A — Titel:** „**Jahresrabatt ohne Jahresbindung.**"
- **Alt A — Body:** „Auch der Jahresplan verlängert sich automatisch — du kannst aber jederzeit monatlich kündigen. Nicht genutzte volle Restmonate erstatten wir anteilig."

**Empfehlung:** Alt A (Titel + Body).

---

#### D-4 🟠 Pricing-Cards „Halber Monat gratis" / „2 Monate gratis"

**Fundstellen:**
- [pricing.yaml:52](website-astro/src/brands/lifeplus/content/pricing.yaml#L52) — „Halber Monat gratis"
- [pricing.yaml:59](website-astro/src/brands/lifeplus/content/pricing.yaml#L59) — „halber Monat gratis"
- [pricing.yaml:73](website-astro/src/brands/lifeplus/content/pricing.yaml#L73) — „2 Monate gratis"
- [pricing.yaml:80](website-astro/src/brands/lifeplus/content/pricing.yaml#L80) — „2 Monate gratis"

**Risiko:** §5 UWG. „gratis" für Rabattierungen ist heikel — Kunde zahlt tatsächlich, nur weniger.

**Alternativen:**
- 6-Monats-Badge „Halber Monat gratis" → **„Halbjahres-Vorteil"** oder **„8 % sparen"**
- 12-Monats-Badge „2 Monate gratis" → **„Jahres-Vorteil"** oder **„17 % sparen"**
- Billed-Texte analog umformulieren

**Empfehlung:** Prozent-Variante („8 % sparen" / „17 % sparen"). Klar, sachlich, juristisch sauber, marketing-stark.

---

#### D-5 🟠 Pricing-Tier-CTA „Plan jetzt starten" (auch bei Free)

**Fundstellen:**
- [pricing.yaml:29](website-astro/src/brands/lifeplus/content/pricing.yaml#L29) — Free
- [pricing.yaml:47](website-astro/src/brands/lifeplus/content/pricing.yaml#L47) — 1 Monat
- [pricing.yaml:67](website-astro/src/brands/lifeplus/content/pricing.yaml#L67) — 6 Monate
- [pricing.yaml:88](website-astro/src/brands/lifeplus/content/pricing.yaml#L88) — 12 Monate

**Risiko:** §5a UWG (irreführendes Unterlassen). Bei Free-Tier suggeriert „Plan jetzt starten" eine kostenpflichtige Aktion.

**Alternative:**
- Free: **„Kostenlos starten"**
- 1 Monat: **„1 Monat starten"** oder **„Monatlich starten"**
- 6 Monate: **„6 Monate starten"** oder **„Halbjährlich starten"**
- 12 Monate: **„12 Monate starten"** oder **„Jährlich starten"**

**Empfehlung:** Free → „Kostenlos starten"; kostenpflichtige Tiers → „[Laufzeit] starten" je Tier.

---

#### D-6 🟡 Pricing-Hero h1Html „Ein Werkzeug. Vier klare Optionen."

**Fundstelle:** [pricing.yaml:7](website-astro/src/brands/lifeplus/content/pricing.yaml#L7)

**Original:** *„Ein Werkzeug.<br><em>Vier klare Optionen.</em>"*

**Risiko:** Niedrig. Ungenau — Free ist kein „Plan", suggeriert aber 4 zahlpflichtige Optionen.

**Alternative:**
- **Alt A:** „Ein Werkzeug.<br><em>Vier Einstiegspunkte.</em>"
- **Alt B:** „Ein Werkzeug.<br><em>Vier Wege rein.</em>"

**Empfehlung:** Alt A.

---

#### D-7 🟡 Pricing-FAQ „Brauche ich für jeden meiner Interessenten ein eigenes Abo?"

**Fundstelle:** [pricing.yaml:153-156](website-astro/src/brands/lifeplus/content/pricing.yaml#L153-L156)

**Original:** *„… **Wenn dein Interessent das Tool selbst nutzen möchte (nachdem er Sponsor geworden ist)**, schließt er ein eigenes Abo ab."*

**Risiko:** „nachdem er Sponsor geworden ist" suggeriert den Anwerbe-Prozess als gegebenen Ablauf — §16 UWG-Verdacht in Kontext.

**Alternative:**
- **Alt A:** „Nein. Ein Abo ist auf dich als Sponsor lizenziert. Du nutzt es für beliebig viele Gespräche … Wenn ein Interessent das Tool **später eigenständig nutzen möchte**, schließt er ein eigenes Abo ab."

**Empfehlung:** Alt A. Macht den Sponsoring-Prozess weniger als „Pfad" sichtbar.

---

#### D-8 🟡 SEO-Description in pricing.yaml

**Fundstelle:** [pricing.yaml:3](website-astro/src/brands/lifeplus/content/pricing.yaml#L3)

**Original:** *„LifeFlow360 · Frei starten oder Pro mit 1, 6 oder 12 Monaten Laufzeit nutzen. Alle Pro-Pläne mit vollem Funktionsumfang, **als Betriebsausgabe absetzbar.**"*

**Risiko:** Wie D-1. Steuer-Aussage in SEO-Description.

**Alternative:**
- **Alt A:** „LifeFlow360 · Frei starten oder Pro mit 1, 6 oder 12 Monaten Laufzeit nutzen. Alle Pro-Pläne mit vollem Funktionsumfang. **Für Sponsoren steuerlich relevant.**"

**Empfehlung:** Alt A.

---

### E) brand.yaml (LifePlus)

#### E-1 🟠 Lockup-Tagline „BESSER VERSTEHEN. STÄRKER WACHSEN."

**Fundstelle:** [brand.yaml:24](website-astro/src/brands/lifeplus/brand.yaml#L24)

**Original:** *„BESSER VERSTEHEN. **STÄRKER WACHSEN.**"*

**Risiko:** „STÄRKER WACHSEN" als Brand-Tagline ist im Network-Marketing-Kontext §16 UWG-Verdacht (Wachstums-Versprechen). Als Tagline (Brand-Element) etwas weniger angreifbar als in Body-Copy, aber sichtbar im Header auf jeder Seite.

**Alternativen:**
- **Alt A:** „BESSER VERSTEHEN. **KLARER PLANEN.**"
- **Alt B:** „BESSER VERSTEHEN. **MEHR SEHEN.**"
- **Alt C:** „BESSER VERSTEHEN. **STÄRKER FÜHREN.**" (für Sponsoren als Führungs-Anker)

**Empfehlung:** Alt C — bleibt motivierend, ohne Wachstums-Versprechen.

---

### F) Zusammenfassung — Bereits umgesetzt / On Hold

| Stelle | Status |
|---|---|
| Hero-Mockup-Delta (IPD:70) | ✅ R-02 |
| Hero-Mockup-Zahl & Annotations (IPD:64-71, 113-114) | ✅ R-02 |
| Index-FAQ-Antwort 1 (IPD:404-411) | ✅ R-01 |
| Ziele-Leiter Body + Bullets (FPD:269-284) | ✅ R-03 |
| Ziele-Leiter Mockup (FPD:293-319) | ✅ R-03 |
| AGB §13 (LegalAgbDefault.astro:155-181) | ✅ R-05 |
| Impressum Domain-Zeile | ✅ R-06 |
| Datenschutz §1 Domain | ✅ R-06 |
| AGB-Vorlage-Hinweis Footer | ⏸ R-04 (on hold bis Anwalt) |
| Kontaktformular + Checkboxen | 📋 R-07 (Wiedervorlage) |

---

### G) Konsolidierte Mapping-Tabelle (für deine Entscheidung)

Trage in der Spalte „Deine Wahl" ein: `A` / `B` / `C` / `behalten` / Custom-Text.

| # | Stelle | Risiko | Empfehlung | Deine Wahl |
|---|---|---|---|---|
| A-1 | Hero-Headline | 🟠 | B | _____ |
| A-2 | Hero-Subline | 🟡 | A | _____ |
| A-3 | Hero-Proof „Sofort einsatzbereit" | 🟡 | behalten | _____ |
| A-4 | Hero-Proof Steuer | 🟠 | B | _____ |
| A-5 | Trust-Strip „<100ms" | 🟡 | A | _____ |
| A-6 | Trust-Strip Believer→Diamond | 🟠 | B | _____ |
| A-7 | Core-Card 02 Body | 🟠 | A | _____ |
| A-8 | Feat-Card Ziele-Teaser | 🟡 | A | _____ |
| A-9 | Pricing-Teaser „Fair/Fair" | 🟠 | B | _____ |
| A-10 | Pricing-Teaser „ohne Risiko" | 🔴 | B | _____ |
| A-11 | Pricing-Note „Ohne Risiko:" | 🟠 | A | _____ |
| A-12 | Free-Tier „Magic-Link" | 🟡 | A | _____ |
| A-13 | Core-Card 02 Headline „wegreden" | 🟠 | B/behalten | _____ |
| A-14 | FAQ-Headline | 🟠 | B | _____ |
| A-15 | FAQ-Frage „realistisch" | 🟠 | B | _____ |
| A-16 | FAQ „Komprimierung korrekt" | 🟠 | A | _____ |
| A-17 | FAQ „30 Sekunden" | 🟠 | behalten | _____ |
| A-18 | FAQ „Engine wird nachgezogen" | 🟠 | A | _____ |
| A-19 | Final-CTA „Keine Folien, kein Hype" | 🟠 | B | _____ |
| B-1 | Feature 01 „was er für realistisch hält" | 🟡 | A | _____ |
| B-2 | Feature 01 „ehrliche Reibung" | 🟠 | A | _____ |
| B-3 | Feature 02 „Wahrheit/ehrlich" | 🔴 | A | _____ |
| B-4 | Feature 02 „Live-Update sofort" | 🟡 | behalten | _____ |
| B-5 | Feature 03 Headline „Und wann?" | 🟠 | B | _____ |
| B-6 | Feature 03 Body „ob er aufsteigt" | 🟠 | A | _____ |
| B-7 | Feature 03 Bullet „Szenario trägt" | 🟠 | B | _____ |
| B-8 | Feature 03 Mockup (KPI + Stufen-Tabelle) | 🔴 | analog R-03 | _____ |
| B-9 | Feature 04 Headline „reale Team-Dynamik" | 🟠 | B | _____ |
| B-10 | Feature 04 Body „realistischere / Realität" | 🟠 | A | _____ |
| B-11 | Feature 04 Bullet „Standard wachsen" | 🟡 | behalten | _____ |
| B-12 | Feature 04 „Momentum realitätsnah" | 🟠 | A | _____ |
| B-13 | Feature 04 Mockup-Captions | 🟡 | behalten | _____ |
| B-14 | Lite „Sub-100ms-Reaktion" | 🟡 | A | _____ |
| D-1 | Pricing-Hero subHtml Steuer | 🟠 | A | _____ |
| D-2 | Pricing-FAQ Betriebsausgabe | 🟠 | A | _____ |
| D-3 | Pricing-Note „Jahresfalle" | 🟠 | A | _____ |
| D-4 | Pricing-Cards „gratis"-Badges (×2) | 🟠 | „% sparen"-Variante | _____ |
| D-5 | Pricing-CTAs „Plan jetzt starten" (×4) | 🟠 | per Tier | _____ |
| D-6 | Pricing-Hero h1 „Vier klare Optionen" | 🟡 | A | _____ |
| D-7 | Pricing-FAQ „eigenes Abo" | 🟡 | A | _____ |
| D-8 | Pricing SEO-Description | 🟡 | A | _____ |
| E-1 | Brand-Tagline „STÄRKER WACHSEN" | 🟠 | C | _____ |

---

### Priorisierungs-Empfehlung

**Wenn du nur 5 Sachen ändern willst** (höchster Hebel/Risiko-Reduktion):
1. **B-3** — Feature 02 „Wahrheit jedes Netzwerks" (🔴 Hochrisiko)
2. **B-8** — Feature 03 Mockup (🔴 Stufen-Mockup mit Jahreszahlen, analog R-03)
3. **A-10 / A-11** — „Ohne Risiko" (🔴 zweifach prominent)
4. **D-5** — Pricing-CTAs differenzieren (Free vs. Pro)
5. **E-1** — Brand-Tagline „STÄRKER WACHSEN" (überall sichtbar im Header)

**Sitewide-Umsetzung des kompletten Sets:** Ich kann nach deinem Mapping alle 41 Stellen in einem Sweep umsetzen — geschätzt 2-3h Arbeit. Aufwand für B-8 (Mockup-Umbau analog R-03) zusätzlich 1-2h.

**Tagline-Hinweis:** Änderung von „STÄRKER WACHSEN" muss parallel in [brands/fitline/brand.yaml:23](website-astro/src/brands/fitline/brand.yaml#L23) und [brands/eqology/brand.yaml:23](website-astro/src/brands/eqology/brand.yaml#L23) mitgezogen werden, sonst entstehen Tagline-Divergenzen. (Aktuell out of scope, aber Konsistenz-Hinweis.)

---

## G-Befunde — Entscheidungs- und Umsetzungs-Stand (2026-05-30)

### Im Code umgesetzt

| G | Datei | Was |
|---|---|---|
| **G-01** | [FeaturesPageDefault.astro:282](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L282) + Mockup-Zeile | Bullet umformuliert: „**Eigenes Einkommensziel** — du definierst, ab welcher Provisionshöhe das Modell den Punkt markiert." Mockup-Name analog. |
| **G-07** | [IndexPageDefault.astro:469](website-astro/src/shared/components/sections/IndexPageDefault.astro#L469) | „Die Engine wird in der Regel zeitnah an Plan-Updates angepasst. Du arbeitest mit dem jeweils integrierten Stand — kein manuelles Update auf deiner Seite." |
| **G-08** | [pricing.yaml:143-146](website-astro/src/brands/lifeplus/content/pricing.yaml#L143-L146) | Frage umformuliert + Antwort entschärft + Hinweis auf Rechnung |
| **G-09** | [IndexPageDefault.astro:47](website-astro/src/shared/components/sections/IndexPageDefault.astro#L47) + [pricing.yaml:96-98](website-astro/src/brands/lifeplus/content/pricing.yaml#L96-L98) | Hero-Proof: „Abo · für Sponsoren steuerlich relevant"; Pricing-Note „Saubere Rechnung" entschärft |
| **G-10** | [LegalDatenschutzDefault.astro §6](website-astro/src/shared/components/sections/LegalDatenschutzDefault.astro) | §6 komplett neu: Liste mit 4 konkreten Datenverarbeitungen (Magic Link, Paddle, Schriftarten, Service-Worker) |
| **G-11** | [LegalDatenschutzDefault.astro §1](website-astro/src/shared/components/sections/LegalDatenschutzDefault.astro) | „Eingaben im Simulator" → präziser, mit Abgrenzung Account-Daten serverseitig. Wie gewünscht: „Eingaben" (nicht „Slider-Eingaben") |
| **G-13** | [LegalAgbDefault.astro §7](website-astro/src/shared/components/sections/LegalAgbDefault.astro) | Geräte-Klausel + Auto-Logout-Regel + Hinweis auf Geräteliste im Account |
| **G-14** | [LegalAgbDefault.astro §1](website-astro/src/shared/components/sections/LegalAgbDefault.astro) | Neuer Absatz: AGB für Verbraucher (§13) und Unternehmer (§14) gleichermaßen, abweichende Regelungen werden gekennzeichnet |
| **G-16** | [pricing.yaml:73](website-astro/src/brands/lifeplus/content/pricing.yaml#L73) | Badge: „Empfehlung · 2 Monate sparen ggü. Monatsabo" |
| **G-18** | [pricing.yaml:17](website-astro/src/brands/lifeplus/content/pricing.yaml#L17) | Free-desc: „14 Tage Pro testen — danach automatisch zurück in Free." |
| **G-19** | [pricing.yaml:43](website-astro/src/brands/lifeplus/content/pricing.yaml#L43) + [IndexPageDefault.astro:351](website-astro/src/shared/components/sections/IndexPageDefault.astro#L351) | „Mobil, Tablet & Desktop (bis zu 3 Geräte)" |
| **G-21** | [LegalImpressumDefault.astro](website-astro/src/shared/components/sections/LegalImpressumDefault.astro) | OS-Plattform-Link ergänzt, Schlichtungs-Aussage bleibt |

### Wiedervorlage / Status

- **G-12** (Widerruf-Vorzeit-Erlöschen, Checkboxen): → **R-07-Wiedervorlage** (gemeinsam mit den vier Checkbox-ToDos: Kontaktformular, AGB-Einwilligung, Datenschutz-Einwilligung, Widerruf-Verzicht). Dort eingegliedert.
- **G-15** (PAngV / Brutto-Preise): **zurückgestellt** — Angebot richtet sich an Sponsoren als Selbständige. Hinweis: Falls jemals Verbraucher direkt angesprochen werden, muss G-15 wieder hochpriorisiert werden.
- **G-22** (Telefonnummer): **geschlossen** — Telefon ist im Impressum, das genügt rechtlich. Mailto-Footer-Kontakt bleibt.

### G-06 Code-Check-Ergebnis

Frage war: Bezieht sich „Komprimierung wird korrekt berücksichtigt" auf eine alte Methode, die mit Umstellung auf Personenbaum entfernt wurde?

**Antwort:** Nein. Komprimierung ist auch in der aktiven Personenbaum-Engine implementiert ([packages/product-lifeplus/src/tree-compensation.ts:143](packages/product-lifeplus/src/tree-compensation.ts#L143)). Der Hauptpfad nutzt `calculateTreeMonth` ([packages/simulator-core/src/simulation.ts:105-114](packages/simulator-core/src/simulation.ts#L105-L114)), und auch dort wird komprimiert (sichtbar im `reason`-Feld der Payouts).

**Konsequenz:** Aussage bleibt inhaltlich, aber „**korrekt**" muss entschärft werden (rechtlich kritisch, weil objektiv prüfbar). Vorschlag siehe A-16 oben („Komprimierung ist nach den im Plan dokumentierten Regeln abgebildet."). → **steht zur Mapping-Entscheidung mit R-08 erweitert.**

---

## Neue Vorschläge zur Entscheidung

### G-02 — FAQ-Headline (Index)

**User-Vorgabe als Basis:** „Häufige Fragen und Fragestellungen aus Gesprächen"

**Bessere Varianten:**

| # | Variante | Bewertung |
|---|---|---|
| G-02-A | „Häufige Fragen aus Gesprächen" | knapp, gleichwertig zur User-Vorgabe |
| G-02-B | „Fragen, die im Gespräch immer wieder auftauchen." | erzählerisch, passt zum Sponsor-Gesprächs-Thema |
| G-02-C | „Was Sponsoren *im Gespräch* fragen — und was wir antworten." | aktivierend, hält die Eyebrow-Italic-Struktur |
| G-02-D | „Fragen aus Sponsoren-Gesprächen." | sehr knapp, klar |

**Empfehlung:** G-02-C. Marketing-stärker als die User-Vorgabe, behält die Italic-Struktur der bestehenden Headlines („*am häufigsten*" → „*im Gespräch*") und ist juristisch sauber (keine Reichweiten-Behauptung).

---

### G-03 — Trust-Strip „Believer → 3* Diamond — alle Stufen abgedeckt"

**Deine Klarstellung:** Es geht um die Abdeckung **aller Stufen des offiziellen Vergütungsplans** durch die Berechnung — vom Member/Believer bis zum mehr*Stern Diamant.

**Varianten, die diese Vollständigkeit der Plan-Abbildung betonen:**

| # | trust-num (oben) | trust-cap (unten) |
|---|---|---|
| G-03-A | „Member → 3\* Diamond" | „alle Plan-Stufen abgebildet" |
| G-03-B | „Vom Einstieg bis Diamond" | „kompletter Vergütungsplan im Modell" |
| G-03-C | „Alle Karrierestufen" | „offizieller Vergütungsplan vollständig abgebildet" |
| G-03-D | „Member bis 3\* Diamond" | „komplette Stufen-Logik im Modell" |

**Empfehlung:** G-03-A — präziseste Variante: erweitert die Range nach unten (Member statt Believer), behält die markante „3* Diamond"-Spitze und macht oben über die `trust-cap` die Aussage „**abgebildet**" statt „abgedeckt". „Abgebildet" ist juristisch sicherer (sachliche Modell-Beschreibung, nicht Versprechen).

---

### G-04 — „ohne Risiko, ohne Jahresfalle" (Pricing-Teaser + Note)

**Deine Vorgabe:** Botschaft beibehalten, ala „Du gehst kein Risiko ein".

**Hinweis:** „kein Risiko" ist juristisch problematisch (absolute Aussage). Eleganter ist eine Formulierung, die **die konkrete Sicherheit benennt** statt das Risiko zu negieren.

**Varianten:**

| # | Pricing-Teaser Subline | Pricing-Note Title |
|---|---|---|
| G-04-A | „Auch der günstigere Jahresplan bleibt monatlich kündbar — **du gehst keine Bindung ein.**" | „**Keine Jahresbindung.**" |
| G-04-B | „Auch der günstigere Jahresplan bleibt monatlich kündbar — **du bestimmst, wann du aufhörst.**" | „**Du entscheidest, wann Schluss ist.**" |
| G-04-C | „Auch der günstigere Jahresplan bleibt monatlich kündbar — **mit Rückerstattung anteiliger Restmonate.**" | „**Volle Flexibilität trotz Jahresrabatt.**" |
| G-04-D | „Auch der günstigere Jahresplan bleibt monatlich kündbar. **Restmonate gibt's anteilig zurück — keine Falle, keine Bindung.**" | „**Jahresrabatt ohne Bindung.**" |

**Empfehlung:** G-04-A — knapp, kraftvoll, juristisch sauber. „Keine Bindung" ist die konkrete, prüfbare Aussage hinter „kein Risiko".

---

### G-05 — Pricing-Teaser-Headline („Faires Werkzeug, fairer Preis")

**Deine Vorgabe:** „faires Werkzeug" klingt komisch, in Summe besser formulieren.

**Varianten:**

| # | sec-h (Headline) | sec-sub (Subline-Intro) |
|---|---|---|
| G-05-A | „Klarer Preis, *klare Konditionen.*" | „Starte kostenlos. Teste 14 Tage Pro. Wähle danach zwischen drei Laufzeiten — oder bleib bei Free." |
| G-05-B | „Ein Preis, *keine Überraschungen.*" | „Starte kostenlos. Pro mit drei Laufzeiten zur Wahl — monatlich kündbar, auch beim Jahresplan." |
| G-05-C | „Ein Werkzeug, *drei Wege rein.*" | „Frei starten oder Pro mit 1, 6 oder 12 Monaten — du wählst die passende Laufzeit." |
| G-05-D | „Pro-Funktionen, *ohne Lock-in.*" | „Frei starten, 14 Tage Pro testen, danach in Free oder einem Pro-Plan weiter — du entscheidest." |

**Empfehlung:** G-05-A — knapp, conversion-orientiert, hebt die zwei Hauptverkaufsargumente (Preis + Konditionen) hervor. „Klar" doppelt sich nicht inhaltsleer wie „fair" — es bedeutet wirklich „klar dargelegt".

---

### G-17 — Pricing-Hero h1 („Vier klare Optionen")

**Deine Vorgabe:** Free ist eingeschränkt im Umfang, „Vier klare Optionen" ist nicht ganz präzise. Vorschlag „Vier Pläne" oder besser?

**Bewertung:** „Vier Pläne" ist sachlich richtig, aber etwas trocken. „Pläne" als Wort ist im SaaS-Kontext etabliert.

**Varianten:**

| # | h1Html |
|---|---|
| G-17-A | „Ein Werkzeug.<br>*Vier Pläne.*" |
| G-17-B | „Ein Werkzeug.<br>*Vier Wege zum Start.*" |
| G-17-C | „Ein Werkzeug.<br>*Vier Pläne, eine Entscheidung.*" |
| G-17-D | „Vier Pläne.<br>*Eine Entscheidung.*" |

**Empfehlung:** G-17-A — am nächsten an deiner Vorgabe, sachlich präzise. Wenn etwas mehr Marketing-Schwung gewünscht ist, G-17-D (Reihenfolge umgedreht, aktivierender).

---

### G-20 — „Simulator" als Wort stört — CTA-Vereinheitlichung

**Deine Vorgabe:** Wort „Simulator" stört. Nur **eine** Phrase statt mehrerer.

**Aktuelle Varianten (raus):**
- „Simulator starten" (Hero, Final-CTA, Header)
- „Simulator öffnen" (Features-Final)
- „Zum Simulator" (Account)
- „Plan jetzt starten" (Pricing-Cards)

**Vorschläge für die universelle Trial-/App-Start-Phrase:**

| # | CTA-Text | Bewertung |
|---|---|---|
| G-20-A | „Jetzt starten" | knapp, neutral, sehr SaaS-typisch |
| G-20-B | „Kostenlos starten" | klar, niedrige Hürde, betont Free-Einstieg |
| G-20-C | „Jetzt ausprobieren" | aktivierend, niederschwelliger |
| G-20-D | „App öffnen" | sachlich, für eingeloggte/wiederkehrende Nutzer |
| G-20-E | „Loslegen" | sehr knapp, freundlich-motivierend |
| G-20-F | „Eigenes Bild erstellen" | inhaltlich, knüpft an „Aus Annahmen wird ein Bild" an |

**Empfehlung — eine durchgängige Hierarchie (3 Phrasen):**

| Aktion | CTA | Wo |
|---|---|---|
| **Haupt-CTA Trial-/App-Start** | **„Jetzt starten"** | Hero, Final-CTAs, Features-Final, Header |
| **Pricing-CTAs** | **„Kostenlos starten"** (Free) bzw. **„X Monate starten"** (Pro-Tiers) | Pricing-Cards |
| **App-Wechsel eingeloggt** | **„App öffnen"** | Account-Page |

**Begründung:** „Jetzt starten" ist die kürzeste, klarste und marketingstärkste universelle Phrase. Sie kommt ohne „Simulator" aus, suggeriert keine Verpflichtung (anders als „Plan starten"), und funktioniert für Hero, Final-CTA und Header gleich gut.

**Alternative-Set (falls „Jetzt starten" zu generisch wirkt):**

| Aktion | CTA |
|---|---|
| Haupt-CTA | **„Eigenes Bild erstellen"** (knüpft an Index-Final-CTA-Wortwahl an) |
| Pricing | „Kostenlos starten" / „X Monate starten" |
| App-Wechsel | „App öffnen" |

---

### G-12 → R-07-Wiedervorlage (eingegliedert)

Die Widerruf-Verzicht-Checkboxen-Logik aus G-12 ist bereits in R-07-Reminder als **ToDo 4** enthalten (siehe Korrektur-Block „📋 Reminder R-07" oben). Damit ist G-12 vollständig in die R-07-Wiedervorlage übergegangen — keine separate Wiedervorlage nötig.

---

## Zusammengefasstes Mapping zum Ausfüllen

| # | Empfehlung | Deine Wahl |
|---|---|---|
| G-02 | G-02-C | _____ |
| G-03 | G-03-A | _____ |
| G-04 | G-04-A | _____ |
| G-05 | G-05-A | _____ |
| G-17 | G-17-A | _____ |
| G-20 | „Jetzt starten" (+ „Kostenlos starten" + „App öffnen") | _____ |

Sobald du diese 6 Entscheidungen triffst, setze ich sie sitewide in einem Sweep um (~30 min).
