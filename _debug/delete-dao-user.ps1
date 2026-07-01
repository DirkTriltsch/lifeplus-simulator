param(
  [switch]$Local,
  [string]$Database = "lifeflow360-prod"
)

$ErrorActionPreference = "Stop"

# Change this value to delete another test user.
$EmailToDelete = "dao@triltsch-online.de"

$sqlFile = Join-Path $PSScriptRoot "sql\delete-dao-user.sql"
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

# One SELECT with scalar subqueries -> one row, six columns.
# Avoids Cloudflare D1's low SQLITE_MAX_COMPOUND_SELECT limit that trips 6x UNION ALL.
$targetCountsSql = "SELECT (SELECT COUNT(*) FROM users WHERE email_lower = '$escapedEmail') AS users, (SELECT COUNT(*) FROM checkout_intents WHERE lower(checkout_email) = '$escapedEmail') AS checkout_intents, (SELECT COUNT(*) FROM consent_log WHERE lower(checkout_email) = '$escapedEmail' OR lower(COALESCE(session_email, '')) = '$escapedEmail') AS consent_log, (SELECT COUNT(*) FROM email_otp_active WHERE email_lower = '$escapedEmail') AS email_otp_active, (SELECT COUNT(*) FROM email_otp_tokens WHERE email_lower = '$escapedEmail') AS email_otp_tokens, (SELECT COUNT(*) FROM webhook_events WHERE lower(payload_json) LIKE '%$escapedEmail%') AS webhook_events_payload;"

$remainingUsersSql = "SELECT u.email_lower, COUNT(DISTINCT s.id) AS sessions, COUNT(DISTINCT d.id) AS devices, COUNT(DISTINCT e.id) AS entitlements, COUNT(DISTINCT sub.id) AS subscriptions, COUNT(DISTINCT ci.id) AS checkout_intents, COUNT(DISTINCT cl.id) AS consent_logs FROM users u LEFT JOIN sessions s ON s.user_id = u.id LEFT JOIN devices d ON d.user_id = u.id LEFT JOIN entitlements e ON e.user_id = u.id LEFT JOIN subscriptions sub ON sub.user_id = u.id LEFT JOIN checkout_intents ci ON ci.user_id = u.id LEFT JOIN consent_log cl ON cl.checkout_user_id = u.id OR cl.session_user_id = u.id GROUP BY u.id, u.email_lower ORDER BY u.email_lower;"

Write-Host ""
Write-Host "Target email counts:" -ForegroundColor Cyan
npx wrangler d1 execute $Database $mode --command $targetCountsSql

Write-Host ""
Write-Host "Remaining users:" -ForegroundColor Cyan
npx wrangler d1 execute $Database $mode --command $remainingUsersSql
