# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/gateway/package.json ./packages/gateway/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/gateway ./packages/gateway

RUN pnpm --filter @gas/shared build
RUN pnpm --filter gateway build

# ─── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/gateway/package.json ./packages/gateway/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/gateway/dist ./packages/gateway/dist

WORKDIR /app/packages/gateway

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "dist/index.js"]
