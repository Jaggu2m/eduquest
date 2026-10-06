import { Router } from 'express';
import { ClassController } from '../controllers/class.controller.js';
import { ClassService } from '../services/class.service.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { MembershipRepository } from '../repositories/membership.repository.js';
import { OrganizationRepository } from '../repositories/organization.repository.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateClassSchema, UpdateClassSchema, EnrollStudentSchema } from '../schemas/index.js';
import documentRoutes from './document.routes.js';
import assessmentRoutes from './assessment.routes.js';
import assignmentRoutes from './assignment.routes.js';
import analyticsRoutes from './analytics.routes.js';
import conversationRoutes from './conversation.routes.js';
import flashcardRoutes from './flashcard.routes.js';

import channelRoutes from './channel.routes.js';

// ── Dependency Injection (Composition Root) ──────────────────────────────────
const classRepository = new ClassRepository();
const membershipRepository = new MembershipRepository();
const organizationRepository = new OrganizationRepository();
const classService = new ClassService(
  classRepository,
  membershipRepository,
  organizationRepository,
);
const classController = new ClassController(classService);

// mergeParams: true allows access to :orgId from the parent organization router
const router = Router({ mergeParams: true });

// Require authentication for all class operations
router.use(requireAuth);

// ── Sub-Routes ───────────────────────────────────────────────────────────────
router.use('/:classId/documents', documentRoutes);
router.use('/:classId/assessments', assessmentRoutes);
router.use('/:classId/assignments', assignmentRoutes);
router.use('/:classId/analytics', analyticsRoutes);
router.use('/:classId/conversations', conversationRoutes);
router.use('/:classId/flashcard-decks', flashcardRoutes);
router.use('/:classId/channels', channelRoutes);

// ── Class Routes ─────────────────────────────────────────────────────────────
router.get('/', classController.getClasses);
router.get('/:classId', classController.getClassById);
router.post('/', validate(CreateClassSchema), classController.createClass);
router.patch('/:classId', validate(UpdateClassSchema), classController.updateClass);
router.delete('/:classId', classController.deleteClass);

// ── Enrollment Routes ────────────────────────────────────────────────────────
router.get('/:classId/enrollments', classController.getEnrollments);
router.post('/:classId/enrollments', validate(EnrollStudentSchema), classController.enrollStudent);
router.delete('/:classId/enrollments/:userId', classController.removeStudent);

export default router;
