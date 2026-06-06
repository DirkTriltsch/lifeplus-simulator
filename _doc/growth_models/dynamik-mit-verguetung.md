# Auswirkungen des Vergütungsplans auf die dynamische Berechnung

**Projekt:** lifeflow360 — MLM-Simulator  
**Datum:** Juni 2026  
**Fokus:** Wie verändert der Vergütungs-Layer das Realtime-Verhalten?

---

## 1. Der fundamentale Wandel

**Vorher:** Eine Operation — `N(t) = g^t`. Microsekunden. Jeder Slider gleich teuer.

**Nachher:** Eine **Kette abhängiger Schichten** mit jeweils eigenem Update-Aufwand.

```
┌──────────────────────────┐
│  Aggregat (Closed-Form)  │  < 1 ms       Tier 1
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Baumstruktur (B2)       │  5–500 ms    Tier 4
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Eigenumsatz pro Knoten  │  1–50 ms     Tier 2/3
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Gruppenumsatz (Walk)    │  5–500 ms    Tier 3
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Status (Bottom-up)      │  20–500 ms   Tier 3
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Indizes & Beinanalyse   │  5–50 ms     Tier 3
└──────────────────────────┘
```

Die zentrale neue Frage ist nicht mehr *"wie schnell?"*, sondern *"was wird durch welche Änderung invalidiert?"*

---

## 2. Update-Klassifizierung pro Slider/Aktion

| Slider/Aktion | Tree | Volumen | Status | Indizes | Render | Tier | Latenz typisch |
|---|---|---|---|---|---|---|---|
| `m` ändern | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 4 | 50–500 ms |
| `d` (Duplikation) | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 4 | 50–500 ms |
| `c` (Churn) | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 4 | 50–500 ms |
| Jahre ändern | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 | 4 | 50–500 ms |
| Eigenumsatz (uniform) | — | 🔄 | 🔄 | 🔄 | 🔄 | 3 | 30–300 ms |
| Eigenumsatz (1 Knoten) | — | ⟿ Walk | ⟿ Walk | 🔄 | 🔄 | 2 | < 1 ms |
| Plan wechseln | — | — | 🔄 | 🔄 | 🔄 | 3 | 20–200 ms |
| Schwellwert ändern | — | — | 🔄 | 🔄 | 🔄 | 3 | 20–200 ms |
| Filter (ab Silver) | — | — | — | — | 🔄 | 1 | < 50 ms |
| Zoom / Pan | — | — | — | — | 🔄 | 1 | < 16 ms |
| Jahr scrubben (mit Snapshot) | 📤 cached | 📤 cached | 📤 cached | 📤 cached | 🔄 | 1 | < 16 ms |

Legende: 🔄 muss neu berechnet · ⟿ inkrementelles Update · 📤 aus Cache · — unverändert

**Konsequenz:** Ein "Slider-Event" ist nicht mehr atomar. Das UI muss erkennen, was sich geändert hat, und nur die nötigen Schichten neu rechnen.

---

## 3. Tier-Charakteristik

### Tier 1 — Instant (< 16 ms = 60fps)
**Beispiele:** Aggregat-Zahlen, Filter, Render-Toggles, Snapshot-Scrubbing.

**Verhalten:** Synchron in JS-Hauptthread, direkt nach Slider-Event. Kein Debouncing nötig.

### Tier 2 — Inkrementell (< 5 ms)
**Beispiele:** Einzelner Knoten ändert Umsatz.

**Verhalten:** O(depth) Walk hoch (10 Schritte). Synchron, instant.

### Tier 3 — Spürbar (20–500 ms)
**Beispiele:** Status-Pass, Plan-Wechsel, Schwellwert-Änderung.

**Verhalten:** Debouncing mit ~100 ms. Optional Worker bei N > 50k. Bei großen Bäumen Progress-Indikator.

### Tier 4 — Schwer (50 ms – mehrere Sekunden)
**Beispiele:** Strukturparameter (m, d, c).

**Verhalten:** Pflicht-Debouncing mit ~150 ms. Worker bei N > 50k. UI bleibt responsiv durch optimistic state.

---

## 4. Schlüsselmaßnahmen

### 4.1 Smart Invalidation (Reactive Dataflow)

Ein reaktiver Store (Zustand, Jotai, Signals, …) modelliert die Abhängigkeiten explizit:

```typescript
const aggregate = computed(() => calcAggregate(m, d, c, years))
const tree = computed(() => buildTree(aggregate))
const volumes = computed(() => walkVolume(tree, revenueModel))
const statuses = computed(() => walkStatus(volumes, plan))
const indices = computed(() => buildIndices(statuses))
```

Jede Schicht hängt nur von den Schichten ab, die sie wirklich braucht. Änderung an `plan` invalidiert nur `statuses` und `indices` — Tree und Volumen bleiben.

**Effekt:** Slider-Update auf Schwellwert kostet 20–200 ms statt 500 ms.

### 4.2 Snapshot Stream (Cache aller Jahre)

Initial-Berechnung produziert pro Jahr ein vollständiges Snapshot:

```typescript
snapshots[t] = { tree, volumes, statuses, indices }  // für t=1..10
```

User scrubt durch Jahre **instant** (Tier 1), weil alles vorberechnet.

**Speicher:** ~10× single tree. Bei N(10) = 30.000 → ~12 MB. Mobile-tauglich.

**Kosten:** Erst-Berechnung dauert länger (~5× single year), aber dann ist alles instant.

**Empfehlung:** Pflicht für die Standard-UX. Nur bei N > 200.000 deaktivieren.

### 4.3 Debounce-Strategie pro Tier

```
Slider-Event
    │
    ├── Tier 1 (Filter) ────────────────► sofort
    ├── Tier 2 (Einzelumsatz) ──────────► sofort
    ├── Tier 3 (Plan/Schwelle) ─────────► debounce 100ms
    └── Tier 4 (Struktur) ──────────────► debounce 150ms + Worker bei N>50k
```

Während Debouncing zeigt UI optimistic Preview (z.B. geschätzte neue Zahlen aus Closed-Form).

### 4.4 Worker-Boundaries

Web Worker übernimmt bei großen Bäumen die Tier-3/4-Arbeit:

```
Hauptthread:
  • UI / Slider-Events
  • Aggregat (Tier 1) immer hier
  • Tier 2 immer hier (zu schnell für Worker-Overhead)
  • Render

Worker:
  • Tree-Build (Tier 4)
  • Volume-Walk (Tier 3)
  • Status-Walk (Tier 3)
  • Indices (Tier 3)
  • Snapshot-Stream-Generation
```

**Wichtig:** Transfer-Overhead. Statt Tree als Objekt-Graph zu senden, **flat Arrays** transferieren (Structure-of-Arrays):

```typescript
type FlatTree = {
  parentIds: Int32Array
  yearOfBirth: Int16Array
  revenue: Float32Array
  groupVolume: Float32Array
  status: Uint8Array
}
```

Vorteile: Transfer via `Transferable` (Zero-Copy), bessere Cache-Lokalität, schnellere Walks.

### 4.5 Adaptive Strategie nach Netzwerkgröße

| N(10) | Strategie |
|---|---|
| < 1.000 | Alles sync, kein Worker, kein Snapshot Stream (zu schnell für Aufwand) |
| 1.000 – 10.000 | Snapshot Stream sync auf Hauptthread |
| 10.000 – 50.000 | Snapshot Stream sync, Worker optional |
| 50.000 – 250.000 | Worker pflicht, Snapshot Stream im Worker |
| > 250.000 | Aggregat-only, kein Volltree |

---

## 5. Neue Performance-Garantien

Mit Smart Invalidation + Snapshot Stream:

| Aktion | Vorher | Nachher |
|---|---|---|
| `m` Slider | 500 ms | 500 ms (Tier 4, unvermeidbar — aber debounced + Worker) |
| Schwellwert-Slider | 500 ms | 50 ms (Tier 3, nur Status) |
| Plan-Wechsel | 500 ms | 50 ms (Tier 3) |
| Jahr-Scrubbing | 500 ms | < 16 ms (Snapshot Stream) |
| Filter "ab Diamond" | 500 ms | < 16 ms (nur Render) |
| Einzelumsatz | 500 ms | < 1 ms (O(depth)) |
| Knoten anklicken / hover | n/a | < 1 ms |

**Effekt:** Die "schwere" Tier-4-Operation ist nur noch dann nötig, wenn der User wirklich die Netzwerkstruktur verändert. Alle anderen Slider werden **gefühlt instant**.

---

## 6. Neue UX-Patterns

### 6.1 Optimistic UI bei Tier-4

Slider an `m`: bevor die teure Tier-4-Operation abgeschlossen ist, zeigt UI bereits:
- Neue Aggregat-Zahlen (Closed-Form, sofort)
- Hochgerechnete Status-Verteilung (vorläufig, aus alter Verteilung skaliert)
- Greyed-out Baum mit Spinner

Nach Worker-Fertigstellung: Baum/Status werden "scharf gestellt".

### 6.2 Progress-Granularität

Bei N > 100k zeigt UI Progress pro Schicht:
```
[████████████░░░░] Baum aufbauen ...
[░░░░░░░░░░░░░░░░] Volumen berechnen
[░░░░░░░░░░░░░░░░] Status zuweisen
```

User sieht: es passiert was, es geht voran, ungefähr noch X Sekunden.

### 6.3 Stale-while-revalidate beim Plan-Vergleich

User wechselt von LifePlus zu FitLine:
- Baum + Volumen bleiben sichtbar (stale Status)
- Status-Pass läuft im Worker
- Sobald fertig: Status-Farben werden ausgetauscht

Kein Flackern, keine leere Anzeige.

### 6.4 Differential-Anzeige

Bei Parameter-Änderung kann UI zusätzlich zeigen:
- "+ 12 Bronze, − 3 Silver, + 1 Diamond" (gegenüber vorheriger Berechnung)

Macht abstrakte Slider-Bewegungen greifbar.

---

## 7. Worauf besonders zu achten ist

### 7.1 Combinatorial Explosion des Parameter-Cache

Cache-Keys mit 7+ Parametern (m, d, c, years, revenue_model, plan, thresholds) füllen LRU-Cache schnell mit nutzlosen Einträgen. **Lösung:** Cache nur die teuren Schichten (Tree), nicht alles.

### 7.2 Numerische Stabilität bei extremen Parametern

Bei `g` nahe 1 (z.B. m=1, d=0.5, c=0.5 → g=1.0) ist die Closed-Form numerisch stabil, aber das Apportionierungsverfahren kann oszillieren (Knoten erscheint Jahr 3, verschwindet Jahr 4, erscheint Jahr 5). UI muss visuell stabilisieren — z.B. Knoten 1 Jahr nach Verschwinden noch grau zeigen.

### 7.3 Mobile-Drosselung

Bei `prefers-reduced-motion` oder erkannter Batterie-Sparmodus:
- Snapshot Stream deaktivieren
- Worker deaktivieren (Battery-Drain durch zweiten Thread)
- Tier-3-Operationen bewusst auf User-Aktion einschränken (kein Hover-Trigger)

### 7.4 Determinismus

Apportionierung muss bei gleichen Parametern denselben Baum produzieren — sonst wirken Slider-Updates "flackernd". **Empfehlung:** Knoten bekommen stabile IDs basierend auf (Eltern-ID, Geburts-Jahr, Geschwister-Index).

---

## 8. Zusammenfassung

| Erkenntnis | Konsequenz |
|---|---|
| Berechnung ist kein Einzelschritt mehr, sondern eine Kette | Reactive Dataflow / Smart Invalidation |
| Nicht jeder Slider kostet gleich | Tier-Klassifizierung + per-Tier Debouncing |
| Snapshot Stream macht Zeit-Scrubbing kostenlos | Pflicht für mittlere Netzwerke |
| Worker entlastet Hauptthread | Pflicht ab N > 50k |
| Mobile-Budget wird enger | Adaptive Strategie ist nicht optional |
| Inkrementelle Updates sind möglich | Per-Knoten-Slider werden trivial schnell |
| Combinatorial Explosion bei vielen Parametern | Cache nur die teuren Schichten |

**Die gute Nachricht:** Mit Smart Invalidation und Snapshot Stream bleiben **alle Tier-1/2/3-Slider unter 100 ms**. Nur Strukturänderungen (Tier 4) brauchen echte Wartezeit — und die sind seltene, bewusste Aktionen, keine Slider-Streichelei.

**Das Ziel "Realtime-Berechnung" wird dadurch nicht unmöglich, sondern differenzierter** — nicht alles ist realtime, aber alles was *häufig* passiert, schon.

---

## 9. Offene Fragen für Review

1. Ist die vorgeschlagene Tier-Einteilung sinnvoll, oder gibt es UX-Patterns aus Daten-Visualisierungs-Tools (Tableau, Observable, Vega), die hier besser passen?
2. Ist der Snapshot-Stream-Speicheraufwand (~10× single tree) auf Low-End-Mobile vertretbar, oder brauchen wir komprimierte Snapshots?
3. Sollte die Tier-3-Status-Berechnung partiell sein (nur für sichtbare Knoten) statt vollständig?
4. Wie verhält sich Web Worker auf iOS bzgl. Memory-Limits — gibt es bekannte Stolpersteine?
5. Lohnt sich WebAssembly für die Tier-3/4-Pässe, oder ist JS schnell genug?
6. Wie modellieren wir Plan-Vergleich (LifePlus vs. FitLine parallel) — eigene Worker pro Plan oder sequentiell?
