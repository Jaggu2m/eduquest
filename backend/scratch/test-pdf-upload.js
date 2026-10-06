import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000/api';

// Minimal valid single-page PDF binary generator
function createMinimalPdf() {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT
/F1 24 Tf
100 700 Td
(EduQuest Quantum Computing 101) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000261 00000 n 
0000000366 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
443
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

async function runPdfTest() {
  console.log('--- TESTING PDF UPLOAD & PARSING ---');

  // Register teacher
  const email = `pdf_teacher_${Date.now()}@example.com`;
  const registerRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Password123!',
      firstName: 'Richard',
      lastName: 'Feynman',
    }),
  });
  const regData = await registerRes.json();
  const token = regData.token;

  // Fetch org
  const orgsRes = await fetch(`${BASE_URL}/organizations`);
  const orgs = await orgsRes.json();
  const orgId = orgs[0].id;

  const { prisma } = await import('../src/lib/prismaClient.js');
  await prisma.membership.create({
    data: {
      userId: regData.user.id,
      organizationId: orgId,
      role: 'TEACHER',
      isActive: true,
    },
  });

  // Create class
  const classRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Quantum Physics',
      code: `QP-${Date.now().toString().slice(-4)}`,
    }),
  });
  const classData = await classRes.json();
  const classId = classData.class.id;

  // Create and upload PDF
  const pdfBuffer = createMinimalPdf();
  const pdfPath = path.resolve('scratch/sample-quantum.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);

  const formData = new FormData();
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  formData.append('file', blob, 'sample-quantum.pdf');
  formData.append('title', 'Quantum Computing Syllabus');

  const uploadRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes/${classId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  console.log('Upload status:', uploadRes.status);
  const docId = uploadData.document.id;

  // Poll for READY
  let attempts = 0;
  let processedDoc = null;
  while (attempts < 15) {
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
    const res = await fetch(
      `${BASE_URL}/organizations/${orgId}/classes/${classId}/documents/${docId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    processedDoc = await res.json();
    console.log(`[Attempt ${attempts}] PDF Status: ${processedDoc.status}`);
    if (processedDoc.status === 'READY' || processedDoc.status === 'FAILED') break;
  }

  console.log('PDF Processing Result:', {
    id: processedDoc.id,
    status: processedDoc.status,
    fileType: processedDoc.fileType,
    pageCount: processedDoc.pageCount,
    rawText: processedDoc.rawText,
    chunkCount: processedDoc._count?.chunks,
  });

  if (processedDoc.status === 'READY') {
    console.log('--- PDF PROCESSING TEST PASSED ---');
  } else {
    throw new Error(`PDF processing failed with status: ${processedDoc.status}`);
  }
}

runPdfTest().catch((err) => {
  console.error('PDF Test Error:', err);
  process.exit(1);
});
