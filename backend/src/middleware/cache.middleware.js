import { getRedisClient, hasRedisConfig } from '../lib/redis.js';

/**
 * Middleware to cache HTTP GET responses in Redis.
 * If Redis is not configured or offline, gracefully passes through without caching.
 *
 * @param {number} durationInSeconds - How long to cache the response (default: 60s)
 */
export const cacheRoute = (durationInSeconds = 60) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const redis = getRedisClient();
    if (!redis || !hasRedisConfig) {
      return next(); // Pass through without cache if Redis is not configured
    }

    const key = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redis.get(key);

      if (cachedResponse) {
        // Cache hit
        return res.json(JSON.parse(cachedResponse));
      }

      // Cache miss: override res.json to intercept the response before sending it
      const originalJson = res.json;
      res.json = function (body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(key, durationInSeconds, JSON.stringify(body)).catch(() => {
            // Silently ignore cache write failures
          });
        }
        return originalJson.call(this, body);
      };

      next();
    } catch {
      next(); // Fail gracefully and proceed without cache
    }
  };
};

/**
 * Utility to invalidate a specific cache key or pattern
 * Useful after POST/PUT/DELETE operations.
 *
 * @param {string} pattern - Redis key pattern (e.g., 'cache:/api/organizations/123/classes*')
 */
export const invalidateCache = async (pattern) => {
  const redis = getRedisClient();
  if (!redis || !hasRedisConfig) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch {
    // Silently ignore invalidation failure
  }
};
