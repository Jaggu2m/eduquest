export class AssessmentService {
  constructor(
    assessmentRepository,
    classRepository,
    documentRepository,
    aiService,
    vectorRepository = null,
    embeddingService = null,
  ) {
    this.assessmentRepository = assessmentRepository;
    this.classRepository = classRepository;
    this.documentRepository = documentRepository;
    this.aiService = aiService;
    this.vectorRepository = vectorRepository;
    this.embeddingService = embeddingService;
  }

  /**
   * Automatically generate an assessment from an uploaded document using Groq LLM.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @param {string} params.userId
   * @param {object} params.params - Generator settings
   * @returns {Promise<object>}
   */
  async generateAssessment({ organizationId, classId, userId, params }) {
    // 1. Verify class belongs to organization
    const targetClass = await this.classRepository.findById(classId, organizationId);
    if (!targetClass) {
      const error = new Error('Class not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    let sourceContent;
    let defaultTitle;
    let documentId = params.documentId || null;

    // 2. Fetch document content if documentId provided
    if (params.documentId) {
      const doc = await this.documentRepository.findById(params.documentId, organizationId);
      if (!doc) {
        const error = new Error('Source document not found in this organization.');
        error.statusCode = 404;
        throw error;
      }

      if (doc.status !== 'READY' && !doc.rawText) {
        const error = new Error(
          `Document is currently in ${doc.status} status and cannot be used for quiz generation yet.`,
        );
        error.statusCode = 400;
        throw error;
      }

      const isLargeDoc = Boolean(doc.pageCount && doc.pageCount > 5);
      const targetTopic =
        params.topic ||
        (Array.isArray(params.topics) && params.topics.length > 0
          ? params.topics.join(', ')
          : null);
      const hasSpecificTopic = Boolean(targetTopic || params.customPrompt);

      // Strategy: If document is large (>5 pages) or a specific topic was requested, use Vector Retrieval
      if ((isLargeDoc || hasSpecificTopic) && this.vectorRepository && this.embeddingService) {
        // Backfill embeddings if any chunks don't have them yet
        try {
          const missingChunks = await this.vectorRepository.findChunksWithoutEmbedding({
            documentId: doc.id,
            limit: 50,
          });
          if (missingChunks.length > 0) {
            const texts = missingChunks.map((c) => c.content);
            const embeddings = await this.embeddingService.generateBatchEmbeddings(texts);
            for (let i = 0; i < missingChunks.length; i++) {
              if (embeddings[i]) {
                const vecStr = this.embeddingService.vectorToString(embeddings[i]);
                await this.vectorRepository.updateChunkEmbedding(missingChunks[i].id, vecStr);
              }
            }
          }
        } catch (embedBackfillErr) {
          console.warn(
            '[AssessmentService]: Backfill embeddings warning:',
            embedBackfillErr.message,
          );
        }

        const searchQuery =
          targetTopic ||
          params.customPrompt ||
          `${doc.title} core principles, foundational concepts, and key definitions`;

        const queryVec = await this.embeddingService.generateEmbedding(searchQuery);
        const queryVecStr = this.embeddingService.vectorToString(queryVec);

        const limitChunks = Math.min(Math.max((params.numQuestions || 5) + 2, 5), 10);
        const relevantChunks = await this.vectorRepository.searchSimilarChunks({
          queryVector: queryVecStr,
          classId,
          documentId: doc.id,
          limit: limitChunks,
        });

        if (relevantChunks && relevantChunks.length > 0) {
          sourceContent = relevantChunks
            .map(
              (c, idx) => `[Source Chunk ${idx + 1} - Page ${c.pageNumber || 'N/A'}]\n${c.content}`,
            )
            .join('\n\n---\n\n');
          console.log(
            `[AssessmentService]: Used vector retrieval (${relevantChunks.length} chunks, query: "${searchQuery}") for quiz generation.`,
          );
        } else {
          sourceContent = doc.rawText || '';
        }
      } else {
        // Strategy: Direct Full Text for short documents (<= 5 pages) without specific topic filter
        sourceContent = doc.rawText || '';
        if (!sourceContent) {
          const { chunks } = await this.documentRepository.getChunks(doc.id, {
            page: 1,
            limit: 100,
          });
          sourceContent = chunks.map((c) => c.content).join('\n\n');
        }
        console.log(
          `[AssessmentService]: Used direct full text (${doc.pageCount || 1} pages) for quiz generation.`,
        );
      }

      defaultTitle = targetTopic ? `Quiz: ${targetTopic}` : `Quiz: ${doc.title}`;
    } else if (params.content) {
      sourceContent = params.content;
      defaultTitle = params.title || 'Custom AI Assessment';
    } else {
      const error = new Error(
        'Either documentId or content text is required to generate an assessment.',
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Generate structured questions via Groq AI
    const generatedQuestions = await this.aiService.generateQuiz({
      content: sourceContent,
      numQuestions: params.numQuestions || 5,
      questionTypes: params.questionTypes || ['MULTIPLE_CHOICE'],
      difficulty: params.difficulty || 'MEDIUM',
      customPrompt: params.customPrompt || '',
    });

    // 4. Save assessment in DRAFT status for teacher review
    const assessment = await this.assessmentRepository.createAssessmentWithQuestions({
      assessmentData: {
        title: params.title || defaultTitle,
        description:
          params.description ||
          `AI generated quiz based on ${params.documentId ? 'course document' : 'provided text'}.`,
        type: 'AI_GENERATED',
        status: 'DRAFT',
        timeLimitMins: params.timeLimitMins || null,
        passingScore: params.passingScore || null,
        classId,
        createdById: userId,
        documentId,
      },
      questions: generatedQuestions,
      organizationId,
    });

    return assessment;
  }

  /**
   * Manually create an assessment without AI generation.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @param {string} params.userId
   * @param {object} params.data
   * @returns {Promise<object>}
   */
  async createManualAssessment({ organizationId, classId, userId, data }) {
    const targetClass = await this.classRepository.findById(classId, organizationId);
    if (!targetClass) {
      const error = new Error('Class not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    return this.assessmentRepository.createAssessmentWithQuestions({
      assessmentData: {
        title: data.title,
        description: data.description || null,
        type: 'TEACHER_CREATED',
        status: 'DRAFT',
        timeLimitMins: data.timeLimitMins || null,
        passingScore: data.passingScore || null,
        classId,
        createdById: userId,
        documentId: data.documentId || null,
      },
      questions: data.questions,
      organizationId,
    });
  }

  /**
   * List assessments for a class with pagination and filtering.
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async getAssessmentsByClass({ organizationId, classId, page = 1, limit = 20, status, type }) {
    const targetClass = await this.classRepository.findById(classId, organizationId);
    if (!targetClass) {
      const error = new Error('Class not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    const { assessments, total } = await this.assessmentRepository.findByClass(
      classId,
      organizationId,
      {
        page: Number(page),
        limit: Number(limit),
        status,
        type,
      },
    );

    return {
      assessments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get an assessment by ID with its full question hierarchy.
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async getAssessmentById({ id, organizationId }) {
    const assessment = await this.assessmentRepository.findById(id, organizationId);
    if (!assessment) {
      const error = new Error('Assessment not found in this organization.');
      error.statusCode = 404;
      throw error;
    }
    return assessment;
  }

  /**
   * Update assessment metadata or approval status (e.g. DRAFT -> PUBLISHED).
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async updateAssessment({ id, organizationId, data }) {
    const existing = await this.assessmentRepository.findById(id, organizationId);
    if (!existing) {
      const error = new Error('Assessment not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    return this.assessmentRepository.update(id, organizationId, data);
  }

  /**
   * Update an individual question or its options.
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async updateQuestion({ assessmentId, questionId, organizationId, data }) {
    const assessment = await this.assessmentRepository.findById(assessmentId, organizationId);
    if (!assessment) {
      const error = new Error('Assessment not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    return this.assessmentRepository.updateQuestion(questionId, assessmentId, data);
  }

  /**
   * Soft-delete an assessment.
   *
   * @param {object} params
   * @returns {Promise<object>}
   */
  async deleteAssessment({ id, organizationId }) {
    const assessment = await this.assessmentRepository.findById(id, organizationId);
    if (!assessment) {
      const error = new Error('Assessment not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    return this.assessmentRepository.softDelete(id, organizationId);
  }
}
