# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/user-service/package.json ./packages/user-service/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY packages/user-service ./packages/user-service

# Build shared first, then user-service
RUN pnpm --filter @gas/shared build
RUN pnpm --filter user-service build

# Generate Prisma Client
WORKDIR /app/packages/user-service
RUN pnpm exec prisma generate

# ─── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/user-service/package.json ./packages/user-service/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled output
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/user-service/dist ./packages/user-service/dist
COPY --from=builder /app/packages/user-service/node_modules/.prisma ./packages/user-service/node_modules/.prisma

# Copy Prisma schema for migrations
COPY packages/user-service/prisma ./packages/user-service/prisma

WORKDIR /app/packages/user-service

ENV NODE_ENV=production

EXPOSE 3001

# Retry migrate up to 10 times (30s apart) to survive Render's postgres cold start.
# Seed is NOT run here — run it once manually via Render Shell after first deploy.
CMD ["sh", "-c", "for i in 1 2 3 4 5 6 7 8 9 10; do echo \"Migration attempt $i...\"; pnpm exec prisma migrate deploy && break; sleep 30; done && node dist/index.js"]
