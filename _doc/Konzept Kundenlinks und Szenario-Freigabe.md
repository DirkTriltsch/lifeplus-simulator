# Konzept: Kundenlinks und Szenario-Freigabe

**Stand:** 2026-05-26
**Status:** konsolidiert / v3 — Merge aus Codex-Entwurf (Datei A, ausfuehrlicher Master) und Claude-Entwurf (Datei B, technisch-tiefer)
**Scope:** MVP nur LifeFlow360. FitFlow360/EqoFlow360 spaeter (vgl. `project-brand-separation`).
**Bezug:** [Freemium-Modell](./Freemium-Modell.md), [Freemium in der App](./Freemium-Modell_Applikation.md), [Konzept Paddle-Integration und App-Architektur](./Konzept%20Paddle-Integration%20und%20App-Architektur.md)

> **Quellen-Konvention:** Inhalte ohne Markierung sind in beiden Vorlaeufer-Entwuerfen konsistent.
> `**[Codex]**` kennzeichnet Inhalte aus `Konzept Kundenlinks und Szenario-Freigabe.md` (Master), die im Claude-Entwurf fehlten oder dort anders bewertet wurden.
> `**[Claude]**` kennzeichnet Inhalte aus `Konzept Kundenlinks.md`, die in den Master uebernommen werden, weil sie technisch tiefer gehen oder eine Entscheidung praeziser fassen.

---

## 1. Review-Ergebnis und Master-Festlegungen

Diese acht Punkte sind nach dem Abgleich beider Entwuerfe **fuer das MVP massgeblich**. Sie ersetzen abweichende Aussagen weiter unten.

1. **Kein serverseitiger Versand an Interessenten im MVP.** Die App erzeugt einen Share-Link und optional eine `mailto:`-Vorlage. Der User verschickt selbst per E-Mail, WhatsApp, Telegram, Signal, iMessage usw. Dadurch speichern wir keine Empfaenger-E-Mail/-Telefonnummer, schuetzen die Resend-Reputation und reduzieren DSGVO-Aufwand.
2. **Sponsor-Profil statt nur Member-Link.** `sponsor_display_name` und `member_link` bilden ein Paar: entweder beide gefuellt oder beide leer. Wenn beide leer sind, wird der CTA im Viewer komplett ausgeblendet — kein Fallback-Text.
3. **V1-Viewer read-only.** Der Interessent sieht das Szenario, kann aber im MVP keine Werte aendern. Das ist ehrlicher, schneller umsetzbar und verhindert unrealistische Eigeninterpretationen.
4. **Member-Link als Snapshot im Share speichern.** Anders als im ersten Entwurf wird fuer geteilte Szenarien der Member-Link zum Erstellzeitpunkt eingefroren. Das verhindert, dass ein alter Kundenlink spaeter ploetzlich auf ein anderes Sponsor-Ziel zeigt.
5. **Member-Link-Redirect statt direkter externer Link.** `/r/m/:scenarioId` ermoeglicht Click-Tracking, eine vertrauenswuerdige Brand-URL und spaetere Korrekturmoeglichkeiten.
6. **Turnstile-Splash vor Viewer und Redirect.** Link-Preview-Bots duerfen keine Aufrufstatistik verfaelschen, keine Device-Slots verbrauchen und den Member-Link-Redirect nicht ausloesen.
   - **[Codex]** Cloudflare bewirbt Turnstile Managed offiziell als kostenlos fuer unbegrenzte Nutzung (<https://blog.cloudflare.com/turnstile-ga/>); trotzdem sollte das vor Go-live noch einmal in der aktuellen Cloudflare-Preisliste geprueft werden.
   - **[Claude]** geht von "unbegrenzt kostenlos, ohne User- oder Request-Cap" als gesetzt aus.
   - **Konsolidiert:** Plan auf Basis "kostenlos" weiterlaufen lassen, Pre-Go-Live-Check als Punkt in der Release-Checkliste fuehren.
7. **Rate-Limit: 5 Shares pro Sponsor pro Tag.** Streng, aber als Missbrauchsschutz fuer den Start sinnvoll. Spaeter nach echten Nutzungsdaten erhoehbar.
8. **Aktive-Shares-Liste ist V2.** Die Daten fuer `open_count` und `member_link_click_count` werden ab Tag 1 gespeichert, aber die Darstellung im AccountPanel kommt nach dem MVP.

### Bewertete Luecken und Schwachstellen

**[Codex]** Diese Tabelle war ausschliesslich im Master-Entwurf — sie ist die Begruendung fuer mehrere der Entscheidungen oben.

| Thema | Bewertung | Korrektur / Frage |
|---|---|---|
| Serverversand per Resend | Fuer MVP zu schwer: Empfaenger-PII, Bounce-Handling, Spam-Risiko. | Nur Clipboard + `mailto:`. Resend bleibt fuer User-Login. |
| Live-Member-Link in alten Shares | Produktlich riskant: ein alter Interessent kann auf ein spaeter geaendertes Ziel laufen. | Snapshot im Share speichern; Profil-Aenderungen gelten nur fuer neue Shares. |
| Komplett read-only vs. "paar Werte aendern" | Read-only widerspricht dem Ursprungwunsch teilweise, ist aber als V1 sauberer. | Als bewusste MVP-Abgrenzung dokumentieren; Editierbarkeit als V2-Experiment. |
| Kein Empfaengerkontakt in DB | DSGVO-stark, aber Support/Follow-up schwach. | `recipient_hint` nur als freie Notiz; spaeter optional echte Kontakte mit Consent. |
| Sponsor-Name vor Turnstile sichtbar | Leakt minimal personenbezogene Daten an Link-Preview-Bots. | Akzeptabel, wenn User den Namen aktiv freigibt; in Datenschutzhinweis nennen. |
| Device-Fingerprint | Kann datenschutzrechtlich sensibel und technisch unzuverlaessig sein. | Nur Hash, kurze TTL, keine IP-Speicherung; Alternative: Cookie-only Limit. |
| Turnstile vor `/r/m/` | Schuetzt Statistik, kann aber Conversion-Reibung erzeugen, wenn der Interessent direkt klickt. | Splash sehr schlank halten; bei niedriger Bot-Last spaeter fuer `/r/m/` lockern. |
| 5 Shares/Tag | Koennte echte Power-User ausbremsen. | Startwert ok; Admin-Override oder Pro-Staffel spaeter pruefen. |
| `member_link_snapshot` Korrektur | Im Konzept wird "aenderbar machen" erwaehnt, aber kein Endpoint definiert. | V1: keine Snapshot-Korrektur, nur widerrufen und neu teilen. |
| Tabellenloeschung nach Ablauf | Cron geloescht nach `expires_at + 7 Tage`, aber Analytics gehen verloren. | Vor Loeschung aggregieren oder bewusst akzeptieren. |
| Allowlist hardcoded | Gut gegen Drift, aber LifePlus/Eqology-Linkvarianten koennen wechseln. | Vor Umsetzung echte Signup-Domains sammeln; Env-Override fuer Staging behalten. |

### Versionshistorie

**[Claude]** Diese Versionshistorie kam aus dem Claude-Entwurf und dokumentiert die Iterationsschritte, die zu den heutigen Entscheidungen gefuehrt haben.

- **v1:** erster Wurf mit serverseitigem Mail-Versand und freier Provider-Auswahl (WhatsApp/Telegram).
- **v2:** Versand-Architektur stark vereinfacht — Clipboard + `mailto:` statt API-Versand. UC-5 (Provider-Integration) entfaellt.
- **v3:** CTA-Text personalisiert mit Sponsor-Name, Cloudflare Turnstile als Bot-Schutz, Member-Link-Allowlist, 3-Wege-Copy-Buttons.
- **v3 (Merge, dieses Dokument):** Konsolidierung beider Parallel-Entwuerfe zu einer Master-Datei; Sponsor-Profil als Paar bestaetigt; Splash-Page mit Sponsor-Name + Brand-Logo entschieden.

---

## 2. Zielbild

Ein angemeldeter LifePlus-User soll seinen persoenlichen **Member-Link** in der App hinterlegen. Wenn er mit einem Interessenten ein passendes Szenario besprochen hat, kann er genau dieses Szenario als zeitlich begrenzten **Kundenlink** erstellen und selbst versenden.

Der Interessent oeffnet den Link ohne Passwort, sieht das freigegebene Szenario fuer eine Woche und findet im Szenario prominent den Sponsor-CTA des Users, sofern dieser Sponsor-Name und Member-Link hinterlegt hat. So kann er direkt ueber den richtigen Empfehlungslink einen Account bei LifePlus eroeffnen.

Wichtig: Der Kundenlink ist **kein Pro-Account** und kein allgemeiner App-Zugang. Er ist eine kontrollierte, befristete Szenario-Ansicht.

```text
┌─────────────┐  Szenario       ┌──────────────┐  Snapshot   ┌─────────────┐
│   Berater   │ ──────────────▶ │   Backend    │ ──────────▶ │ shared_     │
│ (User-Login)│                 │  (Workers)   │             │ scenarios   │
└─────────────┘                 └──────┬───────┘             └─────────────┘
       │                               │
       │ Link kopieren / mailto        │ rendert
       ▼                               ▼
┌─────────────┐  https://.../    ┌──────────────┐
│ Messenger / │  share/<id>?t=…  │   Splash +   │
│ Mail-App    │ ───────────────▶ │   Turnstile  │
└─────────────┘                  └──────┬───────┘
                                         │ ok
                                         ▼
                                  ┌──────────────┐  /r/m/<id>  ┌──────────┐
                                  │ Viewer (RO)  │ ──────────▶ │ Member-  │
                                  │ + CTA-Button │             │ link ext.│
                                  └──────────────┘             └──────────┘
```

Das Diagramm zeigt den Datenfluss von der Szenario-Erstellung beim Berater bis zum externen Sponsor-Klick beim Interessenten. Alle nutzer-sichtbaren Schritte laufen ueber die LifeFlow360-Domain; nur der finale Member-Link verweist nach extern.

---

## 3. Begriffe

| Begriff | Bedeutung |
|---|---|
| **User / Berater** | Angemeldeter LifePlus-Simulator-User mit eigenem App-Account. |
| **Interessent** | Empfaenger eines Kundenlinks. Hat optional keinen LifePlus-Simulator-Account. |
| **Member-Link** | Persoenlicher LifePlus-Registrierungs-/Empfehlungslink des Users. |
| **Sponsor-Name** | Anzeigename des Users fuer Interessenten, z. B. "Dirk Triltsch". |
| **Sponsor-Profil** | Paar aus Sponsor-Name und Member-Link. Beide Felder sind gemeinsam gesetzt oder gemeinsam leer. |
| **Szenario** | Snapshot der besprochenen Simulator-Werte. |
| **Kundenlink** | Befristeter Link zu genau einem Szenario, bestehend aus opaker Scenario-ID und Random-Token. |
| **Share Session** | Technischer Zugriff des Interessenten auf einen Kundenlink. |
| **Splash-Page** | Vorgeschaltete Seite mit Branding, Sponsor-Name und Turnstile-Widget vor dem eigentlichen Viewer. |
| **Redirect-Endpoint** | `/r/m/:scenarioId`, der Member-Link-Klicks zaehlt und auf den eingefrorenen externen Link weiterleitet. |

Hinweis: In den bestehenden Notizen taucht "Memeber-Link" auf. Im Produkt und Code sollte einheitlich **Member-Link** verwendet werden.

---

## 4. MVP-Empfehlung

Fuer die erste Version empfehle ich:

1. **Sponsor-Profil serverseitig im User-Profil speichern:** `sponsor_display_name` und `member_link` atomar als Paar.
2. **Szenario beim Versand als Snapshot speichern**, nicht als Live-Referenz auf den aktuellen Simulator-Zustand.
3. **Kundenlink lokal teilen:** Clipboard-Buttons und `mailto:`-Vorlage, kein serverseitiger Versand an Interessenten.
4. **Interessenten-Zugriff 7 Tage gueltig**, maximal 2 Geraete bzw. Share-Sessions.
5. **Viewer V1 komplett read-only.** Editierbare Werte bleiben V2.
6. **Member-Link als Snapshot speichern**, damit bestehende Shares stabil bleiben. Neue Profil-Aenderungen gelten fuer neue Shares.
7. **Member-Link nur ueber Redirect-Link teilen**, damit Klicks messbar sind.
8. **Turnstile-Splash vor Viewer und Member-Link-Redirect**, damit Bots keine Statistik und keine Device-Slots verbrauchen.
9. WhatsApp/Telegram/SMS-Provider bleiben **nicht MVP**. Clipboard reicht fuer alle Messenger.

Diese Variante passt zur bestehenden Architektur: Cloudflare Pages Functions, D1, Magic-Link-nahe Token-Logik, Sessions/Devices und Cloudflare Turnstile.

### Use-Case-Tabelle

**[Claude]** Kompakter Ueberblick, der die User-Storys-Sektion ergaenzt.

| # | Use-Case | Entscheidung | Persistenz |
|---|----------|--------------|------------|
| UC-1 | Member-Link verwalten in "Mein Konto" | bleibt | dauerhaft, geraeteuebergreifender Re-Fetch bei Tab-Focus |
| UC-2 | Szenario teilen via Link in Zwischenablage oder `mailto:`-Vorlage | Versand lokal im Browser/Mailprogramm, nicht ueber unseren Server | 7 Tage TTL fuer den Link |
| UC-3 | Szenario einsehen (max. 2 Geraete) | Interessent oeffnet Magic-Link-aehnlichen Link, V1 read-only | 7 Tage |
| UC-4 | Conversion via Member-Link mit Click-Tracking | Member-Link ist im Viewer und im mailto-Body eingebettet; Klick laeuft ueber Redirect-Endpoint | Click-Events in DB |
| ~~UC-5~~ | ~~WhatsApp/Telegram/SMS Provider-Integration~~ | **entfaellt** — Clipboard reicht | — |

---

## 5. User-Storys

### 5.1 Sponsor-Profil speichern

Unter **Mein Konto** gibt es ein Feld:

```text
Sponsor-Name
Dirk Triltsch

LifePlus Member-Link
https://...
```

Anforderungen:

- `sponsor_display_name` und `member_link` werden serverseitig als Paar gespeichert.
- Beide Felder sind gefuellt oder beide leer; ein einzelnes Feld ist ungueltig.
- Ist auf allen Geraeten des Users identisch verfuegbar.
- Wird nach dem Speichern sofort von `/api/me` neu ausgeliefert.
- Neue Kundenlinks speichern den aktuellen Member-Link als Snapshot.
- Link-Validierung serverseitig: nur HTTPS, erlaubte LifePlus-Domains, keine JavaScript-/Tracking-Unsicherheit.
- Sponsor-Name: 1 bis 80 Zeichen, keine HTML-Ausgabe ohne Escaping.

Empfohlene UX:

- Zwei Eingabefelder mit gemeinsamem "Speichern".
- Status "Gespeichert".
- Button "Link testen" oeffnet den Member-Link in neuem Tab.
- Button "Beide loeschen".
- Buttons "Member-Link kopieren" und "Per E-Mail weiterleiten" nur aktiv, wenn das Sponsor-Profil vollstaendig ist.
- Inline-Fehler, wenn genau eines der beiden Felder leer ist.

**[Claude]** Konkretes UI-Layout des AccountPanels:

```text
Sponsor-Profil  (Name UND Link, oder beides leer)

Sponsor-Name (wird Interessenten angezeigt)
[ Dirk Triltsch                                  ]

Mein LifePlus-Member-Link
[ https://my.eqology.com/...                     ]

zuletzt aktualisiert: vor 3 Minuten
[Speichern]   [Beide loeschen]

[Link kopieren]   [Per E-Mail weiterleiten]
```

### 5.2 Szenario fuer Interessenten teilen

Im Simulator gibt es eine Aktion:

```text
Szenario teilen
```

**[Claude]** Positionierung in der Topbar: zwischen den vorhandenen Icon-Buttons **Chart** (`simulator-app/src/App.tsx:215`) und **Netzwerk** (`simulator-app/src/App.tsx:234`). Der Button ist nur aktiv, wenn der User eingeloggt ist und ein aktives Szenario hat.

Dialog:

- Optionale Notiz fuer den User, z. B. "Webinar 24.5.".
- Ablaufdatum fix: 7 Tage.
- Share-Link wird erzeugt und kopierbar gemacht.
- Drei Copy-Optionen: Szenario-Link, Member-Link-Redirect, beide Links.
- Optional `mailto:`-Vorlage, die das lokale Mailprogramm des Users oeffnet.

**[Claude]** ASCII-Mockup des Share-Dialogs:

```text
┌──────────────────────────────────────────────────────┐
│ Szenario teilen                                   X  │
├──────────────────────────────────────────────────────┤
│ Notiz (nur fuer dich):                               │
│ [ z. B. Hr. Mueller, Webinar 24.5.              ]    │
│                                                      │
│ Dein Szenario-Link (7 Tage, max. 2 Geraete):         │
│ ┌────────────────────────────────────────────────┐   │
│ │ https://app.lifeflow360.app/share/a3f...?t=... │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ Kopier-Optionen:                                     │
│ [ Szenario-Link ]  [ Member-Link ]  [ Beide ]        │
│                                                      │
│ Oder direkt versenden:                               │
│ [ Als E-Mail weiterleiten ]                          │
│                                                      │
│ Der Empfaenger sieht dein Szenario; im Viewer        │
│ findet er einen Button zu deinem Member-Link.        │
└──────────────────────────────────────────────────────┘
```

Beim Teilen:

1. App sendet aktuellen Szenario-State an `POST /api/scenarios/share`.
2. Backend prueft User-Session und Berechtigung.
3. Backend speichert Szenario-Snapshot.
4. Backend speichert `member_link_snapshot`, falls Sponsor-Profil gesetzt ist.
5. Backend erzeugt opake Scenario-ID und Random-Token.
6. Frontend zeigt/kopiert den Link oder oeffnet `mailto:`.

Wichtig: Das Backend verschickt im MVP **keine** Nachricht an den Interessenten. Der User entscheidet selbst, ueber welchen Kanal der Link versendet wird.

### 5.3 Interessent oeffnet Kundenlink

Der Interessent klickt im erhaltenen Text auf:

```text
Szenario ansehen
```

Flow:

1. Link enthaelt Scenario-ID und zufaelligen Token, z. B. `/share/a3f...?t=...`.
2. Server rendert zuerst eine Turnstile-Splash-Page.
3. Nach erfolgreicher Turnstile-Pruefung validiert das Backend Token, Ablauf, Widerruf und Device-Limit.
4. Backend erstellt eine Share Session und setzt ein `viewer_session`-Cookie.
5. Interessent sieht die read-only Scenario-Viewer-App.
6. CTA fuehrt ueber `/r/m/:scenarioId` zum gespeicherten Member-Link-Snapshot.

Der Interessent braucht im MVP keinen eigenen App-Account. Der Link selbst ist der Zugang.

---

## 6. Welche Werte darf der Interessent aendern?

V1-Entscheidung nach Abgleich: **keine**. Der Viewer ist im MVP komplett read-only.

Begruendung:

- Der besprochene Zustand bleibt stabil.
- Der Interessent kann keine unrealistischen Parameter einstellen.
- Der Berater weiss spaeter noch, was er wirklich verschickt hat.
- Umsetzung ist deutlich kleiner: kein Whitelist-Modell, keine lokale Modifikationslogik, keine Fragen zur Persistenz.

V2-Optionen:

| Option | Editierbare Felder | Bewertung |
|---|---|---|
| A | Direct-Adds/Monat und Conversion-Rate | sinnvollster erster Test |
| B | Berater waehlt Felder beim Teilen | flexibler, aber mehr UI-Aufwand |
| C | Interessent speichert Variante zurueck an Berater | wertvoll fuer Follow-up, aber datenschutz- und produktseitig deutlich groesser |

Falls Editierbarkeit spaeter kommt, sollten Aenderungen zunaechst nur lokal im Viewer gelten und beim Reload wieder auf den Snapshot zurueckfallen.

---

## 7. Datenmodell

Erweiterung zur bestehenden D1-Struktur.

### 7.1 User-Profil

Empfehlung nach Abgleich: `users` erweitern. Eine eigene Profil-Tabelle ist architektonisch sauber, aber fuer genau ein Sponsor-Profil pro User und Brand im MVP unnoetig.

```sql
ALTER TABLE users ADD COLUMN member_link TEXT;
ALTER TABLE users ADD COLUMN sponsor_display_name TEXT;
ALTER TABLE users ADD COLUMN sponsor_profile_updated_at INTEGER;
```

Anwendungsregel:

```text
member_link und sponsor_display_name sind entweder beide NULL
oder beide gesetzt.
```

D1 kann diese Pair-Constraint nur umstaendlich erzwingen. Deshalb wird sie im Endpoint `PUT /api/me/sponsor-profile` validiert.

**[Claude]** Detaillierte Fallunterscheidung der Pair-Constraint:

- **Beide gefuellt:** CTA-Button im Viewer wird angezeigt. Der Interessent sieht *"Jetzt LifePlus-Member bei 'Dirk Triltsch' werden →"* und der Klick fuehrt zum Member-Link.
- **Beide leer:** CTA-Button komplett ausgeblendet. Der Viewer zeigt nur das Szenario, keine Sponsor-Anwerbung. Sinnvoll fuer User, die den Simulator nur fuer sich nutzen.
- **Nur eins gefuellt:** waere kaputt — entweder Button-Text mit Sponsor-Name aber ohne Ziel-Link, oder Button ohne Anzeige-Name. Daher abgelehnt mit `400 sponsor_profile_inconsistent`.

### 7.2 Kundenlinks

```sql
CREATE TABLE shared_scenarios (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  recipient_hint TEXT,
  inputs_json TEXT NOT NULL,
  member_link_snapshot TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  open_count INTEGER NOT NULL DEFAULT 0,
  member_link_click_count INTEGER NOT NULL DEFAULT 0,
  last_opened_at INTEGER,
  last_member_click_at INTEGER,
  revoked_at INTEGER,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX shared_scenarios_owner ON shared_scenarios(owner_user_id);
CREATE INDEX shared_scenarios_expires ON shared_scenarios(expires_at);
```

Wichtig:

- Kein `recipient_email`, keine Telefonnummer.
- Keine Szenario-Daten im Link selbst.
- `recipient_hint` ist nur eine freiwillige Notiz des Users.
- `member_link_snapshot` wird beim Erstellen eingefroren.
- `token_hash` reicht fuer V1, weil der Token multi-use bis Ablauf ist.

**[Claude]** Der versendete Link enthaelt nur die opake Scenario-ID und ein Random-Token (`https://app.lifeflow360.app/share/a3f...?t=...`). Keine E-Mail, kein Name, kein Hash, kein Berater-Identifier. Damit ist der Link an sich nicht-aussagekraeftig — wer ihn abfaengt (Logs, Screenshots im Messenger) bekommt keine PII, sondern nur den Zugang zu einer aufrufgeschuetzten Szenario-Ansicht.

### 7.3 Zugriffstokens

Eine eigene Token-Tabelle ist fuer V1 nicht noetig. Der Kundenlink ist kein Single-Use-Login, sondern ein 7 Tage gueltiger Share-Link. Deshalb liegt der Token-Hash direkt in `shared_scenarios`.

Falls spaeter mehrere Tokens pro Szenario gebraucht werden, z. B. "erneut teilen", "neuer Token fuer denselben Snapshot" oder "Token pro Kanal", kann eine separate Token-Tabelle nachgezogen werden.

### 7.4 Share Devices

```sql
CREATE TABLE shared_scenario_devices (
  scenario_id TEXT NOT NULL,
  device_fp TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (scenario_id, device_fp),
  FOREIGN KEY (scenario_id) REFERENCES shared_scenarios(id)
);
```

Optional kann zusaetzlich eine eigene `viewer_session`-Tabelle eingefuehrt werden, wenn das Cookie serverseitig widerrufbar sein soll. Fuer V1 reicht wahrscheinlich `shared_scenario_devices` plus signiertes/zufaelliges `viewer_session`-Cookie, solange der Viewer bei jedem API-Read Ablauf und Widerruf gegen `shared_scenarios` prueft.

### 7.5 Cleanup

Abgelaufene Shares sollten automatisch geloescht werden:

```text
taeglicher Cron:
DELETE FROM shared_scenario_devices WHERE scenario_id IN (...)
DELETE FROM shared_scenarios WHERE expires_at < now - 7 Tage Karenz
```

Offene Entscheidung: Sollen `open_count` und `member_link_click_count` vorher aggregiert gespeichert werden, oder ist Loeschung nach kurzer Karenz fachlich gewollt?

---

## 8. Member-Link-Allowlist

**[Claude]** Diese Sektion war im Codex-Entwurf nur als Anforderung erwaehnt; die folgende Implementierungs-Skizze stammt aus dem Claude-Entwurf.

Der Member-Link muss auf eine **erlaubte Host-Domain** zeigen. Die Allowlist ist pro Brand im Code hardcoded (eindeutig pro Deployment, kein Konfig-Drift), mit optionalem Env-Var-Override fuer Staging.

Vorschlag fuer LifeFlow360 (`packages/product-lifeplus/src/sponsorAllowlist.ts`):

```typescript
export const SPONSOR_LINK_ALLOWLIST: string[] = [
  'eqology.com',
  '*.eqology.com',
];
```

Override via Env-Var `ALLOWED_MEMBER_LINK_HOSTS` (Komma-getrennt), falls in Staging mal abweichend getestet werden muss.

Implementierung in `functions/api/me/sponsor-profile.ts`:

```typescript
function hostMatches(host: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".eqology.com"
    return host === pattern.slice(2) || host.endsWith(suffix);
  }
  return host === pattern;
}
```

Warum: Schuetzt davor, dass jemand mit gekapertem Sponsor-Konto den Member-Link auf eine Phishing-Seite umbiegt, die wie Eqology aussieht aber Kreditkartendaten abfischt.

Falls der Host nicht matched: `400 invalid_member_link_host` mit Klartext-Fehlermeldung im UI: *"Diese Domain ist nicht erlaubt. Aktuell freigegeben: eqology.com. Bitte kontaktiere den Support, falls dein Member-Link auf einer anderen Domain liegt."*

**[Codex]** Hinweis aus dem Master: vor Umsetzung sollten die echten LifePlus-/Eqology-Signup-Domains gesammelt werden — Linkvarianten koennen wechseln, und ein zu enger Default sperrt User aus.

---

## 9. API-Vorschlag

### Account

```text
GET /api/me
PUT /api/me/sponsor-profile
```

Payload:

```json
{
  "sponsorDisplayName": "Dirk Triltsch",
  "memberLink": "https://..."
}
```

Regeln:

- Beide Werte gesetzt oder beide `null`.
- `memberLink`: `https://`, max. 2048 Zeichen, Host auf Allowlist.
- `sponsorDisplayName`: 1 bis 80 Zeichen, HTML wird escaped oder abgelehnt.
- Fehler bei halbem Profil: `400 sponsor_profile_inconsistent`.
- Fehler bei falscher Domain: `400 invalid_member_link_host`.

### Kundenlinks fuer User / Berater

```text
POST   /api/scenarios/share
GET    /api/scenarios/share/list      # V2-UI, Backend optional schon V1
DELETE /api/scenarios/share/:id
```

`POST /api/scenarios/share`:

```json
{
  "recipientHint": "Webinar 24.5.",
  "inputs": { "...": "..." }
}
```

Antwort:

```json
{
  "id": "a3f...",
  "link": "https://app.lifeflow360.app/share/a3f...?t=...",
  "memberRedirectLink": "https://app.lifeflow360.app/r/m/a3f...",
  "expiresAt": 1780000000000
}
```

### Kundenlink fuer Interessenten

```text
GET /share/:id?t=...           # Splash + Turnstile, danach Viewer
GET /api/scenarios/view/:id    # JSON fuer Viewer nach viewer_session
GET /r/m/:scenarioId           # Turnstile-gated Redirect zum Member-Link
```

`GET /api/scenarios/view/:id` liefert nach gueltiger Viewer-Session:

```json
{
  "scenario": { "...": "..." },
  "editableFields": [],
  "expiresAt": 1780000000000,
  "owner": {
    "sponsorDisplayName": "Dirk Triltsch",
    "hasSponsorCta": true,
    "memberRedirectLink": "/r/m/a3f..."
  }
}
```

`GET /r/m/:scenarioId`:

- Prueft Ablauf und Widerruf.
- Verlangt eine gueltige Turnstile-/Viewer-Session oder rendert die Splash-Page.
- Inkrementiert `member_link_click_count`.
- Redirected mit `302` zum `member_link_snapshot`.

**[Claude]** Beispielimplementierung des Redirects als Cloudflare Pages Function:

```typescript
// functions/r/m/[scenarioId].ts
export const onRequest: PagesFunction<Env> = async ({ params, env, ctx }) => {
  const id = params.scenarioId as string;
  const row = await env.DB.prepare(
    `SELECT member_link_snapshot, expires_at, revoked_at
       FROM shared_scenarios WHERE id = ?`
  ).bind(id).first();

  if (!row || row.revoked_at || row.expires_at < Date.now()) {
    return new Response('Link nicht mehr gueltig', { status: 410 });
  }

  // best-effort tracking, blockiert nicht
  ctx.waitUntil(env.DB.prepare(
    `UPDATE shared_scenarios
       SET member_link_click_count = member_link_click_count + 1,
           last_member_click_at = ?
       WHERE id = ?`
  ).bind(Date.now(), id).run());

  return Response.redirect(row.member_link_snapshot, 302);
};
```

`302` (temporary) statt `301` (permanent), damit Browser den Redirect nicht cachen und Klicks nicht verloren gehen.

### `mailto:`-Vorlage

**[Claude]** Die vollstaendige URL-kodierte Vorlage fuer den "Als E-Mail weiterleiten"-Button:

```text
mailto:?subject=Dein%20pers%C3%B6nliches%20LifeFlow360-Szenario
       &body=Hallo%2C%0A%0Ahier%20ist%20das%20Szenario%2C%20das%20wir%20besprochen%20haben%3A%0A
            %0Ahttps%3A%2F%2Fapp.lifeflow360.app%2Fshare%2Fa3f...%3Ft%3D...
            %0A%0ADu%20kannst%20es%207%20Tage%20einsehen.%0A%0A
            Wenn%20du%20sofort%20starten%20m%C3%B6chtest%2C%20hier%20mein%20pers%C3%B6nlicher%20Member-Link%3A%0A
            https%3A%2F%2Fapp.lifeflow360.app%2Fr%2Fm%2Fa3f...%0A%0A
            Viele%20Gr%C3%BC%C3%9Fe%2C%0A%5BDein%20Name%5D
```

Der User traegt im eigenen Mailprogramm nur die Empfaengeradresse ein. Vorteile: keine DSGVO-Pflicht zur Verarbeitung der Adresse, kein Spam-Reputation-Risiko fuer die Resend-Domain, keine Bounce-Behandlung.

---

## 10. Magic-Link-Modell

Der Kundenlink verwendet technisch ein Magic-Link-aehnliches Muster, ist aber kein Login-Link:

- Link enthaelt `scenarioId` und Random-Token.
- DB speichert nur `token_hash`.
- Token ist multi-use bis `expires_at`.
- Share-Zugriff ist auf maximal 2 Device-Fingerprints begrenzt.
- Nach erfolgreicher Turnstile-Pruefung wird ein eigenes `viewer_session`-Cookie gesetzt.
- Das Cookie heisst bewusst nicht `session`, damit es nicht mit echten User-Sessions kollidiert.

Verworfene Alternative fuer MVP: E-Mail-OTP oder erneuter Magic Link fuer den Interessenten. Das waere sicherer gegen Weiterleitung, wuerde aber genau den spontanen Beratungs- und Messenger-Use-Case ausbremsen.

---

## 11. Member-Link in aktiven Kundenlinks

Es gibt zwei Moeglichkeiten.

### 11.1 Entscheidung: Member-Link als Snapshot speichern

Beim Erstellen eines Shares wird der damalige Member-Link in `shared_scenarios.member_link_snapshot` gespeichert.

Vorteile:

- Der Interessent landet auch Tage spaeter noch auf dem Sponsor-Ziel, das zum Beratungsmoment galt.
- Profil-Aenderungen brechen keine verschickten Links.
- Click-Tracking ueber `/r/m/:scenarioId` bleibt stabil.

Nachteil:

- Aenderungen unter "Mein Konto" wirken nicht auf bereits erstellte Shares.

Bewertung: Das ist fachlich trotzdem besser. "Real-time Sync" gilt fuer das Sponsor-Profil des Users auf seinen eigenen Geraeten und fuer neue Shares, nicht fuer historische Kundenlinks.

### 11.2 Korrektur alter Shares

Im MVP gibt es keine Bearbeitung von `member_link_snapshot`. Wenn ein User einen falschen Member-Link geteilt hat, soll er den Share widerrufen und neu erzeugen. Eine spaetere Admin-/Support-Korrektur ist moeglich, aber nicht V1.

Optional kann ein kleines Audit-Log helfen:

```sql
CREATE TABLE member_link_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  old_member_link TEXT,
  new_member_link TEXT,
  changed_at INTEGER NOT NULL
);
```

---

## 12. Bot-Schutz mit Cloudflare Turnstile

**[Claude]** Diese Sektion fasst die Bot-Schutz-Mechanik praeziser als im Master-Entwurf — sie blieb dort eher als Anforderung in der Sicherheits-Checkliste.

### 12.1 Problem

Sobald die Szenario-Links in Messengern unterwegs sind, scannen Link-Preview-Bots (WhatsApp, Telegram, Slack, Discord, Mail-Provider) sie automatisch. Ohne Schutz wuerde das:

- den `open_count` falsch hochtreiben (Berater glaubt, der Lead schaut staendig rein, dabei ist es ein Scanner-Bot),
- bei boesartigen Scrapern den Member-Link-Redirect ausloesen (faelscht `member_link_click_count`),
- Geraete-Slots im Limit verbrauchen (zwei Bot-Fingerprints — echter Interessent ist ausgesperrt).

### 12.2 Loesung: Splash-Page mit Turnstile

Beim ersten Aufruf von `/share/{id}?t=...` rendert der Server eine Splash-Page mit Cloudflare Turnstile-Widget und sichtbarem Branding:

```text
┌──────────────────────────────────────────────────┐
│            [ LifePlus-Logo ]                     │
│                                                  │
│   Persoenliches Szenario fuer dich               │
│   von Dirk Triltsch                              │
│                                                  │
│   [ Turnstile-Widget (Managed Mode) ]            │
│                                                  │
│   Einen Moment — wir bereiten dein               │
│   Szenario vor...                                │
└──────────────────────────────────────────────────┘
```

Inhalt:

- LifeFlow360-Logo oben (Brand-Vertrauen sofort sichtbar).
- "Persoenliches Szenario fuer dich von *{sponsor_display_name}*" — falls Sponsor-Profil gesetzt; sonst nur "Persoenliches Szenario fuer dich".
- Turnstile-Widget im Managed Mode (Cloudflare entscheidet pro Request, ob unsichtbar oder interaktiv).
- Kurze Wartetext-Zeile.

Der Sponsor-Name wird vor der Bot-Pruefung gezeigt — das ist akzeptabel, weil:

- Echte User profitieren sofort vom Vertrauenssignal.
- Scraper, die nur die Splash-HTML einsammeln, sehen einen Namen, aber **keine** Szenario-Daten und **keinen** Member-Link (beides erst nach Turnstile geladen).

Erst nach erfolgreichem Turnstile-Token (clientseitig per Widget, serverseitig per Siteverify-Call gegen `https://challenges.cloudflare.com/turnstile/v0/siteverify`) wird:

- ein `viewer_session`-Cookie gesetzt,
- `open_count` inkrementiert,
- der Fingerprint in `shared_scenario_devices` eingetragen (Geraete-Limit-Check),
- auf den eigentlichen Viewer redirected.

Bots bleiben auf der Splash-Page haengen und verbrauchen keinen Geraete-Slot.

### 12.3 Warum Turnstile statt reCAPTCHA/hCaptcha

- Laeuft nativ auf Cloudflare — keine externe Abhaengigkeit, keine zusaetzliche Latenz.
- DSGVO-freundlich (Cloudflare verarbeitet keine biometrischen Daten wie reCAPTCHA v3, keine Cookies fuer Dritte).
- Managed Mode loest fuer ~95 % der echten User unsichtbar aus, nur verdaechtige Sitzungen bekommen ein interaktives Challenge.
- Kostenmodell: siehe Punkt 6 oben in Sektion 1 — laut Cloudflare-Marketing kostenlos und unbegrenzt, vor Go-live nochmal verifizieren.

Auch der `/r/m/{scenarioId}`-Redirect ist durch Turnstile-Cookie gehaertet: nur wer eine gueltige `viewer_session` hat (also durch Turnstile durch ist), darf den Redirect ausloesen und damit `member_link_click_count` erhoehen.

---

## 13. E-Mail, WhatsApp und Telegram

**[Codex]** Diese ausfuehrliche Optionen-Diskussion war ausschliesslich im Master-Entwurf; Claude hatte das auf "entfaellt" reduziert. Sie bleibt erhalten, weil sie die Begruendung fuer das MVP-Scope liefert und die V4-Optionen vorbereitet.

### 13.1 E-Mail

E-Mail bleibt ein wichtiger Kanal, aber nicht als Serverversand.

MVP:

- App erzeugt `mailto:?subject=...&body=...`.
- User traegt Empfaenger in seinem eigenen Mailprogramm ein.
- Unsere API speichert keine Empfaengeradresse.
- Resend wird fuer diesen Use-Case nicht verwendet.

Vorteile:

- Keine Bounce-Behandlung.
- Keine Spam-Reputation auf der eigenen Domain.
- Weniger personenbezogene Daten in D1.
- User kann persoenlich formulieren und von seiner Adresse senden.

Schwaeche:

- Weniger Automatisierung und kein sicherer Versandstatus.

### 13.2 WhatsApp

Es gibt zwei Varianten, fuer MVP gilt aber nur die erste.

**Variante 1: Share-Intent ohne API**

Die App erzeugt einen normalen Kundenlink und oeffnet:

```text
https://wa.me/?text=...
```

Der User versendet die Nachricht selbst aus WhatsApp.

Vorteile:

- Schnell umsetzbar.
- Keine WhatsApp Business API noetig.
- User kontrolliert persoenlichen Text.

Nachteile:

- Telefonnummer wird nicht serverseitig verifiziert.
- Versandstatus ist nicht verlaesslich bekannt.
- Link kann leichter weitergeleitet werden.

Empfehlung: **ausreichend fuer MVP**, mindestens als Copy-Workflow. Ein expliziter WhatsApp-Share-Button kann spaeter ergaenzt werden.

**Variante 2: WhatsApp Business Platform**

Das Backend sendet Nachrichten ueber die offizielle WhatsApp Business API.

Vorteile:

- Professioneller Versand.
- Telefonnummer als Zieladresse.
- Templates und Status moeglich.

Nachteile:

- Business-Verifikation, Template-Freigaben, Opt-in-Anforderungen.
- Laufende Kosten.
- Mehr Compliance- und Support-Aufwand.
- Fuer freie Beratungstexte oft unpraktisch.

Empfehlung: erst pruefen, wenn E-Mail/Share-Intent produktiv funktioniert und WhatsApp klar als Hauptkanal gebraucht wird.

### 13.3 Telegram

Telegram ist technisch flexibler, aber produktseitig schwieriger:

- Bots duerfen Nutzer meist erst anschreiben, nachdem der Nutzer den Bot gestartet hat.
- Telefonnummern sind nicht automatisch ein sauberer Zustellweg.
- Ein Telegram-Link kann als Share-Intent funktionieren, aber nicht als verlaesslicher Magic-Link-Kanal fuer beliebige Telefonnummern.

Empfehlung: nur als manueller Share-Link:

```text
https://t.me/share/url?url=...&text=...
```

### 13.4 SMS

SMS ist als Fallback moeglich, z. B. ueber Twilio, MessageBird oder einen deutschen/europaeischen Anbieter.

Vorteile:

- Funktioniert ohne App.
- Telefonnummer als Zielkennung.

Nachteile:

- Kosten pro Nachricht.
- Missbrauchsrisiko.
- Weniger elegant fuer lange Links.
- DSGVO/Opt-in und Logging muessen sauber sein.

Empfehlung: nicht fuer MVP, eventuell spaeter fuer "Link nochmal senden".

---

## 14. Sicherheit und Datenschutz

Mindestregeln:

- Tokens nur gehasht speichern, wie bei bestehenden Magic Links.
- Kundenlinks laufen nach 7 Tagen ab.
- Kundenlinks koennen vom User widerrufen werden.
- Maximal 2 Share Devices pro Kundenlink.
- Rate-Limits auf Token-Verify und Versand.
- Rate-Limit fuer Share-Erstellung: initial max. 5 Shares pro User pro Tag.
- Rate-Limit fuer Member-Link-Redirect: z. B. 30 Klicks pro Minute pro Scenario-ID.
- Cloudflare Turnstile vor Viewer und vor `/r/m/`-Redirect.
- Keine geheimen Provisions-/Payment-Daten im Link selbst.
- Szenario-Daten nicht in Query-Parametern speichern.
- Viewer Session als HttpOnly Secure SameSite-Cookie setzen.
- Owner kann Links widerrufen; eine sichtbare aktive Share-Liste ist V2.
- Keine E-Mail-Adresse/Telefonnummer des Interessenten im MVP speichern.
- `recipient_hint` klar als freiwillige Notiz kennzeichnen.
- Sponsor-Name und Member-Link nur anzeigen, wenn das Sponsor-Profil vollstaendig ist.
- Member-Link-Host per Allowlist pruefen.

DSGVO-Hinweis:

Das MVP vermeidet bewusst Empfaenger-Kontaktdaten. Trotzdem koennen personenbezogene Daten entstehen:

- `sponsor_display_name` wird dem Interessenten und vor Turnstile auf der Splash-Page angezeigt.
- `recipient_hint` kann vom User personenbezogen befuellt werden.
- Device-Fingerprint-Hash ist fuer 7 Tage plus Karenz mit einem Share verknuepft.

Die UI sollte deshalb beim Notizfeld kurz sagen: "Nur fuer dich sichtbar. Bitte keine Klarnamen Dritter eintragen, wenn nicht noetig."

**[Codex]** Konsistent mit `project-brand-separation`: jedes Brand-Deployment hat seine eigene `shared_scenarios`-Tabelle (eigene D1). Ein FitFlow360-User kann nichts an einen LifeFlow360-Bestand teilen. Der `member_link` ist pro User und Brand (eine Person mit zwei Brand-Konten hat zwei Member-Links).

---

## 15. Produktoptionen

**[Codex]** Dieser Abschnitt war nur im Master-Entwurf und verbindet das Konzept mit dem Freemium-/Pricing-Modell (siehe `Freemium-Modell.md`).

### Option 1: Kundenlink nur fuer Pro-User

Vorteile:

- Starker Pro-Mehrwert.
- Weniger Missbrauch im Free-Tier.
- Passt zu Beratung/Vertrieb als zahlungsnahem Feature.

Nachteil:

- Free-User koennen den Empfehlungs-Funnel nicht testen.

Empfehlung: **Ja fuer MVP** oder Trial/Pro. Optional Free nur mit 1 Testlink pro Monat, falls das Feature als Upgrade-Trigger dienen soll.

### Option 2: Kundenlink als Trial-/Conversion-Feature

Free- oder Trial-User duerfen wenige Kundenlinks versenden.

Vorteile:

- Zeigt Mehrwert direkt.
- Kann Upgrades antreiben.

Nachteile:

- Mehr Abuse-Risiko.
- Mehr Link-/Turnstile-/D1-Traffic.
- Share-Funktion koennte als kostenloser Vertriebskanal missbraucht werden.

Empfehlung: spaeter testen.

### Option 3: Interessent kann eigenes Konto aus Szenario erstellen

Nach dem Oeffnen kann der Interessent sagen:

```text
Dieses Szenario in meinem LifePlus-Simulator speichern
```

Dann startet der normale Magic-Link-Signup. Der Scenario-Snapshot wird nach dem Login in sein Konto kopiert.

Empfehlung: **nicht MVP**, aber sehr gute Phase-3-Conversion.

### Option 4: Turnstile-Gating fuer Member-Link-Redirect lockern

Wenn sich zeigt, dass echte Interessenten beim direkten Klick auf den Member-Link-Redirect abspringen, kann `/r/m/:scenarioId` ohne Turnstile ausliefern und nur das Click-Tracking client-/serverseitig entwerten. Das waere conversion-freundlicher, aber die Statistik wird wieder anfaelliger fuer Bots.

---

## 16. UI-Vorschlag

### Mein Konto

- Feld "Sponsor-Name".
- Feld "LifePlus Member-Link".
- "Speichern".
- "Beide loeschen".
- "Member-Link kopieren".
- "Per E-Mail weiterleiten".
- V2: Liste "Aktive Kundenlinks" mit:
  - Interessent,
  - erstellt am,
  - laeuft ab,
  - zuletzt geoeffnet,
  - widerrufen.

### Simulator

- Button "Szenario teilen", zwischen den vorhandenen Topbar-Buttons "Chart" und "Netzwerk".
- Dialog mit Notiz und erzeugtem Link (siehe Mockup in Sektion 5.2).
- Hinweis, wenn kein Member-Link gespeichert ist.
- Copy-Buttons: Szenario-Link, Member-Link, beide.
- `mailto:`-Button.

### Interessenten-Viewer

- Fokus auf Szenario, Chart und wichtigste Kennzahlen.
- Klare Restlaufzeit: "Verfuegbar bis ...".
- Sponsor-Name sichtbar, wenn Sponsor-Profil gesetzt ist.
- CTA: "Jetzt LifePlus-Member bei {sponsor_display_name} werden".
- Kein CTA, wenn Sponsor-Profil leer ist.
- Read-only Controls im MVP.

---

## 17. Roadmap

### Phase 1: MVP Clipboard / mailto

- Sponsor-Profil im User speichern.
- Kundenlink erzeugen und lokal teilbar machen.
- Scenario Snapshot speichern.
- Shared Scenario Viewer.
- 7 Tage Ablauf.
- 2 Geraete.
- Widerruf.
- Turnstile-Splash.
- Member-Link-Redirect mit Click-Tracking.

**[Claude]** Konkrete Schritt-Reihenfolge mit Aufwandsschaetzung fuer Phase 1:

| # | Schritt | Aufwand |
|---|---------|---------|
| 1 | Sponsor-Profil in `users` + AccountPanel + atomarer Endpoint | ~1 Tag |
| 2 | `shared_scenarios`/`devices`-Tabellen, Share-Dialog, Viewer (read-only), Topbar-Button | ~3 Tage |
| 3 | `/r/m/:id`-Redirect mit Click-Tracking, CTA-Button im Viewer | ~0,5 Tag |
| 4 | Turnstile-Site-Key registrieren, Splash-Page, Siteverify-Aufruf | ~0,5 Tag |
| 5 | Cleanup-Cron fuer abgelaufene Shares | ~0,5 Tag |
| | **Summe** | **~5–6 Tage netto** |

### Phase 2: Komfort

- "Per WhatsApp teilen" und "Per Telegram teilen" als Share-Intent, falls Copy nicht reicht.
- Kundenlink-Verwaltung im AccountPanel.
- Einfache Oeffnungsstatistik.
- Erneut senden.
- Erste editierbare Felder als Experiment.

### Phase 3: Conversion

- Interessent kann Szenario in eigenen Account uebernehmen.
- Kundenlink kann Free/Trial-Signup starten.
- Reminder vor Ablauf.
- A/B-Test verschiedener E-Mail-Texte.

### Phase 4: Messenger API

- WhatsApp Business Platform nur bei klarem Bedarf.
- SMS-Fallback optional.
- Opt-in und Template-Prozess sauber definieren.

---

## 18. Offene Entscheidungen

1. Duerfen nur Pro-User Kundenlinks versenden?
2. Welche exakten Felder darf der Interessent in V2 aendern?
3. Soll der Interessent seine geaenderte Variante an den User zuruecksenden koennen?
4. Wird die User-E-Mail als Kontakt angezeigt oder nur Sponsor-Name und Member-Link?
5. Soll der Kundenlink nur an Geraete gebunden sein, oder spaeter optional an eine Empfaenger-E-Mail?
6. Welche LifePlus-/Eqology-Domains sind fuer Member-Links erlaubt? (Vor Go-live konkret listen, siehe Sektion 8.)
7. Sind 5 Shares pro Tag ausreichend, oder soll ein Pro-Tarif hoehere Limits bekommen?
8. Werden Click-Stats nach Ablauf aggregiert oder geloescht?
9. Wie stark darf Turnstile den direkten `/r/m/`-Redirect abbremsen?
10. Turnstile-Kosten vor Go-live verifizieren (siehe Sektion 1 Punkt 6).

---

## 19. Final-Entscheidungen-Tabelle

**[Claude]** Diese Uebersicht stammt aus dem Claude-Entwurf v4 und fasst die getroffenen Entscheidungen kompakt zusammen, ergaenzt um Master-Punkte.

| # | Punkt | Entscheidung |
|---|-------|--------------|
| 1 | Brand-Scope MVP | nur LifeFlow360, FitFlow360/EqoFlow360 spaeter |
| 2 | CTA-Text im Viewer | "Jetzt LifePlus-Member bei *{sponsor_display_name}* werden →" |
| 3 | Sponsor-Profil | `sponsor_display_name` + `member_link` als Paar (beide oder keiner). Wenn leer → CTA-Button ausgeblendet, kein Fallback-Text |
| 4 | API | atomarer `PUT /api/me/sponsor-profile` mit Pair-Constraint |
| 5 | Member-Link-Allowlist | hardcoded pro Brand (`SPONSOR_LINK_ALLOWLIST` in `packages/product-lifeplus/src/`), Env-Var-Override moeglich. Default fuer LifePlus: `eqology.com`, `*.eqology.com` |
| 6 | Editierbare Felder im Viewer (V1) | komplett read-only (Option A in Sektion 6) |
| 7 | Aenderungen des Interessenten persistieren | nein |
| 8 | Keine Daten im Link | nur opake Scenario-ID + Random-Token, alles weitere DB-seitig |
| 9 | Copy-Optionen | drei Buttons: Szenario-Link / Member-Link / Beide |
| 10 | Rate-Limit | max. 5 Shares pro Sponsor pro Tag |
| 11 | Bot-Schutz | Cloudflare Turnstile (Managed Mode) vor Viewer und vor `/r/m/`-Redirect |
| 12 | Splash-Page | LifeFlow360-Logo + "Persoenliches Szenario fuer dich von *{sponsor}*" + Turnstile-Widget |
| 13 | Aktive-Shares-Liste mit Klick-Stats | nicht im MVP, V2. Daten werden aber ab Tag 1 gespeichert |
| 14 | WhatsApp/Telegram/SMS-Provider | nicht im MVP, ggf. spaeter — Clipboard-Workflow reicht |
| 15 | Member-Link-Snapshot bei Share | wird beim Erstellen eingefroren, MVP keine nachtraegliche Bearbeitung |
| 16 | Kundenlink-Verfuegbarkeit (Pro/Free) | offen, siehe Sektion 15 Option 1 und 2 |

---

## 20. Technische Empfehlung in einem Satz

Kundenlinks sollten als befristete, serverseitig gespeicherte Scenario-Snapshots mit opakem Token, Turnstile-Splash, Device-Limit und Member-Link-Redirect umgesetzt werden; der MVP verschickt nichts serverseitig, sondern erzeugt Clipboard- und `mailto:`-Links, waehrend Sponsor-Name und Member-Link als gekoppeltes Profilpaar nur fuer neue Shares gesnapshottet werden.
