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

# 1. Build shared
RUN pnpm --filter @gas/shared build

# 2. Generate Prisma client BEFORE tsc
WORKDIR /app/packages/order-service
RUN pnpm exec prisma generate

# 3. Compile TypeScript
WORKDIR /app
RUN pnpm --filter order-service build

# 4. Copy generated Prisma client into dist/
RUN cp -r packages/order-service/src/generated packages/order-service/dist/generated

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

COPY packages/order-service/prisma ./packages/order-service/prisma

WORKDIR /app/packages/order-service

ENV NODE_ENV=production

EXPOSE 3002

CMD ["sh", "-c", "for i in 1 2 3 4 5 6 7 8 9 10; do echo \"Migration attempt $i...\"; pnpm exec prisma migrate deploy && break; sleep 30; done && node dist/index.js"]
