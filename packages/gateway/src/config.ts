import { z } from 'zod';
import { validateEnv, portSchema, urlSchema } from '@gas/shared';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: portSchema.default('4000'),

  USER_SERVICE_URL: urlSchema,
  ORDER_SERVICE_URL: urlSchema,
  PRODUCT_SERVICE_URL: urlSchema,

  REDIS_URL: z.string().url('Must be a valid Redis URL (redis://...)'),

  RATE_LIMIT_WINDOW_MS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 60_000)),
  RATE_LIMIT_MAX: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 100)),

  CACHE_TTL_USER: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 60)),
  CACHE_TTL_ORDER: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 30)),
  CACHE_TTL_PRODUCT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 120)),

  // Abort upstream HTTP calls after this many ms; resolver returns null (partial result)
  SERVICE_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 2000)),

  LOG_LEVEL: z.string().optional(),
});

export const config = validateEnv(envSchema as any);
export type Config = typeof config;
