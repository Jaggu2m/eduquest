import { prisma } from '../lib/prismaClient.js';

export class AssessmentRepository {
  /**
   * Find or create a Topic within an organization.
   *
   * @param {string} name
   * @param {string} organizationId
   * @param {object} [tx]
   * @returns {Promise<object>}
   */
  async findOrCreateTopic(name, organizationId, tx = prisma) {
    const trimmed = name.trim();
    return tx.topic.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: trimmed,
        },
      },
      update: {},
      create: {
        name: trimmed,
        organizationId,
      },
    });
  }

  /**
   * Persist a full assessment with questions and options in an atomic transaction.
   *
   * @param {object} params
   * @param {object} params.assessmentData
   * @param {Array<object>} params.questions
   * @param {string} params.organizationId
   * @returns {Promise<object>}
   */
  async createAssessmentWithQuestions({ assessmentData, questions, organizationId }) {
    return prisma.$transaction(async (tx) => {
      // 1. Resolve or create topics for all questions
      const topicMap = new Map();
      for (const q of questions) {
        if (q.topic && !topicMap.has(q.topic)) {
          const topicRecord = await this.findOrCreateTopic(q.topic, organizationId, tx);
          topicMap.set(q.topic, topicRecord.id);
        }
      }

      // 2. Calculate total marks
      const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1.0), 0);

      // 3. Create the Assessment record
      const assessment = await tx.assessment.create({
        data: {
          ...assessmentData,
          totalMarks,
          organizationId,
        },
      });

      // 4. Create Questions and Options
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const topicId = q.topic ? topicMap.get(q.topic) || null : null;

        const createdQuestion = await tx.question.create({
          data: {
            assessmentId: assessment.id,
            prompt: q.prompt,
            questionType: q.questionType,
            marks: Number(q.marks) || 1.0,
            explanation: q.explanation || null,
            order: q.order !== undefined ? q.order : i,
            topicId,
          },
        });

        if (Array.isArray(q.options) && q.options.length > 0) {
          await tx.questionOption.createMany({
            data: q.options.map((opt, optIdx) => ({
              questionId: createdQuestion.id,
              text: opt.text,
              isCorrect: Boolean(opt.isCorrect),
              order: opt.order !== undefined ? opt.order : optIdx,
            })),
          });
        }
      }

      // 5. Return complete assessment with all relations loaded
      return tx.assessment.findUnique({
        where: { id: assessment.id },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          sourceDocument: {
            select: {
              id: true,
              title: true,
              fileType: true,
            },
          },
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
      });
    });
  }

  /**
   * Find an assessment by ID scoped to organization.
   *
   * @param {string} id
   * @param {string} organizationId
   * @returns {Promise<object|null>}
   */
  async findById(id, organizationId) {
    return prisma.assessment.findFirst({
      where: {
        id,
        organizationId,
        isActive: true,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        sourceDocument: {
          select: {
            id: true,
            title: true,
            fileType: true,
          },
        },
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
    });
  }

  /**
   * List assessments for a class with pagination and status/type filters.
   *
   * @param {string} classId
   * @param {string} organizationId
   * @param {object} [options]
   * @returns {Promise<{ assessments: object[], total: number }>}
   */
  async findByClass(classId, organizationId, { page = 1, limit = 20, status, type } = {}) {
    const where = {
      classId,
      organizationId,
      isActive: true,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              questions: true,
              assignments: true,
            },
          },
        },
      }),
      prisma.assessment.count({ where }),
    ]);

    return { assessments, total };
  }

  /**
   * Update assessment metadata, status (e.g. approve/publish), or settings.
   *
   * @param {string} id
   * @param {string} organizationId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(id, organizationId, data) {
    return prisma.assessment.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  /**
   * Update a question and its options.
   *
   * @param {string} questionId
   * @param {string} assessmentId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateQuestion(questionId, assessmentId, data) {
    return prisma.$transaction(async (tx) => {
      const { options, prompt, marks, explanation, order } = data;

      if (options && Array.isArray(options)) {
        await tx.questionOption.deleteMany({
          where: { questionId },
        });

        await tx.questionOption.createMany({
          data: options.map((opt, idx) => ({
            questionId,
            text: opt.text,
            isCorrect: Boolean(opt.isCorrect),
            order: opt.order !== undefined ? opt.order : idx,
          })),
        });
      }

      const updated = await tx.question.update({
        where: { id: questionId, assessmentId },
        data: {
          ...(prompt !== undefined ? { prompt } : {}),
          ...(marks !== undefined ? { marks: Number(marks) } : {}),
          ...(explanation !== undefined ? { explanation } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
        },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
        },
      });

      // Recalculate total marks for the assessment
      const allQuestions = await tx.question.findMany({
        where: { assessmentId },
        select: { marks: true },
      });
      const newTotalMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

      await tx.assessment.update({
        where: { id: assessmentId },
        data: { totalMarks: newTotalMarks },
      });

      return updated;
    });
  }

  /**
   * Soft-delete an assessment.
   *
   * @param {string} id
   * @param {string} organizationId
   * @returns {Promise<object>}
   */
  async softDelete(id, organizationId) {
    return prisma.assessment.update({
      where: {
        id,
        organizationId,
      },
      data: {
        isActive: false,
      },
    });
  }
}
