/**
 * Security middleware: CSRF Origin verification, Input sanitization, and Parameter pollution protection.
 */

// Helper to extract allowed origins from environment
export const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
};

/**
 * CSRF / Origin Verification Middleware
 *
 * For state-changing HTTP methods (POST, PUT, PATCH, DELETE), verifies that the
 * Origin or Referer header matches the allowed application origins.
 * This prevents Cross-Site Request Forgery (CSRF) and cross-site form/script submissions.
 */
export const csrfProtection = (req, res, next) => {
  // Safe/idempotent methods are read-only and do not require CSRF checks
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Auth endpoints (login, register) and public invitation acceptance produce tokens
  // or accept invite tokens rather than consuming ambient credentials, so they are
  // inherently immune to CSRF attacks.
  const path = req.path || '';
  const origUrl = req.originalUrl || '';
  if (
    path.startsWith('/auth/') ||
    path.startsWith('/api/auth/') ||
    origUrl.includes('/auth/') ||
    origUrl.includes('/invitations/accept')
  ) {
    return next();
  }

  // Any request with an Authorization header (Bearer token) was dispatched via explicit
  // JavaScript code (browsers never attach Bearer tokens automatically), making it
  // inherently immune to browser ambient-credential CSRF attacks.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  const originHeader = req.headers['origin'];
  const refererHeader = req.headers['referer'];
  let requestOrigin = originHeader || null;

  // Derive origin from Referer header if Origin is absent (e.g. same-origin form posts)
  if (!requestOrigin && refererHeader) {
    try {
      // Extract just the scheme+host from a full Referer URL string
      const refUrl = new globalThis.URL(refererHeader);
      requestOrigin = refUrl.origin;
    } catch {
      // Malformed Referer — treat as no origin
      requestOrigin = null;
    }
  }

  // If no Origin or Referer header is present:
  // - Non-browser clients (e.g. mobile apps, automated scripts) might omit Origin.
  if (!requestOrigin) {
    // Allow non-browser clients in non-production, but enforce header presence in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        message: 'Forbidden: Missing Origin or Referer header for state-changing request.',
      });
    }
    return next();
  }

  const allowedOrigins = getAllowedOrigins();

  // Check if the request origin matches allowed origins
  const isAllowed = allowedOrigins.some((allowed) => {
    // Exact match or wildcard subdomain in production if specified
    if (allowed === requestOrigin) return true;
    if (allowed === '*') return true;
    return false;
  });

  if (!isAllowed) {
    return res.status(403).json({
      message: 'Forbidden: Cross-Origin Request Blocked by CSRF Protection policy.',
    });
  }

  next();
};

/**
 * Sanitizes an individual string value:
 * - Strips null bytes (\0) to prevent poison null byte attacks
 * - Trims leading/trailing whitespace
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value.replace(/\0/g, '').trim();
  }
  return value;
}

/**
 * Recursively cleans an object/array:
 * - Blocks prototype pollution keys (__proto__, constructor, prototype)
 * - Sanitizes string values
 */
function sanitizeObject(target) {
  if (!target || typeof target !== 'object') {
    return sanitizeValue(target);
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, val] of Object.entries(target)) {
    // Prevent Prototype Pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    sanitized[key] = sanitizeObject(val);
  }
  return sanitized;
}

/**
 * Input sanitization middleware:
 * Cleans req.body, req.query, and req.params against injection and prototype pollution.
 *
 * NOTE: req.query and req.params are read-only getters in some router versions.
 * We must mutate their properties in-place (Object.assign) rather than reassigning
 * the reference, otherwise we get "Cannot set property query ... which has only a getter".
 */
export const sanitizeInput = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    // req.body is a plain parsed object — safe to reassign
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    // Mutate in-place: clear all keys, then copy sanitized values back
    const sanitized = sanitizeObject(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, sanitized);
  }
  if (req.params && typeof req.params === 'object') {
    // Mutate in-place: clear all keys, then copy sanitized values back
    const sanitized = sanitizeObject(req.params);
    for (const key of Object.keys(req.params)) delete req.params[key];
    Object.assign(req.params, sanitized);
  }
  next();
};

/**
 * Parameter Pollution Protection
 * For select query parameters that should never be arrays, ensures single value.
 *
 * NOTE: req.query is a read-only getter — mutate properties in-place.
 */
export const preventParameterPollution = (req, _res, next) => {
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (Array.isArray(req.query[key])) {
        // Take the last supplied value if multiple were passed
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    }
  }
  next();
};
