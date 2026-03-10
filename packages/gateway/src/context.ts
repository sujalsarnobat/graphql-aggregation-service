import DataLoader from 'dataloader';
import { UserDataSource } from './datasources/user.datasource';
import { OrderDataSource } from './datasources/order.datasource';
import { ProductDataSource } from './datasources/product.datasource';
import type { ProductDTO } from './datasources/types';

export interface GatewayContext {
  dataSources: {
    users: UserDataSource;
    orders: OrderDataSource;
    products: ProductDataSource;
  };
  /**
   * Per-request DataLoader for Product — batches and deduplicates
   * product fetches across all Order.product field resolvers in one query.
   */
  productLoader: DataLoader<string, ProductDTO>;
  /** Unique ID for this request — appears in every log line for correlation. */
  requestId: string;
}

export function createProductLoader(
  products: ProductDataSource,
): DataLoader<string, ProductDTO> {
  return new DataLoader<string, ProductDTO>(
    async (ids) => {
      const results = await products.getProductsByIds(ids);
      return results;
    },
    { cache: true },
  );
}
