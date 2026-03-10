# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/user-service/package.json ./packages/user-service/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/user-service ./packages/user-service

# 1. Build shared
RUN pnpm --filter @gas/shared build

# 2. Generate Prisma client BEFORE tsc (db.ts imports from ./generated/prisma)
WORKDIR /app/packages/user-service
RUN pnpm exec prisma generate

# 3. Compile TypeScript
WORKDIR /app
RUN pnpm --filter user-service build

# 4. Copy generated Prisma client into dist/ so Node can find it at runtime
#    (tsc only compiles .ts files; the generated .js files need to be copied manually)
RUN cp -r packages/user-service/src/generated packages/user-service/dist/generated

# ─── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/user-service/package.json ./packages/user-service/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled output (includes dist/generated/prisma from step 4 above)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/user-service/dist ./packages/user-service/dist

# Copy Prisma schema for migrate deploy
COPY packages/user-service/prisma ./packages/user-service/prisma

WORKDIR /app/packages/user-service

ENV NODE_ENV=production

EXPOSE 3001

# Retry migrate up to 10 times (30s apart) to survive Render's postgres cold start.
CMD ["sh", "-c", "for i in 1 2 3 4 5 6 7 8 9 10; do echo \"Migration attempt $i...\"; pnpm exec prisma migrate deploy && break; sleep 30; done && node dist/index.js"]
