# HelferNet – Produktions-Image (Next.js + Prisma).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 helfernet && mkdir -p /data/storage && chown -R helfernet /data
COPY --from=build --chown=helfernet /app ./
USER helfernet
VOLUME /data/storage
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
