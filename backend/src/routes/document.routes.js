import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.js';
import { DocumentService } from '../services/document.service.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import { ClassRepository } from '../repositories/class.repository.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

// Composition Root for Document domain
const documentRepository = new DocumentRepository();
const classRepository = new ClassRepository();
const documentService = new DocumentService(documentRepository, classRepository);
const documentController = new DocumentController(documentService);

// mergeParams: true allows access to :orgId and :classId from parent routers
const router = Router({ mergeParams: true });

router.use(requireAuth);

// ── Document Routes ───────────────────────────────────────────────────────────

// GET /api/organizations/:orgId/classes/:classId/documents
router.get('/', documentController.getDocumentsByClass);

// POST /api/organizations/:orgId/classes/:classId/documents (single file upload)
router.post('/', upload.single('file'), documentController.uploadDocument);

// GET /api/organizations/:orgId/classes/:classId/documents/:docId
router.get('/:docId', documentController.getDocumentById);

// GET /api/organizations/:orgId/classes/:classId/documents/:docId/chunks
router.get('/:docId/chunks', documentController.getDocumentChunks);

// DELETE /api/organizations/:orgId/classes/:classId/documents/:docId
router.delete('/:docId', documentController.deleteDocument);

export default router;
