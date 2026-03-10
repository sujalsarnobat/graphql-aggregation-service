import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { productRouter } from './routes/product.routes.js';
import { createLogger, isAppError } from '@gas/shared';
import { prisma } from './db.js';

const logger = createLogger('product-service');
const app = express();

app.use(helmet());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'product-service', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', service: 'product-service' });
  }
});

app.use('/products', productRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isAppError(err)) {
    logger.warn({ err, statusCode: err.statusCode }, err.message);
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(config.PORT, () => {
  logger.info(`Product service listening on port ${config.PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export { app };
