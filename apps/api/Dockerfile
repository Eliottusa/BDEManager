# syntax=docker/dockerfile:1

# ─── Stage 1 : build ─────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# openssl : requis par Prisma - build-essential/python3 : modules natifs (bcrypt)
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false

# Installer les dépendances du workspace (lockfile reproductible)
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Code source de l'API
COPY apps/api ./apps/api

# Génération du client Prisma + compilation NestJS
RUN npm --workspace @bde/api run db:generate \
    && npm --workspace @bde/api run build

# ─── Stage 2 : runtime ───────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# --chown=node:node : tout appartient à l'utilisateur non-root "node" (présent dans l'image)
# node_modules racine : client Prisma généré (.prisma/client) + CLI prisma + deps hoistées
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
# node_modules du workspace api : deps NON hoistées (ex. @nestjs/jwt, @nestjs/passport)
COPY --from=builder --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --chown=node:node apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api

# migrations Prisma + API tournent sous un compte sans privilèges.
USER node
EXPOSE 3001

# migrate deploy (+ seed si base vide) puis démarrage
CMD ["sh", "./docker-entrypoint.sh"]
