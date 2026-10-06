-- Enable pgvector extension (required for vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable: Add embedding column to document_chunks
ALTER TABLE "document_chunks" ADD COLUMN "embedding" vector(768);

-- Create HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_idx"
  ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);

-- AlterTable: Upgrade flashcard_decks with new fields
ALTER TABLE "flashcard_decks"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "documentId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- AlterTable: Add hint and lastReviewedAt to flashcards
ALTER TABLE "flashcards"
  ADD COLUMN "hint" TEXT,
  ADD COLUMN "lastReviewedAt" TIMESTAMP(3);

-- AddForeignKey: flashcard_decks -> documents (optional source doc)
ALTER TABLE "flashcard_decks"
  ADD CONSTRAINT "flashcard_decks_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
