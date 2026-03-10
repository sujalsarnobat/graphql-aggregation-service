# GraphQL Aggregation Service — Full Project Explanation

This document explains every part of the project in plain language: what it is, why it's built this way, and how all the pieces connect.

---

## What is This Project?

This is a **GraphQL API Gateway** that sits in front of three separate REST microservices and combines them into a single, unified GraphQL API.

Instead of a client app making 3 separate HTTP calls to get user info, their orders, and the products in those orders — it makes **one GraphQL query** and gets everything back in one response.

```
Client App
    │
    ▼    (one GraphQL query)
┌─────────┐
│ Gateway │  :4000  ← Apollo Server 4 + Express
└─────────┘
    │           │           │
    ▼           ▼           ▼
┌──────┐  ┌───────┐  ┌─────────┐
│ User │  │ Order │  │ Product │
│ :3001│  │ :3002 │  │  :3003  │
└──────┘  └───────┘  └─────────┘
    │           │           │
    └───────────┴───────────┘
                │
           PostgreSQL (3 databases)
           Redis (cache)
```

---

## Project Structure

```
graphql-aggregation-service/
├── packages/
│   ├── shared/          ← shared code used by all services
│   ├── user-service/    ← REST API for users
│   ├── order-service/   ← REST API for orders
│   ├── product-service/ ← REST API for products
│   └── gateway/         ← GraphQL gateway
├── scripts/
│   ├── init-multiple-dbs.sh   ← creates 3 Postgres databases on first boot
│   └── healthcheck.ts         ← checks all services are alive
├── docker-compose.yml   ← runs everything with one command
├── .env.example         ← template for environment variables
├── pnpm-workspace.yaml  ← monorepo config
└── tsconfig.base.json   ← shared TypeScript config
```

This is a **monorepo**: one git repository containing multiple packages (`packages/*`). They share dependencies and can reference each other directly using `workspace:*` links.

---

## The `packages/shared` Package

**What it does:** Contains code that every package uses so it isn't duplicated.

| File | Purpose |
|---|---|
| `src/logger.ts` | Creates a structured JSON logger (pino). In development it pretty-prints with colors; in production it outputs raw JSON for log collectors. |
| `src/errors.ts` | Defines error classes: `AppError`, `NotFoundError`, `ServiceUnavailableError`, `ValidationError`, `InternalError`. These are thrown throughout the codebase and caught by the error handler. |
| `src/env.ts` | Validates environment variables using `zod`. If a required variable is missing or wrong type, the app crashes immediately with a clear error instead of failing later in weird ways. |

---

## The Three Microservices

All three follow the same pattern:

```
src/
├── index.ts        ← starts Express server
├── config.ts       ← reads + validates env vars
├── db.ts           ← creates Prisma database client
├── routes/         ← URL routing (GET /users/:id etc)
├── controllers/    ← handles HTTP request/response
├── services/       ← business logic (talks to database)
└── generated/
    └── prisma/     ← auto-generated database client (from `prisma generate`)
```

### Why are they separate services?

Each service owns its own database and can be deployed, scaled, and updated independently. If the product catalog needs more servers (high traffic), you scale only the product-service — not the whole application.

### User Service (port 3001)

Manages user accounts.

| Endpoint | Returns |
|---|---|
| `GET /users` | All users |
| `GET /users/:id` | One user |
| `GET /health` | Health status |

Database: `user_db` — has a `User` table with `id, name, email, phone, address`.

### Order Service (port 3002)

Manages orders. An order links a user to a product with a quantity and status.

| Endpoint | Returns |
|---|---|
| `GET /orders/user/:userId` | All orders for a user |
| `GET /orders/:id` | One order |
| `GET /health` | Health status |

Database: `order_db` — has an `Order` table with `id, userId, productId, quantity, totalPrice, status`.

Note: The order service only stores `userId` and `productId` as plain IDs. It does **not** join with the user or product tables — that cross-service joining happens in the gateway.

### Product Service (port 3003)

Manages the product catalog.

| Endpoint | Returns |
|---|---|
| `GET /products` | All products |
| `GET /products/:id` | One product |
| `GET /health` | Health status |

Database: `product_db` — has a `Product` table with `id, name, description, price, category, inStock, imageUrl`.

---

## Prisma (the ORM)

**What it is:** Prisma is a database toolkit for TypeScript. You define your models in a `schema.prisma` file and it generates a fully typed database client.

**Why custom output paths?** Each service generates its Prisma client into its own `src/generated/prisma/` folder (instead of the default shared `node_modules/@prisma/client`). This is critical in a monorepo because all three services have different models — they cannot share one generated client.

```
# In each service's prisma/schema.prisma:
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"   ← each service has its own
}
```

**Workflow:**
1. Edit `prisma/schema.prisma` to change your data model
2. Run `prisma migrate dev` to create a SQL migration file and apply it
3. Run `prisma generate` to regenerate the TypeScript client
4. The service's code imports from `'./generated/prisma/index.js'`

---

## The Gateway — How It All Works

This is the most complex package. Here's what happens when a GraphQL query arrives.

### 1. GraphQL Schema (`src/schema/typeDefs.ts`)

Defines what the client can query. Three types: `User`, `Order`, `Product`. Key relationships:

```graphql
type User {
  orders: [Order!]!     # ← cross-service field: fetched from order-service
}

type Order {
  product: Product!     # ← cross-service field: fetched from product-service
}
```

These nested fields are what make the gateway powerful — a client can query a user's orders and each order's product in one request, even though that data is in three different databases.

### 2. RESTDataSources (`src/datasources/`)

Each datasource is a class that knows how to talk to one microservice over HTTP.

```
BaseDataSource       ← shared HTTP logic (headers, error handling, retry)
├── UserDataSource   ← calls user-service:3001
├── OrderDataSource  ← calls order-service:3002
└── ProductDataSource ← calls product-service:3003
```

They extend Apollo's `RESTDataSource` which adds:
- Automatic JSON parsing
- HTTP-level caching (respects `Cache-Control` headers)
- Request deduplication (same URL won't be fetched twice in one request)

### 3. Resolvers (`src/schema/resolvers/`)

Resolvers are functions that tell GraphQL how to get data for each field.

```typescript
// When someone queries:  user(id: "1") { orders { product { name } } }

// Step 1 — user.resolver.ts
Query.user: (_, { id }, ctx) => ctx.dataSources.users.getUserById(id)
//   calls:  GET http://user-service:3001/users/1

// Step 2 — user.resolver.ts
User.orders: (user, _, ctx) => ctx.dataSources.orders.getOrdersByUserId(user.id)
//   calls:  GET http://order-service:3002/orders/user/1

// Step 3 — order.resolver.ts  (for EACH order — this is where N+1 would happen)
Order.product: (order, _, ctx) => ctx.productLoader.load(order.productId)
//   ← uses DataLoader, NOT direct HTTP call
```

### 4. DataLoader — Solving the N+1 Problem

**What is N+1?** If a user has 10 orders, naively resolving `Order.product` would make 10 separate HTTP calls to the product service — one per order. That's the N+1 problem.

**DataLoader fixes this:** It collects all the `productId`s from all orders in the current request, then makes one batched call (or a few parallel calls) to get all products at once.

```
Without DataLoader:
  GET /products/abc   ← order 1
  GET /products/def   ← order 2
  GET /products/abc   ← order 3 (duplicate!)
  ... 10 calls total

With DataLoader:
  GET /products/abc   ← batched + deduplicated
  GET /products/def   ← only 2 unique IDs needed
```

The DataLoader is created fresh per request (in `src/context.ts`) so its cache never leaks between requests.

### 5. Redis Cache (`src/cache/redis.ts`)

Redis is used as the cache store for Apollo Server. When a REST response comes back from a microservice, Apollo can cache it in Redis keyed by the URL. Subsequent identical requests within the TTL window are served from cache without hitting the microservice.

TTLs are configured per resource type:
- Users: 60 seconds
- Orders: 30 seconds  
- Products: 120 seconds

If Redis is unavailable, the gateway **crashes on startup** (intentional) — Redis is marked as a required dependency.

### 6. Rate Limiting (`src/middleware/rateLimit.ts`)

Uses `express-rate-limit` to limit each IP to 100 requests per minute. This protects the gateway from being overwhelmed. The `/health` endpoint is excluded.

### 7. Request/Response Lifecycle

```
1. Request arrives at Express
2. Helmet adds security headers (XSS, clickjacking protection)
3. CORS check passes
4. Rate limiter checks request count
5. Apollo Server receives the GraphQL query
6. Logging plugin records start time
7. Context function creates fresh DataSource instances + DataLoader
8. Resolvers execute (fetching from microservices, using cache)
9. Apollo assembles the response
10. Error formatter strips stack traces in production
11. Logging plugin records finish time + duration
12. Response sent to client
```

---

## Infrastructure

### Docker Compose

All 6 containers are defined in `docker-compose.yml`:

| Container | Image/Build | Role |
|---|---|---|
| `gas-postgres` | `postgres:16-alpine` | Single Postgres instance with 3 databases |
| `gas-redis` | `redis:7-alpine` | Cache store, LRU eviction, 256MB limit |
| `gas-user-service` | Built from `packages/user-service/Dockerfile` | User REST API |
| `gas-order-service` | Built from `packages/order-service/Dockerfile` | Order REST API |
| `gas-product-service` | Built from `packages/product-service/Dockerfile` | Product REST API |
| `gas-gateway` | Built from `packages/gateway/Dockerfile` | GraphQL gateway |

**Startup order:**
- Postgres starts first
- The 3 microservices wait for Postgres to be `(healthy)` before starting
- The gateway waits for all 3 microservices to be `(healthy)` before starting

### Why One Postgres for Three Databases?

For simplicity in development/demos. In a real production setup you'd have separate Postgres instances per service so they're truly isolated. The `init-multiple-dbs.sh` script creates `user_db`, `order_db`, and `product_db` automatically on the first boot.

### Dockerfiles (Multi-Stage Builds)

Each service uses a multi-stage build:

```dockerfile
# Stage 1: Build — install ALL deps, compile TypeScript to JavaScript
FROM node:22-alpine AS builder
RUN pnpm install
RUN pnpm build

# Stage 2: Production — copy only the compiled JS + production deps
# Result is a much smaller image with no TypeScript, no dev tools
FROM node:22-alpine AS production
COPY --from=builder /app/dist ./dist
```

This keeps the final Docker image lean (no TypeScript compiler, no dev dependencies).

---

## Environment Variables

Copy `.env.example` to `.env` before running anything. Key variables:

| Variable | Used By | Purpose |
|---|---|---|
| `DATABASE_URL` | Each service | Postgres connection string |
| `REDIS_URL` | Gateway | Redis connection string |
| `USER_SERVICE_URL` | Gateway | Where to call the user service |
| `ORDER_SERVICE_URL` | Gateway | Where to call the order service |
| `PRODUCT_SERVICE_URL` | Gateway | Where to call the product service |
| `NODE_ENV` | All | `development` enables pretty logs + GraphQL introspection |
| `PORT` | All | Which port the service listens on |

In Docker Compose, services talk to each other by container name (e.g., `http://user-service:3001`) not `localhost`.

---

## TypeScript Configuration

The root `tsconfig.base.json` applies to all packages:
- `strict: true` — catches most common bugs
- `exactOptionalPropertyTypes: true` — prevents passing `undefined` where a property is simply optional
- `moduleResolution: node` — standard Node.js module resolution
- `target: ES2022` — modern JavaScript output

Each package `tsconfig.json` extends the base and adds its own `rootDir`/`outDir`.

---

## Common Commands

```powershell
# Add pnpm to PATH (required each new PowerShell session)
$env:PATH = "E:\npm-global;" + $env:PATH

# Install all dependencies
pnpm install

# Build all packages
pnpm --recursive build

# Build one package
pnpm --filter gateway build

# Start infrastructure only (Postgres + Redis)
docker compose up postgres redis -d

# Start everything
docker compose up --build -d

# View logs
docker compose logs -f gateway
docker compose logs -f user-service

# Stop everything (data is kept in volumes)
docker compose down

# Full reset (deletes all data)
docker compose down -v

# Run database migrations (run once after infrastructure starts)
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/user_db?schema=public"
pnpm --filter user-service exec prisma migrate dev --name init

# Seed sample data
pnpm --filter user-service exec prisma db seed
```

---

## Example GraphQL Queries

Once running, go to `http://localhost:4000/graphql` and try these:

```graphql
# Get a user with all their orders and what products they ordered
query {
  user(id: "1") {
    name
    email
    orders {
      status
      quantity
      totalPrice
      product {
        name
        price
        category
      }
    }
  }
}

# Get all products
query {
  products {
    id
    name
    price
    inStock
  }
}

# Get orders for a specific user
query {
  ordersByUser(userId: "1") {
    id
    status
    totalPrice
    product {
      name
    }
  }
}
```

---

## Why This Architecture?

| Decision | Reason |
|---|---|
| **Microservices** | Each service is independently deployable, scalable, and can use different tech |
| **GraphQL gateway** | Client gets exactly the fields it needs in one request — no over/under-fetching |
| **DataLoader** | Prevents N+1 database/HTTP call explosion when resolving nested fields |
| **Redis cache** | Reduces load on microservices for repeated identical queries |
| **Prisma** | Type-safe database access — TypeScript knows the exact shape of every query result |
| **Monorepo** | Shared code (logger, error classes) without publishing separate npm packages |
| **pnpm workspaces** | Efficient dependency management — shared packages are symlinked, not duplicated |
| **Docker Compose** | One command to run the entire stack locally, same as production |
