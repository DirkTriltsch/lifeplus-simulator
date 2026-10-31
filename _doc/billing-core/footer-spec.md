# Footer-Spezifikation (Entwurf v0.1)

Status: ENTWURF zur Abstimmung. Gilt fuer LF360 (lifeplus, fitline, eqology) und
spaeter TraderScope. Ziel: Struktur und Pflichtlinks sind Konfiguration, nicht
Handarbeit pro Seite.

## 1. Prinzipien

- P1 Ein Footer, eine Quelle: `footer.config.ts` (Links, Spalten, Sichtbarkeit).
- P2 Pflichtlinks sind identisch auf JEDER Seite (inkl. Checkout, Erfolg, Login).
- P3 Marken unterscheiden sich nur in Texten und Optik, nicht in der Struktur.
- P4 Fehlt eine Pflichtseite, schlaegt der Build fehl (Abschnitt 6).
- P5 Kein Link ohne Ziel: jeder Eintrag zeigt auf eine gebaute Seite oder mailto.

## 2. Aufbau (3 Spalten, mobil gestapelt)

    +--------------------+--------------------+--------------------+
    | MARKE              | RECHTLICHES        | PRODUKT            |
    | Logo + Name        | Impressum          | Preise             |
    | Tagline            | Datenschutz        | Funktionen         |
    | Disclaimer         | AGB                | Mein Konto         |
    | (c) Jahr Betreiber | Widerrufsbelehrung | FAQ (optional)     |
    |                    | Vertrag widerrufen | Kontakt            |
    |                    | Vertraege kuendigen|                    |
    |                    | Haftungsausschluss |                    |
    |                    | OSS-Lizenzen (opt.)|                    |
    +--------------------+--------------------+--------------------+

## 3. Linkkatalog

| Id             | Label                  | Ziel                    | Pflicht | Hinweis |
|----------------|------------------------|-------------------------|---------|---------|
| imprint        | Impressum              | /impressum.html         | ja      | § 5 DDG |
| privacy        | Datenschutz            | /datenschutz.html       | ja      | DSGVO |
| terms          | AGB                    | /agb.html               | ja      | |
| withdrawal-info| Widerrufsbelehrung     | /widerruf.html          | ja      | Verbraucher-Pfad |
| withdrawal-form| Vertrag widerrufen     | /widerrufen.html        | ja      | Formular, ohne Login |
| cancel         | Vertraege hier kuendigen | /kuendigen.html       | ja      | § 312k BGB, ohne Login, auf jeder Seite |
| disclaimer     | Haftungsausschluss     | /haftungsausschluss.html| ja*     | *Inhalt je Produkt |
| oss            | OSS-Lizenzen           | /oss.html               | nein    | nur falls Fremdcode ausgeliefert wird |
| pricing        | Preise                 | /pricing.html           | ja      | |
| features       | Funktionen             | /features.html          | nein    | |
| account        | Mein Konto             | /mein-konto.html        | ja      | js-account-link bleibt |
| faq            | FAQ                    | /faq.html               | nein    | spaeter |
| contact        | Kontakt                | mailto:<contact.email>  | ja      | bis eigene Seite existiert |

## 4. Konfiguration (Vertrag)

    type FooterLinkId = 'imprint' | 'privacy' | 'terms' | ...   // Katalog oben
    interface FooterConfig {
      brand: { tagline: string; disclaimer?: string };
      hide?: FooterLinkId[];   // nur Nicht-Pflicht-Links ausblendbar
      extra?: { label: string; href: string; column: 'legal' | 'product' }[];
    }

- Pflichtlinks duerfen NICHT in `hide` stehen (Typ- und Build-Fehler).
- Reihenfolge ist fix, nur `extra` wird angehaengt.

## 5. Optik

- LF360: bestehendes Footer-Design (Tokens aus brand.yaml), nur Spalten/Links neu.
- Mobil: Spalten untereinander, Pflichtlinks vollstaendig, Tap-Flaeche >= 44 px.
- Seitenabhaengige Linkauswahl (`linksByPage`) entfaellt: Footer ist ueberall gleich.

## 6. Automatische Pruefungen (Checkliste, CI)

- [ ] Alle Pflicht-Ids sind in der Footer-Ausgabe jeder gebauten Seite vorhanden.
- [ ] Jeder interne Footer-Link loest auf eine Datei im Build-Ausgang auf.
- [ ] Kuendigen-Link steht auf Startseite, Preisen, Checkout, Erfolg, Konto, Rechtsseiten.
- [ ] Alle drei Marken bauen mit identischer Link-Id-Menge (Pflicht).
- [ ] `contact.email` gesetzt; Impressum-Pflichtfelder vorhanden (USt-IdNr oder Kleinunternehmer-Hinweis).
- [ ] Kein Link zeigt auf `#` oder leere Ziele.

## 7. Seiten, die der Footer voraussetzt (Lieferumfang)

| Seite                 | Status LF360 | Quelle TraderScope |
|-----------------------|--------------|--------------------|
| impressum/datenschutz/agb/widerruf | vorhanden | content/legal/*.md |
| widerrufen            | fehlt | pages/widerrufen.astro + scripts/widerrufen.ts |
| kuendigen             | fehlt | pages/kuendigen.astro + scripts/kuendigen.ts |
| haftungsausschluss    | fehlt | content/legal/haftungsausschluss.md (Inhalt anpassen) |
| oss                   | fehlt | content/legal/oss.md (nur bei Bedarf) |
| faq, contact          | fehlt | optional, spaeter |

## 8. Offene Punkte

- O1 Soll "Haftungsausschluss" fuer LF360 Pflicht sein (Inhalt: Simulation, keine Beratung)?
- O2 OSS-Seite: liefert LF360 Fremdcode im Client aus (Lizenzpflicht)?
- O3 Sichtbarkeit "Mein Konto" fuer anonyme Besucher beibehalten?
- O4 Footer-Disclaimer pro Marke (Text spaeter).
