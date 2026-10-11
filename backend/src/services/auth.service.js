import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prismaClient.js';

export class AuthService {
  SALT_ROUNDS = 12;

  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  signToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');
    return jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    });
  }

  /**
   * Derive the user's primary role from their memberships.
   * Priority: PLATFORM_ADMIN > TEACHER > STUDENT
   * Falls back to provided defaultRole or 'STUDENT'.
   */
  async deriveRole(userId, defaultRole = 'STUDENT') {
    try {
      const memberships = await prisma.membership.findMany({
        where: { userId, isActive: true },
        select: { role: true },
      });

      if (memberships.some((m) => m.role === 'PLATFORM_ADMIN')) return 'PLATFORM_ADMIN';
      if (memberships.some((m) => m.role === 'TEACHER')) return 'TEACHER';
      if (memberships.some((m) => m.role === 'STUDENT')) return 'STUDENT';
    } catch (_) {
      // Silently fall back if prisma lookup fails
    }
    return defaultRole;
  }

  // 'credentials' is already validated by Zod at the route level
  async register(credentials) {
    const existing = await this.userRepository.findByEmail(credentials.email);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(credentials.password, this.SALT_ROUNDS);
    // Role chosen at registration time — used as default until memberships are created
    const role = credentials.role || 'STUDENT';

    const user = await this.userRepository.create({
      email: credentials.email,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      passwordHash,
    });

    const token = this.signToken({
      userId: user.id,
      email: user.email,
      role,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }

  // 'credentials' is already validated by Zod at the route level
  async login(credentials) {
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password.');
    }

    // Derive the most elevated role from the user's actual memberships
    const role = await this.deriveRole(user.id, 'STUDENT');

    const token = this.signToken({
      userId: user.id,
      email: user.email,
      role,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }
}
