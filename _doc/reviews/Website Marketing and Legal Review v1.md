# Website Marketing & Legal Review v1 — LifeFlow360

**Scope:** LifeFlow360-Brand + Shared-Templates (Index, Features, Pricing, Mein-Konto, Legal-Pflichttexte)
**Datum:** 2026-05-29
**Status:** Pre-Launch-Risikobewertung
**Aus Scope ausgenommen:** FitFlow360, EqoFlow360

---

## 1. Legal Review

### 1.1 Einordnung & Geltungsbereich

| Punkt | Befund |
|---|---|
| **Rechtsraum** | Primär Deutschland (Sitz Aichach, deutsche Pflichttexte). AT/CH-Erreichbarkeit über `.app`-TLD wahrscheinlich → AT-Verbraucherschutz und CH-Anbieterkennzeichnung in Sekundärscope. |
| **Zielgruppe** | Mischzielgruppe: (a) Sponsoren als Unternehmer, (b) Verbraucher (Interessenten, Neueinsteiger, private Nutzer). **Maßgeblich ist der Verbraucher-Maßstab** (strenger). |
| **Geschäftsmodell** | SaaS-Simulationswerkzeug für Network-Marketing-Sponsoren (LifePlus/PM-International). Network-Marketing-Bezug ist offensichtlich → §16 UWG relevant. |
| **Geprüfte Rechtsgebiete** | UWG (§3, §5, §5a, §16), DSGVO (Art. 6, 13, 14, 32), TTDSG/TDDDG, DDG §5, BGB §§307-309 (AGB-Kontrolle), BGB §§312g, 355-357 (Fernabsatz/Widerruf), §16 UWG (Schneeball/progressive Kundenwerbung). |
| **Verkaufsabwicklung** | Paddle als Merchant of Record (MoR), Sitz London/UK → Drittlandtransfer-Thematik im Datenschutz. |

---

### 1.2 Findings nach Ampel

#### 🔴 ROT — Hochrisiko, vor Live-Schaltung zwingend handeln

---

##### 🔴 R-01 — Konkrete Einkommenshöhe in Hero-FAQ („€4.000–€10.000/Monat")

**Fundstelle:** [IndexPageDefault.astro:406](website-astro/src/shared/components/sections/IndexPageDefault.astro#L406)

**Zitat:**
> „Setzt du 30 % Duplikation und 20 % Fluktuation, landest du bei den **ehrlichen €4.000–€10.000/Monat**, die ein **engagierter Sponsor nach 10 Jahren realistisch erreicht**."

**Risiko:**
- **§5 UWG (Irreführende Werbung):** BGH-Rechtsprechung verlangt für konkrete Verdienstangaben Belegbarkeit und Repräsentativität. Eine Spanne € 4.000–10.000/Monat als „realistisch" und „ehrlich" zu bezeichnen, ohne dass diese Werte durch eine Verdienst-Disclosure / Einkommensstatistik (Income Disclosure Statement) belegt sind, ist klassische irreführende Geschäftspraxis im Network-Marketing-Kontext.
- **§16 Abs. 2 UWG (Progressive Kundenwerbung / Schneeballverbot):** Die Aussage suggeriert, dass die Vorteile *durch das Anwerben weiterer Personen (Sponsor → Member → Duplikation)* erreicht werden. Genau diese Konstellation („durch Werbung weiterer Personen Vorteile erlangen") ist tatbestandsmäßig.
- **Etikettierung als „ehrlich":** Verstärkt die Irreführung. „Ehrlich" ist eine objektive Beschaffenheits-Behauptung und prüfungsfähig.
- **„Engagierter Sponsor nach 10 Jahren realistisch":** Suggeriert Typizität. Tatsächlich ist diese Größenordnung im Network-Marketing **nicht** typisch (gängige Income Disclosure Statements großer MLM-Firmen zeigen, dass ≤1 % der Teilnehmer Beträge dieser Größenordnung erreichen).

**Anwaltshinweis:** **JA, zwingend vor Live-Schaltung.** Diese FAQ-Antwort ist ein klassischer Abmahnfall. Wettbewerbsverbände (Wettbewerbszentrale, vzbv) und spezialisierte Verbraucherschutzkanzleien greifen exakt solche Formulierungen auf.

**Alternative (rechtssicher, behält die Aussage „Simulator rechnet ehrlich"):**

> *„Realistisch heißt: realistisch für deine Eingabewerte. Setzt du 100 % Duplikation und 0 % Fluktuation, kommt mathematisch eine Milliarden-Zahl heraus — praktisch unmöglich. Setzt du moderate Werte (z.B. 30 % Duplikation, 20 % Fluktuation), wird die Kurve schnell deutlich flacher.*
>
> *Welcher Wert sich tatsächlich für dich ergibt, hängt von deinem persönlichen Einsatz, deinem Markt und vielen weiteren Faktoren ab. Der Simulator zeigt eine **Modellrechnung**, keine Zusicherung. Die Mehrheit der Teilnehmer in Network-Marketing-Strukturen erzielt nach unabhängigen Branchenstatistiken **keine vollberuflichen Einkommen** — das gehört zur ehrlichen Sicht dazu."*

> ⚖ **Pflicht-Disclosure-Link** an dieser Stelle (z.B. zu einer eigenen Seite "/einkommens-disclosure"): konkrete Angabe, woher die Modellwerte stammen + ehrliche Einordnung der typischen Ergebnisse.

---

##### 🔴 R-02 — Konkrete Provisions-Mockup-Zahl im Hero („€8.420/Mon, Jahr 10")

**Fundstellen:**
- [IndexPageDefault.astro:64-71](website-astro/src/shared/components/sections/IndexPageDefault.astro#L64-L71) — Hero-Frame: „Provision · Jahr 10 · pro Monat" / „€8.420/Mon" / „Realistisch · 30% Dup · 20% Fluk"
- [FeaturesPageDefault.astro:97-103](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L97-L103) — Features-Mockup: „Provision · Jahr 10 — €8.420"

**Risiko:**
- **§5 UWG:** Eine konkrete Eurozahl direkt im Hero (oberhalb der Faltlinie!) erzeugt bei Verbrauchern die **Werbeerwartung**, diese Größenordnung sei das beworbene Produkterlebnis. Der Mini-Hinweis „Realistisch · 30% Dup · 20% Fluk" reicht als Kennzeichnung nicht aus — er ist
  - (a) kryptisch („Dup", „Fluk" sind Insider-Abkürzungen),
  - (b) **nicht** als Modellrechnung/Beispiel deklariert,
  - (c) **nicht** mit einem typischen Verdienst kontextualisiert.
- Mehrfache Wiederholung derselben Zahl (€8.420) auf zwei Seiten verstärkt den Eindruck einer „greifbaren" Größenordnung.
- **§5a UWG (irreführendes Unterlassen):** Wesentliche Informationen, die der Verbraucher zur Bewertung der Werbung benötigt (z.B. Typizität, Voraussetzungen, durchschnittliche Ergebnisse), fehlen.

**Anwaltshinweis:** **JA.** Auch ohne FAQ-Aussage wäre die alleinige Heldenzahl problematisch. In Kombination mit R-01 ist das Gesamtbild abmahnsicher angreifbar.

**Alternative — drei Varianten zur Wahl:**

**Variante A (Mockup ohne Eurozahl):**
> Hero-Mockup zeigt **Kurve + Slider**, aber keine konkrete Eurozahl. Stattdessen Platzhalter wie „**Ergebnis Jahr 10**" / „**[deine Kurve]**" / „**[live berechnet]**". Visueller Effekt: Aufforderung zum Selbstausprobieren.

**Variante B (Mockup mit klarer Beispiel-Kennzeichnung):**
> „**Beispielrechnung**" als Eyebrow direkt über der Zahl.
> „€8.420/Mon" (kleiner) + Caption darunter: *„Modellrechnung mit Slider-Werten Member=2, Shopper=3, IP=200, Dup=30%, Fluk=20%. Keine Zusicherung individueller Ergebnisse. → [Einkommens-Disclosure]"*

**Variante C (Mockup mit anderem KPI):**
> Statt €-Zahl die **Stufen-Prognose** als Hero-KPI: „**Höchste Stufe: Gold · Jahr 6**" oder „**Netzwerk-Größe Jahr 10: 412 Member**". Strukturkennzahlen sind rechtlich harmloser als Eurobeträge.

**Empfehlung Legal:** Variante A oder C. Variante B nur, wenn ein **vollständiger Einkommens-Disclosure** auf der Seite verlinkt und einsehbar ist.

---

##### 🔴 R-03 — Ziele-Leiter mit konkreten Einkommens-Wegmarken (Auto, Miete, Vollwertiges Einkommen)

**Fundstelle:** [FeaturesPageDefault.astro:294-298](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L294-L298)

**Zitat (Mockup-Werte):**
> „Produktkosten refinanziert · ~ 50 €/Monat · **J1**
> Auto finanziert · ~ 350 €/Monat · **J3**
> Mietfrei wohnen · ~ 1.200 €/Monat · **J5**
> Vollwertiges Einkommen · ~ 3.500 €/Monat · **J7**
> Eigenes Ziel · Frühpension · ~ 6.000 €/Monat · —"

**Risiko:**
- **§5 UWG (gesteigerte Form):** Diese Wegmarken sind nicht nur Zahlen — sie sind **emotional aufgeladene Lebenstraumversprechen** mit konkreten Jahresangaben („J1, J3, J5, J7"). Die Kombination „X Euro **in Jahr Y**" suggeriert Planbarkeit und Vorhersagbarkeit.
- **§16 Abs. 2 UWG (Schneeball-Suggestion):** „Vollwertiges Einkommen ~3.500 €/Monat in J7" ist exakt das versprochene besondere Vorteilsmuster, das das Schneeballverbot adressiert — der Vorteil wird in Aussicht gestellt, wird aber nach der Logik des Modells nur erreichbar, wenn weitere Personen geworben werden.
- **Verstärkt durch:** Die im Mockup grün („achieved") markierten Zeilen J1, J3, J5, J7 visualisieren die Versprechen als **bereits erreicht** — die Default-Darstellung suggeriert Erfolg.
- **Heilversprechen-Analogie:** Die Rechtsprechung zu §3 HWG nutzt einen ähnlichen Maßstab — gesundheitsbezogene Erfolgsversprechen müssen wissenschaftlich gesichert sein. Bei Einkommensversprechen ist die Hürde mit BGH-Rspr. ähnlich hoch (Substanziierung).

**Anwaltshinweis:** **JA, zwingend.** Dies ist die rechtlich riskanteste Stelle der gesamten Website — höher als R-01, weil die Versprechen lebensweltlich konkret (Auto, Miete, Pension) und mit Jahreszahlen versehen sind. Maximaler Wiedererkennungswert für Abmahner.

**Alternative (rechtssicher, behält Funktion):**

**Variante A (Beträge entfernen, Wegmarken behalten):**
> „Wegmarken (Beispielziele) — definiere eigene Anker im Simulator:
> - Produktkosten refinanziert
> - Auto finanziert
> - Mietfrei wohnen
> - Vollwertiges Einkommen
> - Frühpension"
>
> Mockup zeigt **kein Jahr** und **keinen Betrag** — nur die Kategorien als „du wählst selbst, ab welcher Provisionshöhe das Ziel erreicht ist."

**Variante B (Beträge als User-Input deklarieren):**
> Jeder Eintrag mit Vermerk *„[dein Wert]"* statt fester Eurobeträge. Mockup zeigt eine offene Eingabe statt einer „achieved"-Markierung.

**Variante C (komplett umpositionieren als Werkzeug, nicht als Wegweiser):**
> Headline ändern: nicht „Zwischenziele statt nur Endsumme" sondern **„Eigene Zwischenziele setzen — der Simulator zeigt, in welchem Jahr deine Annahmen das Ziel erreichen."** → Verschiebt das Versprechen von „Du erreichst X" zu „Wenn du X annimmst, rechnet das Modell Y".

**Empfehlung Legal:** Variante A + C kombinieren. Variante B ist juristisch sauber, aber im Mockup schwächer zu kommunizieren.

---

##### 🔴 R-04 — Footer-Disclaimer in den AGB: „Vorlage. Vor Live-Schaltung prüfen lassen."

**Fundstelle:** [LegalAgbDefault.astro:178-179](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L178-L179)

**Zitat:**
> „**Vorlage.** Vor Live-Schaltung durch eine Anwältin oder einen Anwalt für IT-/Vertragsrecht prüfen lassen."

**Risiko:**
- **Selbstauskunft zur Mangelhaftigkeit:** Diese Zeile steht **live sichtbar** im Footer der AGB. Sie ist ein expliziter Hinweis darauf, dass die AGB **nicht** abgenommen wurden. Im Streitfall ist das (a) ein deutliches Indiz für Verschulden bei §§307ff BGB-Verstößen und (b) untergräbt Vertrauen und Glaubwürdigkeit des Anbieters.
- **Marken-/Vertrauensschaden:** Verbraucher liest „Vorlage" und denkt „unfertig".

**Anwaltshinweis:** **JA**, aber primär aus Geschäftsschutz-Gründen — der Hinweis muss vor Launch raus. **UND** die AGB selbst müssen anwaltlich geprüft werden (siehe R-05).

**Aktion:** Entfernen.

**Parallel:** Datenschutz-Hinweis [LegalDatenschutzDefault.astro:146](website-astro/src/shared/components/sections/LegalDatenschutzDefault.astro#L146) („Grundlage: angepasst aus dem bestehenden eRecht24-Text.") und Impressum [LegalImpressumDefault.astro:37](website-astro/src/shared/components/sections/LegalImpressumDefault.astro#L37) („Grundlage: angepasst aus dem bestehenden eRecht24-Text.") ebenfalls entfernen.

---

##### 🔴 R-05 — AGB §13 (Änderungsklausel mit fingiertem Einverständnis)

**Fundstelle:** [LegalAgbDefault.astro:155-162](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L155-L162)

**Zitat:**
> „Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern, soweit dies aus rechtlichen oder technischen Gründen erforderlich wird. Der Nutzer wird über Änderungen rechtzeitig per E-Mail informiert. **Widerspricht der Nutzer den geänderten AGB nicht innerhalb von sechs Wochen, gelten die Änderungen als angenommen.**"

**Risiko:**
- **§308 Nr. 5 BGB (Fiktion der Annahme):** Eine Klausel, nach der das Schweigen des Nutzers als Annahme fingiert wird, ist **nur** wirksam, wenn (a) dem Nutzer eine **angemessene Frist** zur Erklärung gewährt wird **und** (b) die Bestimmung den Verwender verpflichtet, den Nutzer **bei Beginn der Frist auf die vorgesehene Bedeutung seines Schweigens besonders hinzuweisen**.
- Die Klausel erwähnt zwar eine Frist, aber **nicht** die Hinweispflicht.
- **BGH 27.04.2021 — XI ZR 26/20 (Postbank-Urteil):** Pauschale Zustimmungsfiktionen in AGB von Banken wurden für unwirksam erklärt. Die Begründung lässt sich auf SaaS-AGB übertragen: Wesentliche Änderungen brauchen aktive Zustimmung, nicht Schweigen.
- **§309 Nr. 12 b BGB:** Verstoß möglich, wenn Schweigen die Beweislast für die Genehmigung verschiebt.

**Anwaltshinweis:** **JA, zwingend.** Die Klausel ist mit hoher Wahrscheinlichkeit unwirksam — und im AGB-Kontext führt eine unwirksame Klausel zur Anwendung der gesetzlichen Regelung (§306 Abs. 2 BGB), was im Streitfall regelmäßig schlechter für den Anbieter ist.

**Alternative (verbindlich anwaltlich abnehmen lassen, hier nur Strukturvorschlag):**

> *„(1) Der Anbieter ist berechtigt, diese AGB anzupassen, soweit dies aus rechtlichen, regulatorischen oder technischen Gründen erforderlich wird oder zur Behebung von Lücken nach Vertragsabschluss notwendig ist. Eine solche Anpassung wird nur wirksam, wenn sie das vertragliche Gleichgewicht zwischen den Parteien nicht zu Lasten des Nutzers wesentlich verändert.*
>
> *(2) Der Anbieter informiert den Nutzer per E-Mail spätestens sechs Wochen vor dem geplanten Wirksamkeitsdatum über die Änderungen. **Die Mitteilung enthält einen ausdrücklichen Hinweis auf die Möglichkeit und die Frist des Widerspruchs sowie auf die Bedeutung des Schweigens.** Widerspricht der Nutzer nicht innerhalb der Frist, gelten die Änderungen als angenommen.*
>
> *(3) Für wesentliche Änderungen — insbesondere Preisanpassungen, Erweiterung der Pflichten des Nutzers oder Einschränkung der Leistung — ist eine ausdrückliche Zustimmung des Nutzers erforderlich. Erfolgt sie nicht, bleibt das Vertragsverhältnis zu den bisherigen Bedingungen bestehen, jede Partei kann den Vertrag bis zum geplanten Änderungsdatum mit Wirkung zum geplanten Änderungsdatum kündigen."*

---

##### 🔴 R-06 — Brand-Domain hardcoded auf Staging (lifeflow360.app)

**Fundstelle:** [brand.yaml:2](website-astro/src/brands/lifeplus/brand.yaml#L2) und Impressum/AGB-Verweise

**Befund:**
- `siteDomain: "www.lifeflow360.app"`
- Impressum nennt keine Domain → wird über AGB §1 abgedeckt (`{brand.siteDomain}`).

**Risiko:**
- **§5 DDG (Impressumspflicht):** Inhaltlich okay, aber die Domain muss bei Launch eindeutig sein. Falls eine `.de`-Domain geplant ist (siehe Memory: „Brand-Domains hardcoded vs. live"), muss die Pflichtangabe auf den **tatsächlich genutzten Domains** stimmen, sonst greift §5 DDG nicht.
- **Wettbewerbsrecht:** Bei Mehrfach-Domain-Strategie (`.app` + `.de`) müssen Impressum/Datenschutz auf **beiden** erreichbar sein, sonst fehlende Pflichtangabe = Abmahnrisiko.

**Anwaltshinweis:** Nicht zwingend, aber vor Launch Domain-Strategie final festlegen, alle Pflichttext-Verweise prüfen.

**Aktion:** Pre-Launch-Checkliste-Punkt: „Domain-Strategie verifizieren, Impressum/Datenschutz auf allen Live-Domains erreichbar, Domain-Inhalt in AGB §1 korrekt."

---

##### 🔴 R-07 — Magic-Link-Login ohne Datenschutz-Hinweis im Form-Kontext

**Fundstelle:** [AccountPageDefault.astro:31-51](website-astro/src/shared/components/sections/AccountPageDefault.astro#L31-L51)

**Befund:**
- Login-Form fragt E-Mail-Adresse ab.
- **Kein** Hinweis am Form auf Datenschutzerklärung, Speicherdauer, Verarbeitungszweck.
- **Kein** Checkbox-Mechanismus für Einwilligung (auch wenn hier Einwilligung nicht zwingend nötig, ist Hinweispflicht aus Art. 13 DSGVO trotzdem zu erfüllen).

**Risiko:**
- **Art. 13 DSGVO (Informationspflicht bei Erhebung):** Bei direkter Datenerhebung muss der Verantwortliche **zum Zeitpunkt der Erhebung** über Zweck, Rechtsgrundlage, Speicherdauer und Empfänger informieren. Ein bloßer Footer-Link „Datenschutz" reicht nach h.M. **nicht aus**, wenn keine Kurz-Info am Erhebungspunkt eingeblendet wird.
- **DSK (Datenschutzkonferenz) Orientierungshilfe:** Empfiehlt einen direkten, sichtbaren Hinweis am Erhebungspunkt.

**Anwaltshinweis:** Gelb/Rot je nach Aufsichtsbehörde. Empfehlung: vor Launch fixen.

**Alternative — Hinweis-Text direkt am Login-Form (Beispiel):**

> *„Mit Klick auf »Login-Link senden« erlauben Sie uns, Ihre E-Mail-Adresse zur Authentifizierung und Vertragsdurchführung zu verarbeiten (Art. 6 Abs. 1 lit. b DSGVO). Details siehe [Datenschutzerklärung](/datenschutz.html)."*

---

##### 🔴 R-08 — „Realistisch" als Werbe-Etikett über die gesamte Site

**Fundstellen (Auswahl):**
- [IndexPageDefault.astro:9](website-astro/src/brands/lifeplus/pages/index.astro#L9): *„Simuliere **realistisch**, was dein LifePlus-Netzwerk über zehn Jahre einspielen kann."* (Meta-Description)
- [IndexPageDefault.astro:70](website-astro/src/shared/components/sections/IndexPageDefault.astro#L70): „Realistisch · 30% Dup · 20% Fluk"
- [IndexPageDefault.astro:406](website-astro/src/shared/components/sections/IndexPageDefault.astro#L406): „ehrlichen €4.000–€10.000/Monat … realistisch erreicht"
- [FeaturesPageDefault.astro:209](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L209): „realistischere Modelle"
- [FeaturesPageDefault.astro:215](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L215): „realitätsnah"

**Risiko:**
- **§5 UWG, §3 UWG:** „Realistisch", „ehrlich", „realitätsnah" sind objektive Beschaffenheits-Behauptungen, kein Marketing-Adjektiv. Sie sind **belegbar** zu halten — und im Bereich Network-Marketing-Einkommensprognosen schwer zu belegen, weil die tatsächliche Realität der typischen Teilnehmer-Einkommen deutlich unter den Modellwerten liegt.
- Häufung verstärkt das Risiko: Eine Aussage kann als Marketing durchgehen, fünf nicht.

**Anwaltshinweis:** **JA.** Begrifflichkeit grundsätzlich entschärfen.

**Alternative:**
- „realistisch" → „mit eigenen Annahmen" / „mit deinen Werten" / „transparent"
- „realistischere Modelle" → „Modelle mit zusätzlicher Streuung"
- „realitätsnah" → „mit Bandbreite zwischen Teams"
- „ehrlich" → komplett streichen oder durch „nachvollziehbar" ersetzen

---

#### 🟡 GELB — Risiko, mit Anpassung lösbar

---

##### 🟡 G-01 — „Vollwertiges Einkommen" als Wegmarke

**Fundstelle:** [FeaturesPageDefault.astro:281](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L281) und [FeaturesPageDefault.astro:297](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L297)

**Bewertung:** Auch ohne konkreten Betrag (s. R-03) ist die Formulierung „Vollwertiges Einkommen — der Punkt, an dem aus Nebenher ein echtes Standbein wird" **suggestiv**. Sie verspricht implizit die Erreichbarkeit eines vollwertigen Einkommens als Standard-Ziel — wieder mit §16 UWG-Risiko.

**Alternative:**
> *„Eigenes Einkommensziel — du definierst, ab welcher Provisionshöhe das Modell den Punkt markiert."*

---

##### 🟡 G-02 — FAQ-Headline „Was Sponsoren am häufigsten fragen"

**Fundstelle:** [IndexPageDefault.astro:395](website-astro/src/shared/components/sections/IndexPageDefault.astro#L395)

**Risiko:**
- Suggeriert, dass es bereits eine größere Sponsoren-Base mit empirisch erfassten Fragen gibt.
- Wenn die FAQ vom Anbieter selbst hypothetisch konstruiert wurde, ist die Headline **§5 UWG-irreführend** (Vortäuschung von Reichweite/Verbreitung).

**Alternative:**
> „Häufige Fragen" oder „Was wir oft gefragt werden"

---

##### 🟡 G-03 — Trust-Strip „Believer → 3* Diamond — alle Stufen abgedeckt"

**Fundstelle:** [IndexPageDefault.astro:134](website-astro/src/shared/components/sections/IndexPageDefault.astro#L134)

**Risiko:**
- Kombiniert mit den prominenten Zahlen erweckt der Trust-Strip im Verbund den Eindruck einer **Aufstiegs-Garantie bis zur Top-Stufe**.
- Standalone harmlos, im Kontext mit R-01/R-02/R-03 verstärkt es das Schneeball-Bild.

**Alternative:**
> „Vom Einstieg bis zu allen Karrierestufen — alle Vergütungsphasen abgebildet."

---

##### 🟡 G-04 — „Auch der günstigere Jahresplan bleibt monatlich kündbar — ohne Risiko, ohne Jahresfalle."

**Fundstelle:** [IndexPageDefault.astro:309-310](website-astro/src/shared/components/sections/IndexPageDefault.astro#L309-L310) und [pricing.yaml:94-95](website-astro/src/brands/lifeplus/content/pricing.yaml#L94-L95)

**Risiko:**
- „Ohne Risiko" ist als Werbeaussage **suspekt** — es gibt immer ein Restrisiko (Anbieter-Insolvenz, Service-Verschlechterung, technische Ausfälle). BGH-Rspr. zu Verbraucherwerbung: Absolute Aussagen sind nur zulässig, wenn sie objektiv stimmen.
- „Ohne Jahresfalle" suggeriert, dass andere Anbieter „Fallen" haben — ist eine **versteckte vergleichende Werbung** (§6 UWG), wenn ohne konkreten Bezug zum Markt.

**Alternative:**
> *„Auch der günstigere Jahresplan bleibt monatlich kündbar. Nicht genutzte volle Restmonate erstatten wir anteilig — du gehst keine Jahresbindung ein."*

---

##### 🟡 G-05 — „Faires Werkzeug, fairer Preis"

**Fundstelle:** [IndexPageDefault.astro:307](website-astro/src/shared/components/sections/IndexPageDefault.astro#L307)

**Risiko:** Niedrig. „Fair" ist ein **subjektives Werturteil** (gerade noch geschützt), aber bei häufiger Wiederholung kann es als objektive Beschaffenheits-Behauptung umgedeutet werden.

**Alternative:** Behalten, falls einmalig. Bei mehrfachem Vorkommen einmal entschärfen.

---

##### 🟡 G-06 — „Komprimierung wird korrekt berücksichtigt"

**Fundstelle:** [IndexPageDefault.astro:418](website-astro/src/shared/components/sections/IndexPageDefault.astro#L418)

**Risiko:**
- „Korrekt" ist eine objektive, prüfbare Aussage. Wenn die Engine im Detail vom offiziellen Vergütungsplan abweicht (was im realen Software-Leben der Fall sein wird), entsteht §5 UWG-Risiko.
- **Bezug zum offiziellen Plan:** Da LifePlus/PM-International der Vergütungsplan-Inhaber ist, kann eine fehlerhafte „Korrekt"-Aussage auch markenrechtliche/wettbewerbsrechtliche Implikationen haben (Vortäuschung autorisierter Repräsentation).

**Alternative:**
> *„Komprimierung ist nach den im Plan dokumentierten Regeln abgebildet. Bei Plan-Updates wird die Engine nachgezogen — kleinere Abweichungen zur aktuellen Praxis sind nicht ausgeschlossen."*

---

##### 🟡 G-07 — „Die Engine wird nachgezogen, sobald ein offizielles Update erscheint."

**Fundstelle:** [IndexPageDefault.astro:463](website-astro/src/shared/components/sections/IndexPageDefault.astro#L463)

**Risiko:**
- Versprechen einer kontinuierlichen Aktualisierungsleistung **ohne Frist**. Wenn der Anbieter mal mehrere Monate braucht, kann das als Pflichtverletzung gewertet werden.
- AGB-Bezug fehlt.

**Alternative:**
> *„Die Engine wird in der Regel zeitnah an Plan-Änderungen angepasst. Die genauen Bedingungen ergeben sich aus den AGB §X."*

---

##### 🟡 G-08 — „Ist {brand.siteName} als Betriebsausgabe absetzbar?" + Disclaimer

**Fundstelle:** [pricing.yaml:143-146](website-astro/src/brands/lifeplus/content/pricing.yaml#L143-L146)

**Zitat:**
> „Für Sponsoren, die mit dem Abo ihre Sponsoring-Tätigkeit unterstützen, ist es in aller Regel als Betriebsausgabe absetzbar. … Wir sind keine Steuerberater — sprich im Zweifelsfall mit deinem."

**Risiko:**
- **§5 UWG / Steuerberatungsrecht (StBerG §3):** Steuerliche Auskünfte sind in Deutschland Steuerberatern vorbehalten. Allgemeine Aussagen wie „in aller Regel als Betriebsausgabe absetzbar" sind grenzwertig — sie können als unzulässige Steuerberatung gewertet werden.
- Der Disclaimer „Wir sind keine Steuerberater" mildert das Risiko, hebt es aber nicht vollständig auf.

**Alternative:**
> *„Wenn du den Pro-Plan im Rahmen deiner Sponsoring-Tätigkeit nutzt, kann das Abo steuerlich relevant sein. Die konkrete steuerliche Behandlung hängt von deiner Situation ab und ist mit deinem Steuerberater zu klären. Wir stellen eine ordnungsgemäße Rechnung aus."*

Auch im Pricing-Note [pricing.yaml:96-98](website-astro/src/brands/lifeplus/content/pricing.yaml#L96-L98) entsprechend entschärfen.

---

##### 🟡 G-09 — „Abo · als Betriebsausgabe absetzbar" im Hero-Proof

**Fundstelle:** [IndexPageDefault.astro:47-48](website-astro/src/shared/components/sections/IndexPageDefault.astro#L47-L48)

**Risiko:** Gleiche Logik wie G-08, aber **prominenter platziert** und **ohne Disclaimer**. Hero-Aussage als Verkaufsargument, daher heikler.

**Alternative:**
> „Abo · steuerlich geltend machbar*"
> *(Sternchen → unten „bei Nutzung im Rahmen einer Sponsoring-Tätigkeit, bitte mit Steuerberater klären")*

---

##### 🟡 G-10 — Datenschutzerklärung §6: „nach derzeitigem Stand keine eigenen Cookies"

**Fundstelle:** [LegalDatenschutzDefault.astro:136-137](website-astro/src/shared/components/sections/LegalDatenschutzDefault.astro#L136-L137)

**Befund:**
- „nach derzeitigem Stand" verschleiert die Aussage.
- **Aber:** Es gibt mind. drei Datenverarbeitungen, die in §6 **nicht** erwähnt sind:
  - Magic-Link-Auth (Cookie/LocalStorage für Session-Token? — bitte technisch verifizieren)
  - Paddle-Checkout (Drittanbieter, sehr wahrscheinlich Cookies)
  - Service-Worker / installierbare Web-App (LocalStorage)
- **Google Fonts:** [BrandLayout.astro:30-35](website-astro/src/shared/components/layout/BrandLayout.astro#L30-L35) bindet `fonts.googleapis.com` und `fonts.gstatic.com` über `<link rel="preconnect">` und Stylesheet ein → **IP-Adressen werden in die USA übermittelt**. LG München 20.01.2022 (3 O 17493/20): Dynamische Einbindung von Google Fonts ist DSGVO-Verstoß. Lösung: Self-hosting der Fonts.

**Risiko:**
- **Art. 13 DSGVO, TTDSG §25:** Wesentliche Datenverarbeitungen unvollständig erklärt = Pflichtverletzung. Aufsichtsbehörde kann beanstanden.
- Google-Fonts-Einbindung **ohne Einwilligung** = abmahnsicheres Risiko (vgl. LG München 2022, Welle 2022/2023).

**Anwaltshinweis:** **Gelb-Rot.** Konkret: vor Launch
1. Self-hosting der Google Fonts erzwingen.
2. Datenschutzerklärung §6 ergänzen um Paddle, Magic-Link-Mechanismus, LocalStorage/Cache-Verhalten.

**Alternative §6:**
> *„Wir setzen keine eigenen Tracking- oder Analyse-Cookies ein. Für die Bereitstellung der Web-App und Buchung von Pro-Plänen werden folgende Datenverarbeitungen durchgeführt:*
> *- **Authentifizierung (Magic Link):** Beim Login speichern wir kurzzeitig einen Session-Token (LocalStorage/Cookie) auf Ihrem Gerät. Zweck: Anmeldung, Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: bis Abmeldung oder Ablauf des Tokens.*
> *- **Zahlungsabwicklung Paddle:** Beim Aufruf der Pricing-/Checkout-Seite werden Daten an Paddle.com Market Limited (London) übertragen. Paddle setzt eigene Cookies und kann Daten in die USA übertragen. Details: [paddle.com/legal/privacy](https://www.paddle.com/legal/privacy). Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO.*
> *- **Schriftarten:** Die Web-App lädt Schriftarten von einem deutschen Webspace. Es findet keine Übertragung an Google statt.*
> *- **Service-Worker / Installierbare Web-App:** Auf installierbaren Geräten speichert die App technische Dateien im Browser-Cache. Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO."*

---

##### 🟡 G-11 — Datenschutzerklärung §1: „Eingaben im Simulator werden lokal verarbeitet"

**Fundstelle:** [LegalDatenschutzDefault.astro:34-37](website-astro/src/shared/components/sections/LegalDatenschutzDefault.astro#L34-L37)

**Befund:**
- „nach aktuellem Stand nicht an einen eigenen Server übertragen" → relativiert die Aussage.
- Inkonsistent mit: Magic-Link-Account-System verarbeitet Daten **doch** serverseitig.

**Risiko:**
- Mittlere Irreführung. Datenschutzerklärung muss **akkurat** sein.

**Alternative:**
> *„Die Slider-Eingaben im Simulator werden im Browser berechnet und nicht an unseren Server übertragen. Davon zu unterscheiden sind Account-bezogene Daten (E-Mail, Plan-Status, geräteanzahl), die im Zuge der Authentifizierung und Abrechnung serverseitig verarbeitet werden — Details siehe §3 (Verantwortlicher) und §6 (Tools/Dienste)."*

---

##### 🟡 G-12 — Widerrufsbelehrung: Vorzeitiges Erlöschen bei „sofortigem Beginn"

**Fundstelle:** [LegalWiderrufDefault.astro:64-95](website-astro/src/shared/components/sections/LegalWiderrufDefault.astro#L64-L95)

**Befund:**
- §312f Abs. 3 BGB / §356 Abs. 5 BGB verlangen drei Voraussetzungen für das Erlöschen des Widerrufsrechts:
  1. Ausdrückliche Zustimmung,
  2. Bestätigung der Kenntnis des Erlöschens,
  3. Bestätigung in Textform.
- Aktuell heißt es in der Belehrung „Mit Abschluss des Kaufvorgangs im Paddle-Checkout stimmen Sie ausdrücklich zu …" — das ist nur dann wirksam, wenn der **Paddle-Checkout** diese drei Schritte tatsächlich abbildet (Checkbox + bestätigender Hinweis + Bestätigungs-Mail).

**Risiko:**
- Wenn der Checkout-Flow das nicht sauber umsetzt, **bleibt das Widerrufsrecht 14 Tage offen**, auch wenn der Nutzer den Dienst bereits genutzt hat → Erstattungsrisiko.
- AGB-Kontrolle: Wenn die Bestätigung nicht den drei Schritten genügt, ist die Klausel nach §308 Nr. 5 BGB unwirksam.

**Anwaltshinweis:** **Gelb-Rot.** Verifikation im Paddle-Checkout-Flow:
1. Checkbox „Ich stimme ausdrücklich zu, dass die Bereitstellung sofort beginnt"?
2. Checkbox „Ich nehme zur Kenntnis, dass mein Widerrufsrecht mit vollständiger Vertragserfüllung erlischt"?
3. Wird das in der Bestätigungs-E-Mail wiederholt?

Wenn nicht alle drei Punkte gegeben → Klausel im Widerruf entweder anpassen (zwei separate Checkboxes nachrüsten) oder das vorzeitige Erlöschen streichen.

---

##### 🟡 G-13 — AGB §7: „maximal drei (3) Geräte"

**Fundstelle:** [LegalAgbDefault.astro:100-104](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L100-L104)

**Befund:**
- Geräteobergrenze ist als Einzelplatzlizenz okay, aber **Account-Page** ([AccountPageDefault.astro:86](website-astro/src/shared/components/sections/AccountPageDefault.astro#L86)) zeigt „Geraete" als KPI — Verbraucher kann hier nicht erkennen, ob er die Grenze ausgeschöpft hat oder was passiert, wenn er sie überschreitet.

**Risiko:**
- **§307 BGB (Transparenzgebot):** AGB-Klauseln müssen klar und verständlich sein. Wenn dem Nutzer nicht erkennbar gemacht wird, was bei Überschreitung passiert (Sperrung? Aufpreis?), ist die Klausel angreifbar.

**Alternative AGB §7:**
> *„… auf maximal drei (3) Geräten gleichzeitig verwendet werden. **Bei Hinzufügen eines weiteren Geräts wird das am längsten inaktive Gerät automatisch entfernt.** Der Nutzer kann die Geräteliste im Account-Bereich einsehen und verwalten."*

Plus: Im Account-Bereich Geräteliste anzeigen (technisch).

---

##### 🟡 G-14 — Abogrenzen Verbraucher vs. Unternehmer

**Fundstelle:** [LegalAgbDefault.astro:43-49](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L43-L49) und [LegalAgbDefault.astro:98-103](website-astro/src/shared/components/sections/LegalAgbDefault.astro#L98-L103)

**Befund:**
- AGB unterscheidet **nicht durchgängig** zwischen Verbrauchern und Unternehmern.
- Marketing-Texte sprechen direkt Sponsoren an (Unternehmer), aber Webseite ist für alle erreichbar (Verbraucher).
- Konsequenz: Im Streitfall gilt der **schärfere Maßstab** (Verbraucherrecht) — auch für Sponsoren-Kunden.

**Alternative:** Klare AGB-Trennung — z.B. ergänzen:
> *„(2) Diese AGB richten sich gleichermaßen an Verbraucher (§13 BGB) und Unternehmer (§14 BGB). Soweit einzelne Regelungen nur für eine Gruppe gelten, ist dies kenntlich gemacht."*

Und prüfen: Werden Pricing-Beträge (€14,95 netto) **netto** angezeigt — was bei Verbrauchern §1 PAngV-Verstoß ist? Verbraucher müssen Brutto-Preise (mit USt.) sehen.

---

##### 🟡 G-15 — PAngV-Verstoß: Netto-Preise gegenüber Verbrauchern

**Fundstellen:**
- [pricing.yaml:36-39](website-astro/src/brands/lifeplus/content/pricing.yaml#L36-L39): „€14,95/Monat netto"
- [pricing.yaml:56-58](website-astro/src/brands/lifeplus/content/pricing.yaml#L56-L58): „€13,71/Monat netto"
- [pricing.yaml:76-79](website-astro/src/brands/lifeplus/content/pricing.yaml#L76-L79): „€12,46/Monat netto"
- [IndexPageDefault.astro:346, 365](website-astro/src/shared/components/sections/IndexPageDefault.astro#L346) — Pricing-Teaser zeigt ebenfalls Netto-Preise

**Befund:**
- **§1 Abs. 1 PAngV:** Gegenüber Verbrauchern sind **Bruttopreise (einschließlich USt.)** anzugeben. Netto-Preise mit Zusatz „zzgl. USt." sind **nicht ausreichend**.
- Auch der VAT-Banner [pricing.yaml:11-12](website-astro/src/brands/lifeplus/content/pricing.yaml#L11-L12) ändert daran nichts.
- **BGH 14.01.2010 — I ZR 88/08:** Auch bei Mischzielgruppe muss bei Endkonsumenten-Sicht Brutto angegeben werden.

**Risiko:**
- **PAngV-Verstoß** = klassischer Abmahngrund (Wettbewerbszentrale, IDO). Streitwerte oft 1.500–5.000 €.

**Anwaltshinweis:** **JA / Gelb-Rot.** Empfehlung:

**Variante A (sicher):**
> Brutto-Preis als Haupt-Anzeige, Netto in kleiner Schrift darunter:
> „€17,80/Monat" (Brutto) — „inkl. 19% USt. · €14,95 netto"

**Variante B (rechtlich riskanter, aber praktisch im SaaS-B2B üblich):**
> Aktive Auswahl-Toggle „Privat (brutto) / Geschäftlich (netto)" am Pricing-Header.

**Variante C:**
> Nur an Unternehmer verkaufen → AGB-Klausel ergänzen, Bestellprozess gating: „Bestellung nur möglich für Unternehmer im Sinne §14 BGB; bitte bestätigen". Schwächt die Conversion.

Für LifeFlow360 mit Mischzielgruppe → **Variante A**.

---

##### 🟡 G-16 — „Empfehlung · 2 Monate gratis" auf 12-Monats-Tier

**Fundstelle:** [pricing.yaml:73](website-astro/src/brands/lifeplus/content/pricing.yaml#L73)

**Befund:**
- „2 Monate gratis" suggeriert, der Nutzer bekomme 14 Monate zum Preis von 12.
- Tatsächlich: €149,50/Jahr = 12×€12,46 → Ersparnis gegenüber Monatsabo (12×€14,95 = €179,40) = €29,90 = ≈ 2 Monatsbeiträge.
- Rechnerisch korrekt, aber „gratis" ist **rechtlich heikel** — die Leistung erfolgt **mit** Bezahlung, nur zu einem niedrigeren effektiven Monatspreis.

**Risiko:**
- **§5 UWG:** „Gratis" / „kostenlos" darf nicht für Rabattierungen verwendet werden, wenn der Verbraucher tatsächlich zahlt. Vgl. EuGH-Rspr. zur „kostenlos"-Werbung.
- Mittleres Risiko. In der Praxis weit verbreitet, aber häufiger Abmahngegenstand.

**Alternative:**
- „Empfehlung · 16% sparen" oder
- „Empfehlung · Jahresvorteil" oder
- „Empfehlung · €30 sparen ggü. Monatsabo"

Gleiche Logik für „Halber Monat gratis" auf 6-Monats-Tier [pricing.yaml:52](website-astro/src/brands/lifeplus/content/pricing.yaml#L52).

---

##### 🟡 G-17 — „Ein Werkzeug. Vier klare Optionen."

**Fundstelle:** [pricing.yaml:7](website-astro/src/brands/lifeplus/content/pricing.yaml#L7)

**Befund:** Implizit korrekt (1× Free + 3× Pro), aber missverständlich, da Free **kein zahlungspflichtiger Plan** ist.

**Risiko:** Niedrig, aber als Verkaufsversprechen prüfen.

**Alternative:**
> „Vier Einstiegspunkte" oder „Ein Werkzeug. Vier Wege."

---

##### 🟡 G-18 — „14 Tage Pro testen" ohne Klärung der Folgen

**Fundstelle:** [pricing.yaml:17](website-astro/src/brands/lifeplus/content/pricing.yaml#L17) und [pricing.yaml:21](website-astro/src/brands/lifeplus/content/pricing.yaml#L21)

**Befund:**
- Free-Tier verspricht „14 Tage Pro testen, danach Free nutzen."
- Unklar: Geht eine automatische Charge-Aufforderung raus? Muss der Nutzer aktiv ablehnen? Was passiert mit gespeicherten Daten?

**Risiko:**
- **§312j BGB (Button-Lösung):** Wenn nach 14 Tagen kostenpflichtig wird, muss die ursprüngliche Bestellung den „Zahlungspflichtig bestellen"-Button erfüllen.
- Aktuell scheint **kein** automatisches Charge → niedriges Risiko. Aber Transparenz fehlt.

**Alternative:**
> „14 Tage Pro testen — danach **automatisch** zurück in Free. Kein versteckter Wechsel in einen kostenpflichtigen Plan."

Wenn das so technisch stimmt, ist diese Formulierung sogar ein **starkes Verkaufsargument** (s. R-Findings im Marketing-Teil später).

---

##### 🟡 G-19 — „Beliebige Geräte" (CTA „Mobil, Tablet & Desktop")

**Fundstelle:** [pricing.yaml:43](website-astro/src/brands/lifeplus/content/pricing.yaml#L43)

**Befund:** Im Konflikt mit AGB §7 (max. 3 Geräte). Nutzer könnte „Mobil, Tablet & Desktop" so verstehen, dass er **unbeschränkt** zwischen Geräten wechseln kann.

**Risiko:**
- **§5 UWG:** Werbeaussage ist mit AGB nicht konsistent.

**Alternative:**
> „Mobil, Tablet & Desktop (bis zu 3 Geräte gleichzeitig)"

Gleiche Logik in [IndexPageDefault.astro:351](website-astro/src/shared/components/sections/IndexPageDefault.astro#L351).

---

##### 🟡 G-20 — „Komme zum Simulator" — Verlinkung zu Drittsystem ohne Hinweis

**Fundstelle:** [Header.astro:69-74](website-astro/src/shared/components/layout/Header.astro#L69-L74) → `brand.appUrl` = `https://www.lifeflow360.app/app/`

**Befund:**
- Marketing-Seite verlinkt auf die App. Die App ist auf derselben Domain (gleicher Verantwortlicher), aber ggf. mit anderer Datenschutz-Konsequenz.
- **Konsistenz:** Datenschutzerklärung müsste die App-Eigenschaften mit abdecken oder eine eigene App-Datenschutzerklärung verlinken.

**Risiko:** Niedrig, falls App auf Webseite-Datenschutzerklärung verweist.

**Aktion:** Verifizieren, dass die App entweder dieselbe Datenschutzerklärung nutzt **oder** auf die Webseite-Datenschutzerklärung verlinkt.

---

##### 🟡 G-21 — „Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren teilzunehmen."

**Fundstelle:** [LegalImpressumDefault.astro:32-35](website-astro/src/shared/components/sections/LegalImpressumDefault.astro#L32-L35)

**Befund:**
- Gut, dass die Aussage drin steht (§36, §37 VSBG-Pflicht).
- **Aber:** Bei Online-Verträgen mit Verbrauchern gilt zusätzlich Art. 14 ODR-VO: Link zur OS-Plattform muss angegeben werden — **auch wenn nicht teilgenommen wird**.

**Risiko:** Niedrig, aber Abmahngrund.

**Alternative:**
> *„**Online-Streitbeilegung:** Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr). Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."*

---

##### 🟡 G-22 — Footer-Mailto-Kontakt ohne Telefon-Pflicht

**Fundstelle:** [Footer.astro:28](website-astro/src/shared/components/layout/Footer.astro#L28) und [contact.ts:6](website-astro/src/shared/lib/contact.ts#L6) („015678 334022")

**Befund:**
- Telefonnummer ist im Impressum hinterlegt — gut.
- Aber: §5 DDG verlangt eine „elektronische Kommunikation, die eine **schnelle elektronische Kontaktaufnahme** ermöglicht". E-Mail allein reicht aus, Telefon ist Pflicht im Impressum. Beides ist okay vorhanden.
- Mailto-Link auf einer **Mobilnummer** ist ungewöhnlich für einen kommerziellen Anbieter — kein rechtlicher Mangel, aber Vertrauensthema.

**Risiko:** Niedrig.

---

#### 🟢 GRÜN — Unauffällig

| Stelle | Bewertung |
|---|---|
| [LegalAgbDefault.astro:1-180](website-astro/src/shared/components/sections/LegalAgbDefault.astro) — Struktur AGB | Insgesamt sinnvoll gegliedert, sachlich. §§1-12 und §14 sind im Kern okay. (Anwaltliche Schlussabnahme dennoch zwingend, s. Action-Liste.) |
| [LegalWiderrufDefault.astro](website-astro/src/shared/components/sections/LegalWiderrufDefault.astro) — Widerruf | Mustertext gut adaptiert, B2B-Ausnahme klar, Paddle-Rückerstattung adressiert. Detailprüfung G-12 bleibt offen. |
| [LegalDatenschutzDefault.astro §§1-5](website-astro/src/shared/components/sections/LegalDatenschutzDefault.astro#L16-L132) | Standard-Block ist solide. Lücken nur bei Tools/Dienste (siehe G-10). |
| [IndexPageDefault.astro:130-138](website-astro/src/shared/components/sections/IndexPageDefault.astro#L130-L138) — Trust-Strip-Items „5 Slider", „10 Jahre Verlauf", „3 Phasen-Vergütung" | Sachliche Produktbeschreibung. Solo unauffällig (s. G-03 für Kontextrisiko). |
| [FeaturesPageDefault.astro:209-216](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L209-L216) — Drei Simulationsmodelle „Standard/Zufall/Momentum" | Sachlich-funktional, kein Versprechen. |
| [FeaturesPageDefault.astro:445-447](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L445-L447) — „DSGVO-konform" | Aussage **muss** durch tatsächliche Konformität gedeckt sein. Im Verbund mit G-10-Befunden derzeit nicht voll belastbar — wenn G-10 abgearbeitet ist, Aussage okay. |
| [LegalImpressumDefault.astro:16-29](website-astro/src/shared/components/sections/LegalImpressumDefault.astro#L16-L29) — Anbieter + Kontakt | Pflichtangaben vorhanden. „c/o COCENTER" als Adresszusatz ist okay, falls Geschäftsbetrieb dort tatsächlich stattfindet. |
| AGB §2 — Paddle als Merchant of Record | Korrekt und gut platziert. Lob: Genaue Adressangabe + Verweis auf Paddle-Bedingungen. |

---

### 1.3 Strukturelle Befunde (übergreifend)

#### S-01 — Fehlender Einkommens-Disclosure / „Income Disclosure Statement"

**Befund:** Keine eigene Seite, keine separate Sektion mit ehrlicher Einordnung typischer Network-Marketing-Einkommen.

**Empfehlung:** Pre-Launch eine Seite `/einkommens-hinweise` (oder ähnlich) anlegen mit:
- Klare Aussage, dass Simulationsergebnisse keine Einkommens-Zusicherung sind.
- Verweis auf öffentliche LifePlus/PM-International Income Disclosure (falls vorhanden) oder allgemeine Branchen-Statistiken.
- Erläuterung, dass die Mehrheit der Teilnehmer kein vollberufliches Einkommen erzielt.
- Verlinkung von allen Stellen mit konkreten Beträgen (R-01, R-02, R-03).

Damit wird das Risiko aus R-01/R-02/R-03 deutlich reduziert — nicht gänzlich beseitigt, aber im Streitfall verteidigbar.

#### S-02 — Fehlender Cookie-Consent-Mechanismus

**Befund:** Keine Cookie-Banner-Logik sichtbar in der Codebase. BrandLayout.astro bindet jedoch Google Fonts und (auf Pricing) Paddle.js ein.

**Risiko:**
- **TTDSG §25 / TDDDG:** Setzen von **nicht zwingend erforderlichen** Cookies oder ähnlichen Speichertechniken erfordert vorherige Einwilligung.
- Paddle.js setzt mit hoher Wahrscheinlichkeit Cookies bereits beim Aufruf der Pricing-Seite.
- Google Fonts überträgt IP-Adressen ohne Einwilligung (s. G-10).

**Empfehlung:** Vor Launch
1. Google Fonts self-hosten.
2. Paddle.js entweder nur **nach** explizitem Checkout-Klick laden (Lazy-Init), oder Cookie-Banner einbauen.
3. Magic-Link-Auth-Token im LocalStorage prüfen, ob „zwingend erforderlich" greift (Authentifizierung → ja, daher okay).

#### S-03 — Verkaufsförderung („Plan jetzt starten" auf Free)

**Befund:** Free-Tier-CTA „Plan jetzt starten" suggeriert kostenpflichtigen Abschluss.

**Risiko:**
- **§5a UWG:** Verbraucher kann annehmen, mit Klick einen kostenpflichtigen Plan abzuschließen. Wenn der Klick tatsächlich nur das kostenlose Konto öffnet, ist die Werbung **nicht irreführend**, aber missverständlich.
- **§312j BGB (Button-Lösung):** Greift hier **nicht** (kein kostenpflichtiger Bestellprozess), aber das Verbraucher-Verständnis ist negativ verzerrt.

**Empfehlung:** Free-CTA umbenennen → „Kostenlos starten" oder „Free starten".

#### S-04 — Sponsor-Bezug als Verkaufsargument

**Befund:** Mehrere Texte sprechen explizit Sponsoren an (Hero-Eyebrow, FAQ, Pricing-FAQ „Brauche ich für jeden Interessenten ein eigenes Abo?").

**Risiko:**
- **§16 Abs. 2 UWG (Schneeball):** Texte wie „Wenn dein Interessent das Tool selbst nutzen möchte (nachdem er Sponsor geworden ist), schließt er ein eigenes Abo ab" ([pricing.yaml:156](website-astro/src/brands/lifeplus/content/pricing.yaml#L156)) erwarten den Anwerbe-Prozess als gegebenen Geschäftsablauf. Nicht abmahnsicher angreifbar, aber Teil des Gesamtbilds.

**Empfehlung:** Bezug behalten, aber **nicht** mit Einkommensversprechen kombinieren (siehe R-01/R-02/R-03).

#### S-05 — Inkonsistenz „kostenlos" vs. „Free"

**Befund:** Mischung aus deutschem „kostenlos" und englischem „Free" als Plan-Bezeichner.

**Risiko:** Niedrig. „Free" als Marken-/Plan-Name ist erlaubt, sollte aber im Pflichttext-Kontext (AGB) eindeutig referenziert sein.

**Empfehlung:** Konsistenz herstellen. AGB §6 / Pricing-YAML synchron halten.

---

### 1.4 Risiko-Übersicht (Visual)

| Stufe | Anzahl | Kommentar |
|---|---|---|
| 🔴 **ROT** | 8 Findings (R-01 bis R-08) | Vor Live-Schaltung **zwingend** zu beheben oder zu entschärfen. Mehrere mit direkter Abmahn-Hochrisiko-Lage. |
| 🟡 **GELB** | 22 Findings (G-01 bis G-22) | Vor Live-Schaltung **abzuarbeiten**. Einzelne sind ebenfalls abmahnrelevant (G-10 Google Fonts, G-15 PAngV). |
| 🟢 **GRÜN** | Mehrere Bereiche unauffällig | Solide Basis vorhanden, vor allem Widerrufsbelehrung-Mustertext und AGB-Grundstruktur. |
| **Strukturelle** | 5 Befunde (S-01 bis S-05) | Übergreifende Pre-Launch-Aufgaben. |

---

### 1.5 Priorisierte Action-Liste für Pre-Launch-Phase

#### Tier 1 — Vor jedem öffentlichen Sichtbar-Sein zwingend (Abmahn-Hochrisiko)

| # | Aktion | Aufwand | Quelle |
|---|---|---|---|
| **T1-1** | FAQ-Antwort „€4.000–€10.000/Monat" entschärfen oder entfernen | 30 min Copy | R-01 |
| **T1-2** | Hero-Mockup-Zahl „€8.420" entfernen oder durch Beispiel-Kennzeichnung + Disclosure-Link absichern | 1-2h Design+Copy | R-02 |
| **T1-3** | Ziele-Leiter Eurobeträge & Jahresangaben aus Mockup entfernen | 1h | R-03 |
| **T1-4** | „Vorlage. Vor Live-Schaltung prüfen lassen." aus AGB-Footer löschen (parallel: Datenschutz, Impressum gleichlautende Vermerke) | 5 min | R-04 |
| **T1-5** | AGB §13 (Änderungsklausel) anwaltlich überarbeiten lassen | 2-5h Anwalt | R-05 |
| **T1-6** | Google Fonts self-hosten (oder Cookie-Consent einführen) | 2-4h Tech | G-10, S-02 |
| **T1-7** | PAngV-Verstoß: Brutto-Preise als Haupt-Anzeige | 1-2h Copy+YAML | G-15 |
| **T1-8** | Einkommens-Disclosure-Seite anlegen, von R-01/R-02/R-03-Stellen verlinken | 3-5h Konzept+Copy | S-01 |

**Geschätzter Gesamtaufwand Tier 1:** 12-20h plus Anwaltsstunden.

#### Tier 2 — Vor breiter Vermarktung (Gelb-Findings)

| # | Aktion | Aufwand | Quelle |
|---|---|---|---|
| **T2-1** | „Realistisch / ehrlich / realitätsnah" sitewide entschärfen | 1h | R-08 |
| **T2-2** | Datenschutzerklärung §6 ergänzen (Magic-Link, Paddle, LocalStorage, Schriftarten) | 2h | G-10, G-11 |
| **T2-3** | Magic-Link-Login-Hinweis am Form ergänzen | 30 min | R-07 |
| **T2-4** | Pricing-CTAs vereinheitlichen, Free-Tier-CTA umbenennen | 30 min | S-03 |
| **T2-5** | „Vollwertiges Einkommen" entschärfen, „gratis" durch „sparen" ersetzen | 30 min | G-01, G-16 |
| **T2-6** | Steuer-Aussagen (Betriebsausgabe) entschärfen | 30 min | G-08, G-09 |
| **T2-7** | „Ohne Risiko, ohne Jahresfalle" mildern | 15 min | G-04 |
| **T2-8** | „Korrekt" / „Komprimierung korrekt" entschärfen | 15 min | G-06 |
| **T2-9** | „Engine wird nachgezogen" mit AGB-Verweis koppeln | 15 min | G-07 |
| **T2-10** | OS-Link in Impressum ergänzen | 5 min | G-21 |
| **T2-11** | Geräte-Klausel (G-13, G-19) AGB + Marketing synchronisieren | 1h | G-13, G-19 |
| **T2-12** | Widerruf-Vorzeit-Erlöschen verifizieren — Paddle-Checkout-Flow prüfen | 1-2h Tech | G-12 |
| **T2-13** | Verbraucher-/Unternehmer-Abogrenzen in AGB schärfen | 1h | G-14 |

**Geschätzter Gesamtaufwand Tier 2:** 10-15h.

#### Tier 3 — Empfehlungen für laufenden Betrieb

| # | Aktion |
|---|---|
| **T3-1** | Bei Markteintritt in AT/CH: länderspezifische Pflichttext-Anpassungen prüfen lassen |
| **T3-2** | Mind. jährlicher Review der Pflichttexte mit Datum-Vermerk |
| **T3-3** | Cookie-Consent-Banner nachrüsten, sobald Marketing-Tools (Analytics, Pixel) hinzukommen |
| **T3-4** | Bei Testimonials/Erfahrungsberichten: Einwilligungs-Workflow vor Veröffentlichung implementieren |
| **T3-5** | Domain-Strategie final entscheiden (`.app` vs. `.de`), Pflichttexte auf allen Live-Domains verfügbar |

---

### 1.6 Klare Anwaltsempfehlung

**Vor Live-Schaltung zwingend einen IT-/Vertragsrechts-Anwalt einbinden für:**

1. **AGB-Komplett-Review** (mind. §§3, 5, 6, 7, 10, 13 — siehe R-05).
2. **Income-Disclosure-Strategie** — wie weit darf das Marketing gehen, was muss disclosed werden? (R-01, R-02, R-03, S-01)
3. **Widerruf-Mechanismus** im Paddle-Checkout-Flow auf Konformität mit §356 Abs. 5 BGB prüfen (G-12).
4. **PAngV-Konformität** der Pricing-Page (G-15).
5. **§16 UWG (Schneeball)-Bewertung** der Gesamt-Marketing-Argumentation — eine spezialisierte Kanzlei für Network-Marketing-/MLM-Recht ist hier wertvoller als ein klassischer IT-Anwalt.

**Geschätzter Anwaltsaufwand für Tier-1-Themen:** 5-10 Anwaltsstunden je nach Vertiefung. Investition wahrscheinlich kleiner als das Risiko einer einzigen Abmahnung (€1.500–€5.000 pro Verstoß, plus Anwaltskosten der Gegenseite).

---

### 1.7 Zusammenfassung in einem Satz

> Die LifeFlow360-Webseite hat **8 rote und 22 gelbe Befunde**. Die wichtigsten sind konkrete Einkommens-/Verdienstaussagen im Hero und in der Ziele-Leiter, fehlende PAngV-konforme Brutto-Preise, eine wahrscheinlich unwirksame AGB-Änderungsklausel und Google-Fonts-Einbindung ohne Self-Hosting. Vor Live-Schaltung sind Tier-1-Maßnahmen zwingend, eine anwaltliche Prüfung der AGB und der Einkommens-Marketing-Strategie ist nicht verhandelbar.

---

### 1.8 Disclaimer

> *Dieser Skill ist ein KI-gestützter Risiko-Scan auf Basis publizierter Rechtslage und Best Practices. Er ersetzt keine anwaltliche Beratung. Vor Live-Schaltung von Webinhalten mit identifizierten Risiken ist eine anwaltliche Prüfung dringend empfohlen, bei Hochrisiko-Findings zwingend.*

---

## 2. Marketing Review

### 2.1 Executive Summary

LifeFlow360 hat eine **starke Grundsubstanz**: konkretes Produkt, klare Zwei-Pfad-Logik (Interessentengespräch + eigene Downline), saubere Pricing-Architektur, sauberes Design-System. Die Website ist textstark — und genau das ist auch die größte Schwäche: zu viele eigenständig schöne Sätze, die als Funnel-Sequenz aber nicht zusammenarbeiten.

**Drei strukturelle Diagnosen:**

1. **Der Zwei-Pfad-Ansatz wird zwar konzeptionell benannt („Im Interessentengespräch" + „In der eigenen Downline"), aber im Funnel-Verlauf nicht durchgehalten.** Die Hero spricht beide Pfade simultan an, die FAQ spricht überwiegend den Einstiegs-Pfad, der Final-CTA wieder beide. Resultat: Beide Zielgruppen fühlen sich „auch gemeint", aber keine fühlt sich „direkt angesprochen".

2. **Die CTA-Sequenz ist defokussiert.** „Simulator starten" / „Simulator öffnen" / „Plan jetzt starten" / „Zum Simulator" — vier Varianten für dieselbe Aktion. Selbst der Free-Tier-CTA suggeriert „Plan" (siehe Legal G-S03). Das untergräbt die Hauptaktion (Trial-Start) und die Sub-Aktion (Buchung) gleichermaßen.

3. **Die rechtlich heikelsten Stellen sind gleichzeitig die conversion-stärksten.** Die konkreten Eurobeträge in der Ziele-Leiter und der Hero-Mockup-Zahl wirken — aber genau diese Wirkung ist juristisch nicht haltbar (Legal R-02, R-03). Diese Befunde sind keine reine Legal-Hygiene-Aufgabe, sondern eine Marketing-Repositionierungs-Aufgabe: **emotionale Wirkung durch andere Hebel ersetzen.** Genau dafür liefert dieser Bericht Vorschläge.

**Top 3 Conversion-Hebel:**

| # | Hebel | Impact | Aufwand |
|---|---|---|---|
| 1 | Hero-Repositionierung: konkretes Versprechen statt abstrakter Headline | **HIGH** | Mittel (2-4h Copy + Test) |
| 2 | Free-Tier-Promise klären: 14-Tage-Trial sichtbar als Mehrwert framen | **HIGH** | Niedrig (30 min YAML) |
| 3 | CTA-Hierarchie aufbauen: 3 statt 4+ Varianten, klare Semantik | **HIGH** | Niedrig (1h sitewide) |

---

### 2.2 Positionierung & Botschaft

#### 2.2.1 Hero-Headline — zu schön, zu abstrakt (HIGH)

**Fundstelle:** [IndexPageDefault.astro:25-27](website-astro/src/shared/components/sections/IndexPageDefault.astro#L25-L27)

**Aktuell:**
> „Netzwerk-Wachstum versteht man nicht in *Tabellen*. Man versteht es, wenn man es verändert."
> „Man versteht es, wenn man es verändert." (Sub-H1)

**Marketing-Diagnose:**
- **Sprachlich exzellent.** Anti-These-Struktur, Aphorismus-Qualität, prägnant.
- **Conversion-schwach.** Drei Probleme:
  1. **Kein konkretes Versprechen.** „Verstehen" ist kein Resultat, das ein Sponsor zur Conversion bewegt — Sponsoren wollen besser closen, Member halten, Downline motivieren.
  2. **Keine Zielgruppen-Adressierung in der Headline selbst.** Eyebrow „Für LifePlus-Sponsoren" trägt die Last allein.
  3. **„Tabellen" als negatives Ankerbild ist abstrakt.** Welcher Sponsor wacht morgens auf mit dem Problem „Ich habe zu viele Tabellen"? Das eigentliche Problem ist: „Mein Interessent steigt im Gespräch aus, weil er den Vergütungsplan nicht versteht."

**Vorschläge (3 Varianten, von sicher-konservativ bis mutig):**

**Variante A — Outcome-zentriert (Einstiegs-Pfad):**
> „Zeig deinem Interessenten, wie sich sein Netzwerk entwickeln kann."
> „Ohne Tabellen, ohne Vortrag — mit fünf Reglern und einer Kurve."

**Variante B — Schmerzpunkt-zentriert (beide Pfade):**
> „Den Vergütungsplan erklärt jeder. Du zeigst, *wie er sich entfalten kann.*"
> „Live-Simulation für Interessentengespräche und die eigene Downline."

**Variante C — Tool-zentriert, niederschwellig (Einstiegs-Pfad, A/B-Kandidat):**
> „Fünf Slider. Zehn Jahre. *Ein Gespräch ohne Folien.*"
> „Der Simulator für Sponsoren, die rechnen statt vortragen wollen."

**Top-Pick: Variante B.** Sie hält die antithetische Eleganz der Originalheadline, ist aber outcome-konkret und adressiert beide Pfade explizit.

⚠ LEGAL-TRIGGER: Variante A „wie sich sein Netzwerk entwickeln **kann**" — Konjunktiv ist sauber. Vermeide in finalen Copy-Versionen: „wie sich sein Netzwerk entwickeln **wird**" (siehe Legal R-08 zu „realistisch / ehrlich"-Sprache).

---

#### 2.2.2 Hero-Subline — 41 Wörter Dichte-Wand (HIGH)

**Fundstelle:** [IndexPageDefault.astro:29-31](website-astro/src/shared/components/sections/IndexPageDefault.astro#L29-L31)

**Aktuell:**
> „Mit fünf Basiswerten simulierst du live, wie Member, Shopper, Umsatz, Duplikation und Fluktuation über Jahre auf Vergütung, Ziele und Teamstruktur wirken. Für ruhigere Gespräche mit Interessenten und mehr Orientierung in deiner Downline."

**Marketing-Diagnose:**
- 41 Wörter, 5 Fachbegriffe (Member, Shopper, Duplikation, Fluktuation, Vergütung), 3 Wirkungsbereiche (Vergütung, Ziele, Teamstruktur), 2 Use-Cases (Interessentengespräch, Downline).
- Liest sich wie eine **Produkt-Spec**, nicht wie ein Verkaufsargument.
- **Pfad-Vermischung in einem Satz:** „ruhigere Gespräche mit Interessenten" (Einstiegs-Pfad) + „mehr Orientierung in deiner Downline" (Durchhalte-Pfad). Beide Pfade haben unterschiedliche emotionale Trigger — eine Wand bedient keinen.

**Vorschlag (zur Hero-Variante B oben):**
> „Fünf Regler. Live-Kurve über zehn Jahre. Dein Interessent stellt selbst ein, was er sich zutraut — und sieht, was daraus wird."

Wortzahl: 20. Subline ist niedrigschwellig, konkret, und richtet sich am Hero-Use-Case aus (Interessentengespräch).

Den zweiten Use-Case (Downline) **bewusst nicht hier** — der bekommt seinen Platz im „Zwei Situationen — Ein Werkzeug"-Block direkt darunter, wo er die Aufmerksamkeit verdient.

⚠ LEGAL-TRIGGER: „sieht, was daraus wird" könnte als Ergebnis-Versprechen gelesen werden. Sauber: „sieht, was das Modell daraus macht" oder „sieht das Bild zu seinen Annahmen" (siehe Legal R-01).

---

#### 2.2.3 Eyebrow + Trust-Strip — Zielgruppen-Fit gut, Wirkung gemischt (MEDIUM)

**Fundstellen:**
- Eyebrow: [IndexPageDefault.astro:18-22](website-astro/src/shared/components/sections/IndexPageDefault.astro#L18-L22)
- Trust-Strip: [IndexPageDefault.astro:130-138](website-astro/src/shared/components/sections/IndexPageDefault.astro#L130-L138)

**Stärken:**
- Eyebrow „Für LifePlus-Sponsoren" + Marken-Tag ist klar und filtert die Zielgruppe sauber.
- Trust-Strip-Struktur (Eingebaute Logik · Zahlen-Items) ist visuell stark.

**Schwächen:**
- „**Believer → 3* Diamond**" als Trust-Item ist textlich überladen für die kurze Strip-Position.
- „**<100ms Reaktion**" ist **falsche Zielgruppensprache**. Ein Sponsor liest „Sub-100ms" nicht als Vertrauen, sondern als Tech-Jargon. Anders: Webentwickler tun das. Das ist die falsche Zielgruppe.
- „**3 Phasen-Vergütung**" ist sachlich okay, aber abstrakt — der Sponsor weiß, was Phasen sind, aber das KPI sagt nichts über das, was die App leistet.

**Vorschlag (5 KPIs, Sponsor-Sprache):**

| Aktuell | Vorschlag | Begründung |
|---|---|---|
| 5 Slider | **5 Slider** | Behalten. Konkret, einprägsam. |
| 10 Jahre Verlauf | **10 Jahre Kurve** | „Verlauf" ist Tool-Sprache, „Kurve" ist visuell. |
| 3 Phasen-Vergütung | **Alle 3 Vergütungsphasen** | Klarer, was abgedeckt ist. |
| Believer → 3* Diamond | **Believer bis Diamond** | „3* Diamond" ist Insider-Detail, im Strip zu kleinteilig. |
| <100ms Reaktion | **Sofort sichtbar** | Sponsor-Sprache statt Tech-Jargon. |

Bonus-Option als 6. Item, falls Platz: **„Mobil & Desktop"** oder **„Per Link teilbar"** — beides sind direkte Sponsor-Argumente.

---

#### 2.2.4 Kernbotschaft „Zwei Situationen — Ein Werkzeug" — gut strukturiert, schwacher Übergang (MEDIUM)

**Fundstelle:** [IndexPageDefault.astro:140-223](website-astro/src/shared/components/sections/IndexPageDefault.astro#L140-L223)

**Stärken:**
- Use-Case-Split (Interessentengespräch + Downline) ist **das stärkste Konzept der Seite.** Genau dieser Split ist es, was LifeFlow360 vom generischen „Vergütungsrechner"-Markt abhebt.
- Die Hockeystick-Visualisierung mit Wendepunkt ist visuell exzellent.
- „Aus Vortrag wird gemeinsames Rechnen" / „Durststrecken einordnen statt sie wegreden" — beides sind starke Headlines.

**Schwächen:**
- „**DAS PROBLEM**" als Eyebrow für die Hockeystick-Visualisierung wirkt aufgesetzt — die folgende Headline „Der Vergütungsplan ist transparent — Wachstum im Netzwerk ist es nicht" ist ein gutes Statement, braucht aber keinen aufgeladenen „PROBLEM"-Stempel.
- **Übergang zwischen Hockeystick-Block und Use-Case-Split fehlt.** Visuell trennt nur ein dünner Divider. Logisch ist der Sprung jedoch groß: vom „Warum es schwer ist, Netzwerk zu verstehen" zum „Wie du es konkret einsetzt".

**Vorschlag:**

1. Eyebrow „DAS PROBLEM" → ersetzen durch **„DIE LÜCKE"** oder **„WORUM ES GEHT"** (weniger drohend, mehr neugierig-machend).

2. Übergangs-Satz nach Hockeystick-Block, vor dem Divider:
> „Genau diese Lücke zwischen Plan-Erklärung und gefühltem Wachstum schließt LifeFlow360 — in zwei Situationen, die jeder Sponsor kennt:"

3. Use-Case-Headlines konkretisieren:
   - „Aus Vortrag wird gemeinsames Rechnen." → stark, behalten.
   - „Durststrecken einordnen, statt sie wegreden." → stark, behalten. **Nur prüfen, ob das Wort „Durststrecke" für Erstbesucher gleich verständlich ist** — alternativ: „Geduldsphasen einordnen, statt sie wegreden."

---

#### 2.2.5 Final-CTAs — beides verpasste Chancen (HIGH)

**Fundstellen:**
- Index-Final: [IndexPageDefault.astro:478-493](website-astro/src/shared/components/sections/IndexPageDefault.astro#L478-L493)
- Pricing-Final: [pricing.yaml:161-165](website-astro/src/brands/lifeplus/content/pricing.yaml#L161-L165)

**Index-Final aktuell:**
> „Aus Annahmen wird ein *Bild.*"
> „Im Gespräch oder in der eigenen Downline: Slider bewegen, Verlauf anschauen, Zwischenziele setzen. Keine Folien, kein Hype."

**Pricing-Final aktuell:**
> „Eine Entscheidung. *Ein Werkzeug.*"
> „Frei testen oder direkt im Gespräch nutzen — beides startet mit einem Klick."

**Marketing-Diagnose:**
- Beide Headlines sind **literarisch schön, conversion-schwach.** Sie eröffnen, statt zu schließen.
- Final-CTA-Position ist die letzte Chance vor dem Absprung. Hier muss die **stärkste Aktion** stehen, nicht die ruhigste Reflexion.

**Vorschlag Index-Final:**
> „Probier es. Genau jetzt."
> „Slider bewegen, Kurve ansehen, in 60 Sekunden eigene Werte simulieren. Free starten — keine Kreditkarte nötig."

Direkt-aufforderung statt Reflexion. Konkrete Zeitspanne („60 Sekunden") senkt die Hemmung. Free-Argument („keine Kreditkarte") räumt letzte Bedenken aus.

**Vorschlag Pricing-Final:**
> „Heute testen, später entscheiden."
> „14 Tage Pro, danach automatisch zurück in Free. Kein versteckter Wechsel, keine Kreditkarte nötig."

Diese Variante macht aus dem **Trial-Mechanismus selbst** ein Verkaufsargument (siehe auch 2.4.2 unten).

---

### 2.3 Befunde nach Seiten

#### 2.3.1 Index

**Conversion-Pfad-Analyse:**

| Position | Pfad-Adressierung | Bewertung |
|---|---|---|
| Hero | Beide simultan (über Eyebrow + Subline) | Pfad-Unschärfe |
| Trust-Strip | Tool-fokussiert | OK, pfad-neutral |
| Kernbotschaft | Beide klar getrennt | **Stärkster Block der Seite** |
| Feature-Teaser | Tool-fokussiert | OK, pfad-neutral |
| Pricing-Teaser | Einstiegs-Pfad (impliziert Trial) | OK |
| FAQ | Überwiegend Einstiegs-Pfad | Durchhalte-Pfad fehlt |
| Final-CTA | Beide simultan | Pfad-Unschärfe |

**Diagnose:** Der Funnel beginnt unscharf, klärt sich in der Mitte (Kernbotschaft), und endet wieder unscharf. **Empfehlung:** Hero und Final-CTA klar dem **Einstiegs-Pfad** zuordnen (das ist die Conversion-stärkere Zielgruppe für die öffentliche Marketing-Site), den Durchhalte-Pfad konsistent durch den Kernbotschaft-Block bedienen.

**Weitere Befunde Index:**

**Befund I-01: Pricing-Teaser-Intro schwach (MEDIUM)**

*Fundstelle:* [IndexPageDefault.astro:306-310](website-astro/src/shared/components/sections/IndexPageDefault.astro#L306-L310)

Aktuell: „Faires Werkzeug, *fairer Preis.*" — „fair" zweimal in vier Wörtern. Plus: „Starte frei, teste 14 Tage Pro und wähle danach zwischen drei fairen Laufzeiten."

Vorschlag:
> „Klarer Preis, klare Laufzeiten."
> „Starte kostenlos. Teste 14 Tage mit allen Pro-Funktionen. Wähle danach — oder bleib bei Free."

⚠ LEGAL-TRIGGER: „Ohne Risiko, ohne Jahresfalle" entschärfen (siehe Legal G-04). Vorschlag: „Auch im Jahresplan monatlich kündbar — keine Jahresbindung."

**Befund I-02: FAQ-Headline irreführend (HIGH)**

*Fundstelle:* [IndexPageDefault.astro:395](website-astro/src/shared/components/sections/IndexPageDefault.astro#L395)

Aktuell: „Was Sponsoren *am häufigsten* fragen."

Suggeriert empirische Datenbasis. Ehrlicher und gleichzeitig sympathischer:
> „Häufige Fragen — und wo wir sie ehrlich beantworten."

⚠ LEGAL-TRIGGER: siehe Legal G-02.

**Befund I-03: FAQ-Reihenfolge — Schwerstes zuerst (HIGH)**

*Fundstelle:* [IndexPageDefault.astro:398-466](website-astro/src/shared/components/sections/IndexPageDefault.astro#L398-L466)

Die erste FAQ ist **„Sind die Zahlen wirklich realistisch — oder Marketing?"** — und ist standardmäßig **aufgeklappt** (`open`-Klasse). Das ist mutig und tonal stark („Wir antworten ehrlich auf die unbequemste Frage zuerst").

Aber: Die aktuelle Antwort enthält den größten rechtlichen Sprengsatz der gesamten Site (siehe Legal R-01). Marketing-strategisch: Die Position ist richtig, der Text muss neu.

Vorschlag-Variante zur ersten FAQ-Antwort (rechtssicher + emotional stark):
> „Realistisch heißt: realistisch für deine Eingabewerte. Setzt du 100 % Duplikation und 0 % Fluktuation, kommt mathematisch eine Milliarden-Zahl heraus — praktisch unmöglich.
>
> Setzt du moderate Werte (z.B. 30 % Duplikation, 20 % Fluktuation), wird die Kurve schnell deutlich flacher. Welche Werte für dein Modell *realistisch* sind, hängt von deinem Markt, deinem Einsatz und vielen anderen Faktoren ab — Network Marketing ist und bleibt ein Geschäft mit individuellen Ergebnissen.
>
> Was der Simulator garantiert: Er rechnet **exakt das, was du eingibst.** Keine geschönten Zahlen, keine versteckte Optimierung."

Damit bleibt die rhetorische Pointe („Der Simulator lügt nicht") inhaltlich erhalten, ohne konkrete Eurobeträge auszuwerfen.

⚠ LEGAL-TRIGGER: siehe Legal R-01.

**Befund I-04: FAQ-Reihenfolge sonstige Items (MEDIUM)**

Aktuell:
1. Sind die Zahlen realistisch?
2. Welche Vergütungen sind eingerechnet?
3. Kann ich das im Kundengespräch zeigen?
4. Wie werden die Stufen-Jahre berechnet?
5. Was kostet LifeFlow360?
6. Was passiert, wenn der Vergütungsplan sich ändert?

Vorschlag-Reihenfolge (psychologisch besser):
1. Sind die Zahlen realistisch? (Killer-Einwand)
2. Kann ich das im Kundengespräch zeigen? (Use-Case-Validierung)
3. Was kostet LifeFlow360? (Preis vor technischen Details — wer Preis akzeptiert, liest weiter)
4. Welche Vergütungen sind eingerechnet? (Tiefe)
5. Wie werden die Stufen-Jahre berechnet? (Mehr Tiefe)
6. Was passiert, wenn der Vergütungsplan sich ändert? (Schluss-Beruhigung)

**Befund I-05: Mockup-Texte zu prominent Insider (MEDIUM)**

*Fundstellen:* [IndexPageDefault.astro:70](website-astro/src/shared/components/sections/IndexPageDefault.astro#L70) („Realistisch · 30% Dup · 20% Fluk")

„Dup" und „Fluk" sind interne Kürzel, die im Hero-Mockup-Frame über der Faltlinie stehen — also das **Erste, was ein Erstbesucher textlich liest**, bevor er die Headline überhaupt verarbeitet hat.

Vorschlag:
> „Beispielrechnung · 30 % Duplikation · 20 % Fluktuation"

Zwei Vorteile auf einmal: (a) keine Insider-Kürzel mehr, (b) explizit als **Beispiel** gekennzeichnet, was den rechtlichen Bedarf aus Legal R-02 mitlöst.

⚠ LEGAL-TRIGGER: siehe Legal R-02.

---

#### 2.3.2 Features

**Conversion-Pfad-Analyse:** Features-Page ist überwiegend tool-fokussiert (pfad-neutral) und gut strukturiert: 6 Feature-Blöcke + Lite-Features + Final-CTA. Die Wechsel zwischen Text-links/Visual-rechts und umgekehrt funktionieren visuell.

**Befund F-01: Feature-Headline-Konsistenz schwankt (LOW)**

*Fundstelle:* [FeaturesPageDefault.astro:33, 78, 153, 208, 270, 317](website-astro/src/shared/components/sections/FeaturesPageDefault.astro)

Sechs Feature-Überschriften:
1. „Fünf Slider. *Sein* Plan, nicht deiner." — stark
2. „10 Jahre auf einer *Kurve.* Nicht auf 30 Folien." — stark
3. „Vom Believer zum *Diamond.* Und wann?" — okay
4. „Drei Modelle. *Vom einfachen Wachstum bis zur realen Team-Dynamik.*" — schwächste, zu lang
5. „Ziele-Leiter. *Zwischenziele* statt nur Endsumme." — okay
6. „Netzwerk im Zeitverlauf. *Struktur* statt nur Endsumme." — okay, aber „statt nur Endsumme" wiederholt Feature 5

Vorschlag Feature 4 (kürzer, kontrastreicher):
> „Drei Modelle. *Von linear bis lebensnah.*"

Vorschlag Feature 6 (Wiederholung vermeiden):
> „Netzwerk im Zeitverlauf. *Struktur sehen, nicht nur Summe.*"

**Befund F-02: Ziele-Leiter — Conversion-Star, aber Legal-Sprengsatz (HIGH)**

*Fundstelle:* [FeaturesPageDefault.astro:260-303](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L260-L303)

Die Ziele-Leiter ist **emotional die stärkste Feature** der ganzen Site. „Produktkosten refinanziert → Auto finanziert → Mietfrei wohnen → Vollwertiges Einkommen" ist eine lebensnahe Eskalation, die Sponsoren sofort verstehen.

**Aber:** Genau diese Konkretheit ist juristisch nicht haltbar (Legal R-03).

**Marketing-Lösungsweg:** Die emotionale Wirkung kommt aus den **Kategorien** („Auto", „Mietfrei wohnen"), nicht aus den Eurobeträgen. Wenn man die Beträge entfernt und die Kategorien als **vom Nutzer selbst zu setzende Ziele** framing, behält man 80 % der emotionalen Wirkung — und gewinnt sogar einen User-Engagement-Hebel dazu („eigenes Ziel definieren" ist eine aktive Handlung).

Vorschlag — Kombination aus Variante A + C aus Legal R-03:
- Headline behalten: „Ziele-Leiter. *Zwischenziele* statt nur Endsumme."
- Intro umformulieren: „Du wählst die Ziele, die für dich zählen. Der Simulator zeigt, in welchem Jahr deine Annahmen jedes Ziel erreichen."
- Mockup-Visual: Beträge und Jahre **nicht** vorbelegen (oder als offensichtliche Eingabefelder darstellen).
- Liste der Kategorien behalten, aber als Beispiel-Inspiration, nicht als Versprechen.

**Bonus-Idee:** Mockup-Eyebrow „Beispiel — deine Werte können abweichen" — macht aus dem rechtlichen Disclaimer ein UX-Element.

⚠ LEGAL-TRIGGER: siehe Legal R-03 und G-01.

**Befund F-03: Lite-Features-Block — „DSGVO-konform" zu prominent (LOW)**

*Fundstelle:* [FeaturesPageDefault.astro:439-448](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L439-L448)

„DSGVO-konform · Keine Tracking-Cookies, keine Drittparteien. Daten bleiben zwischen dir und ihm."

⚠ LEGAL-TRIGGER: Aktuell nicht voll deckungsgleich mit Realität (siehe Legal G-10: Google Fonts, Paddle). Bis Self-Hosting Google Fonts + Cookie-Lösung läuft, ist die Aussage angreifbar.

Marketing-Lösung: bei den Quick-Wins beibehalten, aber bis Tech-Fix umformulieren:
> „Datensparsam · Keine eigenen Tracking-Cookies. Eingaben bleiben im Browser."

**Befund F-04: Features-Final-CTA — „Simulator öffnen" vs. „Simulator starten" (LOW)**

*Fundstelle:* [FeaturesPageDefault.astro:464-466](website-astro/src/shared/components/sections/FeaturesPageDefault.astro#L464-L466)

„Simulator öffnen" weicht sprachlich vom überall sonst genutzten „Simulator starten" ab. → CTA-Vereinheitlichung (siehe 2.4.1).

---

#### 2.3.3 Pricing

**Conversion-Pfad-Analyse:** Pricing-Seite ist gut strukturiert (Hero → 4 Tiers → Notes → Comparison → FAQ → Final-CTA). Die Comparison-Tabelle ist ein starkes Vertrauenselement.

**Befund P-01: Free-Tier-Promise verwirrt (HIGH)**

*Fundstelle:* [pricing.yaml:15-30](website-astro/src/brands/lifeplus/content/pricing.yaml#L15-L30)

Aktuell:
- desc: „14 Tage Pro testen, danach Free nutzen."
- billed: „kostenlos · mit Magic-Link · ohne Kreditkarte"
- features:
  - „Jahr 1-4 sichtbar — langfristige Werte bleiben begrenzt"
  - „1 aktuelles Szenario, keine Speicherung"
  - „Ideal, um das Prinzip kennenzulernen"

**Probleme:**
1. Die 14-Tage-Pro-Phase wird in der Description erwähnt, aber **nicht** als Vorteil unter Features gelistet. Wirkung: liest sich wie ein Trial-Trick.
2. „Jahr 1-4 sichtbar" untergräbt die Hero-Promise „10 Jahre Verlauf" (siehe Legal- und Marketing-Konflikt unten).
3. „Ideal, um das Prinzip kennenzulernen" ist passiv-defensiv — klingt wie „für Looker, nicht Käufer".

**Vorschlag (Free-Tier neu, conversion-stark + rechtlich sauber):**

```yaml
- id: "free"
  name: "Free"
  descHtml: "Kostenlos starten.<br>Erste 14 Tage mit allen Pro-Funktionen."
  currency: "€"
  value: "0"
  unit: "/Monat"
  billed: "dauerhaft kostenlos · ohne Kreditkarte"
  features:
    - strong: "14 Tage Pro inklusive"
      text: "— voller Funktionsumfang zum Start"
    - strong: "Automatisch zurück in Free"
      text: "— kein versteckter Wechsel, keine Charge"
    - text: "Danach: Kern-Funktionen ohne Limit, langfristige Sicht reduziert"
  cta:
    kind: "link"
    label: "Kostenlos starten"
    url: "/app/"
```

**Was sich geändert hat:**
- Trial wird als **Vorteil**, nicht als Disclaimer kommuniziert.
- „Automatisch zurück in Free" macht das Trial-Ende zum Verkaufsargument („kein Trial-Trick").
- „Danach: Kern-Funktionen ohne Limit" framed das Free-Angebot positiv, nicht als „begrenzt".
- CTA-Label „Kostenlos starten" statt „Plan jetzt starten" (Legal S-03).

**Befund P-02: Comparison-Tabelle untergräbt Hero-Promise (HIGH)**

*Fundstelle:* [pricing.yaml:115-119](website-astro/src/brands/lifeplus/content/pricing.yaml#L115-L119)

Die Comparison-Tabelle zeigt:
- 5-Slider-Simulator: Free = „begrenzt"
- 10-Jahres-Verlauf & Chart: Free = „Jahr 1-4"
- Stufen-Prognose: Free = „begrenzt"

**Konflikt mit der Hero-Story:** Die ganze Index-Seite trainiert den Besucher auf die Aussage „Im 7. Jahr wird's eindrucksvoll" (Features-Page Headline F-02). Free zeigt aber nur Jahr 1-4 — also genau **bis vor** dem Wendepunkt.

Der Hockeystick-Moment, der das Produkt verkauft, ist im Free-Tier nicht sichtbar. Wer wegen der Story kommt, sieht sie nicht.

**Drei strategische Optionen:**

**Option A (Pro-Konvertierung priorisieren):** Free bei „Jahr 1-4" lassen, aber **prominent als Verkaufsargument** framen:
> „Free zeigt deine Wachstumsphase 1-4 — den Hockeystick-Wendepunkt ab Jahr 5 schaltest du mit Pro frei."

**Option B (Erstbesuch-Erlebnis priorisieren):** Free auf **Jahr 1-7** ausweiten, sodass der Wendepunkt drin ist. Dann reduzieren auf 1 Szenario, keine Speicherung, kein Modelle-Wechsel. Begründung: Wer den Wendepunkt sieht, will dauerhaft Zugriff — und konvertiert.

**Option C (Balance):** Free zeigt „Jahr 1-5", Wendepunkt-Andeutung sichtbar, volle Kurve aber nur in Pro. Marketing-Sprache: „Bis Jahr 5 — den vollen Verlauf mit Pro."

**Marketing-Empfehlung:** Option B. Die Conversion-Hypothese „Wer den Hockeystick selbst gesehen hat, kauft Pro" ist plausibel und A/B-testbar (siehe 2.6).

Aktuell gewählte Option A ist die konservative, blockiert aber den emotionalen Hauptverkaufsmoment.

**Befund P-03: Pricing-Card-Hierarchie — 4 Tiers visuell schwer (MEDIUM)**

*Fundstelle:* [PricingPageDefault.astro:336-346](website-astro/src/shared/components/sections/PricingPageDefault.astro#L336-L346)

Vier Karten nebeneinander auf Desktop, bei ≤1120px auf 2×2, bei ≤640px auf 1. Aktuelle Reihenfolge: Free / 1 Monat / 6 Monate / **12 Monate (Featured)**.

**Probleme:**
- Featured-Card ist ganz rechts → bei 2×2-Layout unten rechts → außerhalb des **Visual-Hot-Spots** (oben links bis Mitte).
- Free und Featured sind die zwei wichtigsten Entscheidungsanker, stehen aber in den äußeren Extrempositionen.

**Vorschlag:**

Option 1 (Featured in die Mitte):
- Reihenfolge: Free / 6 Monate / **12 Monate (Featured)** / 1 Monat
- Featured steht im Zentrum, 1 Monat als „Flex-Option ganz rechts" für Unentschiedene.

Option 2 (Featured weiter links):
- Reihenfolge: Free / **12 Monate (Featured)** / 6 Monate / 1 Monat
- Featured direkt nach Free, Sprung von „0 €" auf „beste Option" — psychologisch stark.

**Marketing-Empfehlung:** Option 2 für A/B-Test. Begründung: Free ist Entry-Anker, direkt daneben die Empfehlung bietet die kürzeste Entscheidungsstrecke.

**Befund P-04: „Monatlich kündbar trotz Jahresrabatt" — bestes USP versteckt (HIGH)**

*Fundstellen:* [pricing.yaml:94-95](website-astro/src/brands/lifeplus/content/pricing.yaml#L94-L95), [IndexPageDefault.astro:309-310](website-astro/src/shared/components/sections/IndexPageDefault.astro#L309-L310)

Der „Monatlich kündbar"-Punkt ist ein außergewöhnliches Versprechen für ein SaaS — die meisten Wettbewerber zwingen bei Jahresrabatt zu Jahresbindung. Aktuell steht das USP:
- als Intro-Satz im Pricing-Teaser (überlesbar)
- als Pricing-Note unter den Karten (zu spät im Funnel)
- in FAQ
- in den AGB

**Vorschlag:**

1. **Als Badge** direkt auf der 12-Monats-Karte: aktuell „Empfehlung · 2 Monate gratis" → ändern in zwei Badges (vertikal):
   - **Badge 1:** „Empfehlung"
   - **Badge 2:** „Monatlich kündbar"

   ⚠ LEGAL-TRIGGER: „2 Monate gratis" sollte zu „Jahresvorteil" oder „16 % sparen" werden (siehe Legal G-16).

2. **Als Eyebrow im Pricing-Hero:** Aktuell „Preise & Konditionen" → ändern in „Preise · monatlich kündbar trotz Jahresrabatt"

3. **Als USP-Strip** im Pricing-Hero (analog zum Hero-Proof auf Index):
   - ✓ Monatlich kündbar
   - ✓ Keine Jahresbindung
   - ✓ Restmonate anteilig zurück
   - ✓ Ordentliche Rechnung

**Befund P-05: VAT-Banner — informativ, aber visuell laut (LOW)**

*Fundstelle:* [pricing.yaml:10-12](website-astro/src/brands/lifeplus/content/pricing.yaml#L10-L12) + [PricingPageDefault.astro:38-48](website-astro/src/shared/components/sections/PricingPageDefault.astro#L38-L48)

Aktuell ist der VAT-Banner direkt unter der Hero-H1 platziert mit Brand-Surface-Background und Border.

**Problem:** Der erste Inhalt, den Pricing-Besucher unter der Hero sehen, ist ein **Steuer-Banner** — das ist tonal trocken und schreckt eher ab. Plus: Mit den Brutto-Preisen aus Legal G-15 wird der Banner ohnehin überarbeitet.

**Vorschlag:** Banner nach den Pricing-Cards platzieren (vor den Notes), in dezenterer Form (Border, kein Background):
> „**Preisangaben:** Alle Preise inkl. USt. Auf Wunsch im Checkout als Unternehmer-Variante mit Reverse-Charge (gültige EU-VAT-ID erforderlich)."

⚠ LEGAL-TRIGGER: siehe Legal G-15 zur PAngV-Konformität.

**Befund P-06: Pricing-FAQ-Reihenfolge (MEDIUM)**

*Fundstelle:* [pricing.yaml:133-159](website-astro/src/brands/lifeplus/content/pricing.yaml#L133-L159)

Aktuell:
1. Wie kann ich kündigen?
2. Kann ich vom Monats- aufs Jahresabo wechseln?
3. Ist LifeFlow360 als Betriebsausgabe absetzbar?
4. Welche Zahlungsmethoden gibt es?
5. Gibt es eine kostenlose Testphase?
6. Brauche ich für jeden Interessenten ein eigenes Abo?
7. Was passiert mit meinen Szenarien, wenn ich kündige?

**Diagnose:** Aufgabe der ersten FAQ ist, den größten Conversion-Bremser abzuräumen. Bei Pricing ist das nicht „Wie kann ich kündigen", sondern **„Gibt es eine kostenlose Testphase?"** (Frage 5) oder „Was kostet's wirklich?" (gar nicht in FAQ — implizit).

**Vorschlag-Reihenfolge:**
1. **Gibt es eine kostenlose Testphase?** (jetzt #5)
2. **Wie kann ich kündigen?** (jetzt #1)
3. **Was passiert mit meinen Szenarien, wenn ich kündige?** (jetzt #7)
4. Welche Zahlungsmethoden gibt es?
5. Kann ich zwischen Laufzeiten wechseln?
6. Ist es als Betriebsausgabe absetzbar?
7. Brauche ich für jeden Interessenten ein eigenes Abo?

Begründung: Erst Risiko-Abbau (Trial + Kündigung + Datenmitnahme), dann Komfort (Zahlung, Wechsel), dann Vertiefung.

---

#### 2.3.4 Mein-Konto

**Befund M-01: Anonym-Zustand ist Sackgasse (HIGH)**

*Fundstelle:* [AccountPageDefault.astro:31-51](website-astro/src/shared/components/sections/AccountPageDefault.astro#L31-L51)

Erstbesucher, der irrtümlich auf „Mein Konto" klickt (z.B. via Header-Link), sieht ein Login-Form und sonst nichts. Kein „Noch kein Konto? → Free starten" CTA.

**Vorschlag:** Sekundären CTA-Block unter dem Login-Form:
> „Noch kein Konto?"
> „Du kannst LifeFlow360 jederzeit ohne Anmeldung ausprobieren. Free starten — keine Kreditkarte, keine Verpflichtung."
> [Button: Simulator starten] [Button: Pricing ansehen]

Setzt voraus, dass die App auch anonym nutzbar ist (laut Pricing-Teaser scheint das so zu sein: „Magic-Link, kein Passwort", „Keine Kreditkarte nötig"). Falls die App **doch** ein anonymes Probier-Erlebnis hat, ist dies ein Quick-Win.

**Befund M-02: Encoding-Bug zerstört Vertrauen (HIGH)**

*Fundstelle:* mehrere in [AccountPageDefault.astro](website-astro/src/shared/components/sections/AccountPageDefault.astro)

Umlaute fehlen durchgehend („naechsten", „Geraete", „Gueltig", „Kuendigung", „ueber") — wahrscheinlich Encoding-Artefakt aus der Source-Migration. Im **vertrauensssensibelsten Bereich** (Bezahlung & Account-Management) zerstört das die Glaubwürdigkeit.

**Quick-Win:** Alle Umlaute fixen.

**Befund M-03: Paddle-Disclaimer informativ, aber ohne emotionalen Anker (LOW)**

*Fundstelle:* [AccountPageDefault.astro:100-103](website-astro/src/shared/components/sections/AccountPageDefault.astro#L100-L103)

Aktuell: „Zahlung, Rechnung und Kuendigung laufen ueber Paddle als Verkaufsabwickler (Merchant of Record). Aktualisiere Karte / SEPA und lade Rechnungen herunter ueber »Abo bei Paddle verwalten«."

Information stimmt — aber fehlt der **Warum-Anker** für den Nutzer.

**Vorschlag:**
> „Bezahlung und Rechnungen laufen sicher über Paddle (Merchant of Record). Vorteil für dich: Karte/SEPA aktualisieren, Rechnungen herunterladen und kündigen — alles in einem zentralen Portal. → [Button: Abo bei Paddle verwalten]"

**Befund M-04: „du@example.com" Placeholder (LOW)**

*Fundstelle:* [AccountPageDefault.astro:43](website-astro/src/shared/components/sections/AccountPageDefault.astro#L43)

Englischer Placeholder in deutscher App. Vorschlag: `name@beispiel.de` oder Placeholder leer und Label „E-Mail-Adresse" prominent.

---

### 2.4 Übergreifende Themen

#### 2.4.1 CTA-Hierarchie — vier Varianten, keine klare Semantik (HIGH)

**Aktueller Bestand:**

| Variante | Wo verwendet | Semantik aktuell |
|---|---|---|
| „Simulator starten" | Hero, Final-CTA, Header | Hauptaktion |
| „Simulator öffnen" | Features-Final | Synonym, aber abweichend |
| „Plan jetzt starten" | Pricing-Cards (auch Free!) | Buchung — aber bei Free irreführend |
| „Zum Simulator" | Account (eingeloggt) | App-Wechsel |

**Vorschlag — klare 3-Stufen-Hierarchie:**

| Aktion | CTA | Verwendung |
|---|---|---|
| **Trial / App starten** | „Simulator starten" | Hero, Features-Final, alle Trial-Einstiegspunkte sitewide |
| **Kostenpflichtig buchen** | „[Plan-Name] starten" → z.B. „1 Monat starten", „12 Monate starten" | Nur kostenpflichtige Pricing-Cards |
| **Kostenlos starten** | „Kostenlos starten" | Free-Tier-Card |
| **App-Wechsel (eingeloggt)** | „Zum Simulator" | Account |

⚠ LEGAL-TRIGGER: „Plan jetzt starten" auf Free-Tier ist nicht nur defokussiert, sondern auch suggestiv (siehe Legal S-03).

#### 2.4.2 Trial-Mechanik als Marketing-Hebel (HIGH)

Aktuell wird „14 Tage Pro testen" als **technisches Detail** kommuniziert. Tatsächlich ist es eines der stärksten Verkaufsargumente: **Automatisches Rückfallen in Free statt Auto-Charge** ist im SaaS-Markt unüblich und damit ein echter USP.

**Hebel:** An mindestens drei Stellen prominent platzieren:
1. Hero-Proof-Item auf Index: „14 Tage Pro testen — danach automatisch zurück in Free"
2. Free-Tier-Feature (siehe P-01)
3. Pricing-Final-CTA-Body (siehe 2.2.5)

#### 2.4.3 Tonalität — generell stark, drei Ausnahmen (MEDIUM)

**Stark:**
- Hero-Sprache: aphoristisch, leise, professionell. Trifft den „warm-professionellen Mix" sehr gut.
- Kernbotschaft-Block: empathisch ohne weichgespült.
- Features-Headlines: kontrastreich, einprägsam.

**Tonbrüche:**
1. **Mockup-Insider-Sprache** („Dup", „Fluk", „<100ms") — Tech-Drift in Sponsor-Tonalität (Befund I-05).
2. **Account-Page** — Umlaut-Bug + sachlich-trockener Ton vs. emotional-warmer Marketing-Funnel (Befund M-02).
3. **Final-CTAs** — literarisch statt aktivierend (Befund 2.2.5).

#### 2.4.4 „Sponsor" als Begriff (LOW)

Für die LifeFlow360-Brand (LifePlus/PM-International-Kontext) ist „Sponsor" korrekt und durchgängig verwendet. **Innerhalb dieses Scopes kein Problem.** Bei zukünftiger Multi-Brand-Erweiterung wäre ein konfigurierbarer `partnerTerm` sinnvoll, aber das ist FitFlow360/Eqology-Thema, nicht LifeFlow360.

#### 2.4.5 Lockup-Tagline „BESSER VERSTEHEN. STÄRKER WACHSEN." (LOW)

*Fundstelle:* [brand.yaml:24](website-astro/src/brands/lifeplus/brand.yaml#L24)

Funktioniert für LifeFlow360 in Standalone-Betrachtung. „Verstehen" + „Wachsen" greifen die beiden Pfade (Einstiegs-Pfad = Verstehen, Durchhalte-Pfad = Wachsen) elegant auf.

⚠ LEGAL-TRIGGER: „STÄRKER WACHSEN" ist im Network-Marketing-Kontext leicht angreifbar (Wachstumsversprechen). In Lockup-Position aber als **Brand-Tagline** weniger problematisch als in Body-Copy. Sollte beim Legal-Skill als Tier-3-Befund festgehalten werden, ist aber nicht Quick-Win-relevant.

#### 2.4.6 Header-CTA-Redundanz (LOW)

*Fundstelle:* [Header.astro:69-74](website-astro/src/shared/components/layout/Header.astro#L69-L74)

Header-CTA „Simulator starten" + Hero-CTA „Simulator starten" sind identisch und visuell beide prominent.

**Vorschlag:** Header-CTA kürzer und visuell etwas zurückhaltender:
- Text: „App öffnen" oder „Starten"
- Visuell: nicht primary-color, sondern secondary-tone

Damit gewinnt der Hero-CTA „Simulator starten" mehr Gewicht.

---

### 2.5 Action-Liste

#### Quick-Wins (< 1h pro Item)

| # | Action | Datei | Impact |
|---|---|---|---|
| QW-1 | Free-Tier-CTA „Plan jetzt starten" → „Kostenlos starten" | pricing.yaml | HIGH |
| QW-2 | Free-Tier-Features umstellen (siehe P-01) | pricing.yaml | HIGH |
| QW-3 | Hero-Mockup-Eyebrow „Beispielrechnung · 30 % Duplikation · 20 % Fluktuation" | IndexPageDefault.astro | HIGH |
| QW-4 | FAQ-Reihenfolge auf Index ändern (siehe I-04) | IndexPageDefault.astro | MEDIUM |
| QW-5 | FAQ-Headline „Häufige Fragen — und wo wir sie ehrlich beantworten" | IndexPageDefault.astro | MEDIUM |
| QW-6 | Trust-Strip-Items umtexten (siehe 2.2.3) | IndexPageDefault.astro | MEDIUM |
| QW-7 | Account-Page Umlaute fixen | AccountPageDefault.astro | HIGH |
| QW-8 | Account-Page Anonym-Zustand CTA „Free starten" (siehe M-01) | AccountPageDefault.astro | HIGH |
| QW-9 | 12-Monats-Card Badge erweitern: „Monatlich kündbar" | pricing.yaml | HIGH |
| QW-10 | Pricing-Final-CTA umtexten (siehe 2.2.5) | pricing.yaml | MEDIUM |
| QW-11 | Index-Final-CTA umtexten (siehe 2.2.5) | IndexPageDefault.astro | HIGH |
| QW-12 | CTA-Vereinheitlichung „Simulator öffnen" → „Simulator starten" | FeaturesPageDefault.astro | LOW |
| QW-13 | Header-CTA visuell zurücknehmen (siehe 2.4.6) | Header.astro | LOW |
| QW-14 | „du@example.com" → realistischer Placeholder | AccountPageDefault.astro | LOW |
| QW-15 | „Realistisch / ehrlich / realitätsnah" sitewide ersetzen (siehe Legal R-08) | mehrere | HIGH |

**Geschätzter Gesamtaufwand Quick-Wins:** 6-10h. Liefert geschätzt 60-70 % des Conversion-Hebels.

#### Strategische Aufgaben (4-12h)

| # | Action | Begründung |
|---|---|---|
| ST-1 | Hero-Repositionierung (Headline + Subline + Eyebrow als kohärentes Set) | Stärkster Conversion-Hebel der Seite |
| ST-2 | Free-Tier-Sichtbarkeitsentscheidung (Option A/B/C aus P-02) | Trifft die Kern-Conversion-Hypothese |
| ST-3 | Ziele-Leiter neu konzipieren (P-02, R-03-Synthese) | Rechtssicher + erhalten emotionalen Hebel |
| ST-4 | Pricing-Card-Reihenfolge ändern (P-03) | Visual-Hot-Spot-Optimierung |
| ST-5 | Income-Disclosure-Seite anlegen (Legal S-01) | Pflicht UND Trust-Signal |
| ST-6 | FAQ neu strukturieren auf Index + Pricing (I-04, P-06) | Risikoeinwände früh räumen |
| ST-7 | Zwei-Pfad-Konsistenz herstellen (Hero ⇒ Einstieg, Kernbotschaft ⇒ beide) | Architektur-Klarheit |
| ST-8 | Account-Page Paddle-Disclaimer mit Why-Anker (M-03) | Vertrauen im Bezahlbereich |

---

### 2.6 A/B-Test-Vorschläge

#### A/B-Test 1: Hero-Headline (höchster Hebel)

**Hypothese:** Eine konkrete, outcome-fokussierte Headline konvertiert besser als die abstrakt-aphoristische Aktuell-Variante.

**Setup:**
- **Control (A):** „Netzwerk-Wachstum versteht man nicht in *Tabellen*. Man versteht es, wenn man es verändert."
- **Variant (B):** „Den Vergütungsplan erklärt jeder. Du zeigst, *wie er sich entfalten kann.*"

**Primärmetrik:** Click-Rate auf Hero-CTA „Simulator starten".
**Sekundärmetrik:** Scroll-Tiefe (sieht jemand zumindest die Kernbotschaft?).
**Dauer:** 2-3 Wochen oder 500+ Hero-Impressions pro Variante.

#### A/B-Test 2: Free-Tier-Scope (Conversion-Hebel auf Pro)

**Hypothese:** Wer den Hockeystick-Wendepunkt im Free-Erlebnis sieht, konvertiert häufiger zu Pro.

**Setup:**
- **Control (A):** Free zeigt Jahr 1-4 (aktuell).
- **Variant (B):** Free zeigt Jahr 1-7 — Wendepunkt drin, aber Pro-Upgrade-Hinweis sichtbar.

**Primärmetrik:** Free → Pro Conversion-Rate.
**Sekundärmetrik:** Retention (kehrt der Free-Nutzer zurück?).
**Anmerkung:** Setzt App-seitige Konfigurations-Flexibilität voraus.

#### A/B-Test 3: Pricing-Featured-Position

**Hypothese:** Featured-Card in zweiter Position (nach Free) konvertiert höher als in vierter Position.

**Setup:**
- **Control (A):** Reihenfolge Free → 1 Monat → 6 Monate → **12 Monate (Featured)**.
- **Variant (B):** Reihenfolge Free → **12 Monate (Featured)** → 6 Monate → 1 Monat.

**Primärmetrik:** Click-Rate auf 12-Monats-CTA.
**Sekundärmetrik:** Klick-Verteilung über alle Tiers.

---

### 2.7 Verzahnung mit Legal — Synthese

| Legal-Finding | Marketing-Lösung | Conversion-Verlust? |
|---|---|---|
| R-01 (Einkommens-FAQ) | Neuformulierung als „Was der Simulator garantiert: Er rechnet exakt das, was du eingibst" | Minimal — Pointe bleibt |
| R-02 (Hero-Mockup-Zahl) | „Beispielrechnung"-Eyebrow + Disclosure-Link | Neutral — wird sogar transparenter |
| R-03 (Ziele-Leiter) | Kategorien behalten, Beträge entfernen, User-Input-Framing | Nur 20 % Verlust, dafür User-Engagement-Hebel gewonnen |
| R-04 (Vorlage-Hinweis) | Löschen | Reiner Gewinn |
| R-05 (AGB §13) | Anwaltliche Überarbeitung | Kein Marketing-Effekt |
| R-08 („realistisch") | „mit deinen Werten" / „transparent" | Minimal — Begriff war ohnehin werbe-typisch leer |
| G-15 (PAngV/Netto) | Brutto-Preise als Hauptanzeige | **NEGATIV** — Preise wirken höher. Kompensation: stärkere USP-Kommunikation („monatlich kündbar", siehe P-04) |
| G-16 („gratis") | „16% sparen" oder „Jahresvorteil" | Leicht negativ — Lösung: zweiter Badge „Monatlich kündbar" gibt Mehrwert |

**Synthese:** Die rechtlich notwendigen Anpassungen kosten Conversion **nur** bei G-15 (Brutto-Preise) und G-16 (Gratis-Wording). Beide werden durch die Repositionierung des „Monatlich kündbar"-USP (P-04) überkompensierbar. Alle anderen Legal-Befunde sind Marketing-neutral oder sogar Marketing-positiv (Transparenz schafft Vertrauen, „Free-Trick"-Verdacht wird abgebaut).

---

### 2.8 Closing

**LifeFlow360 hat das stärkste Konzept im Network-Marketing-Tooling, das ich gesehen habe:** ein ehrliches Zwei-Pfad-Werkzeug für ein notorisch schwer zu erklärendes Geschäftsmodell. Die Marketing-Texte sind handwerklich exzellent — sie lassen aber Conversion liegen, weil sie an entscheidenden Stellen (Hero, CTAs, Final-CTAs) ästhetische Eleganz über aktivierende Klarheit stellen.

Die Quick-Wins (QW-1 bis QW-15) sind in einem Halbtag umsetzbar und bringen den größten Hebel. Die strategischen Aufgaben sind in einer Woche umsetzbar und positionieren die Site für signifikanten Conversion-Anstieg.

**Empfehlung der nächsten zwei Schritte:**

1. **Quick-Wins-Sprint (heute/morgen):** QW-1, QW-2, QW-3, QW-7, QW-8, QW-9, QW-11, QW-15 als Mini-Sprint umsetzen. Aufwand: 4-6h. Impact: deutlich.

2. **Hero-Repositionierung mit A/B-Test (nächste Woche):** ST-1 als saubere Variante umsetzen, A/B-Test 1 aufsetzen. Aufwand: 1-2 Tage. Impact: kann 15-25 % Conversion-Uplift bringen.

> Soll ich für einen der Vorschläge konkrete Copy-Varianten in finaler Polish-Qualität ausarbeiten — z.B. die finale Hero-Variante, die neue Free-Tier-YAML, oder das Income-Disclosure-Statement (gemeinsam mit Legal-Skill)?

---

**Zwei-Pfad-Mapping dieses Reviews:**
- **Einstiegs-Pfad:** Index-Hero, Pricing-Page, Final-CTAs, Account-Anonym-Zustand
- **Durchhalte-Pfad:** Kernbotschaft Card 02 („Durststrecken einordnen"), Ziele-Leiter (nach Repositionierung), Account-Eingeloggt-Zustand
- **Pfad-neutral:** Trust-Strip, Features-Page (überwiegend tool-fokussiert), Pricing-Comparison-Tabelle
