import { BaseDataSource } from './base.datasource';
import type { DataSourceConfig } from '@apollo/datasource-rest';
import type { ProductDTO } from './types';

export class ProductDataSource extends BaseDataSource {
  protected serviceName = 'product-service';

  constructor(baseURL: string, config?: DataSourceConfig) {
    super(config);
    this.baseURL = baseURL;
  }

  async getProductById(id: string): Promise<ProductDTO | null> {
    return this.safeGet<ProductDTO>(`products/${id}`);
  }

  async getAllProducts(): Promise<ProductDTO[]> {
    return this.get<ProductDTO[]>('products');
  }

  /**
   * Batch-fetches products by multiple IDs.
   * Used by DataLoader to avoid N+1 queries.
   */
  async getProductsByIds(ids: readonly string[]): Promise<(ProductDTO | Error)[]> {
    const results = await Promise.allSettled(
      ids.map((id) => this.getProductById(id)),
    );

    return results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return result.value ?? new Error(`Product '${ids[i]}' not found`);
      }
      return result.reason as Error;
    });
  }
}
