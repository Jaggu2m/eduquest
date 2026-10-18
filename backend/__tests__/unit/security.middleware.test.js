/**
 * Unit tests: security.middleware.js
 * Tests CSRF protection, input sanitization, and parameter pollution prevention.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  csrfProtection,
  sanitizeInput,
  preventParameterPollution,
  getAllowedOrigins,
} from '../../src/middleware/security.middleware.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockReq(overrides = {}) {
  return {
    method: 'POST',
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

function makeMockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

// ── getAllowedOrigins ─────────────────────────────────────────────────────────

describe('getAllowedOrigins()', () => {
  const originalEnv = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    process.env.ALLOWED_ORIGINS = originalEnv;
  });

  it('returns default localhost origins when env var is not set', () => {
    delete process.env.ALLOWED_ORIGINS;
    const origins = getAllowedOrigins();
    expect(origins).toContain('http://localhost:5173');
    expect(origins.length).toBeGreaterThanOrEqual(2);
  });

  it('parses comma-separated ALLOWED_ORIGINS env var', () => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com, https://admin.example.com';
    const origins = getAllowedOrigins();
    expect(origins).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });
});

// ── csrfProtection ───────────────────────────────────────────────────────────

describe('csrfProtection middleware', () => {
  let next;
  let savedOrigins;

  beforeEach(() => {
    next = jest.fn();
    // Ensure ALLOWED_ORIGINS is unset so defaults (localhost:5173, localhost:3000) apply
    savedOrigins = process.env.ALLOWED_ORIGINS;
    delete process.env.ALLOWED_ORIGINS;
  });

  afterEach(() => {
    if (savedOrigins !== undefined) {
      process.env.ALLOWED_ORIGINS = savedOrigins;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  });

  it('passes through GET requests without any Origin header', () => {
    const req = makeMockReq({ method: 'GET' });
    const res = makeMockRes();
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes through OPTIONS (preflight) requests', () => {
    const req = makeMockReq({ method: 'OPTIONS' });
    const res = makeMockRes();
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes POST with a matching allowed Origin header', () => {
    const req = makeMockReq({
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
    });
    const res = makeMockRes();
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks POST from a disallowed cross-site Origin', () => {
    const req = makeMockReq({
      method: 'POST',
      headers: { origin: 'https://evil.attacker.com' },
    });
    const res = makeMockRes();
    csrfProtection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows POST with no Origin if a Bearer token is present (API client pattern)', () => {
    const req = makeMockReq({
      method: 'POST',
      headers: { authorization: 'Bearer some.jwt.token' },
    });
    const res = makeMockRes();
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes DELETE with a matching Origin header', () => {
    const req = makeMockReq({
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000' },
    });
    const res = makeMockRes();
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ── sanitizeInput ─────────────────────────────────────────────────────────────

describe('sanitizeInput middleware', () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  it('strips null bytes from string body fields', () => {
    const req = makeMockReq({ body: { name: 'Alice\0' } });
    const res = makeMockRes();
    sanitizeInput(req, res, next);
    expect(req.body.name).toBe('Alice');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('trims whitespace from string body fields', () => {
    const req = makeMockReq({ body: { email: '  user@example.com  ' } });
    const res = makeMockRes();
    sanitizeInput(req, res, next);
    expect(req.body.email).toBe('user@example.com');
  });

  it('blocks prototype pollution: __proto__ key is stripped from sanitized output', () => {
    // Object.entries() never yields __proto__ so sanitizeObject returns a clean object
    // without an own __proto__ property — verified by checking own keys only
    const req = makeMockReq({ body: { name: 'test' } });
    // Manually inject a poisoned key by defining it as an own enumerable property
    Object.defineProperty(req.body, '__proto__', {
      value: { isAdmin: true },
      enumerable: true,
      configurable: true,
    });
    const res = makeMockRes();
    sanitizeInput(req, res, next);
    // After sanitization, the output object should NOT have __proto__ as an own property
    expect(Object.prototype.hasOwnProperty.call(req.body, '__proto__')).toBe(false);
    expect(req.body.name).toBe('test');
  });

  it('blocks prototype pollution: constructor key is stripped from sanitized output', () => {
    // Object.entries() DOES yield 'constructor' as an own enumerable key if set
    // sanitizeObject should skip it, leaving the output without that own property
    const req = makeMockReq({ body: { name: 'test' } });
    Object.defineProperty(req.body, 'constructor', {
      value: 'evil',
      enumerable: true,
      configurable: true,
    });
    const res = makeMockRes();
    sanitizeInput(req, res, next);
    expect(Object.prototype.hasOwnProperty.call(req.body, 'constructor')).toBe(false);
    expect(req.body.name).toBe('test');
  });

  it('sanitizes nested objects recursively', () => {
    const req = makeMockReq({ body: { user: { name: '  Bob\0  ' } } });
    const res = makeMockRes();
    sanitizeInput(req, res, next);
    expect(req.body.user.name).toBe('Bob');
  });

  it('sanitizes query params', () => {
    const req = makeMockReq({ query: { search: '  foo\0  ' } });
    const res = makeMockRes();
    sanitizeInput(req, res, next);
    expect(req.query.search).toBe('foo');
  });

  it('passes through numbers and booleans untouched', () => {
    const req = makeMockReq({ body: { count: 42, active: true } });
    const res = makeMockRes();
    sanitizeInput(req, res, next);
    expect(req.body.count).toBe(42);
    expect(req.body.active).toBe(true);
  });
});

// ── preventParameterPollution ─────────────────────────────────────────────────

describe('preventParameterPollution middleware', () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  it('collapses duplicate query params to the last value', () => {
    const req = makeMockReq({ query: { sort: ['asc', 'desc', 'asc'] } });
    const res = makeMockRes();
    preventParameterPollution(req, res, next);
    // Last value wins
    expect(req.query.sort).toBe('asc');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves single-value query params untouched', () => {
    const req = makeMockReq({ query: { page: '2' } });
    const res = makeMockRes();
    preventParameterPollution(req, res, next);
    expect(req.query.page).toBe('2');
  });

  it('calls next() in all cases', () => {
    const req = makeMockReq({ query: {} });
    const res = makeMockRes();
    preventParameterPollution(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
