# Démarrage rapide (dev via Docker)

Lance la stack **dev** via `docker-compose.dev.yml` : API (NestJS) + Web (Next.js) + Postgres + Redis + MailDev.

## Prérequis

- Docker Desktop

## 1) Variables d’environnement

- `.env` (à la racine) : variables utilisées par Docker Compose (DB/Redis).
    - Exemples : `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `REDIS_PASSWORD`
    - Si absent, des valeurs par défaut sont utilisées (voir `${VAR:-...}` dans le compose).
- `apps/api/.env` : runtime API (JWT, Stripe, etc.)
- `apps/web/.env` : runtime Web (Next.js)

Note : en dev Docker, `docker-compose.dev.yml` peut surcharger certaines valeurs (ex : `DATABASE_URL`, `REDIS_HOST`, `SMTP_HOST`) pour pointer vers les services Docker (`postgres`, `redis`, `maildev`).

## 2) Lancer la stack

Depuis la racine du repo (là où est `docker-compose.dev.yml`) :

```bash
docker compose -f docker-compose.dev.yml up --build
```

Ports :

- Web : http://localhost:3000
- API : http://localhost:3001/api/v1
- MailDev : http://localhost:1080 (SMTP : `localhost:1025`)
- Postgres : `localhost:5432`
- Redis : `localhost:6379`

## 3) Prisma (migrations)

Après modification de `apps/api/prisma/schema.prisma` :

```bash
docker compose -f docker-compose.dev.yml exec api npm --workspace @bde/api run db:migrate
```

## 4) Seed BDD (optionnel)

```bash
docker compose -f docker-compose.dev.yml exec api npm --workspace @bde/api run db:seed:reset
```

## 5) Ouvrir Postgres (optionnel)

```bash
docker exec -it bde_postgres_dev psql -U bde -d bdemanager
```

Commandes utiles dans `psql` : `\dt`, `\d "User"`, `SELECT * FROM "User" LIMIT 5;`, `\q`.
