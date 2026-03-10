# GraphQL Aggregation Service

A production-ready GraphQL gateway that aggregates three REST microservices into a single query interface, built with TypeScript, Apollo Server 4, Express, Prisma, Redis, and Docker.

---

## Architecture

```
Client
  │
  ▼
Apollo GraphQL Gateway  :4000  (Express + Apollo Server 4)
  │         │         │
  ▼         ▼         ▼
User      Order    Product
Service   Service  Service
:3001     :3002    :3003
  │         │         │
  ▼         ▼         ▼
 user_db  order_db  product_db   (PostgreSQL — separate DBs)

Gateway → Redis :6379  (response caching)
```

### Key Design Decisions

| Concern | Solution |
|---|---|
| N+1 prevention | DataLoader batches all `Order.product` fetches per request |
| Response caching | Apollo DataSource + Redis (`@apollo/utils.keyvadapter`) |
| Rate limiting | `express-rate-limit` — 100 req/min per IP |
| Structured logging | `pino` with JSON output (pretty in dev) |
| Env validation | `zod` schemas fail fast at startup |
| Type safety | Full TypeScript strict mode throughout |
| DB per service | True microservice isolation — separate PostgreSQL databases |

---

## Project Structure

```
graphql-aggregation-service/
├── docker-compose.yml              # Orchestrate all services
├── .env.example                    # Copy to .env to run locally
├── pnpm-workspace.yaml
├── tsconfig.base.json              # Shared TypeScript config
├── scripts/
│   ├── init-multiple-dbs.sh        # Postgres multi-DB init
│   └── healthcheck.ts              # Verify all services healthy
└── packages/
    ├── shared/                     # Shared logger, errors, env utils
    ├── gateway/                    # Apollo GraphQL gateway
    │   └── src/
    │       ├── schema/
    │       │   ├── typeDefs.ts     # GraphQL SDL
    │       │   └── resolvers/     # user, order, product resolvers
    │       ├── datasources/       # RESTDataSource per microservice
    │       ├── cache/redis.ts     # ioredis + KeyvAdapter
    │       ├── middleware/         # express-rate-limit
    │       ├── plugins/           # Apollo logging + error formatting
    │       └── index.ts           # Server bootstrap
    ├── user-service/
    ├── order-service/
    └── product-service/
        └── src/
            ├── routes/            # Express routes
            ├── controllers/       # Request handlers
            ├── services/          # Business logic
            └── index.ts           # Express bootstrap
```

---

## GraphQL Schema

```graphql
type Query {
  user(id: ID!): User
  users: [User!]!
  product(id: ID!): Product
  products: [Product!]!
  ordersByUser(userId: ID!): [Order!]!
}

type User {
  id: ID!
  name: String!
  email: String!
  phone: String
  address: String
  createdAt: String!
  orders: [Order!]!       # → Order Service
}

type Order {
  id: ID!
  userId: ID!
  productId: ID!
  quantity: Int!
  totalPrice: Float!
  status: OrderStatus!
  createdAt: String!
  product: Product!        # → Product Service (DataLoader)
}

type Product {
  id: ID!
  name: String!
  description: String!
  price: Float!
  category: String!
  inStock: Boolean!
  imageUrl: String
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

---

## Quick Start with Docker

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) v24+
- [Docker Compose](https://docs.docker.com/compose/) v2+

### 1. Clone and configure

```bash
git clone <repo-url>
cd graphql-aggregation-service
cp .env.example .env
```

### 2. Start everything

```bash
docker-compose up --build
```

This will:
1. Start PostgreSQL with `user_db`, `order_db`, `product_db`
2. Start Redis
3. Run Prisma migrations + seed data for each service
4. Start all 3 microservices and the GraphQL gateway

### 3. Verify

```bash
# All services healthy?
npx ts-node scripts/healthcheck.ts

# Or check individually:
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:4000/health
```

### 4. Open GraphQL Playground

Navigate to `http://localhost:4000/graphql` — Apollo Sandbox will open automatically.

---

## Local Development (Without Docker)

### Prerequisites
- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- PostgreSQL 16 running locally
- Redis 7 running locally

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL values for your local PostgreSQL
```

### 3. Run database migrations and seed

```bash
# Run from each service directory:
cd packages/user-service
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/user_db"
pnpm exec prisma migrate dev --name init
pnpm seed

cd ../order-service
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/order_db"
pnpm exec prisma migrate dev --name init
pnpm seed

cd ../product-service
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/product_db"
pnpm exec prisma migrate dev --name init
pnpm seed
```

### 4. Start all services

```bash
# From root — starts all 4 services concurrently with color-coded output
pnpm dev
```

Services start on:
- User Service: `http://localhost:3001`
- Order Service: `http://localhost:3002`
- Product Service: `http://localhost:3003`
- GraphQL Gateway: `http://localhost:4000/graphql`

---

## Example Queries

Open `http://localhost:4000/graphql` and try:

### Nested user → orders → products

```graphql
query GetUserWithOrders {
  user(id: "user_1") {
    name
    email
    orders {
      id
      quantity
      totalPrice
      status
      product {
        name
        price
        category
        inStock
      }
    }
  }
}
```

### All users

```graphql
query GetAllUsers {
  users {
    id
    name
    email
  }
}
```

### Single product

```graphql
query GetProduct {
  product(id: "prod_3") {
    name
    description
    price
    category
    inStock
  }
}
```

### All products

```graphql
query GetAllProducts {
  products {
    id
    name
    price
    category
    inStock
  }
}
```

### Orders by user

```graphql
query GetOrdersByUser {
  ordersByUser(userId: "user_2") {
    id
    status
    totalPrice
    product {
      name
    }
  }
}
```

### Error handling — non-existent resource

```graphql
query {
  user(id: "doesnt-exist") {
    name
  }
}
# Returns: { "data": { "user": null } } — no crash
```

---

## REST API Reference

### User Service (`http://localhost:3001`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get user by ID |

### Order Service (`http://localhost:3002`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/orders/user/:id` | Orders for a user |
| `GET` | `/orders/:id` | Get order by ID |

### Product Service (`http://localhost:3003`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/products` | List all products |
| `GET` | `/products/:id` | Get product by ID |

---

## Environment Variables

### Gateway (`packages/gateway`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Gateway listen port |
| `NODE_ENV` | `development` | `development` or `production` |
| `USER_SERVICE_URL` | — | URL of user service |
| `ORDER_SERVICE_URL` | — | URL of order service |
| `PRODUCT_SERVICE_URL` | — | URL of product service |
| `REDIS_URL` | — | Redis connection URL |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `CACHE_TTL_USER` | `60` | User cache TTL (seconds) |
| `CACHE_TTL_ORDER` | `30` | Order cache TTL (seconds) |
| `CACHE_TTL_PRODUCT` | `120` | Product cache TTL (seconds) |

### Microservices

| Variable | Description |
|---|---|
| `PORT` | Service listen port |
| `DATABASE_URL` | PostgreSQL connection string |
| `NODE_ENV` | `development` or `production` |

---

## Seed Data

The seed scripts create:

- **5 Users**: Alice, Bob, Carol, David, Eva
- **10 Products**: Electronics, Sports, Kitchen categories
- **15 Orders**: Cross-referencing users and products, various statuses

All IDs are deterministic (`user_1`–`user_5`, `prod_1`–`prod_10`, `order_1`–`order_15`) so queries are reproducible.

---

## Verifying Features

### Caching (Redis)

```bash
# Run the same query twice, then inspect Redis
docker exec gas-redis redis-cli KEYS "*"
docker exec gas-redis redis-cli TTL "gas:..."
```

### Rate Limiting

```bash
# Fire 101 requests — 101st should return HTTP 429
for i in $(seq 1 101); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ users { id } }"}' 
done
```

### DataLoader (N+1 prevention)

Watch gateway logs when querying a user with multiple orders — you'll see product fetches batched into a small number of requests rather than one per order.

---

## Docker Commands

```bash
# Start all services (build images)
docker-compose up --build

# Start in background
docker-compose up -d --build

# View logs for a specific service
docker-compose logs -f gateway
docker-compose logs -f user-service

# Stop and remove containers + volumes
docker-compose down -v

# Rebuild a single service
docker-compose build gateway
docker-compose up -d gateway

# Access PostgreSQL
docker exec -it gas-postgres psql -U postgres -d user_db

# Access Redis CLI
docker exec -it gas-redis redis-cli
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5 (strict) |
| Package Manager | pnpm 9 (workspaces monorepo) |
| GraphQL Server | Apollo Server 4 |
| HTTP Framework | Express 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 + ioredis |
| Apollo Cache | `@apollo/utils.keyvadapter` + `@keyv/redis` |
| Data Fetching | `@apollo/datasource-rest` |
| N+1 Prevention | DataLoader |
| Rate Limiting | `express-rate-limit` |
| Logging | pino |
| Env Validation | zod |
| Containerization | Docker + Docker Compose |
