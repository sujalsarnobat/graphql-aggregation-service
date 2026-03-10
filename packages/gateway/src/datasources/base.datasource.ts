import { RESTDataSource } from '@apollo/datasource-rest';
import type { AugmentedRequest, RequestOptions } from '@apollo/datasource-rest';
import { createLogger, ServiceUnavailableError } from '@gas/shared';
import { config } from '../config';

const logger = createLogger('gateway:datasource');

/**
 * Base RESTDataSource with shared configuration:
 * - 2 s AbortSignal timeout per request (configurable via SERVICE_TIMEOUT_MS)
 * - Partial-result pattern: safeGet returns null on 404 OR timeout instead of throwing
 * - Structured error logging
 */
export abstract class BaseDataSource extends RESTDataSource {
  protected abstract serviceName: string;

  override willSendRequest(_path: string, request: AugmentedRequest) {
    request.headers['Accept'] = 'application/json';
    request.headers['Content-Type'] = 'application/json';
    // Abort the upstream call if the service doesn't respond in time.
    // The resolver that called safeGet() will receive null — a partial result —
    // instead of a hard failure, matching Netflix/Uber resilience patterns.
    (request as RequestInit).signal = AbortSignal.timeout(config.SERVICE_TIMEOUT_MS);
  }

  protected override didEncounterError(error: Error, _request: RequestOptions): void {
    // Timeout → re-throw as-is so safeGet() can recognise it and return null
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      logger.warn(
        { service: this.serviceName, timeout: config.SERVICE_TIMEOUT_MS },
        `${this.serviceName} timed out — partial result will be returned`,
      );
      throw error;
    }
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
      if (err instanceof Error) {
        if (err.message.includes('404')) return null;
        // Upstream timed out — degrade gracefully instead of failing the whole request
        if (err.name === 'TimeoutError' || err.name === 'AbortError') return null;
      }
      throw err;
    }
  }
}

