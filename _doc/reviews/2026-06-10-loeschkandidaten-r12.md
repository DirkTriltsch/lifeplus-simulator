# R12 - Loeschkandidaten

**Stand:** 2026-06-10  
**Status:** aktualisierte Vorschlagsliste, noch keine Loeschfreigabe  
**Basis:** aktueller Workspace per `rg --files` am 2026-06-10, [`../adr-2026-06-10-dokumentationsstruktur-und-altlasten.md`](../adr-2026-06-10-dokumentationsstruktur-und-altlasten.md), [`2026-06-09-doku-cleanup-todo-checkliste.md`](2026-06-09-doku-cleanup-todo-checkliste.md)  
**Regel:** Ordner sind zuerst gelistet. Freigabe kann per ID erfolgen, z. B. `D01 loeschen`. Eintraege mit Vorbedingung werden erst geloescht, wenn die Vorbedingung erledigt ist.

## Aktueller Abgleich

Diese frueheren Kandidaten sind im aktuellen Workspace nicht mehr vorhanden und daher nicht mehr als offene Loeschfreigabe gelistet:

- `website-legacy/`
- `_doc/_old/`
- `benchmarks/`
- `benchmarks.zip`
- `backup-pre-0005-0006.sql`
- `backup-pre-0007.sql`
- `diag-resend.json`
- `resend-test.json`
- `tmp_files.txt`
- `_doc/business plans/eqology_business_plan_review.md`
- `_doc/business plans/fitline_business_plan_review.md`
- `_doc/business plans/fitline_business_plan_review_of_review.md`
- `_doc/business plans/fitline_marketingplan_logik.png`
- `_doc/paddle_checkout/Umsetzungsplan.md`
- `_doc/paddle_checkout/Original Overlay Checkout.png`
- `_doc/cleanup-ist-analyse-2026-06-09.md`
- `_doc/Bugfix & Security before go-live.md`
- `_doc/growth_models/Basic_model_descriptions.xlsx`

## Ordner

| ID | Pfad | Einschaetzung | Vorbedingung | Warum loeschbar |
|---|---|---|---|---|
| - | - | - | - | Aktuell keine Ordner-Loeschfreigabe offen. |

## Umschreiben statt loeschen

Diese Dateien sind keine reinen Loeschkandidaten mehr. Sie muessen in fuehrende Dokumente ueberarbeitet werden: alte Konzepte klar als historisch/ueberholt kennzeichnen, den aktuell im Code umgesetzten Stand ausfuehrlich und fuehrend beschreiben.

| ID | Pfad | Entscheidung | Auftrag |
|---|---|---|---|
| F01 | `_doc/Freemium-Modell.md` | behalten und fuehrend ueberarbeiten | Aktuelle Freemium-/Go-Live-/Produktlogik aus Code und fuehrender Doku beschreiben; alte Konzept- und Arbeitsnotizen sichtbar als historisch markieren. |
| F02 | `_doc/Freemium-Modell_Applikation.md` | behalten und fuehrend ueberarbeiten | Aktuelle Auth-, Account-, Login-, Paywall- und App-Flows beschreiben; ueberholte Vorannahmen klar abgrenzen. |
| F03 | `_doc/Konzept Kundenlinks und Szenario-Freigabe.md` | behalten und fuehrend ueberarbeiten | Aktuellen Stand zu Kundenlinks, Scenario-Sharing und Anti-Abuse aus Code/Doku ableiten; alte Varianten als Konzeptstand kennzeichnen. |
| F04 | `_doc/Konzept Paddle-Integration und App-Architektur.md` | behalten und fuehrend ueberarbeiten | Aktuelle Paddle-/Checkout-/Account-Architektur fuehrend beschreiben; Vorlauf zur B2B-v6.1-Umsetzung als historisch markieren. |
| F05 | `_doc/Netzwerk-Modellierung.md` | behalten und fuehrend ueberarbeiten | Mit `_doc/growth_models/` und aktuellem Code synchronisieren; alte Modellvarianten deutlich vom umgesetzten Personenbaum-Modell trennen. |
| F06 | `_doc/Referenznetzwerk-Tests.md` | behalten und fuehrend ueberarbeiten | Aktuelle Testlandschaft und Referenznetzwerke aus `packages/*/tests`, `tests/integration` und Growth-Doku beschreiben; alte Testplaene kennzeichnen. |
| F07 | `_doc/Rank-Badges.md` | behalten und fuehrend ueberarbeiten | Aktuellen Badge-/Rank-/UI-Stand beschreiben; nicht mehr verwendete Designvarianten als historisch markieren. |
| F08 | `_doc/Paddle_API_Commands & Scripts.md` | behalten und fuehrend ueberarbeiten | Aktuelle Paddle-Kommandos, Skripte und Runbook-Verweise konsolidieren; alte Kommandos klar als historisch oder nicht mehr zu verwenden kennzeichnen. |
| F09 | `_doc/Webcontent & Value Proposition.md` | behalten und fuehrend ueberarbeiten | Aktuellen Astro-Website-Content und Value Proposition fuehrend dokumentieren; alte Website-/Marketing-Entwuerfe kennzeichnen. |

## Dateien

| ID | Pfad | Einschaetzung | Vorbedingung | Warum loeschbar |
|---|---|---|---|---|
| - | - | - | - | Aktuell keine Datei-Loeschfreigabe offen. |

## Nicht als Loeschkandidat gelistet

| Pfad | Grund |
|---|---|
| `_doc/documentation-policy.md` | Fuehrende Doku-Regel. |
| `_doc/adr-2026-06-10-dokumentationsstruktur-und-altlasten.md` | Fuehrende Architektur-/Doku-Entscheidung. |
| `_doc/reviews/2026-06-09-doku-cleanup-todo-checkliste.md` | Aktive Cleanup-Checkliste. |
| `_doc/growth_models/01-Zielarchitektur.md` bis `04-Code-Cleanup-Plan.md`, `README.md` | Fuehrende Growth-/Simulation-Doku. |
| `_doc/paddle_checkout/checkout-billing-runbook-b2b-v6-1.md` | Fuehrendes Checkout-/Billing-Runbook. |
| `_doc/paddle_checkout/lifeplus_checkout_paddle_b2b_v6.html` | Aktive/zu behaltende Checkout-Referenz laut User. |
| `_doc/go-live/*` | Fuehrende Go-Live-/Legal-/Anti-Abuse-Listen. |
| `_doc/business plans/lifeplus_business_plan.md`, `fitline_business_plan.md`, `eqology_business_plan.md` | Aktuelle Business-Plan-Hauptdateien. |
| `_doc/business plans/fitline_marketingplan_logik.svg` | Bleibt laut User-Entscheidung zu F10. |
| `_doc/business plans/marktstudie_vergutungsplan_simulator.md` | Bleibt laut User-Entscheidung zu F11. |
| `_doc/paddle_checkout/lifeplus_checkout_paddle_b2b_setup.md` | Bleibt laut User-Entscheidung zu F13. |
| `_doc/paddle_checkout/lifeplus_checkout_legal_review_B2B_only.md` | Bleibt laut User-Entscheidung zu F14. |
| `_doc/paddle_checkout/lifeplus_checkout_paddle_b2b_v2.html` | Bleibt laut User-Entscheidung zu F15. |
| `design/` | Bleibt laut User-Entscheidung; vormals `design concepts/`. |
| `_doc/sketches/` | Bleibt laut User-Entscheidung. |
| `_doc/Setup Paddle Products, Prices, Discount-Codes.md` | Aktuelle Paddle-Setup-Referenz im User-Kontext. |
| `_doc/Setup Infrastruktur Cloudflare, Resend und IONOS.md` | Infrastruktur-Setup kann weiter als fuehrende Betriebsdoku dienen. |
| `_debug/` | Bleibt laut User-Entscheidung; gewuenschter Sammelordner fuer manuelle Debug-Tools, vormals `_doc/_debug/`. |
| `Cloudflare-Datenbank-Abfragen.md` | Bleibt laut User-Entscheidung zu F16. |
| `_debug/delete-dao-user.ps1`, `_debug/delete-dao-user.md`, `_debug/sql/delete-*.sql`, `_debug/sql/verify-dao-user-deleted.sql` | Testuser-/User-Cleanup soll laut User behalten werden; Pfade sind auf `_debug/` aktualisiert. |
| `_debug/Cloudflare-Datenbank-Abfragen.md`, `_debug/cleanup-test-users.sql`, `_debug/debug-session-lifeflow360.md` | Manuelle Debug-/Abfragehilfen liegen jetzt bewusst unter `_debug/`; nur spaeter innerhalb von `_debug/` konsolidieren, nicht als Doku-Altlast loeschen. |

## Empfohlene Freigabe-Pakete

| Paket | IDs | Kommentar |
|---|---|---|
| - | - | Aktuell keine Freigabe-Pakete offen. F01-F09 werden fuehrend ueberarbeitet; F10, F11, F13, F14, F15 und F16 bleiben; F12 ist bereits geloescht. |
