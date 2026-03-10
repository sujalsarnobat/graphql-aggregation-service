import type { IResolvers } from '@graphql-tools/utils';
import type { GatewayContext } from '../../context';

export const productResolvers: IResolvers<unknown, GatewayContext> = {
  Query: {
    product: async (_parent, args: { id: string }, ctx) => {
      return ctx.dataSources.products.getProductById(args.id);
    },

    products: async (_parent, _args, ctx) => {
      return ctx.dataSources.products.getAllProducts();
    },
  },
};
