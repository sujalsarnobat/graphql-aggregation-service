import Redis from 'ioredis';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import { createLogger } from '@gas/shared';
import { config } from '../config';

const logger = createLogger('gateway:redis');

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
    redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    redisClient.on('close', () => logger.warn('Redis connection closed'));
  }
  return redisClient;
}

/**
 * Creates a KeyValueCache backed by Redis, compatible with Apollo Server.
 * TTL is set per-resource at the DataSource level via cache hints.
 */
export function createRedisCache(): KeyvAdapter {
  const client = getRedisClient();

  const keyvRedis = new KeyvRedis(client as any);
  const keyv = new Keyv({ store: keyvRedis, namespace: 'gas' });

  keyv.on('error', (err: Error) => {
    logger.error({ err }, 'Keyv/Redis store error');
  });

  return new KeyvAdapter(keyv as any, { disableBatchReads: true });
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
}
