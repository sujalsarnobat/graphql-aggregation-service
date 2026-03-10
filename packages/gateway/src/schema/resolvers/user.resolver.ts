import type { IResolvers } from '@graphql-tools/utils';
import type { GatewayContext } from '../../context';
import type { UserDTO } from '../../datasources/types';

export const userResolvers: IResolvers<unknown, GatewayContext> = {
  Query: {
    user: async (_parent, args: { id: string }, ctx) => {
      return ctx.dataSources.users.getUserById(args.id);
    },

    users: async (_parent, _args, ctx) => {
      return ctx.dataSources.users.getAllUsers();
    },
  },

  User: {
    // Nested resolver: fetch this user's orders from the Order Service
    orders: async (parent: UserDTO, _args, ctx) => {
      return ctx.dataSources.orders.getOrdersByUserId(parent.id);
    },
  },
};
