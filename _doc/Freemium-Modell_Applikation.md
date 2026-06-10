# Freemium in der App - Implementierungsstand und Drift

**Stand:** 2026-06-10
**Status:** Drift-Register fuer App-Capability (Free vs. Pro im UI); Konzept-Snapshot 2026-05-25 plus aktuelle Code-Korrekturen. Kein aktiver Implementierungsplan.
**Scope:** React-App-Zugriff, Auth-Gates, Paywall, Device-Limit und offene Capability-/Free-vs-Pro-Drift.
**Ersetzt durch (Ist-Code):** `simulator-app/src/auth/`, `simulator-app/src/components/AuthGate.tsx`, `LoginGate.tsx`, `Paywall.tsx`, `DeviceLimitGate.tsx`; Account-Seite unter `website-astro/src/shared/components/sections/AccountPageDefault.astro` plus `website-astro/src/shared/scripts/accountPage.ts`.
**Bezug:** Fuehrende Produktstrategie in [`Freemium-Modell.md`](./Freemium-Modell.md); Checkout-/Billing-Details im Runbook [`paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](./paddle_checkout/checkout-billing-runbook-b2b-v6-1.md).
**Backlog / Offene Ideen:** [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §2 — Capability-Schicht, Free-Renderer, Tests und offene Entscheidungen sind dort konsolidiert.

## 1. Kritisches Feedback auf die alte Fassung

Die alte Datei war als Architekturvorschlag nuetzlich, aber als aktuelle Implementierungsdoku irrefuehrend:

1. **Falsches Free-Modell:** Sie beschreibt Free als aktives `access_level='free'`-Entitlement, das die App mit Limits rendert. Aktuell erzeugt Free-Signup zuerst `pro/trial`; nach Trial-Ende wird `free/trial_expired` erzeugt, aber dieses faellt in der App durch `authenticated_no_entitlement` auf die Paywall.
2. **Nicht implementierte Capability-Schicht:** `useFeatures()`, `featureFlags.ts`, `Tier`, `maxVisibleYear`, `persistenceMode` usw. existieren im Code nicht.
3. **Paywall vs. Free verwechselt:** `Paywall.tsx` ist ein Auth-/Entitlement-Gate, kein Free-Renderer. Es zeigt Pricing/Portal, aber keine Jahr-1-4-Free-App.
4. **Account-Ort falsch gewichtet:** Account-/Abo-Verwaltung liegt heute in Astro (`/mein-konto.html`), nicht als React-`AccountPanel`.
5. **Pro-Regression nicht abgesichert:** Der alte Plan nennt viele Komponenten, aber der aktuelle Code hat keine Capability-Tests fuer Free vs. Pro.
6. **Doku-Hygiene:** Die alte Fassung enthielt lange Code-Skizzen, kaputte Box-Zeichen und Tiers (`ent`, `ultra`, `founder`) ohne aktuelle Produktentscheidung.

Entscheidung fuer Phase 7: Dieses Dokument bleibt als **historischer Snapshot plus Drift-Register** erhalten. Es ist kein aktueller Implementierungsplan.

## 2. Aktueller App-Zugriff

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
  +-- authenticated_active --------> Simulator-App
  +-- authenticated_past_due ------> Simulator-App (Type existiert, wird derzeit nicht erzeugt)
```

Code-Anker:

- `simulator-app/src/auth/useAuth.tsx`: `AuthProvider`, `deriveStatus(me)`.
- `simulator-app/src/auth/api.ts`: `/api/me`, Magic-Link, Logout, Billing Portal, Device APIs.
- `simulator-app/src/components/AuthGate.tsx`: entscheidet, ob Login, Device-Limit, Paywall oder App gerendert wird.
- `simulator-app/src/components/LoginGate.tsx`: verarbeitet `?token=` und `access=free`; normale Formular-Anmeldung sendet nur Login-Link fuer bestehende Accounts.
- `simulator-app/src/components/Paywall.tsx`: zeigt Pricing-Link, Billing-Portal-Button und pollt nach `?checkout=success`.
- `simulator-app/src/components/DeviceLimitGate.tsx`: zeigt aktive Geraete und kann ein anderes Geraet revoken.
- `simulator-app/src/App.tsx`: rendert die eigentliche Simulator-App und speichert Eingaben aktuell bedingungslos in `localStorage`.

## 3. Was heute wirklich umgesetzt ist

| Bereich | Ist-Stand |
|---|---|
| Login | Magic-Link-basiert; anonyme App-Nutzung wird durch `AuthGate` verhindert. |
| Free-Signup | Startet ueber Astro `/signup.html`, nicht ueber die React-App selbst. |
| Trial | Backend vergibt bei Free-Signup `pro/trial` fuer 14 Tage. |
| Trial-Ende | `/api/me` degradiert abgelaufene Trials lazy auf `free/trial_expired`. |
| Aktiver Zugang | Jeder aktive Entitlement-Eintrag rendert aktuell die volle Simulator-App. |
| Kein Entitlement / abgelaufen | `authenticated_no_entitlement` rendert `Paywall`. |
| Device Limit | `device_limit_reached` rendert `DeviceLimitGate`; Revoke kann danach refreshen. |
| Checkout-Aktivierung | Nach `post-checkout` pollt `Paywall` via `refresh()`, bis der Webhook das Pro-Entitlement gesetzt hat. |
| Account-Seite | Astro `AccountPageDefault.astro` und `accountPage.ts`, nicht React-App. |

## 4. Zentrale Drift gegen das Produktkonzept

| Drift | Auswirkung | Empfehlung |
|---|---|---|
| Kein Free-Renderer in der App | Ein User mit `free/trial_expired` sieht Paywall statt eingeschraenkter App. | Produktentscheidung klaeren: Soll Free nach Trial wirklich App-Zugriff mit Limits haben? Falls ja, Capability-Schicht bauen. |
| Kein Capability-Object | Jahr-1-4-Limit, KPI-Jahr-4, Blur/Lock und Persistenzregeln sind nicht implementierbar ohne Streu-`if`s. | Kleine Capability-Schicht nur fuer `free` vs. `pro` einfuehren; `ent`/`ultra` nicht vorwegnehmen. |
| `localStorage` immer aktiv | Free-/Trial-Downgrade kann Pro-artige lokale Zustande weiter laden. | Persistenz an Capability koppeln oder fuer Free bewusst erlauben und Produktdoku anpassen. |
| Trial-Wiederholung backendseitig moeglich | Produktregel "Trial nicht wiederholbar" ist nicht abgesichert. | Backend-Fix gehoert vor App-Capability-Arbeit in Go-Live-Backlog. |
| `authenticated_past_due` ist Type, aber kein erzeugter Status | Doku darf keine Past-Due-UX behaupten. | Entweder Status entfernen oder Backend-/Frontend-Konzept spaeter definieren. |
| Tiers `ent`, `ultra`, `founder`, `promo` nicht aktuell | Alte Datei liest sich groesser als das Produkt. | Aus dieser Datei entfernen; spaeter eigenes Konzept, wenn Business-Modell steht. |

## 5. Wenn Free-App-Limits umgesetzt werden

Minimaler Zielzustand fuer eine spaetere Implementierung:

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

**Warum Capability-Pattern statt Streu-`if`s?** Ein zentrales Capability-Objekt isoliert die Tier-Unterschiede an einer Stelle. Komponenten fragen *was sie duerfen*, nicht *wer der User ist*. Dadurch:

- Jahr-1-4-Limit, KPI-Jahr-4, Blur/Lock und Persistenzregeln sind an einer Stelle aenderbar.
- Neue Tiers (`ent`, `ultra`) waeren spaeter als zusaetzliche Capability-Maps anbaubar, ohne Komponenten anzufassen.
- Tests koennen Capabilities mocken, statt das gesamte Auth-System.

Anti-Pattern:

```tsx
// Schlecht (skaliert nicht):
const tier = useTier();
if (tier === 'free') return <BlurredChart />;
else return <FullChart />;

// Besser (Capability-Pattern):
const features = useFeatures();
return <Chart maxVisibleYear={features.maxVisibleYear} />;
```

Empfohlene MVP-Capabilities:

| Capability | Free | Pro / Trial |
|---|---|---|
| `maxVisibleYear` | 4 | 10 |
| `kpiYear` | 4 | 10 |
| `canUseLocalPersistence` | offen: `false` oder `session` | `true` |
| `showUpgradeCta` | `true` | `false` |
| Inputs | unveraendert | unveraendert |
| Reality-Strategien | unveraendert | unveraendert |

Wichtig: Trial wird produktfachlich wie Pro behandelt, solange aktiv.

## 6. Betroffene Komponenten bei spaeterer Umsetzung

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

Nicht zuerst bauen: `ent`, `ultra`, Team-Features, Founder-Badges, Promo-Badges. Diese Begriffe bleiben ausserhalb des App-MVP.

## 7. Tests und Akzeptanzkriterien

Vor einer Free-Capability-Implementierung braucht es Tests fuer beide Seiten:

| Fall | Erwartung |
|---|---|
| Aktiver Trial | rendert volle Pro-App. |
| Aktive Subscription | rendert volle Pro-App. |
| Abgelaufener Trial, falls Free-App beschlossen | rendert App mit Free-Capabilities, nicht Paywall. |
| Abgelaufener Trial, falls kein Free-App-Zugriff beschlossen | rendert Paywall; Produktdoku muss das so sagen. |
| Pro-User nach Capability-Einfuehrung | Jahr-10-KPI, Chart, Visualisierungen und Persistenz bleiben unveraendert. |
| Free-User | Jahr 1-4 sichtbar, Jahr 5-10 begrenzt, Upgrade-CTA sichtbar. |
| Lokaler Pro-State + Free-Zugang | Free darf keine unlimitierte Pro-Ansicht aus `localStorage` wiederherstellen. |

## 8. Offene Entscheidungen

1. Soll `free/trial_expired` die App eingeschraenkt rendern oder weiter Paywall zeigen?
2. Wird `free/free_signup` als dauerhafter Free-Zugang aktiv gebraucht, oder bleibt Free in v1 nur "Trial plus Paywall danach"?
3. Soll Free lokale Persistenz komplett deaktivieren, auf Session begrenzen oder wie Pro erlauben?
4. Wird die Trial-Wiederholung zuerst im Backend gesperrt?
5. Soll der Free-Capability-Plan in diese Datei zurueckkehren oder als neues Umsetzungs-Ticket/ADR entstehen?

## 9. Historischer Kontext

Die alte Konzeptfassung in [`Freemium-Modell_Applikation.md`](./Freemium-Modell_Applikation.md) (vor 2026-06-10) und in [`_offene Tasks und offene Ideen.md`](./_offene%20Tasks%20und%20offene%20Ideen.md) §2.7 enthaelt einen ausfuehrlichen Vorschlag fuer:

- `Tier = free | pro | ent | ultra`,
- `featureFlags.ts`,
- `useFeatures()`,
- `maxVisibleYear`, `yearBlurStart`, `yearLockStart`,
- Trial-/Promo-/Founder-Badges,
- Ent-/Ultra-Team-Features.

Dieser Vorschlag ist **nicht** der aktuelle Codezustand und nicht als freigegebener Implementierungsplan zu lesen. Falls Free-App-Limits tatsaechlich gebaut werden, sollte nur der kleine Free/Pro-Capability-Kern aus Abschnitt 5 neu aufgegriffen werden.
