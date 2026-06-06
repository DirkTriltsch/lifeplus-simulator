# Netzwerkwachstum-Modellierung — Konzeptdiskussion & Entscheidungsprotokoll

**Projekt:** lifeflow360 — Multi-Brand MLM-Plattform (LifePlus, FitLine, Eqology)  
**Kontext:** Simulator-Modul für Netzwerkwachstum / Downline-Visualisierung  
**Datum:** Juni 2026  
**Zweck dieses Dokuments:** Review durch externe KI, Ergänzung neuer Gedanken

---

## 1. Ausgangslage

Der Simulator modelliert das Wachstum eines MLM-Netzwerks als Knotenbaum.

- Jeder **Member** ist ein Knoten
- Jeder Knoten kann weitere Member (Child-Knoten) haben
- Ziel: realitätsnahes, berechenbares Wachstumsmodell mit ganzen Personen

---

## 2. Grundparameter

### 2.1 Member/Jahr
Anzahl neuer Member, die ein aktiver Knoten pro Jahr aufbauen kann.  
**Beispielwert:** `2`

### 2.2 Duplikationsrate
Anteil der Knoten, die tatsächlich neue Member rekrutieren.  
**Beispielwert:** `50%` bzw. `75%`

### 2.3 Churn-Rate (Fluktuation)
Anteil der Knoten, die das Netzwerk pro Jahr verlassen.  
**Beispielwert:** `30%`

---

## 3. Parameter: Duplikation

### 3.1 Diskutierte Interpretationen

**Option 1 — Aktive-Member-Rate** ✅ *Gewählt*  
X% der bestehenden Knoten sind "aktiv" und bringen je N neue Member.  
Die restlichen (100-X)% bringen nichts.  
→ Modelliert klar die Heterogenität im Netzwerk: es gibt arbeitende und "schlafende" Member.  
→ Intuitiv erklärbar: *"Von 10 in deiner Downline arbeiten 5 wirklich."*

**Option 2 — Gebrochene Erwartung**  
Alle Knoten bringen im Schnitt nur X% neue Member (z.B. 2 × 50% = 1 neuer Member pro Knoten).  
→ Statistischer Durchschnitt, gut für einfache Projektionen.  
→ Verschleiert die Heterogenität, zu optimistisch weil gleichmäßige Verteilung angenommen wird.

**Option 3 — Verzögerungsmodell**  
Jeder Knoten braucht länger (z.B. 2 Jahre statt 1), um seine Member aufzubauen.  
Duplikation = Zeitfaktor, nicht Wahrscheinlichkeit.  
→ Modelliert Anlaufphase neuer Member.

**Option 4 — Tiefenabhängige Duplikation**  
Duplikationsrate sinkt mit jeder Ebene: Ebene 1 = 100%, Ebene 2 = 75%, Ebene 3 = 50%, …  
→ Sehr realitätsnah: je weiter vom Gründer entfernt, desto schwächer Training und Motivation.

**Option 5 — Churn-Modell** *(als separater Parameter behandelt)*  
Alle Knoten rekrutieren voll, aber X% der bestehenden fallen jährlich weg.  
→ Netzwerk wächst und schrumpft gleichzeitig.

### 3.2 Entscheidung
> **Option 1 (Aktive-Member-Rate)** wurde gewählt.

---

## 4. Diskretisierungsproblem — Umgang mit Restwerten

### 4.1 Problem
Bei nicht ganzzahligen Ergebnissen (z.B. 10 Knoten × 75% = 7,5 aktive Knoten) entsteht ein Restwert.

### 4.2 Grundanforderung
> **Alle Berechnungen und Baummodellierungen erfolgen ausschließlich mit ganzen Personen.**  
> Kein Knoten repräsentiert einen Bruchteil einer Person.

Damit scheiden aus:
- **Option D (Float intern)** — Knoten wären keine ganzen Personen mehr
- **Option E (Stochastisch)** — nicht deterministisch

### 4.3 Diskutierte Rundungsoptionen

| Name | Beschreibung | Bewertung |
|---|---|---|
| **A — Floor** | Rest wird abgeschnitten (7,5 → 7) | ⚠ Unterschätzt systematisch, Fehler akkumuliert |
| **B — Ceil** | Rest wird aufgerundet (7,5 → 8) | ⚠ Überschätzt systematisch |
| **C — Kaufmännisch** | Standard-Rundung (7,5 → 8, 7,4 → 7) | ⚠ Fehler akkumuliert sich teilweise |
| **D — Float intern** | Dezimalwerte intern, Rundung nur bei Ausgabe | ❌ Ausgeschlossen (keine ganzen Personen) |
| **E — Stochastisch** | Rest zufällig gewichtet gerundet | ❌ Ausgeschlossen (nicht deterministisch) |
| **F2 — Pool global** | Reste aller Knoten einer Ebene in gemeinsamen Topf | ✅ Einfach, stabil, aber Knoten nicht individuell |
| **F1 — Carry-over pro Knoten** | Jeder Knoten merkt eigenen Rest, trägt ihn ins Folgejahr | ✅✅ Realistischstes Modell |

### 4.4 Carry-over Modell (F1 — präzisiert)

Auf Anregung des Nutzers wurde F1 wie folgt präzisiert:

> Ein Knoten mit 75% Duplikationsrate braucht länger bis er einen neuen Member aufbaut.  
> Der "Rest" bedeutet: dieser zukünftige Member ist noch nicht überzeugt — kommt aber im Folgejahr dazu.

**Berechnungsbeispiel** (Member/Jahr: 2, Duplikation: 75% → 1,5 Punkte/Jahr pro aktivem Knoten):

| Jahr | Punkte kumuliert | Neue Member | Carry-over Rest |
|---|---|---|---|
| 1 | 0,75 | 0 | 0,75 |
| 2 | 0,75 + 0,75 = 1,5 | 1 | 0,5 |
| 3 | 0,5 + 0,75 = 1,25 | 1 | 0,25 |
| 4 | 0,25 + 0,75 = 1,0 | 1 | 0,0 |

### 4.5 Zwei Varianten von F1

**F1a — Member erscheint erst wenn vollständig** ✅ *Gewählt*  
Knoten erscheint im Baum erst wenn Fortschritt ≥ 1,0.  
→ Baum zeigt ausschließlich reale, ganze Personen.

**F1b — Member erscheint als "in Akquise"**  
Knoten erscheint sofort als Platzhalter (z.B. grau), wird erst bei ≥ 1,0 aktiv.  
→ Pipeline sichtbar, aber kein "echter" Knoten.

### 4.6 Entscheidung
> **F1a (Carry-over pro Knoten, Member erscheint erst wenn vollständig)** wurde gewählt.

---

## 5. Performance-Optimierung

### 5.1 Problem
F1a (Carry-over pro Knoten) erfordert bei großen Bäumen (Jahr 5+) Zustand für N Knoten × Jahre — hohe Rechenlast.

### 5.2 Diskutierte Optimierungsansätze

| Name | Beschreibung | Bewertung | Rechenlast | Dynamische Berechnung |
|---|---|---|---|---|
| **Lazy Evaluation** | Knoten werden nur berechnet wenn sichtbar/angefragt | ✅ Spart Speicher, schnell im Viewport | 🟡 Gering im Viewport, hoch bei Vollbaum | 🟡 Gut für Navigation, schlecht für Gesamtprojektion |
| **Ebenenbasierte Aggregation** | Pro Ebene eine Zahl (Anzahl aktive + Carry-over-Rest), Einzelknoten nur bei Bedarf | ✅✅ Drastisch weniger Zustand | 🟢 Sehr gering | ✅ Projektion O(Jahre), Baum expandiert on-demand |
| **Memoization / Cache** | Berechnete Ebenen gecacht, bei Parameteränderung nur betroffene neu berechnet | ✅ Schnelle Re-Berechnung bei Slider-Änderungen | 🟡 Mittel (Cache-Speicher) | 🟢 Sehr gut für interaktive Simulation |
| **Virtualisierter Baum** | Im DOM/Canvas nur sichtbare Knoten rendern | ✅ Löst Render-Problem, nicht Rechenproblem | 🟡 Mittel | 🟡 Gut für UI, irrelevant für Kalkulation |
| **Web Worker** | Berechnung in separatem Thread, UI bleibt responsiv | ✅ Kein Einfrieren der UI | 🔴 Hoch (gleiche Rechenlast, ausgelagert) | 🟢 Gut als Ergänzung, löst Grundproblem nicht allein |
| **Mathematische Formel (closed-form)** | Direkte Formel pro Ebene statt Iteration | ✅✅ Schnellste Lösung | 🟢 Minimal | 🟢 Perfekt für Projektion, aber F1a Carry-over schwer analytisch lösbar |

### 5.3 Empfohlene Kombination
```
Projektion (Zahlen)   →  Ebenenbasierte Aggregation + Memoization
Baumdarstellung       →  Virtualisierter Baum + Lazy Evaluation
UI-Responsivität      →  Web Worker (nur wenn nötig)
```

> **Hinweis:** Eine geschlossene Formel wäre ideal, scheitert aber an F1a — der Carry-over pro Ebene macht eine rein analytische Lösung schwierig. Bei Wechsel zu F2 (Pool pro Ebene) als Berechnungsbasis wäre die Formel wieder lösbar.

---

## 6. Parameter: Churn-Rate (Fluktuation)

### 6.1 Zeitpunkt der Anwendung

**Option A — Churn vor Wachstum**  
Erst Abgänge berechnen, dann neue Member rekrutieren.  
→ Schrumpfende Basis rekrutiert weniger. Pessimistisch.

**Option B — Churn nach Wachstum** ✅ *Gewählt*  
Erst neue Member dazuzählen, dann Abgänge berechnen.  
→ Neue Member können auch sofort wieder churnen. Realistischer.

### 6.2 Reattachment-Regel (strukturrelevant)
> Wenn ein Knoten das Netzwerk verlässt (churnt), werden seine Child-Knoten **nicht** gelöscht,  
> sondern rücken eine Ebene hoch zum **Parent des gelöschten Knotens**.

**Auswirkungen:**
- Gesamtzahl der Member sinkt um genau 1 pro Churn-Ereignis
- Ebenenstruktur verändert sich — Kinder rutschen hoch
- Relevant für tiefenabhängige Duplikation (Option 4, noch nicht implementiert)
- Strukturrelevante (aktive) Knoten sollten möglichst stabil bleiben

### 6.3 Worauf wird Churn angewendet?

| Option | Beschreibung | Bewertung | Rechenlast | Dynamische Berechnung |
|---|---|---|---|---|
| **Churn auf alle Knoten** | X% aller bestehenden Knoten verlassen das Netzwerk | 🟡 Einfach, aber trifft auch aktive Strukturgeber | 🟢 Ein Merkwert pro Ebene | 🟢 O(Ebenen) |
| **Churn nur auf passive Knoten** | Nur nicht-duplizierende Knoten churnen | ✅ Realistischer, aktive Knoten bleiben als Anker | 🟡 Zwei Merkwerte pro Ebene (aktiv + passiv) | 🟡 O(Ebenen × 2 Zustände) |
| **Churn nur auf neue Knoten** | Nur im letzten Jahr hinzugekommene Member churnen | ⚠ Zu optimistisch, nicht realistisch | — | — |

### 6.4 Carry-over bei Churn
Analog zu F1a: Restwert < 1,0 wird als Merkwert ins nächste Jahr übertragen.

**Beispiel** (11 Knoten × 30% Churn):
- 11 × 0,30 = 3,3 → 3 Abgänge, Rest 0,3 gespeichert
- Folgejahr: neuer Bestand × 30% + 0,3 Merkwert → erst wenn ≥ 1,0 wird weitere Person abgezogen

### 6.5 Offene Entscheidung
> Churn **nach Wachstum** wurde entschieden.  
> Zwischen "Churn alle Knoten" vs. "Churn nur passive Knoten" steht die Entscheidung noch aus.  
> Tendenz: **Churn nur passive Knoten** — realistischer, Baumstruktur stabiler, Reattachment trifft nur schwache Äste.

---

## 7. Gesamtmodell — Zusammenfassung der Entscheidungen

| Parameter | Entscheidung |
|---|---|
| Grundeinheit | Ausschließlich ganze Personen |
| Duplikationsmodell | Option 1: Aktive-Member-Rate |
| Restwert-Behandlung | F1a: Carry-over pro Knoten, Member erscheint erst bei ≥ 1,0 |
| Churn-Zeitpunkt | Nach Wachstum |
| Churn-Ziel | Offen (Tendenz: nur passive Knoten) |
| Churn-Restwert | Carry-over analog F1a |
| Reattachment | Child-Knoten rücken zu Großelternknoten |
| Performance-Strategie | Ebenenbasierte Aggregation + Memoization + Lazy Evaluation |

---

## 8. Noch nicht diskutierte / offene Themen

- **Tiefenabhängige Duplikation** (Option 4) — Duplikationsrate sinkt pro Ebene
- **Kombination Duplikation + Churn** in einer einzigen Formel
- **Geschlossene Formel** für das Gesamtmodell
- **Vergütungsmodell-Simulation** (Unilevel vs. Binary vs. Matrix)
- **Visualisierungsdetails** — Knotenstatus (aktiv/passiv/in Akquise/churned), Farbkodierung
- **Zeitpunkt der Carry-over-Auflösung** — wird der Rest am Jahresanfang oder Jahresende verrechnet?
- **Maximale Downline-Tiefe** — gibt es eine strukturelle Begrenzung?
- **Startbedingung** — beginnt die Simulation mit 1 Root-Knoten oder einer vorgegebenen Struktur?

---

## 9. Fragen für das externe Review

1. Ist F1a (Carry-over pro Knoten, nur ganze Personen) das mathematisch sauberste Modell für diesen Anwendungsfall, oder gibt es bessere Alternativen die die Ganzzahl-Anforderung erfüllen?
2. Wie verhält sich das Modell bei sehr kleinen Duplikationsraten (z.B. 10%) über viele Jahre — gibt es Stabilitätsprobleme?
3. Ist die Reattachment-Regel (Kinder rücken zu Großelternknoten) Standard in MLM-Simulationen, oder gibt es sinnvollere Alternativen?
4. Wie sollte Churn und Duplikation interagieren — wird Churn auf den Bestand *vor* oder *nach* Aktivitätsprüfung angewendet?
5. Gibt es einen eleganten Weg, F1a doch als geschlossene Formel zu lösen?
6. Welche weiteren Parameter wären für ein realistisches MLM-Netzwerkmodell wichtig, die hier noch nicht diskutiert wurden?