import { BaseDataSource } from './base.datasource';
import type { DataSourceConfig } from '@apollo/datasource-rest';
import type { UserDTO } from './types';

export class UserDataSource extends BaseDataSource {
  protected serviceName = 'user-service';

  constructor(baseURL: string, config?: DataSourceConfig) {
    super(config);
    this.baseURL = baseURL;
  }

  async getUserById(id: string): Promise<UserDTO | null> {
    return this.safeGet<UserDTO>(`users/${id}`);
  }

  async getAllUsers(): Promise<UserDTO[]> {
    return this.get<UserDTO[]>('users');
  }
}
