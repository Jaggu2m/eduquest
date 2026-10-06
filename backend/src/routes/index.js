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

// API Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
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
