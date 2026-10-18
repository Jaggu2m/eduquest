import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, hasRedisConfig } from '../lib/redis.js';

// Create a generic rate limiter function with RedisStore (distributed) or MemoryStore (fallback)
export const createRateLimiter = (options = {}) => {
  const isProd = process.env.NODE_ENV === 'production';
  const redisClient = getRedisClient();

  const limiterConfig = {
    windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: options.max || 100, // Default: Limit each IP to 100 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { singleCount: false },
    message: {
      message: options.message || 'Too many requests from this IP, please try again later.',
    },
  };

  // Only attach RedisStore if Redis is explicitly configured and client was initialized
  if (redisClient && hasRedisConfig) {
    limiterConfig.store = new RedisStore({
      sendCommand: async (...args) => {
        try {
          return await redisClient.call(...args);
        } catch {
          return null; // Gracefully fall back if Redis command fails
        }
      },
    });
  }

  return rateLimit(limiterConfig);
};

// Ready-to-use limiters
const isProd = process.env.NODE_ENV === 'production';

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 200 : 5000, // Relaxed limit in development
});

export const authLimiter = createRateLimiter({
  windowMs: isProd ? 60 * 60 * 1000 : 60 * 1000, // 1 hour in prod, 1 min in dev
  max: isProd ? 10 : 1000, // Relaxed limit in development
  message: 'Too many authentication attempts, please try again later.',
});

// Rate limiter for expensive AI endpoints (Quiz generation, AI Tutor, Flashcard generation)
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  max: isProd ? 15 : 200, // 15 requests/min in prod, 200 in dev
  message: 'AI request limit reached. Please wait a moment before sending more AI requests.',
});

// Rate limiter for document uploads to prevent storage abuse
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: isProd ? 30 : 500, // 30 uploads/hour in prod
  message: 'Upload limit exceeded. You have reached the maximum allowed uploads for this hour.',
});
