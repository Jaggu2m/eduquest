import { prisma } from '../lib/prismaClient.js';

export class AssignmentRepository {
  /**
   * Create an assignment linking an assessment to a class.
   *
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createAssignment(data) {
    return prisma.assessmentAssignment.create({
      data,
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            totalMarks: true,
            timeLimitMins: true,
          },
        },
      },
    });
  }

  /**
   * Find an assignment by ID, ensuring it belongs to the target class and organization.
   *
   * @param {string} id
   * @param {string} organizationId
   * @returns {Promise<object|null>}
   */
  async findAssignmentById(id, organizationId) {
    return prisma.assessmentAssignment.findFirst({
      where: {
        id,
        class: {
          organizationId,
          isActive: true,
        },
      },
      include: {
        assessment: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                topic: true,
                options: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            code: true,
            organizationId: true,
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });
  }

  /**
   * List assignments in a class scoped to an organization.
   *
   * @param {string} classId
   * @param {string} organizationId
   * @returns {Promise<Array<object>>}
   */
  async findAssignmentsByClass(classId, organizationId) {
    return prisma.assessmentAssignment.findMany({
      where: {
        classId,
        class: {
          organizationId,
          isActive: true,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            totalMarks: true,
            timeLimitMins: true,
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });
  }

  /**
   * Count how many attempts a user has made for an assignment.
   *
   * @param {string} assignmentId
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countUserAttempts(assignmentId, userId) {
    return prisma.assessmentAttempt.count({
      where: {
        assignmentId,
        userId,
      },
    });
  }

  /**
   * Check if user currently has an active IN_PROGRESS attempt.
   *
   * @param {string} assignmentId
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async findActiveAttempt(assignmentId, userId) {
    return prisma.assessmentAttempt.findFirst({
      where: {
        assignmentId,
        userId,
        status: 'IN_PROGRESS',
      },
    });
  }

  /**
   * Create a new attempt record.
   *
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createAttempt(data) {
    return prisma.assessmentAttempt.create({
      data,
    });
  }

  /**
   * Find an attempt by ID, verifying tenancy and ownership/class membership.
   *
   * @param {string} attemptId
   * @returns {Promise<object|null>}
   */
  async findAttemptById(attemptId) {
    return prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: {
          include: {
            assessment: {
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  include: {
                    options: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
            },
            class: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Atomically save student responses and update attempt grading.
   *
   * @param {string} attemptId
   * @param {object} gradingResult
   * @returns {Promise<object>}
   */
  async saveAttemptSubmission(
    attemptId,
    { responses, scoreAchieved, scorePercent, timeSpentSecs, status = 'EVALUATED' },
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Create QuestionResponse entries
      if (responses.length > 0) {
        await tx.questionResponse.createMany({
          data: responses.map((r) => ({
            attemptId,
            questionId: r.questionId,
            selectedOptionId: r.selectedOptionId || null,
            textResponse: r.textResponse || null,
            isCorrect: r.isCorrect,
            marksAwarded: r.marksAwarded,
            timeSpentSecs: r.timeSpentSecs || null,
          })),
        });
      }

      // 2. Update the AssessmentAttempt record
      return tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status,
          submittedAt: new Date(),
          scoreAchieved,
          scorePercent,
          timeSpentSecs,
        },
        include: {
          responses: {
            include: {
              question: {
                select: {
                  id: true,
                  prompt: true,
                  marks: true,
                  explanation: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * List attempts made by a specific user for an assignment.
   *
   * @param {string} assignmentId
   * @param {string} userId
   * @returns {Promise<Array<object>>}
   */
  async findUserAttempts(assignmentId, userId) {
    return prisma.assessmentAttempt.findMany({
      where: {
        assignmentId,
        userId,
      },
      orderBy: { attemptNumber: 'asc' },
      include: {
        responses: true,
      },
    });
  }

  /**
   * List all attempts for an assignment (Teacher view).
   *
   * @param {string} assignmentId
   * @returns {Promise<Array<object>>}
   */
  async findAllAttemptsForAssignment(assignmentId) {
    return prisma.assessmentAttempt.findMany({
      where: { assignmentId },
      orderBy: { startedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: true,
      },
    });
  }

  /**
   * Update assignment settings.
   *
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateAssignment(id, data) {
    return prisma.assessmentAssignment.update({
      where: { id },
      data,
    });
  }
}
