# Rank-Badges

Diese Datei definiert den visuellen Master fuer Rang-Badges im Simulator.

## Quelle im Code

- Badge-Komponente: `simulator-app/src/components/RankBadge.tsx`
- Icon-Pfade: `simulator-app/src/components/lineage/RankIcon.tsx`
- Rang-Label/Icon-Mapping: `simulator-app/src/components/lineage/rankStats.ts`

## Varianten

| Variante | Einsatz | Hintergrund | Text/Icon |
| --- | --- | --- | --- |
| `neutral` | Verguetungsplan / Lineage-Karten | `bg-gray-100` | `text-gray-700` |
| `brand` | Haupttabelle / Status-Spalte | `bg-brand-50` | `text-brand-700` |

## Groessen

| Groesse | Klasse | Icon |
| --- | --- | --- |
| `sm` | `gap-1.5 px-2 py-1 text-xs` | `14px` |
| `md` | `gap-1.5 px-2.5 py-1 text-xs` | `14px` |

## Label-Modi

| Modus | Einsatz | Beispiel |
| --- | --- | --- |
| `full` | Verguetungsplan / Detailansichten | `3* Diamant` |
| `compact` | Haupttabelle / enge Spalten | `3*Diam.` |

## Icon-Galerie

Die Icons sind hier vergroessert dargestellt. Die produktive Badge nutzt dieselben Pfade mit `14px`.

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

## Regeln

- Badges werden nicht pro View neu gestylt. Neue Views nutzen `RankBadge`.
- Die Haupttabelle nutzt `variant="brand"`, damit der Status im bisherigen Gruen der Tabelle bleibt.
- Die Haupttabelle nutzt `labelMode="compact"`, damit n*Diamond als `n*Diam.` angezeigt wird.
- 4*Diamond und hoeher verwenden dasselbe Icon wie `3*Diamond`, aber behalten ihr konkretes Textlabel.
