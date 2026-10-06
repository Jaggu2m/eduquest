export class AssignmentController {
  constructor(assignmentService) {
    this.assignmentService = assignmentService;
  }

  /**
   * Schedule an assessment for a class.
   * POST /organizations/:orgId/classes/:classId/assignments
   */
  createAssignment = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const assignment = await this.assignmentService.createAssignment({
        organizationId: orgId,
        classId,
        data: req.body,
      });

      return res.status(201).json({
        message: 'Assessment scheduled successfully.',
        assignment,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * List assignments in a class.
   * GET /organizations/:orgId/classes/:classId/assignments
   */
  getAssignments = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const assignments = await this.assignmentService.getAssignmentsByClass({
        organizationId: orgId,
        classId,
      });

      return res.json(assignments);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get assignment details.
   * GET /organizations/:orgId/classes/:classId/assignments/:assignmentId
   */
  getAssignmentById = async (req, res) => {
    try {
      const { orgId, assignmentId } = req.params;
      const assignment = await this.assignmentService.getAssignmentById({
        assignmentId,
        organizationId: orgId,
      });

      return res.json(assignment);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Start an attempt (student test taking).
   * POST /organizations/:orgId/classes/:classId/assignments/:assignmentId/attempts
   */
  startAttempt = async (req, res) => {
    try {
      const { orgId, assignmentId } = req.params;
      const userId = req.user.userId || req.user.id;

      const attemptSession = await this.assignmentService.startAttempt({
        assignmentId,
        organizationId: orgId,
        userId,
      });

      return res.status(201).json({
        message: 'Assessment attempt started.',
        attempt: attemptSession,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Submit an attempt for auto-grading.
   * POST /organizations/:orgId/classes/:classId/assignments/:assignmentId/attempts/:attemptId/submit
   */
  submitAttempt = async (req, res) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user.userId || req.user.id;

      const result = await this.assignmentService.submitAttempt({
        attemptId,
        userId,
        responses: req.body.responses,
      });

      return res.json({
        message: 'Assessment submitted and evaluated successfully.',
        result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * View attempt result & feedback.
   * GET /organizations/:orgId/classes/:classId/assignments/:assignmentId/attempts/:attemptId
   */
  getAttemptResult = async (req, res) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user.userId || req.user.id;
      const isTeacher = req.user.role === 'TEACHER' || req.user.isPlatformAdmin;

      const result = await this.assignmentService.getAttemptResult({
        attemptId,
        userId,
        isTeacher,
      });

      return res.json(result);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };
}
