import pino from 'pino';
import pinoHttp from 'pino-http';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

/**
 * Sensitive fields to redact from logs to avoid leaking credentials/PII
 */
const redactOptions = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.token',
    'req.body.refreshToken',
    'password',
    'passwordHash',
    'token',
    'secret',
  ],
  censor: '[REDACTED]',
};

/**
 * Centralized application logger instance
 */
export const logger = pino({
  level: logLevel,
  redact: redactOptions,
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Express HTTP request logging middleware
 */
export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${err?.message || 'Error'}`;
  },
  // Skip logging high-frequency health-check / ping requests if desired
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
});
