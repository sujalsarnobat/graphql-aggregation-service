import type { IResolvers } from '@graphql-tools/utils';
import type { GatewayContext } from '../../context';
import type { OrderDTO } from '../../datasources/types';

export const orderResolvers: IResolvers<unknown, GatewayContext> = {
  Query: {
    ordersByUser: async (_parent, args: { userId: string }, ctx) => {
      return ctx.dataSources.orders.getOrdersByUserId(args.userId);
    },
  },

  Order: {
    /**
     * Nested resolver: fetch the product for this order.
     * Uses DataLoader to batch all product lookups across the request
     * into a single set of network calls — prevents N+1 problem.
     */
    product: async (parent: OrderDTO, _args, ctx) => {
      return ctx.productLoader.load(parent.productId);
    },
  },
};
