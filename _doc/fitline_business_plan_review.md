# Review: fitline_business_plan.md

**Reviewed:** `/mnt/user-data/uploads/fitline_business_plan.md` (1.091 Zeilen)
**Vorlage zum Vergleich:** `/mnt/user-data/uploads/lifeplus_business_plan.md`
**Fokus laut Vorgabe:**

1. Begriffs-Mapping `Member → Teampartner`, `Shopper → Kunde`, `IP → Punkte/P`
2. Sind die Wachstums- (3.1) und Volumen-Parameter (3.2) **strukturell** vollständig, oder fehlen FitLine-spezifische Konzepte?
3. Falls in 3.1 oder 3.2 strukturell neue Werte nötig sind (nicht nur Wertanpassung), explizit benennen.

---

## 1. Gesamtbewertung

Das Dokument ist **strukturell weiter als die Eqology-Vorgängerdatei**: die Bonusarten sind sauber in sieben Einkommens­arten zerlegt (EV, KDP, TVB, EB, EAB, TB, MB) plus Zusatzleistungen, jeder Bonus hat eine eigene Formel, eigene Punktbasis und eigene EUR-Umrechnung. Der wichtigste konzeptionelle Bruch zu LifePlus — dass es nicht einen, sondern zwei verschiedene Punkt-zu-EUR-Faktoren gibt (`pointToRetailEUR` und `pointToBonusEUR`) — ist erkannt und an der richtigen Stelle eingeführt. Die Begriffs­adaption ist konsequent durchgezogen.

**3.1 ist strukturell ausreichend mit drei optionalen FitLine-Ergänzungen, die als "optional V2" markiert sind.** Hier ist die Trennung zwischen V1-Kompatibilität (alles bleibt wie LifePlus) und V2-Genauigkeit gut.

**3.2 ist strukturell deutlich erweitert** — sechs zusätzliche Volumen-Parameter sind eingeführt, die in LifePlus nicht existieren. Hier sehe ich aber zwei strukturelle Lücken (siehe Abschnitt 4 dieses Reviews), die auch in V1 schon spürbar werden, und eine begriffliche Inkonsistenz zwischen 3.2 und 10.5 (Default-Inputs des CompensationPlan), die unbedingt vor dem Bau bereinigt werden sollte.

### Ampel pro Kapitel

| Kapitel | Status | Hauptpunkt |
|---|---|---|
| 1 Ausgangsfrage | ✅ ok | sauber, klare Story-Erzählung |
| 2 Datenmodell | ✅ ok | V1/V2-Trennung sinnvoll, Node-Modell vorbereitet |
| **3.1 Wachstums-Parameter** | ✅ **strukturell vollständig** | drei FitLine-Ergänzungen sauber als V2-optional markiert |
| **3.2 Volumen-Parameter** | 🟡 **fast vollständig** | Zwei strukturelle Lücken — siehe Abschnitt 4 |
| 3.3 Wirtschaftliche Parameter | ✅ ok | knapp, aber ausreichend |
| 3.4 Bonus-Schalter | ✅ ok | gute Idee — bonusweises An/Aus |
| 4 Wachstumslogik | ✅ ok | Year-Offset übernommen, Reihenfolge plausibel |
| 5 Numerisches Beispiel | 🟡 ok mit Lücke | gleicher Year-Offset-Sprung wie Eqology — siehe Abschnitt 6.1 |
| 6 Provisionsberechnung | 🟡 ok mit Lücken | TB-Komprimierung fehlt; MB-V1 mathematisch riskant — Abschnitt 6.2 + 6.3 |
| 7 Rangsystem | 🟡 ok mit Tabellenfehler | M-Stufe hat im PDF eine versteckte Strukturbedingung — Abschnitt 6.4 |
| 8 Goals | ✅ ok | sauber |
| 9 Realistic-Growth | ✅ ok | gut, knapper Verweis auf `rankLegBalanceStrategy` |
| 10 Code-Vorlage | 🟡 ok mit Inkonsistenz | `defaultInputs` enthalten 3.2-Parameter doppelt benannt — Abschnitt 7.1 |
| 11 Offene Punkte | ✅ ok | sehr ehrliche Liste |
| 12 Glossar | ✅ ok | vollständig |

---

## 2. Begriffs-Konsistenz (Auftragspunkt 1)

### 2.1 Was bereits richtig ist

- Die Einleitung (Zeilen 7–14) hat die Mapping-Tabelle direkt drin. Klare Trennung zwischen UI-Label und technischem Code-Typ.
- `terminology`-Block im `fitlinePlan` (Zeile 962–966) ist gesetzt: `memberLabel: 'Teampartner'`, `shopperLabel: 'Kunde'`, `volumeUnit: 'P'`.
- Im Glossar (Zeile 1.087, 1.088) ist die Doppelung "Teampartner = Vertriebspartner, im Code oft `member`" sauber drin.
- Der Code-Typ `PMNode` (Zeile 134–146) bleibt bewusst beim generischen Begriff, das ist konsistent.

### 2.2 Inkonsistenzen, die korrigiert werden sollten

| Fundstelle | Aktuell | Vorschlag |
|---|---|---|
| Zeile 106–110 | `membersByLevel`, `shoppersByLevel` in `NetworkSnapshot` mit Kommentar `// FitLine: Teampartner nach Tiefe` | Im FitLine-Dokument sollte derselbe Vereinheitlichungs-Pfad gewählt werden wie in Eqology: entweder die Variablennamen umbenennen (`partnersByLevel`/`customersByLevel`) oder im Abschnitt 10 (Code) einen expliziten Adapter zeigen. Sonst entsteht der Eindruck, FitLine habe ein eigenes Snapshot-Schema, das vom Core abweicht. |
| Zeile 134–146 | `PMNode` hat `personalRetailPoints`, `customerProgramPoints`, `autoshipPoints` — alles spezifische FitLine-Felder, aber kein klares Mapping auf den Core-Begriff `member` | Im Kommentar oder Glossar ergänzen, dass `PMNode` der FitLine-spezifische Node-Typ ist und im Core als generischer `Member`-Node aliasiert wird. |
| Zeile 329–333 | `membersByLevel`, `shoppersByLevel` in Aggregat-Pseudocode | Konsistent mit Code-Block in 2.x — beide gleich benennen. |
| Zeile 1.082 (Glossar) | `IMM`, `KDP`, `TVB` etc. sind drin | gut so |

**Empfehlung:** Gleiche Konvention wie in Eqology-Review vorgeschlagen — der **Core kennt** `membersByLevel`/`shoppersByLevel`, das **FitLine-Produktpaket** legt im `terminology`-Block nur Labels (`Teampartner`, `Kunde`) drüber. So bleibt der Core neutral. Das ist im Dokument zwar sinngemäß vorhanden, aber nicht explizit als Architektur­regel formuliert.

### 2.3 IP → Punkte/P: das ist nicht ein 1:1-Mapping, sondern eine Verzweigung

Genau wie bei Eqology mit QV/BV ist auch hier IP nicht 1:1 auf Punkte abbildbar. Das Dokument adressiert das in Abschnitt 3.2 explizit korrekt — Zeile 210 sagt sinngemäß: "1 P ≈ 51 Euro Cent laut PDF, aber die Rechenbeispiele wirken mit anderem effektivem Wert. Deshalb sollte der Simulator den Punktwert nicht hart verdrahten."

**Das ist die richtige Beobachtung** und der Grund, warum `pointToRetailEUR` und `pointToBonusEUR` getrennt geführt werden müssen. Das ist gut gelöst. Ein Detail: an einer Stelle (Zeile 549–557) wird ein dritter Faktor `firstLinePointToEUR` als optional eingeführt, der dann mit dem Kommentar "oder allgemeiner: `pointToBonusEUR` konfigurierbar halten" relativiert wird. Hier wäre **eine klare Entscheidung sauberer**: entweder zwei Faktoren reichen (Retail + Bonus), oder es braucht pro Bonusart einen eigenen — die Mitte ist verwirrend. Empfehlung: bei zwei Faktoren bleiben und in der PDF-Analyse später prüfen, ob der Erstlinien-Bonus tatsächlich eine andere Basis hat.

---

## 3. Beurteilung 3.1 — Wachstums-Parameter (strukturell vollständig)

Die Tabelle in 3.1 ist **strukturell ausreichend**. Die fünf LifePlus-Parameter sind 1:1 übernommen. Die drei FitLine-spezifischen Ergänzungen sind sauber als "wenn der Plan genauer simuliert werden soll" markiert.

| Parameter | Status | Anmerkung |
|---|---|---|
| `membersPerYear` | ✅ direkt anwendbar | UI-Label `Teampartner/Jahr` korrekt |
| `shoppersPerYear` | ✅ direkt anwendbar | UI-Label `Kunden/Jahr` korrekt |
| `duplicationRate` | ✅ direkt anwendbar | — |
| `attritionRate` | ✅ direkt anwendbar | — |
| `maxDirectMembersPerMember` | ✅ direkt anwendbar | — |
| `autoshipAdoptionRate` (V2) | ✅ **richtige Ergänzung** | Erstlinien-Bonus hängt am 100-P-Abo |
| `fastStarterRate` (V2) | ✅ **richtige Ergänzung** | EAB-Quote |
| `activePartnerRate` (V2) | ✅ **richtige Ergänzung** | trennt nominale von aktiven TPs |
| `rankLegBalanceStrategy` (V2) | ✅ **richtige Ergänzung** | Pflicht für hohe Ränge mit Bein-Anforderungen |

**Beurteilung:** Diese vier Ergänzungen sind strukturell sinnvoll und decken die spezifischen FitLine-Mechaniken (Abo-Bindung, Schnellstart, Aktivität, Rang-Beine) sauber ab. Es gibt **keine weitere fehlende Wachstums-Größe**, die ich strukturell vermissen würde.

### 3.1 — eine kleinere Klarstellung wäre sinnvoll

Ein nicht-strukturelles, aber didaktisches Detail: `autoshipAdoptionRate` wirkt **doppelt** — einmal als Anteil der TPs mit Abo (relevant für EB-Freischaltung), einmal als Anteil der Kunden mit Abo (relevant für Bindungsmechanik, falls man das später modelliert). Das könnte in zwei Parameter aufgeteilt werden:

```text
partnerAutoshipAdoptionRate (für TPs)
customerAutoshipAdoptionRate (für Kunden)
```

Das ist aber nur dann nötig, wenn das Modell auch eine Kunden-Bindungsmechanik (analog Eqology-Subskription) bekommt. Für V1 reicht ein gemeinsamer Parameter. **Kein Pflichtpunkt**, nur ein Hinweis.

---

## 4. Beurteilung 3.2 — Volumen-Parameter (zwei strukturelle Lücken)

Die Erweiterung in 3.2 ist **deutlich stärker als bei Eqology** und sieben neue Volumen-Parameter sind sauber eingeführt:

| Parameter | Bewertung |
|---|---|
| `pointToRetailEUR` | ✅ richtig — Retail hat andere Basis als Bonus |
| `pointToBonusEUR` | ✅ richtig — siehe oben |
| `ownAutoshipPoints` | ✅ richtig — Freischaltung EB |
| `partnerAutoshipPoints` | ✅ richtig — TP-typisches Abo |
| `directRetailCustomerPoints` | ✅ richtig — EV-Basis |
| `directKdpCustomerPoints` | ✅ richtig — KDP-Basis |
| `personalSalesPoints` | ✅ richtig — TVB-Basis |
| `qualifiedFastStartersPerMonth` | ✅ richtig — EAB-Basis |

Das ist eine sehr saubere Trennung der Punktbasen. **Aber:** zwei strukturelle Lücken sehe ich trotzdem.

### 4.1 Fehlende Größe 1 — Bein-Volumen vs. Eigen-/Kunden-Volumen

Die Tabelle in 3.2 deckt **das Volumen ab, das du selbst und deine direkten Kunden generieren**. Was sie nicht explizit modelliert, ist das **Volumen der direkten Teampartner** als eigene Basis. Im Abschnitt 6.5 (Erstlinien-Bonus) taucht das als `directTeamPartnerBusinessPoints` auf, ist aber **nicht in der 3.2-Parameter-Tabelle gelistet** und nicht im Code-Block `PMVolumeInputs` (Zeile 239–253) enthalten.

**Konkrete Auswirkung:**
Der Erstlinien-Bonus rechnet auf `directTeamPartnerBusinessPoints`. Diese Größe wird im aktuellen Modell **implizit aus dem Snapshot abgeleitet** (= Summe `partnersByLevel[0] * memberMonthlyVolume`). Das ist für V1 ok, aber dann sollte das in 3.2 auch explizit so dokumentiert werden — entweder als **abgeleiteter Wert** mit klarer Formel, oder als eigener Input-Parameter für Fälle, in denen der Nutzer das manuell überschreiben möchte (Demo-Szenarien).

**Vorschlag — neuer Parameter (abgeleitet, nicht eingegeben):**

| Parameter | Default | Bedeutung |
|---|---:|---|
| `directTeamPartnerBusinessPoints` | abgeleitet aus `partnersByLevel[0] * memberMonthlyVolume`, override-fähig | Geschäftsvolumen der direkten Teampartner. Basis für EB. Sollte als abgeleitete Größe explizit dokumentiert sein, damit klar ist, wie sie aus dem Snapshot entsteht. |

Alternative: in der 3.2-Tabelle eine zusätzliche Zeile mit dem Hinweis "abgeleitete Größen" und alle drei Gruppen­volumen-Aggregate dort listen. So bleibt die Trennung "Input" vs "abgeleitet" sauber.

### 4.2 Fehlende Größe 2 — Komprimierung beim Tiefenbonus (Compression Depth)

Dies ist die **strukturell wichtigere Lücke**. Der Tiefenbonus in 6.7 zahlt 5/3/3/3/5/5 % auf Ebenen 1–6. Die Formel (Zeile 614–625) summiert stumpf über `membersByLevel[level]` und `shoppersByLevel[level]`. Das ignoriert eine zentrale FitLine/PM-Mechanik: **Komprimierung**.

Wenn ein TP auf Ebene 3 inaktiv ist (kein 100-P-Abo, keine Umsätze), wird er aus Sicht des Tiefenbonus übersprungen und Ebene 4 rückt auf Ebene 3 hoch. Das ist im PDF nicht explizit dokumentiert, aber Stand der Praxis bei differenziellen Plänen und in der offenen-Punkte-Liste (11.8) richtig markiert.

**Konkrete Auswirkung auf den Simulator:**
Wenn `activePartnerRate = 0.7` ist (siehe 3.1-Erweiterung), bedeutet das, dass 30 % der TPs nicht zum Tiefenbonus beitragen — und ihre Substruktur rückt **eine Ebene näher heran**. Ohne Komprimierung unterzählt die Simulation systematisch die Auszahlung in tieferen Ebenen.

**Vorschlag — neuer Parameter:**

| Parameter | Default | Bedeutung |
|---|---:|---|
| `applyCompression` | `false` (V1) / `true` (V2) | Schalter, ob inaktive TPs (nach `activePartnerRate`) bei der Tiefenbonus-Berechnung komprimiert werden. In V1 als Aus belassen, weil ohne Node-Modell nur näherungsweise machbar; in V2 mit echtem Node-Modell exakt umsetzbar. |
| `compressionThreshold` | `100` P | Mindest-Eigenumsatz, ab dem ein TP nicht komprimiert wird. Default 100 P entspricht der EB-Mindestabo-Logik. |

Das gehört strukturell zu 3.2 (oder zu 3.4 als Schalter), weil es eine Eigenschaft der **Volumen-Aggregation pro Ebene** ist, nicht der Wachstumslogik. Ohne diesen Parameter ist `activePartnerRate` aus 3.1 **inkonsistent** mit der Tiefenbonus-Berechnung: 3.1 trennt aktiv von inaktiv, 6.7 ignoriert die Unterscheidung.

### 4.3 Zusammenfassung der notwendigen 3.2-Erweiterung

Aktualisierte Tabelle 3.2 (Vorschlag), strukturell vollständig:

| Parameter | Default | Bedeutung |
|---|---:|---|
| `memberMonthlyVolume` | 100 P | wie bisher |
| `shopperMonthlyVolume` | 100 P | wie bisher |
| `personalMonthlyVolume` | 100 P | wie bisher |
| `pointToCurrency` | 0,51 | generischer Faktor |
| `pointToRetailEUR` | 0,51 | für EV |
| `pointToBonusEUR` | 0,90 | für EB/TB/MB |
| `ownAutoshipPoints` | 100 P | EB-Freischaltung |
| `partnerAutoshipPoints` | 100 P | typisches TP-Abo |
| `directRetailCustomerPoints` | variabel | EV-Basis |
| `directKdpCustomerPoints` | variabel | KDP-Basis |
| `personalSalesPoints` | variabel | TVB-Basis |
| `qualifiedFastStartersPerMonth` | berechnet | EAB-Basis |
| **`directTeamPartnerBusinessPoints`** | **abgeleitet** | **EB-Basis (aus Snapshot), override-fähig** |
| **`applyCompression`** | **false (V1) / true (V2)** | **Tiefenbonus mit/ohne Komprimierung** |
| **`compressionThreshold`** | **100 P** | **Mindest-Aktivitätsschwelle** |

`applyCompression` und `compressionThreshold` könnten alternativ auch in 3.4 (Bonus-Schalter) landen — das ist Geschmackssache, hat aber den Nachteil, dass sie dann von den Bonusart-Schaltern wie `simulateDepthBonus` getrennt sind, obwohl sie semantisch zur Tiefenbonus-Mechanik gehören.

---

## 5. Beurteilung 3.3 und 3.4 — knapp und gut

Beide Abschnitte sind kompakt und richtig. `includeBenefitsInGoals = false` als Default ist die richtige Entscheidung (siehe LifePlus-Konvention). Die Bonus-Schalter in 3.4 sind sehr nützlich für transparente Demos — man kann genau zeigen, "ohne MB wären es nur 600 EUR, mit MB sind es 1.000 EUR".

**Eine kleine Ergänzung wäre sinnvoll** in 3.4:

```text
simulateCompression: boolean — wirkt zusammen mit simulateDepthBonus und simulateManagementBonus
```

Damit kann man im Demo zwei Vergleichsläufe nebeneinander stellen: "naiv ohne Komprimierung" vs. "realistisch mit Komprimierung".

---

## 6. Konkrete inhaltliche Fehler/Schwächen

### 6.1 Numerisches Beispiel verletzt Year-Offset-Konsistenz (Abschnitt 5)

Zeile 392 (Jahr 3):
```
membersByLevel = [6, 12, 8]
```

Das ist beim Nachrechnen **korrekt** (gleiche Logik wie LifePlus-Beispiel mit 4 Beinen × 1 + 4 × 2 + 4 × 0, dann eine Ebene tiefer), aber **der Rechenweg ist nicht hergeleitet**, wie es bei LifePlus (Zeile 173–231) der Fall ist. Stand jetzt steht das Ergebnis behauptet im Raum.

Außerdem: Zeile 393 listet `shoppersByLevel = [9, 18, 12]`. Bei LifePlus-Logik mit `shoppersPerYear=3` und `duplicationRate=1` würde sich das aus:
- Level 0: 3 + 3 + 3 = 9 (3 Jahre lang je 3 neue) ✅
- Level 1: 2 alte Beine × 3 Shopper × 2 Jahre + 4 Jahr-2-Beine × 3 Shopper × 1 Jahr = 12 + 12 = 24 (nicht 18)
- Level 2: ergibt sich aus der Sub-Werbung

Hier rechnet sich Level 1 = 18 nur, wenn die Jahr-2-Teampartner im Jahr 3 nicht erstmals selbst Shopper werben — was dem Year-Offset entspricht, dann müsste es aber 2 alte × 3 × 2 = 12 plus 2 Jahr-2-Beine × 3 × 1 = 6, gesamt 18 sein. **Das passt**, wenn man `membersPerYear` und nicht `shoppersPerYear` als Zahlbasis nimmt — dann wären 6 sourceLegs in Jahr 3, also 6 × 3 = 18. **OK, die Zahl 18 ist konsistent**, aber die Herleitung würde man im Text auch sehen wollen.

**Empfehlung:** den expliziten Rechenweg wie bei LifePlus ergänzen. Sonst ist das Beispiel nur dann nachvollziehbar, wenn man das LifePlus-Dokument nebenher offen hat.

### 6.2 Tiefenbonus-Formel ignoriert Komprimierung (Abschnitt 6.7)

Die Formel in Zeile 614–625 summiert stumpf alle TPs und Kunden pro Ebene:
```ts
const memberPoints = (snapshot.membersByLevel[level] ?? 0) * inputs.memberMonthlyVolume;
const shopperPoints = (snapshot.shoppersByLevel[level] ?? 0) * inputs.shopperMonthlyVolume;
```

Das ist die naive Variante. Wie in 4.2 dieses Reviews ausgeführt: **wenn `activePartnerRate < 1`, dann sollte die Formel mit komprimierten Ebenen rechnen**, sonst sind 3.1 und 6.7 nicht konsistent miteinander.

Vorschlag für eine konsistente Version (V1-Approximation):

```ts
function calculateDepthBonus(snapshot, inputs): number {
  let total = 0;
  for (let level = 0; level < 6; level++) {
    const nominalMembers = snapshot.membersByLevel[level] ?? 0;
    const effectiveMembers = inputs.applyCompression
      ? nominalMembers * inputs.activePartnerRate  // näherungsweise
      : nominalMembers;
    const memberPoints = effectiveMembers * inputs.memberMonthlyVolume;
    const shopperPoints = (snapshot.shoppersByLevel[level] ?? 0) * inputs.shopperMonthlyVolume;
    total += (memberPoints + shopperPoints) * inputs.pointToBonusEUR * DEPTH_RATES[level];
  }
  return total;
}
```

Das ist immer noch eine Approximation, aber sie stimmt mit `activePartnerRate` zusammen. Für V2 mit Node-Modell wird die Komprimierung exakt ausgeführt.

### 6.3 Management-Bonus V1 hat ein mathematisches Risiko (Abschnitt 6.8)

Die V1-Approximation in Zeile 654–664:
```ts
const ownRate = ownRank.managementRate;
const deepPoints = totalPointsFromLevel(snapshot, 0, inputs);
const estimatedPaidBelowRate = estimatePaidRateBelow(snapshot, inputs);
return deepPoints * inputs.pointToBonusEUR * Math.max(0, ownRate - estimatedPaidBelowRate);
```

Das hat zwei Probleme:

1. **`deepPoints` beginnt bei Level 0** (= eigene direkte Beine), aber der MB rechnet auf das **Gruppenvolumen unterhalb der eigenen Position**, nicht inklusive. Wenn `ownRate = 0.09` (IMM) und `estimatedPaidBelowRate = 0`, würde die Formel 9 % auf das **gesamte Netzwerk inklusive eigener Erstlinie** anrechnen — und damit doppelt mit TB zählen, der bereits 5 % auf Ebene 1 zahlt.
2. **`estimatePaidRateBelow` ist nicht definiert.** Was diese Funktion liefert, ist offen — vermutlich ein Mittelwert über Sub-Beine, aber das ist nicht spezifiziert. Bei einer Demo-Vorführung wird das zur Lücke.

**Vorschlag:**

In V1 entweder
- **(a)** MB ausschalten (`simulateManagementBonus = false`) und nur TB + EB + KDP zeigen, oder
- **(b)** eine **konservative Approximation** wählen, die explizit dokumentiert ist:

```ts
function calculateApproxManagementBonus(snapshot, ownRank, inputs): number {
  const ownRate = ownRank.managementRate;
  // MB nur auf Volumen ab Ebene 7+, weil Ebenen 1-6 von TB abgedeckt sind
  const pointsBelowDepthBonus = totalPointsFromLevel(snapshot, 6, inputs);
  // Konservativ: 50% des Differentials, weil Sub-Ränge im Schnitt eine
  // Stufe niedriger sitzen
  return pointsBelowDepthBonus * inputs.pointToBonusEUR * ownRate * 0.5;
}
```

Diese Approximation ist offensichtlich grob, aber sie ist
- nachvollziehbar dokumentiert
- nicht doppelt zählend mit TB
- nie negativ
- und gibt zumindest die richtige Größenordnung.

Die exakte V2-Variante mit Node-Modell bleibt wie in Zeile 668–681 beschrieben.

### 6.4 Manager-Rang hat im PDF eine Strukturbedingung (Abschnitt 7.1)

Zeile 763 sagt:
```
Manager | M | 600 P | keine klare Zusatzbedingung im PDF-Auszug | 0 % / Retail 30 %
```

Im PDF (Seite 2, Bonus-Tabelle) steht für Manager aber zumindest **implizit die Bedingung des "schnellen Wegs zum Manager"** mit dem 5+1-Schnellstart-Set und einer Sofort-Verdienst-Mindestleistung. Außerdem steht beim Manager-Eintrag der **Hinweis "Extra 10 % Autoship"**, was bedeutet, dass die Manager-Stufe an ein eigenes Abo gekoppelt ist (sonst gibt es die 10 % nicht).

Das ist im Dokument als "keine klare Zusatzbedingung" abgehakt, aber die 10 % Extra-Autoship-Anforderung ist eine **Aktivitätsbedingung**, die zumindest dokumentiert werden sollte:

| Rang | Code | Schwelle | Strukturbedingung | Aktivitätsbedingung |
|---|---|---:|---|---|
| Manager | M | 600 P | — | eigenes Abo aktiv |

**Empfehlung:** in Abschnitt 7.1 eine zusätzliche Spalte "Aktivitätsbedingung" oder einen Hinweis hinzufügen. Im Code (Zeile 794) bedeutet das, dass der Manager-Rang als `requiresActiveAutoship: true` markiert wird.

### 6.5 MB-Satz für Manager — Definitionslücke (Abschnitt 7.1)

Zeile 763: `Manager | M | 600 P | keine klare Zusatzbedingung | 0 % / Retail 30 %`

Der `managementRate` für Manager ist mit `0 %` angegeben (Zeile 794: `managementRate: 0`). Das ist nicht ganz richtig — der **Manager ist die niedrigste Stufe, die überhaupt am Tiefenbonus-System teilnimmt**, und in der PDF-Tabelle hat er auf Ebene 1 = 5 %, Ebenen 2–4 = 3 %, was effektiv die Basis-Sätze des Tiefenbonus sind. Der Manager hat also keinen **eigenständigen MB-Aufschlag**, aber er hat **vollen Anspruch auf die TB-Basis**, was bei Code-Level relevant ist.

**Empfehlung:** im Code-Eintrag explizit kommentieren:
```ts
{ code: 'M', name: 'Manager', minGroupPoints: 600,
  managementRate: 0, // kein eigener MB-Differentialanteil, nur TB-Basis
  retailRate: 0.30 },
```

### 6.6 4-Bein-Varianten als Rank-Variants — implementations­offen

Zeile 808–818 dokumentiert, dass die 4-Bein-Varianten (12,5 %, 15,5 %, 18,5 %, 19,5 %) als `RankVariant` modelliert werden können. Das ist eine gute Architekturentscheidung, **aber es fehlt die konkrete Logik**, wie der Code zwischen "Standard" und "Variant" entscheidet. Ist es: höher = automatisch wenn erfüllt? Muss der TP die Variant explizit anstreben?

**Empfehlung:** im Code eine Auswahlregel ergänzen, etwa:

```ts
function determinePMRank(structure, rankConfig): PMRank {
  // Höchster Rang, dessen Anforderungen erfüllt sind, gewinnt.
  // Bei mehreren Varianten desselben baseCode: höchste managementRate gewinnt.
}
```

---

## 7. Code-Vorlage (Abschnitt 10) — eine Doppelung

### 7.1 `defaultInputs` mischt 3.1, 3.2 und Bonus-Defaults

Zeile 968–984 listet `defaultInputs` im `fitlinePlan`:

```ts
defaultInputs: {
  membersPerYear: 2,
  shoppersPerYear: 3,
  duplicationRate: 1,
  attritionRate: 0,
  maxDirectMembersPerMember: 29,
  memberMonthlyVolume: 100,
  shopperMonthlyVolume: 100,
  personalMonthlyVolume: 100,
  pointToCurrency: 0.51,
  pointToRetailEUR: 0.51,
  pointToBonusEUR: 0.90,
  ownAutoshipPoints: 100,
  partnerAutoshipPoints: 100,
  directRetailCustomerPoints: 0,
  directKdpCustomerPoints: 0,
  personalSalesPoints: 0,
}
```

Das ist eine **Mischung aus Wachstums-Parametern (3.1) und Volumen-Parametern (3.2)**, was im `CompensationPlan`-Kontrakt sauberer getrennt sein sollte. In LifePlus liegt diese Trennung im Core-Vertrag (`SimulatorInputs` hat `growth` und `volume` als Sub-Objekte). Bei FitLine müsste das gleich strukturiert sein, sonst verliert der Plan-Typ seine Generizität.

**Empfehlung:**

```ts
defaultInputs: {
  growth: { membersPerYear: 2, shoppersPerYear: 3, ... },
  volume: { memberMonthlyVolume: 100, ..., pointToBonusEUR: 0.90 },
  bonusToggles: { simulateDepthBonus: true, ... },
}
```

Das ist eine Architekturfrage, aber sie wird in V2 wichtig, sobald andere Pläne (Eqology, weitere) dazukommen.

Außerdem **fehlen** in den `defaultInputs`:
- `qualifiedFastStartersPerMonth`
- `applyCompression` (mein Vorschlag aus 4.2)
- `compressionThreshold` (mein Vorschlag aus 4.2)
- `directTeamPartnerBusinessPoints` als abgeleitet markiert

Wenn das hinzukommt, ist die Code-Vorlage konsistent mit 3.2.

### 7.2 Tests (Abschnitt 10.7) sind ein guter Anker — eine Lücke

Zeile 1.043–1.050 listet 10 Tests. Was fehlt:

11. **TB komprimiert bei `applyCompression=true`** — Test, dass inaktive TPs Ebenen-Sprung auslösen
12. **MB doppelt sich nicht mit TB** — Test, dass die Summe TB+MB nie höher ist als der Plan-maximum-Satz für die jeweilige Ebene (siehe PDF-Tabelle "5 % – 14 %" als Obergrenze auf Ebene 1 für IMM)
13. **Punkt-zu-EUR-Faktoren wirken getrennt** — Test, dass eine Änderung von `pointToRetailEUR` nur EV beeinflusst, nicht TB/MB

Test 12 ist besonders wichtig: er fängt strukturelle Fehler in der MB-Berechnung ab (Stichwort 6.3 oben).

---

## 8. Sonstige Beobachtungen

### 8.1 Abschnitt 6.2 — Retail-Rate ist statisch, sollte aber `directRetailCustomerPoints` und `directKdpCustomerPoints` trennen

Die EV-Formel in Zeile 470–472:
```text
retailProfitEUR = directRetailCustomerPoints * pointToRetailEUR * retailRate[rank]
```

Das ist richtig, **aber** im PDF unterscheidet sich der Vertrieb in zwei Kanälen:
- direkter Verkauf an Kunden (vom TP an den Endkunden, Marge = EV)
- Kunden Direktprogramm (Kunde bestellt direkt bei PM, TP bekommt KDP)

Beide haben **unterschiedliche Punktbasen** und unterschiedliche Sätze. Im Dokument ist das mit `directRetailCustomerPoints` und `directKdpCustomerPoints` korrekt getrennt. Eine kleine Klarstellung: im UI/Text sollte beim Eingabefeld für `directKdpCustomerPoints` explizit stehen "**ohne** direkte Vertriebskunden — diese gehen in `directRetailCustomerPoints`", sonst zählt der Nutzer denselben Kunden doppelt.

### 8.2 Schnellstarter-Pauschale ist Punkt-unabhängig (Abschnitt 6.6)

Zeile 568–569: `starterTrainingBonusEUR = qualifiedFastStarters * 50`.

Das ist korrekt — der EAB ist eine **EUR-Pauschale, nicht punktbasiert**. Hier wäre ein Hinweis sinnvoll, dass diese Bonusart die einzige ist, die **nicht** mit `pointToBonusEUR` arbeitet. Sonst ist die Konvention "alle Boni gehen über `pointToBonusEUR`" gebrochen, ohne dass es jemand bemerkt.

### 8.3 Glossar — Erweiterung empfohlen

Im Glossar (Abschnitt 12) sollten ergänzt werden:
- **Komprimierung** (analog Eqology-Glossar): "Nicht aktive Teampartner zählen bei der Tiefenbonus-Auszahlung nicht als eigene Ebene; ihr Volumen wird zur nächsten qualifizierten Ebene weitergereicht."
- **Aktiver Teampartner**: "Teampartner mit mindestens einem eigenen Abo von 100 P im aktuellen Monat."
- **Rang-Bein**: "Bein, dessen Wurzel-Teampartner einen bestimmten Mindestrang erreicht hat (z. B. Manager-Bein, SM-Bein)."

---

## 9. Priorisierte Empfehlungs-Reihenfolge

Wenn das Dokument iterativ verbessert werden soll, in dieser Reihenfolge:

1. **3.2-Tabelle um `applyCompression` und `compressionThreshold` ergänzen** (Abschnitt 4.2 dieses Reviews) — ohne diese ist `activePartnerRate` aus 3.1 inkonsistent mit 6.7
2. **MB-V1-Approximation neu fassen** (Abschnitt 6.3) — die aktuelle Formel zählt potenziell doppelt mit TB
3. **3.2-Tabelle um `directTeamPartnerBusinessPoints` als abgeleitete Größe ergänzen** (Abschnitt 4.1)
4. **`defaultInputs` in 10.5 strukturell aufteilen** in `growth`, `volume`, `bonusToggles` (Abschnitt 7.1) — Voraussetzung für Multi-Plan-Architektur mit Eqology
5. **Manager-Aktivitätsbedingung in 7.1 ergänzen** (Abschnitt 6.4)
6. **Numerisches Beispiel Jahr 3 explizit herleiten** (Abschnitt 6.1) — pädagogisch
7. **Tests 11–13 in 10.7 ergänzen** (Abschnitt 7.2)
8. **Glossar um Komprimierung, aktiv, Rang-Bein erweitern** (Abschnitt 8.3)

Punkte 1, 2, 4 sind inhaltskritisch. 3, 5 sind Konsistenz. 6, 7, 8 sind Qualität.

---

## 10. Was richtig gut ist

Zum Schluss positiv festhalten — das Dokument macht mehrere Dinge sehr richtig:

- Die **Trennung von `pointToRetailEUR` und `pointToBonusEUR`** ist die zentrale FitLine-Einsicht und sauber umgesetzt. Das ist genau der Punkt, an dem die naive LifePlus-Übertragung gescheitert wäre.
- Die **explizite V1/V2-Trennung** in 3.1 (mit `autoshipAdoptionRate` etc. als V2-optional) ist die richtige Engineering-Haltung: erst eine grobe, schaltbare Demo, dann eine exakte Variante.
- Die **Bonus-Schalter in 3.4** sind didaktisch sehr stark — man kann transparent zeigen, welcher Bonus welchen Beitrag liefert.
- Die **offene-Punkte-Liste in 11** ist intellektuell ehrlich. Acht offene Punkte sind keine Schwäche, sondern saubere Engineering-Praxis vor einem Bau.
- Die **Rangtabelle in 7.1** ist vollständig und übernimmt alle 12 PM-Stufen inklusive der 4-Bein-Varianten. Das ist mehr als für eine Demo nötig wäre.
- Die **Trennung von `cashEUR` und `benefitsEUR`** in 6.10 plus `includeBenefitsInGoals=false` als Default ist eine ehrliche Modellierung. Die meisten Anbieter mischen das, was die Vergleichbarkeit zerstört.
- Die **Begriffs-Mapping-Tabelle in der Einleitung** ist exakt am richtigen Platz und konsequent gehalten.

Das Grundgerüst trägt. Die genannten Punkte sind Verfeinerungen, keine Neuanfänge. Im Vergleich zur Eqology-Review-Datei ist die FitLine-Vorlage **bereits einen Schritt weiter**: dort fehlten drei zentrale Konzepte strukturell, hier fehlen nur zwei und die sind weniger fundamental.
