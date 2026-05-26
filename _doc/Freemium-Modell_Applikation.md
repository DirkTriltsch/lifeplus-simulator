# Freemium in der App: Implementierungs-Konzept

**Stand:** 2026-05-25
**Status:** reviewed / zur technischen Umsetzung
**Bezug:** [Freemium-Modell](./Freemium-Modell.md) (Produktentscheidungen), [Konzept Paddle-Integration und App-Architektur](./Konzept%20Paddle-Integration%20und%20App-Architektur.md) (Auth/Entitlement-Flow)

---

## Review-Ergebnis 2026-05-25

Das Dokument ist als Architekturvorschlag sinnvoll, muss fuer die naechste Umsetzung aber enger gefuehrt werden:

1. **Kurzfristig gibt es genau zwei App-Modi:** `free` und `pro`.
2. **Pro ist der heutige Ist-Zustand der App.** Alles, was heute funktioniert, muss im Pro-Modus ohne funktionale Regression weiter funktionieren.
3. **Free ist kein Paywall-Zustand mehr.** Ein Free-User ist authentifiziert und hat ein aktives Entitlement `access_level = free`; die App wird gerendert, aber mit eingeschraenktem Verhalten.
4. **Ent/Ultra bleiben Architektur-Optionen, aber nicht MVP-Scope.** Die Capability-Struktur darf sie vorbereiten, aber die erste Implementierung darf nicht durch Team-/Enterprise-Features komplizierter werden.
5. **Szenario-Speicherung ist aktuell kritisch:** Die App speichert heute lokal via `localStorage`. Wenn Free "keine Szenario-Speicherung" bedeutet, muss diese Persistenz im Free-Modus bewusst deaktiviert oder auf Session-only reduziert werden.
6. **Client-Gates sind UX-Gates, keine Sicherheitsgrenze.** Alles, was spaeter serverseitige Daten oder Speicherung betrifft, muss serverseitig erneut geprueft werden.

Damit lautet die technische Zielrichtung:

- `free`: App sichtbar, aber Jahr 1-4 scharf, ab Jahr 5 Teaser/Blur/Lock, KPI auf Jahr 4, keine dauerhafte lokale Szenario-Speicherung, kein Export, begrenzte Visualisierungen, Upgrade-CTA sichtbar.
- `pro`: exakt heutiges Verhalten, 10 Jahre, alle Visualisierungen, lokale Persistenz wie heute, alle aktuellen Features aktiv.

---

## 1. Zielsetzung

Dieses Dokument beschreibt, **wie** der im [Freemium-Modell](./Freemium-Modell.md) festgelegte Funktionsumfang technisch in der React-App (`simulator-app/`) umgesetzt wird.

Kurzfassung des Produktziels:

- **Free**: reduzierte Sichtbarkeit / Funktionalitaet — Jahr 1-4 scharf, ab Jahr 5 Blur, KPI zeigt Jahr 4, keine Szenario-Speicherung, kein Export, kein Vergleichsmodus
- **Pro (inkl. Trial, Promo, Founder)**: voller Einzel-User-Umfang
- **Ent / Enterprise** (geplant): Pro + Team-Features (mehrere User unter einem Account, zentrale Abrechnung, mehr gespeicherte Szenarien)
- **Ultra** (geplant): Ent + Premium-Features (White-Label, unbegrenzte Team-Groesse, dedizierter Support, API-Zugang)
- Spaeter denkbar: weitere Tiers wie `Lifetime`, `Affiliate`, oder Sondervarianten

Die Implementierung soll **n Tiers** zulassen — aber die erste Umsetzung bleibt bewusst binaer: Free vs. Pro. Konkret: neue Tiers werden spaeter als zusaetzliche Capability-Map hinzugefuegt, ohne dass Komponenten angefasst werden muessen.

### MVP-Abgrenzung fuer die erste Implementierung

Trotz zukunftsfaehiger Capability-Struktur wird die erste Produktversion bewusst auf **zwei Modi** begrenzt:

| Modus | Quelle im Backend | App-Verhalten |
|---|---|---|
| `free` | aktives Entitlement mit `access_level = free` | App wird angezeigt, aber mit Free-Limits |
| `pro` | aktives Entitlement mit `access_level = pro`; Trial, Promo, Lifetime und Founder werden fuer die App ebenfalls wie Pro behandelt | App funktioniert wie heute |

`authenticated_no_entitlement` bleibt ein Fehler-/Auffangzustand und zeigt weiter die Paywall. Er ist **nicht** der Free-Modus.

Wichtige Regel: **Pro darf nicht neu gebaut werden.** Die Free-Implementierung muss sich wie eine Einschraenkungsschicht ueber den heutigen App-Zustand legen. Wenn `features.tier === 'pro'`, sollen Datenfluss, UI, Persistenz und Interaktionen identisch zum aktuellen Stand bleiben.

---

## 2. Grundsatz-Entscheidung: Capability-basiertes Pattern

Statt ueberall im Code `if (tier === 'free')` zu streuen, kapseln wir die Tier-Unterschiede in einem zentralen **Capability-Object**. Komponenten fragen *was sie duerfen*, nicht *wer der User ist*.

```tsx
// Schlecht (skaliert nicht):
const tier = useTier();
if (tier === 'free') {
  return <BlurredChart />;
} else {
  return <FullChart />;
}

// Besser (Capability-Pattern):
const features = useFeatures();
return <Chart maxVisibleYear={features.maxVisibleYear} />;
```

### Warum dieses Pattern

| Vorteil | Begruendung |
|---|---|
| **Eine Quelle der Wahrheit** | Konzeptaenderung ("Jahr 5 statt Jahr 4 als Grenze") aendert *eine* Datei, nicht 8 |
| **Zukunftssicher** | Trial, Promo, Founder bekommen eigene Capability-Maps ohne Code-Refactor |
| **Testbar** | Komponenten testen mit `features={{ maxVisibleYear: 4 }}` als Prop / Mock |
| **Klare Trennung** | *Wer* ist der User (Auth-Schicht) vs. *was* darf er (Capability-Schicht) |
| **Lesbar** | `features.canExport` ist selbstdokumentierend, `tier === 'pro'` ist es nicht |

### Tradeoffs

| Nachteil | Bewertung |
|---|---|
| Leichte Indirektion (statt `tier === 'free'` → `!features.canExport`) | Akzeptabel, lesbarer |
| ~50 Zeilen Setup-Code upfront (Hook + Map + Types) | Bei 4+ betroffenen Komponenten klar gerechtfertigt |
| Komponenten koppeln an `useFeatures()` statt direkt an Tier | Gut fuer Testing, leichter Overhead beim Lesen |

Fuer 4-7 betroffene Komponenten lohnt sich die Indirektion klar. Bei nur 1-2 waere es Overkill.

---

## 3. Drei-Schichten-Architektur

```
┌──────────────────────────────────────────────────────┐
│ Schicht 1 — Auth / Identitaet                        │
│ src/auth/useAuth.tsx (vorhanden, leicht erweitern)   │
│ Quelle: me.entitlements[0].plan + .active            │
│ src/features/tiers.ts (neu)                          │
│ Output: tier = 'free' | 'pro' | 'ent' | 'ultra'      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ Schicht 2 — Capability-Map                           │
│ src/features/featureFlags.ts (neu)                   │
│ Statisches Mapping: tier → Features                  │
│ FREE → PRO → ENT → ULTRA (Inheritance via Spread)    │
│ + orthogonale Flags fuer Trial/Promo/Founder         │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ Schicht 3 — Hook                                     │
│ src/features/useFeatures.ts (neu)                    │
│ const features = useFeatures();                      │
│ const isEnt = useTierMeets('ent');                   │
│ → Komponenten konsumieren Capability-Object          │
└──────────────────────────────────────────────────────┘
```

### Mapping aktueller Auth-Status auf Tier

| `useAuth().status` (heute) | `me.entitlements[0].plan` | Tier | Begruendung |
|---|---|---|---|
| `loading` | – | `null` | Ladezustand, keine Anzeige |
| `anonymous` | – | `null` | LoginGate uebernimmt |
| `authenticated_no_entitlement` | – | `null` | Paywall uebernimmt — sollte nach Freemium-Launch selten sein, da Free-Login automatisch Free-Entitlement anlegt |
| `authenticated_active` | `'free'` | `'free'` | Free-User, App mit Limits |
| `authenticated_active` | `'pro'` | `'pro'` | Pro-User, volle Einzel-App |
| `authenticated_active` | `'trial'` / `'promo'` | `'pro'` | Zeitlich begrenzter oder rabattierter Pro-Zugang, gleiche App-Capabilities |
| `authenticated_active` | `'ent'` / `'enterprise'` | `'ent'` | Ent-User, Pro + Team-Features |
| `authenticated_active` | `'ultra'` | `'ultra'` | Ultra-User, voller Funktionsumfang inkl. Premium |
| `authenticated_active` | `'lifetime'` / `'founder'` | `'pro'` (oder eigenes Tier) | Historische / Sondervarianten — auf Pro mappen, ggf. eigene Capability fuer Founder-Badge |
| `authenticated_past_due` | beliebig | aktueller Tier (Karenzzeit) | Standard-Karenz; spaeter ggf. eigenes Verhalten |
| `device_limit_reached` | – | n/a | DeviceLimitGate uebernimmt |

Wichtig: Das `AuthGate` bleibt der erste Filter (rendert `LoginGate`, `Paywall`, `DeviceLimitGate`). Erst wenn der User die App sieht, greift die Capability-Schicht.

Das Mapping von `plan`-String zu `Tier`-Enum geschieht zentral in einer kleinen Funktion `mapPlanToTier(plan)`, damit Backend-Aenderungen (z. B. neue plan-Strings) nur an *einer* Stelle gepflegt werden.

### Aktueller Code-Stand, den die Doku beruecksichtigt

Der heutige Login-/Free-Start-Flow ist bereits vorbereitet:

- Die Pricing-Seite fordert beim Free-Start einen Magic Link mit `access = free` an.
- Der Magic Link traegt `access=free` in die App.
- `LoginGate` uebergibt dieses Flag an `/api/auth/verify-link`.
- Das Backend legt beim Verify ein aktives Free-Entitlement an.
- `/api/me` liefert anschliessend `entitlements[0].plan = 'free'`.

Das ist wichtig fuer die App-Implementierung: Free ist **kein anonymer Demo-Modus** und auch **kein fehlendes Entitlement**, sondern ein normal eingeloggter App-Zustand mit eingeschraenkten Capabilities.

---

## 4. Feature-Flag-Definition

Vollstaendige Capability-Map basierend auf [§6 des Freemium-Modells](./Freemium-Modell.md). Tiers werden als geordnete Hierarchie modelliert: jeder hoehere Tier **erweitert** den vorherigen via Spread-Operator.

### Tier-Hierarchie

```
free  <  pro  <  ent  <  ultra
```

Niedrigere Tiers sind in hoeheren enthalten. Beispiel: Ein Ent-User kann *alles*, was ein Pro-User kann, plus Team-Features.

### Tier-Typ und Ordering

```typescript
// src/features/tiers.ts

export type Tier = 'free' | 'pro' | 'ent' | 'ultra';

// Reihenfolge fuer "mindestens X"-Checks. Hoeher = mehr Rechte.
export const TIER_ORDER: Record<Tier, number> = {
  free: 0,
  pro: 1,
  ent: 2,
  ultra: 3,
};

export function tierMeets(actual: Tier | null, minimum: Tier): boolean {
  if (!actual) return false;
  return TIER_ORDER[actual] >= TIER_ORDER[minimum];
}

// Backend-plan-Strings → Tier. Zentrale Stelle fuer Schreibvarianten.
export function mapPlanToTier(plan: string | undefined | null): Tier | null {
  if (!plan) return null;
  switch (plan.toLowerCase()) {
    case 'free':
      return 'free';
    case 'pro':
    case 'trial':      // zeitlich begrenzter Pro-Zugang
    case 'promo':      // rabattierter / code-basierter Pro-Zugang
    case 'lifetime':   // Sondervariante, gibt Pro-Rechte
    case 'founder':    // Sondervariante, gibt Pro-Rechte (Badge separat)
      return 'pro';
    case 'ent':
    case 'enterprise':
      return 'ent';
    case 'ultra':
    case 'premium':
      return 'ultra';
    default:
      console.warn(`Unknown plan "${plan}", treating as free.`);
      return 'free';
  }
}
```

### Features-Interface

```typescript
// src/features/featureFlags.ts

export interface Features {
  // Modus / Diagnose
  tier: Tier;
  // ─── Chart / Visualisierung ────────────────────────────
  maxVisibleYear: number;       // letzter scharf gezeichneter Jahr-Index
  yearBlurStart: number;        // ab welchem Jahr Blur einsetzt
  yearLockStart: number;        // ab welchem Jahr Lock-Overlay
  // ─── KPI-Karte ─────────────────────────────────────────
  kpiYear: number;              // welchen Jahres-Wert die Provisions-Karte zeigt
  // ─── Slider / Interaktion ──────────────────────────────
  sliderInteractiveYears: number; // Live-Update bis Jahr X
  // ─── Szenarien / Speicherung ───────────────────────────
  canSaveScenarios: boolean;
  maxStoredScenarios: number;
  persistenceMode: 'none' | 'session' | 'local';
  canCompareScenarios: boolean;
  // ─── Export / Sharing ──────────────────────────────────
  canExport: boolean;
  canShareScenarioUrl: boolean;
  // ─── CTA / Marketing ───────────────────────────────────
  showUpgradeCta: boolean;
  showProBadge: boolean;        // "Pro zeigt Jahr 10"-Hinweis
  // ─── Team / Enterprise (Ent, Ultra) ────────────────────
  canManageTeam: boolean;
  maxTeamMembers: number;       // 0 = Single-User, n = Team-Slots, Infinity = unbegrenzt
  canCentralBilling: boolean;
  // ─── Premium / Ultra ───────────────────────────────────
  hasApiAccess: boolean;
  hasCustomBranding: boolean;
  hasDedicatedSupport: boolean;
}
```

### Capability-Maps pro Tier

Jeder hoehere Tier wird per Spread vom vorherigen abgeleitet und ueberschreibt nur, was *anders* ist. Das macht sofort lesbar, was jeder Tier *zusaetzlich* freischaltet.

```typescript
// src/features/featureFlags.ts (Fortsetzung)

const FREEMIUM_YEAR_LIMIT = 4;

// Basis: Free
export const FREE_FEATURES: Features = {
  // Modus
  tier: 'free',
  // Chart
  maxVisibleYear: FREEMIUM_YEAR_LIMIT,
  yearBlurStart: FREEMIUM_YEAR_LIMIT + 1,
  yearLockStart: FREEMIUM_YEAR_LIMIT + 3,
  // KPI
  kpiYear: FREEMIUM_YEAR_LIMIT,
  // Slider
  sliderInteractiveYears: FREEMIUM_YEAR_LIMIT,
  // Szenarien
  canSaveScenarios: false,
  maxStoredScenarios: 0,
  persistenceMode: 'session',
  canCompareScenarios: false,
  // Export
  canExport: false,
  canShareScenarioUrl: false,
  // CTA
  showUpgradeCta: true,
  showProBadge: true,
  // Team
  canManageTeam: false,
  maxTeamMembers: 0,
  canCentralBilling: false,
  // Premium
  hasApiAccess: false,
  hasCustomBranding: false,
  hasDedicatedSupport: false,
};

// Pro: voller Einzel-User-Umfang, keine Team-/Premium-Features
export const PRO_FEATURES: Features = {
  ...FREE_FEATURES,
  // Modus
  tier: 'pro',
  // Chart
  maxVisibleYear: 10,
  yearBlurStart: 11,     // > 10 = nie
  yearLockStart: 11,
  // KPI
  kpiYear: 10,
  // Slider
  sliderInteractiveYears: 10,
  // Szenarien
  canSaveScenarios: true,
  maxStoredScenarios: Number.POSITIVE_INFINITY,
  persistenceMode: 'local',
  canCompareScenarios: true,
  // Export
  canExport: true,
  canShareScenarioUrl: true,
  // CTA
  showUpgradeCta: false,
  showProBadge: false,
};

// Ent: Pro + Team-Features (Beispiel-Werte, TBD je nach Geschaeftsmodell)
export const ENT_FEATURES: Features = {
  ...PRO_FEATURES,
  tier: 'ent',
  canManageTeam: true,
  maxTeamMembers: 10,        // TBD: Default-Team-Groesse
  canCentralBilling: true,
};

// Ultra: Ent + Premium-Features (Beispiel-Werte, TBD)
export const ULTRA_FEATURES: Features = {
  ...ENT_FEATURES,
  tier: 'ultra',
  maxTeamMembers: Number.POSITIVE_INFINITY,
  hasApiAccess: true,
  hasCustomBranding: true,
  hasDedicatedSupport: true,
};

// Zentrale Lookup-Map fuer Tier → Features
export const TIER_FEATURES: Record<Tier, Features> = {
  free: FREE_FEATURES,
  pro: PRO_FEATURES,
  ent: ENT_FEATURES,
  ultra: ULTRA_FEATURES,
};
```

**Hinweis zu Ent/Ultra-Werten:** Die konkreten Capabilities (max. Team-Groesse, API-Limits, Branding-Optionen) sind im aktuellen Geschaeftsmodell noch **nicht definiert** und stehen hier als Platzhalter. Sobald Ent/Ultra konkret werden, werden die Werte in einer Ergaenzung des Freemium-Konzepts festgelegt.

### Erlaeuterungen zu Year-5-6 Teaser-Zone (Free)

Aus dem Freemium-Konzept (§8 Psychologisches Design):

- Jahr 1-4: voll sichtbar, scharf → `maxVisibleYear = 4`
- Jahr 5-6: angedeutet/halbtransparent, Werte maskiert (z. B. `1•.••• €`) → `yearBlurStart = 5`, `yearLockStart = 7`
- Jahr 7-10: stark verschwommen/locked, nur Verlauf erkennbar → `yearLockStart = 7`

Konkret im ProvisionChart: Wert-Tooltips bis Jahr 4 voll, Jahr 5-6 maskiert, Jahr 7-10 gar nicht klickbar.

### Hook

```typescript
// src/features/useFeatures.ts

import { useAuth } from '../auth/useAuth';
import { FREE_FEATURES, TIER_FEATURES, type Features } from './featureFlags';
import { mapPlanToTier, type Tier } from './tiers';

export function useTier(): Tier | null {
  const { me, status } = useAuth();
  if (status !== 'authenticated_active' && status !== 'authenticated_past_due') {
    return null;
  }
  return mapPlanToTier(me?.entitlements?.[0]?.plan);
}

export function useFeatures(): Features {
  const tier = useTier();
  if (!tier) return FREE_FEATURES;  // Default-Fallback
  return TIER_FEATURES[tier];
}

// Convenience-Hook fuer "mindestens Tier X"-Gates
export function useTierMeets(minimum: Tier): boolean {
  const tier = useTier();
  return tier ? TIER_ORDER[tier] >= TIER_ORDER[minimum] : false;
}
```

### Verwendung in Komponenten

```tsx
// Capability-basiert (Standard)
const features = useFeatures();
if (features.canManageTeam) { ... }

// Tier-vergleichend (fuer Sektionen, die "ab Ent" sichtbar sind)
const isEntOrHigher = useTierMeets('ent');
if (isEntOrHigher) {
  return <TeamPanel />;
}
```

Empfehlung: **Capability-basiert bevorzugen** (`features.canManageTeam`), weil aenderbar bei Tier-Umstrukturierung. `useTierMeets` nur dort, wo wirklich ganze UI-Sektionen tier-gegated sind (z. B. komplettes Team-Panel).

---

## 5. Komponenten-Mapping

| Komponente | Datei | Was sich aendert |
|---|---|---|
| **Auth-Layer** | [src/auth/useAuth.tsx](../simulator-app/src/auth/useAuth.tsx) | `tier`-Ableitung optional zusaetzlich exportieren (nicht zwingend, kann auch nur in `useTier` leben) |
| **Tier-Typ + Ordering + Plan-Mapping** | `src/features/tiers.ts` (neu) | `Tier`-Union, `TIER_ORDER`, `tierMeets`, `mapPlanToTier` |
| **Capabilities** | `src/features/featureFlags.ts` (neu) | `Features`-Interface, FREE/PRO/ENT/ULTRA_FEATURES, TIER_FEATURES-Map |
| **Hook** | `src/features/useFeatures.ts` (neu) | `useTier()`, `useFeatures()`, `useTierMeets()` |
| **App-Shell / Persistenz** | [src/App.tsx](../simulator-app/src/App.tsx) | lokale Speicherung nur bei `persistenceMode === 'local'`; Free hoechstens Session-State |
| **Chart** | [src/components/ProvisionChart.tsx](../simulator-app/src/components/ProvisionChart.tsx) | X-Achse bis `maxVisibleYear` scharf, danach CSS-`filter: blur()` + Overlay mit Upgrade-CTA |
| **KPI / Hero-Zahl** | [src/components/HeroNumber.tsx](../simulator-app/src/components/HeroNumber.tsx) | Quelle `network[features.kpiYear - 1]`, mit `showProBadge`-Hinweis |
| **StatCard** | [src/components/StatCard.tsx](../simulator-app/src/components/StatCard.tsx) | analog zu HeroNumber, falls Stats Jahr 10 zeigen |
| **Slider** | [src/components/Slider.tsx](../simulator-app/src/components/Slider.tsx) | Recompute laeuft fuer alle 10 Jahre, sichtbare Updates nur fuer Jahr 1-`sliderInteractiveYears` |
| **Tabelle** | [src/components/YearlySummaryTable.tsx](../simulator-app/src/components/YearlySummaryTable.tsx) | Zeilen ab `maxVisibleYear+1` unscharf / maskiert |
| **Network-Vis** | [src/components/NetworkVisualizations.tsx](../simulator-app/src/components/NetworkVisualizations.tsx) | Visualisierungen auf Jahr 1-4 begrenzen; Pro-Visualisierungen gegated |
| **Settings-Drawer** | [src/components/SettingsDrawer.tsx](../simulator-app/src/components/SettingsDrawer.tsx) | "Szenario speichern" disabled bei `!canSaveScenarios` |
| **Account-Panel** | [src/components/AccountPanel.tsx](../simulator-app/src/components/AccountPanel.tsx) | Free-Status sichtbar, "Upgrade auf Pro"-Button |
| **Upgrade-Badge** | `src/components/UpgradeBadge.tsx` (neu) | Wiederverwendbare CTA-Komponente, conditional via `features.showUpgradeCta` |

### Korrektur: lokale Persistenz ist heute bereits vorhanden

Die App speichert den aktuellen Zustand heute in [src/App.tsx](../simulator-app/src/App.tsx) per `localStorage` (`loadPersistedState`, `savePersistedState`, `clearPersistedState`). Das ist fuer Pro korrekt und soll unveraendert bleiben.

Fuer Free muss entschieden und umgesetzt werden:

| Option | Verhalten | Bewertung |
|---|---|---|
| `persistenceMode = 'none'` | Free startet bei jedem Reload mit Defaults | strengste Interpretation von "keine Speicherung", aber frustrierender |
| `persistenceMode = 'session'` | Free darf waehrend der aktuellen Browser-Session arbeiten, Reload/Tab-Neustart verliert Zustand | empfohlener MVP-Kompromiss |
| `persistenceMode = 'local'` | Free speichert wie Pro | widerspricht dem Freemium-Modell, nicht empfohlen |

Empfehlung fuer MVP: **Free = `session`**, Pro = `local`.

Technische Umsetzung:

```tsx
const features = useFeatures();

useEffect(() => {
  if (features.persistenceMode !== 'local') return;
  savePersistedState(productId, state);
}, [features.persistenceMode, productId, state]);
```

Beim Wechsel von Pro zu Free muss der lokale Pro-State nicht geloescht werden, aber Free darf ihn nicht ungefiltert wiederherstellen. Empfehlung: `loadPersistedState()` nur fuer `persistenceMode === 'local'` nutzen oder den geladenen State beim Downgrade auf Free-Capabilities beschneiden.

### Beispiel: ProvisionChart-Aenderung (Skizze)

```tsx
// Vorher (verkuerzt)
function ProvisionChart({ data }: Props) {
  return <LineChart data={data} />;
}

// Nachher
function ProvisionChart({ data }: Props) {
  const features = useFeatures();
  const visibleData = data.slice(0, features.maxVisibleYear);
  const teaserData = data.slice(features.maxVisibleYear, features.yearLockStart - 1);
  const lockedData = data.slice(features.yearLockStart - 1);

  return (
    <div className="relative">
      <LineChart data={[...visibleData, ...teaserData, ...lockedData]}
                 blurStartAt={features.yearBlurStart}
                 lockStartAt={features.yearLockStart} />
      {features.showUpgradeCta && (
        <UpgradeBadge position="chart-overlay" hint="Sieh deinen Jahr-10-Wert mit Pro" />
      )}
    </div>
  );
}
```

### Beispiel: HeroNumber-Aenderung

```tsx
function HeroNumber({ network }: Props) {
  const features = useFeatures();
  const value = network[features.kpiYear - 1].provision;

  return (
    <div>
      <span className="label">Provision in Jahr {features.kpiYear}</span>
      <span className="value">{formatEuro(value)}</span>
      {features.showProBadge && (
        <UpgradeBadge size="sm" hint="Pro zeigt Jahr 10" />
      )}
    </div>
  );
}
```

---

## 6. Implementierungsreihenfolge

Empfohlen, weil jede Stufe selbst testbar ist und nichts blockiert:

1. **Foundation** (~80 Zeilen, ~30 Min)
   - `useAuth` Tier-Ableitung integrieren oder belassen
   - `featureFlags.ts` mit Free/Pro-Maps anlegen
   - `useFeatures.ts` mit Hook + Tests
   - Verifizieren via Console: `useFeatures()` liefert korrekte Map fuer Free/Pro-Test-Accounts

2. **Kern-Conversion-Gates** (die wichtigsten Trigger zuerst)
   - **ProvisionChart**: Blur ab Jahr 5, Lock ab Jahr 7
   - **HeroNumber**: zeigt Jahr 4 statt Jahr 10 bei Free
   - **StatCard**: analog HeroNumber, falls relevant
   - **UpgradeBadge-Komponente** parallel anlegen (klein gehalten)

3. **Sekundaere Gates**
   - **YearlySummaryTable**: Zeilen 5-10 maskiert
   - **NetworkVisualizations**: Year-aware
   - **Slider**: Live-Updates Year-Limited (intern weiterhin 10 Jahre Compute)

4. **UX / Account**
   - **AccountPanel**: Free-Status sichtbar machen, Upgrade-Button
   - **SettingsDrawer**: gegate Aktionen disablen mit Tooltip "Pro-Feature"

5. **Polish**
   - UpgradeBadge an strategischen Stellen platzieren (Chart-Overlay, KPI, Account)
   - Texte/Wording final abstimmen (siehe [Webcontent & Value Proposition](./Webcontent%20%26%20Value%20Proposition.md))

6. **Pro-Regression-Test**
   - Mit Pro-Testuser pruefen, dass Jahr-10-KPI, Chart, Network-Views, Settings, Goals und lokale Persistenz exakt wie vorher funktionieren
   - Free-Gates duerfen nur greifen, wenn `features.tier === 'free'`
   - Jede Komponente, die Free einschraenkt, braucht mindestens einen Test fuer Pro = unveraendert

### Reihenfolge-Begruendung

Schritt 2 zuerst, weil das **die kaufentscheidende Frage** beantwortet (Jahr-10-Kurve, Jahr-10-KPI). Sobald die zwei Gates stehen, sieht der Free-User das Versprechen. Alles andere ist Feinschliff.

---

## 7. Testbarkeit

Die Capability-Schicht ist gezielt entkoppelt, damit Komponenten ohne Auth-Setup getestet werden koennen.

### Unit-Tests Komponenten

```tsx
// ProvisionChart.test.tsx (Beispiel)
vi.mock('../features/useFeatures', () => ({
  useFeatures: () => ({ ...FREE_FEATURES }),
}));

test('Free: Chart blurred ab Jahr 5', () => {
  render(<ProvisionChart data={mockData} />);
  expect(screen.getByTestId('year-4')).not.toHaveClass('blurred');
  expect(screen.getByTestId('year-5')).toHaveClass('blurred');
});
```

### Storybook / Visual-Tests

Free vs. Pro als zwei Stories, gleicher Komponenten-Input, unterschiedliche `features`-Map → klar sichtbarer Unterschied im Visual.

### E2E

Cypress / Playwright: zwei Test-Accounts (Free, Pro) — pruefen, dass Chart-Blur, KPI-Wert, Disabled-Buttons stimmen.

### Akzeptanzkriterien MVP

| Fall | Erwartung |
|---|---|
| Free-User oeffnet App | App rendert, kein Paywall-Screen |
| Free-User sieht Chart | Jahr 1-4 sichtbar, Jahr 5-6 Teaser/maskiert, Jahr 7-10 locked |
| Free-User veraendert Slider | Berechnung bleibt stabil, sichtbare Werte bleiben im Free-Rahmen |
| Free-User laedt Seite neu | kein persistiertes Pro-artiges Szenario aus `localStorage` wird automatisch wiederhergestellt |
| Free-User klickt Pro-CTA | Pricing-/Checkout-Pfad oeffnet sich |
| Pro-User oeffnet App | Verhalten ist identisch zum heutigen Stand |
| Pro-User laedt Seite neu | lokale Persistenz funktioniert wie heute |
| Pro-User nutzt Network-Views | alle aktuellen Visualisierungen bleiben verfuegbar |
| Unbekannter Plan-String | App faellt auf Free-Capabilities zurueck und loggt Warnung |

---

## 8. Tier-Erweiterung und orthogonale Zustaende

Es gibt zwei Arten, das Tier-System zu erweitern. Beide aendern *nichts* an den Komponenten — nur an `featureFlags.ts` und `useFeatures.ts`.

### 8.1 Neuer Tier hinzufuegen (z. B. spaeter "Team" zwischen Pro und Ent)

Drei Schritte, alle in `src/features/`:

```typescript
// 1) Tier-Union erweitern
export type Tier = 'free' | 'pro' | 'team' | 'ent' | 'ultra';

// 2) Ordering aktualisieren
export const TIER_ORDER: Record<Tier, number> = {
  free: 0, pro: 1, team: 2, ent: 3, ultra: 4,
};

// 3) Capability-Map definieren (per Spread, nur Deltas)
export const TEAM_FEATURES: Features = {
  ...PRO_FEATURES,
  canManageTeam: true,
  maxTeamMembers: 3,
};

// 4) TIER_FEATURES-Map ergaenzen
export const TIER_FEATURES = {
  free: FREE_FEATURES, pro: PRO_FEATURES, team: TEAM_FEATURES,
  ent: ENT_FEATURES, ultra: ULTRA_FEATURES,
};

// 5) Backend-Mapping ergaenzen
case 'team': return 'team';
```

Komponenten konsumieren weiter `useFeatures()` und sehen die neuen Werte automatisch.

### 8.2 Orthogonale Zustaende: Trial, Promo, Founder

Trial, Promo und Founder sind **keine eigenen Tiers** — sie sind Pro mit Zusatz-Informationen (Banner, Badge, Countdown). Sie sollten **als parallele Flags** im Features-Object modelliert werden, nicht als separate Stufe in der Hierarchie:

```typescript
// Features-Interface erweitern um orthogonale Flags
export interface Features {
  // ... bisherige Felder ...
  // Orthogonal zur Tier-Hierarchie:
  showTrialBanner: boolean;
  trialDaysRemaining: number | null;
  showFounderBadge: boolean;
  showPromoBadge: boolean;
}

// In useFeatures(): Defaults aus TIER_FEATURES + orthogonale Overrides
export function useFeatures(): Features {
  const tier = useTier();
  const base = tier ? TIER_FEATURES[tier] : FREE_FEATURES;
  const entitlement = useAuth().me?.entitlements?.[0];

  return {
    ...base,
    showTrialBanner: entitlement?.source === 'signup_trial',
    trialDaysRemaining: computeDaysRemaining(entitlement?.validUntil),
    showFounderBadge: entitlement?.source === 'founder',
    showPromoBadge: entitlement?.source === 'promo_code',
  };
}
```

Begruendung: Ein Trial-User ist faktisch ein Pro-User mit zeitlicher Begrenzung — alle Pro-Capabilities sind verfuegbar. Es waere falsch, ein Trial-Tier zwischen Pro und Free zu schieben, denn Trial koennte spaeter genauso ein Ent-Trial oder Ultra-Trial sein. Trial/Promo/Founder sind also **orthogonal**, nicht hierarchisch.

### 8.3 Visualisierung Tier vs. Orthogonal

```
Hierarchisch (Tier):   free  <  pro  <  ent  <  ultra
                         |       |       |        |
                         +-------+-------+--------+
                                 |
                Orthogonal:  isTrial? isFounder? isPromo?
                                 |
                          (kann jeden Tier ergaenzen)
```

So kann ein User z. B. ein **Ent-Trial-Founder** sein: Tier = `ent`, plus Trial-Banner, plus Founder-Badge. Drei Achsen, sauber getrennt.

---

## 9. Edge-Cases und Verhalten

| Situation | Verhalten |
|---|---|
| Tier wechselt zur Laufzeit (z. B. Trial endet) | `useAuth().refresh()` triggert Re-Render mit neuer Features-Map. Komponenten sehen Aenderung sofort. |
| User cancelt Pro mit Restlaufzeit | Backend liefert `plan = 'pro'`, `active = true` bis `valid_until`. App bleibt im Pro-Modus bis Ablauf. |
| User loest Founder-Code ein | `me.entitlements[0].source = 'founder'`, Tier bleibt `pro`, orthogonale Flag `showFounderBadge` wird true. |
| **Tier-Downgrade** (Ent → Pro durch Team-Aufloesung) | App rendert sofort mit `PRO_FEATURES`. Sichtbare Team-Sektionen verschwinden. Daten (Szenarien) bleiben erhalten, solange Pro die noch zulaesst. |
| **Tier-Downgrade** (Pro → Free durch Cancellation nach valid_until) | App wechselt auf `FREE_FEATURES`. Szenario-Storage wird read-only / verborgen. Konkrete Regel siehe Freemium-Modell §5. |
| **Tier-Upgrade** (Free → Pro durch Kauf) | Paddle-Webhook setzt neues Entitlement. App muss `refresh()` triggern (manuell oder per Polling), dann sind Pro-Features aktiv. |
| **Unbekannter plan-String aus Backend** | `mapPlanToTier` loggt Warnung und mappt auf `'free'` (sicher-default). Verhindert White-Screen bei Backend-Aenderung. |
| Backend nicht erreichbar | `me` faellt auf `authenticated: false` → AuthGate zeigt LoginGate. Capability-Schicht nicht relevant. |
| User hat Pro UND Promo gleichzeitig (Edge) | Entitlement-Resolver im Backend gibt Pro Vorrang (siehe Freemium-Modell §9). App sieht nur Pro, ggf. `showPromoBadge=true`. |

---

## 10. Was *nicht* dazu gehoert

Klar abgrenzen, was diese Implementation **nicht** macht:

- **Anti-Tampering / Server-Enforcement**: Capability-Map ist Client-seitig. Ein technisch versierter User koennte sie ueberschreiben und Chart-Blur entfernen. Das ist **akzeptabel**, weil:
  - Die Daten waeren immer noch nur die berechneten Annahmen des Users selbst
  - Echte Pro-Features mit Server-Daten (Szenario-Speicherung, Export) sind serverseitig gegated
  - Tampering ist Aufwand, der bei einem 14,95 €-Abo nicht lohnt
- **Trial-Countdown-UI**: separate Aufgabe, nach Free-Implementation
- **Founder-Badge-Visual**: separate Aufgabe
- **Reminder-Mails**: laeuft ueber Backend / Resend, nicht App-Code

---

## 11. Offene Fragen

- [ ] Wo genau soll das **Upgrade-CTA-Overlay** im Chart sitzen (Center, Right, Top)? Sollte mit den Mockups aus dem Freemium-Konzept abgestimmt werden.
- [ ] Wie zeigt die Tabelle (YearlySummaryTable) Jahr 5-10? Komplette Zeile unscharf, oder Spalte fuer Spalte? Visueller Test noetig.
- [ ] Wann konkret startet die **NetworkVisualizations**-Begrenzung? Free: nur Tabelle? Oder auch Sunburst Jahr 1-4?
- [x] Was passiert bei `authenticated_no_entitlement`? Entscheidung: bleibt Paywall-/Fehlerzustand. Free ist ein aktives Entitlement, kein fehlendes Entitlement.
- [ ] **Free-User mit lokal gespeicherten Pro-/Trial-Zustaenden**: Die App hat heute `localStorage`-Persistenz. MVP-Regel: Free nutzt keine dauerhafte lokale Persistenz; Downgrade darf Pro-State nicht ungefiltert wiederherstellen.
- [ ] **Ent-Tier: konkrete Capabilities** noch nicht festgelegt. Max. Team-Groesse, zentrale Abrechnung, weitere Features? Braucht Geschaeftsmodell-Definition vor Implementierung.
- [ ] **Ultra-Tier: konkrete Capabilities** noch nicht festgelegt. API-Zugang Umfang? Custom-Branding wie weit? Dedizierter Support wie definiert?
- [ ] **Tier-Upgrade Pfad in der UI**: wo wird der User-CTA "Auf Ent upgraden" platziert (Account-Panel, separate Sales-Seite)?
- [ ] **Mehrere Entitlements** pro User-Brand: Backend liefert heute `me.entitlements[0]` als Einzeleintrag. Wenn ein User parallel z. B. Pro + Team-Membership hat, muss der Resolver entscheiden, welches "regiert". Vereinbarung mit Freemium-Modell-Doku noetig.

---

## 12. Naechste Schritte

1. Diesen Vorschlag mit dem Hauptkonzept ([Freemium-Modell](./Freemium-Modell.md)) abgleichen — keine Widersprueche
2. Foundation implementieren (Schritt 6.1)
3. ProvisionChart + HeroNumber als ersten Sichtbarkeitstest (Schritt 6.2)
4. Mit echtem Free-Account verifizieren, dass der Wechsel Free ↔ Pro live funktioniert
5. Rest der Komponenten iterativ migrieren (Schritte 6.3-6.5)
