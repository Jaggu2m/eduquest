import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';

/**
 * Extracts text from a scanned or handwritten PDF using Tesseract OCR.
 *
 * @param {string} filePath - Absolute path to the PDF on disk
 * @param {object} [options]
 * @param {number} [options.maxPages=30] - Maximum pages to OCR to prevent worker timeouts
 * @param {number} [options.scale=2.0] - Render resolution scale for sharper handwriting lines
 * @returns {Promise<{ rawText: string, pageCount: number }>}
 */
export async function ocrPdfWithTesseract(filePath, { maxPages = 30, scale = 2.0 } = {}) {
  const fileBuffer = await fs.promises.readFile(filePath);
  const parser = new PDFParse({ data: fileBuffer });

  console.log(`[OCR]: Rendering screenshots for: ${filePath}`);
  const screenshots = await parser.getScreenshot({
    scale,
    imageBuffer: true,
  });

  const totalPages = screenshots.total || screenshots.pages?.length || 1;
  const pagesToProcess = Math.min(screenshots.pages?.length || 0, maxPages);

  console.log(`[OCR]: Initializing Tesseract worker for ${pagesToProcess}/${totalPages} pages...`);
  const worker = await createWorker('eng');
  let fullText = '';

  try {
    for (let i = 0; i < pagesToProcess; i++) {
      const page = screenshots.pages[i];
      if (!page?.data) continue;

      const pageNum = page.pageNumber || i + 1;
      console.log(`[OCR]: Transcribing page ${pageNum} of ${pagesToProcess}...`);

      const { data } = await worker.recognize(Buffer.from(page.data));
      const pageText = data?.text?.trim();

      if (pageText) {
        fullText += `\n\n--- Page ${pageNum} ---\n\n${pageText}`;
      }
    }
  } catch (err) {
    console.error('[OCR]: Error during Tesseract transcription:', err.message);
    throw err;
  } finally {
    await worker.terminate();
    await parser.destroy();
  }

  return {
    rawText: fullText.trim(),
    pageCount: totalPages,
  };
}
