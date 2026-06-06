# Legal Review v2 — lifeflow360 Webseite

**Stand:** 2026-06-03
**Skill:** lifeflow360-legal-review
**Anwaltliche Freigabe:** ❌ nicht erfolgt
**Go-Live-Fokus:** LifeFlow360 (LifePlus-Brand)

> Dieses Dokument fasst die im Code umgesetzten Anpassungen sowie die offenen,
> externen ToDos zusammen, die vor einer Live-Schaltung erledigt sein müssen.

---

## Was wurde im aktuellen Pass zusätzlich umgesetzt

| # | Thema | Datei(en) |
|---|---|---|
| N4 | AGB §3 — Free unentgeltlich / Pro entgeltlich klar getrennt | `shared/components/sections/LegalAgbDefault.astro` (§3) |
| N5 | Widerruf — neue „Anwendungsbereich"-Sektion für B2B/Free-Klarheit | `shared/components/sections/LegalWiderrufDefault.astro` (Anwendungsbereich) |
| N7 | Datenschutz — Simulator-Aussage präzisiert (Szenario-Sharing) | `shared/components/sections/LegalDatenschutzDefault.astro` (§1) |
| N10 | Newsletter — Häufigkeit + Inhaltsbeschreibung + Drittweitergabe | `shared/components/sections/LegalDatenschutzDefault.astro` (§7) |
| N11 | Encoding-Pass — Umlaute auf 9 Files vereinheitlicht | CheckoutPage, SignupPage, LoginPage, AccountPage, B2BHeaderBanner, accountPage.ts, checkoutInline.ts, loginInline.ts, signupInline.ts |

## Was in den vorhergehenden Passes umgesetzt wurde (Findings v1 1–13)

| Block | Status |
|---|---|
| Pricing-Verlängerungsmodell (Rabatt-Erhalt + monatlich kündbar ab 1. Verlängerung + anteilige Erstattung) | ✅ in 3 Brands durchgezogen |
| AGB §1 Pro-B2B-only / Free-für-alle | ✅ |
| AGB §5 Laufzeit/Kündigung mit Sonderkündigungsrecht | ✅ |
| Widerrufsbelehrung SaaS-konform (§356 Abs. 4 BGB) | ✅ |
| Datenschutz: Stand Juni 2026, Tools komplett (Paddle, Resend, IONOS, Cloudflare), Newsletter Double-Opt-In | ✅ |
| Impressum: erweiterbar via contact.ts (vatId, registerCourt, responsibleForContent) | ✅ |
| Google Fonts → lokal via @fontsource | ✅ |
| Features-Aussage „keine Drittparteien" entschärft | ✅ |
| Beispielwerte-Disclaimer auf Index Hero + Features (Chart + Rank) | ✅ |
| „Betriebsausgabe"-Claim mit Konjunktiv + Steuerberater-Verweis | ✅ in 3 Brands |
| Brand-Cross-Bug Steuerberater-Note (FitFlow/EqoFlow) | ✅ |

---

# Brand-getrennte Übersicht

## 🚀 LifeFlow360 (LifePlus) — **Go-Live-Fokus**

### ✅ Code-seitig bereit
- Domain `www.lifeflow360.app` (HTTPS)
- `brand.yaml` mit echten Paddle-Werten (jedoch noch im Sandbox-Mode)
- Pflichttexte technisch konsistent
- B2B-Pivot vollständig durchgezogen
- Datenschutz mit allen Tools (Paddle, Resend, IONOS, Cloudflare)
- Encoding sauber

### ❌ Vor Live noch zwingend
1. **Paddle-Switch Sandbox → Production** in `src/brands/lifeplus/brand.yaml:10-15` — neue `clientToken` + produktive `priceId*`
2. **`contact.vatId` befüllen** in `src/shared/lib/contact.ts:27` — nach Steuerberater-Klärung
3. **Anwaltliche Freigabe** der vier Pflichttexte (AGB, Widerruf, Datenschutz, Impressum)
4. Optional: `responsibleForContent` prüfen (steht aktuell auf „Dirk Triltsch") — wenn das passt, lassen

### Build + Deploy-Checkliste LifePlus

```text
[ ] cd website-astro && npm install        # @fontsource-Pakete
[ ] contact.ts: vatId + ggf. registerCourt/Number befüllen
[ ] brand.yaml: paddle.env auf "production", echte priceIds
[ ] npm run build:webroot:lifeplus
[ ] Smoke-Test: Impressum zeigt USt-IdNr, Pflichttext-Links funktionieren,
    Pricing 3 Stufen, Checkout-Flow mit live-Paddle einmal durchspielen
[ ] Upload via SFTP (build-script macht das schon mit)
[ ] DNS / IONOS prüfen — www.lifeflow360.app erreichbar
```

---

## ⏸ FitFlow360 (FitLine) — **nicht im Live-Fokus**

### ✅ Bereits geerbt (shared Components)
- B2B-Banner, Pflichttext-Strukturen, Pricing-Verlängerungsmodell, Encoding
- pricing.yaml korrigiert (Steuerberater-Note nicht mehr „LifeFlow360")

### ❌ Vor Live nötig
1. **Domain-Umstellung**: aktuell `fitflow360.triltsch.com` (Staging) → produktive Domain (`.de` o. ä.)
2. **HTTPS erzwingen**: `brand.yaml:3` `appUrl: "http://..."` → `https://...`
3. **Paddle-Setup**: alle vier `REPLACE_WITH_*`-Platzhalter durch echte Credentials ersetzen
4. **Eigener Paddle-Account / Produkt** (laut Memory: Brand-Trennung, eigene Rechnung)
5. **Brand-eigenes Impressum** falls anderer Anbieter — sonst lifeflow360-contact.ts genügt

---

## ⏸ EqoFlow360 (Eqology) — **nicht im Live-Fokus**

Identisch zu FitFlow360 — selbe fünf Punkte vor Live:
1. Domain `eqoflow360.triltsch.com` → produktive Domain
2. HTTPS erzwingen in `src/brands/eqology/brand.yaml:3`
3. Paddle-Credentials ersetzen
4. Eigener Paddle-Account
5. Brand-eigenes Impressum prüfen

---

# Externe ToDo-Liste (nicht durch Code-Edits lösbar)

## 🏛 Anwalt (vor Live LifeFlow360)

**Mandat:** Prüfung der vier Pflichttexte und Stellungnahme zu spezifischen Risiken.

**Briefing-Pakete:**
- `LegalAgbDefault.astro` — vollständige AGB, besonders §1, §3, §5, §13
- `LegalWiderrufDefault.astro` — Widerrufsbelehrung mit neuer Anwendungsbereich-Sektion
- `LegalDatenschutzDefault.astro` — vollständig
- `LegalImpressumDefault.astro` + `contact.ts` — Template + Datenstruktur
- **Kontext:** SaaS-Tool für Network-Marketing-Sponsoren, B2B-only Pro / B2B+B2C Free, Paddle als Merchant of Record (UK), eingesetzte Dienstleister Resend (US), IONOS (DE), Cloudflare (US)

**Vier konkrete Fragen an den Anwalt:**
1. **AGB §1:** trägt die Trennung Pro-B2B-only / Free-für-alle in der Praxis (BGH-Rechtsprechung zur B2B-Auszeichnung)?
2. **AGB §5:** ist die Verlängerungsmechanik mit Restmonats-Erstattung **ab erster Verlängerung** mit §307 BGB vereinbar?
3. **Widerrufsbelehrung:** ist die Anwendung von §356 Abs. 4 BGB für laufende SaaS-Dienstleistungen tragfähig formuliert?
4. **Datenschutz:** reichen die genannten Drittlands-Übermittlungs-Hinweise (EU-SCC für Paddle/Resend/Cloudflare) oder braucht es einen DPA-Hinweis?

## 💼 Steuerberater (vor Live LifeFlow360)

**Anlass:** USt-Status klären, damit `contact.vatId` korrekt befüllt werden kann.

**Fragen:**
1. Bist du USt-pflichtig oder Kleinunternehmer (§19 UStG)?
2. Falls USt-pflichtig: USt-IdNr beim BZSt beantragen, sobald nicht vorhanden
3. Falls Kleinunternehmer: Reverse-Charge-Klausel in AGB §6 + Checkout-Hint entfernen (kein Reverse-Charge möglich)
4. Wird über Paddle als Merchant of Record EU-/CH-weit verkauft: welche Konsequenzen für deine eigene USt-Voranmeldung?

## 💳 Paddle (vor Live LifeFlow360)

**Anlass:** Sandbox → Production wechseln.

**Schritte:**
1. Paddle-Vendor-Account in Production aktivieren (KYC abgeschlossen?)
2. Pro Brand ein eigenes Produkt anlegen (LifeFlow360, FitFlow360, EqoFlow360 — laut Memory: getrennte Brands, getrennte Rechnungen)
3. Pro Plan einen Price ID generieren: Monthly, HalfYear, Yearly
4. `clientToken` (öffentlich) für Frontend kopieren
5. In `brand.yaml` `env: "production"` setzen + Werte ersetzen
6. **Paddle-Dashboard-Settings** laut Memory-Eintrag: Newsletter-Checkbox aus, Display-Name LifeFlow360, Zahlungsmethoden Karte+SEPA+PayPal

## 🌐 Hosting / DNS (nur für FitFlow + EqoFlow vor deren Live)

**Anlass:** Domains und Zertifikate produktiv schalten.

**Schritte:**
1. Produktive Domains entscheiden (`.de` laut Memory-Stand der Diskussion)
2. IONOS / Cloudflare DNS einrichten
3. SSL-Zertifikate (Let's Encrypt) für `https://`
4. `brand.yaml` `siteDomain` + `appUrl` auf produktive HTTPS-URLs

## 🛡 Optional: DSB-Bedarf prüfen

**Anlass:** §38 BDSG — Datenschutzbeauftragter bei mehr als 20 Personen mit Datenverarbeitung.

**Aktion:** Bei aktuellem Setup (Einzelunternehmer) **wohl nicht** erforderlich. Wenn das Team wächst, neu bewerten.

---

# Stand-Zusammenfassung

```text
LifeFlow360:  CODE 100% • PADDLE 0% (sandbox) • ANWALT 0% • STEUER 0%
FitFlow360:   CODE  90% (Domain+HTTPS+Paddle-Setup fehlen)
EqoFlow360:   CODE  90% (gleicher Status wie FitFlow)
```

**Empfohlene Sequenz für LifeFlow360-Go-Live:**

1. **Heute–morgen:** Steuerberater fragen (vatId / Kleinunternehmer)
2. **Diese Woche:** Anwaltstermin vereinbaren, Pflichttexte als Vorlage senden
3. **Parallel:** Paddle-Production-Account vorbereiten (kann Wochen dauern wegen KYC)
4. **Nach Anwalt-Freigabe:** finale Code-Anpassungen einarbeiten (1–2 Stunden Editing, falls Änderungen nötig)
5. **Nach Paddle-Production aktiv:** `brand.yaml` umstellen, Build, Smoke-Test, Live

---

## Disclaimer

> *Dieser Report wurde mit dem `lifeflow360-legal-review`-Skill als KI-gestützter
> Risiko-Scan auf Basis publizierter Rechtslage und Best Practices erstellt.
> Er ersetzt keine anwaltliche Beratung. Die in diesem und in vorherigen Passes
> umgesetzten Änderungen an den Pflichttexten (AGB, Widerrufsbelehrung,
> Datenschutzerklärung, Impressum-Template) sind Entwürfe und müssen vor
> Live-Schaltung anwaltlich freigegeben werden.*
