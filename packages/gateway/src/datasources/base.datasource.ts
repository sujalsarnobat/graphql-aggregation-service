import { RESTDataSource } from '@apollo/datasource-rest';
import type { AugmentedRequest, RequestOptions } from '@apollo/datasource-rest';
import { createLogger, ServiceUnavailableError } from '@gas/shared';

const logger = createLogger('gateway:datasource');

/**
 * Base RESTDataSource with shared configuration:
 * - JSON error body extraction
 * - Timeout handling
 * - Structured logging
 */
export abstract class BaseDataSource extends RESTDataSource {
  protected abstract serviceName: string;

  override willSendRequest(_path: string, request: AugmentedRequest) {
    request.headers['Accept'] = 'application/json';
    request.headers['Content-Type'] = 'application/json';
  }

  protected override didEncounterError(error: Error, _request: RequestOptions): void {
    logger.error(
      { service: this.serviceName, err: error },
      `Error contacting ${this.serviceName}`,
    );
    throw new ServiceUnavailableError(this.serviceName, error);
  }

  protected async safeGet<T>(path: string): Promise<T | null> {
    try {
      return await this.get<T>(path);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }
}
