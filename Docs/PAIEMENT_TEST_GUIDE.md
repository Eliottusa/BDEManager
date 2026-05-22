# Paiement - Guide de test (local)

Ce guide explique comment tester le paiement Stripe **avec ou sans front** en local.

## Pré-requis

- Démarrer la stack de dev + exécuter la seed (voir `DEV-START.md`).
- Avoir un compte Stripe en mode **Test**.

## 1) Configurer les variables d’environnement

### API (Nest)

Renseigner dans le `.env` de l’API :

- `STRIPE_SECRET_KEY` : clé secrète Stripe (`rk_test_...` en mode test)
- `STRIPE_WEBHOOK_SECRET` : secret webhook (`whsec_...`) fourni par Stripe CLI (étape 2)

### Front (Next.js)

Renseigner dans le `.env` du front :

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` : clé publique Stripe (`pk_test_...`)

Récupération des clés : https://dashboard.stripe.com (mode **Test**)

## 2) Démarrer l’écoute des webhooks Stripe (Stripe CLI)

Comme le système repose sur **Stripe Checkout + Webhook**, il faut forward les événements Stripe vers l’API locale.
Pour ce faire, j’ai utilisé Docker. Si vous souhaitez faire comme moi, suivez la suite de l’étape 2.
Sinon, voir la doc Stripe : https://docs.stripe.com/stripe-cli/install

### Stripe CLI via Docker (PowerShell)

Créer un alias temporaire `stripe` (dans le terminal PowerShell courant) :

```powershell
function stripe {
	docker run --rm -it -v "$HOME/.config/stripe:/root/.config/stripe" stripe/stripe-cli:latest @args
}
```

Se connecter à Stripe :

```powershell
stripe login
```

Démarrer l’écoute + forward vers l’API :

```powershell
stripe listen --forward-to host.docker.internal:3001/api/v1/payments/webhooks/stripe
```

Au démarrage, Stripe CLI affiche un secret `whsec_...` :

- Copier ce `whsec_...` dans `STRIPE_WEBHOOK_SECRET` (API)

## 3) Tester le paiement

### Option A - Avec le front **ACTUELLEMENT IMPOSSIBLE COMME PAS MIS EN PLACE**

- Démarrer le front
- Aller sur l’inscription d’un événement payant
- Cliquer “Payer”
- Finaliser le paiement sur Stripe Checkout

### Option B - Sans le front (appel API) **ACTUELLEMENT SANS AUTH COMME PAS MIS EN PLACE**

#### 3.B - Appeler l’API avec Postman par exemple

- **Method** : `POST`
- **URL** : `http://localhost:3001/api/v1/payments/checkout-sessions`
- Onglet **Headers**
    - Ajouter : `Content-Type: application/json`
- Onglet **Body**
    - Sélectionner `raw`
    - Sélectionner `JSON`
    - Coller ce JSON (en remplaçant l’id) :
        ```json
        {
            "registrationId": "COPIE_UN_ID_DU_SEED_ICI",
            "successUrl": "http://localhost:3000/checkout/success",
            "cancelUrl": "http://localhost:3000/events"
        }
        ```

Réponse attendue : un objet PaymentResponseDto, avec l'url Stripe Checkout. Ouvrir cette URL dans un navigateur.

> Carte de test Stripe : `4242 4242 4242 4242`

## 4) Vérifier que tout est OK

- Dans la base :
    - `Payment.status` passe à `PAID`
    - `Registration.status` passe à `CONFIRMED`
- Dans Stripe (mode Test) : paiement visible sur le dashboard
