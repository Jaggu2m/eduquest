import {} from 'express';
import { prisma } from '../lib/prismaClient.js';

export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res, next) => {
    try {
      // req.body already validated by Zod (RegisterSchema) at route level
      const result = await this.authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      if (message.includes('already exists')) {
        res.status(409).json({ message });
        return;
      }
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      // req.body already validated by Zod (LoginSchema) at route level
      const result = await this.authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      if (message.includes('Invalid email or password')) {
        res.status(401).json({ message });
        return;
      }
      next(error);
    }
  };

  // Returns the currently authenticated user enriched with DB data
  me = async (req, res, _next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isPlatformAdmin: true,
        },
      });

      if (!dbUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // Derive current role from memberships (same logic as login)
      const role = await this.authService.deriveRole(userId, req.user?.role || 'STUDENT');

      return res.status(200).json({
        user: {
          ...dbUser,
          role,
        },
      });
    } catch (error) {
      _next(error);
    }
  };
}
