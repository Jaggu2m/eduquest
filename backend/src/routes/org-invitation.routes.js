import { Router } from 'express';
import { OrgInvitationController } from '../controllers/org-invitation.controller.js';
import { OrgInvitationService } from '../services/org-invitation.service.js';
import { OrgInvitationRepository } from '../repositories/org-invitation.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateInvitationSchema } from '../schemas/index.js';

// ── Dependency Injection ──────────────────────────────────────────────────────
const orgInvitationRepository = new OrgInvitationRepository();
const userRepository = new UserRepository();
const orgInvitationService = new OrgInvitationService(orgInvitationRepository, userRepository);
const orgInvitationController = new OrgInvitationController(orgInvitationService);

// mergeParams: true lets us read :orgId from the parent organization router
const router = Router({ mergeParams: true });

// ── Org-scoped routes (nested under /organizations/:orgId/invitations) ─────────
// GET  /organizations/:orgId/invitations           — list all invitations
// POST /organizations/:orgId/invitations           — create invitation
// DELETE /organizations/:orgId/invitations/:id     — cancel invitation
router.get('/', requireAuth, requirePlatformAdmin, orgInvitationController.getInvitations);
router.post(
  '/',
  requireAuth,
  requirePlatformAdmin,
  validate(CreateInvitationSchema),
  orgInvitationController.createInvitation,
);
router.delete(
  '/:invitationId',
  requireAuth,
  requirePlatformAdmin,
  orgInvitationController.cancelInvitation,
);

export default router;
