import { z, ZodSchema } from 'zod';

/**
 * Validates environment variables against a Zod schema.
 * Throws a descriptive error at startup if validation fails.
 */
export function validateEnv<T extends z.ZodRawShape>(schema: ZodSchema<z.infer<z.ZodObject<T>>>, values: NodeJS.ProcessEnv = process.env): z.infer<z.ZodObject<T>> {
  const result = schema.safeParse(values);

  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.data;
}

// ─── Re-usable schema fragments ────────────────────────────────────────────────

export const portSchema = z
  .string()
  .regex(/^\d+$/, 'Must be a numeric string')
  .transform(Number)
  .refine((n) => n > 0 && n < 65536, 'Must be a valid port (1–65535)');

export const urlSchema = z.string().url('Must be a valid URL');

export const databaseUrlSchema = z
  .string()
  .startsWith('postgresql://', 'Must start with postgresql://');
