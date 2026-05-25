# Paddle API Commands & Scripts

Dieses Dokument sammelt kleine, wiederverwendbare Paddle-API-Scripts fuer Setup,
Korrekturen und Wartung.

## Trial-Period von Paddle-Prices entfernen

### Zweck

Free-Zugang und 14-Tage-Trial werden in der App/API gesteuert, nicht in Paddle.
Paddle soll erst bei bezahlten Pro-Upgrades relevant werden.

Dieses Script setzt deshalb bei bestehenden Paddle-Prices `trial_period` auf
`null`. Damit haben die bezahlten Preise keinen Paddle-seitigen Trial mehr.

### Wann verwenden?

- Wenn in Paddle versehentlich ein Trial direkt am Price konfiguriert wurde.
- Wenn bestehende Preise von "Trial in Paddle" auf "Trial app-intern" umgestellt
  werden.
- Nach dem Anlegen neuer Sandbox-Prices, falls die Price-Konfiguration kopiert
  wurde und dabei ein Trial uebernommen wurde.

### Voraussetzungen

- Paddle Billing v2 API-Key aus der Sandbox.
- Price-IDs der zu aktualisierenden Prices, z.B. Monthly, 6 Monate, 12 Monate.
- PowerShell.

Wichtig: Den API-Key ohne `Bearer` eintragen. Das Script entfernt ein eventuell
versehentlich mitkopiertes `Bearer` trotzdem automatisch.

### Sandbox-Script

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

    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host $errorBody
  }
}
```

### Live-Umgebung

Fuer Live-Prices muss die API-URL angepasst werden:

```powershell
https://api.paddle.com/prices/$priceId
```

Vor Live-Ausfuehrung immer zuerst in der Sandbox pruefen und die Price-IDs
gegen das Paddle-Dashboard abgleichen.

### Erwartetes Ergebnis

Pro Price sollte eine Erfolgsmeldung erscheinen:

```text
Done: pri_... -> trial_period =
```

Ein leerer Wert bei `trial_period` ist hier korrekt, weil `trial_period` auf
`null` gesetzt wurde.

### Einordnung fuer LifeFlow360

Die aktuelle Zielarchitektur ist:

- Free: App/API-intern, kein Paddle.
- 14-Tage-Trial: App/API-intern, kein Paddle-Trial, keine Zahlungsdatenpflicht.
- Pro 1 Monat: Paddle Subscription Price.
- Pro 6 Monate: Paddle Subscription Price.
- Pro 12 Monate: Paddle Subscription Price.

Paddle-Prices sollten daher keine eigene Trial-Period haben.
