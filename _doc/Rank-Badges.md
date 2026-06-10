# Rank-Badges

**Stand:** 2026-06-10
**Status:** fuehrend (visueller Master fuer Badges plus Bedienkonventionen). Die Datei traegt die Icon-Galerie als Schnellsicht ohne App-Start und die Drift-Befunde gegen Engine-Konstanten. Code bleibt fuer Rendering und Rangberechnung fuehrend; dieses Dokument fuehrt Galerie, Konventionen, Drift-Risiken und offene Designentscheidungen.
**Scope:** Visuelle und fachliche Regeln fuer Rank-Badges im Simulator.
**Vorgaenger:** Konzeptstand 2026-05-29 wurde am 2026-06-10 in diese Datei konsolidiert; Volltext (Varianten, Groessen, Label-Modi, SVG-Galerie, Regeln) ist hier vollstaendig erhalten, Original-Datei in der Git-Historie.

## 0. Kritisches Review dieses Updates

Die bisherige `_updated`-Fassung war als schnelle Konsolidierung nuetzlich, aber nicht vollstaendig:

- **Encoding defekt:** Der Statusblock enthielt kaputte Sonderzeichen. Dadurch war die Datei als Master-Dokument nicht sauber nutzbar.
- **Master-Rolle zu stark formuliert:** Die Datei behauptete, Icon-Galerie und Bedienregeln seien "eindeutig dokumentiert". Tatsachlich sind Mapping, Label, Groessen und Varianten im Code fuehrend.
- **Fachliche Drift nicht markiert:** `rankStats.ts` nutzt fuer Member/Believer/Builder `av: 45`, die Engine-Konstanten fuer Believer/Builder nutzen `minAV: 40`. Das ist eine reale Inkonsistenz zwischen UI-Hilfsdaten und Rank-Engine.
- **High-Diamond-Abdeckung unklar:** Die Engine kann Ranks ueber `7*Diamond` hinaus erzeugen, z.B. `10*Diamond` in Tests. `StatusPickerSheet` bietet aber nur `1*Diamond` bis `7*Diamond` an. `RankBadge` rendert solche Werte trotzdem generisch.
- **SVG-Galerie ist bewusster Code-Spiegel, kein Designvorrat:** Die Inline-SVG-Galerie kopiert Icon-Pfade aus `RankIcon.tsx` und ermoeglicht damit eine Schnellsicht aller Ranks ohne App-Start. Trade-off: bei Aenderungen an `RankIcon.tsx` muss die Galerie hier mitgepflegt oder spaeter automatisiert generiert werden. Diese Pflege ist explizit eingepreist; die Galerie bleibt im Dokument (Entscheidung 2026-06-10, User-Hinweis).
- **Einsatzorte unvollstaendig:** Aktuell nutzt die Jahres-Haupttabelle `RankBadge`; die Lineage-Statusauswahl nutzt `RankIcon` direkt. Das muss sauber getrennt werden.
- **Brand-Scope offen:** Die Badge-Komponente ist LifePlus-Rank-orientiert. FitLine/Eqology koennen nicht einfach dieselben Ranknamen uebernehmen, ohne eigenes Rankmodell und Copy.

## 1. Aktueller Stand

Rank-Badges haben drei Ebenen:

1. **Fachliche Rangberechnung:** `packages/product-lifeplus/src/ranks.ts` und `constants.ts`.
2. **UI-Mapping fuer Labels, Icons und manuelle Statusauswahl:** `simulator-app/src/components/lineage/rankStats.ts`, `RankIcon.tsx`, `StatusPickerSheet.tsx`.
3. **Badge-Rendering:** `simulator-app/src/components/RankBadge.tsx`.

Der Begriff "Badge" meint in diesem Dokument die kompakte Anzeige aus Icon plus Ranklabel, nicht die Pricing-Badges der Marketing-Seite.

## 2. Code-Anker

| Aspekt | Fuehrende Quelle | Hinweis |
|---|---|---|
| Badge-Komponente | [`simulator-app/src/components/RankBadge.tsx`](../simulator-app/src/components/RankBadge.tsx) | Varianten, Groessen, Compact-Label |
| Icon-Komponente | [`simulator-app/src/components/lineage/RankIcon.tsx`](../simulator-app/src/components/lineage/RankIcon.tsx) | Icon-Namen und Pfade |
| UI-Ranklisten und Labels | [`simulator-app/src/components/lineage/rankStats.ts`](../simulator-app/src/components/lineage/rankStats.ts) | Phase-Listen, `rankLabel`, `rankIconName` |
| Manuelle Statusauswahl | [`simulator-app/src/components/lineage/StatusPickerSheet.tsx`](../simulator-app/src/components/lineage/StatusPickerSheet.tsx) | Bietet Phase 1/2/3-Ranks zur Auswahl |
| Aktueller Badge-Verbraucher | [`simulator-app/src/components/YearlySummaryTable.tsx`](../simulator-app/src/components/YearlySummaryTable.tsx) | `variant="brand"`, `size="sm"`, `labelMode="compact"` |
| Fachliche Rank-Engine | [`packages/product-lifeplus/src/ranks.ts`](../packages/product-lifeplus/src/ranks.ts) | `determineRank`, n*Diamond-Logik ab 4* |
| Rank-Konstanten | [`packages/product-lifeplus/src/constants.ts`](../packages/product-lifeplus/src/constants.ts) | Believer/Builder/Phase-2/Phase-3-Schwellen |
| Testabdeckung | [`packages/product-lifeplus/tests/reference-rank.test.ts`](../packages/product-lifeplus/tests/reference-rank.test.ts) | 4*Diamond und 10*Diamond getestet |

## 3. Aktuelle Badge-API

`RankBadge` akzeptiert:

| Prop | Werte | Default | Bedeutung |
|---|---|---|---|
| `rank` | string | Pflicht | Engine-/UI-Rankname, z.B. `Gold`, `3*Diamond`, `10*Diamond` |
| `variant` | `neutral`, `brand` | `neutral` | Farbvariante |
| `size` | `sm`, `md` | `md` | Padding/Groesse; Icon bleibt aktuell immer `14px` |
| `labelMode` | `full`, `compact` | `full` | Compact kuerzt nur `n*Diamond` zu `n*Diam.` |

Aktuelle Klassen (Quelle: `RankBadge.tsx`):

```text
Container (alle Badges):
  inline-flex items-center rounded-full font-medium

Variant 'neutral':  bg-gray-100  text-gray-700
Variant 'brand':    bg-brand-50  text-brand-700

Size 'sm':  gap-1.5 px-2   py-1 text-xs
Size 'md':  gap-1.5 px-2.5 py-1 text-xs

Icon: fest 14px (unabhaengig von size)
```

`sm` und `md` unterscheiden sich aktuell ausschliesslich im horizontalen Padding. Falls echte Groessenunterschiede gewuenscht sind, muesste `RankBadge` zusaetzlich `text-sm`/`text-base` oder eine groessere Icon-Variante einfuehren.

## 4. Varianten

| Variante | Einsatz | Hintergrund | Text/Icon |
|---|---|---|---|
| `neutral` | Verguetungsplan / Lineage-Karten | `bg-gray-100` | `text-gray-700` |
| `brand` | Haupttabelle / Status-Spalte | `bg-brand-50` | `text-brand-700` |

## 5. Groessen

| Groesse | Klasse | Icon |
|---|---|---|
| `sm` | `gap-1.5 px-2 py-1 text-xs` | `14px` |
| `md` | `gap-1.5 px-2.5 py-1 text-xs` | `14px` |

Hinweis: `sm` und `md` unterscheiden aktuell nur das horizontale Padding. Das Icon bleibt in `RankBadge` fest auf `14px`.

## 6. Label-Modi

| Modus | Einsatz | Beispiel |
|---|---|---|
| `full` | Verguetungsplan / Detailansichten | `3* Diamant` |
| `compact` | Haupttabelle / enge Spalten | `3*Diam.` |

## 7. Icon-Galerie

Die Icons sind hier vergroessert dargestellt und geben einen schnellen visuellen Ueberblick. Die produktive Badge nutzt dieselben Motive in `RankIcon.tsx`, aktuell mit `14px` in `RankBadge`. Bei Abweichungen gilt der Code.

<svg width="760" height="290" viewBox="0 0 760 290" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#166534" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
  <style>
    .label { fill: #374151; stroke: none; font: 12px Arial, sans-serif; }
    .tile { fill: #f0fdf4; stroke: #bbf7d0; }
  </style>
  <g transform="translate(20 20)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M10 6 11 3h2l1 3" />
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M14 11h4" />
      <path d="M14 14h4" />
      <path d="M7 17h10" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">Member</text>
  </g>
  <g transform="translate(160 20)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M7 21h10" />
      <path d="M12 21v-7" />
      <path d="M12 14c0-3 2-5 5-5-.5 3-2 5-5 5Z" />
      <path d="M11 17c-.5-2-2-3-4-3 .5 2 2 3 4 3Z" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">Believer</text>
  </g>
  <g transform="translate(300 20)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <rect x="3" y="3" width="11" height="11" rx="1" />
      <rect x="10" y="10" width="11" height="11" rx="1" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">Builder</text>
  </g>
  <g transform="translate(440 20)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M8 3h8" /><path d="M8 3 12 11" /><path d="M16 3 12 11" /><circle cx="12" cy="16" r="5" />
      <path d="M10.6 14.8c.3-1 2.5-1 2.8 0 .2.8-.8 1.2-1.3 1.2.5 0 1.5.4 1.5 1.3 0 1.1-2.5 1.3-2.9.2" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">Bronze</text>
  </g>
  <g transform="translate(580 20)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M8 3h8" /><path d="M8 3 12 11" /><path d="M16 3 12 11" /><circle cx="12" cy="16" r="5" />
      <path d="M10.6 14.8c.3-1 2.4-1 2.8 0 .3.9-2.8 2-2.8 3.7h2.8" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">Silber</text>
  </g>
  <g transform="translate(20 160)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M8 3h8" /><path d="M8 3 12 11" /><path d="M16 3 12 11" /><circle cx="12" cy="16" r="5" />
      <path d="M12 18.5V14" /><path d="M11 15 12 14" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">Gold</text>
  </g>
  <g transform="translate(160 160)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M2 9h20" /><path d="M8 9 12 3l4 6-4 13Z" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">Diamond</text>
  </g>
  <g transform="translate(300 160)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M7 10h10l3 4-8 9-8-9Z" /><path d="M4 14h16" /><path d="M9 14 12 10l3 4-3 9Z" />
      <path d="M12 2.3 L12 5.7" /><path d="M10.5 3.15 L13.5 4.85" /><path d="M10.5 4.85 L13.5 3.15" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">1* Diamant</text>
  </g>
  <g transform="translate(440 160)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M7 10h10l3 4-8 9-8-9Z" /><path d="M4 14h16" /><path d="M9 14 12 10l3 4-3 9Z" />
      <path d="M8 2.6 L8 5.4" /><path d="M6.8 3.3 L9.2 4.7" /><path d="M6.8 4.7 L9.2 3.3" />
      <path d="M16 2.6 L16 5.4" /><path d="M14.8 3.3 L17.2 4.7" /><path d="M14.8 4.7 L17.2 3.3" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">2* Diamant</text>
  </g>
  <g transform="translate(580 160)">
    <rect class="tile" width="120" height="110" rx="10"/>
    <g transform="translate(44 18) scale(1.7)">
      <path d="M7 10h10l3 4-8 9-8-9Z" /><path d="M4 14h16" /><path d="M9 14 12 10l3 4-3 9Z" />
      <path d="M5 2.8 L5 5.2" /><path d="M4 3.4 L6 4.6" /><path d="M4 4.6 L6 3.4" />
      <path d="M12 2.6 L12 5.4" /><path d="M10.8 3.3 L13.2 4.7" /><path d="M10.8 4.7 L13.2 3.3" />
      <path d="M19 2.8 L19 5.2" /><path d="M18 3.4 L20 4.6" /><path d="M18 4.6 L20 3.4" />
    </g>
    <text class="label" x="60" y="92" text-anchor="middle">3+* Diamant</text>
  </g>
</svg>

## 8. Rank-Reihen und Labels

### 8.1 UI-Reihen in `rankStats.ts`

| Phase | Ranks |
|---|---|
| Phase 1 | `Member`, `Believer`, `Builder` |
| Phase 2 | `Bronze`, `Silver`, `Gold`, `Diamond` |
| Phase 3 | `1*Diamond` bis `7*Diamond` |

`rankLabel()` uebersetzt nur:

- `Silver` -> `Silber`
- `Diamond` -> ` Diamant`

Beispiele:

| Input | Full Label | Compact Label |
|---|---|---|
| `Member` | `Member` | `Member` |
| `Silver` | `Silber` | `Silber` |
| `Diamond` | ` Diamant` | ` Diamant` |
| `3*Diamond` | `3* Diamant` | `3*Diam.` |
| `10*Diamond` | `10* Diamant` | `10*Diam.` |

**Achtung:** Das fuehrende Leerzeichen bei `Diamond` und `n*Diamond` entsteht aus `rank.replace('Diamond', ' Diamant')`. Visuell funktioniert das, ist aber fuer Stringvergleiche und Doku-Beispiele unschoen. Eine spaetere Code-Bereinigung sollte `Diamond` explizit auf `Diamant` und `n*Diamond` auf `n* Diamant` mappen.

### 8.2 Icon-Mapping

| Rank | Icon |
|---|---|
| `Member` | `member` |
| `Believer` | `believer` |
| `Builder` | `builder` |
| `Bronze` | `bronze` |
| `Silver` | `silver` |
| `Gold` | `gold` |
| `Diamond` | `diamond` |
| `1*Diamond` | `one-star-diamond` |
| `2*Diamond` | `two-star-diamond` |
| `3*Diamond` und hoeher | `three-star-diamond` |
| unbekannter Rank | `member` |

Regel: Hoehere Diamond-Ranks behalten ihr konkretes Textlabel, teilen sich aber ab `3*Diamond` das Drei-Sterne-Diamond-Icon.

## 9. Fachliche Rank-Schwellen

Die fachliche Engine ist fuer Berechnung fuehrend, nicht `rankStats.ts`.

| Rank | Engine-Schwelle | UI-Hilfswert in `rankStats.ts` | Bewertung |
|---|---:|---:|---|
| `Believer` | AV 40, QGV 500, QL 3 | AV 45, GV 500, QL 3 | Drift |
| `Builder` | AV 40, QGV 1500, QL 3 | AV 45, GV 1500, QL 3 | Drift |
| `Bronze` | AV 100, QGV 3000, QL 3 | AV 100, GV 3000, QL 3 | ok |
| `Silver` | AV 100, QGV 6000, QL 6 | AV 100, GV 6000, QL 6 | ok |
| `Gold` | AV 150, QGV 9000, QL 9 | AV 150, GV 9000, QL 9 | ok |
| `Diamond` | AV 150, QGV 15000, QL 12 | AV 150, GV 15000, QL 12 | ok |
| `1*Diamond` | AV 150, QGV 15000, QL 12, 1 Diamond-Bein, 2 zusaetzliche Bronze-Beine | SH 1 | unvollstaendig |
| `2*Diamond` | AV 150, QGV 20000, QL 12, 2 Diamond-Beine, 1 zusaetzliches Bronze-Bein | SH 2 | unvollstaendig |
| `3*Diamond` | AV 150, QGV 25000, QL 12, 3 Diamond-Beine | SH 3 | unvollstaendig |
| `4*Diamond+` | Engine-Formel: QGV `10000 + n*5000`, Diamond-Beine `n`, QL 12 | UI-Liste bis 7* | teilweise |

Empfehlung: `rankStats.ts` sollte entweder klar als UI-Hilfsdaten ohne Fachanspruch markiert oder an `packages/product-lifeplus/src/constants.ts` angelehnt werden. Fuer Dokumentation und Tooltips duerfen die Werte nicht aus `rankStats.ts` als fachliche Wahrheit kopiert werden, solange die Drift besteht.

## 10. Einsatzregeln

- Neue kompakte Rankanzeigen nutzen `RankBadge`; nicht pro View eigene Badge-Klassen bauen.
- Die Jahres-Haupttabelle nutzt `variant="brand"`, `size="sm"` und `labelMode="compact"`.
- Detail-/Auswahllisten duerfen `RankIcon` direkt verwenden, wenn sie kein Pill-Badge brauchen.
- Unbekannte Ranknamen sollten vor Anzeige normalisiert werden. Sonst faellt das Icon auf `member` zurueck.
- UI-Texte duerfen Rank-Erreichung nur als Modellrechnung beschreiben, nicht als Zusage.
- Brand-spezifische Ranks fuer FitLine/Eqology brauchen ein eigenes Mapping; LifePlus-Ranks duerfen dort nicht stillschweigend wiederverwendet werden.

## 11. Offene Punkte

| Prioritaet | Thema | Entscheidung / naechster Schritt |
|---|---|---|
| Hoch | **Bug: AV-Drift 40 vs 45 zwischen `rankStats.ts` (UI) und `constants.ts` (Engine)** | Klaeren, ob `rankStats.ts` fachlich sein soll. Falls ja: Believer/Builder auf AV 40 korrigieren oder aus Engine-Konstanten ableiten, damit UI-Tooltip und Engine-Berechnung konsistent sind. Backlog-Eintrag im Ideenspeicher §4 (Bug-Tickets) verankert. |
| Hoch | **Bug: `Diamond`-Label mit fuehrendem Leerzeichen** (`rank.replace('Diamond', ' Diamant')` haengt Leerzeichen an) | `rankLabel()` explizit mapping statt globaler Replace: `Diamond` -> `Diamant`, `n*Diamond` -> `n* Diamant`. Danach Beispiele und Screens pruefen. Backlog-Eintrag im Ideenspeicher §4. |
| Mittel | High-Diamond-Auswahl | Entscheiden, ob `StatusPickerSheet` nur bis 7* anbieten soll, obwohl Engine hoeher berechnen kann. |
| Mittel | SVG-Galerie | Die Galerie bleibt fuer schnellen Ueberblick im Dokument. Bei Icon-Aenderungen muss sie mit `RankIcon.tsx` abgeglichen oder spaeter automatisiert generiert werden. |
| Mittel | Accessibility | Badge braucht ggf. `title`/`aria-label`, wenn Icon und gekuerztes Label allein nicht ausreichend sind. |
| Niedrig | Varianten | `sm` und `md` unterscheiden nur horizontalen Padding. Pruefen, ob beide Groessen wirklich benoetigt werden. |

## 12. Review-Fazit

Die Badge-Komponente ist klein und brauchbar, aber die Doku darf sie nicht als isoliertes Designsystem behandeln. Entscheidend sind drei Grenzen:

1. `RankBadge` rendert nur; es entscheidet keinen Rang.
2. `rankStats.ts` ist derzeit UI-Hilfsdatenquelle, nicht sicher fachliche Wahrheit.
3. High-Diamond-Ranks werden berechnet und angezeigt, aber nicht vollstaendig manuell auswaehlbar.

Solange diese Punkte offen sind, ist dieses Dokument ein Review-Master mit klaren Warnungen, kein abgeschlossener Styleguide.

## Anhang: Historischer Kontext

Die Originaldatei [`Rank-Badges.md`](./Rank-Badges.md) enthaelt eine grosse Inline-SVG-Galerie mit kopierten Icon-Pfaden. Diese Galerie ist als visuelle Momentaufnahme hilfreich, aber nicht fuehrend. Fuehrend fuer Icons ist `RankIcon.tsx`; fuehrend fuer Badge-Verhalten ist `RankBadge.tsx`.
