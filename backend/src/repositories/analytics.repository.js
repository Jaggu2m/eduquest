import { prisma } from '../lib/prismaClient.js';

export class AnalyticsRepository {
  /**
   * Fetch overview metrics for a class: enrolled students, assignments, and completed attempts.
   *
   * @param {string} classId
   * @param {string} organizationId
   * @returns {Promise<object>}
   */
  async getClassOverviewData(classId, organizationId) {
    const [enrolledStudentsCount, assignmentsCount, attempts] = await Promise.all([
      prisma.enrollment.count({
        where: { classId },
      }),
      prisma.assessmentAssignment.count({
        where: {
          classId,
          class: { organizationId },
        },
      }),
      prisma.assessmentAttempt.findMany({
        where: {
          assignment: {
            classId,
            class: { organizationId },
          },
          status: { in: ['SUBMITTED', 'EVALUATED', 'TIMED_OUT'] },
        },
        select: {
          id: true,
          userId: true,
          scoreAchieved: true,
          scorePercent: true,
          timeSpentSecs: true,
          submittedAt: true,
          assignmentId: true,
          assignment: {
            select: {
              assessment: {
                select: {
                  passingScore: true,
                  totalMarks: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      enrolledStudentsCount,
      assignmentsCount,
      attempts,
    };
  }

  /**
   * Fetch question responses grouped with topic details for a class.
   *
   * @param {string} classId
   * @param {string} organizationId
   * @returns {Promise<Array<object>>}
   */
  async getClassTopicResponses(classId, organizationId) {
    return prisma.questionResponse.findMany({
      where: {
        attempt: {
          assignment: {
            classId,
            class: { organizationId },
          },
          status: { in: ['SUBMITTED', 'EVALUATED', 'TIMED_OUT'] },
        },
        question: {
          topicId: { not: null },
        },
      },
      select: {
        id: true,
        isCorrect: true,
        marksAwarded: true,
        timeSpentSecs: true,
        question: {
          select: {
            id: true,
            topicId: true,
            marks: true,
            topic: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Fetch question-level statistics for all assessments assigned to a class.
   *
   * @param {string} classId
   * @param {string} organizationId
   * @returns {Promise<Array<object>>}
   */
  async getClassQuestionStats(classId, organizationId) {
    return prisma.question.findMany({
      where: {
        assessment: {
          assignments: {
            some: {
              classId,
              class: { organizationId },
            },
          },
        },
      },
      select: {
        id: true,
        prompt: true,
        questionType: true,
        marks: true,
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
        responses: {
          where: {
            attempt: {
              assignment: { classId },
              status: { in: ['SUBMITTED', 'EVALUATED', 'TIMED_OUT'] },
            },
          },
          select: {
            id: true,
            isCorrect: true,
            marksAwarded: true,
            timeSpentSecs: true,
          },
        },
      },
    });
  }

  /**
   * Fetch all assessment attempts and question responses for a single student in a class.
   *
   * @param {string} classId
   * @param {string} userId
   * @param {string} organizationId
   * @returns {Promise<Array<object>>}
   */
  async getStudentAttempts(classId, userId, organizationId) {
    return prisma.assessmentAttempt.findMany({
      where: {
        userId,
        assignment: {
          classId,
          class: { organizationId },
        },
        status: { in: ['SUBMITTED', 'EVALUATED', 'TIMED_OUT'] },
      },
      include: {
        assignment: {
          include: {
            assessment: {
              select: {
                id: true,
                title: true,
                totalMarks: true,
                passingScore: true,
              },
            },
          },
        },
        responses: {
          include: {
            question: {
              include: {
                topic: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }
}
