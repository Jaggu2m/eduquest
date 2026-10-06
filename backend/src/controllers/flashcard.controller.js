export class FlashcardController {
  /** @param {{ flashcardService: import('../services/flashcard.service.js').FlashcardService }} deps */
  constructor({ flashcardService }) {
    this.flashcardService = flashcardService;

    // Bind all handlers so they can be used directly as Express route callbacks
    this.generateDeck = this.generateDeck.bind(this);
    this.listDecks = this.listDecks.bind(this);
    this.getDeck = this.getDeck.bind(this);
    this.updateDeck = this.updateDeck.bind(this);
    this.deleteDeck = this.deleteDeck.bind(this);
    this.getDueCards = this.getDueCards.bind(this);
    this.reviewCard = this.reviewCard.bind(this);
    this.getDeckStats = this.getDeckStats.bind(this);
  }

  // ── POST /flashcard-decks/generate ────────────────────────────────────────
  async generateDeck(req, res, next) {
    try {
      const { classId } = req.params;
      const userId = req.user.id;
      const { documentId, title, topic, numCards, difficulty } = req.body;

      const deck = await this.flashcardService.generateDeck({
        classId,
        userId,
        documentId,
        title,
        topic,
        numCards,
        difficulty,
      });

      return res.status(201).json({
        success: true,
        message: `Flashcard deck "${deck.title}" generated with ${deck.flashcards.length} cards.`,
        data: deck,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── GET /flashcard-decks ───────────────────────────────────────────────────
  async listDecks(req, res, next) {
    try {
      const { classId } = req.params;
      const userId = req.user.id;
      const decks = await this.flashcardService.listDecks({ classId, userId });
      return res.json({ success: true, data: decks });
    } catch (err) {
      next(err);
    }
  }

  // ── GET /flashcard-decks/:deckId ──────────────────────────────────────────
  async getDeck(req, res, next) {
    try {
      const { classId, deckId } = req.params;
      const userId = req.user.id;
      const deck = await this.flashcardService.getDeck({ deckId, classId, userId });
      return res.json({ success: true, data: deck });
    } catch (err) {
      next(err);
    }
  }

  // ── PATCH /flashcard-decks/:deckId ────────────────────────────────────────
  async updateDeck(req, res, next) {
    try {
      const { deckId } = req.params;
      const userId = req.user.id;
      const { title, description } = req.body;
      const result = await this.flashcardService.updateDeck({ deckId, userId, title, description });
      return res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  // ── DELETE /flashcard-decks/:deckId ───────────────────────────────────────
  async deleteDeck(req, res, next) {
    try {
      const { deckId } = req.params;
      const userId = req.user.id;
      await this.flashcardService.deleteDeck({ deckId, userId });
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // ── GET /flashcard-decks/:deckId/due ──────────────────────────────────────
  async getDueCards(req, res, next) {
    try {
      const { classId, deckId } = req.params;
      const userId = req.user.id;
      const limit = Math.min(50, parseInt(req.query.limit ?? '20', 10));
      const cards = await this.flashcardService.getDueCards({ deckId, classId, userId, limit });
      return res.json({ success: true, data: cards });
    } catch (err) {
      next(err);
    }
  }

  // ── POST /flashcard-decks/:deckId/cards/:cardId/review ───────────────────
  async reviewCard(req, res, next) {
    try {
      const { cardId } = req.params;
      const userId = req.user.id;
      const { masteryLevel } = req.body;
      const updated = await this.flashcardService.reviewCard({ flashcardId: cardId, userId, masteryLevel });
      return res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // ── GET /flashcard-decks/:deckId/stats ───────────────────────────────────
  async getDeckStats(req, res, next) {
    try {
      const { classId, deckId } = req.params;
      const userId = req.user.id;
      const stats = await this.flashcardService.getDeckStats({ deckId, classId, userId });
      return res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
}
