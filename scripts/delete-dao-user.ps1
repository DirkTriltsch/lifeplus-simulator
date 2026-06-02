param(
  [switch]$Local,
  [string]$Database = "lifeflow360-prod"
)

$ErrorActionPreference = "Stop"

# Change this value to delete another test user.
$EmailToDelete = "budweiser.belinda@gmail.com"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sqlFile = Join-Path $repoRoot "scripts\sql\delete-dao-user.sql"

if (-not (Test-Path -LiteralPath $sqlFile)) {
  throw "SQL file not found: $sqlFile"
}

$mode = if ($Local) { "--local" } else { "--remote" }
$email = $EmailToDelete.Trim().ToLowerInvariant()
if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
  throw "Invalid EmailToDelete: $EmailToDelete"
}

$escapedEmail = $email.Replace("'", "''")
$deleteSql = (Get-Content -LiteralPath $sqlFile -Raw).Replace("__EMAIL_TO_DELETE__", $escapedEmail)
$tempSqlFile = Join-Path ([System.IO.Path]::GetTempPath()) ("delete-user-" + [System.Guid]::NewGuid().ToString("N") + ".sql")

try {
  Set-Content -LiteralPath $tempSqlFile -Value $deleteSql -Encoding UTF8

  Write-Host "Deleting $email from D1 database '$Database' ($mode)..." -ForegroundColor Yellow
  npx wrangler d1 execute $Database $mode --file $tempSqlFile
} finally {
  if (Test-Path -LiteralPath $tempSqlFile) {
    Remove-Item -LiteralPath $tempSqlFile -Force
  }
}

Write-Host ""
Write-Host "Verification: target rows must be 0; remaining_users must only list other users." -ForegroundColor Cyan

$targetCountsSql = "SELECT 'users' AS table_name, COUNT(*) AS remaining FROM users WHERE email_lower = '$escapedEmail' UNION ALL SELECT 'checkout_intents', COUNT(*) FROM checkout_intents WHERE lower(checkout_email) = '$escapedEmail' UNION ALL SELECT 'consent_log', COUNT(*) FROM consent_log WHERE lower(checkout_email) = '$escapedEmail' OR lower(COALESCE(session_email, '')) = '$escapedEmail' UNION ALL SELECT 'magic_login_tokens', COUNT(*) FROM magic_login_tokens WHERE email_lower = '$escapedEmail' UNION ALL SELECT 'webhook_events_payload', COUNT(*) FROM webhook_events WHERE lower(payload_json) LIKE '%$escapedEmail%';"

$remainingUsersSql = "SELECT u.email_lower, COUNT(DISTINCT s.id) AS sessions, COUNT(DISTINCT d.id) AS devices, COUNT(DISTINCT e.id) AS entitlements, COUNT(DISTINCT sub.id) AS subscriptions, COUNT(DISTINCT ci.id) AS checkout_intents, COUNT(DISTINCT cl.id) AS consent_logs FROM users u LEFT JOIN sessions s ON s.user_id = u.id LEFT JOIN devices d ON d.user_id = u.id LEFT JOIN entitlements e ON e.user_id = u.id LEFT JOIN subscriptions sub ON sub.user_id = u.id LEFT JOIN checkout_intents ci ON ci.user_id = u.id LEFT JOIN consent_log cl ON cl.checkout_user_id = u.id OR cl.session_user_id = u.id GROUP BY u.id, u.email_lower ORDER BY u.email_lower;"

Write-Host ""
Write-Host "Target email counts:" -ForegroundColor Cyan
npx wrangler d1 execute $Database $mode --command $targetCountsSql

Write-Host ""
Write-Host "Remaining users:" -ForegroundColor Cyan
npx wrangler d1 execute $Database $mode --command $remainingUsersSql
