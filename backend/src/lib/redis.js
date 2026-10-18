import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

const rawUrl = process.env.REDIS_URL;
export const hasRedisConfig = Boolean(rawUrl && rawUrl.trim() !== '');

let singletonClient = null;

/**
 * Creates or retrieves a resilient Redis client.
 * Includes error handling to prevent unhandled ECONNREFUSED exceptions.
 */
export function getRedisClient() {
  if (singletonClient) return singletonClient;

  // If in production and no REDIS_URL is provided, don't attempt to connect to localhost
  if (!hasRedisConfig && process.env.NODE_ENV === 'production') {
    logger.warn('[redis]: No REDIS_URL provided. Redis features running in fallback mode.');
    return null;
  }

  const url = hasRedisConfig ? rawUrl : 'redis://localhost:6379';

  try {
    const options = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        // If no explicit REDIS_URL was configured, give up after 3 tries so it doesn't spam logs
        if (!hasRedisConfig && times > 3) {
          return null;
        }
        return Math.min(times * 1000, 5000);
      },
    };

    // Support TLS connections (e.g., Upstash rediss://)
    if (url.startsWith('rediss://')) {
      options.tls = { rejectUnauthorized: false };
    }

    singletonClient = new Redis(url, options);

    singletonClient.on('connect', () => {
      logger.info('[redis]: Connected successfully.');
    });

    singletonClient.on('error', (err) => {
      // Silently catch connection errors so Node.js does not crash with unhandled error
      logger.warn(`[redis]: Connection notice: ${err.message}`);
    });

    return singletonClient;
  } catch (err) {
    logger.warn(`[redis]: Could not create client: ${err.message}`);
    return null;
  }
}

/**
 * Helper factory used for diagnostic health checks
 */
export function createRedisClient() {
  const client = getRedisClient();
  if (client) return client;

  return {
    ping: async () => {
      if (!hasRedisConfig) return 'SKIPPED (no REDIS_URL)';
      throw new Error('Redis not connected');
    },
    quit: async () => {},
  };
}

/**
 * Connection options or URL formatted for BullMQ Queue and Worker instances
 */
export const redisConnection = hasRedisConfig
  ? rawUrl.startsWith('rediss://')
    ? { url: rawUrl, tls: { rejectUnauthorized: false }, maxRetriesPerRequest: null }
    : rawUrl
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
    };
