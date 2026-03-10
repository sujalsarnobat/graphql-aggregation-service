import type { ApolloServerPlugin, GraphQLRequestContextDidEncounterErrors } from '@apollo/server';
import type { GatewayContext } from '../context';
import { createLogger } from '@gas/shared';

const logger = createLogger('gateway:apollo');

export const loggingPlugin: ApolloServerPlugin<GatewayContext> = {
  async requestDidStart(requestContext) {
    const startTime = Date.now();
    const operationName = requestContext.request.operationName ?? 'anonymous';
    const requestId = requestContext.contextValue?.requestId;

    logger.info({ operationName, requestId }, 'GraphQL request started');

    return {
      async didEncounterErrors(
        ctx: GraphQLRequestContextDidEncounterErrors<GatewayContext>,
      ) {
        for (const err of ctx.errors) {
          logger.error(
            {
              operationName,
              requestId,
              message: err.message,
              path: err.path,
              extensions: err.extensions,
            },
            'GraphQL error encountered',
          );
        }
      },

      async willSendResponse() {
        const duration = Date.now() - startTime;
        logger.info({ operationName, requestId, duration: `${duration}ms` }, 'GraphQL request completed');
      },
    };
  },
};
