import path from 'path';
import { addDocumentProcessingJob } from '../queues/document.queue.js';

export class DocumentService {
  constructor(documentRepository, classRepository) {
    this.documentRepository = documentRepository;
    this.classRepository = classRepository;
  }

  /**
   * Upload and register a document, then queue asynchronous text extraction.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @param {string} params.userId
   * @param {Express.Multer.File} params.file
   * @param {string} params.title
   * @returns {Promise<object>}
   */
  async uploadDocument({ organizationId, classId, userId, file, title }) {
    if (!file) {
      const error = new Error('No document file was uploaded.');
      error.statusCode = 400;
      throw error;
    }

    // Verify class exists and belongs to the specified organization
    const targetClass = await this.classRepository.findById(classId, organizationId);
    if (!targetClass) {
      const error = new Error('Class not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const fileType = ['pdf', 'txt', 'docx'].includes(ext) ? ext : 'pdf';

    // 1. Create initial Document record with PENDING status
    const document = await this.documentRepository.create({
      title: title || file.originalname,
      fileUrl: file.path,
      fileType,
      fileSizeBytes: file.size,
      status: 'PENDING',
      organizationId,
      classId,
      uploadedById: userId,
    });

    // 2. Dispatch background processing job to Redis / BullMQ
    try {
      await addDocumentProcessingJob({
        documentId: document.id,
        filePath: file.path,
        fileType,
      });
    } catch (queueErr) {
      console.error('[DocumentService]: Failed to enqueue document job:', queueErr.message);
      // Even if queue fails, record is persisted in PENDING status for retry
    }

    return document;
  }

  /**
   * Retrieve all documents for a class.
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.classId
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @param {string} [params.status]
   * @returns {Promise<object>}
   */
  async getDocumentsByClass({ organizationId, classId, page = 1, limit = 20, status }) {
    const targetClass = await this.classRepository.findById(classId, organizationId);
    if (!targetClass) {
      const error = new Error('Class not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    const { documents, total } = await this.documentRepository.findByClass(
      classId,
      organizationId,
      {
        page: Number(page),
        limit: Number(limit),
        status,
      },
    );

    return {
      documents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get single document details.
   *
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.organizationId
   * @returns {Promise<object>}
   */
  async getDocumentById({ id, organizationId }) {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      const error = new Error('Document not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    return document;
  }

  /**
   * Get chunks extracted from a document.
   *
   * @param {object} params
   * @param {string} params.documentId
   * @param {string} params.organizationId
   * @param {number} [params.page=1]
   * @param {number} [params.limit=50]
   * @returns {Promise<object>}
   */
  async getDocumentChunks({ documentId, organizationId, page = 1, limit = 50 }) {
    // Check if document exists and belongs to this organization
    const document = await this.documentRepository.findById(documentId, organizationId);
    if (!document) {
      const error = new Error('Document not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    const { chunks, total } = await this.documentRepository.getChunks(documentId, {
      page: Number(page),
      limit: Number(limit),
    });

    return {
      documentId,
      chunks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Soft delete a document.
   *
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.organizationId
   * @returns {Promise<object>}
   */
  async deleteDocument({ id, organizationId }) {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      const error = new Error('Document not found in this organization.');
      error.statusCode = 404;
      throw error;
    }

    return this.documentRepository.softDelete(id, organizationId);
  }
}
