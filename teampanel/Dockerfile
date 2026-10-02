# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
# Der Build braucht keine echte Datenbank
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

FROM base AS run
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app ./
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
EXPOSE 3000
# Migrationen anwenden, Stammdaten (Rollen, ggf. erster Superadmin) sicherstellen, dann starten
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:bootstrap && npm start"]
