import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Redis } from 'ioredis';

// Reuse a single Redis connection for rate limiting if possible,
// or create one if it's the first time. We assume process.env.REDIS_URL is set.
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Optional: Add specific Redis options here if needed in production
});

// Create a generic rate limiter function so we can customize limits per route
export const createRateLimiter = (options = {}) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: options.max || 100, // Default: Limit each IP to 100 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { singleCount: false },
    message: {
      message: options.message || 'Too many requests from this IP, please try again later.',
    },
  });
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
