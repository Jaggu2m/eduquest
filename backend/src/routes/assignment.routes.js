import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller.js';
import { AssignmentService } from '../services/assignment.service.js';
import { AssignmentRepository } from '../repositories/assignment.repository.js';
import { AssessmentRepository } from '../repositories/assessment.repository.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateAssignmentSchema, SubmitAttemptSchema } from '../schemas/index.js';

// Composition Root
const assignmentRepository = new AssignmentRepository();
const assessmentRepository = new AssessmentRepository();
const classRepository = new ClassRepository();
const assignmentService = new AssignmentService(
  assignmentRepository,
  assessmentRepository,
  classRepository,
);
const assignmentController = new AssignmentController(assignmentService);

// mergeParams: true allows access to :orgId and :classId from parent router
const router = Router({ mergeParams: true });

router.use(requireAuth);

// ── Assignment & Scheduling Routes ───────────────────────────────────────────

// POST /api/organizations/:orgId/classes/:classId/assignments (Schedule assessment)
router.post('/', validate(CreateAssignmentSchema), assignmentController.createAssignment);

// GET /api/organizations/:orgId/classes/:classId/assignments
router.get('/', assignmentController.getAssignments);

// GET /api/organizations/:orgId/classes/:classId/assignments/:assignmentId
router.get('/:assignmentId', assignmentController.getAssignmentById);

// ── Test Taking & Auto-Grading Routes ─────────────────────────────────────────

// POST /api/organizations/:orgId/classes/:classId/assignments/:assignmentId/attempts (Start attempt)
router.post('/:assignmentId/attempts', assignmentController.startAttempt);

// POST /api/organizations/:orgId/classes/:classId/assignments/:assignmentId/attempts/:attemptId/submit (Submit test)
router.post(
  '/:assignmentId/attempts/:attemptId/submit',
  validate(SubmitAttemptSchema),
  assignmentController.submitAttempt,
);

// GET /api/organizations/:orgId/classes/:classId/assignments/:assignmentId/attempts/:attemptId (View results)
router.get('/:assignmentId/attempts/:attemptId', assignmentController.getAttemptResult);

export default router;
