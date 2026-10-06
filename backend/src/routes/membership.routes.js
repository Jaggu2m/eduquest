import { Router } from 'express';
import { MembershipController } from '../controllers/membership.controller.js';
import { MembershipService } from '../services/membership.service.js';
import { MembershipRepository } from '../repositories/membership.repository.js';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AddMemberSchema, UpdateMemberSchema } from '../schemas/index.js';
// ── Dependency Injection ───────────────────────────────────────────────────────
const membershipRepository = new MembershipRepository();
const membershipService = new MembershipService(membershipRepository);
const membershipController = new MembershipController(membershipService);
// mergeParams: true allows us to access :orgId from the parent router
const router = Router({ mergeParams: true });
// Require authentication for all membership routes
router.use(requireAuth);
// GET /organizations/:orgId/members
// For now, anyone authenticated can see members (we can restrict this later to org members)
router.get('/', membershipController.getOrganizationMembers);
router.get('/:userId', membershipController.getMembership);
// Write routes - restrict to platform admins for now (will add org admin logic later)
router.post('/', requirePlatformAdmin, validate(AddMemberSchema), membershipController.addMember);
router.patch(
  '/:userId',
  requirePlatformAdmin,
  validate(UpdateMemberSchema),
  membershipController.updateMembership,
);
router.delete('/:userId', requirePlatformAdmin, membershipController.removeMember);
export default router;
//# sourceMappingURL=membership.routes.js.map
