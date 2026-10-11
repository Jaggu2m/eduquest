import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { AIService } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { cacheRoute } from '../middleware/cache.middleware.js';

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
router.get('/overview', cacheRoute(300), analyticsController.getClassOverview); // Cache 5 mins

// GET /api/organizations/:orgId/classes/:classId/analytics/insights
router.get('/insights', cacheRoute(600), analyticsController.getClassInsights); // Cache 10 mins (AI calls are expensive)

// GET /api/organizations/:orgId/classes/:classId/analytics/topics
router.get('/topics', cacheRoute(300), analyticsController.getClassTopics); // Cache 5 mins

// GET /api/organizations/:orgId/classes/:classId/analytics/questions
router.get('/questions', cacheRoute(300), analyticsController.getClassQuestions); // Cache 5 mins

// GET /api/organizations/:orgId/classes/:classId/analytics/students/:studentId
router.get('/students/:studentId', cacheRoute(120), analyticsController.getStudentAnalytics); // Cache 2 mins

export default router;
