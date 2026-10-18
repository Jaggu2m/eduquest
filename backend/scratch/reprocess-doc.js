import { prisma } from '../src/lib/prismaClient.js';
import { chunkText } from '../src/utils/text-chunker.js';
import { ocrPdfWithTesseract } from '../src/utils/ocr.js';
import { EmbeddingService } from '../src/services/embedding.service.js';

async function reprocess() {
  const documentId = 'cmv230mc10005h8jlgqnm4ple';
  const filePath = './uploads/1791653465806-49401393-OS_BOOKMARKED_NOTE.pdf__14_.pdf';

  console.log(`Reprocessing document ${documentId}...`);

  // OCR first 5 pages for validation
  const { rawText, pageCount } = await ocrPdfWithTesseract(filePath, { maxPages: 5 });
  console.log(`OCR complete! Extracted ${rawText.length} characters.`);
  console.log('Sample text:', rawText.slice(0, 300));

  const chunks = chunkText(rawText, { chunkSize: 1000, chunkOverlap: 200 });
  console.log(`Generated ${chunks.length} chunks.`);

  await prisma.$transaction(async (tx) => {
    await tx.documentChunk.deleteMany({ where: { documentId } });
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
      data: { status: 'READY', rawText, pageCount },
    });
  });

  const createdChunks = await prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
  });

  console.log(`Generating embeddings for ${createdChunks.length} chunks...`);
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

  console.log('Successfully reprocessed and embedded handwritten document!');
  process.exit(0);
}

reprocess().catch((err) => {
  console.error('Reprocess error:', err);
  process.exit(1);
});
