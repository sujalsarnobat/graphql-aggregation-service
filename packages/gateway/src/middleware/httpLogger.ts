import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '@gas/shared';

const logger = createLogger('gateway:http');

/**
 * Morgan-style HTTP access logger built on pino.
 *
 * Logs every completed request with:
 *   - requestId   (set by requestIdMiddleware)
 *   - method / url
 *   - statusCode
 *   - latency in ms
 *   - user-agent
 *
 * Log level scales with HTTP status:
 *   - 5xx → error
 *   - 4xx → warn
 *   - <400 → info
 *
 * Only fires on `res.finish` so the latency measurement is end-to-end.
 */
export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const requestId = res.locals['requestId'] as string | undefined;
    const status = res.statusCode;
    const level: 'error' | 'warn' | 'info' =
      status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger[level](
      {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: status,
        durationMs: duration,
        userAgent: req.get('user-agent') ?? 'unknown',
        ip: req.ip,
      },
      `${req.method} ${req.originalUrl} ${status} — ${duration}ms`,
    );
  });

  next();
}
