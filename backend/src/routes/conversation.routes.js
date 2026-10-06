import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller.js';
import { RagService } from '../services/rag.service.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { VectorRepository } from '../repositories/vector.repository.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import { EmbeddingService } from '../services/embedding.service.js';
import { AIService } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateConversationSchema, SendMessageSchema } from '../schemas/index.js';

// Composition root
const conversationRepository = new ConversationRepository();
const vectorRepository = new VectorRepository();
const classRepository = new ClassRepository();
const documentRepository = new DocumentRepository();
const embeddingService = new EmbeddingService();
const aiService = new AIService();

const ragService = new RagService({
  conversationRepository,
  vectorRepository,
  embeddingService,
  aiService,
  classRepository,
  documentRepository,
});

const conversationController = new ConversationController({ ragService });

// mergeParams: true allows access to :orgId and :classId from parent router mount
const router = Router({ mergeParams: true });

router.use(requireAuth);

// POST /api/organizations/:orgId/classes/:classId/conversations
router.post('/', validate(CreateConversationSchema), conversationController.createConversation);

// GET /api/organizations/:orgId/classes/:classId/conversations
router.get('/', conversationController.listConversations);

// GET /api/organizations/:orgId/classes/:classId/conversations/:conversationId
router.get('/:conversationId', conversationController.getConversation);

// DELETE /api/organizations/:orgId/classes/:classId/conversations/:conversationId
router.delete('/:conversationId', conversationController.deleteConversation);

// POST /api/organizations/:orgId/classes/:classId/conversations/:conversationId/messages
router.post(
  '/:conversationId/messages',
  validate(SendMessageSchema),
  conversationController.sendMessage,
);

export default router;
