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

# Run migrations then start
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed && node dist/index.js"]
