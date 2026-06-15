#!/bin/sh
set -e

echo "--> Applying database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

# Seed UNIQUEMENT si la base est vide - seed.js fait des deleteMany() et
# détruirait des données existantes s'il était relancé sur une base peuplée.
if [ "${RUN_SEED:-false}" = "true" ]; then
  USER_COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(c=>{process.stdout.write(String(c));return p.\$disconnect();}).catch(()=>{process.stdout.write('0');})")
  if [ "$USER_COUNT" = "0" ]; then
    echo "▶ Database empty - running seed..."
    node prisma/seed.js
  else
    echo "--> Database already has $USER_COUNT user(s) - skipping seed."
  fi
fi

echo "--> Starting API..."
exec node dist/main
