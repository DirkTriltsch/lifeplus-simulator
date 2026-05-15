# LifePlus Vergutungs-Simulator

Eine Web-App, die den LifePlus Business Plan simuliert. Der User gibt
Netzwerk-Parameter ein und sieht in Echtzeit die geschatzte monatliche
Provision uber 10 Jahre.

## Features

- 5 Live-Slider (Members/Jahr, Shopper/Jahr, Umsatz, Duplikation, Fluktuation)
- Hero-Zahl mit aktueller Provision in Jahr 10
- 2 KPI-Karten (Netzwerk-Grosse, aktueller Rang)
- Linien-Chart uber 10 Jahre
- Netzwerkansichten: Sunburst, Bein-Spalten und Hybrid-Tree
- Settings-Drawer fur IP-zu-Euro-Umrechnung
- Rechtliche Informationen mit direkt aufrufbaren Links fur `#impressum` und `#datenschutz`
- PWA (auf Handy zum Homescreen hinzufugbar)
- Responsive: optimiert fur Mobile, Tablet und Desktop

## Projektstruktur

```text
src/
|-- engine/                    Reine TypeScript-Logik (framework-frei)
|   |-- constants.ts           Vergutungssatze aus dem PDF
|   |-- network.ts             Netzwerk-Wachstumssimulation
|   |-- ranks.ts               Rang-Bestimmung
|   |-- compensation.ts        Phase-1/2/3-Berechnung
|   |-- simulation.ts          Orchestriert alles
|   `-- __tests__/             Unit-Tests
|-- components/
|   |-- HeroNumber.tsx
|   |-- LegalSection.tsx
|   |-- NetworkVisualizations.tsx
|   |-- ProvisionChart.tsx     Recharts
|   |-- SettingsDrawer.tsx
|   |-- Slider.tsx
|   |-- StatCard.tsx
|   `-- YearlySummaryTable.tsx
|-- App.tsx
|-- main.tsx
`-- index.css
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

IONOS Webhosting unterstutzt statische Dateien direkt. Die aktuelle
Konfiguration ist fur ein Deployment im Webroot `/` ausgelegt:

- `vite.config.ts`: `base: '/'`
- `.vscode/sftp.json`: `context: 'dist'` und `remotePath: '/'`

1. `npm run build` erzeugt `dist/`
2. Den Inhalt von `dist/` per FTP / SFTP / WebDAV direkt in das Webroot des
   IONOS-Pakets hochladen
3. Im IONOS Control Panel sicherstellen, dass HTTPS aktiviert ist
4. Sicherstellen, dass `index.html` als Default-Dokument ausgeliefert wird
5. Nach einem neuen Deployment im Browser hart neu laden (`Strg + F5`);
   bei installierter PWA oder hartnackigem Cache ggf. Website-Daten loschen

Wichtig: `base` in `vite.config.ts` und der tatsachliche Upload-Pfad mussen
zusammenpassen. Wenn der Build zum Beispiel `base: '/lifegrowth/'` nutzt, muss
der Inhalt von `dist/` auch unter `/lifegrowth/` liegen. Stimmen diese Pfade
nicht uberein, laden JavaScript und CSS nicht und die Seite bleibt weiss.

## Deployment auf Azure Static Web Apps

Mit `staticwebapp.config.json` (optional) fur Routing:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

1. Azure Portal -> Static Web Apps -> Create
2. Deployment-Quelle: GitHub Actions oder direkter ZIP-Upload
3. Build-Preset: "Custom"
4. Output-Folder: `dist`

Der Free-Tier reicht fur diese App locker aus.

## Modell-Annahmen

Die Simulation macht folgende Vereinfachungen:

- Members duplizieren mit gleicher Rate (uber Slider einstellbar)
- Shopper sponsern niemanden
- Symmetrisches Wachstum: alle Beine gleich aktiv
- Keine Saisonalitat
- Brutto-Provision (vor Steuern und Abgaben)
- Phase 2/3 vereinfacht: volle Quote des eigenen Rangs auf Volumen ab Ebene 4

## Ausblick (V2-Ideen)

- Brutto/Netto-Schalter mit konfigurierbarem Steuersatz
- Ungleichmassige Downline-Verteilung (Pareto)
- Hochkomprimierungs-Logik
- Vergleichsmodus: zwei Szenarien nebeneinander
- Export der Daten als CSV/PDF
