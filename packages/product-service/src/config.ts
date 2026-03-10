import { z } from 'zod';
import { validateEnv, portSchema, databaseUrlSchema } from '@gas/shared';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: portSchema.default('3003'),
  DATABASE_URL: databaseUrlSchema,
  LOG_LEVEL: z.string().optional(),
});

export const config = validateEnv(envSchema as any);
