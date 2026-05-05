# BDE Manager

Application web de gestion d'événements étudiants — Next.js 15 · NestJS 10 · PostgreSQL · Redis

---

## Équipe & répartition

| Membre              | Feature                 | Périmètre                                                                                                                                              |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Eliott Augereau** | Auth + Cache Redis      | Création de compte, login JWT, bcrypt, refresh token Redis, guard JWT                                                                                  |
| **Wessim Harmel**   | Notifications & Email   | WebSocket temps réel (Socket.io), emails Nodemailer (inscription site + confirmation événement)                                                        |
| **Timéo Danois**    | Paiement                | Stripe Checkout Session + intégration NestJS, webhook, remboursement                                                                                   |
| **Jordan Nkunga**   | Événements CRUD         | Création, modification, suppression, inscription à un événement (Prisma/PostgreSQL)                                                                    |
| **Loric Worms**     | Localisation + Frontend | Autocomplétion data.gouv.fr (NestJS geo module), remplissage automatique des champs inscription/événement · Pages Next.js, composants UI, i18n (FR/EN) |

---

## Stack

| Couche                     | Technologie                                                  |
| -------------------------- | ------------------------------------------------------------ |
| Frontend                   | Next.js 15 (App Router), TypeScript, Tailwind CSS, next-intl |
| Backend                    | NestJS 10, TypeScript, Passport JWT                          |
| Base de données principale | PostgreSQL 16 via Prisma ORM                                 |
| Cache / sessions           | Redis 7 (tokens de rafraîchissement + cache utilisateur)     |
| Paiement                   | Stripe Checkout                                              |
| Email                      | Nodemailer (SMTP) — MailDev en local                         |
| Notifications              | Socket.io (WebSocket)                                        |
| Géolocalisation            | API Adresse data.gouv.fr (sans clé)                          |
| Monorepo                   | Turborepo                                                    |

---

## Structure du projet

```
BDEManager/
├── apps/
│   ├── api/                        # NestJS
│   │   ├── prisma/schema.prisma    # Schéma BDD (User, Event, Registration, Payment)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/           # Eliott — JWT, bcrypt, Redis refresh
│   │       │   ├── users/          # Eliott — findById, findByEmail
│   │       │   ├── events/         # Jordan — CRUD événements
│   │       │   ├── payments/       # Timéo  — Stripe
│   │       │   ├── mail/           # Wessim — emails
│   │       │   ├── notifications/  # Wessim — WebSocket gateway
│   │       │   └── geo/            # Loric  — proxy data.gouv.fr
│   │       ├── common/             # Guards, decorators, filtres d'exception
│   │       └── prisma/             # PrismaService (global)
│   └── web/                        # Next.js
│       ├── messages/               # Traductions FR / EN
│       └── src/app/[locale]/
│           ├── page.tsx            # Accueil
│           ├── auth/login/         # Loric (UI) — Eliott (backend)
│           ├── auth/register/      # Loric (UI) — Eliott (backend)
│           ├── events/             # Loric (UI) — Jordan (backend)
│           ├── dashboard/          # Loric (UI) + Wessim (notifs temps réel)
│           └── checkout/success/   # Loric (UI) — Timéo (backend)
├── docker-compose.yml              # Postgres + Redis + MailDev
└── turbo.json
```

---

## Démarrage rapide

### Prérequis

- Node.js ≥ 20
- Docker Desktop

### 1. Cloner & installer

```bash
git clone <url-du-repo>
cd BDEManager
npm install
```

### 2. Variables d'environnement

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Remplir les valeurs Stripe dans chaque fichier (clés de test suffisantes en local)
```

### 3. Lancer les services (BDD, Redis, Mail)

```bash
docker compose up -d
```

### Alternative: tout lancer via Docker (dev)

```bash
docker compose -f docker-compose.dev.yml up --build
```

### 4. Initialiser la base de données

```bash
npm run db:migrate
```

### 5. Lancer l'application

```bash
npm run dev
# API  → http://localhost:3001/api/v1
# Web  → http://localhost:3000
# Mail → http://localhost:1080  (MailDev)
```

---

## Routes API (aperçu)

| Méthode | Route                         | Feature    | Accès     |
| ------- | ----------------------------- | ---------- | --------- |
| POST    | `/api/v1/auth/register`       | Auth       | Public    |
| POST    | `/api/v1/auth/login`          | Auth       | Public    |
| POST    | `/api/v1/auth/logout`         | Auth       | JWT       |
| POST    | `/api/v1/auth/refresh`        | Auth       | Public    |
| GET     | `/api/v1/events`              | Événements | Public    |
| POST    | `/api/v1/events`              | Événements | ORGANIZER |
| PATCH   | `/api/v1/events/:id`          | Événements | ORGANIZER |
| DELETE  | `/api/v1/events/:id`          | Événements | ADMIN     |
| POST    | `/api/v1/events/:id/register` | Événements | JWT       |
| POST    | `/api/v1/payments/checkout`   | Paiement   | JWT       |
| POST    | `/api/v1/payments/webhook`    | Paiement   | Stripe    |
| GET     | `/api/v1/geo/search?q=`       | Géo        | JWT       |

---

## Variables d'environnement clés

Chaque app a son propre fichier d'environnement :

**`apps/api/.env`** (secrets serveur — ne jamais committer)

- `DATABASE_URL` — connexion PostgreSQL
- `REDIS_PASSWORD` — mot de passe Redis
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — secrets JWT
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — clés Stripe (test)
- `SMTP_HOST` / `SMTP_PORT` — config email (MailDev en local : `localhost:1025`)

**`apps/web/.env.local`** (vars publiques Next.js)

- `NEXT_PUBLIC_API_URL` — URL de l'API
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — clé publique Stripe

---

## Rôles utilisateur

| Rôle        | Droits                                 |
| ----------- | -------------------------------------- |
| `USER`      | S'inscrire à des événements, consulter |
| `ORGANIZER` | Créer et gérer ses propres événements  |
| `ADMIN`     | Accès complet                          |
