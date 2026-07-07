# Paddle Webhook Test Backlog

Status: spaeter
Datum: 2026-07-07

Sofort umgesetzt:

- Unit-Tests fuer `verifyPaddleSignature` in `tests/backend/paddle-sig.test.ts`
- Faelle: fehlender Header, malformed Header, ungueltiger Timestamp, Skew-Grenze, Skew-Ueberschreitung, bad HMAC, Happy Path

Spaeter ergaenzen:

- Integrationstest auf `functions/api/paddle/webhook.ts`
- Request mit gueltiger und ungueltiger `Paddle-Signature`
- Assertion auf HTTP-Status, Header-Auslesen und Handler-Verdrahtung
- Minimaler DB-/Fetch-Stub, damit kein echter Paddle- oder D1-Zugriff noetig ist
