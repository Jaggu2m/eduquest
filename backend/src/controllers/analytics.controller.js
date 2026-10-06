export class AnalyticsController {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  /**
   * Get high-level class overview metrics.
   * GET /organizations/:orgId/classes/:classId/analytics/overview
   */
  getClassOverview = async (req, res) => {
    try {
      const { orgId, classId } = req.params;

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
   * Get topic mastery breakdown and at-risk topics.
   * GET /organizations/:orgId/classes/:classId/analytics/topics
   */
  getClassTopics = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
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
   * Get question-level difficulty index and response stats.
   * GET /organizations/:orgId/classes/:classId/analytics/questions
   */
  getClassQuestions = async (req, res) => {
    try {
      const { orgId, classId } = req.params;

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
      const isTeacher = req.user.role === 'TEACHER' || req.user.isPlatformAdmin;

      // Access guard: Students can only view their own analytics
      if (!isTeacher && requestingUserId !== studentId) {
        return res
          .status(403)
          .json({ message: 'Forbidden: You cannot view another student’s analytics.' });
      }

      const analytics = await this.analyticsService.getStudentAnalytics({
        organizationId: orgId,
        classId,
        userId: studentId,
      });

      return res.json(analytics);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get AI-generated teaching insights for the class.
   * GET /organizations/:orgId/classes/:classId/analytics/insights
   */
  getClassInsights = async (req, res) => {
    try {
      const { orgId, classId } = req.params;

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
