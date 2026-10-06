import { prisma } from '../lib/prismaClient.js';

export class VectorRepository {
  /**
   * Search for document chunks similar to a query vector within a class.
   *
   * @param {object} params
   * @param {string} params.queryVector - String representation of vector e.g. '[0.1, 0.2, ...]'
   * @param {string} params.classId - Required class ID for tenancy isolation
   * @param {string} [params.documentId] - Optional document ID to filter to a single document
   * @param {number} [params.limit=5] - Number of top chunks to return
   * @returns {Promise<Array<object>>}
   */
  async searchSimilarChunks({ queryVector, classId, documentId = null, limit = 5 }) {
    if (documentId) {
      return prisma.$queryRaw`
        SELECT 
          dc.id,
          dc."documentId",
          dc."chunkIndex",
          dc."pageNumber",
          dc.content,
          dc."tokenCount",
          d.title AS "documentTitle",
          1 - (dc.embedding <=> ${queryVector}::vector) AS similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc."documentId"
        WHERE d."classId" = ${classId}
          AND d.id = ${documentId}
          AND d."isActive" = true
          AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> ${queryVector}::vector
        LIMIT ${limit};
      `;
    }

    return prisma.$queryRaw`
      SELECT 
        dc.id,
        dc."documentId",
        dc."chunkIndex",
        dc."pageNumber",
        dc.content,
        dc."tokenCount",
        d.title AS "documentTitle",
        1 - (dc.embedding <=> ${queryVector}::vector) AS similarity
      FROM document_chunks dc
      JOIN documents d ON d.id = dc."documentId"
      WHERE d."classId" = ${classId}
        AND d."isActive" = true
        AND dc.embedding IS NOT NULL
      ORDER BY dc.embedding <=> ${queryVector}::vector
      LIMIT ${limit};
    `;
  }

  /**
   * Update the vector embedding for a specific document chunk.
   *
   * @param {string} chunkId
   * @param {string} vectorString - e.g. '[0.1, 0.2, ...]'
   * @returns {Promise<void>}
   */
  async updateChunkEmbedding(chunkId, vectorString) {
    await prisma.$executeRaw`
      UPDATE document_chunks
      SET embedding = ${vectorString}::vector
      WHERE id = ${chunkId};
    `;
  }

  /**
   * Find chunks that currently do not have vector embeddings.
   *
   * @param {object} [options]
   * @param {string} [options.documentId]
   * @param {number} [options.limit=100]
   * @returns {Promise<Array<object>>}
   */
  async findChunksWithoutEmbedding({ documentId = null, limit = 100 } = {}) {
    if (documentId) {
      return prisma.$queryRaw`
        SELECT id, "documentId", "chunkIndex", content
        FROM document_chunks
        WHERE "documentId" = ${documentId}
          AND embedding IS NULL
        ORDER BY "chunkIndex" ASC
        LIMIT ${limit};
      `;
    }

    return prisma.$queryRaw`
      SELECT id, "documentId", "chunkIndex", content
      FROM document_chunks
      WHERE embedding IS NULL
      ORDER BY "chunkIndex" ASC
      LIMIT ${limit};
    `;
  }
}
