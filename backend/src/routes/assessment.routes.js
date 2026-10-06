import { Router } from 'express';
import { AssessmentController } from '../controllers/assessment.controller.js';
import { AssessmentService } from '../services/assessment.service.js';
import { AssessmentRepository } from '../repositories/assessment.repository.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import { VectorRepository } from '../repositories/vector.repository.js';
import { EmbeddingService } from '../services/embedding.service.js';
import { AIService } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  GenerateQuizSchema,
  CreateAssessmentSchema,
  UpdateAssessmentSchema,
  UpdateQuestionSchema,
} from '../schemas/index.js';

// Composition Root
const assessmentRepository = new AssessmentRepository();
const classRepository = new ClassRepository();
const documentRepository = new DocumentRepository();
const vectorRepository = new VectorRepository();
const embeddingService = new EmbeddingService();
const aiService = new AIService();
const assessmentService = new AssessmentService(
  assessmentRepository,
  classRepository,
  documentRepository,
  aiService,
  vectorRepository,
  embeddingService,
);
const assessmentController = new AssessmentController(assessmentService);

// mergeParams: true allows access to :orgId and :classId from parent router
const router = Router({ mergeParams: true });

router.use(requireAuth);

// ── Assessment Routes ─────────────────────────────────────────────────────────

// POST /api/organizations/:orgId/classes/:classId/assessments/generate (AI Quiz)
router.post('/generate', validate(GenerateQuizSchema), assessmentController.generateAssessment);

// GET /api/organizations/:orgId/classes/:classId/assessments
router.get('/', assessmentController.getAssessments);

// POST /api/organizations/:orgId/classes/:classId/assessments (Manual creation)
router.post('/', validate(CreateAssessmentSchema), assessmentController.createAssessment);

// GET /api/organizations/:orgId/classes/:classId/assessments/:assessmentId
router.get('/:assessmentId', assessmentController.getAssessmentById);

// PATCH /api/organizations/:orgId/classes/:classId/assessments/:assessmentId (Approve/Publish/Edit)
router.patch(
  '/:assessmentId',
  validate(UpdateAssessmentSchema),
  assessmentController.updateAssessment,
);

// PUT /api/organizations/:orgId/classes/:classId/assessments/:assessmentId/questions/:questionId
router.put(
  '/:assessmentId/questions/:questionId',
  validate(UpdateQuestionSchema),
  assessmentController.updateQuestion,
);

// DELETE /api/organizations/:orgId/classes/:classId/assessments/:assessmentId
router.delete('/:assessmentId', assessmentController.deleteAssessment);

export default router;
