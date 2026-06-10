# Offene Tasks und offene Ideen

**Stand:** 2026-06-10
**Status:** Ideenspeicher / Backlog. Keine fuehrende Produkt-/Architekturdoku, sondern Sammelort fuer Konzepte, die noch nicht im Code stehen, plus offene Drift gegen den Ist-Code.
**Scope:** Konsolidiert die Inhalte der frueheren Phase-7-Eintraege **F01** (Freemium-Modell), **F02** (Freemium in der App / Capability-Schicht) und **F03** (Kundenlinks und Szenario-Freigabe). Diese drei sind hier fuehrend; ihre Originaldateien und `_updated.md` bleiben als historischer Kontext erhalten.
**Quellen:** [`Freemium-Modell.md`](./Freemium-Modell.md), [`Freemium-Modell_updated.md`](./Freemium-Modell_updated.md), [`Freemium-Modell_Applikation.md`](./Freemium-Modell_Applikation.md), [`Konzept Kundenlinks und Szenario-Freigabe.md`](./Konzept%20Kundenlinks%20und%20Szenario-Freigabe.md), [`Konzept Kundenlinks und Szenario-Freigabe_updated.md`](./Konzept%20Kundenlinks%20und%20Szenario-Freigabe_updated.md).
**Pflegeregel:** Eine Idee ist hier korrekt, wenn (a) sie noch nicht produktiv im Code ist und (b) sie nicht in einem fuehrenden Architektur-/Runbook-Dokument bereits anders entschieden wurde. Bei Konflikt gilt der Code; dann wird der Eintrag hier als *abgeschlossen* oder *abgeloest durch <Master>* markiert.

## 0. Inhalt

- §1 — Freemium-Modell: Produktstrategie, Pricing, Refund, Founder, Promo (frueher F01)
- §2 — Freemium in der App: Capability-Schicht, Free-Renderer, Tests (frueher F02)
- §3 — Kundenlinks und Szenario-Freigabe: Sharing-Konzept v3 (frueher F03)

---

## 1. Idee: Freemium-Modell (frueher F01)

### 1.0 Ist-Stand im Code

Die Auth- und Trial-Infrastruktur steht, aber das Produktkonzept Free vs. Pro ist erst zur Haelfte umgesetzt.

```text
            Magic-Link Signup                      Pro-Checkout (B2B-v6.1)
            -----------------                      -----------------------
   /signup --> POST /api/auth/request-link        /checkout/{plan}.html
                       |                                    |
                       v                                    v
              Mail (Resend) -- token --> /signup?token=...  /api/billing/checkout-intent
                                                    |
                                                    v
                       /login?token=... --> POST /api/auth/verify-link
                                                    |
                                               grantTrial 14d (entitlement)
                                                    |
                                                    v
                       Pro-Webhook --> POST /api/paddle/webhook --> Pro-Entitlement (source=subscription)
                                                    |
                                                    v
                                  /api/me --> {access_level, source, billingCycle}
                                                    |
                                                    v
                                          AuthGate / Paywall / DeviceLimitGate
```

**Code-Anker:**

- [`functions/api/auth/request-link.ts`](../functions/api/auth/request-link.ts) — Magic-Link Request, Consent-Pflicht fuer Free-Signup.
- [`functions/api/auth/verify-link.ts`](../functions/api/auth/verify-link.ts) — `TRIAL_DAYS = 14`; ruft `grantTrialEntitlementIfMissing`.
- [`functions/_lib/db.ts`](../functions/_lib/db.ts) — `grantFreeEntitlementIfMissing`, `grantTrialEntitlementIfMissing`, `degradeExpiredTrial`, `grantProEntitlementIfMissing`.
- [`functions/api/me.ts`](../functions/api/me.ts) — liest Entitlement, mappt Source -> `billingCycle`.
- [`website-astro/src/brands/lifeplus/content/pricing.yaml`](../website-astro/src/brands/lifeplus/content/pricing.yaml) — Pricing-Copy und CTA-Logik.

**Statusmodell im Backend:**

| `access_level` | `source` | UI-Bedeutung |
|---|---|---|
| `pro` | `trial` | aktiver Trial; `validUntil` = Ende der 14 Tage |
| `pro` | `subscription` | aktives Pro-Abo aus Paddle |
| `free` | `free_signup` | technisch moeglich, aktuell nicht der normale Signup-Zielzustand |
| `free` | `trial_expired` | Trial gelaufen, User runter-degradiert |
| `lifetime` | `one_shot_purchase` | One-Shot/Lifetime-Zugang aus Paddle-Webhook |
| `pro` | `beta_grace` | Alt-/Admin-Freischaltung; deprecated |

`source='promo'` ist nicht aktiv.

### 1.1 Produktentscheidungen (gilt heute)

1. **Free erfordert Login.** Kein anonymer Demo-Modus. Begruendung: Account-Wiederherstellung, Trial-Status, Downgrade, Reaktivierungen brauchen Identitaet.
2. **14-Tage-Trial bei Signup**, code-konstant `TRIAL_DAYS = 14`. Aha-Moment schnell, 30 Tage verschieben Kaufentscheidung.
3. **Kein Kreditkarten-Touch fuer Trial.** Trial ist App-Entitlement, keine Paddle-Subscription mit 0 EUR.
4. **Automatisches Downgrade nach Trial-Ende.** `degradeExpiredTrial` macht aus `pro/trial` -> `free/trial_expired` beim naechsten `/api/me`-Hit.
5. **Trial soll nicht wiederholbar sein** (Produktregel; Code haertet das noch nicht — siehe §1.5 Drift).
6. **Output-Limit statt Input-Cap als Free-Hebel.** Free zeigt Jahr 1-4 scharf, Jahr 5-10 begrenzt; Inputs unbegrenzt. Ethisch: Realistic-Growth darf nicht hinter die Paywall (keine Schoenwetter-Simulation).
7. **App-Entitlement statt Paddle fuer alles Kostenlose.** Paddle = Payment Source of Truth, nicht Entitlement Source of Truth.
8. **Drei Pro-Laufzeiten (1 / 6 / 12 Monate).** 3-Monatsplan verworfen.
9. **Pricing-Kommunikation als "Gratis-Monate"**, nicht als Prozent.
10. **B2B-only Pro-Checkout** (Pivot 2026-06-02). Netto-Preise, Pflicht-Bestaetigung, kein Widerruf im Pro-Vertrag.

### 1.2 Pricing (Code-Stand, `pricing.yaml`)

| Tier | Preis netto | Kommunikation |
|---|---|---|
| `free` | 0 EUR | *"14 Tage Pro testen — danach automatisch zurueck in Free."* CTA fuehrt auf `/signup.html` (Override in `PricingPageDefault.astro`, YAML nennt `/app/`). |
| `monthly` | 14,95 EUR/Monat | *"Flexibel, monatlich kuendbar."* |
| `halfyear` | 82,23 EUR / 6 Monate (effektiv 13,71 EUR/Monat, "Halber Monat gratis") | |
| `yearly` | 149,50 EUR / 12 Monate (effektiv 12,46 EUR/Monat, "2 Monate sparen") | `featured: true`. |

Alle Pro-CTAs gehen direkt auf `/checkout/{plan}.html` (B2B-v6.1 Gast-Checkout).

### 1.3 Konzept-Detail (urspruenglich F01)

Diese Abschnitte stammen aus dem Originalkonzept (Stand 2026-05-25) und sind als Begruendungsspeicher und Backlog erhalten.

#### Statusmodell aus dem Konzept

| Status | Bedeutung | Umfang |
|---|---|---|
| **Trial** | neuer angemeldeter User innerhalb der Trial-Zeit | voller Pro-Umfang |
| **Free** | angemeldeter User ohne aktives Trial/Pro | eingeschraenkter Freemium-Umfang |
| **Pro** | zahlender User mit aktivem Abo | voller Pro-Umfang |
| **Promo** | befristeter Sonderzugang ueber internen Code | voller Pro-Umfang bis Ablauf |

#### Trial-Dauer 14 vs. 30 Tage

Entscheidung: **14 Tage**. Begruendung:

- Die App braucht keine wochenlange Datensammlung. Annahmen eingeben, Kurve sehen, Jahr-10-Wert verstehen.
- 14 Tage geben genug Zeit zum Ausprobieren, erzeugen aber noch Entscheidungsspannung.
- 30 Tage verschieben oft nur die Kaufentscheidung. Viele User testen am ersten Tag und vergessen die App.
- Free bleibt als Rueckfallnetz erhalten.

30 Tage waeren sinnvoller fuer Teams/Schulungen oder wenn Nutzungsdaten ueber mehrere Wochen gesammelt werden muessten — nicht fuer diese App.

#### Downgrade nach Trial-Ende

- Account bleibt bestehen
- Tier-Status wechselt von `trial` auf `free`
- KPI wechselt von Jahr 10 auf Jahr 4
- Chart wechselt in Free-Darstellung
- Jahr 5-10 werden begrenzt/unscharf dargestellt
- CTA: "Pro reaktivieren und volle 10-Jahres-Projektion sehen"

App hat **1 aktives Szenario** und **keine Szenario-Persistenz**. Downgrade ist reiner Tier-Switch — keine Daten-Migration, keine Read-only-Logik, kein Archiv.

#### Freier Funktionsumfang (Konzept)

| Bereich | Free | Trial / Pro |
|---|---|---|
| **Anmeldung** | erforderlich, Magic-Link per E-Mail | erforderlich, Magic-Link per E-Mail |
| **Zahlungsdaten** | keine | erst beim bezahlten Upgrade |
| **Startzustand neuer Account** | nach Trial-Ende automatisch Free | 14 Tage Trial mit vollem Pro-Umfang |
| **Inputs Member / Shopper** | unbegrenzt (Safety-Limit als Server-Guard) | unbegrenzt |
| **Sichtbare Jahre im Chart** | Jahr 1-4 scharf, Jahr 5-6 angedeutet, Jahr 7-10 blurred/locked | alle 10 Jahre scharf |
| **KPI-Karte "Provision/Jahr"** | zeigt Jahr 4 + Hinweis "Pro zeigt Jahr 10" | zeigt Jahr 10 |
| **Realistic-Growth-Modell** | aktiv, aber nur 4 Jahre auswertbar | voll ueber 10 Jahre |
| **Slider / What-if-Simulation** | live fuer Jahr 1-4 | live fuer alle Jahre |
| **Szenarien** | 1 aktuelles Szenario, keine Speicherung | spaeter optional mehrere |
| **Vergleichsmodus** | nicht verfuegbar | spaeter optional |
| **Export PDF/CSV** | aktuell nicht vorhanden | spaeter optional |

#### Output-Limit statt Input-Cap (ethische Begruendung)

**Verworfen: Input-Caps** (z. B. max. 2 Member pro Sponsor):

- User baut unrealistisch kleines Netz und schliesst daraus "lohnt sich nicht".
- USP "realistische Wachstumsmodellierung mit Year-Offset und Network-Asymmetrie" entfaltet sich erst ab Jahr 3-5.
- Eingabegrenze erzeugt Stop-Erlebnis statt Teaser.

**Gewaehlt: Output-/Zeithorizont-Limit:**

1. Jahr 1-4 voll sichtbar
2. Jahr 5-6 als Teaser sichtbar, aber ohne belastbare Detailwerte
3. Jahr 7-10 locked/blurred
4. Free-KPI zeigt Jahr 4
5. Trial/Pro-KPI zeigt Jahr 10

**Ethische Grenze:** Realistic-Growth darf **nicht** komplett hinter die Paywall geschoben werden. Free waere sonst eine Schoenwetter-Simulation; bei Vertriebssystem-Simulationen ist das ethisch und rechtlich heikel. Realistic-Growth bleibt im Free-Tier aktiv; die ersten 4 Jahre werden korrekt berechnet; die langfristige Auszahlungskurve bleibt Pro.

#### Psychologisches Design

**Verschwommener Horizont:**

- Jahr 1-4: klare Werte, volle Interaktion
- Jahr 5-6: Kurve sichtbar, halbtransparent oder anonymisierte Werte (z. B. `1•.••• EUR` oder `~12.000 EUR`)
- Jahr 7-10: stark verschwommen/locked, nur Verlauf erkennbar
- Overlay-Hint: "Sieh deinen echten Jahr-10-Wert mit Pro"

Maskierte Zahlen, die die *Groessenordnung* andeuten, aber keine belastbare Planung erlauben, sind staerker als komplette Pixelierung.

**KPI-Karten-Umschaltung:**

- Free: zentrale Provisions-Karte zeigt **Jahr 4**, Badge "Pro zeigt Jahr 10"
- Trial/Pro: zentrale Provisions-Karte zeigt **Jahr 10**

**CTA-Logik:**

- Blur-Overlay ab Jahr 5
- KPI-Karte neben "Pro zeigt Jahr 10"
- nach Trial-Ende als dezenter Hinweis im Free-Modus
- **keine** aggressiven Modals nach X Sekunden

#### Trial-/Promo-/Paddle-Grenze

**App-intern (kein Paddle):**

- initialer 14-Tage-Trial
- Trial-Ende und Downgrade
- Wiederholungsschutz (`trial_used`)
- Gutschein-/Kulanz-Zugang fuer X Tage Pro
- Free-Status

**Paddle (nur bezahlte Welt):**

- Pro-Abo monatlich/jaehrlich
- Checkout, Rechnungen, Steuern, Customer Portal
- bezahlte Upgrades, monetaere Rabatte
- nicht: kostenlose Trial-Verlaengerung, reiner Kulanzzugang

100%-Discounts in Paddle erzeugen Subscriptions mit 0 EUR und Webhook-Nebenwirkungen — App-Entitlements sind sauberer.

#### Internes Schema-Konzept (Promo-Codes, noch nicht implementiert)

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

**Promo-Code-Flow:**

1. User gibt Code im Account-Bereich ein.
2. Backend prueft: Code existiert, nicht abgelaufen, Limit nicht erreicht, User hat Code nicht schon eingeloest.
3. Backend erzeugt oder verlaengert ein `promo`-Entitlement.
4. `/api/me` liefert vollen Zugriff bis `valid_until`.
5. Nach Ablauf Faellt User auf Free zurueck, falls kein Pro-Abo aktiv.

Beispiele: Newsletter-Reaktivierung, Messe-/Flyer-Code, Sponsor-Empfehlung, Kulanz fuer Support-Fall, Beta-Tester-Zugang.

#### Pro-rata Refund auf Jahresabo (Konzept, nicht automatisiert)

**Empfehlung: Jederzeit-Kuendigung zum Monatsende mit anteiliger Erstattung der vorausbezahlten Restmonate.**

Konkret:

- User kuendigt im Monat *m* eines Jahresabos.
- Aktiver Zugang laeuft bis Ende Monat *m*.
- Erstattet werden: `(12 - m) / 12 * 149,50 EUR`.
- Erstattung an die urspruengliche Zahlungsmethode ueber Paddle.

**Beispiel:** 1-Jahr-Abo (149,50 EUR) am 01.06.2026, Kuendigung zum 30.09.2026 (4 Monate genutzt) -> Erstattung `(12 - 4) / 12 * 149,50 EUR = 99,67 EUR`. Zugang endet 30.09.2026, dann Downgrade auf Free.

**KISS-Logik:** `Refund = volle Restmonate / 12 * Jahrespreis`. Keine Partial-Month-Refunds.

**Begruendung:** Conversion-Lift + Trust-Effekt + weniger Chargebacks. Kein "defensives Churn" kurz vor Renewal.

**Quellen** (mittel belastbar; Richtung des Effekts konsistent, Groessenordnung schwankt um Faktor 2-3):

- ProfitWell-Benchmarks (Paddle nach Akquisition)
- Recurly Subscription Benchmarks
- HBS-Case-Studies (z. B. Zappos, Basecamp)
- Bain & Company Consumer Studies
- Lincoln Murphy / Tomasz Tunguz Practitioner-Blogs

**Risiken und Mitigation:**

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| Refund-Quote zu hoch (>15 %) | mittel | Frueh-Indikator fuer Produktproblem, nicht Policy-Problem. |
| Refund-Abuse | niedrig | Pro-rata bedeutet: User zahlt fuer genutzte Monate. |
| Cash-Flow-Schock durch Refund-Welle | sehr niedrig | Refunds verteilen sich statistisch ueber das Jahr. |
| Sunk-Cost-Retention-Verlust | hoch (5-15 % Umsatz) | echter Effekt, aber Zombies sind eh negativ. |
| LTV-Forecast unsicherer | mittel | bookbarer Umsatz wird ueber Refund-Wahrscheinlichkeit korrigiert. |
| Falsches Brand-Signal | mittel-niedrig | Framing: "Kein Risiko" (positiv) statt "Geld-zurueck-Garantie" (defensiv). |
| Operative Last (Refund-Processing) | sehr niedrig | Paddle automatisiert via Customer Portal. |
| B2B-Kaeufer erwarten harten Vertrag | niedrig | falls relevant: separate B2B-Tier mit klassischem Lock-in spaeter. |

**Empfehlung mit konkreten Regeln:**

1. Pro-rata-Logik: Erstattung der ungenutzten vollen Monate. Kein Partial-Month-Refund.
2. Keine Mindestlaufzeit. Auch in Monat 1 moeglich.
3. Refund-Frist: innerhalb von 7 Werktagen via Paddle, auf das urspruengliche Zahlungsmittel.
4. Framing: *"Kein Risiko. Du kannst jederzeit zum Monatsende kuendigen — die nicht genutzten Monate erstatten wir dir."* Nicht *"Geld-zurueck-Garantie"*.
5. AGB-Klausel klar und kurz. Keine Ausnahmen, keine Kleingedrucktes-Fallen.

**Monitoring-Schwellen nach Launch:**

| Metrik | Zielbereich |
|---|---|
| Refund-Rate auf Annual | < 8 % |
| 8-15 % | beobachten, Onboarding/Value pruefen |
| > 15 % | **Produktproblem**, nicht Policy |
| Annual-Mix am Signup | > 40 % |
| Trial -> Paid-Conversion | > 8 % |
| Reaktivierungs-Rate refundeter User | > 5 % innerhalb 6 Monaten |

**Paddle-Self-Service offen:** Falls Paddle den Self-Service-Refund nicht elegant kann, Policy nicht verwerfen. KISS-Kommunikation: *"Kuendige jederzeit zum Monatsende; nicht genutzte volle Monate erstatten wir dir automatisch oder auf Anfrage."*

#### Loyalty-Discount / Founder-Programm (Konzept)

**Mechanismus: Loss-Aversion + Endowment-Effect.** Staerkster Retention-Hebel im Subscription-Business ist nicht Vertragslaufzeit, sondern lebenslanger Treuerabatt, der bei Kuendigung verfaellt.

| Klassischer Lock-in | Lifetime-Loyalty-Discount |
|---|---|
| "Du musst bleiben (Vertragslaufzeit)" | "Du willst bleiben (sonst verlierst du den Rabatt)" |
| negative Emotion | positive Emotion, Rabatt als erworbenes Privileg |
| nach Vertragsende egal | waechst ueber Zeit emotional an |

**Kompatibilitaet mit Kulanz-Policy:**

| Mechanik | Wirkung |
|---|---|
| Pro-rata Refund | senkt Eintrittsbarriere — Conversion-Boost |
| Founder-Discount (lifetime) | erhoeht Ausstiegsbarriere — Retention-Boost, positiv emotional |

Es ist *leicht reinzukommen* und *emotional teuer rauszugehen* — ohne Lock-in-Tricks.

**Verworfen:** Mengen-basierte Verknappung ("erste 250 User"). Nicht verifizierbar, FOMO-Druck, inkonsistent zur Trust-Positionierung.

**Gewaehlt: Datums-basierte Founder-Periode.** Wer bis zu einem klar kommunizierten Stichtag (z. B. *31.12.2026, 23:59 Uhr*) ein bezahltes Abo abschliesst, erhaelt einen **lebenslangen Founder-Discount**, solange das Abo nicht gekuendigt wird.

**Founder-Discount-Hoehe:**

| Kanal | Rabatt | Verfuegbarkeit |
|---|---|---|
| Public Founder-Discount (datums-basiert) | 30 % | Jeder, der bis Stichtag bezahltes Abo abschliesst |
| Founder-Codes (Event/Empfehlung/Newsletter) | 35-40 % | Nur per Code, distribuiert auf Messen, Webinaren, durch Sponsoren |

Beide Stufen **lebenslang**, solange das Abo besteht. Bei Kuendigung erlischt der Rabatt unwiderruflich. Bei Ueberlapp gilt der hoehere Rabatt.

**Effektive Preise:**

| Plan | Standard (zzgl. MwSt) | mit 30 % Founder | mit 40 % Founder-Code |
|---|---|---|---|
| Monatlich | 14,95 EUR | 10,47 EUR | 8,97 EUR |
| 6 Monate | 74,75 EUR (12,46 EUR/Mo) | 52,33 EUR (8,72 EUR/Mo) | 44,85 EUR (7,48 EUR/Mo) |
| 1 Jahr | 149,50 EUR (12,46 EUR/Mo) | 104,65 EUR (8,72 EUR/Mo) | 89,70 EUR (7,48 EUR/Mo) |

**Brand-Trennung:** Founder-Programm pro Brand. Ein FitFlow360-Founder hat keinen Bonus in EqoFlow360. Siehe [[project_brand_separation]].

**Phasenplan:**

1. Phase 1 (Tag 0 bis Stichtag): Public Founder-Discount 30 %, datums-basiert (Vorschlag: 6 Monate nach Launch).
2. Phase 2 parallel: Founder-Codes 35-40 % fuer Events, Sponsor-Empfehlungen, Webinare, Newsletter.
3. Nach Stichtag: Keine vergleichbaren Lifetime-Discounts mehr. Spaetere Aktionen nur als zeitlich begrenzte Specials.

**Paddle-Optionen** (Praeferenz-Reihenfolge):

1. **Subscription-Override beim Checkout** — Subscription wird mit reduziertem Preis angelegt; Paddle bewahrt Preis ueber alle Renewals.
2. **Lifetime-Coupon** — falls Paddle einen Coupon mit "forever"-Eigenschaft unterstuetzt.
3. **Eigener Founder-Plan-Variant im Katalog** — drei zusaetzliche Produkte (Monthly/6mo/Annual Founder).

Vor finaler Kommunikation: technische Machbarkeit klaeren.

**Risiken:**

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| Permanente Margen-Erosion | hoch | Klar zeitlich begrenzen, max. 30 % Public; 40 % nur kanalisiert. |
| Discount-Shopper-Verhalten | mittel | Einmaliges Programm kommunizieren. |
| Preis-Asymmetrie zwischen Usern | mittel | Founder-Status als sichtbares Identitaets-Asset. |
| Paddle-Implementation-Unsicherheit | mittel | Drei Optionen pruefen, Auto-Renewal muss Originalpreis weiterbelasten. |
| Founder-Status nach Refund | niedrig | Wer via Refund kuendigt, verliert Status (Missbrauchsschutz). |

### 1.4 Technische Umsetzung (Konzept-Backlog)

**Gate-Punkte im Code (geplant):**

1. **Auth-Gate:** Nicht eingeloggt -> Login mit E-Mail/Magic-Link.
2. **Trial-Start:** Neuer Account erhaelt `trial` mit `valid_until = created_at + 14 Tage`.
3. **Trial-Wiederholungsschutz:** User speichert `trial_started_at` und `trial_used = true`.
4. **Entitlement-Resolver:** `/api/me` berechnet effektiven Status aus aktiver Subscription, Trial, Promo, Free-Default.
5. **Downgrade:** Trial/Promo abgelaufen und kein Pro aktiv -> `/api/me` liefert `free`.
6. **Chart-Renderer:** Jahre > `freemiumYearLimit` (= 4) mit Blur/Lock/Overlay.
7. **KPI-Karte:** Free liest Jahr 4, Trial/Pro liest Jahr 10.
8. **Slider-Bindings:** Berechnung darf intern ueber 10 Jahre laufen, sichtbare Ausgabe wird nach Tier begrenzt.
9. **Szenarien:** Free speichert keine Szenarien.
10. **Export:** kein Gate fuer v1.

**Entitlement-Prioritaet (geplant):**

1. Aktives Pro-Abo via Paddle
2. Aktives Promo-/Kulanz-Entitlement
3. Aktiver Signup-Trial
4. Free

**Edge-Cases:**

- **Pro-Cancellation mit Restlaufzeit:** Pro-Entitlement bleibt bis Ende der bezahlten Periode aktiv. Danach Free, *nicht* Promo/Trial (auch wenn parallel vorhanden).
- **Promo waehrend Pro einloesen:** erlaubt; Promo "parkt" und wird erst aktiv, wenn Pro endet. `activated_at = pro_subscription.canceled_at OR redeemed_at`, `valid_until = activated_at + days_granted`.

### 1.5 Drift gegen Code (Backlog)

| Punkt | Code-Stand | Konzept-Stand | Status |
|---|---|---|---|
| **Promo-Codes / interne Gratis-Zugaenge** | nicht implementiert (kein `source='promo'`, keine `promo_codes`/`promo_redemptions`-Tabellen) | detailliertes Konzept | Backlog; vor Go-Live nicht erforderlich |
| **Founder-Programm** | offen; Paddle-Discount-Codes unkonfiguriert | im Konzept als Marketing-Hebel beschrieben | offen, abhaengig von Marketing-Entscheidung |
| **Trial-Wiederholung** | aktuell moeglich; `grantTrialEntitlementIfMissing` ueberschreibt `free/trial_expired` zurueck zu `pro/trial` | Trial nicht wiederholbar | **Bug / Go-Live-Risiko** |
| **Pro-rata Refund** | als Wording in `pricing.yaml` angekuendigt, keine automatische Refund-API im Code | im Konzept ausfuehrlich begruendet | operative Umsetzung Go-Live-TODO |
| **Output-Limit fuer Free (Jahr 4 KPI, Jahr 5-10 blurred)** | nicht im UI-Code; `Paywall.tsx` ist Auth-/Entitlement-Gate, kein Free-Renderer | im Konzept zentraler Hebel | Pflicht-TODO, siehe §2 |
| **Free-Login-UX** | Code vorhanden, UX-Pass offen ([[feedback_free_login_ux]]) | im Konzept angerissen | offen vor Go-Live |
| **Account-/Trial-Reset (Anti-Missbrauch)** | Email als Identitaet, keine Hash-/Loesch-Strategie | Trial nicht wiederholbar | siehe [[project_account_deletion_and_antiabuse]] |
| **Reminder vor Trial-Ende** | bewusst aufgeschoben | "spaeter, nach Free-Implementierung" | offen, nach Free-UI-Cap |

### 1.6 Reminder-Plan (geplant)

Reminder werden geschrieben, sobald Free-Gates im UI stehen:

- Tag 0: Trial gestartet
- Tag 7: Halbzeit
- Tag 12: Noch 2 Tage
- Tag 14: Trial endet heute
- Tag 15: Du bist jetzt im Free-Tier

Jede Mail soll auf ein echtes fehlendes Feature zeigen, nicht generisch "Upgrade".

### 1.7 Offene Fragen (F01)

- [ ] Konkretes Founder-Stichtag-Datum festlegen (Empfehlung: 6 Monate nach Public-Launch).
- [ ] Paddle-Implementation des Founder-Discount klaeren (Subscription-Override vs. Lifetime-Coupon vs. eigener Founder-Plan-Variant).
- [ ] Conversion-Trigger im UI finalisieren: Badge auf KPI-Karte, Overlay ab Jahr 5, Inline-CTA nach Trial-Ende. Keine Modals.
- [ ] Brand-Unterschied: gleiche Freemium-Logik fuer FitFlow360 und EqoFlow360, andere Texte. Kein Cross-Brand-Trial.
- [ ] A/B-Test Jahr-4-Cap vs. Jahr-5-Cap als Free-Grenze — erst nach erstem Traffic.
- [ ] Technisches Maximal-Limit fuer extreme Eingabewerte (Missbrauchs-/UI-Schutz, nicht Freemium-Grenze).
- [ ] Konkretes Schema fuer `promo_codes`/`promo_redemptions` — erst wenn wirklich gebraucht.
- [ ] Refund-Workflow als operatives Runbook ins `paddle_checkout/`-Verzeichnis, sobald Paddle Customer Portal pro-rata abdeckt.

---

## 2. Idee: Freemium in der App / Capability-Schicht (frueher F02)

### 2.0 Ist-Stand im Code

```text
/api/me
  |
  v
useAuth.deriveStatus()
  |
  +-- loading --------------------> Spinner
  +-- anonymous + ?token ----------> LoginGate auto-verify
  +-- anonymous -------------------> RedirectToLogin
  +-- device_limit_reached --------> DeviceLimitGate
  +-- authenticated_no_entitlement -> Paywall
  +-- authenticated_active --------> Simulator-App (volle Pro-App)
  +-- authenticated_past_due ------> Simulator-App (Type existiert, nicht erzeugt)
```

**Code-Anker:**

- [`simulator-app/src/auth/useAuth.tsx`](../simulator-app/src/auth/useAuth.tsx) — `AuthProvider`, `deriveStatus(me)`.
- [`simulator-app/src/auth/api.ts`](../simulator-app/src/auth/api.ts) — `/api/me`, Magic-Link, Logout, Billing Portal, Device APIs.
- [`simulator-app/src/components/AuthGate.tsx`](../simulator-app/src/components/AuthGate.tsx) — Routing.
- [`simulator-app/src/components/LoginGate.tsx`](../simulator-app/src/components/LoginGate.tsx) — verarbeitet `?token=` und `access=free`.
- [`simulator-app/src/components/Paywall.tsx`](../simulator-app/src/components/Paywall.tsx) — Pricing-Link, Billing-Portal, Polling nach `?checkout=success`.
- [`simulator-app/src/components/DeviceLimitGate.tsx`](../simulator-app/src/components/DeviceLimitGate.tsx) — Geraeteliste mit Revoke.
- [`simulator-app/src/App.tsx`](../simulator-app/src/App.tsx) — rendert Simulator-App, speichert Eingaben bedingungslos in `localStorage`.
- [`website-astro/src/shared/components/sections/AccountPageDefault.astro`](../website-astro/src/shared/components/sections/AccountPageDefault.astro) und [`website-astro/src/shared/scripts/accountPage.ts`](../website-astro/src/shared/scripts/accountPage.ts) — Account-Seite liegt **in Astro**, nicht in der React-App.

### 2.1 Was heute wirklich umgesetzt ist

| Bereich | Ist-Stand |
|---|---|
| Login | Magic-Link-basiert; anonyme App-Nutzung wird durch `AuthGate` verhindert. |
| Free-Signup | Startet ueber Astro `/signup.html`, nicht ueber die React-App selbst. |
| Trial | Backend vergibt bei Free-Signup `pro/trial` fuer 14 Tage. |
| Trial-Ende | `/api/me` degradiert abgelaufene Trials lazy auf `free/trial_expired`. |
| Aktiver Zugang | Jeder aktive Entitlement-Eintrag rendert aktuell die volle Simulator-App. |
| Kein Entitlement / abgelaufen | `authenticated_no_entitlement` rendert `Paywall`. |
| Device Limit | `device_limit_reached` rendert `DeviceLimitGate`; Revoke kann danach refreshen. |
| Checkout-Aktivierung | Nach `post-checkout` pollt `Paywall` via `refresh()`, bis der Webhook das Pro-Entitlement setzt. |
| Account-Seite | Astro `AccountPageDefault.astro` und `accountPage.ts`, nicht React-App. |

### 2.2 Drift gegen das Produktkonzept

| Drift | Auswirkung | Empfehlung |
|---|---|---|
| **Kein Free-Renderer in der App** | Ein User mit `free/trial_expired` sieht Paywall statt eingeschraenkter App. | Produktentscheidung klaeren: Soll Free nach Trial wirklich App-Zugriff mit Limits haben? Falls ja, Capability-Schicht bauen. |
| **Kein Capability-Object** | Jahr-1-4-Limit, KPI-Jahr-4, Blur/Lock und Persistenzregeln sind nicht implementierbar ohne Streu-`if`s. | Kleine Capability-Schicht nur fuer `free` vs. `pro` einfuehren; `ent`/`ultra` nicht vorwegnehmen. |
| **`localStorage` immer aktiv** | Free-/Trial-Downgrade kann Pro-artige lokale Zustaende weiter laden. | Persistenz an Capability koppeln oder fuer Free bewusst erlauben und Produktdoku anpassen. |
| **Trial-Wiederholung backendseitig moeglich** | Produktregel "Trial nicht wiederholbar" ist nicht abgesichert. | Backend-Fix gehoert vor App-Capability-Arbeit in Go-Live-Backlog. |
| **`authenticated_past_due` ist Type, aber kein erzeugter Status** | Doku darf keine Past-Due-UX behaupten. | Entweder Status entfernen oder Backend-/Frontend-Konzept spaeter definieren. |
| **Tiers `ent`, `ultra`, `founder`, `promo` nicht aktuell** | Alte Datei liest sich groesser als das Produkt. | Aus dem Implementierungs-Backlog raushalten; erst eigenes Konzept, wenn Business-Modell steht. |

### 2.3 Wenn Free-App-Limits umgesetzt werden — Minimaler Zielzustand

```text
Backend entitlement
  |
  v
mapEntitlementToAccess()
  |
  +-- pro/trial/subscription/lifetime -> appAccess = pro
  +-- free/free_signup/trial_expired  -> appAccess = free
  +-- none/inactive                   -> no app access or Paywall
```

Erst danach sollte die App Capabilities konsumieren:

```ts
type AppAccess = 'free' | 'pro';

interface AppCapabilities {
  access: AppAccess;
  maxVisibleYear: number;
  kpiYear: number;
  canUseLocalPersistence: boolean;
  showUpgradeCta: boolean;
}
```

**Empfohlene MVP-Capabilities:**

| Capability | Free | Pro / Trial |
|---|---|---|
| `maxVisibleYear` | 4 | 10 |
| `kpiYear` | 4 | 10 |
| `canUseLocalPersistence` | offen: `false` oder `session` | `true` |
| `showUpgradeCta` | `true` | `false` |
| Inputs | unveraendert | unveraendert |
| Reality-Strategien | unveraendert | unveraendert |

Wichtig: Trial wird produktfachlich wie Pro behandelt, solange aktiv.

### 2.4 Betroffene Komponenten bei spaeterer Umsetzung

| Bereich | Datei | Arbeit |
|---|---|---|
| Access-Mapping | `simulator-app/src/auth/useAuth.tsx` oder neues kleines Modul | `me.entitlements[0]` in `AppAccess`/Capabilities uebersetzen. |
| App-Shell | `simulator-app/src/App.tsx` | Persistenz und angezeigtes Jahr an Capability koppeln. |
| Hero-Zahl | `simulator-app/src/components/HeroNumber.tsx` | Jahr 4 statt Jahr 10 fuer Free anzeigen. |
| Chart | `simulator-app/src/components/ProvisionChart.tsx` | Jahre nach `maxVisibleYear` maskieren/blurred darstellen. |
| Tabelle | `simulator-app/src/components/YearlySummaryTable.tsx` | spaetere Jahre begrenzen oder CTA-Zeilen zeigen. |
| Visualisierungen | `NetworkVisualizations`, `PersonTreeVisualizations`, `LineageView` | pruefen, ob Free nur Jahr 1-4 oder eingeschraenkte Views bekommt. |
| Settings/Goals | `SettingsDrawer`, `GoalsLadderPanel` | nur begrenzen, wenn Produktentscheidung das verlangt. |
| Upgrade CTA | neue kleine Komponente oder bestehende CTA-Patterns | kontextuell an fehlender Jahr-10-Antwort platzieren. |

**Nicht zuerst bauen:** `ent`, `ultra`, Team-Features, Founder-Badges, Promo-Badges.

### 2.5 Tests und Akzeptanzkriterien

| Fall | Erwartung |
|---|---|
| Aktiver Trial | rendert volle Pro-App. |
| Aktive Subscription | rendert volle Pro-App. |
| Abgelaufener Trial, falls Free-App beschlossen | rendert App mit Free-Capabilities, nicht Paywall. |
| Abgelaufener Trial, falls kein Free-App-Zugriff beschlossen | rendert Paywall; Produktdoku muss das so sagen. |
| Pro-User nach Capability-Einfuehrung | Jahr-10-KPI, Chart, Visualisierungen und Persistenz bleiben unveraendert. |
| Free-User | Jahr 1-4 sichtbar, Jahr 5-10 begrenzt, Upgrade-CTA sichtbar. |
| Lokaler Pro-State + Free-Zugang | Free darf keine unlimitierte Pro-Ansicht aus `localStorage` wiederherstellen. |

### 2.6 Offene Entscheidungen (F02)

1. Soll `free/trial_expired` die App eingeschraenkt rendern oder weiter Paywall zeigen?
2. Wird `free/free_signup` als dauerhafter Free-Zugang aktiv gebraucht, oder bleibt Free in v1 nur "Trial plus Paywall danach"?
3. Soll Free lokale Persistenz komplett deaktivieren, auf Session begrenzen oder wie Pro erlauben?
4. Wird die Trial-Wiederholung zuerst im Backend gesperrt? (Vermutlich ja, vor App-Capability-Arbeit.)
5. Soll der Free-Capability-Plan ein eigenes Umsetzungs-Ticket/ADR bekommen, sobald er gebaut wird?

### 2.7 Verworfener Konzept-Ueberhang

Die geloeschte Langfassung des Implementierungskonzepts enthielt einen ausfuehrlichen Vorschlag fuer:

- `Tier = free | pro | ent | ultra`
- `featureFlags.ts`, `useFeatures()`
- `maxVisibleYear`, `yearBlurStart`, `yearLockStart`
- Trial-/Promo-/Founder-Badges
- Ent-/Ultra-Team-Features

Das ist **nicht** der aktuelle Codezustand und nicht als freigegebener Implementierungsplan zu lesen. Falls Free-App-Limits gebaut werden, sollte nur der kleine Free/Pro-Capability-Kern aus §2.3 neu aufgegriffen werden.

---

## 3. Idee: Kundenlinks und Szenario-Freigabe (frueher F03)

### 3.0 Ist-Stand im Code

**Im Code existiert dieser Flow nicht.** Eine `rg`-Suche ueber `functions/`, `migrations/`, `simulator-app/`, `packages/`, `website-astro/` und die Go-Live-Doku findet nur verwandte Marketing- oder Infrastrukturtexte, aber keine Implementierung.

**Nicht vorhanden:**

- Keine API-Endpunkte wie `/api/shares/*`, `/api/share`, `/api/scenario` oder `/r/m/...`.
- Keine Datenbanktabellen `shared_scenarios`, `shares`, `share_events`, `member_link_clicks` oder aequivalent in `migrations/0001` bis `0009`.
- Keine Sponsor-Profilfelder an `users` und keine `sponsor_profiles`-Tabelle.
- Keine Turnstile-Integration in `functions/`, `simulator-app/` oder `website-astro/`.
- Keine Share-/Copy-UI in der React-App.
- Keine oeffentliche Viewer-Route fuer gespeicherte Szenarien.

**Vorhandene Bausteine, an die ein spaeterer Bau andocken kann:**

| Baustein | Relevanz |
|---|---|
| `functions/_lib/session.ts` | Session-/Device-Kontext fuer authentifizierte Share-Ersteller. |
| `functions/_lib/db.ts` | Entitlement-Ermittlung und bestehende D1-Helfer. |
| `functions/_lib/crypto.ts` | `randomId`, Tokens, Hashing; Roh-Share-Tokens sollten nicht im Klartext gespeichert werden. |
| `functions/_lib/rate-limit.ts` | Vorbild fuer IP-/User-Limits auf Create, View und Redirect. |
| `functions/api/me.ts` und `simulator-app/src/auth/useAuth.tsx` | Aktuelles Auth-/Entitlement-Modell; Viewer muss davon bewusst getrennt bleiben. |
| `website-astro/src/brands/*/brand.yaml` | Brand-Domain, Produktname und spaetere Brand-spezifische Allowlist-Konfiguration. |
| `go-live/go-live-content-legal-checklist.md` | Rate-Limits, Datenschutz, Anti-Abuse und Go-Live-Gates. |

### 3.1 Master-Entscheidungen fuer einen spaeteren Bau

Diese Entscheidungen gelten als Konzeptbasis, solange sie nicht durch einen ADR ersetzt werden:

1. **Kein serverseitiger Versand im MVP.** Die App generiert Share-Link und optional eine `mailto:`-Vorlage. Der Berater verschickt selbst per E-Mail, Messenger oder CRM. Dadurch werden keine Empfaenger-PII gespeichert. Resend-Reputation und DSGVO-Aufwand bleiben klein.
2. **Share-Erstellung nur fuer berechtigte Nutzer.** Mindestregel vor Umsetzung festlegen: wahrscheinlich aktive Pro-Berechtigung; Trial-Nutzer nur, wenn Produkt das explizit will.
3. **Viewer bleibt anonym.** Ein Interessent braucht keinen Login, keine App-Session und belegt kein Device-Limit. Viewer-Zugriffe werden nur technisch/rate-limit-bezogen verarbeitet.
4. **Sponsor-Profil als Paar.** `sponsor_display_name` und `member_link` sind beide gefuellt oder beide leer. Bei leerem Paar: CTA komplett ausblenden, kein Fallback-Text.
5. **V1-Viewer read-only.** Interessent kann Werte nicht aendern. Editierbare Kopie oder "mit eigenen Zahlen ausprobieren" ist V2 und braucht ein eigenes Missbrauchs-/Conversion-Konzept.
6. **Member-Link-Snapshot.** Der Member-Link wird beim Erstellen des Shares eingefroren; spaetere Profil-Aenderungen gelten nur fuer neue Shares. Verhindert, dass ein alter Kundenlink ploetzlich auf ein anderes Sponsor-Ziel zeigt.
7. **Member-Link-Redirect ueber eigene Brand-URL.** Beispiel: `/r/m/:shareId`. Erlaubt Click-Tracking, Revocation und eine vertrauenswuerdige Domain statt direkter Fremdlinks.
8. **Turnstile oder gleichwertiger Bot-Schutz vor Viewer und Redirect.** Link-Preview-Bots duerfen keine echten Opens oder Member-Link-Klicks erzeugen.
9. **Rate-Limit als Startwert:** 5 neue Shares pro Sponsor und Tag, plus IP-Limits fuer View/Redirect. Werte muessen vor Go-Live anhand Traffic und Missbrauchsrisiko finalisiert werden.
10. **Aktive-Shares-Liste ist V2.** Daten ab Tag 1 speichern (`open_count`, `member_link_click_count`), Darstellung im Account-Bereich kommt nach dem MVP.

### 3.2 Bewertete Luecken und Schwachstellen

| Thema | Bewertung | Korrektur / Frage |
|---|---|---|
| Serverversand per Resend | Fuer MVP zu schwer: Empfaenger-PII, Bounce-Handling, Spam-Risiko. | Nur Clipboard + `mailto:`. Resend bleibt fuer User-Login. |
| Live-Member-Link in alten Shares | Produktlich riskant: alter Interessent kann auf spaeter geaendertes Ziel laufen. | Snapshot im Share speichern. |
| Komplett read-only vs. "paar Werte aendern" | Read-only widerspricht Ursprungwunsch teilweise, ist aber als V1 sauberer. | Als bewusste MVP-Abgrenzung dokumentieren. |
| Kein Empfaengerkontakt in DB | DSGVO-stark, aber Support/Follow-up schwach. | `recipient_hint` nur als freie Notiz; spaeter optional echte Kontakte mit Consent. |
| Sponsor-Name vor Turnstile sichtbar | Leakt minimal personenbezogene Daten an Link-Preview-Bots. | Akzeptabel, wenn User Namen aktiv freigibt; in Datenschutzhinweis nennen. |
| Device-Fingerprint | Datenschutzrechtlich sensibel und technisch unzuverlaessig. | Nur Hash, kurze TTL, keine IP-Speicherung; Alternative: Cookie-only Limit. |
| Turnstile vor `/r/m/` | Schuetzt Statistik, kann Conversion-Reibung erzeugen. | Splash sehr schlank halten; bei niedriger Bot-Last spaeter lockern. |
| 5 Shares/Tag | Koennte echte Power-User ausbremsen. | Startwert ok; Admin-Override oder Pro-Staffel spaeter pruefen. |
| `member_link_snapshot` Korrektur | Im Konzept "aenderbar machen" erwaehnt, aber kein Endpoint definiert. | V1: keine Snapshot-Korrektur, nur widerrufen und neu teilen. |
| Tabellenloeschung nach Ablauf | Cron geloescht nach `expires_at + 7 Tage`, aber Analytics gehen verloren. | Vor Loeschung aggregieren oder bewusst akzeptieren. |
| Allowlist hardcoded | Gut gegen Drift, aber LifePlus/Eqology-Linkvarianten koennen wechseln. | Vor Umsetzung echte Signup-Domains sammeln; Env-Override fuer Staging behalten. |

### 3.3 Versionshistorie (Konzept)

- **v1:** erster Wurf mit serverseitigem Mail-Versand und freier Provider-Auswahl (WhatsApp/Telegram).
- **v2:** Versand-Architektur stark vereinfacht — Clipboard + `mailto:` statt API-Versand. UC-5 (Provider-Integration) entfaellt.
- **v3:** CTA-Text personalisiert mit Sponsor-Name, Cloudflare Turnstile als Bot-Schutz, Member-Link-Allowlist, 3-Wege-Copy-Buttons.
- **v3 (Merge):** Konsolidierung beider Parallel-Entwuerfe; Sponsor-Profil als Paar bestaetigt; Splash-Page mit Sponsor-Name + Brand-Logo entschieden.

### 3.4 Zielbild

Ein angemeldeter LifePlus-User soll seinen persoenlichen **Member-Link** in der App hinterlegen. Wenn er mit einem Interessenten ein passendes Szenario besprochen hat, kann er genau dieses Szenario als zeitlich begrenzten **Kundenlink** erstellen und selbst versenden.

Der Interessent oeffnet den Link ohne Passwort, sieht das freigegebene Szenario fuer eine Woche und findet im Szenario prominent den Sponsor-CTA des Users, sofern dieser Sponsor-Name und Member-Link hinterlegt hat. So kann er direkt ueber den richtigen Empfehlungslink einen Account bei LifePlus eroeffnen.

Wichtig: Der Kundenlink ist **kein Pro-Account** und kein allgemeiner App-Zugang. Er ist eine kontrollierte, befristete Szenario-Ansicht.

```text
┌─────────────┐  Szenario       ┌──────────────┐  Snapshot   ┌─────────────────┐
│   Berater   │ ──────────────▶ │   Backend    │ ──────────▶ │ shared_scenarios │
└─────────────┘                 └──────────────┘             └─────────────────┘
                                                                       │
                                                                       │ /s/<id> (Turnstile)
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │  Interessent    │
                                                              │  (anonym)       │
                                                              └─────────────────┘
                                                                       │
                                                                 /r/m/<id>
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │  Member-Link    │
                                                              │  (Brand-Signup) │
                                                              └─────────────────┘
```

### 3.5 Architekturvorschlag

#### Datenmodell (Migration `00XX_shared_scenarios.sql`)

| Tabelle / Feld | Zweck |
|---|---|
| `shared_scenarios` | Ein Share pro gespeichertes Szenario. |
| `id` | Opaque Share-ID fuer URL, nicht erratbar. |
| `creator_user_id`, `brand_id` | Besitzer und Brand-Trennung. |
| `scenario_json` | Minimaler, validierter Snapshot der Simulator-Eingaben und Ergebnisdaten; keine Sessiondaten. |
| `sponsor_display_name_snapshot` | Optionaler Anzeigename zum Erstellzeitpunkt. |
| `member_link_snapshot` | Optionaler Member-/Affiliate-Link zum Erstellzeitpunkt. |
| `token_hash` | Optional, falls zusaetzlich zu `id` ein Token genutzt wird; Roh-Token nicht speichern. |
| `expires_at`, `revoked_at`, `created_at`, `updated_at` | TTL, Revocation und Audit. |
| `open_count`, `member_link_click_count` | Aggregierte Zaehler fuer V2-Account-UI. |

Optional besser als neue Spalten an `users`:

| Tabelle | Zweck |
|---|---|
| `sponsor_profiles` | Brand-spezifische Sponsor-Anzeige und Member-Link je Nutzer. Vermeidet Vermischung mit Auth-User-Daten und erleichtert Account-Loeschung. |

#### API-Endpunkte (Cloudflare Pages Functions)

| Endpoint | Auth | Zweck |
|---|---|---|
| `POST /api/shares/create` | Session + aktives Entitlement | Szenario validieren, Sponsorprofil snapshotten, Share erstellen. |
| `GET /api/shares/view?id=...` | anonym + Bot-Schutz | Viewer-Daten fuer oeffentliche Seite liefern. |
| `POST /api/shares/revoke` | Besitzer-Session | Share widerrufen. |
| `GET /r/m/:shareId` oder `GET /api/shares/member-redirect?id=...` | anonym + Bot-Schutz | Click zaehlen und auf Member-Link weiterleiten. |

Wichtig: Die Viewer-API darf nicht `loadSessionFromToken` voraussetzen und darf keine Entitlements erzeugen oder aendern.

#### Frontend-Routen

| Bereich | Vorschlag |
|---|---|
| React-App | Neue Share-Aktion nahe Szenario/Export, z. B. `simulator-app/src/components/share/*`. |
| Oeffentlicher Viewer | Astro-Route wie `/s/[id]` oder `/r/s/[id]`, die clientseitig `GET /api/shares/view` aufruft. |
| Sponsor-Profil | Besser im Account-Bereich der Astro-Site oder in einer kleinen Pro-Einstellung, nicht als versteckte Simulator-App-Konfiguration. |

Eine statisch gerenderte Astro-Seite ohne API-Resolve ist fuer dieses Feature ungeeignet, weil Share-Status, TTL, Revocation, Turnstile und Zaehler zur Laufzeit geprueft werden muessen.

### 3.6 Datenschutz, Sicherheit, Missbrauchsschutz

**Pflichtpunkte vor Implementierung:**

- **Datenminimierung:** Keine Empfaenger-E-Mail, kein Empfaengername, keine Freitextnotizen im MVP speichern.
- **Sponsor-Daten:** Anzeigename und Member-Link in Datenschutzhinweisen erwaehnen; Member-Link-Domain per Allowlist pruefen.
- **Account-Loeschung:** Beim Loeschen eines Accounts alle aktiven Shares revoken oder anonymisieren; Entscheidung vor Migration festhalten. Siehe [[project_account_deletion_and_antiabuse]].
- **TTL:** Standard-Laufzeit festlegen, z. B. 14 oder 30 Tage. Unbegrenzte Shares sind fuer ein MVP zu riskant.
- **Bot-Schutz:** Turnstile oder gleichwertige serverseitige Pruefung fuer Viewer und Redirect; Preis/Quota vor Go-Live verifizieren. Cloudflare bewirbt Turnstile Managed als kostenlos fuer unbegrenzte Nutzung, sollte aber vor Launch in der aktuellen Preisliste verifiziert werden.
- **Rate-Limits:** User-Limit fuer Create, IP-Limit fuer View/Redirect, Brute-Force-Schutz fuer Share-IDs.
- **Tracking:** Nur aggregierte Zaehler im MVP. Keine personenbezogene Besucherhistorie ohne neue Rechtsgrundlage.
- **Brand-Trennung:** `brand_id` in jeder Query hart filtern; Member-Link-Allowlist pro Brand.

### 3.7 Offene Entscheidungen vor Umsetzung (F03)

| Frage | Empfehlung fuer MVP |
|---|---|
| Prioritaet vor Go-Live? | Nein. Pro-Checkout, Rechtstexte, Account und Entitlements bleiben wichtiger. |
| Wer darf Shares erstellen? | Pro aktiv; Trial nur nach expliziter Produktentscheidung. |
| Standard-TTL? | 14 oder 30 Tage; kein unbegrenzt. |
| Viewer editierbar? | Nein, read-only. |
| Sponsor-Profil wo pflegen? | Account-Bereich oder Pro-Einstellung, nicht in Marketing-YAML. |
| Member-Link-Allowlist? | Env-/Brand-Konfiguration, vor Launch mit echten LifePlus/FitLine/Eqology-Domains pruefen. |
| ADR noetig? | Ja, vor Implementierung. Dieses Dokument ist Konzeptbasis, kein finaler Architekturentscheid. |

---

## 4. Bug-Tickets (aus Phase-7-Updated-Reviews)

Diese Bugs wurden waehrend Phase 7 in den `*_updated.md`-Dokumenten als reale Code-Drift identifiziert. Sie sind hier zentral gesammelt, damit sie nicht in den Updated-Dokumenten versanden.

| ID | Quelle | Schweregrad | Datei / Code | Befund | Vorschlag |
|---|---|---|---|---|---|
| **BUG-01** | F01 Freemium-Modell §4 | Hoch (Go-Live-Risiko) | `functions/_lib/db.ts` `grantTrialEntitlementIfMissing` | Trial ist wiederholbar: ueberschreibt bestehende non-paid Entitlements; ein User mit `free/trial_expired` kann nach erneutem Free-Signup wieder `pro/trial` bekommen. Widerspricht Produktregel. | Pruefung in `grantTrialEntitlementIfMissing`: wenn bereits ein Entitlement mit `source IN ('trial', 'trial_expired')` existiert, kein neuer Grant. Alternativ: Spalte `users.trial_used` plus Migration; harte Sperre. |
| **BUG-02** | F07 Rank-Badges §9 | Hoch | `simulator-app/src/components/lineage/rankStats.ts` vs. `packages/product-lifeplus/src/constants.ts` | AV-Drift zwischen UI-Hilfsdaten und Engine: `rankStats.ts` nutzt AV 45 fuer Believer/Builder, `constants.ts` (Engine) nutzt AV 40. Tooltip und Engine-Entscheidung sind damit inkonsistent. | Klaeren, ob `rankStats.ts` fachlich sein soll. Falls ja: Believer/Builder auf AV 40 korrigieren oder aus Engine-Konstanten ableiten. |
| **BUG-03** | F07 Rank-Badges §8.1 | Mittel | `simulator-app/src/components/lineage/rankStats.ts` `rankLabel()` | `Diamond`-Label hat fuehrendes Leerzeichen, weil `rank.replace('Diamond', ' Diamant')` global ersetzt. Beispiel: `Diamond` -> ` Diamant`, `3*Diamond` -> `3* Diamant`. | `rankLabel()` explizit mapping statt globaler `replace`: `Diamond` -> `Diamant`, `n*Diamond` -> `n* Diamant`. Danach Beispiele und Screens pruefen. |

### Anwendung

- Diese Eintraege sind die fuehrende Quelle. Beim Beheben: hier auf *erledigt am YYYY-MM-DD* setzen und Code-Commit referenzieren.
- Neue Bug-Befunde aus weiteren Updated-Pass-Reviews kommen hier rein, nicht in die Updated-Dokumente selbst.

## 5. Nachpflege

- Beim Bau einer der drei Ideen: ADR oder fuehrendes Architekturdokument anlegen, dann Eintrag hier auf *abgeloest durch <Master>* setzen.
- Beim Verwerfen einer Idee: Eintrag hier auf *verworfen* setzen mit Datum und Begruendung. Nicht ersatzlos loeschen.
- Bei Drift zwischen Code und Konzept (siehe §1.5): Code gewinnt; betroffene Punkte hier aktualisieren.

## 5. Verwandte Dokumente

- [`Konzept Paddle-Integration und App-Architektur_updated.md`](./Konzept%20Paddle-Integration%20und%20App-Architektur_updated.md) — Architektur-Master fuer Auth, Webhook, Entitlements.
- [`paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](./paddle_checkout/checkout-billing-runbook-b2b-v6-1.md) — operatives Checkout-/Billing-Runbook.
- [`paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md`](./paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md) — rechtlicher Pivot B2B-only.
- [`go-live/go-live-content-legal-checklist.md`](./go-live/go-live-content-legal-checklist.md) — Go-Live-Pflichtcheckliste.
- [`Webcontent & Value Proposition_updated.md`](./Webcontent%20%26%20Value%20Proposition_updated.md) — Marketing-Wording-Master.
- [`reviews/2026-06-10-phase-7-review.md`](./reviews/2026-06-10-phase-7-review.md) — Phase-7-Abschluss-Review (Mapping je F-ID).
