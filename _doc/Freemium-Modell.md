# Freemium-Modell - fuehrende Produktstrategie

**Stand:** 2026-06-10
**Status:** fuehrend fuer Produktstrategie Free/Trial/Pro (Pilot Phase 7 Update Leading Documents); Backlog-Inhalte und detaillierte Konzept-Optionen in [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §1.
**Scope:** Produktentscheidungen fuer Free / Trial / Pro inkl. Pricing und Kuendigungspolitik. Technische Checkout- und Webhook-Details siehe [`paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](./paddle_checkout/checkout-billing-runbook-b2b-v6-1.md). Capability-/UI-Umsetzung im App-Code siehe [`Freemium-Modell_Applikation.md`](./Freemium-Modell_Applikation.md).
**Vorgaenger:** Alter Konzeptstand 2026-05-25 wurde am 2026-06-10 in diese Datei konsolidiert; der historische Konzeptstand ist im Anhang dieser Datei zusammengefasst, der Volltext liegt in der Git-Historie.
**Backlog / Offene Ideen:** [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §1 — dort sind Promo-Code-Schema, Founder-Programm, Refund-Mechanik, Reminder-Plan und Drift gegen Code vollstaendig konsolidiert.

## 0. Kritisches Review dieses Updates

Diese Fassung ist als fuehrender Produktstand brauchbar, hatte aber vier harte Fehler, die hier korrigiert sind:

1. **Free-CTA falsch beschrieben:** `pricing.yaml` nennt zwar `url: "/app/"`, aber `PricingPageDefault.astro` mappt den Free-Tier absichtlich auf `/signup.html`. Der aktuelle Free-Einstieg ist also Signup, nicht direkter App-Start.
2. **Free-Entitlement falsch eingeordnet:** Der aktuelle Signup-Flow vergibt zuerst `pro/trial`. Ein dauerhaftes `free/free_signup` wird im normalen Signup-Pfad nicht erzeugt; `grantFreeEntitlementIfMissing` ist aktuell ein vorhandener Helper, aber kein aktiver Signup-Schritt.
3. **Trial-"nicht wiederholbar" war zu sicher:** `grantTrialEntitlementIfMissing` ueberschreibt bestehende nicht-bezahlte Entitlements. Ein User mit `free/trial_expired` kann nach aktuellem Code erneut einen Trial bekommen. Das widerspricht der Produktentscheidung und ist als Bug/Go-Live-Risiko markiert.
4. **Refund-/Kuendigungslogik war zu operativ formuliert:** Das Wording steht in `pricing.yaml`, aber die tatsaechliche pro-rata-Erstattung ist im Code nicht als automatische Refund-Logik belegt. Sie bleibt eine operative/Legal-Go-Live-Frage.

## 1. Was heute im Code lebt

Die produktive Implementierung steht; die folgenden Anker beschreiben den Ist-Stand.

```text
            Magic-Link Signup                      Pro-Checkout (B2B, v6.1)
            -----------------                      -------------------------
   /signup --> POST /api/auth/request-link        /checkout/{plan}.html
                       |                                    |
                       v                                    v
              Mail (Resend) -- token -----> /signup?token=... /checkout-intent
                                                    |
                                                    v
                       /login?token=... --> POST /api/auth/verify-link
                                                    |
                                               grantTrial 14d
                                               (entitlement)
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

### Auth- und Trial-Pfad

- Signup ueber Astro `pages/signup.astro` plus `shared/scripts/signupInline.ts`. Body sendet `access: 'free'` plus Consent (`agb`, `privacy`, optional `newsletter`).
- `functions/api/auth/request-link.ts` validiert Consent und legt Magic-Link an. `NEXT_URL_RX` erlaubt nur Pro-Checkout-Pfade als `next` (`/checkout/{plan}.html`).
- `functions/api/auth/verify-link.ts` mit `TRIAL_DAYS = 14`: bei `access_intent='free'` ruft `grantTrialEntitlementIfMissing(env, user.id, env.BRAND_ID, now, 14, randomId)` und schreibt einen Eintrag in `consent_log` (Kontext `free_signup`).
- `functions/_lib/db.ts` haelt die Entitlement-Logik:
  - `grantFreeEntitlementIfMissing` setzt `access_level='free'`, `source='free_signup'`, `valid_until=NULL`, wird im aktuellen Signup-Pfad aber nicht aufgerufen.
  - `grantTrialEntitlementIfMissing` setzt `access_level='pro'`, `source='trial'`, `valid_until = now + 14*86_400_000`.
  - `degradeExpiredTrial` setzt abgelaufene Trial-Eintraege auf `access_level='free'`, `source='trial_expired'`, `valid_until=NULL` (idempotent, race-sicher).
  - `grantProEntitlementIfMissing` erzeugt nur noch `source='beta_grace'` fuer Alt-/Admin-Faelle; bezahlte Zugriffe werden im Paddle-Webhook ueber dessen eigene Entitlement-Logik geschrieben.

### Statusmodell im Backend

`/api/me` (`functions/api/me.ts`) liefert pro Brand ein Entitlement-Objekt mit Feldern `plan` (= `access_level`), `active`, `validUntil`, `source` und `billingCycle`. Quelle der Wahrheit ist die D1-Tabelle `entitlements`; Status ergibt sich aus der Kombination `access_level` x `source`:

| `access_level` | `source` | UI-Bedeutung |
|---|---|---|
| `pro` | `trial` | aktiver Trial; `validUntil` = Ende der 14 Tage |
| `pro` | `subscription` | aktives Pro-Abo aus Paddle |
| `free` | `free_signup` | technisch moeglicher Free-Zugang, aktuell nicht der normale Signup-Zielzustand |
| `free` | `trial_expired` | Trial ist gelaufen, User ist runter-degradiert |
| `lifetime` | `one_shot_purchase` | One-Shot/Lifetime-Zugang aus Paddle-Webhook |
| `pro` | `beta_grace` | Alt-/Admin-Freischaltung; laut Code-Kommentar deprecated |

`source='promo'` / Promo-Codes sind im aktuellen Schema nicht aktiviert; siehe Abschnitt 4.

### Statusmodell im Frontend

`simulator-app/src/auth/useAuth.tsx` (`deriveStatus`) faltet `/api/me` praktisch in fuenf gerenderte Werte. Der Type enthaelt zusaetzlich `authenticated_past_due`, dieser Status wird aktuell aber nicht zurueckgegeben:

| `AuthStatus` | Trigger |
|---|---|
| `loading` | `/api/me` noch nicht beantwortet |
| `anonymous` | `me.authenticated === false` |
| `device_limit_reached` | `me.sessionKind === 'device_limit_reached'` |
| `authenticated_no_entitlement` | kein Entitlement oder `entitlement.active === false` |
| `authenticated_active` | Entitlement aktiv (Trial oder Pro) |

`AuthGate.tsx` mapt diese Stati auf Gates: `LoginGate`, `DeviceLimitGate`, `Paywall`, sonst Kinderkomponenten (= App selbst).

### Pricing und CTA

`website-astro/src/brands/lifeplus/content/pricing.yaml` ist Content-Quelle fuer die Pricing-Tabelle; `PricingPageDefault.astro` interpretiert die CTAs. Vier Tiers:

| Tier | Preis netto | Kommunikation |
|---|---|---|
| `free` | 0 EUR | *"14 Tage Pro testen - danach automatisch zurueck in Free."* YAML nennt `/app/`, gerendert wird aktuell `/signup.html`. |
| `monthly` | 14,95 EUR/Monat | *"Flexibel, monatlich kuendbar."* CTA `paddle` (Plan `monthly`). |
| `halfyear` | 82,23 EUR / 6 Monate (effektiv 13,71 EUR/Monat, "Halber Monat gratis") | CTA `paddle` (Plan `halfyear`). |
| `yearly` | 149,50 EUR / 12 Monate (effektiv 12,46 EUR/Monat, "2 Monate sparen") | `featured: true`. CTA `paddle` (Plan `yearly`). |

Alle Pro-CTAs gehen direkt auf `/checkout/{plan}.html` (B2B-v6.1 Gast-Checkout, kein Magic-Link-Detour vor dem Kauf). Free-CTA fuehrt aktuell auf `/signup.html`; der Trial startet nach Magic-Link-Verify.

### B2B-only-Pivot

Der Pro-Checkout ist seit 2026-06-02 als B2B-only positioniert (siehe `_doc/paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md`):

- Pflichtfelder Firma, Strasse, PLZ, Ort, Land. USt-IdNr optional fuer Reverse-Charge.
- Pflicht-Bestaetigung "B2B-Nutzung" im Checkout (Soft-Approach: informieren, nicht ausschliessen).
- Netto-Preise auf Pricing und Checkout.
- Widerrufsbelehrung im Pro-Bereich entfaellt (B2B); Free als Verbraucher-Vertrag behaelt sie.

## 2. Was an Produktentscheidungen unveraendert gilt

Aus dem urspruenglichen Konzept bleibt produktiv tragend:

1. **Free erfordert Login.** Kein anonymer Demo-Modus. Begruendung: Account-Wiederherstellung, Trial-Status, Downgrade, Reaktivierungen brauchen Identitaet. Mitigation der Bounce-Rate-Diskussion liegt auf der Marketing-Microsite (Wow-Moment **vor** der E-Mail-Eingabe).
2. **14-Tage-Trial bei Signup.** Code-konstant `TRIAL_DAYS = 14`. Begruendung: Aha-Moment entsteht schnell; 30 Tage verschieben Kaufentscheidung.
3. **Kein Kreditkarten-Touch fuer Trial.** Trial ist ein App-Entitlement, kein Paddle-Subscription mit 0 EUR.
4. **Automatisches Downgrade nach Trial-Ende.** `degradeExpiredTrial` macht aus `pro/trial` -> `free/trial_expired` beim naechsten `/api/me`-Hit. Idempotent.
5. **Trial soll produktfachlich nicht wiederholbar sein.** Achtung: Der aktuelle Code setzt das noch nicht sauber durch. `grantTrialEntitlementIfMissing` ueberschreibt bestehende nicht-bezahlte Entitlements und kann `free/trial_expired` wieder auf `pro/trial` setzen.
6. **Output-Limit statt Input-Cap als Free-Hebel.** Free zeigt Jahr 1-4 scharf, Jahr 5-10 begrenzt; Inputs (`membersPerYear`, `shoppersPerYear`, ...) bleiben unbegrenzt. Ethische Begruendung: Realistic-Growth darf nicht hinter die Paywall geschoben werden, sonst entstehen Schoenwetter-Erwartungen. Wahrheit darf im Free-Tier nicht weichgezeichnet werden; siehe `feedback_network_single_source`.
7. **App-Entitlement statt Paddle fuer alles, was nichts kostet.** Free, Trial, spaeter Promo/Founder werden im eigenen Backend gefuehrt. Paddle ist Payment Source of Truth, nicht Entitlement Source of Truth.
8. **Drei Pro-Laufzeiten (1 / 6 / 12 Monate).** 3-Monatsplan wurde bewusst verworfen, weil er nach Trial keine klare Rolle hat.
9. **Pricing-Kommunikation als "Gratis-Monate"**, nicht als Prozent. Belohnt Plan-Wechsel visuell und ist schwerer mit Wettbewerbern direkt vergleichbar.
10. **B2B-only Pro-Checkout** (Pivot 2026-06-02). Netto-Preise, Pflicht-Bestaetigung, kein Widerruf im Pro-Vertrag.

## 3. Trade-offs explizit

- **Login-Pflicht bei Free** vs. Bounce-Rate auf der Anmelde-Seite. Bewusst akzeptiert; gegensteuert ueber Microsite-Hero und "kein Passwort"-Framing in [`website-astro/src/shared/components/sections/SignupPage.astro`](../website-astro/src/shared/components/sections/SignupPage.astro).
- **14 statt 30 Tage Trial**: schnellere Kaufentscheidung, dafuer weniger Nutzungstiefe pro User. Re-Engagement laeuft ueber Reminder erst nach Free-Implementierung.
- **B2B-only**: spitzere Zielgruppe (Selbststaendige), aber Verbraucher als Kaeufer werden weicher abgewiesen, nicht ausgeschlossen. Begruendung im Legal-Review (Soft-Approach, BGH-Konformitaet zu klaeren).
- **Preisstaffel 6 und 12 Monate:** Die alte Konzept-Diskussion (siehe Anhang) hatte mehrere Varianten. Produktiv steht heute *halfyear = 13,71 EUR/Monat / halber Monat gratis*, *yearly = 12,46 EUR/Monat / 2 Monate gratis*. Das Jahresabo ist damit sichtbar staerker rabattiert als 6 Monate.

## 4. Offene Punkte (Drift gegen Konzept)

Diese Punkte standen im Originalkonzept als gesetzt, sind im Code aber noch nicht oder nur teilweise umgesetzt. Sie gehoeren in die Go-Live-Checkliste oder Phase 8.

| Punkt | Code-Stand | Konzept-Stand | Status |
|---|---|---|---|
| Promo-Codes / interne Gratis-Zugaenge | nicht implementiert (kein `source='promo'`, keine Tabellen `promo_codes`/`promo_redemptions`) | detailliertes Konzept inkl. Tabellen, Flow, Reaktivierung | Backlog; vor Go-Live nicht erforderlich, Trial deckt Conversion ab |
| Founder-Programm (datums-basierte 30-40 % Codes lebenslang pro Brand) | offen; Paddle-Discount-Codes aktuell unkonfiguriert | im Konzept als Marketing-Hebel beschrieben | offen, abhaengig von Marketing-Entscheidung |
| Trial-Wiederholung | aktuell moeglich, sobald ein nicht-bezahltes Entitlement existiert (`free/trial_expired` wird durch erneutes Free-Signup wieder `pro/trial`) | Trial nicht wiederholbar | **Bug / Go-Live-Risiko (Prio Hoch):** braucht Sperrlogik. Konkreter Vorschlag: in `grantTrialEntitlementIfMissing` (`functions/_lib/db.ts`) zusaetzlich pruefen, ob bereits ein Entitlement mit `source IN ('trial', 'trial_expired')` existiert — wenn ja, kein neuer Trial-Grant. Alternativ: dedizierte Spalte `users.trial_used` plus Migration, harte Sperre. Backlog-Eintrag im Ideenspeicher §1.5 verankert. |
| Pro-rata Refund auf Jahres-/Halbjahresabo | als Wording in [`pricing.yaml`](../website-astro/src/brands/lifeplus/content/pricing.yaml) "Ab Verlaengerung monatlich kuendbar, Restmonate zurueck" angekuendigt | im Konzept ausfuehrlich begruendet (Conversion-Lift, Trust) | operative Umsetzung (Paddle Customer Portal vs. Support-Flow) ist Go-Live-TODO; automatische Refund-API im Code nicht belegt |
| Output-Limit fuer Free in der App (Jahr 4 KPI, Jahr 5-10 blurred/locked) | bisher nicht im UI-Code verifiziert; `simulator-app/src/components/Paywall.tsx` ist ausschliesslich Auth/Entitlement-Gate, kein Free-Renderer | im Konzept zentraler Hebel | Pflicht-TODO fuer Phase 7 F02 (`Freemium-Modell_Applikation.md`) und/oder echte Capability-Schicht in `simulator-app/` |
| Free-Login-UX (Magic-Link-Flow auf Mobile, Fehlertexte) | Code vorhanden, UX-Pass markiert als offen (siehe `feedback_free_login_ux`) | im Konzept angerissen | offen vor Go-Live |
| Account-/Trial-Reset (Anti-Missbrauch) | Konzept-Skizze, Code: Email als Identitaet, keine Hash-/Loesch-Strategie geklaert | im Konzept "Trial nicht wiederholbar" als Default | siehe `project_account_deletion_and_antiabuse` und Go-Live-Liste Abschnitt 1 (Account-Loeschung DSGVO) |
| Reminder vor Trial-Ende | bewusst aufgeschoben | "spaeter planen, nachdem Free implementiert ist" | offen, nach Free-UI-Cap |

## 5. Nicht-Verantwortlichkeiten

- **Checkout-/Webhook-Fluss** -> [`paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](./paddle_checkout/checkout-billing-runbook-b2b-v6-1.md).
- **Auth-/Capability-Implementierung in der React-App** -> [`Freemium-Modell_Applikation.md`](./Freemium-Modell_Applikation.md) (F02).
- **Konkrete Paddle-Setup-Schritte** -> [`Setup Paddle Products, Prices, Discount-Codes.md`](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md).
- **Sharing-/Kundenlink-Flow** -> [`Konzept Kundenlinks und Szenario-Freigabe.md`](./Konzept%20Kundenlinks%20und%20Szenario-Freigabe.md) (F03).
- **Marketing-Wording** -> [`Webcontent & Value Proposition.md`](./Webcontent%20%26%20Value%20Proposition.md) (F09).
- **Rechtliche Bewertung Pivot B2B-only** -> [`paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md`](./paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md).

## 6. Entscheidungs-Historie

| Datum | Entscheidung | Folge |
|---|---|---|
| 2026-05-25 | Free mit Login, 14-Tage-Trial ohne Kartendaten, Output-Limit statt Input-Cap | Konzeptstand im Anhang |
| 2026-06-02 | Pivot B2B-only fuer Pro-Checkout | siehe `project_b2b_only_shop`; Widerruf entfaellt fuer Pro, AGB-Refactor |
| 2026-06-09 | Legal-Review v2 mit umgesetzten Anpassungen (AGB Abschnitt 3, Widerruf, Datenschutz, Newsletter) | siehe `_doc/go-live/legal-review-2026-06-03.md` |
| 2026-06-10 | Diese Datei als fuehrender Stand; Originalkonzept ins Anhang verschoben | Phase 7 Update Leading Documents |

---

## Anhang: historischer Konzeptstand (2026-05-25)

Der folgende Abschnitt ist der unveraenderte Originaltext aus dem Konzeptpapier von 2026-05-25. Er enthaelt ausfuehrliche Trade-off-Diskussionen (Trial-Dauer, Output-Limit, Refund-Policy mit ProfitWell-/Recurly-/Bain-Benchmarks, Codex/Claude-Dialog) und bleibt als Begruendungsspeicher erhalten. Bei Abweichungen vom Body oben gilt der Body oben.

> **Hinweis 2026-06-09:** Dieses Dokument beschreibt die Produktstrategie fuer
> Free/Trial/Pro. Der aktuelle technische Checkout-Stand ist B2B-v6.1
> Gast-Checkout mit `post-checkout` Auto-Login; technische Umsetzungsdetails
> stehen im Checkout-Runbook und in der App-Doku. Alte Funnel-Annahmen hier
> sind daher nicht automatisch Arbeitsauftraege.

### A.1. Zielsetzung

Der User soll im Free-Tier den **Mehrwert** der App klar erkennen, aber **nicht den vollen Nutzen** erhalten. Die Free-Version muss neugierig machen auf die Pro-Version, ohne den User mit harten Waenden frustriert auszubremsen.

**Conversion-Trigger:** Die Pro-Version beantwortet die kaufentscheidende Frage: *"Was ist meine realistische Auszahlung in Jahr 10?"*

Free ist dabei **kein anonymer Demo-Modus**. Auch Free erfordert eine Anmeldung per E-Mail und Magic-Link. Dadurch funktionieren Account-Wiederherstellung, Trial-Status, Downgrade und spaetere Reaktivierungen sauber.

**Codex:** Diese Login-Pflicht ist aus Produktsicht vertretbar, wenn sie als Komfort-Feature erklaert wird: kein Passwort, kein Passwort vergessen, kein Reset-Prozess.

**Claude:** Die Login-Pflicht erzeugt trotzdem messbare Bounce-Rate auf der Anmelde-Seite — User, die den Wert der App noch nicht gesehen haben, springen ab. Mitigation: Die oeffentliche Marketing-Seite (Astro, ausserhalb dieses Konzepts) muss den Wow-Moment vorab transportieren — animierter Chart-Screenshot mit Jahr-10-Kurve, anonymisierte Beispiel-KPI. Der User soll *vor* der E-Mail-Eingabe denken "ja, das will ich ausprobieren". Andernfalls bleibt die App-URL ein toter Funnel.

### A.2. Produktentscheidung in Kurzform

(Original-Entscheidungstabelle siehe `Freemium-Modell.md`, Abschnitt 2. Der Body oben spiegelt die heute gueltigen Entscheidungen wider; rechnerische Preis-Varianten und ausfuehrliche Refund-Policy-Argumentation stehen in der Originaldatei Abschnitt 11.)

### A.3. Weiterfuehrende Konzept-Abschnitte

Im Original und im Ideenspeicher (`_offene Tasks und offene Ideen.md` §1) enthalten. Kurz-Zusammenfassungen, damit dieses Doku selbsterklaerend bleibt:

- **Abschnitt 3 Account- und Trial-Modell:** Magic-Link-Flow (E-Mail eingeben -> Link bekommen -> klicken -> Trial-Start), Erklaertext fuer "kein Passwort", Statusmodell `Trial / Free / Pro / Promo`.
- **Abschnitt 4 Trial-Dauer 14 vs. 30 Tage:** Entscheidung 14 Tage. Begruendung: Aha-Moment der App entsteht schnell, 30 Tage verschieben Kaufentscheidung. 30 Tage waeren sinnvoller fuer Teams/Schulungen oder wenn Nutzungsdaten ueber Wochen gesammelt werden muessten — fuer diese App ist 14 fokussierter.
- **Abschnitt 5 Downgrade nach Trial-Ende:** Account bleibt bestehen, Tier `trial` -> `free`, KPI-Karte wechselt von Jahr 10 auf Jahr 4, Chart wird Free-Darstellung, Jahr 5-10 begrenzt. Im Code: lazy via `degradeExpiredTrial`.
- **Abschnitt 6 Freier Funktionsumfang als Tabelle:** Free zeigt Jahr 1-4 scharf, Jahr 5-6 angedeutet, Jahr 7-10 blurred/locked; Free-KPI = Jahr 4; Inputs unbegrenzt; 1 aktuelles Szenario ohne Speicherung; kein Export.
- **Abschnitt 7 Output-Limit statt Input-Cap (ethische Begruendung):** Input-Caps (z. B. max 2 Member/Sponsor) wurden verworfen, weil der User dann unrealistisch kleine Netze baut und falsch schliesst "lohnt sich nicht". Output-/Zeithorizont-Limit zeigt das echte Wachstum, blendet nur die spaeten Jahre.
- **Abschnitt 8 Psychologisches Design:** Verschwommener Horizont (Jahr 5-6 halbtransparent, Jahr 7-10 stark verschwommen). KPI-Karten-Umschaltung (Free zeigt Jahr 4 + Badge "Pro zeigt Jahr 10"). CTA-Logik: kontextuell am Blur-Overlay, an der KPI-Karte, nach Trial-Ende — keine aggressiven Modals.
- **Abschnitt 9 Ethische Grenze:** Realistic-Growth darf nicht komplett hinter die Paywall. Free waere sonst Schoenwetter-Simulation; bei Vertriebssystem-Apps ethisch und rechtlich heikel. Die ersten 4 Jahre werden korrekt berechnet; nur die langfristige Auszahlungskurve bleibt Pro.
- **Abschnitt 10 Trial-/Promo-/Paddle-Grenze:** App-intern = Free, Trial, Promo, Wiederholungsschutz, Kulanz-Tage. Paddle = nur bezahlte Welt (Pro-Abo, Checkout, Rechnungen, Customer Portal). 100 %-Discounts in Paddle erzeugen 0-EUR-Subscriptions mit Webhook-Nebenwirkungen — App-Entitlements sind sauberer. SQL-Skizze siehe Ideenspeicher §1.3 (`promo_codes`, `promo_redemptions`).
- **Abschnitt 11 Preisstruktur und Vertragsmodelle:** Pro-rata Refund-Empfehlung "Restmonate erstatten". Conversion-Lift-Begruendung mit ProfitWell- (Patrick Campbell), Recurly- (Subscription Benchmarks), HBS-, Bain-, Lincoln-Murphy-Quellen. Founder-Programm datums-basiert (kein Mengen-Limit), 30 % Public + 35-40 % via Codes, Brand-spezifisch, lebenslang solange Abo aktiv.

Vollstaendige Backlog-/Konzeptdetails sind in [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §1 konsolidiert. Voller Originaltext (vor 2026-06-10) liegt in der Git-Historie.

## Annahmen dieses Updates

- (Verifiziert) Das Output-Limit (Free zeigt nur Jahr 1-4) ist in dieser Datei als Produktentscheidung gefuehrt, aber im UI-Code noch nicht als Capability-Schicht belegt. Detailpruefung laeuft in F02 (`Freemium-Modell_Applikation.md`).
- (Verifiziert) `source='promo'` ist im Backend nicht aktiv. Vor Implementierung der Promo-Codes braucht es eine ADR oder mindestens eine Schema-/Runbook-Entscheidung.
- (Verifiziert) Trial-Wiederholung ist im aktuellen Code nicht verhindert, obwohl das Produktkonzept sie ausschliesst.
- (Annahme) Pro-rata Refund laeuft heute manuell ueber Paddle/Support, nicht automatisiert per API. Konsolidierung in das Checkout-Runbook ist Folge-TODO.

## Offene Fragen an Review

1. Soll der Refund-Workflow als operatives Runbook ins `paddle_checkout/`-Verzeichnis wandern, sobald geklaert ist, ob Paddle Customer Portal pro-rata abdeckt?
2. Soll der Output-Limit-TODO (Jahr 4 cap im UI) in der Go-Live-Liste oder hier als Pflicht-TODO referenziert werden?
3. Promo-Codes/Founder-Programm: nach Go-Live in ein eigenes Konzept oder hier integriert?
