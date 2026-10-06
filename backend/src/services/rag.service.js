export class RagService {
  constructor({
    conversationRepository,
    vectorRepository,
    embeddingService,
    aiService,
    classRepository,
    documentRepository,
  }) {
    this.conversationRepository = conversationRepository;
    this.vectorRepository = vectorRepository;
    this.embeddingService = embeddingService;
    this.aiService = aiService;
    this.classRepository = classRepository;
    this.documentRepository = documentRepository;
  }

  /**
   * Ensure user has access to the class (either class creator or enrolled student).
   */
  async _verifyClassAccess(classId, organizationId, user) {
    const classObj = await this.classRepository.findById(classId, organizationId);
    if (!classObj || !classObj.isActive) {
      const err = new Error('Class not found or inactive.');
      err.statusCode = 404;
      throw err;
    }

    if (user.isPlatformAdmin || classObj.createdById === user.id) {
      return classObj;
    }

    const enrollment = await this.classRepository.findEnrollment(classId, user.id);
    if (!enrollment || !enrollment.isActive) {
      const err = new Error('You do not have access to this classroom.');
      err.statusCode = 403;
      throw err;
    }

    return classObj;
  }

  /**
   * Create a new conversation.
   */
  async createConversation({
    userId,
    classId,
    organizationId,
    documentId = null,
    title = 'Document Discussion',
    user,
  }) {
    await this._verifyClassAccess(classId, organizationId, user);

    if (documentId) {
      const doc = await this.documentRepository.findById(documentId, organizationId);
      if (!doc || doc.classId !== classId) {
        const err = new Error('Referenced document not found in this class.');
        err.statusCode = 404;
        throw err;
      }
    }

    return this.conversationRepository.create({
      userId,
      classId,
      documentId,
      title,
    });
  }

  /**
   * List conversations for the current user in a class.
   */
  async listConversations({ userId, classId, organizationId, page = 1, limit = 20, user }) {
    await this._verifyClassAccess(classId, organizationId, user);
    return this.conversationRepository.findByUserAndClass(userId, classId, { page, limit });
  }

  /**
   * Get a conversation with all its messages.
   */
  async getConversation({ conversationId, userId, classId, organizationId, user }) {
    await this._verifyClassAccess(classId, organizationId, user);

    const conv = await this.conversationRepository.findById(conversationId, userId, classId);
    if (!conv) {
      const err = new Error('Conversation not found.');
      err.statusCode = 404;
      throw err;
    }

    const messages = (conv.messages || []).map((m) => {
      let sources = null;
      if (m.sourcesJson) {
        try {
          sources = JSON.parse(m.sourcesJson);
        } catch {
          sources = null;
        }
      }
      return {
        id: m.id,
        senderRole: m.senderRole,
        content: m.content,
        sources,
        createdAt: m.createdAt,
      };
    });

    return {
      ...conv,
      messages,
    };
  }

  /**
   * Delete a conversation.
   */
  async deleteConversation({ conversationId, userId, classId, organizationId, user }) {
    await this._verifyClassAccess(classId, organizationId, user);

    const conv = await this.conversationRepository.findById(conversationId, userId, classId);
    if (!conv) {
      const err = new Error('Conversation not found.');
      err.statusCode = 404;
      throw err;
    }

    return this.conversationRepository.delete(conversationId, userId, classId);
  }

  /**
   * Send a question message, perform RAG retrieval via pgvector, and generate grounded answer.
   */
  async sendMessage({ conversationId, userId, classId, organizationId, content, user }) {
    await this._verifyClassAccess(classId, organizationId, user);

    const conv = await this.conversationRepository.findById(conversationId, userId, classId);
    if (!conv) {
      const err = new Error('Conversation not found.');
      err.statusCode = 404;
      throw err;
    }

    // 1. Record user message
    const userMessage = await this.conversationRepository.createMessage({
      conversationId,
      senderRole: 'USER',
      content,
    });

    // 2. Backfill embeddings for any chunks in this document/class missing them
    try {
      const missingChunks = await this.vectorRepository.findChunksWithoutEmbedding({
        documentId: conv.documentId,
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
    } catch (backfillErr) {
      console.warn('[RagService]: Warning backfilling embeddings:', backfillErr.message);
    }

    // 3. Generate query vector embedding
    const queryVector = await this.embeddingService.generateEmbedding(content);
    const queryVectorStr = this.embeddingService.vectorToString(queryVector);

    // 4. Retrieve top-4 relevant chunks using pgvector
    const relevantChunks = await this.vectorRepository.searchSimilarChunks({
      queryVector: queryVectorStr,
      classId,
      documentId: conv.documentId,
      limit: 4,
    });

    // 5. Fetch recent conversation history
    const recentMessages = await this.conversationRepository.getRecentMessages(conversationId, 6);
    const history = recentMessages.map((m) => ({
      role: m.senderRole === 'ASSISTANT' ? 'assistant' : 'user',
      content: m.content,
    }));

    // 6. Generate grounded answer via Groq LLM
    const answer = await this.aiService.answerQuestionWithContext({
      question: content,
      contextChunks: relevantChunks,
      history,
    });

    // 7. Format sources metadata
    const sources = relevantChunks.map((c) => ({
      chunkId: c.id,
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      similarity: typeof c.similarity === 'number' ? Math.round(c.similarity * 1000) / 1000 : null,
      excerpt: (c.content || '').slice(0, 150),
    }));

    // 8. Record assistant response
    const assistantMessage = await this.conversationRepository.createMessage({
      conversationId,
      senderRole: 'ASSISTANT',
      content: answer,
      sourcesJson: JSON.stringify(sources),
    });

    return {
      userMessage,
      assistantMessage: {
        id: assistantMessage.id,
        senderRole: assistantMessage.senderRole,
        content: assistantMessage.content,
        sources,
        createdAt: assistantMessage.createdAt,
      },
    };
  }
}
