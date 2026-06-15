# Paiement (Stripe Checkout)

- Permettre à un utilisateur de payer une inscription à un événement payant via **Stripe Checkout**.
- Enregistrer l’état du paiement en base (statuts) quand Stripe confirme le paiement.

## Schéma de flux (version implémentée)

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant FE as Front (Next.js)
  participant API as API (Nest)
  participant PAY as Module Paiement
  participant DB as PostgreSQL (Prisma)
  participant STR as Stripe

  %% Création session
  U->>FE: Clique "Payer"
  FE->>API: POST /api/v1/payments/checkout-sessions
  Note over FE,API: {registrationId, successUrl, cancelUrl}

  API->>PAY: createCheckoutSession(dto)
  PAY->>DB: Récupère Registration (+ event, user, payment)

  alt Paiement existant PENDING
    PAY->>STR: Retrieve checkout session
    alt Session ouverte (open) + url dispo
      STR-->>PAY: {url}
      PAY-->>API: 200 {paymentId, checkoutSessionId, url}
      API-->>FE: 200 {url}
    else Session complete + paid (webhook manqué)
      PAY->>DB: Update payment.status=PAID (+ stripePaymentId)
      PAY->>DB: Update registration.status=CONFIRMED
      PAY-->>API: 400 "Payment already completed"
    end
  else Aucun paiement (ou FAILED/EXPIRED)
    PAY->>STR: Create checkout session
    STR-->>PAY: {sessionId, url, amount_total, currency}
    PAY->>DB: Create/Update Payment(status=PENDING, stripeSessionId)
    PAY-->>API: 200 {paymentId, checkoutSessionId, url}
    API-->>FE: 200 {url}
  end

  %% Checkout côté Stripe
  FE->>STR: Redirect to url
  U->>STR: Saisie carte + validation

  %% Webhook
  STR-->>API: POST /api/v1/payments/webhooks/stripe
  Note over STR,API: event = checkout.session.completed/expired/async_* + signature

  API->>PAY: handleWebhook(rawBody, signature)
  PAY->>PAY: Vérif signature (STRIPE_WEBHOOK_SECRET)

  alt checkout.session.completed ou async_payment_succeeded
    PAY->>DB: Find payment by stripeSessionId
    PAY->>PAY: Idempotence: si déjà PAID => stop
    PAY->>PAY: Vérif montant/devise vs DB
    PAY->>DB: Update payment.status=PAID (+ stripePaymentId)
    PAY->>DB: Update registration.status=CONFIRMED
  else checkout.session.async_payment_failed
    PAY->>DB: Update payment.status=FAILED
  else checkout.session.expired
    PAY->>DB: Update payment.status=EXPIRED
  end

  %% Redirection front
  STR-->>FE: Redirect successUrl/cancelUrl
```

## Endpoints

### Créer une session de paiement

- **POST** `/api/v1/payments/checkout-sessions`
- Body:
    - `registrationId`: id de l’inscription
    - `successUrl`: URL de retour en cas de succès (front)
    - `cancelUrl`: URL de retour en cas d’annulation (front)
- Réponse: `{ paymentId, checkoutSessionId, url }`

**Comportements importants**

- Si un paiement existe déjà en `PENDING`, l’API tente de **réutiliser** la session Stripe tant qu’elle est encore `open`.
- Si Stripe indique que la session est `complete` et `paid` (cas webhook manqué), on **resynchronise** la base.
- Si l’événement est gratuit (`isFree` / `price <= 0`), la création est refusée.

### Webhook Stripe

- **POST** `/api/v1/payments/webhooks/stripe`
- Particularité: **body RAW** (Buffer) requis pour vérifier la signature Stripe.

## Middleware "raw body” (obligatoire pour Stripe)

Stripe signe le payload. Si Nest/Express parse le JSON, la signature ne correspond plus.

La route webhook est configurée pour recevoir le body brut:

- Middleware `bodyParser.raw({ type: 'application/json' })` sur:
    - `/api/v1/payments/webhooks/stripe`

Référence: `apps/api/src/main.ts`

## Modèle de données (résumé)

- `Payment` est lié 1–1 à `Registration`
- Statuts supportés:
    - `PENDING` (session créée, paiement en cours)
    - `PAID` (Stripe confirmé)
    - `FAILED` (paiement échoué)
    - `EXPIRED` (session expirée)
    - `REFUNDED` (prévu côté modèle, pas encore géré par webhook)

## Vérifications mises en place

- **Signature webhook**: vérification via `STRIPE_WEBHOOK_SECRET`
- **Idempotence**: si le paiement est déjà `PAID`, on ne re-traite pas
- **Cohérence montant/devise**: compare `amount_total`/`currency` Stripe avec `Payment.amount`/`Payment.currency`

## Variables d’environnement

- `STRIPE_SECRET_KEY`: clé Stripe secrète (obligatoire)
- `STRIPE_WEBHOOK_SECRET`: secret de webhook (obligatoire)
- `FRONTEND_URL`: utilisé pour CORS (et recommandé pour dériver success/cancel côté serveur)
