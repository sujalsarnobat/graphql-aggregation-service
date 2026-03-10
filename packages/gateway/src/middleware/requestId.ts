import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Assigns a unique request ID to every incoming request.
 *
 * - Reuses the `x-request-id` header if the client/load-balancer sends one
 *   (common in AWS ALB, Nginx, etc.)
 * - Otherwise generates a fresh UUID v4
 * - Sets `res.locals.requestId` so downstream middleware + Apollo context can read it
 * - Echoes the ID back in the response header so clients can correlate logs
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = (typeof incoming === 'string' && incoming.length > 0) ? incoming : randomUUID();

  res.locals['requestId'] = id;
  res.setHeader('x-request-id', id);
  next();
}
