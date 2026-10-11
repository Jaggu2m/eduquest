import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';

async function test() {
  const filePath = './uploads/1791653465806-49401393-OS_BOOKMARKED_NOTE.pdf__14_.pdf';
  const fileBuffer = await fs.promises.readFile(filePath);
  
  const parser = new PDFParse({ data: fileBuffer });
  
  const screenshots = await parser.getScreenshot({
    scale: 2.0,
    imageBuffer: true
  });

  const worker = await createWorker('eng');
  
  // Test pages 2 and 3
  for (const pageNum of [2, 3]) {
    const pageImg = screenshots.pages?.[pageNum - 1];
    if (pageImg) {
      console.log(`Recognizing page ${pageNum}...`);
      const ret = await worker.recognize(Buffer.from(pageImg.data));
      console.log(`--- Page ${pageNum} OCR text (first 300 chars) ---`);
      console.log(ret.data.text.slice(0, 300));
      console.log('--------------------------------------------------');
    }
  }

  await worker.terminate();
  await parser.destroy();
}

test().catch(console.error);
