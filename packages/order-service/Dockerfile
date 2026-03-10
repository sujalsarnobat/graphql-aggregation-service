# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/order-service/package.json ./packages/order-service/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/order-service ./packages/order-service

RUN pnpm --filter @gas/shared build
RUN pnpm --filter order-service build

WORKDIR /app/packages/order-service
RUN pnpm exec prisma generate

# ─── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/order-service/package.json ./packages/order-service/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/order-service/dist ./packages/order-service/dist
COPY --from=builder /app/packages/order-service/node_modules/.prisma ./packages/order-service/node_modules/.prisma

COPY packages/order-service/prisma ./packages/order-service/prisma

WORKDIR /app/packages/order-service

ENV NODE_ENV=production

EXPOSE 3002

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed && node dist/index.js"]
