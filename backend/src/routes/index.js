import { Router } from 'express';
import organizationRoutes from './organization.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import { OrgInvitationController } from '../controllers/org-invitation.controller.js';
import { OrgInvitationService } from '../services/org-invitation.service.js';
import { OrgInvitationRepository } from '../repositories/org-invitation.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { validate } from '../middleware/validate.middleware.js';
import { AcceptInvitationSchema } from '../schemas/index.js';

// Standalone invitation controller (for the public accept endpoint)
const invitationController = new OrgInvitationController(
  new OrgInvitationService(new OrgInvitationRepository(), new UserRepository()),
);

const router = Router();

import { prisma } from '../lib/prismaClient.js';
import { createRedisClient } from '../lib/redis.js';

// API Health & Diagnostics Check
router.get('/health', async (_req, res) => {
  let dbStatus = 'connected';
  let redisStatus = 'connected';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = `disconnected (${err.message})`;
  }

  try {
    const redis = createRedisClient();
    await redis.ping();
    await redis.quit();
  } catch (err) {
    redisStatus = `disconnected (${err.message})`;
  }

  const isHealthy = dbStatus === 'connected';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
});

// Mount modular routes
router.use('/organizations', organizationRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// ── Public: Accept an invitation by token (no auth required) ──────────────────
// POST /api/invitations/accept   { token: "..." }
router.post(
  '/invitations/accept',
  validate(AcceptInvitationSchema),
  invitationController.acceptInvitation,
);

export default router;

//# sourceMappingURL=index.js.map
