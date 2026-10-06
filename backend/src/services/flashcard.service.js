/**
 * FlashcardService — Phase 11
 *
 * Orchestrates AI-powered flashcard generation with the same hybrid strategy
 * used for quiz generation:
 *  - Small documents (≤ 5 pages) or no topic → direct full text
 *  - Large documents (> 5 pages) or topic-focused → vector retrieval (pgvector)
 *
 * Also manages spaced-repetition review scheduling.
 */
export class FlashcardService {
  /**
   * @param {object} deps
   * @param {import('../repositories/flashcard.repository.js').FlashcardRepository} deps.flashcardRepository
   * @param {import('../repositories/document.repository.js').DocumentRepository} deps.documentRepository
   * @param {import('../repositories/vector.repository.js').VectorRepository} deps.vectorRepository
   * @param {import('./embedding.service.js').EmbeddingService} deps.embeddingService
   * @param {import('./ai.service.js').AIService} deps.aiService
   */
  constructor({ flashcardRepository, documentRepository, vectorRepository, embeddingService, aiService }) {
    this.flashcardRepo = flashcardRepository;
    this.documentRepo = documentRepository;
    this.vectorRepo = vectorRepository;
    this.embeddingService = embeddingService;
    this.aiService = aiService;
  }

  // ── Deck Generation ────────────────────────────────────────────────────────

  /**
   * AI-generate a flashcard deck from a document.
   *
   * @param {object} params
   * @param {string} params.classId
   * @param {string} params.userId       - Student requesting the deck
   * @param {string} params.documentId   - Source document
   * @param {string} [params.title]      - Custom deck title (defaults to doc title)
   * @param {string} [params.topic]      - Optional topic focus
   * @param {number} [params.numCards=10]
   * @param {string} [params.difficulty='MEDIUM']
   */
  async generateDeck({ classId, userId, documentId, title, topic, numCards = 10, difficulty = 'MEDIUM' }) {
    // 1. Load the source document
    const document = await this.documentRepo.findById(documentId);
    if (!document) throw Object.assign(new Error('Document not found.'), { statusCode: 404 });
    if (document.status !== 'READY') {
      throw Object.assign(
        new Error('Document is still being processed. Please wait until it is READY.'),
        { statusCode: 409 },
      );
    }

    // 2. Determine retrieval strategy (same logic as hybrid quiz generation)
    const pageCount = document.pageCount ?? 0;
    const useVectorRetrieval = pageCount > 5 || !!topic;
    let content;

    if (useVectorRetrieval) {
      const query = topic || document.title;
      console.log(
        `[FlashcardService]: Using vector retrieval (query: "${query}", pages: ${pageCount}) for flashcard generation.`,
      );
      const queryEmbedding = await this.embeddingService.embedText(query);
      const chunks = await this.vectorRepo.findSimilarChunks({
        embedding: queryEmbedding,
        documentId,
        topK: 10,
      });
      if (chunks.length === 0) {
        throw Object.assign(
          new Error('No relevant content found for this topic in the document.'),
          { statusCode: 422 },
        );
      }
      content = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c.content}`).join('\n\n---\n\n');
    } else {
      console.log(
        `[FlashcardService]: Using direct full text (${pageCount} pages) for flashcard generation.`,
      );
      if (!document.rawText) {
        throw Object.assign(new Error('Document has no extractable text.'), { statusCode: 422 });
      }
      content = document.rawText.slice(0, 12000); // stay within context limits
    }

    // 3. Generate flashcards via Groq LLM
    const cards = await this.aiService.generateFlashcards({ content, numCards, topic: topic ?? '', difficulty });

    // 4. Persist the deck and its cards
    const deckTitle = title || `${document.title}${topic ? ` — ${topic}` : ''} Flashcards`;
    const deck = await this.flashcardRepo.createDeck({
      title: deckTitle,
      description: topic
        ? `AI-generated flashcards on "${topic}" from "${document.title}".`
        : `AI-generated flashcards from "${document.title}".`,
      userId,
      classId,
      documentId,
    });

    await this.flashcardRepo.createFlashcards(deck.id, cards);

    // 5. Return the full deck with cards
    return this.flashcardRepo.findDeckById({ deckId: deck.id, classId, userId });
  }

  // ── Deck CRUD ──────────────────────────────────────────────────────────────

  async listDecks({ classId, userId }) {
    return this.flashcardRepo.findDecksByClass({ classId, userId });
  }

  async getDeck({ deckId, classId, userId }) {
    const deck = await this.flashcardRepo.findDeckById({ deckId, classId, userId });
    if (!deck) throw Object.assign(new Error('Flashcard deck not found.'), { statusCode: 404 });
    return deck;
  }

  async updateDeck({ deckId, userId, title, description }) {
    const updated = await this.flashcardRepo.updateDeck({
      deckId,
      userId,
      data: { ...(title && { title }), ...(description !== undefined && { description }) },
    });
    if (updated.count === 0)
      throw Object.assign(new Error('Deck not found or not owned by user.'), { statusCode: 404 });
    return { success: true };
  }

  async deleteDeck({ deckId, userId }) {
    const deleted = await this.flashcardRepo.deleteDeck({ deckId, userId });
    if (deleted.count === 0)
      throw Object.assign(new Error('Deck not found or not owned by user.'), { statusCode: 404 });
    return { success: true };
  }

  // ── Practice / Spaced Repetition ──────────────────────────────────────────

  /**
   * Get the next batch of cards due for review in a deck.
   */
  async getDueCards({ deckId, classId, userId, limit = 20 }) {
    // Verify deck ownership
    await this.getDeck({ deckId, classId, userId });
    return this.flashcardRepo.findDueCards({ deckId, limit });
  }

  /**
   * Record a student's review result for a flashcard.
   * Uses a simple spaced repetition interval schedule:
   *   - 0 (Again):    review again in 10 minutes
   *   - 1 (Hard):     review again in 1 day
   *   - 2 (Familiar): review again in 3 days
   *   - 3 (Mastered): review again in 7 days
   *
   * @param {object} params
   * @param {string} params.flashcardId
   * @param {string} params.userId
   * @param {0|1|2|3} params.masteryLevel  - Student's self-assessed confidence
   */
  async reviewCard({ flashcardId, userId, masteryLevel }) {
    const card = await this.flashcardRepo.findFlashcardById(flashcardId);
    if (!card) throw Object.assign(new Error('Flashcard not found.'), { statusCode: 404 });
    if (card.deck.userId !== userId)
      throw Object.assign(new Error('Not authorized to review this card.'), { statusCode: 403 });

    // Spaced repetition intervals
    const intervals = { 0: 10 / (60 * 24), 1: 1, 2: 3, 3: 7 }; // in days
    const level = Math.min(3, Math.max(0, Number(masteryLevel)));
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + intervals[level]);

    return this.flashcardRepo.updateMastery({ flashcardId, masteryLevel: level, nextReviewAt });
  }

  /**
   * Get progress stats for a deck (total, mastered, due, learning).
   */
  async getDeckStats({ deckId, classId, userId }) {
    await this.getDeck({ deckId, classId, userId });
    return this.flashcardRepo.getDeckStats(deckId);
  }
}
