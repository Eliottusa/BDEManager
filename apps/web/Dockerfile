# syntax=docker/dockerfile:1

# ─── Stage 1 : build ─────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Outils de compilation pour les modules natifs (fallback si pas de prebuild)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# Le package-lock.json est généré sous Windows et fige l'arbre sans les binaires
# natifs Linux (@next/swc-linux-x64-gnu, @parcel/watcher-linux-x64-glibc...).
# On le supprime pour forcer une résolution complète sur la plateforme du build.
RUN rm -f package-lock.json && npm install --legacy-peer-deps --no-audit --no-fund

COPY apps/web ./apps/web

# IMPORTANT : les variables NEXT_PUBLIC_* sont inlinées dans le bundle
# AU MOMENT DU BUILD. Elles arrivent via build args (cf. docker-compose.prod.yml).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_MOCK_AUTH=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_MOCK_AUTH=$NEXT_PUBLIC_MOCK_AUTH

RUN npm --workspace @bde/web run build

# ─── Stage 2 : runtime ───────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/web ./apps/web

WORKDIR /app/apps/web
EXPOSE 3000

# next start (lit le build .next) - bind 0.0.0.0:3000 par défaut
CMD ["npm", "run", "start"]
