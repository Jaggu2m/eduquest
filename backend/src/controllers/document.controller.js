export class DocumentController {
  constructor(documentService) {
    this.documentService = documentService;
  }

  /**
   * Upload a document to a class.
   * POST /organizations/:orgId/classes/:classId/documents
   */
  uploadDocument = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const { title } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'No document file was uploaded.' });
      }

      const document = await this.documentService.uploadDocument({
        organizationId: orgId,
        classId,
        userId: req.user.userId || req.user.id,
        file,
        title: title || file.originalname,
      });

      return res.status(201).json({
        message: 'Document uploaded successfully and queued for processing.',
        document,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * List all documents in a class.
   * GET /organizations/:orgId/classes/:classId/documents
   */
  getDocumentsByClass = async (req, res) => {
    try {
      const { orgId, classId } = req.params;
      const { page, limit, status } = req.query;

      const result = await this.documentService.getDocumentsByClass({
        organizationId: orgId,
        classId,
        page,
        limit,
        status,
      });

      return res.json(result);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get single document metadata.
   * GET /organizations/:orgId/classes/:classId/documents/:docId
   */
  getDocumentById = async (req, res) => {
    try {
      const { orgId, docId } = req.params;

      const document = await this.documentService.getDocumentById({
        id: docId,
        organizationId: orgId,
      });

      return res.json(document);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Get extracted chunks of a document.
   * GET /organizations/:orgId/classes/:classId/documents/:docId/chunks
   */
  getDocumentChunks = async (req, res) => {
    try {
      const { orgId, docId } = req.params;
      const { page, limit } = req.query;

      const result = await this.documentService.getDocumentChunks({
        documentId: docId,
        organizationId: orgId,
        page,
        limit,
      });

      return res.json(result);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };

  /**
   * Soft delete a document.
   * DELETE /organizations/:orgId/classes/:classId/documents/:docId
   */
  deleteDocument = async (req, res) => {
    try {
      const { orgId, docId } = req.params;

      await this.documentService.deleteDocument({
        id: docId,
        organizationId: orgId,
      });

      return res.json({ message: 'Document deleted successfully.' });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({ message: error.message });
    }
  };
}
