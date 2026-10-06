import { Queue } from 'bullmq';
import { redisConnection } from '../lib/redis.js';

export const DOCUMENT_QUEUE_NAME = 'document-processing';

export const documentQueue = new Queue(DOCUMENT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
  },
});

/**
 * Enqueue a document for asynchronous processing (text extraction & chunking).
 *
 * @param {object} params
 * @param {string} params.documentId
 * @param {string} params.filePath
 * @param {string} params.fileType
 * @returns {Promise<import('bullmq').Job>}
 */
export async function addDocumentProcessingJob({ documentId, filePath, fileType }) {
  return await documentQueue.add('extract-and-chunk', {
    documentId,
    filePath,
    fileType,
  });
}
