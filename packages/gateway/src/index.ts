import 'dotenv/config';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';

import { config } from './config';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers/index';
import { createLogger } from '@gas/shared';
import { createRedisCache, closeRedis, getRedisClient } from './cache/redis';
import { rateLimiter } from './middleware/rateLimit';
import { requestIdMiddleware } from './middleware/requestId';
import { httpLogger } from './middleware/httpLogger';
import { loggingPlugin } from './plugins/logging.plugin';
import { complexityPlugin } from './plugins/complexity.plugin';
import { formatError } from './plugins/error-formatting';
import { UserDataSource } from './datasources/user.datasource';
import { OrderDataSource } from './datasources/order.datasource';
import { ProductDataSource } from './datasources/product.datasource';
import type { GatewayContext } from './context';
import { createProductLoader } from './context';

const logger = createLogger('gateway');

async function bootstrap() {
  // ─── Redis ─────────────────────────────────────────────────────────────────
  const cache = createRedisCache();

  // Connect Redis eagerly so we get early fail on misconfiguration
  const redisClient = getRedisClient();
  await redisClient.connect().catch((err: Error) => {
    logger.error({ err }, 'Failed to connect to Redis — aborting startup');
    process.exit(1);
  });

  // ─── Apollo Server ─────────────────────────────────────────────────────────
  const server = new ApolloServer<GatewayContext>({
    typeDefs,
    resolvers,
    cache,
    plugins: [loggingPlugin, complexityPlugin],
    formatError,
    introspection: config.NODE_ENV !== 'production',
    includeStacktraceInErrorResponses: config.NODE_ENV === 'development',
  });

  await server.start();
  logger.info('Apollo Server started');

  // ─── Express App ───────────────────────────────────────────────────────────
  const app = express();

  // Security headers
  app.use(
    helmet({
      ...(config.NODE_ENV !== 'production' && { contentSecurityPolicy: false }),
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS — restrict in production
  app.use(
    cors({
      origin:
        config.NODE_ENV === 'production'
          ? process.env['ALLOWED_ORIGINS']?.split(',') ?? false
          : '*',
      methods: ['GET', 'POST'],
    }),
  );

  app.use(bodyParser.json({ limit: '1mb' }));

  // Assign a unique request ID to every request (reuses x-request-id if present)
  app.use(requestIdMiddleware);

  // Morgan-style HTTP access log: method, url, status, latency, requestId
  app.use(httpLogger);

  // Rate limiting (skips /health)
  app.use(rateLimiter);

  // ─── Health Check ──────────────────────────────────────────────────────────
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const redis = getRedisClient();
      await redis.ping();
      res.json({
        status: 'ok',
        service: 'gateway',
        timestamp: new Date().toISOString(),
        upstreams: {
          userService: config.USER_SERVICE_URL,
          orderService: config.ORDER_SERVICE_URL,
          productService: config.PRODUCT_SERVICE_URL,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Health check failed');
      res.status(503).json({ status: 'error', service: 'gateway' });
    }
  });

  // ─── GraphQL Endpoint ─────────────────────────────────────────────────────
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ res }): Promise<GatewayContext> => {
        // Each request gets its own DataSource instances and DataLoader
        // DataLoader cache is per-request by design (no cross-request leaking)
        const users = new UserDataSource(config.USER_SERVICE_URL, { cache });
        const orders = new OrderDataSource(config.ORDER_SERVICE_URL, { cache });
        const products = new ProductDataSource(config.PRODUCT_SERVICE_URL, { cache });

        return {
          dataSources: { users, orders, products },
          productLoader: createProductLoader(products),
          requestId: res.locals['requestId'] as string,
        };
      },
    }),
  );

  // ─── 404 Handler ──────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled Express error');
    res.status(500).json({ error: 'Internal server error' });
  });

  // ─── Start Listening ──────────────────────────────────────────────────────
  const httpServer = app.listen(config.PORT, () => {
    logger.info(
      `Gateway listening on http://localhost:${config.PORT}/graphql`,
    );
    logger.info(
      `Apollo Sandbox available at http://localhost:${config.PORT}/graphql`,
    );
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await server.stop();
      await closeRedis();
      logger.info('Gateway shut down cleanly');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
