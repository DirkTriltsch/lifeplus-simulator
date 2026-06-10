# Arbeitsplan Phase 7 - Update Leading Documents

**Stand:** 2026-06-10
**Status:** aktiv, kritisch ueberarbeitet
**Scope:** Inhaltliche Ueberarbeitung der neun in [`2026-06-10-loeschkandidaten-r12.md`](2026-06-10-loeschkandidaten-r12.md) als "behalten und fuehrend ueberarbeiten" markierten Dateien F01-F09. `_doc/Webcontent & Value Proposition.md` ist dabei **R12-F09**; das Review-Finding **F-12** benennt denselben Drift-Cluster mit alten `website/templates/*`-Links.
**Bezug:** [`2026-06-10-kritisches-doku-review.md`](2026-06-10-kritisches-doku-review.md) F-03 und F-12; [`2026-06-09-doku-cleanup-todo-checkliste.md`](2026-06-09-doku-cleanup-todo-checkliste.md) Phase 7.

## 1. Kritisches Feedback auf den bisherigen Plan

Der erste Plan war als Arbeitsrahmen brauchbar, hatte aber vier Probleme:

1. **ID-Vermischung:** `Webcontent & Value Proposition.md` wurde als "F09 (= F12)" gefuehrt. Korrekt ist: R12-F09 ist die Datei, Review-F-12 ist ein Finding zu dieser Datei.
2. **Zu viel Duplikat-Risiko:** Permanente `_updated.md`-Dateien neben den Originalen wuerden die Doku-Altlast kurzfristig verdoppeln. Sie sind nur als Review-Zwischenstand erlaubt und muessen nach Freigabe ersetzt, verworfen oder geloescht werden.
3. **Unbelegte Beschlussformulierung:** "User-Beschluss" war zu stark formuliert. Der Plan haelt jetzt eine Arbeitsentscheidung fest; finale Ersetzung/Loeschung bleibt Freigabe-Sache.
4. **Zu vage Code-Anker:** Einige Anker waren Platzhalter (`functions/api/...`, `simulator-app/src/...`) oder verpassten wichtige reale Dateien. Die Tabelle unten nennt konkrete Einstiegsdateien und markiert unklare Bereiche explizit.

## 2. Ziel

Aus den neun Dateien sollen klare Dokumente entstehen:

- **fuehrend**, wenn sie den aktuellen Code-/Produktstand besser erklaeren als jede andere Quelle,
- **historisch**, wenn der Wert hauptsaechlich im alten Konzeptstand liegt und ein aktueller Master existiert,
- **loeschbar**, wenn weder aktueller Fuehrungswert noch historischer Mehrwert bleibt.

Halb-Status (alter Body plus duenner Hinweis-Banner) ist kein Zielzustand.

## 3. Ergebnisform je Datei

| ID | Datei | Arbeitsentscheidung | Konkrete Einstiegsanker | Ergebnisform |
|---|---|---|---|---|
| F01 | `_doc/Freemium-Modell.md` | **konsolidiert** | Code-Anker siehe `_doc/_offene Tasks und offene Ideen.md` §1 | Inhalte nach User-Entscheidung 2026-06-10 in `_doc/_offene Tasks und offene Ideen.md` §1 konsolidiert; Originale und Updated bleiben als historischer Kontext. |
| F02 | `_doc/Freemium-Modell_Applikation.md` | **konsolidiert** | Code-Anker siehe `_doc/_offene Tasks und offene Ideen.md` §2 | Inhalte nach User-Entscheidung 2026-06-10 in `_doc/_offene Tasks und offene Ideen.md` §2 konsolidiert; Originale bleiben. |
| F03 | `_doc/Konzept Kundenlinks und Szenario-Freigabe.md` | **konsolidiert** (Konzept-Master / nicht implementiert) | Code-Befund: nichts implementiert | Inhalte nach User-Entscheidung 2026-06-10 in `_doc/_offene Tasks und offene Ideen.md` §3 konsolidiert; Originale und Updated bleiben als v3-Detailspezifikation. |
| F04 | `_doc/Konzept Paddle-Integration und App-Architektur.md` | fuehrend, aber stark reduzieren | `functions/api/billing/*`, `functions/api/paddle/webhook.ts`, `functions/_lib/paddle.ts`, `functions/_lib/paddle-sig.ts`, `migrations/0005_checkout_intents.sql` bis `0009_checkout_intents_guest.sql`, `wrangler.toml`, `website-astro/src/brands/*/brand.yaml`, Runbook B2B-v6.1 | kompakter Architektur-Master; alte Optionen nur als kurzer historischer Abschnitt |
| F05 | `_doc/Netzwerk-Modellierung.md` | historisch mit Pointer | `_doc/growth_models/01-Zielarchitektur.md`, `02-Wachstums-und-Churn-Regeln.md`, `03-Benchmark-Status-B1-B2.md`, `packages/simulator-core/src/person-tree.ts`, `tree-generator.ts`, `simulation.ts` | historisch, wenn Growth-Doku alles Aktuelle traegt |
| F06 | `_doc/Referenznetzwerk-Tests.md` | fuehrend, kuerzer | `tests/integration/person-tree-reality.test.ts`, `tests/contracts/product-pack.test.ts`, `packages/product-lifeplus/tests/*`, `packages/simulator-core/tests/*`, `simulator-app/src/components/*/*.test.ts` | aktueller Test-Index und Referenzdaten-Regeln; alte Testplaene in Anhang |
| F07 | `_doc/Rank-Badges.md` | historisch oder loeschbar nach Review | `simulator-app/src/components/RankBadge.tsx`, `simulator-app/src/components/lineage/RankIcon.tsx`, `simulator-app/src/components/lineage/rankStats.ts`, `packages/product-lifeplus/src/ranks.ts`, `packages/product-lifeplus/tests/reference-rank.test.ts` | bevorzugt historisch/loeschbar; Code bleibt Single Source |
| F08 | `_doc/Paddle_API_Commands & Scripts.md` | fuehrend oder in Runbook integrieren | `rg --files scripts _debug functions | rg "paddle|checkout|billing"`, `functions/api/paddle/webhook.ts`, `functions/api/billing/*`, `_doc/paddle_checkout/checkout-billing-runbook-b2b-v6-1.md` | nur aktuelle Kommandos behalten; alte Kommandos als "nicht mehr verwenden" markieren oder streichen |
| F09 | `_doc/Webcontent & Value Proposition.md` | fuehrend auf Astro-Stand | `website-astro/src/brands/*/content/*.yaml`, `website-astro/src/brands/*/pages/*`, `website-astro/src/shared/components/sections/IndexPageDefault.astro`, `FeaturesPageDefault.astro`, `PricingPageDefault.astro`, `CheckoutPage.astro`, `SignupPage.astro` | aktueller Content-/Value-Master; alte `website/templates/*`-Analyse nur historisch oder entfernen |

## 4. Ablauf und Gates

```text
Gate 0  Plan korrigiert und akzeptiert
   |
   v
Pilot   F01 Freemium-Modell
   |
   v
Paket A F02 Freemium-App
   |
   v
Paket B F04 + F08 Paddle / Billing / Commands
   |
   v
Paket C F05 + F06 Growth / Tests
   |
   v
Paket D F03 + F07 + F09 Einzelthemen
   |
   v
Abschluss-Review und Merge-/Loesch-Empfehlung
```

**Mini-Review-Gate:** Nach Pilot und jedem Paket wird kurz festgehalten:

- welche Code-Anker gelesen wurden,
- welche Annahmen offen bleiben,
- ob das Ergebnis Original ersetzen, historisch bleiben oder geloescht werden sollte.

Ohne explizite Freigabe werden Originaldateien nicht geloescht. Bei reinem Ersetzen einer Datei durch eine freigegebene neue Fassung reicht ein klarer Abschlussentscheid im Review.

## 5. Arbeitsdateien und Duplikat-Regel

Primaer wird direkt im Original gearbeitet, wenn die Richtung eindeutig ist und der bestehende Inhalt sauber als historischer Abschnitt erhalten werden kann.

`*_updated.md` ist nur erlaubt, wenn:

- der Eingriff sehr gross ist,
- der alte Body nicht sinnvoll im selben Dokument umgebaut werden kann,
- oder ein Mini-Review vor Ersetzung noetig ist.

Fuer jede `*_updated.md` gilt:

- sie ist ein temporaerer Review-Artefakt, kein Zielzustand,
- sie bekommt denselben Statusblock-Standard wie das Ziel,
- im Abschluss-Review steht eine konkrete Entscheidung: `Original ersetzen`, `Updated verwerfen`, `Updated in Original mergen`, oder `Original loeschen nach Freigabe`.

Damit verhindert Phase 7, dass der Cleanup durch neue Parallel-Dokumente wieder Doku-Drift erzeugt.

## 6. Dokument-Konvention

Jede bearbeitete Datei bekommt am Kopf mindestens:

```text
**Stand:** 2026-06-10
**Status:** fuehrend | historisch / abgeloest durch <Master> | Konzept-Master / nicht vollstaendig implementiert
**Scope:** <eine Zeile>
**Bezug:** <Master-Doku oder Code-Anker>
```

Fuehrende Dokumente folgen knapp dieser Struktur:

```text
# Titel
Statusblock
## 1. Aktueller Stand
## 2. Code-Anker
## 3. Begruendungen und Grenzen
## 4. Offene Punkte
## Anhang: Historischer Kontext
```

Historische Dokumente beginnen mit einem kurzen Pointer-Block und lassen den alten Body nur dann stehen, wenn er noch echten Kontextwert hat.

## 7. Code-Lesehygiene

- Erst die konkreten Anker aus Abschnitt 3 lesen.
- Danach per `rg` nur gezielt erweitern, wenn ein gelesener Anker auf weitere Dateien verweist.
- Keine vagen Verweise wie "Backend" oder "App"; im Dokument konkrete Pfade nennen.
- Wenn kein Code existiert, nicht so tun als waere ein Feature implementiert. Dann `Status: Konzept-Master / nicht vollstaendig implementiert` setzen.
- Jede fachliche Annahme im Dokument als `Nicht verifiziert` oder `Annahme` markieren.

## 8. Nicht Teil dieser Phase

- Destruktive Loeschungen ohne Abschlussfreigabe.
- Ordner-Reorganisation (`_doc/architecture/`, `_doc/product/` etc.).
- Verschieben von F08 nach `_doc/paddle_checkout/`; falls sinnvoll, nur als Empfehlung im Abschluss-Review.
- Ein allgemeiner Markdown-Linkchecker (Review-F-14). Phase 7 darf den Bedarf notieren, implementiert ihn aber nicht.

## 9. Abschluss-Review

Datei: `_doc/reviews/2026-06-10-phase-7-review.md`

Pflichtinhalt:

- Mapping pro Datei: Original -> Ergebnis -> Entscheidungsempfehlung.
- Code-Anker pro Datei: gelesen / nicht gefunden / bewusst ausgelassen.
- Offene Punkte je Datei.
- Liste neuer oder verbliebener toter Links.
- Empfehlung fuer Phase 8: Statusblock-Nachpruefung der beruehrten Dateien.
- Konkrete Freigabe-Fragen fuer Loeschung, Ersetzung oder Beibehaltung.

## 10. Offene Risiken vor Start

- **F03 Sharing/Kundenlinks:** Code-Stand ist unklar. Erst nach `rg`-Sichtung entscheiden, ob Ist-Doku oder Konzept-Master.
- **F07 Rank-Badges:** Wenn das Dokument nur UI-Designvarianten wiederholt, ist Loeschen wahrscheinlich besser als historisieren.
- **F08 Paddle-Kommandos:** Skripte koennen in `_debug/` oder `scripts/` liegen; Vollstaendigkeit per `rg --files` pruefen.
- **F09 Webcontent:** Alte `website/templates/*`-Links duerfen am Ende nicht mehr im fuehrenden Teil stehen.

## 11. Naechster Schritt

Pilot F01:

1. Code-Anker aus F01 lesen.
2. Entscheiden, ob Direktedit im Original reicht oder temporaeres `_updated.md` noetig ist.
3. Neue Fassung erstellen.
4. Mini-Review mit Code-Ankern, offenen Annahmen und Ersetzungs-Empfehlung dokumentieren.
