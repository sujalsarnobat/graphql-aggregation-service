import { mergeResolvers } from '@graphql-tools/merge';
import { userResolvers } from './user.resolver';
import { orderResolvers } from './order.resolver';
import { productResolvers } from './product.resolver';

export const resolvers = mergeResolvers([
  userResolvers,
  orderResolvers,
  productResolvers,
]);
