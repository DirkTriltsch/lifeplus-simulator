# Konzept Kundenlinks und Szenario-Freigabe

**Stand:** 2026-06-10  
**Status:** Konzept-Master / nicht implementiert. Phase-7-Review-Artefakt; nach Freigabe in die fuehrende Datei ueberfuehrt oder verworfen.  
**Scope:** Geplanter Sharing-Flow fuer LifeFlow360: Ein berechtigter Berater erstellt einen zeitlich begrenzten Kundenlink; ein Interessent sieht ein anonymes, read-only Szenario mit optionalem Sponsor-CTA. MVP nur LifeFlow360, FitFlow360/EqoFlow360 spaeter.  
**Ersetzt nach Freigabe:** [`Konzept Kundenlinks und Szenario-Freigabe.md`](./Konzept%20Kundenlinks%20und%20Szenario-Freigabe.md).
**Vollstaendige Konzept-Detailspezifikation:** [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §3 — dort sind alle Master-Entscheidungen, Schwachstellen-Tabelle, Versionshistorie, Zielbild-Diagramm und Datenmodell konsolidiert. Bei produktiver Umsetzung ist §3 die fuehrende Quelle, nicht die Original-v3-Datei.

## Zielbild auf einen Blick

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

Der Berater (Pro-Account) erstellt einen Share aus einem konkreten Szenario. Das Backend snapshottet Szenario, Sponsor-Anzeigename und Member-Link in `shared_scenarios`. Der Interessent oeffnet den Share-Link, sieht das Szenario nach Turnstile-Splash und wird via `/r/m/<id>` auf den Brand-Member-Signup-Link gefuehrt — Click-Tracking und Allowlist-Pruefung passieren serverseitig.

## Versionshistorie des Konzepts

- **v1:** Erster Wurf mit serverseitigem Mail-Versand (Resend) und freier Provider-Auswahl (WhatsApp/Telegram).
- **v2:** Versand-Architektur stark vereinfacht — Clipboard + `mailto:` statt API-Versand. UC-5 (Provider-Integration) entfaellt.
- **v3:** CTA-Text personalisiert mit Sponsor-Name, Cloudflare Turnstile als Bot-Schutz, Member-Link-Allowlist, 3-Wege-Copy-Buttons.
- **v3 Merge (2026-05-26):** Konsolidierung paralleler Codex-/Claude-Entwuerfe; Sponsor-Profil als Paar bestaetigt; Splash-Page mit Sponsor-Name + Brand-Logo entschieden. **Dieser Stand bildet die Konzeptgrundlage.**

## 0. Kritisches Review dieses Updates

Der bisherige Entwurf war in der Richtung richtig, aber an vier Stellen zu weich:

1. **Status zu unklar:** Das Feature existiert nicht im Code. Alle API-Pfade, Tabellen, UI-Komponenten und Turnstile-Ablaufe sind Vorschlaege, keine vorhandenen Bausteine.
2. **Zu wenig Abgrenzung zum Auth-/Entitlement-System:** Share-Erstellung muss an aktive Berechtigung gebunden sein; der anonyme Viewer darf dagegen keine App-Session, kein Device-Limit und keinen Freemium-Status verbrauchen.
3. **Datenschutz zu knapp:** Sponsor-Anzeigename und Member-Link koennen personenbezogene oder vertriebliche Daten sein. Account-Loeschung, Widerruf, TTL, Bot-Previews und Click-Tracking brauchen explizite Regeln vor Implementierung.
4. **Technische Route zu unpraezise:** Eine reine Astro-Seite reicht nicht, wenn Viewer-Daten aus D1, Turnstile und Rate-Limits kommen. Es braucht eine API-gestuetzte Viewer-Route oder eine Astro-Seite mit clientseitigem API-Resolve.

Dieses Dokument korrigiert diese Punkte und trennt Ist-Zustand, Produktentscheidungen, Architekturvorschlag und offene Entscheidungen.

## 1. Aktueller Ist-Zustand

**Im Code existiert dieser Flow nicht.** Eine Suche ueber `functions/`, `migrations/`, `simulator-app/`, `packages/`, `website-astro/` und die Go-Live-Doku findet nur verwandte Marketing- oder Infrastrukturtexte, aber keine Implementierung fuer Kundenlinks/Szenario-Freigabe.

Nicht vorhanden:

- Keine API-Endpunkte wie `/api/shares/*`, `/api/share`, `/api/scenario` oder `/r/m/...`.
- Keine Datenbanktabellen `shared_scenarios`, `shares`, `share_events`, `member_link_clicks` oder aequivalent in `migrations/0001` bis `0009`.
- Keine Sponsor-Profilfelder an `users` und keine `sponsor_profiles`-Tabelle.
- Keine Turnstile-Integration in `functions/`, `simulator-app/` oder `website-astro/`.
- Keine Share-/Copy-UI in der React-App.
- Keine oeffentliche Viewer-Route fuer gespeicherte Szenarien.

Vorhandene Bausteine, an die ein spaeterer Bau andocken kann:

| Baustein | Relevanz |
|---|---|
| `functions/_lib/session.ts` | Session-/Device-Kontext fuer authentifizierte Share-Ersteller. |
| `functions/_lib/db.ts` | Entitlement-Ermittlung und bestehende D1-Helfer. |
| `functions/_lib/crypto.ts` | `randomId`, Tokens, Hashing; Roh-Share-Tokens sollten nicht im Klartext gespeichert werden. |
| `functions/_lib/rate-limit.ts` | Vorbild fuer IP-/User-Limits auf Create, View und Redirect. |
| `functions/api/me.ts` und `simulator-app/src/auth/useAuth.tsx` | Aktuelles Auth-/Entitlement-Modell; Viewer muss davon bewusst getrennt bleiben. |
| `website-astro/src/brands/*/brand.yaml` | Brand-Domain, Produktname und spaetere Brand-spezifische Allowlist-Konfiguration. |
| `go-live/go-live-content-legal-checklist.md` | Rate-Limits, Datenschutz, Anti-Abuse und Go-Live-Gates. |

## 2. Master-Entscheidungen fuer einen spaeteren Bau

Diese Entscheidungen gelten als Konzeptbasis, solange sie nicht durch einen ADR ersetzt werden:

1. **Kein serverseitiger Versand im MVP.** Die App generiert Share-Link und optional eine `mailto:`-Vorlage. Der Berater verschickt selbst per E-Mail, Messenger oder CRM. Dadurch werden keine Empfaenger-PII gespeichert.
2. **Share-Erstellung nur fuer berechtigte Nutzer.** Mindestregel vor Umsetzung festlegen: wahrscheinlich aktive Pro-Berechtigung; Trial-Nutzer nur, wenn Produkt das explizit will.
3. **Viewer bleibt anonym.** Ein Interessent braucht keinen Login, keine App-Session und belegt kein Device-Limit. Viewer-Zugriffe werden nur technisch/rate-limit-bezogen verarbeitet.
4. **Sponsor-Profil als Paar.** `sponsor_display_name` und `member_link` sind beide gefuellt oder beide leer. Bei leerem Paar: CTA komplett ausblenden, kein Fallback-Text.
5. **V1-Viewer read-only.** Interessent kann Werte nicht aendern. Editierbare Kopie oder "mit eigenen Zahlen ausprobieren" ist V2 und braucht ein eigenes Missbrauchs-/Conversion-Konzept.
6. **Member-Link-Snapshot.** Der Member-Link wird beim Erstellen des Shares eingefroren; spaetere Profil-Aenderungen gelten nur fuer neue Shares.
7. **Member-Link-Redirect ueber eigene Brand-URL.** Beispiel: `/r/m/:shareId`. Das erlaubt Click-Tracking, Revocation und eine vertrauenswuerdige Domain statt direkter Fremdlinks.
8. **Turnstile oder gleichwertiger Bot-Schutz vor Viewer und Redirect.** Link-Preview-Bots duerfen keine echten Opens oder Member-Link-Klicks erzeugen.
9. **Rate-Limit als Startwert:** 5 neue Shares pro Sponsor und Tag, plus IP-Limits fuer View/Redirect. Werte muessen vor Go-Live anhand Traffic und Missbrauchsrisiko finalisiert werden.
10. **Aktive-Shares-Liste ist V2.** Daten ab Tag 1 speichern, UI im Account-Bereich spaeter bauen.

## 2a. Bewertete Luecken und Schwachstellen (Kurzform)

Diese Tabelle ist die Risiko-/Tradeoff-Sicht zu den Master-Entscheidungen in §2. Vollstaendige Diskussion in [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §3.2.

| Thema | Bewertung | Korrektur / Frage |
|---|---|---|
| Serverversand per Resend | Fuer MVP zu schwer: Empfaenger-PII, Bounce-Handling, Spam-Risiko. | Nur Clipboard + `mailto:`. Resend bleibt fuer User-Login. |
| Live-Member-Link in alten Shares | Produktlich riskant: alter Interessent kann auf spaeter geaendertes Ziel laufen. | Snapshot im Share speichern (siehe §2 Punkt 6). |
| Read-only vs. "paar Werte aendern" | Read-only ist als V1 sauberer; Editierbarkeit ist V2 mit eigenem Missbrauchs-Konzept. | Als bewusste MVP-Abgrenzung dokumentieren. |
| Sponsor-Name vor Turnstile sichtbar | Leakt minimal personenbezogene Daten an Link-Preview-Bots. | Akzeptabel, wenn User Namen aktiv freigibt; in Datenschutzhinweis nennen. |
| Empfaengerkontakt nicht in DB | DSGVO-stark, aber Support/Follow-up schwach. | `recipient_hint` nur als freie Notiz; spaeter optional mit Consent. |
| Allowlist hardcoded | Gut gegen Drift, aber Brand-Signup-Domains koennen sich aendern. | Vor Umsetzung echte Signup-Domains sammeln; Env-Override fuer Staging. |
| Tabellenloeschung nach Ablauf | Cron loescht nach `expires_at + 7 Tage`, aber Analytics gehen verloren. | Vor Loeschung aggregieren oder bewusst akzeptieren. |

## 3. Architekturvorschlag

### 3.1 Datenmodell

Neue Migration, Arbeitstitel `00XX_shared_scenarios.sql`:

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

### 3.2 API-Endpunkte

Cloudflare Pages Functions, passend zur vorhandenen Struktur:

| Endpoint | Auth | Zweck |
|---|---|---|
| `POST /api/shares/create` | Session + aktives Entitlement | Szenario validieren, Sponsorprofil snapshotten, Share erstellen. |
| `GET /api/shares/view?id=...` | anonym + Bot-Schutz | Viewer-Daten fuer oeffentliche Seite liefern. |
| `POST /api/shares/revoke` | Besitzer-Session | Share widerrufen. |
| `GET /r/m/:shareId` oder `GET /api/shares/member-redirect?id=...` | anonym + Bot-Schutz | Click zaehlen und auf Member-Link weiterleiten. |

Wichtig: Die Viewer-API darf nicht `loadSessionFromToken` voraussetzen und darf keine Entitlements erzeugen oder aendern.

### 3.3 Frontend-Routen

| Bereich | Vorschlag |
|---|---|
| React-App | Neue Share-Aktion nahe Szenario/Export, z. B. `simulator-app/src/components/share/*`. |
| Oeffentlicher Viewer | Astro-Route wie `/s/[id]` oder `/r/s/[id]`, die clientseitig `GET /api/shares/view` aufruft. |
| Sponsor-Profil | Besser im Account-Bereich der Astro-Site oder in einer kleinen Pro-Einstellung, nicht als versteckte Simulator-App-Konfiguration. |

Eine statisch gerenderte Astro-Seite ohne API-Resolve ist fuer dieses Feature ungeeignet, weil Share-Status, TTL, Revocation, Turnstile und Zaehler zur Laufzeit geprueft werden muessen.

## 4. Datenschutz, Sicherheit und Missbrauchsschutz

Pflichtpunkte vor Implementierung:

- **Datenminimierung:** Keine Empfaenger-E-Mail, kein Empfaengername, keine Freitextnotizen im MVP speichern.
- **Sponsor-Daten:** Anzeigename und Member-Link in Datenschutzhinweisen erwaehnen; Member-Link-Domain per Allowlist pruefen.
- **Account-Loeschung:** Beim Loeschen eines Accounts alle aktiven Shares revoken oder anonymisieren; Entscheidung vor Migration festhalten.
- **TTL:** Standard-Laufzeit festlegen, z. B. 14 oder 30 Tage. Unbegrenzte Shares sind fuer ein MVP zu riskant.
- **Bot-Schutz:** Turnstile oder gleichwertige serverseitige Pruefung fuer Viewer und Redirect; Preis/Quota vor Go-Live verifizieren.
- **Rate-Limits:** User-Limit fuer Create, IP-Limit fuer View/Redirect, Brute-Force-Schutz fuer Share-IDs.
- **Tracking:** Nur aggregierte Zaehler im MVP. Keine personenbezogene Besucherhistorie ohne neue Rechtsgrundlage.
- **Brand-Trennung:** `brand_id` in jeder Query hart filtern; Member-Link-Allowlist pro Brand.

## 5. Offene Entscheidungen vor Umsetzung

| Frage | Empfehlung fuer MVP |
|---|---|
| Prioritaet vor Go-Live? | Nein. Pro-Checkout, Rechtstexte, Account und Entitlements bleiben wichtiger. |
| Wer darf Shares erstellen? | Pro aktiv; Trial nur nach expliziter Produktentscheidung. |
| Standard-TTL? | 14 oder 30 Tage; kein unbegrenzt. |
| Viewer editierbar? | Nein, read-only. |
| Sponsor-Profil wo pflegen? | Account-Bereich oder Pro-Einstellung, nicht in Marketing-YAML. |
| Member-Link-Allowlist? | Env-/Brand-Konfiguration, vor Launch mit echten LifePlus/FitLine/Eqology-Domains pruefen. |
| ADR noetig? | Ja, vor Implementierung. Dieses Dokument ist Konzeptbasis, kein finaler Architekturentscheid. |

## 6. Verwandte Dokumente

- [`Freemium-Modell_updated.md`](./Freemium-Modell_updated.md) - aktuelles Auth-/Entitlement-Modell und bekannte Trial-/Free-Abweichungen.
- [`Konzept Paddle-Integration und App-Architektur_updated.md`](./Konzept%20Paddle-Integration%20und%20App-Architektur_updated.md) - Checkout-/Account-Kontext, an dem Sponsor-Conversion spaeter andockt.
- [`paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](./paddle_checkout/checkout-billing-runbook-b2b-v6-1.md) - operativer Checkout- und Billing-Kontext.
- [`go-live/go-live-content-legal-checklist.md`](./go-live/go-live-content-legal-checklist.md) - Anti-Abuse-, Datenschutz- und Go-Live-Pflichten.
- [`Konzept Kundenlinks und Szenario-Freigabe.md`](./Konzept%20Kundenlinks%20und%20Szenario-Freigabe.md) - historischer Langentwurf v3; Detailvorlage, aber nicht Implementierungsauftrag.

## Anhang: Historischer Kontext

Die Original-Datei `Konzept Kundenlinks und Szenario-Freigabe.md` ist eine v3-Konsolidierung vom 2026-05-26. Sie enthaelt:

- Review-Ergebnis und Master-Festlegungen aus mehreren Entwuerfen.
- Zielbild und Userflow-Diagramme.
- Detail-Spezifikation fuer Datenmodell, API-Endpunkte, Frontend-Komponenten, Splash-Page, Rate-Limits, Turnstile-Integration, Cron-Logik und AccountPanel-V2.
- Implementierungspakete.
- Abschnitte aus parallelen Modell-Entwuerfen.

Bei Abweichungen zwischen historischer Detail-Spec und diesem Review-Master gilt dieses Dokument. Vor produktiver Umsetzung sollte daraus ein kurzer ADR mit finalen Entscheidungen, Datenmodell und Security-Gates entstehen.
