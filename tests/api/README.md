# Checkout API smoke tests

Playwright API tests for the LifePlus Paddle checkout. These tests exercise the
deployed API the same way the checkout UI does.

## Read-only smoke

Runs pricing preview, discount lookup behavior, and local validation checks.
This does not create Paddle transactions.

```powershell
$env:CHECKOUT_API_BASE = "https://api.lifeflow360.app"
$env:CHECKOUT_TARGET = "sandbox"
npm run test:checkout-api
```

Optional deployed env/price check:

```powershell
$env:CHECKOUT_DIAGNOSTIC_TOKEN = "..."
npm run test:checkout-api
Remove-Item Env:\CHECKOUT_DIAGNOSTIC_TOKEN
```

## Full sandbox regression

Creates Paddle sandbox transactions and cancels them again. This covers:

- Paddle API key validity
- pricing preview
- Discounts read (`DAO20`, `EARLY2026`)
- Customers, addresses, businesses, and transactions write paths
- guest "Daten aendern" cancellation
- unpaid `post-checkout` rejection

```powershell
$env:CHECKOUT_API_BASE = "https://api.lifeflow360.app"
$env:CHECKOUT_TARGET = "sandbox"
$env:CHECKOUT_WRITE_TESTS = "1"
npm run test:checkout-api
Remove-Item Env:\CHECKOUT_WRITE_TESTS
```

If Paddle or Cloudflare is slow during the first request, raise the per-request
timeout:

```powershell
$env:CHECKOUT_REQUEST_TIMEOUT_MS = "90000"
npm run test:checkout-api
Remove-Item Env:\CHECKOUT_REQUEST_TIMEOUT_MS
```
Optional danach auch die anderen Env-Vars wieder entfernen:
```powershell
Remove-Item Env:\CHECKOUT_API_BASE
Remove-Item Env:\CHECKOUT_TARGET
```

## Later production run

Start with read-only checks:

```powershell
$env:CHECKOUT_API_BASE = "https://api.lifeflow360.app"
$env:CHECKOUT_TARGET = "prod"
npm run test:checkout-api
```

Only enable write tests against production deliberately. They create customer,
address, business, and transaction records, but do not complete payment.

```powershell
$env:CHECKOUT_WRITE_TESTS = "1"
npm run test:checkout-api
Remove-Item Env:\CHECKOUT_WRITE_TESTS
```

## Optional overrides

```powershell
$env:CHECKOUT_TEST_DISCOUNT = "DAO20"
$env:CHECKOUT_TEST_FULL_DISCOUNT = "EARLY2026"
```
