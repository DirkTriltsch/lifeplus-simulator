# Konzept: Freemium-Modell

**Stand:** 2026-05-25  
**Status:** Entwurf / zur Abstimmung  
**Bezug:** [Konzept Paddle-Integration und App-Architektur](./Konzept%20Paddle-Integration%20und%20App-Architektur.md), [Konzepte und Umsetzung realistischer Wachstums-Modelle](./Konzepte%20und%20Umsetzung%20realistischer%20Wachstums-Modelle%20.md)

---

## 1. Zielsetzung

Der User soll im Free-Tier den **Mehrwert** der App klar erkennen, aber **nicht den vollen Nutzen** erhalten. Die Free-Version muss neugierig machen auf die Pro-Version, ohne den User mit harten Waenden frustriert auszubremsen.

**Conversion-Trigger:** Die Pro-Version beantwortet die kaufentscheidende Frage: *"Was ist meine realistische Auszahlung in Jahr 10?"*

Free ist dabei **kein anonymer Demo-Modus**. Auch Free erfordert eine Anmeldung per E-Mail und Magic-Link. Dadurch funktionieren Account-Wiederherstellung, Trial-Status, Downgrade und spaetere Reaktivierungen sauber.

**Codex:** Diese Login-Pflicht ist aus Produktsicht vertretbar, wenn sie als Komfort-Feature erklaert wird: kein Passwort, kein Passwort vergessen, kein Reset-Prozess.

**Claude:** Die Login-Pflicht erzeugt trotzdem messbare Bounce-Rate auf der Anmelde-Seite — User, die den Wert der App noch nicht gesehen haben, springen ab. Mitigation: Die oeffentliche Marketing-Seite (Astro, ausserhalb dieses Konzepts) muss den Wow-Moment vorab transportieren — animierter Chart-Screenshot mit Jahr-10-Kurve, anonymisierte Beispiel-KPI. Der User soll *vor* der E-Mail-Eingabe denken "ja, das will ich ausprobieren". Andernfalls bleibt die App-URL ein toter Funnel.

---

## 2. Produktentscheidung in Kurzform

| Thema | Entscheidung |
|---|---|
| Free ohne Login? | Nein. Free erfordert E-Mail + Magic-Link. |
| Trial? | Ja. Neuer Account erhaelt 14 Tage vollen Pro-Umfang. |
| Zahlungsdaten fuer Trial? | Nein. Kein Checkout, keine Karte, keine Zahlungsdaten. |
| Trial wiederholbar? | Nein. Ein automatischer Signup-Trial pro Account. |
| Trial-Verlaengerung per Gutschein? | Moeglich, aber intern ueber App-Entitlements, nicht ueber Paddle. |
| Nach Trial-Ende | Automatisches Downgrade auf Free. |
| Downgrade-Verhalten | Einfach runterschalten; kein Read-only-Szenarioarchiv. |
| Free-Szenario | Ein aktuelles Szenario, keine Speicherung. |
| Primaere Free-Grenze | Output-/Zeithorizont-Limit statt Input-Cap. |
| Export | Aktuell nicht vorhanden; kein Freemium-v1-Hebel. |
| Reminder | Spaeter planen, nachdem Free implementiert ist. |
| Preisstruktur | 14,95 €/Monat (mtl.), 74,75 € (6 Mo, 1 Monat gratis), 149,50 € (1 Jahr, 2 Monate gratis). Alle Preise zzgl. MwSt. |
| Kuendigungspolitik | Jederzeit zum Monatsende kuendbar, pro-rata Erstattung der Restmonate auf Jahresabo. |
| Founder-Programm | Datums-basiert (kein Mengen-Limit). Public 30 % bis Stichtag, Founder-Codes 35-40 % via Events/Empfehlungen. Lebenslang, verfaellt bei Kuendigung. Pro Brand getrennt. |

---

## 3. Account- und Trial-Modell

### Zugang zur App

Der Zugang erfolgt immer ueber einen Account:

1. User gibt E-Mail-Adresse ein
2. App sendet Magic-Link
3. User klickt Magic-Link
4. Beim ersten Login startet automatisch ein **14-Tage-Pro-Trial ohne Zahlungsdaten**
5. Nach Trial-Ende erfolgt automatisch Downgrade auf **Free**, falls kein aktives Pro-Abo besteht

### Erklaertext auf der Anmeldeseite

Damit User nicht ueber das fehlende Passwort stolpern, braucht die Anmelde-Seite einen kurzen erklaerenden Text.

Vorschlag:

> **Kein Passwort noetig.**  
> Wir senden dir einen sicheren Link an deine E-Mail-Adresse. Mit einem Klick bist du angemeldet - ohne Passwort, das du dir merken oder zuruecksetzen musst.

Begruendung als Feature, nicht als Limitation:

- kein Passwort merken
- kein Passwort vergessen
- kein Passwort-Reset
- weniger Risiko durch Passwort-Wiederverwendung
- schneller Einstieg auf Desktop und Mobile

### Statusmodell

| Status | Bedeutung | Umfang |
|---|---|---|
| **Trial** | neuer angemeldeter User innerhalb der Trial-Zeit | voller Pro-Umfang |
| **Free** | angemeldeter User ohne aktives Trial/Pro | eingeschraenkter Freemium-Umfang |
| **Pro** | zahlender User mit aktivem Abo | voller Pro-Umfang |
| **Promo** | befristeter Sonderzugang ueber internen Code | voller Pro-Umfang bis Ablauf |

**Codex:** Technisch kann `promo` auch als Entitlement-Quelle statt eigener Tier modelliert werden. Wichtig ist nur, dass `/api/me` am Ende eindeutig sagt, ob der User gerade `free`, `trial`, `promo` oder `pro` ist.

---

## 4. Trial-Dauer: 14 statt 30 Tage

Entscheidung: **14 Tage Trial mit vollem Pro-Umfang**.

Warum 14 Tage besser passt:

- Die App braucht keine wochenlange Datensammlung. Der Aha-Moment entsteht schnell: Annahmen eingeben, Kurve sehen, Jahr-10-Wert verstehen.
- 14 Tage geben genug Zeit zum Ausprobieren, erzeugen aber noch Entscheidungsspannung.
- 30 Tage verschieben haeufig nur die Kaufentscheidung. Viele User testen am ersten Tag und vergessen die App danach.
- Free bleibt als Rueckfallnetz erhalten. Der User verliert nach 14 Tagen nicht den Zugang, sondern nur die volle Planungstiefe.

30 Tage waeren sinnvoller, wenn der Verkaufsprozess bewusst langsamer waere, z. B. bei Teams, Agenturen, Schulungen oder wenn echte Nutzungsdaten ueber mehrere Wochen gesammelt werden muessten. Fuer diese App ist 14 Tage fokussierter.

**Codex:** Ich wuerde mit 14 Tagen starten und 30 Tage nur als Kampagnen-/Promo-Variante nutzen, nicht als Default.

---

## 5. Downgrade nach Trial-Ende

Nach Ablauf des Trials:

- Account bleibt bestehen
- Tier-Status wechselt von `trial` auf `free`
- KPI wechselt von Jahr 10 auf Jahr 4
- Chart wechselt in Free-Darstellung
- Jahr 5-10 werden begrenzt/unscharf dargestellt
- CTA: "Pro reaktivieren und volle 10-Jahres-Projektion sehen"

Aktueller App-Stand: Die App hat genau **1 aktives Szenario** und **keine Szenario-Persistenz**. Downgrade ist deshalb ein reiner Tier-Switch:

- keine Daten-Migration
- keine Read-only-Logik
- kein Archiv fuer mehrere Szenarien
- keine Auswahl, welches Szenario aktiv bleibt

Wenn spaeter Szenario-Speicherung als Pro-Feature dazukommt, muss das Downgrade-Verhalten neu definiert werden.

**Codex:** Das einfache Runterschalten ist fuer v1 richtig. Read-only-Szenarien waeren erst dann sinnvoll, wenn es tatsaechlich mehrere gespeicherte Szenarien gibt.

---

## 6. Freier Funktionsumfang

Free soll genug zeigen, damit der User den Nutzen versteht, aber nicht genug, um die App als vollwertige Entscheidungsgrundlage zu verwenden.

| Bereich | Free | Trial / Pro |
|---|---|---|
| **Anmeldung** | erforderlich, Magic-Link per E-Mail | erforderlich, Magic-Link per E-Mail |
| **Zahlungsdaten** | keine | erst beim bezahlten Upgrade |
| **Startzustand neuer Account** | nach Trial-Ende automatisch Free | 14 Tage Trial mit vollem Pro-Umfang |
| **Inputs Member / Shopper** | unbegrenzt (Safety-Limit nur als Server-Guard gegen Missbrauch) | unbegrenzt |
| **Sichtbare Jahre im Chart** | Jahr 1-4 scharf, Jahr 5-6 angedeutet, Jahr 7-10 blurred/locked | alle 10 Jahre scharf |
| **KPI-Karte "Provision/Jahr"** | zeigt Jahr 4 + Hinweis "Pro zeigt Jahr 10" | zeigt Jahr 10 |
| **Realistic-Growth-Modell** | aktiv, aber nur 4 Jahre auswertbar | voll ueber 10 Jahre |
| **Network-Asymmetrie / Year-Offset** | sichtbar in Jahr 1-4 | voll sichtbar |
| **Slider / What-if-Simulation** | live fuer Jahr 1-4 | live fuer alle Jahre |
| **Szenarien** | 1 aktuelles Szenario, keine Speicherung | spaeter optional mehrere gespeicherte Szenarien |
| **Vergleichsmodus** | nicht verfuegbar | spaeter optional |
| **Export PDF/CSV** | aktuell nicht vorhanden | spaeter optionales Pro-Feature |

---

## 7. Grundsatz: Output-Limit statt Input-Cap

### Verworfen als Hauptmodell: Input-Caps

Beispiele:

- max. 2 Member pro Sponsor
- max. 4 Shopper pro Member

Warum nicht als primaerer Freemium-Hebel:

- Der User baut ein unrealistisch kleines Netz und schliesst daraus "lohnt sich nicht".
- Der USP der App - realistische Wachstumsmodellierung mit Year-Offset und Network-Asymmetrie - entfaltet sich erst ab Jahr 3-5.
- Eine harte Eingabegrenze erzeugt ein Stop-Erlebnis statt eines Teasers.

### Gewaehlt: Output-/Zeithorizont-Limit

Der User kann sein echtes geplantes Netzwerk modellieren, sieht aber nur den Anfang der Auszahlungskurve belastbar:

1. Jahr 1-4 voll sichtbar
2. Jahr 5-6 als Teaser sichtbar, aber ohne belastbare Detailwerte
3. Jahr 7-10 locked/blurred
4. Free-KPI zeigt Jahr 4
5. Trial/Pro-KPI zeigt Jahr 10

**Codex:** Ich wuerde Member-/Shopper-Limits nur als technisches Safety-Limit gegen extreme Fantasiewerte nutzen, nicht als Marketing-Grenze. Zu niedrige Input-Caps machen den wahrgenommenen Nutzen kleiner.

---

## 8. Psychologisches Design

### Der verschwommene Horizont

Jahr 5-10 sollte nicht komplett verschwinden. Besser:

- Jahr 1-4: klare Werte, volle Interaktion
- Jahr 5-6: Kurve sichtbar, halbtransparent oder mit anonymisierten Werten
- Jahr 7-10: stark verschwommen/locked, nur Verlauf erkennbar
- Overlay-Hint: "Sieh deinen echten Jahr-10-Wert mit Pro"

So sieht der User, **dass die Kurve genau dort spannend wird, wo sie unscharf wird**.

**Claude:** Konkret zu "anonymisierte Werte" in Jahr 5-6: Sinnvoll sind maskierte Zahlen, die die *Groessenordnung* andeuten, aber keine belastbare Planung erlauben. Beispiel: statt `12.847 €` zeigt das UI `1•.••• €` (erste Ziffer sichtbar, Rest maskiert) oder `~12.000 €` (auf 1k gerundet mit Tilde). Das gibt dem User genug Information fuer den Wow-Moment ("zweistellig in Tausend"), aber nicht genug fuer "ich plane darauf meinen Lebensunterhalt". Komplette Pixelierung ist schwacher — der User sieht nicht, dass die Zahl gross genug ist, um interessant zu sein.

### KPI-Karten-Umschaltung

Free:

- zentrale Provisions-Karte zeigt **Jahr 4**
- Badge: "Pro zeigt Jahr 10"

Trial/Pro:

- zentrale Provisions-Karte zeigt **Jahr 10**
- volle Kurven- und KPI-Details sichtbar

### CTA-Logik

Gute CTA-Stellen:

- auf dem Blur-Overlay ab Jahr 5
- auf der KPI-Karte neben "Pro zeigt Jahr 10"
- nach Trial-Ende als dezenter Hinweis im Free-Modus

**Codex:** Ich wuerde keine aggressiven Modals nach X Sekunden starten. Besser sind kontextuelle CTAs genau dort, wo der User den fehlenden Wert spuert.

---

## 9. Ethische Grenze

Realistic-Growth darf **nicht** komplett hinter die Paywall geschoben werden.

Warum:

- Free waere sonst eine reine Schoenwetter-Simulation.
- Der User koennte unrealistische Erwartungen entwickeln.
- Bei Vertriebssystem-Simulationen ist das ethisch und rechtlich heikel.

Sauber:

- Realistic-Growth bleibt im Free-Tier aktiv.
- Die ersten 4 Jahre werden korrekt berechnet und angezeigt.
- Die langfristige Auszahlungskurve bleibt Pro.

Bezug: [[feedback_network_single_source]] - keine kosmetischen Schaetzungen, auch nicht im Free-Tier.

---

## 10. Trial-, Promo- und Paddle-Grenze

### Was wird intern gesteuert?

Kostenloser Zugang ohne Zahlungsdaten ist ein **App-Entitlement**, kein Paddle-Checkout.

Intern gesteuert:

- initialer 14-Tage-Trial
- Trial-Ende und Downgrade
- Wiederholungsschutz (`trial_used`)
- Gutschein-/Kulanz-Zugang fuer X Tage Pro
- Free-Status

### Was wird ueber Paddle gesteuert?

Paddle ist fuer Zahlung und Billing:

- Pro-Abo monatlich/jaehrlich
- Checkout
- Rechnungen
- Steuern
- Customer Portal
- bezahlte Upgrades
- monetaere Rabatte auf bezahlte Plaene

Paddle-Discount-Codes eignen sich fuer:

- 20% Rabatt
- Early-Bird-Preis
- Affiliate-/Partner-Rabatt
- Sonderpreis fuer bezahlte Kunden

Paddle eignet sich **nicht** fuer:

- "gib diesem Free-User nochmal 7 Tage Pro ohne Zahlungsdaten"
- kostenlose Trial-Verlaengerung ohne Checkout
- reinen Kulanzzugang

Warum nicht Paddle fuer kostenlose Trial-Gutscheine?

- 100%-Discounts koennen trotzdem Billing-/Zahlungsdaten verlangen.
- Es entstehen Subscriptions mit 0 EUR.
- Es entstehen Webhook- und Rechnungsnebenwirkungen.
- Conversion-Tracking wird unklarer.
- App-Entitlements werden unnoetig an Billing-Objekte gekoppelt.

**Codex:** Die Trennung ist wichtig: Paddle ist Payment Source of Truth, aber nicht die einzige Entitlement-Quelle. Fuer kostenlosen Zugang ist das eigene Backend die sauberere Quelle.

### Beispiel fuer interne Tabellen

```text
users
  id
  email
  trial_started_at
  trial_used
  created_at
  updated_at

entitlements
  id
  user_id
  brand_id
  access_level       -> free | trial | promo | pro
  valid_until
  source             -> signup_trial | promo_code | subscription | manual_grant | refund_revoked
  created_at
  updated_at

promo_codes
  id
  code
  days_granted
  valid_until
  max_redemptions
  created_at
  updated_at

promo_redemptions
  id
  promo_code_id
  user_id
  redeemed_at
```

### Promo-Code-Flow

1. User gibt Code im Account-Bereich ein.
2. Backend prueft: Code existiert, ist nicht abgelaufen, Limit nicht erreicht, User hat Code nicht schon eingeloest.
3. Backend erzeugt oder verlaengert ein `promo`-Entitlement.
4. `/api/me` liefert wieder vollen Zugriff bis `valid_until`.
5. Nach Ablauf faellt der User wieder auf Free zurueck, falls kein Pro-Abo aktiv ist.

Beispiele fuer Codes:

- Newsletter-Reaktivierung
- Messe-/Flyer-Code
- Sponsor-Empfehlung
- Kulanz fuer Support-Fall
- Beta-Tester-Zugang

---

## 11. Preisstruktur und Vertragsmodelle

### Preise (alle zzgl. MwSt)

Modell: HKCM-Style-Treppe, Rabatte als "Gratis-Monate" statt Prozent-Angaben kommuniziert.

| Plan | Vorauszahlung | Effektiver Monatspreis | Vorteil |
|---|---|---|---|
| **Monatlich** | 14,95 €/Monat | 14,95 € | maximale Flexibilitaet |
| **6 Monate** | 74,75 € (5 × 14,95 €, **1 Monat gratis**) | 12,46 € | 1 Monat geschenkt |
| **1 Jahr** | 149,50 € (10 × 14,95 €, **2 Monate gratis**) | 12,46 € | 2 Monate geschenkt |

Alle Preise verstehen sich **zzgl. MwSt**.

**Codex:** Die Granularitaet 1 / 6 / 12 Monate ist sinnvoller als 1 / 3 / 6 / 12 Monate. Nach einem 14-Tage-Trial hat der 3-Monatsplan keine klare Rolle: Unsichere User nehmen monatlich, ueberzeugte User nehmen 6 oder 12 Monate. Drei Optionen sind schneller verstanden und lenken sauberer Richtung laengerer Laufzeit.

**Codex:** Die aktuelle Staffel ist rechnerisch konsistent, aber sie macht 6 Monate und 12 Monate effektiv gleich teuer pro Monat. Das ist okay, wenn "1 Monat gratis pro Halbjahr" die Botschaft sein soll. Wenn der Jahresplan als klar bester Deal wirken soll, braucht er einen zusaetzlichen Vorteil, z. B. 6 Monate = ca. 0,5 Monat gratis und 12 Monate = 2 Monate gratis, oder 6 Monate = 1 Monat gratis und 12 Monate = 3 Monate gratis.

**Codex:** Falls die urspruengliche Logik "ca. 1 Monat pro Jahr gratis" fuer den 6-Monatsplan gemeint war, waere 74,75 € zu guenstig. Dann muesste 6 Monate eher bei ca. 82,25 € netto liegen (5,5 × 14,95 €), waehrend 12 Monate bei 149,50 € bleibt. Meine bevorzugte einfache Staffel waere: 14,95 € monatlich, 79,95 € fuer 6 Monate, 149,50 € fuer 12 Monate.

**Claude:** Hinweis zur Struktur — 6-Monats- und Jahresplan haben denselben effektiven Monatspreis (12,46 €). Das ist sauber kommunizierbar ("je Vertragsperiode 1 Monat frei pro halbes Jahr"), aber psychologisch fehlt der zusaetzliche Pull Richtung Jahresabo. Branchenueblich waere: 6 Monate ~ 8-10 % Rabatt, 1 Jahr ~ 17-20 % Rabatt, damit Jahresabo *spuerbar* guenstiger wirkt. Alternative Preisstaffel: 6 Monate = 1 Monat frei (16,7 %), Jahr = 3 Monate frei (25 %). Bei der jetzigen Variante ist der Jahresplan vor allem ein **Commitment-Plan** (weniger Billing-Vorgaenge), kein **Spar-Plan**.

### Kommunikation der Preise

In der Pricing-Tabelle nicht "5 % / 10 % / 15 %" zeigen, sondern **Gratis-Monate**:

- Klarer ("ich bekomme einen Monat geschenkt" > "ich spare 8,33 %")
- Schwerer rechnerisch direkt vergleichbar mit Wettbewerbern
- Belohnt den Plan-Wechsel visuell

### Kulante Kuendigungspolitik

**Empfehlung: Jederzeit-Kuendigung zum Monatsende mit anteiliger Erstattung der vorausbezahlten Restmonate.**

Konkret:

- User kuendigt im Monat *m* eines Jahresabos
- Aktiver Zugang laeuft bis Ende des Monats *m*
- Erstattet werden: `(12 - m) / 12 × 149,50 €`
- Erstattung an die urspruengliche Zahlungsmethode ueber Paddle

Beispiel:

- User kauft 1-Jahr-Abo (149,50 €) am 01.06.2026
- Kuendigt zum 30.09.2026 (4 Monate genutzt)
- Erstattung: `(12 - 4) / 12 × 149,50 € = 99,67 €`
- Zugang endet 30.09.2026, dann Downgrade auf Free

**Codex:** Fuer dieses Produkt wuerde ich trotz rechnerischer Preis-Arbitrage bewusst bei der KISS-Logik bleiben: `Refund = volle Restmonate / 12 × Jahrespreis`. Der wichtigste Effekt ist nicht die perfekte Abrechnung jedes genutzten Monats, sondern die Reduktion von Kauf- und Renewal-Angst. Wenn der Kunde weiss, dass die automatische Jahresverlaengerung kein neues 12-Monats-Gefaengnis ist, kuendigt er weniger vorsorglich vor dem Renewal und laesst ein zufriedenstellendes Jahresabo eher weiterlaufen.

**Codex:** Die faire Kuendigbarkeit wirkt damit doppelt: Sie senkt die Huerde beim Erstkauf und entschaerft spaeter die automatische Verlaengerung. Der Kunde muss nicht taktisch kuendigen, nur um sich vor Lock-in zu schuetzen. Gerade bei einem trust-skeptischen Markt kann dieser Vertrauenseffekt mehr wert sein als ein paar Euro mehr durch eine strengere Refund-Formel.

### Der Mechanismus dahinter

Eine Kauf-Entscheidung fuer ein Jahresabo hat zwei psychologische Huerden:

1. **Commitment-Angst:** *"Was wenn die App doch nicht fuer mich ist? Dann bin ich 12 Monate gebunden."*
2. **Trust-Zweifel:** *"Werden die mir das Kuendigen schwer machen? Versteckte Klauseln?"*

Eine pro-rata Refund-Policy neutralisiert beide Huerden gleichzeitig. Damit verschieben sich drei Groessen:

```
              ohne Refund-Policy        mit Refund-Policy
              ──────────────────        ─────────────────
Conversion    niedriger                 hoeher    (+)
Annual-Mix    niedriger (mehr Mo.)      hoeher    (+)
Sunk-Cost     hoch (Zombies bleiben)    niedrig   (-)
```

Die ersten zwei Effekte erhoehen den Umsatz. Der dritte senkt ihn. Die Frage ist: **Was ueberwiegt?**

**Codex:** Fuer die Renewal-Frage ist die zentrale Hypothese: Kulanz senkt nicht nur Churn beim Einstieg, sondern auch "defensiven Churn" kurz vor der automatischen Verlaengerung. Manche Kunden kuendigen Jahresabos vorsorglich, weil sie nicht erneut festhaengen wollen. Wenn sie wissen, dass sie auch nach Renewal zum Monatsende rauskommen, entsteht weniger Druck, vor dem Verlängerungsdatum aktiv zu werden.

### Vorteile

| Effekt | Groessenordnung (B2C-SaaS-Benchmarks) | Begruendung |
|---|---|---|
| **Trial-zu-Paid-Conversion** | +10 % bis +25 % relativ | weniger Commitment-Angst beim Kauf |
| **Annual-Mix-Verschiebung** | +5 bis +15 Prozentpunkte | mehr User wagen Jahresabschluss, weil Kuendigung moeglich bleibt |
| **NPS / Trust-Score** | +5 bis +12 Punkte | Bain-Studie: 67 % der Konsumenten beziehen Refund-Policy in Kaufentscheidung ein |
| **Word-of-Mouth / Brand** | +3 bis +7 % indirekte Conversion | Generosity-Reputation → positive Reviews, Empfehlungen |
| **Weniger Chargebacks / Disputes** | -30 bis -60 % | unzufriedene User refunden statt Zahlung zu reklamieren — administrativ deutlich angenehmer |
| **Cash-Flow-Stabilitaet** | leicht positiv | mehr Annual-Subscriber = vorab gebuchter Umsatz, geringere Payment-Processor-Gebuehren als bei Monatlich |

**Was am staerksten zaehlt:** Der Conversion-Lift. Bei 14,95 €/Monat ist jeder zusaetzliche Kunde mehr wert als jeder durch Sunk-Cost-Effekt gehaltene Zombie-Kunde — Zombies generieren oft schon nach Monat 3 keine echte Aktivitaet mehr und werden Refund fordern, sobald sie es bemerken.

### Risiken

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| **Refund-Quote zu hoch (>15 %)** | mittel | Fruehindikator fuer Produktproblem, nicht Policy-Problem. Reaktion: Produkt verbessern, nicht Refund-Huerden einbauen. |
| **Refund-Abuse** (App nutzen, dann komplett refunden) | niedrig bei pro-rata | Pro-rata bedeutet: User zahlt fuer genutzte Monate. Komplett-Refund-Missbrauch wird strukturell verhindert. |
| **Cash-Flow-Schock durch Refund-Welle** | sehr niedrig | Refunds verteilen sich statistisch ueber das Jahr; bei kleiner Userbase ueberschaubar |
| **Sunk-Cost-Retention-Verlust** | hoch (5-15 % Umsatz) | echter Effekt, aber: diese User sind eh meist negativ — wuerden bei Renewal kuendigen und schlechte Reviews schreiben |
| **LTV-Forecast unsicherer** | mittel | bookbarer Umsatz wird ueber Refund-Wahrscheinlichkeit korrigiert; CFO-relevant, nicht Produkt-relevant |
| **Falsches Brand-Signal** ("wir erwarten Refunds") | mittel-niedrig | Framing entscheidet: "Kein Risiko" (positiv) vs. "Geld-zurueck-Garantie" (defensiv) |
| **Operative Last (Refund-Processing)** | sehr niedrig | Paddle automatisiert via Customer Portal; minimaler Support-Aufwand |
| **B2B-/Sponsor-Kaeufer erwarten harten Vertrag** | niedrig | falls relevant: separate B2B-Tier mit klassischem Lock-in spaeter einfuehren |

### Datengrundlage — wie belastbar ist das?

Ehrlich gesagt: **mittel belastbar.** Es gibt keinen sauberen RCT zu diesem Thema. Was vorliegt:

- **ProfitWell-Benchmarks** (Patrick Campbell, jetzt Paddle nach Akquisition): aggregierte SaaS-Daten zu Refund-Policies und LTV-Korrelationen. Korrelativ, nicht kausal.
- **Recurly Subscription Benchmarks**: jaehrliche Reports zu Refund-/Churn-Quoten in unterschiedlichen Industrien.
- **HBS-Case-Studies** (z. B. Zappos, Basecamp): qualitativ, anekdotisch.
- **Bain & Company Consumer Studies**: Konsumentenbefragungen zur Bedeutung von Refund-Policies.
- **Lincoln Murphy / Tomasz Tunguz**: Practitioner-Blogs mit Erfahrungswerten, nicht peer-reviewed.

Die **Richtung** des Effekts (positiv fuer B2C-SaaS mit niedrigem Preis) ist konsistent ueber alle Quellen. Die **Groessenordnung** schwankt je nach Branche/Studie um Faktor 2-3. Fuer den hiesigen Use-Case (B2C, kleiner Preis, trust-skeptisches MLM-Umfeld) ist die Wahrscheinlichkeit eines Netto-Vorteils sehr hoch — aber kein Garantie-Effekt.

**Codex:** Die im Dokument genannten Prozentwerte sollten als Arbeitsannahmen behandelt werden, nicht als belastbare Prognose. Fuer die Entscheidung reicht die Richtung: einfache Kuendigung und faire Refunds reduzieren wahrgenommenes Risiko. Die genaue Umsatzwirkung muss ueber eigene Kohorten gemessen werden.

### Empfehlung mit konkreten Regeln

**Ja, pro-rata Refund auf Jahresabo einfuehren.** Mit folgender Ausgestaltung:

1. **Pro-rata-Logik:** Erstattung der **ungenutzten vollen Monate**. Beispiel: User kauft 1-Jahr-Abo am 01.06., kuendigt am 15.09. → Zugang laeuft bis 30.09., Erstattung fuer Oktober-Mai = 8 Monate × (149,50 € / 12) = 99,67 €. Kein Partial-Month-Refund (saubere Mathematik, weniger Reibung).
2. **Keine Mindestlaufzeit:** Auch in Monat 1 moeglich. Andernfalls wirkt die Policy halbherzig.
3. **Refund-Frist:** Innerhalb von 7 Werktagen erstattet via Paddle, auf das urspruengliche Zahlungsmittel.
4. **Framing auf Pricing-Seite:** *"Kein Risiko. Du kannst jederzeit zum Monatsende kuendigen — die nicht genutzten Monate erstatten wir dir."* Nicht *"Geld-zurueck-Garantie"* (klingt defensiv, suggeriert dass User Refund einfordern muessen).
5. **AGB-Klausel klar und kurz:** Keine Ausnahmen, keine Kleingedrucktes-Fallen. Das ist das eigentliche Differenzierungsmerkmal.

### Begruendung fuer diese App konkret

- **MLM-Adjacent-Markt ist trust-skeptisch.** Kulante Kuendigung ist ein starkes Vertrauenssignal — viele MLM-/Vertriebs-Begleitprodukte sind hartes Lock-in. Wir differenzieren uns ueber Fairness.
- **Niedriger Preis (14,95 €/Monat) macht Refund-Aufwand klein.** Selbst bei 10 % Refund-Quote auf Jahresabos kostet das im Schnitt 50-100 € pro Refund — operativ tragbar.
- **Paddle kann pro-rata Refunds** ueber API/Customer Portal abwickeln (zu pruefen, ob self-service oder Support-Flow — siehe unten).
- **Trial + Free-Downgrade + Kulanz-Kuendigung = konsistentes Versprechen.** Der gesamte Funnel sagt "Du verlierst nichts, wenn du es probierst." Das passt zur Magic-Link-Anmeldung ("kein Passwort, kein Lock-in").

### Monitoring-Schwellen

Nach Launch beobachten:

| Metrik | Zielbereich | Wenn drueber/drunter: Reaktion |
|---|---|---|
| **Refund-Rate auf Annual** | < 8 % | – |
| **Refund-Rate auf Annual** | 8-15 % | beobachten, Onboarding/Value-Delivery pruefen |
| **Refund-Rate auf Annual** | > 15 % | **Produktproblem**, nicht Policy. Refund-Gruende analysieren. |
| **Annual-Mix am Signup** | > 40 % | – |
| **Trial→Paid-Conversion** | > 8 % | – |
| **Reaktivierungs-Rate refundeter User** | > 5 % innerhalb 6 Monaten | gutes Zeichen fuer "kein Bridge-Burning" |

### Risiko-adjustierte Bemerkung

Das echte Risiko ist nicht "Refund-Welle" — das ist *handhabbar*. Das echte Risiko ist, dass die **Sunk-Cost-Retention-Verluste hoeher ausfallen als der Conversion-Lift**. Das passiert, wenn:

- die Conversion eh schon hoch ist (>15 % Trial→Paid) — dann ist der Lift kleiner
- die User loyal sind, aber die App selten nutzen — dann sind viele "Zombies", die durch Refund aktiv werden
- die App-Qualitaet sich verschlechtert — dann steigt die Refund-Rate dramatisch

Beim aktuellen Setup (Launch-Phase, Trial→Paid noch unbekannt, neuer Markt) ist der Conversion-Lift fast garantiert wichtiger als der Retention-Verlust. Daher: einfuehren.

Wenn nach 6-12 Monaten klare Daten vorliegen und sich zeigt, dass die Refund-Rate >10 % und der Conversion-Lift <10 % ist, koennte man umschwenken auf "30-Tage-Geld-zurueck-Garantie + danach Standard-Lock-in". Das ist aber Post-Launch-Optimierung, kein Launch-Risiko.

**Codex:** Pro-rata Refund auf Jahresabos ist ein starkes Verkaufsargument auf der Pricing-Seite. Klare Kommunikation: "Kein Risiko. Wenn du nicht zufrieden bist, erstatten wir dir die Restmonate." Das gehoert prominent auf die Pricing-Seite, nicht versteckt in die AGB.

**Codex:** Vor der finalen Zusage "pro-rata Erstattung jederzeit" sollte geprueft werden, ob Paddle Customer Portal diesen Flow wirklich self-service in der gewuenschten Form abbildet. Falls nicht, als "auf Anfrage" oder "ueber Support" formulieren, damit die Pricing-Seite nichts verspricht, was operativ noch nicht automatisiert ist.

**Codex:** Wenn Paddle den Self-Service-Refund nicht elegant kann, wuerde ich die Policy trotzdem nicht verwerfen. Dann lautet die KISS-Kommunikation: "Kuendige jederzeit zum Monatsende; nicht genutzte volle Monate erstatten wir dir automatisch oder auf Anfrage." Operative Reibung ist weniger schlimm als eine komplizierte Preislogik, die das Vertrauenssignal verwässert.

---

## 12. Loyalty-Discount-Mechanik (Founder-Programm)

### Mechanismus: Loss-Aversion + Endowment-Effect

Der staerkste positive Retention-Hebel im Subscription-Business ist nicht Vertragslaufzeit, sondern ein **lebenslanger Treuerabatt**, der bei Kuendigung verfaellt. Beispiel HKCM (Modellbau-Shop): bestehende Kunden behalten einen 30 %-Rabatt, solange sie nicht kuendigen. Dieser Mechanismus wirkt durch zwei verhaltensoekonomische Effekte:

- **Loss-Aversion (Kahneman/Tversky):** Etwas zu verlieren wiegt psychologisch ca. doppelt so schwer wie etwas Gleichwertiges zu gewinnen. Den 30%-Rabatt aufzugeben fuehlt sich an wie ein konkreter Verlust.
- **Endowment-Effect:** Was dem User "gehoert", bewertet er hoeher als das, was er erwerben koennte. Der Rabatt wird zum Besitz, nicht zum Geschenk.

| Klassischer Lock-in | Lifetime-Loyalty-Discount |
|---|---|
| "Du **musst** bleiben (Vertragslaufzeit)" | "Du **willst** bleiben (sonst verlierst du den Rabatt)" |
| negative Emotion, Lock-in als Strafe | positive Emotion, Rabatt als erworbenes Privileg |
| nach Vertragsende egal | waechst ueber Zeit emotional an |

### Kompatibilitaet mit der Kulanz-Policy

Pro-rata Refund und Founder-Discount sind **komplementaer, nicht widerspruechlich**:

| Mechanik | Wirkung |
|---|---|
| **Pro-rata Refund** | senkt Eintrittsbarriere — Conversion-Boost |
| **Founder-Discount (lifetime)** | erhoeht Ausstiegsbarriere — Retention-Boost, aber positiv emotional, nicht durch Friction |

Die Kombination: Es ist *leicht reinzukommen* und *emotional teuer rauszugehen* — ohne Lock-in-Tricks.

### Verworfen: Mengen-basierte Verknappung ("erste 250 User")

Klassisches Founder-Programm-Modell ist "die ersten N User erhalten lebenslangen Rabatt". Das wird hier **abgelehnt**:

- Mengen-Limit ist von aussen **nicht verifizierbar**. Der User muss glauben, dass die Zahl ehrlich ist.
- Wirkt im trust-skeptischen MLM-/Vertriebs-Umfeld wie kuenstliche Verknappung — also wie genau das, was wir mit der Kulanz-Policy zu vermeiden versuchen.
- Erzeugt FOMO-Druck ("habe ich noch einen Platz?"), der zur ehrlichen Positionierung der App nicht passt.
- Inkonsistent zum gesamten Funnel (Magic-Link "kein Passwort", Free "kein Lock-in", Kulanz "kein Risiko") — alle anderen Versprechen sind transparent, dieses waere es nicht.

### Gewaehlt: Datums-basierte Founder-Periode

**Mechanik:** Wer bis zu einem klar kommunizierten Stichtag (z. B. *31.12.2026, 23:59 Uhr*) ein bezahltes Abo abschliesst, erhaelt einen **lebenslangen Founder-Discount** — solange das Abo nicht gekuendigt wird.

Eigenschaften:

- **Transparent**: Datum ist fuer alle sichtbar, nicht verifizierbar nur "ob noch Platz".
- **Fair**: jeder hat dieselbe Chance bis zum Stichtag.
- **Konsistent** mit der gesamten Trust-Positionierung der Brand.
- **Klar kommunizierbar**: ein Satz, kein Sternchen.

### Founder-Discount-Hoehe

Zwei Stufen, ueber unterschiedliche Kanaele verteilt:

| Kanal | Rabatt | Verfuegbarkeit |
|---|---|---|
| **Public Founder-Discount** (datums-basiert) | 30 % | Jeder, der bis Stichtag bezahltes Abo abschliesst |
| **Founder-Codes** (Event/Empfehlung/Newsletter) | 35-40 % | Nur per Code, distribuiert auf Messen, Webinaren, durch Sponsoren |

Beide Stufen gelten **lebenslang**, solange das Abo besteht. Bei Kuendigung erlischt der Rabatt unwiderruflich. Wenn ein User sowohl die Public-Periode nutzt als auch einen Event-Code einloest, gilt der hoehere Rabatt (40 % > 30 %).

### Effektive Preise mit Founder-Discount

| Plan | Standard (zzgl. MwSt) | mit 30 % Founder | mit 40 % Founder-Code |
|---|---|---|---|
| Monatlich | 14,95 € | 10,47 € | 8,97 € |
| 6 Monate | 74,75 € (= 12,46 €/Mo) | 52,33 € (= 8,72 €/Mo) | 44,85 € (= 7,48 €/Mo) |
| 1 Jahr | 149,50 € (= 12,46 €/Mo) | 104,65 € (= 8,72 €/Mo) | 89,70 € (= 7,48 €/Mo) |

### Brand-Trennung

Founder-Programm gilt **pro Brand**. Ein FitFlow360-Founder hat keinen Bonus in EqoFlow360. Beide Brands erhalten ihre eigene, getrennt kommunizierte Founder-Periode. Siehe [[project_brand_separation]].

### Phasenplan

1. **Phase 1 — Public Launch (Tag 0 bis Stichtag):** Public Founder-Discount mit 30 % auf alle Plaene, datums-basiert bis konkretes Datum (Vorschlag: 6 Monate nach Launch).
2. **Phase 2 — parallel:** Founder-Codes mit 35-40 % fuer Events, Sponsor-Empfehlungen, Webinare, Newsletter — verteilbar ueber die gesamte "Gruendungsphase".
3. **Nach Stichtag:** Keine vergleichbaren Lifetime-Discounts mehr. Spaetere Aktionen nur als zeitlich begrenzte Specials (z. B. "3 Monate zum halben Preis"), die nach Ablauf zum Vollpreis zurueckkehren. Das **Founder-Programm muss eine einmalige Geschichte bleiben**, sonst verliert es den emotionalen Wert.

### Risiken

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| **Permanente Margen-Erosion** | hoch (per Definition) | Founder-Periode klar zeitlich begrenzen, danach nie wieder. 30 % ist branchenueblich als Obergrenze; 40 % nur fuer kanalisierte Codes. |
| **Discount-Shopper-Verhalten** | mittel | "Einmaliges Founder-Programm" klar kommunizieren — keine vergleichbaren Aktionen danach. |
| **Preis-Asymmetrie zwischen Usern** | mittel | Founder-Status als Identitaets-Asset auf der Account-Seite sichtbar. "Du bist Founder" als Statussymbol, nicht als Geheimnis. |
| **Schwer rueckgaengig** | hoch (per Definition) | Vor Launch genau ueberlegen, ob 30/40 % die richtige Groessenordnung ist. Lieber konservativ starten und nachsteuern. |
| **Paddle-Implementation-Unsicherheit** | mittel | Drei Optionen pruefen: Subscription-Override beim Checkout, Coupon mit `forever`-Flag, oder eigener Founder-Plan-Variant im Katalog. Implementierung muss garantieren, dass Auto-Renewal den **Original**preis weiter belastet, nicht den aktuellen Katalogpreis. |
| **Founder-Status nach Refund** | niedrig | Klare Regel: wer das Founder-Abo via pro-rata Refund kuendigt, verliert den Founder-Status genauso wie bei normaler Kuendigung. Sonst Missbrauch moeglich (kaufen, sofort refunden, Status behalten). |

### Paddle-Seite

Im Gegensatz zur Trial-Verlaengerung (rein App-intern) **gehoert** der Founder-Discount in Paddle — er ist ein Discount auf einen bezahlten Plan. Optionen, in Reihenfolge der Praeferenz:

1. **Subscription-Override beim Checkout**: Die Subscription wird mit reduziertem Preis angelegt. Paddle bewahrt den Preis ueber alle Renewals.
2. **Lifetime-Coupon**: Falls Paddle einen Coupon mit "forever"-Eigenschaft unterstuetzt, der bei allen Renewals weiterwirkt.
3. **Eigener Founder-Plan-Variant im Katalog**: Drei zusaetzliche Produkte (Monthly-Founder, 6mo-Founder, Annual-Founder) mit reduzierten Preisen. Etwas mehr Konfigurations-Aufwand, dafuer sauberste Trennung im Reporting.

Vor finaler Kommunikation: technische Machbarkeit klaeren. Das gehoert in die Paddle-Integration-Doku.

**Codex:** Founder-Codes (35-40 %) sind staerkeres Werkzeug als der Public-Discount, weil sie persoenlich uebergeben werden — direkt von Sponsor zu Interessent oder auf Events. Der Public-Discount fuengt Self-Service-Conversion ab, die Codes binden vertriebsstark.

**Codex:** Dauerhafte Rabatte sind ein echter Retention-Hebel, aber sie setzen auch einen langfristigen Referenzpreis. Ich wuerde 30 % Public-Founder als obere Standardgrenze sehen und 40 % nur sehr kontrolliert einsetzen (z. B. Beta, Messe, strategische Sponsor-Codes). Sonst entsteht spaeter der Eindruck, dass der "eigentliche" Preis kuenstlich hoch ist.

**Codex:** Fuer die Umsetzung bevorzuge ich eigene Founder-Price-Varianten in Paddle, falls das Reporting und Renewal-Verhalten dadurch sauberer wird. Ein Lifetime-Coupon ist eleganter im Setup, aber riskanter, wenn Coupon-Regeln, Renewal-Verhalten oder Kombinationen mit anderen Rabatten spaeter unklar werden. Entscheidend ist: Der Founder-Preis muss bei automatischer Verlaengerung stabil bleiben und bei Kuendigung unwiederbringlich verfallen.

**Codex:** Wichtiges Wording auf Pricing/Account: "Behalte deinen Founder-Preis, solange dein Abo aktiv bleibt." Nicht zu hart als Drohung formulieren. Der Rabatt soll sich wie ein erworbenes Privileg anfuehlen, nicht wie eine Strafe bei Kuendigung.

**Claude:** Vor dem Launch unbedingt entscheiden, wann der Stichtag liegt. Empfehlung: 6 Monate nach Public-Launch, nicht laenger. Begruendung: (a) klare Knappheit ohne "fishy" zu wirken, (b) genug Zeit fuer Marketing-Aufbau, (c) Founder-Population bleibt managbar groesse — bei zu langer Periode wird der Discount zur dauerhaften Belastung der Marge, nicht zum Privileg einer fruehen Kohorte.

---

## 13. Technische Umsetzung

### Gate-Punkte im Code

1. **Auth-Gate:** Nicht eingeloggt -> Login mit E-Mail/Magic-Link.
2. **Trial-Start:** Neuer Account erhaelt `trial` mit `valid_until = created_at + 14 Tage`.
3. **Trial-Wiederholungsschutz:** User speichert `trial_started_at` und `trial_used = true`.
4. **Entitlement-Resolver:** `/api/me` berechnet effektiven Status aus aktiver Subscription, Trial, Promo und Free-Default.
5. **Downgrade:** Wenn Trial/Promo abgelaufen und kein Pro aktiv, liefert `/api/me` `free`.
6. **Chart-Renderer:** Jahre > `freemiumYearLimit` (= 4) mit Blur/Lock/Overlay.
7. **KPI-Karte:** Free liest Jahr 4, Trial/Pro liest Jahr 10.
8. **Slider-Bindings:** Berechnung darf intern ueber 10 Jahre laufen, sichtbare Ausgabe wird nach Tier begrenzt.
9. **Szenarien:** Free speichert keine Szenarien; nur aktueller Zustand im Client.
10. **Export:** kein Gate fuer v1, da Feature aktuell nicht existiert.

### Entitlement-Prioritaet

Empfohlene Prioritaet:

1. Aktives Pro-Abo via Paddle
2. Aktives Promo-/Kulanz-Entitlement
3. Aktiver Signup-Trial
4. Free

**Codex:** Pro sollte immer gewinnen. Wenn ein zahlender User parallel einen Promo-Code einloest, darf das den bezahlten Status nicht verschlechtern oder verwirren.

**Claude:** Zwei Edge-Cases, die explizit definiert werden sollten:

1. **Pro-Cancellation mit Restlaufzeit**: Wenn ein Pro-User kuendigt, bleibt das Pro-Entitlement bis zum Ende der bezahlten Periode aktiv (Paddle-Standard). Erst danach faellt der User auf Free zurueck, *nicht* auf Promo oder Trial — auch wenn solche Entitlements parallel existieren wuerden, gelten sie als verbraucht.
2. **Promo-Code waehrend aktivem Pro einloesen**: Sollte erlaubt sein, aber das Promo-Entitlement "parkt" — es wird erst aktiv, *wenn* das Pro-Abo endet. Andernfalls verlieren User ihre Codes, weil sie sie zum falschen Zeitpunkt eingeloest haben. Implementation: `promo`-Entitlement bekommt `activated_at = pro_subscription.canceled_at OR redeemed_at` und `valid_until = activated_at + days_granted`.

---

## 14. Reminder-Plan

Reminder werden **spaeter** geplant, sobald Free implementiert ist.

Grund:

- Erst dann sind die konkreten UX-Touchpoints klar.
- Reminder sollten zur echten App-Nutzung passen.
- Zu fruehe Mailplanung fuehrt oft zu generischen Texten.

Moegliche spaetere Touchpoints:

- Tag 0: Trial gestartet
- Tag 7: Halbzeit
- Tag 12: Noch 2 Tage
- Tag 14: Trial endet heute
- Tag 15: Du bist jetzt im Free-Tier

**Codex:** Ich wuerde diese Mails erst schreiben, wenn die Free-Gates im UI stehen. Dann kann jede Mail auf ein echtes fehlendes Feature zeigen, statt nur allgemein "Upgrade" zu sagen.

---

## 15. Offene Fragen

- [x] Free ohne Login? Entscheidung: nein, Free erfordert E-Mail + Magic-Link.
- [x] Trial-Komponente? Entscheidung: ja, 14 Tage voller Pro-Umfang.
- [x] Zahlungsdaten fuer Trial? Entscheidung: nein.
- [x] Trial-Dauer 14 oder 30 Tage? Entscheidung: 14 Tage als Default.
- [x] Downgrade-Verhalten? Entscheidung: einfach auf Free runterschalten.
- [x] Free-Szenario speichern? Entscheidung: nein, 1 aktuelles Szenario ohne Speicherung.
- [x] Wiederholbares Trial? Entscheidung: nein, nicht automatisch.
- [x] Gutschein fuer weitere Pro-Tage? Entscheidung: moeglich, intern ueber App-Entitlements.
- [x] Paddle fuer kostenlose Trial-Gutscheine? Entscheidung: nein, Paddle nur fuer Bezahlung/Rabatte.
- [x] Reminder-Plan jetzt ausarbeiten? Entscheidung: nein, spaeter nach Free-Implementierung.
- [x] Preisstruktur? Entscheidung: HKCM-Style-Treppe, 14,95 € Monatlich / 74,75 € fuer 6 Monate / 149,50 € fuer 1 Jahr (zzgl. MwSt).
- [x] Kuendigungspolitik? Entscheidung: jederzeit zum Monatsende kuendbar, pro-rata Erstattung der Restmonate auf Jahresabo.
- [x] Founder-Mechanik Mengen- oder Datums-basiert? Entscheidung: datums-basiert, kein Mengen-Limit (Transparenz statt Verknappung).
- [x] Hoehe des Founder-Discounts? Entscheidung: 30 % Public (datums-basiert) + 35-40 % via Founder-Codes (Events/Empfehlungen). Lebenslang, verfaellt bei Kuendigung.
- [ ] Konkretes Founder-Stichtag-Datum festlegen (Empfehlung: 6 Monate nach Public-Launch).
- [ ] Paddle-Implementation des Founder-Discount technisch klaeren (Subscription-Override vs. Lifetime-Coupon vs. eigener Founder-Plan-Variant).
- [ ] Conversion-Trigger im UI finalisieren: Badge, Overlay, Inline-CTA.
  - **Claude:** Empfehlung: kontextuelle CTAs an drei Stellen — (a) auf dem Blur-Overlay ab Jahr 5, (b) als Badge auf der KPI-Karte, (c) als kleiner Banner nach Trial-Ende. Keine Modals nach X Sekunden, keine Cookie-Banner-aehnlichen Overlays.
  - **Codex:** Zustimmung. Ich wuerde den CTA dort platzieren, wo der Wert konkret fehlt, nicht als pauschales Unterbrechungs-Pattern. Besonders stark ist der CTA direkt auf der Jahr-10-KPI bzw. im Chartbereich ab Jahr 5.
- [ ] Brand-Unterschied: gleiche Freemium-Logik fuer FitFlow360 und EqoFlow360, oder differenziert? Siehe [[project_brand_separation]].
  - **Claude:** Position: gleiche Freemium-Logik fuer beide Brands, aber unabhaengige Accounts pro Brand. Ein User kann in FitFlow360 Pro sein und in EqoFlow360 Free — beide Brands haben getrennte DBs, getrennte Subscriptions, getrennte Rechnungen (siehe [[project_brand_separation]]). Identische Logik reduziert Komplexitaet bei Tier-Gates, Trial-Mechanik und Code-Einloesung. Kein Cross-Brand-Trial.
  - **Codex:** Gleiche Mechanik, andere Texte. Die Paywall-Logik sollte identisch bleiben, aber die Value-Kommunikation darf pro Brand angepasst werden, weil FitFlow und EqoFlow unterschiedliche Zielbilder und Wording brauchen.
- [ ] A/B-Test sinnvoll: Jahr-4-Cap vs. Jahr-5-Cap als Free-Grenze?
  - **Claude:** Position: 4 als Default starten, A/B-Test erst sinnvoll, wenn ausreichend Conversion-Daten vorliegen (Mindestens ein paar Hundert Trial-Endings). Jahr 5 wuerde bereits einen Teil der spannenden Krummung freigeben — das Risiko, zu viel zu zeigen, ist groesser als der mutmassliche Gewinn.
  - **Codex:** Jahr 4 als Default ist richtig. A/B-Tests vor nennenswertem Traffic kosten nur Fokus. Erst messen: Trial-Starts, Trial-Endings, Upgrade-Klicks auf Blur/KPI, Paid-Conversion.
- [ ] Technisches Maximal-Limit fuer extreme Eingabewerte definieren?
  - **Codex:** Ja, aber als Missbrauchs- und UI-Schutz, nicht als Freemium-Grenze. Limits sollten so hoch liegen, dass realistische Nutzer sie nie als Produktbeschraenkung wahrnehmen.
- [ ] Konkretes Schema fuer `promo_codes`/`promo_redemptions` finalisieren?
  - **Codex:** Erst finalisieren, wenn Promo-Codes wirklich fuer Launch oder Beta gebraucht werden. Fuer v1 reichen Trial, Free und Pro; Promo kann technisch vorbereitet, aber schlank gehalten werden.

---

## 16. Naechste Schritte

1. Free-/Trial-Statusmodell in `/api/me` definieren.
2. Magic-Link-Onboarding um Passwortlos-Erklaerung und Trial-Start-Hinweis erweitern.
3. Frontend-Gates fuer Jahr 1-4, Blur ab Jahr 5 und KPI-Umschaltung implementieren.
4. Free-Szenario-Verhalten festlegen: ein aktueller Client-Zustand, keine Speicherung.
5. Trial-Wiederholungsschutz serverseitig einbauen.
6. Internes Promo-/Kulanz-Entitlement entwerfen, aber erst implementieren, wenn Codes wirklich gebraucht werden.
7. Paddle weiterhin nur fuer bezahlte Upgrades, Subscriptions und Rabatte verwenden.
8. Reminder-Plan nach Free-Implementierung separat ausarbeiten.
9. Paddle-Produkte fuer 3 Preisstufen anlegen (Monthly/6-Months/Annual), Pro-rata-Refund-Flow im Customer Portal aktivieren.
10. Pricing-Seite mit "Kein Risiko"-Kulanz-Klausel prominent kommunizieren.
11. Founder-Stichtag-Datum festlegen (pro Brand), Public-Discount-Mechanik in Paddle konfigurieren.
12. Founder-Code-Mechanik vorbereiten: Code-Pool generieren, Distribution-Plan (Events/Newsletter/Sponsor-Kit), Einloese-Flow im Checkout testen.
13. Founder-Status auf Account-Seite sichtbar machen (Statussymbol, Identitaets-Asset).
