import { Worker } from 'bullmq';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { redisConnection } from '../lib/redis.js';
import { DOCUMENT_QUEUE_NAME } from '../queues/document.queue.js';
import { prisma } from '../lib/prismaClient.js';
import { chunkText } from '../utils/text-chunker.js';

/**
 * Extracts text and metadata from a file on disk.
 *
 * @param {string} filePath
 * @param {string} fileType
 * @returns {Promise<{ rawText: string, pageCount: number }>}
 */
async function extractTextFromFile(filePath, fileType) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  const normalizedType = fileType.toLowerCase().replace('.', '');

  if (normalizedType === 'pdf') {
    const fileBuffer = await fs.promises.readFile(filePath);
    const parser = new PDFParse({ data: fileBuffer });
    const parsed = await parser.getText();

    return {
      rawText: parsed.text || '',
      pageCount: parsed.total || 1,
    };
  }

  if (normalizedType === 'txt') {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return {
      rawText: content,
      pageCount: 1,
    };
  }

  // Fallback for docx or other plain text formats
  const fallbackContent = await fs.promises.readFile(filePath, 'utf-8');
  return {
    rawText: fallbackContent,
    pageCount: 1,
  };
}

export function startDocumentWorker() {
  const worker = new Worker(
    DOCUMENT_QUEUE_NAME,
    async (job) => {
      const { documentId, filePath, fileType } = job.data;
      console.log(`[worker:document]: Processing job ${job.id} for document ${documentId}`);

      try {
        // 1. Mark status as PROCESSING
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'PROCESSING' },
        });

        // 2. Extract text from the uploaded document
        const { rawText, pageCount } = await extractTextFromFile(filePath, fileType);

        // 3. Chunk the extracted text
        const chunks = chunkText(rawText, { chunkSize: 1000, chunkOverlap: 200 });

        // 4. Persist chunks and update document status to READY in a transaction
        await prisma.$transaction(async (tx) => {
          // Clear any chunks from prior attempts
          await tx.documentChunk.deleteMany({
            where: { documentId },
          });

          if (chunks.length > 0) {
            await tx.documentChunk.createMany({
              data: chunks.map((c) => ({
                documentId,
                chunkIndex: c.chunkIndex,
                content: c.content,
                tokenCount: c.tokenCount,
              })),
            });
          }

          await tx.document.update({
            where: { id: documentId },
            data: {
              status: 'READY',
              rawText,
              pageCount,
            },
          });
        });

        console.log(
          `[worker:document]: Successfully processed document ${documentId} (${chunks.length} chunks generated)`,
        );

        // 5. Generate vector embeddings for the chunks using Gemini Embeddings
        try {
          const createdChunks = await prisma.documentChunk.findMany({
            where: { documentId },
            orderBy: { chunkIndex: 'asc' },
            select: { id: true, content: true },
          });

          if (createdChunks.length > 0) {
            const { EmbeddingService } = await import('../services/embedding.service.js');
            const embeddingService = new EmbeddingService();
            const texts = createdChunks.map((c) => c.content);
            const embeddings = await embeddingService.generateBatchEmbeddings(texts);

            for (let i = 0; i < createdChunks.length; i++) {
              if (embeddings[i]) {
                const vecStr = embeddingService.vectorToString(embeddings[i]);
                await prisma.$executeRaw`
                  UPDATE document_chunks
                  SET embedding = ${vecStr}::vector
                  WHERE id = ${createdChunks[i].id};
                `;
              }
            }

            console.log(
              `[worker:document]: Successfully stored ${createdChunks.length} vector embeddings for document ${documentId}`,
            );
          }
        } catch (embedErr) {
          console.warn(
            `[worker:document]: Warning: Could not generate embeddings for document ${documentId}:`,
            embedErr.message,
          );
        }

        return { success: true, chunkCount: chunks.length };
      } catch (err) {
        console.error(`[worker:document]: Error processing document ${documentId}:`, err.message);

        // Mark document as FAILED
        try {
          await prisma.document.update({
            where: { id: documentId },
            data: { status: 'FAILED' },
          });
        } catch (updateErr) {
          console.error(
            `[worker:document]: Failed to mark document ${documentId} as FAILED:`,
            updateErr.message,
          );
        }

        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[worker:document]: Job ${job.id} completed.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker:document]: Job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
}
