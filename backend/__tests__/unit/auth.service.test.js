/**
 * Unit tests: auth.service.js
 * Tests AuthService.register() and AuthService.login() with mocked repositories.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ── Mock bcrypt & jwt for ESM using unstable_mockModule ───────────────────────
const bcryptHashMock = jest.fn(async () => 'hashed_password_mock');
const bcryptCompareMock = jest.fn(async (plain) => plain === 'correct_password');

jest.unstable_mockModule('bcrypt', () => ({
  default: {
    hash: bcryptHashMock,
    compare: bcryptCompareMock,
  },
}));

const jwtSignMock = jest.fn(() => 'mock.jwt.token');
const jwtVerifyMock = jest.fn(() => ({ userId: 'user-1', email: 'test@example.com' }));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jwtSignMock,
    verify: jwtVerifyMock,
  },
}));

jest.unstable_mockModule('../../src/lib/prismaClient.js', () => ({
  prisma: {
    membership: {
      findMany: jest.fn(async () => []),
    },
  },
}));

// Imports must come AFTER unstable_mockModule declarations
const { AuthService } = await import('../../src/services/auth.service.js');

// ── Factories ─────────────────────────────────────────────────────────────────

function makeUserRepository(overrides = {}) {
  return {
    findByEmail: jest.fn(async () => null),
    create: jest.fn(async (data) => ({
      id: 'user-1',
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      isPlatformAdmin: false,
      ...data,
    })),
    ...overrides,
  };
}

// ── Tests: register() ─────────────────────────────────────────────────────────

describe('AuthService.register()', () => {
  let service;
  let userRepo;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret_key_for_jest';
    userRepo = makeUserRepository();
    service = new AuthService(userRepo);
  });

  it('creates a new user and returns a token + user object', async () => {
    const result = await service.register({
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      password: 'StrongPassword1!',
    });

    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('user');
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(userRepo.create).toHaveBeenCalledTimes(1);
  });

  it('throws if a user with the same email already exists', async () => {
    userRepo.findByEmail = jest.fn(async () => ({ id: 'existing', email: 'alice@example.com' }));

    await expect(
      service.register({
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        password: 'StrongPassword1!',
      }),
    ).rejects.toThrow('A user with this email already exists.');

    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it('hashes the password before storing', async () => {
    bcryptHashMock.mockClear();
    await service.register({
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Jones',
      password: 'MyPassword123',
    });

    expect(bcryptHashMock).toHaveBeenCalledWith('MyPassword123', 12);
  });
});

// ── Tests: login() ────────────────────────────────────────────────────────────

describe('AuthService.login()', () => {
  let service;
  let userRepo;

  const existingUser = {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    passwordHash: 'hashed_password_mock',
    isPlatformAdmin: false,
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret_key_for_jest';
    userRepo = makeUserRepository({
      findByEmail: jest.fn(async (email) => (email === 'alice@example.com' ? existingUser : null)),
    });
    service = new AuthService(userRepo);
  });

  it('returns a token and user when credentials are correct', async () => {
    // Use plain password that our mock considers 'correct'
    const result = await service.login({
      email: 'alice@example.com',
      password: 'correct_password',
    });

    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws with generic message when email is not found', async () => {
    await expect(
      service.login({ email: 'ghost@example.com', password: 'anything' }),
    ).rejects.toThrow('Invalid email or password.');
  });

  it('throws with generic message when password is wrong', async () => {
    await expect(
      service.login({ email: 'alice@example.com', password: 'wrong_password' }),
    ).rejects.toThrow('Invalid email or password.');
  });
});
