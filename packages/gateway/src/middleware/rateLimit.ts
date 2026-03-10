import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { createLogger } from '@gas/shared';

const logger = createLogger('gateway:rate-limit');

export const rateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests — please try again later.',
    retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
  },
  handler: (req, res, _next, options) => {
    logger.warn(
      { ip: req.ip, path: req.path },
      `Rate limit exceeded: ${req.ip}`,
    );
    res.status(options.statusCode).json(options.message);
  },
  skip: (req) => req.path === '/health',
});
