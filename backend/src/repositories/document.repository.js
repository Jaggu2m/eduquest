import { prisma } from '../lib/prismaClient.js';

export class DocumentRepository {
  /**
   * Create a new document record.
   *
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    return prisma.document.create({
      data,
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find document by ID scoped to organization.
   *
   * @param {string} id
   * @param {string} organizationId
   * @returns {Promise<object|null>}
   */
  async findById(id, organizationId) {
    return prisma.document.findFirst({
      where: {
        id,
        organizationId,
        isActive: true,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            chunks: true,
            assessments: true,
          },
        },
      },
    });
  }

  /**
   * List documents for a specific class within an organization.
   *
   * @param {string} classId
   * @param {string} organizationId
   * @param {object} [options]
   * @returns {Promise<{ documents: object[], total: number }>}
   */
  async findByClass(classId, organizationId, { page = 1, limit = 20, status } = {}) {
    const where = {
      classId,
      organizationId,
      isActive: true,
      ...(status ? { status } : {}),
    };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              chunks: true,
              assessments: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return { documents, total };
  }

  /**
   * Update a document by ID and organization ID.
   *
   * @param {string} id
   * @param {string} organizationId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(id, organizationId, data) {
    return prisma.document.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  /**
   * Soft delete a document.
   *
   * @param {string} id
   * @param {string} organizationId
   * @returns {Promise<object>}
   */
  async softDelete(id, organizationId) {
    return prisma.document.update({
      where: {
        id,
        organizationId,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get chunks for a specific document with pagination.
   *
   * @param {string} documentId
   * @param {object} [options]
   * @returns {Promise<{ chunks: object[], total: number }>}
   */
  async getChunks(documentId, { page = 1, limit = 50 } = {}) {
    const where = { documentId };

    const [chunks, total] = await Promise.all([
      prisma.documentChunk.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { chunkIndex: 'asc' },
      }),
      prisma.documentChunk.count({ where }),
    ]);

    return { chunks, total };
  }
}
