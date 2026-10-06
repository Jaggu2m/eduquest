import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller.js';
import { OrganizationService } from '../services/organization.service.js';
import { OrganizationRepository } from '../repositories/organization.repository.js';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateOrganizationSchema, UpdateOrganizationSchema } from '../schemas/index.js';
import membershipRoutes from './membership.routes.js';
import orgInvitationRoutes from './org-invitation.routes.js';
import classRoutes from './class.routes.js';
// ── Dependency Injection (Composition Root — wired once at startup) ────────────
const organizationRepository = new OrganizationRepository();
const organizationService = new OrganizationService(organizationRepository);
const organizationController = new OrganizationController(organizationService);
const router = Router();
// Mount nested routes
router.use('/:orgId/members', membershipRoutes);
router.use('/:orgId/invitations', orgInvitationRoutes);
router.use('/:orgId/classes', classRoutes);
// Public read routes
router.get('/', organizationController.getAllOrganizations);
router.get('/slug/:slug', organizationController.getOrganizationBySlug);
router.get('/:id', organizationController.getOrganizationById);
// Write routes — Protected by requireAuth + requirePlatformAdmin
router.post(
  '/',
  requireAuth,
  requirePlatformAdmin,
  validate(CreateOrganizationSchema),
  organizationController.createOrganization,
);
router.patch(
  '/:id',
  requireAuth,
  requirePlatformAdmin,
  validate(UpdateOrganizationSchema),
  organizationController.updateOrganization,
);
router.delete('/:id', requireAuth, requirePlatformAdmin, organizationController.deleteOrganization);
export default router;
//# sourceMappingURL=organization.routes.js.map
