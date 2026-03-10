import type { GraphQLFormattedError } from 'graphql';
import type { unwrapResolverError } from '@apollo/server/errors';
import { createLogger, isAppError } from '@gas/shared';

const logger = createLogger('gateway:error-format');
const isProd = process.env['NODE_ENV'] === 'production';

/**
 * Formats GraphQL errors for client responses.
 * - In production: masks internal errors, preserves operational errors.
 * - In development: passes through full error details for debugging.
 */
export function formatError(
  formattedError: GraphQLFormattedError,
  error: ReturnType<typeof unwrapResolverError>,
): GraphQLFormattedError {
  // Always pass through GraphQL validation/syntax errors
  if (
    formattedError.extensions?.['code'] === 'GRAPHQL_VALIDATION_FAILED' ||
    formattedError.extensions?.['code'] === 'BAD_USER_INPUT' ||
    formattedError.extensions?.['code'] === 'GRAPHQL_PARSE_FAILED'
  ) {
    return formattedError;
  }

  if (isAppError(error)) {
    return {
      ...formattedError,
      message: error.message,
      extensions: {
        ...formattedError.extensions,
        code: error.isOperational ? 'SERVICE_ERROR' : 'INTERNAL_SERVER_ERROR',
        statusCode: error.statusCode,
      },
    };
  }

  if (isProd) {
    // In production, mask unexpected errors from clients
    logger.error({ error }, 'Masking internal error from client');
    return {
      message: 'An internal server error occurred.',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    };
  }

  // Development: pass through full error
  return formattedError;
}
