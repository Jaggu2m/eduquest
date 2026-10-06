import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { AIService } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

// Composition Root
const analyticsRepository = new AnalyticsRepository();
const classRepository = new ClassRepository();
const aiService = new AIService();
const analyticsService = new AnalyticsService(analyticsRepository, classRepository, aiService);
const analyticsController = new AnalyticsController(analyticsService);

// mergeParams: true allows access to :orgId and :classId from parent router
const router = Router({ mergeParams: true });

router.use(requireAuth);

// ── Analytics Endpoints ───────────────────────────────────────────────────────

// GET /api/organizations/:orgId/classes/:classId/analytics/overview
router.get('/overview', analyticsController.getClassOverview);

// GET /api/organizations/:orgId/classes/:classId/analytics/insights
router.get('/insights', analyticsController.getClassInsights);

// GET /api/organizations/:orgId/classes/:classId/analytics/topics
router.get('/topics', analyticsController.getClassTopics);

// GET /api/organizations/:orgId/classes/:classId/analytics/questions
router.get('/questions', analyticsController.getClassQuestions);

// GET /api/organizations/:orgId/classes/:classId/analytics/students/:studentId
router.get('/students/:studentId', analyticsController.getStudentAnalytics);

export default router;
