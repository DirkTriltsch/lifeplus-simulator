# Debug-Session: lifeflow360.app — Checkout & Zugangsfehler

## Ziel für VSCode-Chat
Finde die Route `POST /api/billing/checkout-intent` und erkläre warum sie einen Fehler zurückgibt obwohl der HTTP-Status 200 ist.

---

## Infrastruktur

| Komponente | Details |
|---|---|
| Frontend | `www.lifeflow360.app` |
| Backend/API | `api.lifeflow360.app` — Cloudflare Pages project `lifeflow360-api` |
| Payments | Paddle |
| Email | Resend |
| Auth | Unbekannt (wahrscheinlich im Worker) |
| Deployment | GitHub `main` Branch → Cloudflare Pages (via Wrangler) |
| Lokaler Projektpfad | `C:\Coding\LifePlus_Simulator\code` |

---

## Symptome

### Problem 1 — User bekommt "Kein aktiver Zugang"
- User `budweiser.belinda@gmail.com` ist eingeloggt (Auth funktioniert)
- System zeigt: **"Du hast keinen aktiven Zugang für den Simulator"**
- User sollte einen **14-Tage Trial der Pro-Version** haben, danach Fallback auf Free
- Verdacht: Trial-Datensatz wurde nie angelegt, oder Free-Fallback ist nicht implementiert

### Problem 2 — Checkout schlägt fehl
- User klickt auf "12 Monate starten" auf der Pricing-Seite
- Browser-Alert: **"Checkout konnte nicht vorbereitet werden. Bitte versuche es gleich noch einmal."**
- Diese Meldung kommt aus dem eigenen Code (kein Paddle-Fehler direkt)

---

## Was wir im Wrangler-Log gesehen haben

```
GET  https://api.lifeflow360.app/api/me                      - Ok @ 18:18:05
OPTIONS https://api.lifeflow360.app/api/billing/checkout-intent - Ok @ 18:18:21
POST https://api.lifeflow360.app/api/billing/checkout-intent - Ok @ 18:18:21
```

**Wichtig:** HTTP-Status ist **200 OK**, aber der Response-Body enthält eine Fehlermeldung.
Das heißt: der Worker läuft, aber die interne Logik gibt einen kontrollierten Fehler zurück — kein Crash.

---

## Was im Code zu suchen ist

### 1. Route `POST /api/billing/checkout-intent`
- Warum gibt sie einen Fehler zurück obwohl Status 200?
- Mögliche Ursachen:
  - User hat bereits eine Subscription → Code blockt zweiten Checkout
  - Paddle Price-ID fehlt oder ist falsch konfiguriert
  - Eine `customerId` oder andere Pflichtgröße fehlt für diesen User

### 2. Trial-Aktivierungslogik
- Wo wird beim Signup ein Trial-Datensatz angelegt?
- Gibt es einen Webhook von Paddle oder passiert das im Auth-Callback?
- Ist ein Free-Fallback nach Trial-Ende implementiert?

### 3. Route `GET /api/me`
- Was gibt sie für `budweiser.belinda@gmail.com` zurück?
- Hat dieser User einen Plan-Eintrag in der DB / im KV-Store?

---

## Offene Fragen die der Code beantworten sollte

1. Wo werden User-Plan-Zuordnungen gespeichert? (D1, KV, extern?)
2. Gibt es einen `trial`-Status neben `active` / `inactive`?
3. Was passiert wenn kein Plan-Eintrag existiert — wird Free automatisch angenommen oder Fehler geworfen?
4. Welche Secrets/Env-Variablen werden für Paddle erwartet? (`.env` fehlt lokal laut Wrangler-Log)

---

## Bekannte Nebenbefunde

- `.env` Datei fehlt lokal in `C:\Coding\LifePlus_Simulator\code\` — könnte lokale Tests blockieren
- Wrangler-Login war initial mit falschen Permissions (403) — inzwischen behoben durch `wrangler logout` + `wrangler login`
- Cloudflare zeigt **150 erfolgreiche Requests, 0 Worker-Fehler** — der Worker selbst ist stabil
