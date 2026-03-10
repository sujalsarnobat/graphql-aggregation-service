# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/product-service/package.json ./packages/product-service/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/product-service ./packages/product-service

RUN pnpm --filter @gas/shared build
RUN pnpm --filter product-service build

WORKDIR /app/packages/product-service
RUN pnpm exec prisma generate

# ─── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/product-service/package.json ./packages/product-service/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/product-service/dist ./packages/product-service/dist
COPY --from=builder /app/packages/product-service/node_modules/.prisma ./packages/product-service/node_modules/.prisma

COPY packages/product-service/prisma ./packages/product-service/prisma

WORKDIR /app/packages/product-service

ENV NODE_ENV=production

EXPOSE 3003

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed && node dist/index.js"]
