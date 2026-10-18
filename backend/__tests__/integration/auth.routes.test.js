/**
 * Integration tests: /api/auth routes
 * Uses Supertest to make HTTP requests against an Express test app.
 * External dependencies (Prisma, bcrypt, jsonwebtoken, Redis rate limiter) are mocked.
 */

import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Ensure JWT_SECRET is available
process.env.JWT_SECRET = 'integration_test_secret_key';

// ── 1. Mock dependencies via unstable_mockModule for ESM ──────────────────────

const mockPrisma = {
  membership: {
    findMany: jest.fn(async () => []),
  },
  user: {
    findUnique: jest.fn(async () => null),
    create: jest.fn(async (args) => ({
      id: 'user-test-1',
      email: args.data.email,
      firstName: args.data.firstName,
      lastName: args.data.lastName,
      passwordHash: 'hashed_pw',
      isPlatformAdmin: false,
    })),
  },
};

jest.unstable_mockModule('../../src/lib/prismaClient.js', () => ({
  prisma: mockPrisma,
}));

const mockBcryptCompare = jest.fn(async (plain) => plain === 'ValidPass123!');
const mockBcryptHash = jest.fn(async () => 'hashed_pw');

jest.unstable_mockModule('bcrypt', () => ({
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
  hash: mockBcryptHash,
  compare: mockBcryptCompare,
}));

const mockJwtSign = jest.fn(() => 'signed.jwt.token');
const mockJwtVerify = jest.fn((token) => {
  if (token === 'bad.token') {
    throw new Error('invalid signature');
  }
  return { userId: 'user-1', email: 'alice@example.com', role: 'STUDENT' };
});

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: mockJwtSign,
    verify: mockJwtVerify,
  },
  sign: mockJwtSign,
  verify: mockJwtVerify,
}));

// Mock rate limiting middleware completely to bypass Redis
jest.unstable_mockModule('../../src/middleware/rate-limit.middleware.js', () => ({
  authLimiter: (_req, _res, next) => next(),
  apiLimiter: (_req, _res, next) => next(),
  aiLimiter: (_req, _res, next) => next(),
  uploadLimiter: (_req, _res, next) => next(),
  createRateLimiter: () => (_req, _res, next) => next(),
}));

// ── 2. Import routes after mocking ───────────────────────────────────────────

const { default: authRoutes } = await import('../../src/routes/auth.routes.js');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  // Error handling middleware
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ message: err.message || 'Internal Server Error' });
  });

  return app;
}

// ── 3. Test Suites ────────────────────────────────────────────────────────────

describe('Integration: /api/auth', () => {
  let app;

  beforeAll(() => {
    app = buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('returns 201 with token and user on valid registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app).post('/api/auth/register').send({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'ValidPass123!',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'incomplete@example.com',
        // missing firstName, lastName, password
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('returns 400 when email format is invalid', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        firstName: 'Test',
        lastName: 'User',
        password: 'ValidPass123!',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('returns 409 when email is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'taken@example.com',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'taken@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'ValidPass123!',
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 200 with token on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        passwordHash: 'hashed_pw',
        isPlatformAdmin: false,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com',
        password: 'ValidPass123!',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('alice@example.com');
    });

    it('returns 401 when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@example.com',
        password: 'AnyPassword1!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });

    it('returns 401 when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'alice@example.com',
        passwordHash: 'hashed_pw',
        isPlatformAdmin: false,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });

    it('returns 400 when email field is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'ValidPass123!',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 when a malformed token is provided', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer bad.token');
      expect(res.status).toBe(401);
    });

    it('returns 200 with user profile on valid Bearer token', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        avatarUrl: null,
        isPlatformAdmin: false,
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer signed.jwt.token');

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.user.role).toBe('STUDENT');
    });
  });
});
