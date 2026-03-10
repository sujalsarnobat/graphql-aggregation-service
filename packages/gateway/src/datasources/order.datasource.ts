import { BaseDataSource } from './base.datasource';
import type { DataSourceConfig } from '@apollo/datasource-rest';
import type { OrderDTO } from './types';

export class OrderDataSource extends BaseDataSource {
  protected serviceName = 'order-service';

  constructor(baseURL: string, config?: DataSourceConfig) {
    super(config);
    this.baseURL = baseURL;
  }

  async getOrdersByUserId(userId: string): Promise<OrderDTO[]> {
    return this.get<OrderDTO[]>(`orders/user/${userId}`);
  }

  async getOrderById(id: string): Promise<OrderDTO | null> {
    return this.safeGet<OrderDTO>(`orders/${id}`);
  }
}
