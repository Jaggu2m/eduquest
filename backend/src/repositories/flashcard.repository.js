import { prisma } from '../lib/prismaClient.js';

export class FlashcardRepository {
  // ── Deck Operations ────────────────────────────────────────────────────────

  /**
   * Create a new flashcard deck (without cards — cards are added separately).
   */
  async createDeck({ title, description, userId, classId, documentId }) {
    return prisma.flashcardDeck.create({
      data: {
        title,
        description: description ?? null,
        userId,
        classId,
        documentId: documentId ?? null,
      },
    });
  }

  /**
   * List all decks for a student within a class, ordered by newest first.
   */
  async findDecksByClass({ classId, userId }) {
    return prisma.flashcardDeck.findMany({
      where: { classId, userId },
      orderBy: { createdAt: 'desc' },
      include: {
        document: { select: { id: true, title: true } },
        _count: { select: { flashcards: true } },
      },
    });
  }

  /**
   * Find a specific deck by ID, verifying class and user ownership.
   */
  async findDeckById({ deckId, classId, userId }) {
    return prisma.flashcardDeck.findFirst({
      where: { id: deckId, classId, userId },
      include: {
        document: { select: { id: true, title: true } },
        flashcards: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Update a deck's title or description.
   */
  async updateDeck({ deckId, userId, data }) {
    return prisma.flashcardDeck.updateMany({
      where: { id: deckId, userId },
      data,
    });
  }

  /**
   * Delete a deck (cascade deletes its flashcards).
   */
  async deleteDeck({ deckId, userId }) {
    return prisma.flashcardDeck.deleteMany({
      where: { id: deckId, userId },
    });
  }

  // ── Flashcard Operations ───────────────────────────────────────────────────

  /**
   * Bulk-insert flashcards into a deck.
   * @param {string} deckId
   * @param {Array<{front, back, hint}>} cards
   */
  async createFlashcards(deckId, cards) {
    const data = cards.map((c) => ({
      deckId,
      front: c.front,
      back: c.back,
      hint: c.hint ?? null,
    }));

    return prisma.flashcard.createMany({ data });
  }

  /**
   * Find a single flashcard by ID within a deck (ownership check via deck->user).
   */
  async findFlashcardById(flashcardId) {
    return prisma.flashcard.findUnique({
      where: { id: flashcardId },
      include: { deck: { select: { userId: true } } },
    });
  }

  /**
   * Update mastery level and schedule next review (spaced repetition).
   * masteryLevel: 0=New, 1=Again, 2=Familiar, 3=Mastered
   */
  async updateMastery({ flashcardId, masteryLevel, nextReviewAt }) {
    return prisma.flashcard.update({
      where: { id: flashcardId },
      data: {
        masteryLevel,
        lastReviewedAt: new Date(),
        nextReviewAt: nextReviewAt ?? null,
      },
    });
  }

  /**
   * Get cards due for review (nextReviewAt <= now OR never reviewed).
   */
  async findDueCards({ deckId, limit = 20 }) {
    const now = new Date();
    return prisma.flashcard.findMany({
      where: {
        deckId,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
      orderBy: [{ masteryLevel: 'asc' }, { nextReviewAt: 'asc' }],
      take: limit,
    });
  }

  /**
   * Get deck stats: total cards, mastered, due today.
   */
  async getDeckStats(deckId) {
    const now = new Date();
    const [total, mastered, due] = await Promise.all([
      prisma.flashcard.count({ where: { deckId } }),
      prisma.flashcard.count({ where: { deckId, masteryLevel: 3 } }),
      prisma.flashcard.count({
        where: {
          deckId,
          OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
        },
      }),
    ]);
    return { total, mastered, due, learning: total - mastered };
  }
}
