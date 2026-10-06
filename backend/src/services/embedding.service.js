/**
 * Embedding Service
 * Generates dense vector embeddings using Google Gemini Embeddings API.
 */
export class EmbeddingService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_EMBEDDING_MODEL || 'models/gemini-embedding-001';
    this.dimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10);
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Generate vector embedding for a single text string.
   * @param {string} text
   * @returns {Promise<number[]>} 768-dimensional float array
   */
  async generateEmbedding(text) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Text to embed must be a non-empty string');
    }

    const url = `${this.baseUrl}/${this.model}:embedContent?key=${this.apiKey}`;
    const payload = {
      content: {
        parts: [{ text: text.trim() }],
      },
      outputDimensionality: this.dimensions,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || response.statusText;
      throw new Error(`Gemini Embedding API error (${response.status}): ${msg}`);
    }

    const data = await response.json();
    if (!data.embedding?.values) {
      throw new Error('Gemini API did not return embedding values');
    }

    return data.embedding.values;
  }

  /**
   * Generate vector embeddings for a batch of text strings.
   * Splits into batches of 32 to respect API boundaries.
   * @param {string[]} texts
   * @returns {Promise<number[][]>} Array of 768-dimensional float arrays
   */
  async generateBatchEmbeddings(texts) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const batchSize = 32;
    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const slice = texts.slice(i, i + batchSize);
      const url = `${this.baseUrl}/${this.model}:batchEmbedContents?key=${this.apiKey}`;
      const payload = {
        requests: slice.map((t) => ({
          model: this.model,
          content: { parts: [{ text: (t || '').trim() || ' ' }] },
          outputDimensionality: this.dimensions,
        })),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || response.statusText;
        throw new Error(`Gemini Batch Embedding API error (${response.status}): ${msg}`);
      }

      const data = await response.json();
      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        throw new Error('Gemini Batch API did not return expected embeddings array');
      }

      for (const item of data.embeddings) {
        allEmbeddings.push(item.values);
      }
    }

    return allEmbeddings;
  }

  /**
   * Helper to format a float array into a pgvector string representation: '[0.1,0.2,...]'
   * @param {number[]} vector
   * @returns {string}
   */
  vectorToString(vector) {
    if (!Array.isArray(vector)) {
      throw new Error('Vector must be an array of numbers');
    }
    return `[${vector.join(',')}]`;
  }
}
