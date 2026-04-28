# LifePlus Vergütungs-Simulator

Eine Web-App, die den LifePlus Business Plan simuliert. Der User gibt
Netzwerk-Parameter ein und sieht in Echtzeit die geschätzte monatliche
Provision über 10 Jahre.

## Features

- 5 Live-Slider (Members/Jahr, Shopper/Jahr, Umsatz, Duplikation, Fluktuation)
- Hero-Zahl mit aktueller Provision in Jahr 10
- 2 KPI-Karten (Netzwerk-Größe, aktueller Rang)
- Linien-Chart über 10 Jahre
- Settings-Drawer für IP→Euro Umrechnung
- PWA (auf Handy zum Homescreen hinzufügbar)
- Responsive: optimiert für Mobile, Tablet und Desktop

## Projektstruktur

```
src/
├── engine/                    Reine TypeScript-Logik (framework-frei)
│   ├── constants.ts           Vergütungssätze aus dem PDF
│   ├── network.ts             Netzwerk-Wachstumssimulation
│   ├── ranks.ts               Rang-Bestimmung
│   ├── compensation.ts        Phase 1/2/3 Berechnung
│   ├── simulation.ts          Orchestriert alles
│   └── __tests__/             20 Unit-Tests
├── components/
│   ├── Slider.tsx
│   ├── HeroNumber.tsx
│   ├── StatCard.tsx
│   ├── ProvisionChart.tsx     Recharts
│   └── SettingsDrawer.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Lokale Entwicklung

```bash
npm install
npm run dev          # Dev-Server auf http://localhost:5173
npm test             # Unit-Tests laufen lassen
npm run build        # Production-Build in dist/
npm run preview      # gebaute App lokal testen
```

## Deployment auf IONOS

IONOS Webhosting unterstützt statische Dateien direkt.

1. `npm run build` — erzeugt `dist/`
2. `dist/`-Inhalt per FTP / SFTP / WebDAV in das Webroot des IONOS-Pakets hochladen
3. Im IONOS Control Panel sicherstellen, dass HTTPS aktiviert ist
4. Wichtig: `index.html` muss als Default-Dokument konfiguriert sein
   (das ist der Standard, sollte automatisch klappen)

## Deployment auf Azure Static Web Apps

Mit `staticwebapp.config.json` (optional) für Routing:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

1. Azure Portal → Static Web Apps → Create
2. Deployment-Quelle: GitHub Actions oder direkter ZIP-Upload
3. Build-Preset: "Custom"
4. Output-Folder: `dist`

Der Free-Tier reicht für diese App locker aus.

## Modell-Annahmen

Die Simulation macht folgende Vereinfachungen (sichtbar in den App-Einstellungen):

- Members duplizieren mit gleicher Rate (über Slider einstellbar)
- Shopper sponsern niemanden
- Symmetrisches Wachstum: alle Beine gleich aktiv
- Keine Saisonalität
- Brutto-Provision (vor Steuern und Abgaben)
- Phase 2/3 vereinfacht: volle Quote des eigenen Rangs auf Volumen ab Ebene 4

## Ausblick (V2-Ideen)

- Brutto/Netto-Schalter mit konfigurierbarem Steuersatz
- Ungleichmäßige Downline-Verteilung (Pareto)
- Hochkomprimierungs-Logik
- Vergleichsmodus: zwei Szenarien nebeneinander
- Export der Daten als CSV/PDF
