import rateLimit from 'express-rate-limit';

/**
 * Creates a rate limiter using the default in-memory store.
 *
 * WHY NO RedisStore:
 * rate-limit-redis uses Lua scripts (EVAL) internally. Upstash Redis (and some other
 * hosted Redis providers) return results in a format that rate-limit-redis's
 * parseScriptResponse rejects with "Expected result to be array of values", crashing
 * every single request. On a single-process free-tier deployment the MemoryStore is
 * the correct choice — zero dependencies, zero failure modes, same rate-limiting behavior.
 */
export const createRateLimiter = (options = {}) => {
  const isProd = process.env.NODE_ENV === 'production';

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: options.max || 100,
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
  max: isProd ? 200 : 5000,
});

export const authLimiter = createRateLimiter({
  windowMs: isProd ? 60 * 60 * 1000 : 60 * 1000, // 1 hour in prod, 1 min in dev
  max: isProd ? 10 : 1000,
  message: 'Too many authentication attempts, please try again later.',
});

// Rate limiter for expensive AI endpoints (Quiz generation, AI Tutor, Flashcard generation)
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  max: isProd ? 15 : 200,
  message: 'AI request limit reached. Please wait a moment before sending more AI requests.',
});

// Rate limiter for document uploads to prevent storage abuse
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: isProd ? 30 : 500,
  message: 'Upload limit exceeded. You have reached the maximum allowed uploads for this hour.',
});
