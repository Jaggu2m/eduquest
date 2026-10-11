import { prisma } from '../lib/prismaClient.js';

export class AnalyticsController {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  /**
   * Helper to determine whether the requesting user is a teacher or admin in this organization.
   */
  _isTeacherUser = async (req, orgId) => {
    if (req.user?.isPlatformAdmin || req.user?.role === 'TEACHER') return true;
    const userId = req.user?.userId || req.user?.id;
    if (!userId || !orgId) return false;
    try {
      const membership = await prisma.membership.findFirst({
        where: { userId, organizationId: orgId, isActive: true },
        select: { role: true },
      });
      return (
        membership?.role === 'TEACHER' ||
        membership?.role === 'ADMIN' ||
        membership?.role === 'OWNER' ||
        membership?.role === 'PLATFORM_ADMIN'
      );
    } catch {
      return false;
    }
  };

  /**
   * Get high-level class overview metrics (Teachers only).
   * GET /organizations/:orgId/classes/:classId/analytics/overview
   */
  getClassOverview = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const isTeacher = await this._isTeacherUser(req, orgId);
      if (!isTeacher) {
        return res.status(403).json({
          message: 'Forbidden: Class-wide overview metrics are only accessible by teachers.',
        });
      }

      const overview = await this.analyticsService.getClassOverview({
        organizationId: orgId,
        classId,
      });

      return res.json(overview);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get topic mastery breakdown and at-risk topics (Teachers only).
   * GET /organizations/:orgId/classes/:classId/analytics/topics
   */
  getClassTopics = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const isTeacher = await this._isTeacherUser(req, orgId);
      if (!isTeacher) {
        return res.status(403).json({
          message: 'Forbidden: Class-wide topic mastery analytics are only accessible by teachers.',
        });
      }

      const { threshold } = req.query;
      const topics = await this.analyticsService.getClassTopicMastery({
        organizationId: orgId,
        classId,
        weakThreshold: threshold ? Number(threshold) : 60,
      });

      return res.json(topics);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get question-level difficulty index and response stats (Teachers only).
   * GET /organizations/:orgId/classes/:classId/analytics/questions
   */
  getClassQuestions = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const isTeacher = await this._isTeacherUser(req, orgId);
      if (!isTeacher) {
        return res.status(403).json({
          message: 'Forbidden: Question difficulty analytics are only accessible by teachers.',
        });
      }

      const questions = await this.analyticsService.getClassQuestionDifficulty({
        organizationId: orgId,
        classId,
      });

      return res.json(questions);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get student personal mastery and progress.
   * GET /organizations/:orgId/classes/:classId/analytics/students/:studentId
   */
  getStudentAnalytics = async (req, res) => {
    try {
      const { orgId, classId, studentId } = req.params;
      const requestingUserId = req.user.userId || req.user.id;
      const targetUserId = studentId === 'me' ? requestingUserId : studentId;
      const isTeacher = await this._isTeacherUser(req, orgId);

      // Access guard: Students can only view their own analytics
      if (!isTeacher && requestingUserId !== targetUserId) {
        return res
          .status(403)
          .json({ message: 'Forbidden: You cannot view another student’s analytics.' });
      }

      const analytics = await this.analyticsService.getStudentAnalytics({
        organizationId: orgId,
        classId,
        userId: targetUserId,
      });

      return res.json(analytics);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get AI-generated teaching insights for the class (Teachers only).
   * GET /organizations/:orgId/classes/:classId/analytics/insights
   */
  getClassInsights = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const isTeacher = await this._isTeacherUser(req, orgId);
      if (!isTeacher) {
        return res.status(403).json({
          message: 'Forbidden: Class teaching insights are only accessible by teachers.',
        });
      }

      const insightsData = await this.analyticsService.getTeachingInsights({
        organizationId: orgId,
        classId,
      });

      return res.json(insightsData);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };
}
