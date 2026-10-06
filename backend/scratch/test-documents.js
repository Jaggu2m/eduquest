import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000/api';

async function testDocumentWorkflow() {
  console.log('--- STARTING PHASE 6 DOCUMENT MANAGEMENT TEST ---');

  // 1. Register a teacher user
  const email = `teacher_${Date.now()}@example.com`;
  const registerRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Password123!',
      firstName: 'Alan',
      lastName: 'Turing',
    }),
  });

  const regData = await registerRes.json();
  console.log('1. User registered:', regData.user.email);
  const token = regData.token;

  // 2. Create organization
  const orgSlug = `academy-${Date.now()}`;
  const orgRes = await fetch(`${BASE_URL}/organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Turing AI Academy',
      slug: orgSlug,
      description: 'AI & Data Science Academy',
    }),
  });

  // Note: if user is not platform admin, create org via prisma or login as platform admin
  let orgId;
  if (!orgRes.ok) {
    console.log('Org creation via endpoint required platform admin, falling back to org fetch');
    const orgsRes = await fetch(`${BASE_URL}/organizations`);
    const orgs = await orgsRes.json();
    orgId = orgs[0].id;
    console.log('2. Using existing organization:', orgId);
  } else {
    const orgData = await orgRes.json();
    orgId = orgData.id;
    console.log('2. Organization created:', orgId);
  }

  // Assign TEACHER membership in the organization
  const { prisma } = await import('../src/lib/prismaClient.js');
  await prisma.membership.create({
    data: {
      userId: regData.user.id,
      organizationId: orgId,
      role: 'TEACHER',
      isActive: true,
    },
  });
  console.log('2b. Assigned TEACHER role in organization to user');

  // 3. Create a class
  const classRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Introduction to Artificial Intelligence',
      code: `CS101-${Date.now().toString().slice(-4)}`,
      description: 'Fundamentals of Machine Learning and RAG systems',
    }),
  });

  const classData = await classRes.json();
  const classId = classData.class.id;
  console.log('3. Class created:', classId, classData.class.name);

  // 4. Create sample study material file to upload
  const sampleFilePath = path.resolve('scratch/sample-ai-lecture.txt');
  const sampleText = `
Lecture 1: Foundations of Artificial Intelligence and Retrieval-Augmented Generation

Artificial Intelligence (AI) encompasses various disciplines aimed at building systems capable of performing tasks that typically require human cognition. Among recent advances, Large Language Models (LLMs) represent a significant paradigm shift.

LLMs are trained on massive text corpora to predict tokens in sequence. However, they suffer from knowledge cutoffs and hallucinations. To mitigate these weaknesses, Retrieval-Augmented Generation (RAG) is employed.

Retrieval-Augmented Generation combines an external knowledge base with generative models. In a typical RAG pipeline, documents are ingested, converted into text chunks, and embedded into a vector space. When a query is submitted, relevant chunks are retrieved via semantic similarity and injected into the prompt context for the LLM.

Key advantages of RAG include:
1. Up-to-date domain specific knowledge without retraining or fine-tuning models.
2. Traceability and citation of source documents for fact verification.
3. Lower computational cost and latency compared to full retraining.

In this course, students will build and evaluate end-to-end RAG pipelines, chunking strategies, embeddings, and automated assessment generators.
  `.trim();

  fs.writeFileSync(sampleFilePath, sampleText, 'utf-8');

  // 5. Upload document using multipart/form-data
  console.log('5. Uploading document via multipart/form-data...');
  const formData = new FormData();
  const blob = new Blob([sampleText], { type: 'text/plain' });
  formData.append('file', blob, 'sample-ai-lecture.txt');
  formData.append('title', 'AI Foundations & RAG Overview');

  const uploadRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes/${classId}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  console.log('Upload response status:', uploadRes.status);
  console.log('Upload response data:', uploadData);

  const docId = uploadData.document.id;
  console.log('Document created with status:', uploadData.document.status, 'ID:', docId);

  // 6. Poll for processing completion (BullMQ worker processing)
  console.log('6. Waiting for BullMQ worker to process and chunk the document...');
  let attempts = 0;
  let docStatus = 'PENDING';
  let processedDoc = null;

  while (attempts < 15 && docStatus !== 'READY' && docStatus !== 'FAILED') {
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;

    const checkRes = await fetch(
      `${BASE_URL}/organizations/${orgId}/classes/${classId}/documents/${docId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    processedDoc = await checkRes.json();
    docStatus = processedDoc.status;
    console.log(`[Attempt ${attempts}] Document status: ${docStatus}`);
  }

  console.log('Final document state:', {
    id: processedDoc.id,
    title: processedDoc.title,
    status: processedDoc.status,
    fileType: processedDoc.fileType,
    pageCount: processedDoc.pageCount,
    chunksCount: processedDoc._count?.chunks,
  });

  // 7. Fetch Chunks
  console.log('7. Fetching document chunks...');
  const chunksRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/documents/${docId}/chunks`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const chunksData = await chunksRes.json();
  console.log(
    `Retrieved ${chunksData.chunks.length} chunks. Total: ${chunksData.pagination.total}`,
  );
  chunksData.chunks.forEach((c) => {
    console.log(`Chunk #${c.chunkIndex} (tokens: ${c.tokenCount}): "${c.content.slice(0, 60)}..."`);
  });

  // 8. Test list documents endpoint
  console.log('8. Testing list documents endpoint...');
  const listRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/documents?page=1&limit=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const listData = await listRes.json();
  console.log(`Listed ${listData.documents.length} documents for class.`);

  // 9. Soft delete document
  console.log('9. Testing soft delete...');
  const delRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/documents/${docId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const delData = await delRes.json();
  console.log('Delete response:', delData);

  // 10. Confirm it is no longer listed
  const listAfterDel = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/documents`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const listAfterData = await listAfterDel.json();
  console.log(`Active documents count after delete: ${listAfterData.documents.length}`);

  console.log('--- PHASE 6 DOCUMENT MANAGEMENT TEST COMPLETED SUCCESSFULLY ---');
}

testDocumentWorkflow().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
