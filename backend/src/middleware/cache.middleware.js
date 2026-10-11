import { Redis } from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Middleware to cache HTTP GET responses in Redis.
 *
 * @param {number} durationInSeconds - How long to cache the response (default: 60s)
 */
export const cacheRoute = (durationInSeconds = 60) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Construct a unique key based on the URL and query params
    // Also including organization/class IDs if they exist in params
    const key = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redisClient.get(key);

      if (cachedResponse) {
        // Cache hit
        return res.json(JSON.parse(cachedResponse));
      }

      // Cache miss: override res.json to intercept the response before sending it
      const originalJson = res.json;
      res.json = function (body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setex(key, durationInSeconds, JSON.stringify(body)).catch((err) => {
            console.error('[Redis Cache] Failed to save cache:', err);
          });
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('[Redis Cache] Error reading cache:', error);
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
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('[Redis Cache] Error invalidating cache:', error);
  }
};
