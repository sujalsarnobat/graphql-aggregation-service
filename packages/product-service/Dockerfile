# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/product-service/package.json ./packages/product-service/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/product-service ./packages/product-service

# 1. Build shared
RUN pnpm --filter @gas/shared build

# 2. Generate Prisma client BEFORE tsc
WORKDIR /app/packages/product-service
RUN pnpm exec prisma generate

# 3. Compile TypeScript
WORKDIR /app
RUN pnpm --filter product-service build

# 4. Copy generated Prisma client into dist/
RUN cp -r packages/product-service/src/generated packages/product-service/dist/generated

# ─── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/product-service/package.json ./packages/product-service/

# Keep Prisma CLI available in runtime for `prisma migrate deploy`.
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/product-service/dist ./packages/product-service/dist

COPY packages/product-service/prisma ./packages/product-service/prisma

WORKDIR /app/packages/product-service

ENV NODE_ENV=production

EXPOSE 3003

CMD ["sh", "-c", "if [ -n \"$PRISMA_SCHEMA\" ]; then case \"$DATABASE_URL\" in *\\?*) export DATABASE_URL=\"$DATABASE_URL&schema=$PRISMA_SCHEMA\" ;; *) export DATABASE_URL=\"$DATABASE_URL?schema=$PRISMA_SCHEMA\" ;; esac; fi; for i in 1 2 3 4 5 6 7 8 9 10; do echo \"Migration attempt $i...\"; pnpm exec prisma migrate deploy && break; sleep 30; done && node dist/index.js"]
