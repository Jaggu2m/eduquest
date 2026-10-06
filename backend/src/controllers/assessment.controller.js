export class AssessmentController {
  constructor(assessmentService) {
    this.assessmentService = assessmentService;
  }

  /**
   * Generate an assessment via AI from a document or content.
   * POST /organizations/:orgId/classes/:classId/assessments/generate
   */
  generateAssessment = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const userId = req.user.userId || req.user.id;

      const assessment = await this.assessmentService.generateAssessment({
        organizationId: orgId,
        classId,
        userId,
        params: req.body,
      });

      return res.status(201).json({
        message: 'Assessment generated successfully and saved as DRAFT.',
        assessment,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Manually create an assessment.
   * POST /organizations/:orgId/classes/:classId/assessments
   */
  createAssessment = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const userId = req.user.userId || req.user.id;

      const assessment = await this.assessmentService.createManualAssessment({
        organizationId: orgId,
        classId,
        userId,
        data: req.body,
      });

      return res.status(201).json({
        message: 'Assessment created successfully.',
        assessment,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * List assessments in a class.
   * GET /organizations/:orgId/classes/:classId/assessments
   */
  getAssessments = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const { page, limit, status, type } = req.query;

      const result = await this.assessmentService.getAssessmentsByClass({
        organizationId: orgId,
        classId,
        page,
        limit,
        status,
        type,
      });

      return res.json(result);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get an assessment by ID.
   * GET /organizations/:orgId/classes/:classId/assessments/:assessmentId
   */
  getAssessmentById = async (req, res) => {
    try {
      const { orgId, assessmentId } = req.params;

      const assessment = await this.assessmentService.getAssessmentById({
        id: assessmentId,
        organizationId: orgId,
      });

      return res.json(assessment);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Update assessment metadata or approval status.
   * PATCH /organizations/:orgId/classes/:classId/assessments/:assessmentId
   */
  updateAssessment = async (req, res) => {
    try {
      const { orgId, assessmentId } = req.params;

      const updated = await this.assessmentService.updateAssessment({
        id: assessmentId,
        organizationId: orgId,
        data: req.body,
      });

      return res.json({
        message: 'Assessment updated successfully.',
        assessment: updated,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Update a question or its options.
   * PUT /organizations/:orgId/classes/:classId/assessments/:assessmentId/questions/:questionId
   */
  updateQuestion = async (req, res) => {
    try {
      const { orgId, assessmentId, questionId } = req.params;

      const updated = await this.assessmentService.updateQuestion({
        assessmentId,
        questionId,
        organizationId: orgId,
        data: req.body,
      });

      return res.json({
        message: 'Question updated successfully.',
        question: updated,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Soft-delete an assessment.
   * DELETE /organizations/:orgId/classes/:classId/assessments/:assessmentId
   */
  deleteAssessment = async (req, res) => {
    try {
      const { orgId, assessmentId } = req.params;

      await this.assessmentService.deleteAssessment({
        id: assessmentId,
        organizationId: orgId,
      });

      return res.json({ message: 'Assessment deleted successfully.' });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };
}
