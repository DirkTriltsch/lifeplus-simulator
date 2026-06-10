# Review der `*_updated.md`-Dateien nach Codex-Pass

**Stand:** 2026-06-10
**Status:** alle Vorschlaege umgesetzt am 2026-06-10 (User-Freigabe); Original-Vorschlagsliste mit `[x]` markiert als historischer Pruef-Trail.
**Scope:** Kritisches Review aller neun `*_updated.md`-Dateien im Ordner `_doc/` nach Codex-Pass. Pro Datei: kurze Bewertung, konkrete Verbesserungsvorschlaege, Hinweis auf moeglicherweise zu aggressives Pruning.
**Trigger:** Codex hat fachlich gute Korrekturen eingebracht, in einzelnen Faellen aber Inhalte gestrichen, die fuer menschliche Leser einen echten Wert hatten (Beispiel: Icon-Galerie in `Rank-Badges_updated.md` wurde zwischenzeitlich gestrichen, jetzt wieder drin).
**Bestaetigungsfelder:** `[ ]` annehmen, `[x]` annehmen + umsetzen, `[~]` anders machen, `[-]` ablehnen.

## Datei-Inventar

| # | Datei | Zeilen jetzt | Zeilen Original | Compression |
|---|---|---:|---:|---:|
| F01 | [`Freemium-Modell_updated.md`](../Freemium-Modell_updated.md) | 217 | 721 | 30 % |
| F02 | [`Freemium-Modell_Applikation_updated.md`](../Freemium-Modell_Applikation_updated.md) | 164 | 164 | 100 % (entspricht der Direkt-Edit-Version) |
| F03 | [`Konzept Kundenlinks und Szenario-Freigabe_updated.md`](../Konzept%20Kundenlinks%20und%20Szenario-Freigabe_updated.md) | 149 | 991 | 15 % |
| F04 | [`Konzept Paddle-Integration und App-Architektur_updated.md`](../Konzept%20Paddle-Integration%20und%20App-Architektur_updated.md) | 244 | 2092 | 12 % |
| F05 | [`Netzwerk-Modellierung_updated.md`](../Netzwerk-Modellierung_updated.md) | 151 | 495 | 30 % |
| F06 | [`Referenznetzwerk-Tests_updated.md`](../Referenznetzwerk-Tests_updated.md) | 150 | 164 | 91 % |
| F07 | [`Rank-Badges_updated.md`](../Rank-Badges_updated.md) | 274 | 140 | 196 % (gewachsen durch Drift-Befunde + SVG-Galerie) |
| F08 | [`Paddle_API_Commands & Scripts_updated.md`](../Paddle_API_Commands%20%26%20Scripts_updated.md) | 206 | 114 | 181 % (gewachsen durch Diagnose-Pfade) |
| F09 | [`Webcontent & Value Proposition_updated.md`](../Webcontent%20%26%20Value%20Proposition_updated.md) | 234 | 873 | 27 % |

**Gesamtbefund:**

- Codex-Pass hat in **allen** Dateien einen "§0 Kritisches Review dieses Updates"-Block hinzugefuegt, der vorherige Updated-Drift sichtbar macht. Sinnvoll, sollte erhalten bleiben.
- Codex hat fast ueberall "Master-Rolle" oder "Status fuehrend" entschaerft auf "Review-Artefakt / in Arbeit". Tendenz: konservativ defensiv. In F07 und F09 war das richtig, in F01 und F04 ist die Datei eigentlich fuehrender Master und sollte das auch sagen duerfen.
- Codex hat in F03 und F05 stark gekuerzt. Inhaltlich ok (Backlog-Charakter), aber wertvolle ASCII-Diagramme und Beispielreihen aus den Originalen fehlen jetzt.
- F02 und F06 sind weitgehend strukturell stabil und brauchen nur Kleinkorrekturen.
- F07 hat eine offene Stelle (`## 3 ... Aktuelle Klassen:` ohne Folgeinhalt) und einen Widerspruch im §0.
- F08 ist durch Codex-Pass deutlich besser geworden (Diagnose-Pfade, Pre-Live-Checks neu).

---

## F01 - Freemium-Modell_updated.md

### Bewertung

Fachlich korrekt, gute Drift-Tabelle (§4). §0 Kritisches Review macht echte Bugs sichtbar (Trial-Wiederholung, Free-Entitlement-Pfad). Aber: der Anhang ist nur ein **Verweis-Anhang** ohne Inhalte ("Im Original noch enthalten ... siehe Originaldatei"). Fuer ein "fuehrendes Produktstrategie"-Dokument fehlen damit die Begruendungs-Speicher direkt im Doku-File.

### Vorschlaege

- [x] **VS-F01-1 Statusblock:** "fuehrend (Pilot Phase 7 Update Leading Documents)" auf konsistente Form bringen, z. B. `Status: fuehrend (Pilot Phase 7)`. Der Klammer-Zusatz ist informativ aber dramatisch.
- [x] **VS-F01-2 Anhang inhaltlich auffuellen:** Statt "Im Original noch enthalten ..." mit Listen-Verweis: kurze inhaltliche Zusammenfassungen pro Original-Abschnitt (1-2 Saetze je), damit das Doku selbsterklaerend ist. Voll-Inhalte stehen ohnehin in [`_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) §1 — Verweis dorthin ergaenzen.
- [x] **VS-F01-3 Bezug zum Ideenspeicher:** Pointer auf `_offene Tasks und offene Ideen.md` §1 in den Statusblock aufnehmen, damit Leser direkt die Backlog-Sicht finden.
- [x] **VS-F01-4 Trial-Wiederholung-Bug:** §4 Drift-Tabelle Zeile "Trial-Wiederholung" als **Bug-Ticket** mit Schweregrad markieren, nicht nur als Drift. Vorschlag fuer Sperrlogik konkretisieren: `grantTrialEntitlementIfMissing` mit zusaetzlicher Pruefung auf `source IN ('trial', 'trial_expired')` -> kein Re-Grant.
- [x] **VS-F01-5 ASCII-Diagramm bleibt:** Das Magic-Link-Signup-/Pro-Checkout-Diagramm in §1 ist gut. Nicht streichen, auch wenn dieselbe Info im Konzept-Paddle-Doku steht — fuer dieses Doku ist es die zentrale Visualisierung des Free->Pro-Funnels.

---

## F02 - Freemium-Modell_Applikation_updated.md

### Bewertung

Sehr nah am Code, klares Drift-Register, MVP-Capabilities sauber als TypeScript-Skizze. Eine Aussage ist sachlich falsch: §9 spricht von "geloeschter Langfassung", aber die Originaldatei `Freemium-Modell_Applikation.md` existiert noch (nach User-Korrektur).

### Vorschlaege

- [x] **VS-F02-1 "geloeschte Langfassung" korrigieren:** §9 erste Zeile auf *"Die alte Langfassung dieser Datei (vor 2026-06-10) enthielt..."* oder *"Die alte Konzeptfassung in [`Freemium-Modell_Applikation.md`](./Freemium-Modell_Applikation.md) enthielt..."*. Sachlich richtig.
- [x] **VS-F02-2 Pointer auf Ideenspeicher:** Im Statusblock Pointer auf `_offene Tasks und offene Ideen.md` §2 aufnehmen — dort steht der vollstaendige Capability-Backlog.
- [x] **VS-F02-3 ASCII-Diagramm `useAuth -> Gate`:** In §2 vorhanden und gut. Nicht streichen.
- [x] **VS-F02-4 Status klarer:** `Status: historisch / Konzept-Snapshot 2026-05-25, kritisch korrigiert fuer Phase 7` ist verstaendlich, koennte aber praeziser werden: `Status: Drift-Register (App-Capability), Snapshot 2026-05-25`. Ist Geschmacksfrage.
- [x] **VS-F02-5 Capability-Pattern-Begruendung:** Eine kurze Begruendung ergaenzen, *warum* Capability-Pattern besser ist als Streu-`if`s (1-2 Saetze, oder Code-Snippet aus dem urspruenglichen Konzept). Macht das Doku besser fuer einen Neueinsteiger lesbar.

---

## F03 - Konzept Kundenlinks und Szenario-Freigabe_updated.md

### Bewertung

Codex hat hier sehr stark gekuerzt (991 -> 149). Inhaltlich richtig (Feature nicht im Code -> Konzept-Master), aber das ASCII-Flow-Diagramm aus dem Original ("Berater -> Backend -> shared_scenarios -> Interessent -> Redirect"), die Schwachstellen-Tabelle und die UI-Mockup-Skizzen fehlen. Im Ideenspeicher (`_offene Tasks und offene Ideen.md` §3) sind diese Inhalte erhalten.

### Vorschlaege

- [x] **VS-F03-1 ASCII-Flow-Diagramm einfuegen:** Berater -> Backend -> shared_scenarios -> Interessent (anonym) -> Redirect-Diagramm aus dem Ideenspeicher §3.4 hier inline. Macht das Konzept fuer einen Neueinsteiger sofort verstaendlich.
- [x] **VS-F03-2 Schwachstellen-Tabelle:** Die "Bewertete Luecken und Schwachstellen"-Tabelle aus dem Original / Ideenspeicher §3.2 hier zumindest mit den 4-5 wichtigsten Zeilen abdrucken (Serverversand, Live-Member-Link, Read-only, DSGVO, Sponsor-Name-Leak).
- [x] **VS-F03-3 Pointer auf Ideenspeicher hervorheben:** Im Statusblock oder §0 deutlich machen, dass `_offene Tasks und offene Ideen.md` §3 der vollstaendige Konzeptstand ist. Aktuell wird nur die alte Originaldatei verlinkt.
- [x] **VS-F03-4 Versionshistorie:** v1 -> v2 -> v3-Merge-Schritte aus dem Original sind didaktisch wertvoll (zeigen Lernkurve). Eine kurze 3-Zeilen-Versionsleiste hier ergaenzen.
- [x] **VS-F03-5 Status:** `Status: Konzept-Master / nicht implementiert` ist gut. Die "Diese `_updated.md`-Datei ist ein Phase-7-Review-Artefakt"-Phrase ist langatmig — koennte in einen kurzen Schlusssatz wandern.

---

## F04 - Konzept Paddle-Integration und App-Architektur_updated.md

### Bewertung

Fachlich sehr stark — gute Code-Anker-Tabelle, ehrliches Drift-/Risiko-Register, Webhook-Mapping-Tabelle. Aber: das Doku ist eigentlich der **Architektur-Master**, der Statusblock fuehrt es als "Architektur-Master in Arbeit" - zu defensiv. Das Original-Konzept enthielt zudem ein klares "Container-Diagramm" (Brand-Domain, Microsite, App, API, D1, Paddle), das hier fehlt.

### Vorschlaege

- [x] **VS-F04-1 Status klar fuehrend:** `Status: Architektur-Master in Arbeit` -> `Status: fuehrend (Architektur-Master)`. Wenn es das Master-Doku ist, darf es das auch heissen.
- [x] **VS-F04-2 Container-Diagramm:** Ein C4-Container-Level-Diagramm (Astro Microsite, React App, API, D1, KV, Resend, Paddle) als ASCII einfuegen. Macht die Architektur sofort verstaendlich. Das vorhandene Flow-Diagramm in §1 ist gut, ersetzt aber kein Container-Diagramm.
- [x] **VS-F04-3 Brand-Trennung visuell:** Eine kurze Skizze, wie LifeFlow360 / FitFlow360 / EqoFlow360 als parallele Stacks aufgebaut sind (BRAND_ID, eigene D1, eigene Paddle-Config). Im Original war diese Trennung visualisiert.
- [x] **VS-F04-4 Webhook-Mapping-Tabelle:** §3.4 Tabelle bleibt, ist wertvoll. Eventuell um eine kleine "wann tritt das auf"-Spalte ergaenzen (z. B. "subscription.created beim ersten Pro-Kauf, subscription.canceled beim Cancel").
- [x] **VS-F04-5 Abschnitt 5 "Abweichungen vom Konzeptstand"** ist gut, sollte als kompakter Audit-Trail erhalten bleiben.

---

## F05 - Netzwerk-Modellierung_updated.md

### Bewertung

Klare Einordnung als historischer Snapshot mit Pointer auf `growth_models/`. §5 "Kritische Modellgrenzen" ist wertvoll (Weighted Aggregates, Shopper-Float, Direct-Cap, Churn-Reihenfolge, Reality-Asymmetrie, lifecycle-Platzhalter). Was fehlt aus dem Original: die konkrete Beispiel-Upline-Reihe `Kunde -> A -> B -> C -> Gold -> Bronze -> Bronze -> Diamond` als didaktische Visualisierung der Verguetungs-Phasen.

### Vorschlaege

- [x] **VS-F05-1 Beispiel-Upline-Reihe:** Die konkrete `Kunde -> A -> B -> C -> Gold -> Bronze -> Bronze -> Diamond`-Skizze aus dem Original hier als didaktisches Beispiel inline. 5 Zeilen ASCII, hoher Lese-Wert.
- [x] **VS-F05-2 Empfehlung in §7 abschwaechen:** Aktuell empfohlen "Originaldatei loeschen oder reduzieren". Vorschlag: explizit machen, was vor Loeschung verifiziert werden muss (siehe §7-Bullets). Loesch-Empfehlung ist deutlich genug.
- [x] **VS-F05-3 Code-Anker-Tabellen behalten:** §2 ist gut, vollstaendig, sollte erhalten bleiben.
- [x] **VS-F05-4 Sortierung der "growth_models/01-04"-Lese-Reihenfolge** in §1: Reihenfolge 02 -> 03 -> 01 -> 04 ist ungewoehnlich. Pruefen, ob das Absicht ist (didaktisch) oder ob 01 -> 02 -> 03 -> 04 sinnvoller waere.
- [x] **VS-F05-5 Status:** `Status: historischer Konzept-Snapshot mit kritischer Aktualisierung` ist akkurat. Ok.

---

## F06 - Referenznetzwerk-Tests_updated.md

### Bewertung

Sehr gut strukturiert, klare Test-Matrix nach Klassen. Codex-Pass hat einige Codex-Korrekturen eingebracht: `person-tree-equivalence.test.ts` neu eingeordnet, Checkout-API-Tests als separate Kategorie, Fixture-DSL verifiziert. Konventionen in §3 sind brauchbar.

### Vorschlaege

- [x] **VS-F06-1 Testklassen-Visualisierung:** §1 Tabelle ist gut, koennte um eine Mini-ASCII-Pyramide ergaenzt werden (Unit -> Integration -> Smoke), damit Neueinsteiger die Hierarchie sehen.
- [x] **VS-F06-2 Fixture-DSL-Beispiel:** §3 "Konvention" gibt Regeln, aber kein Beispiel. Ein 5-Zeilen-Snippet aus `reference-rank.test.ts` (z. B. `networkFixture({ root: root('du', 50, [diamondLeg(...)]) })`) macht den Stil sofort klar.
- [x] **VS-F06-3 npm test - Workaround konkret:** §5 sagt "Playwright-API-Specs gehoeren ueber das separate Script ausgefuehrt oder aus dem Vitest-Include ausgeschlossen". Konkrete `vitest.config.ts`-Empfehlung oder Pfad-Ausschluss waere hilfreich.
- [x] **VS-F06-4 Status:** "fuehrender Test-Konventionsentwurf" ist gut. Ok.

---

## F07 - Rank-Badges_updated.md

### Bewertung

**Hervorragender Codex-Pass** in der Substanz: §9 "Fachliche Rank-Schwellen" zeigt einen echten Bug (AV-Drift 40 vs 45 zwischen Engine und UI-Hilfsdaten). §8.1 zeigt einen weiteren Bug (fuehrendes Leerzeichen bei `Diamond`-Label durch `rank.replace('Diamond', ' Diamant')`). Sehr wertvoll. **ABER**:

- §3 endet abrupt mit "Aktuelle Klassen:" und kommt nicht zu Ende (Zeile 54).
- §0 "Kritisches Review" sagt "SVG-Galerie doppelt Code" — die Galerie ist aber drin (§7). Widerspruch.
- Statusblock ist defensiv ("Review- und Design-Master in Arbeit").

### Vorschlaege

- [x] **VS-F07-1 §3 Abschluss reparieren:** Zeile 54 "Aktuelle Klassen:" entfernen oder mit den eigentlichen Klassen ausfuellen (`gap-1.5 px-2 py-1 text-xs` etc.). Aktuell ist es ein hanging colon. **Kritisch fuer Lesbarkeit.**
- [x] **VS-F07-2 §0 Widerspruch aufloesen:** Die Aussage "SVG-Galerie doppelt Code" raus oder umformulieren in "SVG-Galerie ist Code-Spiegel und muss bei Icon-Aenderungen gepflegt werden — bewusst akzeptierter Trade-off fuer visuelle Schnellsicht". Galerie ist drin und sinnvoll.
- [x] **VS-F07-3 AV-Drift als eigenes Bug-Ticket:** §9 AV 40 vs 45 fuer Believer/Builder ist eine echte Inkonsistenz. Sollte in den Ideenspeicher / Go-Live-Liste als Bug uebernommen werden, nicht nur hier als Drift markiert.
- [x] **VS-F07-4 Diamond-Label-Leerzeichen-Bug:** §8.1 "fuehrendes Leerzeichen" gehoert ebenfalls als eigenes Bug-Ticket in den Code-Cleanup-Plan (`rankLabel()` explizit statt globaler `replace`).
- [x] **VS-F07-5 Status klar fuehrend:** Diese Datei ist tatsaechlich der visuelle Master fuer Badges (Galerie, Bedienregeln). `Status: Review- und Design-Master in Arbeit` -> `Status: fuehrend (visueller Master + Konventionen)`. Statusblock-Defensive raus.
- [x] **VS-F07-6 Icon-Galerie behalten:** Explizit. Die SVG-Galerie ist der einzige Ort, an dem alle Rang-Icons auf einer Seite sichtbar sind, ohne App-Start. Hat hohen Lese-Wert.

---

## F08 - Paddle_API_Commands & Scripts_updated.md

### Bewertung

**Best-improved file** im Codex-Pass. Original 114 Zeilen, jetzt 206 Zeilen — gewachsen durch echten Mehrwert: §3 "Sichere Pruefpfade vor manuellen Paddle-Mutationen" mit `GET /api/diagnostics/paddle-prices`, `npm run test:checkout-api`, `CHECKOUT_WRITE_TESTS=1`. §5 "Was nicht in diese Datei gehoert" als Pointer-Tabelle. Sehr brauchbar.

### Vorschlaege

- [x] **VS-F08-1 Status klarer:** `Status: Maintenance-Runbook in Arbeit` ist konservativ. Vorschlag: `Status: fuehrend fuer Paddle-Maintenance`. Inhaltlich ist es das.
- [x] **VS-F08-2 Live-Variante als kompletter Block:** §4.1 "Live-Variante" zeigt nur den URL-Wechsel als Kommentar. Vorschlag: vollstaendiger Live-Block mit Sicherheitscheckliste vorab (3 Zeilen), um copy-paste in einem Schritt zu erlauben.
- [x] **VS-F08-3 Diagnostic-Token-Quelle:** §3 erwaehnt `DIAGNOSTIC_TOKEN`, aber nicht wo der herkommt. Kurzer Hinweis: Cloudflare Pages Vars oder `wrangler pages secret`. Hilft beim Aufsetzen.
- [x] **VS-F08-4 Verschiebung nach `_doc/paddle_checkout/`:** §7 sagt "Sobald wiederkehrende Paddle-Wartung entsteht, sollte daraus ein echtes Runbook werden". Schwelle "drei aktive Kommandos" konkretisieren (steht in §6).

---

## F09 - Webcontent & Value Proposition_updated.md

### Bewertung

Sehr gut strukturiert. Code-Anker-Tabelle ist sauber. §3 Kernpositionierung mit Master-Aussage und Wording-Regeln (verwenden/nicht verwenden) ist legal-relevantes Material und gut platziert. Aber: das Original hatte konkrete Wording-Vorlagen fuer Trust-Strip, FAQ, Final-CTA und A/B-Hero-Varianten, die jetzt nicht mehr direkt im Doku stehen — sie leben jetzt entweder im Astro-Code oder sind verloren. Die `pricing.yaml`-Pricing-Tier-Tabelle aus dem F01 (Free/Monthly/Halfyear/Yearly mit allen Texten) ist hier ebenfalls nicht abgebildet.

### Vorschlaege

- [x] **VS-F09-1 Trust-Strip / FAQ / Final-CTA-Wording:** Falls die Original-Datei konkrete Texte enthielt, die im Astro-Code nicht 1:1 stehen, hier als "vorgeschlagenes Wording" sektion einfuegen. Andernfalls explizit notieren: "Trust-Strip-/FAQ-Wording lebt heute inline in `IndexPageDefault.astro`."
- [x] **VS-F09-2 Pricing-Tier-Wording als Tabelle:** Vier-Zeilen-Tabelle (Free, Monthly, Halfyear, Yearly) mit Preis + Kommunikations-Wording aus `pricing.yaml` ergaenzen — dieselbe wie in F01 §1, hier aber als Marketing-Wording-Sicht.
- [x] **VS-F09-3 Status klarer:** `Status: Content-/Wording-Master in Arbeit` -> `Status: fuehrend fuer Positionierung und Copy-Regeln`. Die Datei traegt die Positionierung; sie ist nicht defensiv "in Arbeit".
- [x] **VS-F09-4 A/B-Hero-Varianten:** §7 Verbesserungsbedarf erwaehnt sie ("entfernen oder als bewusstes Backlog"). Falls die Originaldatei Varianten A/B/C hatte: hier als kurze Auflistung mitnehmen, damit sie nicht in Vergessenheit geraten. Sonst Entscheidung "verworfen, weil ..." dokumentieren.
- [x] **VS-F09-5 Bezug zu Ideenspeicher:** §9 verlinkt `_offene Tasks und offene Ideen.md` §1 / §3. Pointer auf §3 (Kundenlinks) ist wichtig, weil Sharing-Wording explizit nicht ueberclaimt werden darf.

---

## Querliegende Vorschlaege ueber alle Dateien

- [x] **VS-ALL-1 Statusblock-Konvention:** Codex hat fast ueberall "Master in Arbeit" / "Konsolidierung" als Status gesetzt — das ist defensiv. Vorschlag: pro Datei klar entscheiden, ob `fuehrend`, `historisch`, `Konzept-Master / nicht implementiert` oder `Drift-Register`. Defensiv-Status nur, wenn echte Unsicherheit vorliegt.
- [x] **VS-ALL-2 ASCII-Diagramme nicht streichen:** Jedes der Updated-Dokumente, das ein Diagramm enthaelt (F01, F02, F04, F05), profitiert davon. Bei kuenftigen Codex-Passes vor dem Pruning verteidigen.
- [x] **VS-ALL-3 §0 Kritisches Review beibehalten:** Der Codex-Pass hat ueberall einen "Kritisches Review dieses Updates"-Block hinzugefuegt. Das ist methodisch sinnvoll und zeigt Drift. Nicht streichen.
- [x] **VS-ALL-4 Verweise auf Ideenspeicher:** Alle Updated-Dateien sollten konsistent auf `_offene Tasks und offene Ideen.md` verweisen, wo Backlog-Inhalte gehoeren. F04 und F09 machen das schon, F01/F02/F03 ergaenzen.
- [x] **VS-ALL-5 Bug-Tickets in Ideenspeicher:** Konkrete Bugs aus den Reviews (Trial-Wiederholung F01, AV-Drift F07, Diamond-Label-Leerzeichen F07) gehoeren als Backlog-Eintraege in den Ideenspeicher §1 bzw. eigenen "Bug-Backlog"-Abschnitt, damit sie nicht in Updated-Dateien versanden.

## Bestaetigungs-Workflow

So koennen die Vorschlaege abgearbeitet werden:

1. Du markierst die Checkboxen direkt in dieser Datei: `[ ]` -> `[x]` (annehmen + umsetzen) / `[~]` (anders machen, dann Kommentar) / `[-]` (ablehnen).
2. Ich gehe danach pro Datei die `[x]` und `[~]` Eintraege durch und setze sie um.
3. `[-]`-Eintraege werden als bewusst verworfen in der Phase-7-Review-Datei notiert, damit der naechste Codex-Pass sie nicht erneut vorschlaegt.

## Verwandte Dokumente

- [`2026-06-10-kritisches-doku-review.md`](./2026-06-10-kritisches-doku-review.md) — Doku-Cleanup-Findings F-01 bis F-14.
- [`2026-06-10-phase-7-review.md`](./2026-06-10-phase-7-review.md) — Phase-7-Mapping je F-ID.
- [`2026-06-10-phase-7-arbeitsplan.md`](./2026-06-10-phase-7-arbeitsplan.md) — Plan der Updated-Dateien.
- [`../_offene Tasks und offene Ideen.md`](../_offene%20Tasks%20und%20offene%20Ideen.md) — Backlog F01/F02/F03.
