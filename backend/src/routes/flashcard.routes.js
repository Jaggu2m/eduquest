import { Router } from 'express';
import { FlashcardController } from '../controllers/flashcard.controller.js';
import { FlashcardService } from '../services/flashcard.service.js';
import { FlashcardRepository } from '../repositories/flashcard.repository.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import { VectorRepository } from '../repositories/vector.repository.js';
import { EmbeddingService } from '../services/embedding.service.js';
import { AIService } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  GenerateFlashcardDeckSchema,
  UpdateFlashcardDeckSchema,
  ReviewFlashcardSchema,
} from '../schemas/index.js';

// ── Dependency Injection (Composition Root) ───────────────────────────────────
const flashcardRepository = new FlashcardRepository();
const documentRepository = new DocumentRepository();
const vectorRepository = new VectorRepository();
const embeddingService = new EmbeddingService();
const aiService = new AIService();

const flashcardService = new FlashcardService({
  flashcardRepository,
  documentRepository,
  vectorRepository,
  embeddingService,
  aiService,
});

const flashcardController = new FlashcardController({ flashcardService });

// mergeParams: true allows access to :orgId and :classId from parent router
const router = Router({ mergeParams: true });

router.use(requireAuth);

// ── Deck Routes ───────────────────────────────────────────────────────────────

// POST   /api/organizations/:orgId/classes/:classId/flashcard-decks/generate
router.post('/generate', validate(GenerateFlashcardDeckSchema), flashcardController.generateDeck);

// GET    /api/organizations/:orgId/classes/:classId/flashcard-decks
router.get('/', flashcardController.listDecks);

// GET    /api/organizations/:orgId/classes/:classId/flashcard-decks/:deckId
router.get('/:deckId', flashcardController.getDeck);

// PATCH  /api/organizations/:orgId/classes/:classId/flashcard-decks/:deckId
router.patch('/:deckId', validate(UpdateFlashcardDeckSchema), flashcardController.updateDeck);

// DELETE /api/organizations/:orgId/classes/:classId/flashcard-decks/:deckId
router.delete('/:deckId', flashcardController.deleteDeck);

// ── Practice / Spaced Repetition Routes ──────────────────────────────────────

// GET    /api/organizations/:orgId/classes/:classId/flashcard-decks/:deckId/due
router.get('/:deckId/due', flashcardController.getDueCards);

// GET    /api/organizations/:orgId/classes/:classId/flashcard-decks/:deckId/stats
router.get('/:deckId/stats', flashcardController.getDeckStats);

// POST   /api/organizations/:orgId/classes/:classId/flashcard-decks/:deckId/cards/:cardId/review
router.post(
  '/:deckId/cards/:cardId/review',
  validate(ReviewFlashcardSchema),
  flashcardController.reviewCard,
);

export default router;
