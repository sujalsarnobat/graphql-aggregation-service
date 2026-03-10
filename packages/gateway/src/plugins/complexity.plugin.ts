import { GraphQLError } from 'graphql';
import { getComplexity, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';
import type { ApolloServerPlugin } from '@apollo/server';
import type { GatewayContext } from '../context';
import { createLogger } from '@gas/shared';

const logger = createLogger('gateway:complexity');

/**
 * Maximum allowed query complexity.
 *
 * Each field counts as 1 point (simpleEstimator).
 * Individual fields can opt-in to higher costs via their schema extensions:
 *
 *   fieldExtensions: { complexity: 10 }
 *
 * A query like:
 *   { users { orders { product { name price } } } }
 * scores ~7 — well within budget.
 *
 * An abusive deeply-nested query attacking many list fields will exceed
 * this limit and be rejected before any resolver runs.
 */
const MAX_COMPLEXITY = 100;

export const complexityPlugin: ApolloServerPlugin<GatewayContext> = {
  async requestDidStart({ schema }) {
    return {
      async didResolveOperation({ request, document }) {
        const operationName = request.operationName ?? undefined;
        const complexity = getComplexity({
          schema,
          ...(operationName !== undefined && { operationName }),
          query: document,
          variables: request.variables ?? {},
          estimators: [
            // Respect per-field complexity annotations in schema extensions
            fieldExtensionsEstimator(),
            // Default: every field costs 1
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });

        logger.debug(
          { complexity, max: MAX_COMPLEXITY, operation: request.operationName ?? 'anonymous' },
          'Query complexity evaluated',
        );

        if (complexity > MAX_COMPLEXITY) {
          throw new GraphQLError(
            `Query complexity ${complexity} exceeds maximum allowed complexity of ${MAX_COMPLEXITY}. ` +
              `Simplify your query by requesting fewer nested fields.`,
            {
              extensions: {
                code: 'QUERY_TOO_COMPLEX',
                complexity,
                maxComplexity: MAX_COMPLEXITY,
              },
            },
          );
        }
      },
    };
  },
};
