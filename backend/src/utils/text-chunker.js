/**
 * Splits text into overlapping chunks for semantic retrieval and quiz generation.
 *
 * @param {string} text - The raw text to chunk
 * @param {object} options
 * @param {number} [options.chunkSize=1000] - Target character length per chunk
 * @param {number} [options.chunkOverlap=200] - Overlap character count between consecutive chunks
 * @returns {Array<{ chunkIndex: number, content: string, tokenCount: number }>}
 */
export function chunkText(text, { chunkSize = 1000, chunkOverlap = 200 } = {}) {
  if (!text || typeof text !== 'string') return [];

  // Normalize line endings and collapse excessive whitespace
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (normalized.length === 0) return [];

  const chunks = [];
  const step = Math.max(1, chunkSize - chunkOverlap);
  let chunkIndex = 0;

  for (let i = 0; i < normalized.length; i += step) {
    const end = Math.min(i + chunkSize, normalized.length);
    let chunk = normalized.slice(i, end).trim();

    // If chunk is too small and not the first chunk, ignore or merge
    if (chunk.length > 20) {
      chunks.push({
        chunkIndex,
        content: chunk,
        tokenCount: Math.ceil(chunk.length / 4), // standard approximation
      });
      chunkIndex++;
    }

    if (end >= normalized.length) break;
  }

  return chunks;
}
