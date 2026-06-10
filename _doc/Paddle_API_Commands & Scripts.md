# Paddle API Commands und Scripts

**Stand:** 2026-06-10  
**Status:** fuehrend fuer manuelle Paddle-Maintenance (Diagnose, seltene Mutationen).  
**Scope:** Wiederverwendbare Paddle-Billing-v2-Kommandos fuer Diagnose und seltene Wartung. Kein Ersatz fuer Setup-Runbook, Checkout-Runbook oder Backend-Code.  
**Vorgaenger:** Stand 2026-05-25 wurde am 2026-06-10 in diese Datei konsolidiert; Volltext in der Git-Historie.

## 0. Kritisches Review dieses Updates

Die bisherige Fassung war brauchbar, aber zu autoritativ fuer eine Datei, die aktuell nur ein manuelles Mutationskommando enthaelt:

1. **Kein echter Script-Katalog:** Im Repo gibt es keine dedizierten Paddle-Maintenance-Skripte. Die laufenden Paddle-Calls sitzen im Backend.
2. **Live-Mutation zu leichtgewichtig beschrieben:** `PATCH /prices/{id}` ist eine Konfigurationsaenderung an Paddle. Vor Live braucht es Dashboard-Abgleich, Sandbox-Probe und Change-Log.
3. **Diagnosepfade fehlten als sichere Alternative:** `tests/api/README.md`, `npm run test:checkout-api` und `GET /api/diagnostics/paddle-prices` sind bessere erste Pruefschritte als direkte Paddle-Mutationen.
4. **Trial-Begruendung war zu absolut:** App-interner Trial ist aktueller Produktentscheid. Paddle-Trial muss deshalb fuer die Pro-Prices aus bleiben, aber die konkrete API-Payload sollte vor Live gegen Paddle-Dokumentation/Dashboard verifiziert werden.
5. **Dateistatus unklar:** Solange nur ein aktives Maintenance-Kommando existiert, ist ein Umzug nach `_doc/paddle_checkout/` optional, nicht zwingend.

## 1. Aktueller Stand

Im Repo existieren aktuell:

| Kategorie | Stand |
|---|---|
| Lokale Paddle-Maintenance-Skripte | Keine dedizierten Skripte in `scripts/` oder `_debug/`. |
| Backend-Paddle-Wrapper | Vorhanden in `functions/_lib/paddle.ts`. |
| Webhook-Signatur | Vorhanden in `functions/_lib/paddle-sig.ts`. |
| Checkout-API-Smokes | Vorhanden als Playwright-Tests via `npm run test:checkout-api`. |
| Preis-Diagnose | Vorhanden als geschuetzter Endpoint `GET /api/diagnostics/paddle-prices`. |
| Aktives manuelles Kommando in dieser Datei | `trial_period` an bestehenden Paddle-Prices auf `null` setzen. |

Diese Datei ist daher kein allgemeiner "alles mit Paddle"-Katalog. Sie ist ein kleiner Maintenance-Merkzettel fuer seltene administrative Paddle-Aenderungen.

## 2. Code- und Runbook-Anker

| Kontext | Datei / Kommando |
|---|---|
| Server-to-server Paddle API Wrapper | [`functions/_lib/paddle.ts`](../functions/_lib/paddle.ts) |
| Webhook-HMAC | [`functions/_lib/paddle-sig.ts`](../functions/_lib/paddle-sig.ts) |
| Webhook-Verarbeitung | [`functions/api/paddle/webhook.ts`](../functions/api/paddle/webhook.ts) |
| Checkout-Intent, Transaction-Erstellung | [`functions/api/billing/checkout-intent.ts`](../functions/api/billing/checkout-intent.ts) |
| Post-Checkout-Verify | [`functions/api/billing/post-checkout.ts`](../functions/api/billing/post-checkout.ts) |
| Pricing Preview | [`functions/api/billing/preview-pricing.ts`](../functions/api/billing/preview-pricing.ts) |
| Customer Portal | [`functions/api/billing/portal.ts`](../functions/api/billing/portal.ts) |
| Abo-Kuendigung/Ruecknahme | [`functions/api/account/cancel-subscription.ts`](../functions/api/account/cancel-subscription.ts) |
| Subscription-/Payment-/Invoice-Lookups | [`functions/api/account/subscription-details.ts`](../functions/api/account/subscription-details.ts), [`payments.ts`](../functions/api/account/payments.ts), [`invoice.ts`](../functions/api/account/invoice.ts) |
| Price-ID-Diagnose | [`functions/api/diagnostics/paddle-prices.ts`](../functions/api/diagnostics/paddle-prices.ts) |
| Checkout-Smoke-Lauf | [`tests/api/README.md`](../tests/api/README.md), `npm run test:checkout-api` |
| Paddle Setup | [`Setup Paddle Products, Prices, Discount-Codes.md`](./Setup%20Paddle%20Products%2C%20Prices%2C%20Discount-Codes.md) |
| Operatives Checkout-Runbook | [`paddle_checkout/checkout-billing-runbook-b2b-v6-1.md`](./paddle_checkout/checkout-billing-runbook-b2b-v6-1.md) |

## 3. Sichere Pruefpfade vor manuellen Paddle-Mutationen

Bevor ein Price, Discount oder Customer in Paddle manuell veraendert wird:

1. **Repo-Konfiguration pruefen:** `website-astro/src/brands/*/brand.yaml`, `wrangler.toml`, Cloudflare Dashboard Secrets/Vars.
2. **Deployed Price-IDs pruefen:** `GET /api/diagnostics/paddle-prices` mit `DIAGNOSTIC_TOKEN`.
3. **Read-only Checkout-Smoke laufen lassen:** `npm run test:checkout-api` ohne `CHECKOUT_WRITE_TESTS`.
4. **Sandbox-Write-Test nur bewusst aktivieren:** `CHECKOUT_WRITE_TESTS=1` erzeugt echte Paddle-Sandbox-Objekte.
5. **Live-Mutation erst nach Sandbox-Probe und dokumentiertem Change-Log.**

PowerShell-Beispiel fuer den Preis-Diagnosepfad:

```powershell
$env:CHECKOUT_API_BASE = "https://api.lifeflow360.app"
$env:CHECKOUT_TARGET = "sandbox"
$env:CHECKOUT_DIAGNOSTIC_TOKEN = "..."
npm run test:checkout-api
Remove-Item Env:\CHECKOUT_DIAGNOSTIC_TOKEN
```

**Woher kommt `DIAGNOSTIC_TOKEN`?** Der Token ist als Secret im Cloudflare Pages Project hinterlegt. Setzen ueber:

```powershell
# Im Cloudflare Pages Dashboard:
# Settings -> Environment variables -> Add variable (Encrypted)
# Name: DIAGNOSTIC_TOKEN
# Value: <openssl rand -hex 32>
#
# Oder via wrangler CLI:
wrangler pages secret put DIAGNOSTIC_TOKEN --project-name lifeflow360-api
```

Lokal nicht in `wrangler.toml` einchecken — Token ist Secret-Material. Wert wird beim Aufruf von `npm run test:checkout-api` lokal als Environment-Variable mitgegeben und gegen den Endpoint `GET /api/diagnostics/paddle-prices` als Bearer-Token validiert.

## 4. Aktives Maintenance-Kommando

### 4.1 Trial-Period an Prices entfernen

**Zweck:** Bestehende Paddle-Prices sollen keinen eigenen `trial_period` haben. Free-Signup und 14-Tage-Trial werden app-intern ueber Magic-Link, Consent und `grantTrialEntitlementIfMissing()` gesteuert.

**Wann verwenden:**

- Ein Paddle-Price wurde versehentlich mit Trial angelegt.
- Ein Price wurde aus einer alten Konfiguration kopiert.
- Vor Go-Live soll verifiziert werden, dass Paddle-Pro-Prices sofort regulaer abrechnen.

**Nicht verwenden fuer:**

- Kundensupport zu einzelnen Subscriptions.
- Discount-/Coupon-Pflege.
- Checkout-Fehleranalyse ohne vorherige Diagnose.
- CI oder automatisierte Deploys.

**Voraussetzungen:**

- Paddle Billing v2 API-Key fuer Sandbox oder Live.
- Exakte Price-IDs aus Paddle Dashboard und Repo-Konfiguration.
- Vor Live: Sandbox-Probe mit denselben Feldern.
- Vor Live: Change-Log-Eintrag mit Datum, Umgebung, Price-IDs, Grund.

### Sandbox-Variante PowerShell

```powershell
$paddleApiKey = "DEIN_SANDBOX_API_KEY_OHNE_BEARER"

$priceIds = @(
  "pri_KEY1",
  "pri_KEY2",
  "pri_KEY3"
)

$paddleApiKey = $paddleApiKey.Trim()
$paddleApiKey = $paddleApiKey -replace '^Bearer\s+', ''

$headers = @{
  Authorization = "Bearer $paddleApiKey"
  "Content-Type" = "application/json"
}

$body = @{
  trial_period = $null
} | ConvertTo-Json

foreach ($priceId in $priceIds) {
  Write-Host "`nUpdating $priceId..."

  try {
    $response = Invoke-RestMethod `
      -Method Patch `
      -Uri "https://sandbox-api.paddle.com/prices/$priceId" `
      -Headers $headers `
      -Body $body

    Write-Host "Done: $priceId -> trial_period = $($response.data.trial_period)"
  }
  catch {
    Write-Host "FAILED: $priceId"
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $errorBody = $reader.ReadToEnd()
      Write-Host $errorBody
    } else {
      Write-Host $_
    }
  }
}
```

### Live-Variante

Nur nach erfolgreicher Sandbox-Probe ausfuehren. Vollstaendiger Block fuer copy-paste:

```powershell
# Vor Live: Sicherheitscheck (manuell durchgehen)
# 1. Sandbox-Lauf war erfolgreich, Output gespeichert.
# 2. Price-IDs gegen Paddle Live-Dashboard verifiziert.
# 3. Change-Log-Eintrag vorbereitet (Datum, Umgebung "live", Price-IDs, Grund).
# 4. API-Key ist tatsaechlich der Live-Key (nicht Sandbox).

$paddleApiKey = "DEIN_LIVE_API_KEY_OHNE_BEARER"

$priceIds = @(
  "pri_LIVE_KEY1",
  "pri_LIVE_KEY2",
  "pri_LIVE_KEY3"
)

$paddleApiKey = $paddleApiKey.Trim()
$paddleApiKey = $paddleApiKey -replace '^Bearer\s+', ''

$headers = @{
  Authorization = "Bearer $paddleApiKey"
  "Content-Type" = "application/json"
}

$body = @{
  trial_period = $null
} | ConvertTo-Json

foreach ($priceId in $priceIds) {
  Write-Host "`nUpdating $priceId (LIVE)..."

  try {
    $response = Invoke-RestMethod `
      -Method Patch `
      -Uri "https://api.paddle.com/prices/$priceId" `
      -Headers $headers `
      -Body $body

    Write-Host "Done: $priceId -> trial_period = $($response.data.trial_period)"
  }
  catch {
    Write-Host "FAILED: $priceId"
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $errorBody = $reader.ReadToEnd()
      Write-Host $errorBody
    } else {
      Write-Host $_
    }
  }
}

# Danach: Output sichern und read-only Checkout-Smoke laufen lassen
# npm run test:checkout-api
```

Wichtige Unterschiede zur Sandbox-Variante:

- URL: `https://api.paddle.com/...` statt `https://sandbox-api.paddle.com/...`
- API-Key muss der Live-Key sein (Paddle Dashboard "Live" Workspace).
- Price-IDs muessen aus dem Live-Workspace stammen, nicht aus Sandbox.

Vor Live-Ausfuehrung:

- Price-IDs im Paddle Dashboard oeffnen und mit `brand.yaml`/Cloudflare Vars vergleichen.
- API-Key-Umgebung pruefen: Sandbox-Key nicht gegen Live, Live-Key nicht gegen Sandbox.
- Output sichern.
- Danach read-only Checkout-Smoke laufen lassen.

**Erwartete Ausgabe:**

```text
Done: pri_... -> trial_period =
```

Ein leerer Wert bedeutet hier `trial_period = null`.

## 5. Was nicht in diese Datei gehoert

| Thema | Besserer Ort |
|---|---|
| Produkte/Prices/Discounts neu anlegen | `Setup Paddle Products, Prices, Discount-Codes.md` |
| Checkout-End-to-End testen | `paddle_checkout/checkout-billing-runbook-b2b-v6-1.md` und `tests/api/README.md` |
| Backend-API-Wrapper erklaeren | `Konzept Paddle-Integration und App-Architektur.md` |
| Account-/Abo-Supportablaeufe | eigenes Support-Runbook, falls der Bedarf wiederkehrend wird |
| D1-Testuser loeschen | `_debug/delete-dao-user.ps1` / `_debug/sql/*`, nicht Paddle |

## 6. Offene Punkte

| Punkt | Bewertung |
|---|---|
| Kein Script unter `scripts/` fuer Trial-Period-Patch. | Absichtlich okay, solange es eine seltene manuelle Operation bleibt. |
| Keine allgemeine Paddle-Customer-Suche fuer Support dokumentiert. | Erst aufnehmen, wenn Supportfall wiederkehrend ist. |
| Keine Bulk-Discount-Code-Erzeugung. | Im Setup-Runbook oder spaeterem Maintenance-Runbook ergaenzen, wenn benoetigt. |
| Live-API-Key-Status unklar aus Repo allein. | Repo zeigt `PADDLE_ENV=sandbox`; reale Cloudflare Dashboard Secrets/Vars separat pruefen. |
| Umzug nach `_doc/paddle_checkout/`. | Schwelle: ab drei aktiven Maintenance-Kommandos lohnt der Move nach `_doc/paddle_checkout/paddle-maintenance-commands.md`. Aktuell ist nur ein Kommando dokumentiert (Trial-Period-Patch); Umzug deshalb aufgeschoben. Wenn ein zweites oder drittes Kommando hinzukommt (z. B. Bulk-Discount-Code-Erzeugung, Paddle-Customer-Suche fuer Support), wird dieser Eintrag auf "umsetzen" hochgesetzt. |

## 7. Empfehlung

Diese Datei behalten, aber nicht groesser machen als noetig. Sobald wiederkehrende Paddle-Wartung entsteht, sollte daraus ein echtes Runbook werden:

```text
_doc/paddle_checkout/paddle-maintenance-commands.md
```

Bis dahin bleibt der wichtigste operative Pfad:

1. Setup-Runbook fuer Konfiguration,
2. Backend-Code fuer laufende API-Calls,
3. Checkout-Smokes fuer Diagnose,
4. diese Datei nur fuer seltene manuelle Paddle-Mutationen.

## Anhang: Historischer Kontext

Die Originaldatei [`Paddle_API_Commands & Scripts.md`](./Paddle_API_Commands%20%26%20Scripts.md), Stand 2026-05-25, dokumentierte im Kern dasselbe Trial-Period-Patch-Kommando. Sie bleibt als Ursprung dieses Maintenance-Hinweises erhalten. Bei Abweichungen gilt der Body oben.
