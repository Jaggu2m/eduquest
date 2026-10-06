export class AssignmentService {
  constructor(assignmentRepository, assessmentRepository, classRepository) {
    this.assignmentRepository = assignmentRepository;
    this.assessmentRepository = assessmentRepository;
    this.classRepository = classRepository;
  }

  /**
   * Schedule/assign an assessment to a class.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @param {string} params.userId
   * @param {object} params.data
   * @returns {Promise<object>}
   */
  async createAssignment({ organizationId, classId, data }) {
    // 1. Verify class exists and belongs to the organization
    const targetClass = await this.classRepository.findById(classId, organizationId);
    if (!targetClass) {
      const error = new Error('Class not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Verify assessment exists and belongs to the organization
    const assessment = await this.assessmentRepository.findById(data.assessmentId, organizationId);
    if (!assessment) {
      const error = new Error('Assessment not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    // Ensure assessment is published before scheduling
    if (assessment.status !== 'PUBLISHED') {
      const error = new Error(
        `Cannot assign assessment in '${assessment.status}' status. Please publish it first.`,
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Date sanity check
    if (data.startDate && data.dueDate) {
      const start = new Date(data.startDate);
      const due = new Date(data.dueDate);
      if (due <= start) {
        const error = new Error('Due date must be after the start date.');
        error.statusCode = 400;
        throw error;
      }
    }

    return this.assignmentRepository.createAssignment({
      assessmentId: data.assessmentId,
      classId,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      maxAttempts: data.maxAttempts || 1,
      revealScores: data.revealScores !== undefined ? data.revealScores : true,
      revealAnswers: data.revealAnswers !== undefined ? data.revealAnswers : false,
    });
  }

  /**
   * List assignments for a class.
   *
   * @param {object} params
   * @returns {Promise<Array<object>>}
   */
  async getAssignmentsByClass({ organizationId, classId }) {
    const targetClass = await this.classRepository.findById(classId, organizationId);
    if (!targetClass) {
      const error = new Error('Class not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    return this.assignmentRepository.findAssignmentsByClass(classId, organizationId);
  }

  /**
   * Get an assignment by ID.
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async getAssignmentById({ assignmentId, organizationId }) {
    const assignment = await this.assignmentRepository.findAssignmentById(
      assignmentId,
      organizationId,
    );
    if (!assignment) {
      const error = new Error('Assignment not found in this organization.');
      error.statusCode = 404;
      throw error;
    }
    return assignment;
  }

  /**
   * Start a student assessment attempt.
   *
   * @param {object} params
   * @param {string} params.assignmentId
   * @param {string} params.organizationId
   * @param {string} params.userId
   * @returns {Promise<object>}
   */
  async startAttempt({ assignmentId, organizationId, userId }) {
    const assignment = await this.assignmentRepository.findAssignmentById(
      assignmentId,
      organizationId,
    );
    if (!assignment) {
      const error = new Error('Assignment not found.');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();

    // 1. Validate schedule window
    if (assignment.startDate && now < new Date(assignment.startDate)) {
      const error = new Error('This assignment is not yet open for attempts.');
      error.statusCode = 403;
      throw error;
    }

    if (assignment.dueDate && now > new Date(assignment.dueDate)) {
      const error = new Error('The deadline for this assignment has passed.');
      error.statusCode = 403;
      throw error;
    }

    // 2. Check for existing active attempt (resume if available)
    const existingActive = await this.assignmentRepository.findActiveAttempt(assignmentId, userId);
    if (existingActive) {
      return this._formatAttemptForStudent(existingActive, assignment);
    }

    // 3. Validate attempt limits
    const previousAttemptsCount = await this.assignmentRepository.countUserAttempts(
      assignmentId,
      userId,
    );
    if (previousAttemptsCount >= assignment.maxAttempts) {
      const error = new Error(
        `Maximum attempt limit (${assignment.maxAttempts}) reached for this assignment.`,
      );
      error.statusCode = 403;
      throw error;
    }

    // 4. Create new attempt record
    const attempt = await this.assignmentRepository.createAttempt({
      assignmentId,
      userId,
      attemptNumber: previousAttemptsCount + 1,
      status: 'IN_PROGRESS',
      startedAt: now,
    });

    return this._formatAttemptForStudent(attempt, assignment);
  }

  /**
   * Submit an attempt, evaluate answers, calculate scores, and persist results.
   *
   * @param {object} params
   * @param {string} params.attemptId
   * @param {string} params.userId
   * @param {Array<object>} params.responses
   * @returns {Promise<object>}
   */
  async submitAttempt({ attemptId, userId, responses }) {
    const attempt = await this.assignmentRepository.findAttemptById(attemptId);
    if (!attempt) {
      const error = new Error('Attempt not found.');
      error.statusCode = 404;
      throw error;
    }

    if (attempt.userId !== userId) {
      const error = new Error('Forbidden: You can only submit your own assessment attempt.');
      error.statusCode = 403;
      throw error;
    }

    if (attempt.status !== 'IN_PROGRESS') {
      const error = new Error(
        `Attempt cannot be submitted because it is already '${attempt.status}'.`,
      );
      error.statusCode = 400;
      throw error;
    }

    const { assignment } = attempt;
    const { assessment } = assignment;
    const now = new Date();
    const timeSpentSecs = Math.max(
      1,
      Math.round((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000),
    );

    // Optional time limit enforcement (with 60-second grace period)
    let status = 'EVALUATED';
    if (assessment.timeLimitMins) {
      const allowedSecs = assessment.timeLimitMins * 60 + 60;
      if (timeSpentSecs > allowedSecs) {
        status = 'TIMED_OUT';
      }
    }

    // Auto-grading: Map questions and evaluate responses
    const questionMap = new Map();
    for (const q of assessment.questions) {
      questionMap.set(q.id, q);
    }

    const evaluatedResponses = [];
    let scoreAchieved = 0;

    for (const userResp of responses) {
      const question = questionMap.get(userResp.questionId);
      if (!question) continue;

      let isCorrect = false;
      let marksAwarded = 0;

      if (question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'TRUE_FALSE') {
        const matchingOption = question.options.find((opt) => opt.id === userResp.selectedOptionId);
        if (matchingOption && matchingOption.isCorrect) {
          isCorrect = true;
          marksAwarded = question.marks;
        } else {
          isCorrect = false;
          marksAwarded = 0;
        }
      } else if (question.questionType === 'SHORT_ANSWER') {
        // Short answers pending manual/AI grading
        isCorrect = null;
        marksAwarded = 0;
      }

      scoreAchieved += marksAwarded;

      evaluatedResponses.push({
        questionId: question.id,
        selectedOptionId: userResp.selectedOptionId || null,
        textResponse: userResp.textResponse || null,
        isCorrect,
        marksAwarded,
        timeSpentSecs: userResp.timeSpentSecs || null,
      });
    }

    const totalMarks = assessment.totalMarks || 1;
    const scorePercent = Number(((scoreAchieved / totalMarks) * 100).toFixed(2));

    const gradedAttempt = await this.assignmentRepository.saveAttemptSubmission(attemptId, {
      responses: evaluatedResponses,
      scoreAchieved,
      scorePercent,
      timeSpentSecs,
      status,
    });

    // Mask results based on teacher's reveal settings
    return this._formatAttemptResults(gradedAttempt, assignment, false);
  }

  /**
   * Get attempt results (handles student vs teacher views).
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async getAttemptResult({ attemptId, userId, isTeacher = false }) {
    const attempt = await this.assignmentRepository.findAttemptById(attemptId);
    if (!attempt) {
      const error = new Error('Attempt not found.');
      error.statusCode = 404;
      throw error;
    }

    if (!isTeacher && attempt.userId !== userId) {
      const error = new Error('Forbidden: You cannot view another student’s attempt.');
      error.statusCode = 403;
      throw error;
    }

    return this._formatAttemptResults(attempt, attempt.assignment, isTeacher);
  }

  /**
   * Strips correct answers, flags, and explanations before sending test to student.
   *
   * @private
   */
  _formatAttemptForStudent(attempt, assignment) {
    const sanitizedQuestions = assignment.assessment.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      questionType: q.questionType,
      marks: q.marks,
      order: q.order,
      topic: q.topic?.name || null,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        order: opt.order,
        // isCorrect intentionally omitted for test security
      })),
    }));

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      timeLimitMins: assignment.assessment.timeLimitMins,
      totalMarks: assignment.assessment.totalMarks,
      assessmentTitle: assignment.assessment.title,
      questions: sanitizedQuestions,
    };
  }

  /**
   * Formats attempt results respecting revealScores and revealAnswers.
   *
   * @private
   */
  _formatAttemptResults(attempt, assignment, isTeacher) {
    const shouldRevealScores = isTeacher || assignment.revealScores;
    const shouldRevealAnswers = isTeacher || assignment.revealAnswers;

    const formattedResponses = (attempt.responses || []).map((r) => {
      const resp = {
        questionId: r.questionId,
        prompt: r.question?.prompt,
        selectedOptionId: r.selectedOptionId,
        textResponse: r.textResponse,
      };

      if (shouldRevealScores) {
        resp.marksAwarded = r.marksAwarded;
      }

      if (shouldRevealAnswers) {
        resp.isCorrect = r.isCorrect;
        resp.explanation = r.question?.explanation;
      }

      return resp;
    });

    return {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeSpentSecs: attempt.timeSpentSecs,
      scoreAchieved: shouldRevealScores ? attempt.scoreAchieved : null,
      scorePercent: shouldRevealScores ? attempt.scorePercent : null,
      scoresRevealed: shouldRevealScores,
      answersRevealed: shouldRevealAnswers,
      responses: formattedResponses,
    };
  }
}
