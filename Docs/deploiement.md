# Déploiement - BDE Manager

## 1. Ce qui est déployé

Le fichier `docker-compose.prod.yml` lance **5 services** sur un seul réseau Docker privé :

| Service    | Image / Build               | Rôle                                                      | Exposé         |
| ---------- | --------------------------- | --------------------------------------------------------- | -------------- |
| `caddy`    | `caddy:2-alpine`            | Reverse proxy + **HTTPS automatique** (Let's Encrypt)     | 80, 443        |
| `web`      | build `apps/web/Dockerfile` | Frontend **Next.js 15** (`next start`)                    | interne (3000) |
| `api`      | build `apps/api/Dockerfile` | Backend **NestJS** (REST `/api/v1` + WebSocket Socket.io) | interne (3001) |
| `postgres` | `postgres:16-alpine`        | Base de données (volume persistant `postgres_data`)       | interne        |
| `redis`    | `redis:7-alpine`            | Cache + refresh tokens JWT (volume `redis_data`)          | interne        |

Seul **Caddy** est accessible depuis Internet. Il route :

- `https://APP_DOMAIN` → `web:3000`
- `https://API_DOMAIN` → `api:3001`

### Ce que font les builds

- **API** (`apps/api/Dockerfile`, multi-stage) : `npm ci` du workspace → `prisma generate` → `nest build`. L'image finale ne contient que `dist/`, `node_modules`, le schéma Prisma et les migrations.
- **Web** (`apps/web/Dockerfile`, multi-stage) : `npm ci` → `next build`. Les variables `NEXT_PUBLIC_*` sont **injectées au build** (build args) car Next.js les fige dans le bundle navigateur.
- **Au démarrage de l'API** (`docker-entrypoint.sh`) : `prisma migrate deploy` (applique les migrations), puis **seed seulement si la base est vide**.

---

## 2. Prérequis

- Un VPS avec **Docker** + **Docker Compose v2** installés.
- Un **nom de domaine** avec 2 sous-domaines pointant (DNS `A`/`AAAA`) vers l'IP du VPS :
    - `app.tondomaine.fr` (frontend)
    - `api.tondomaine.fr` (backend)
- Ports **80** et **443** ouverts sur le VPS (Caddy en a besoin pour émettre les certificats TLS).
- Un compte **Stripe** et un **SMTP** (Brevo, Mailtrap, etc.).

> ⚠️ Le DNS doit être résolu **avant** le premier lancement, sinon Caddy ne pourra pas générer les certificats Let's Encrypt.

---

## 3. Configuration (`.env.prod`)

Toute la configuration tient dans **un seul fichier** à la racine.

```bash
cp .env.prod.example .env.prod
# puis éditer .env.prod et remplir toutes les valeurs CHANGE_ME
```

### Variables à paramétrer

| Bloc         | Variables                                                                         | Notes                                                  |
| ------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Domaines** | `APP_DOMAIN`, `API_DOMAIN`, `CADDY_EMAIL`                                         | Sous-domaines + email Let's Encrypt                    |
| **Postgres** | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`                               | Mot de passe fort                                      |
| **Redis**    | `REDIS_PASSWORD`, `REDIS_TTL`                                                     | Mot de passe fort                                      |
| **JWT**      | `JWT_SECRET`, `JWT_REFRESH_SECRET` (+ durées)                                     | ≥ 32 caractères. Générer : `openssl rand -base64 48`   |
| **SMTP**     | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`                   | Fournisseur réel (pas de MailDev en prod)              |
| **Stripe**   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                      | Voir partie 5                                          |
| **CORS**     | `FRONTEND_URL`                                                                    | = `https://APP_DOMAIN` exactement                      |
| **Front**    | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Build-time (voir §6)                                   |
| **Seed**     | `RUN_SEED`                                                                        | `true` = données de démo au 1er démarrage si base vide |

Cohérence attendue :

- `NEXT_PUBLIC_API_URL` = `https://API_DOMAIN/api/v1`
- `NEXT_PUBLIC_WS_URL` = `https://API_DOMAIN`
- `FRONTEND_URL` = `https://APP_DOMAIN`

---

## 4. Lancement

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

---

## 5. Configuration Stripe

1. Dashboard Stripe → **Developers → Webhooks → Add endpoint**.
2. URL : `https://API_DOMAIN/api/v1/payments/webhooks/stripe`
3. Sélectionner les événements de paiement (Checkout / PaymentIntent).
4. Copier le **Signing secret** (`whsec_...`) dans `STRIPE_WEBHOOK_SECRET`.
5. Mettre la clé secrète live (`sk_live_...`) dans `STRIPE_SECRET_KEY` et la clé publique (`pk_live_...`) dans `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

> Le webhook **nécessite HTTPS public** : c'est Caddy qui le fournit. Sans domaine/TLS, la confirmation de paiement ne fonctionne pas.
