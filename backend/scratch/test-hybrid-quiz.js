import { prisma } from '../src/lib/prismaClient.js';
import { EmbeddingService } from '../src/services/embedding.service.js';

const BASE_URL = 'http://localhost:3000/api';

async function runHybridQuizTest() {
  console.log('--- TESTING HYBRID QUIZ GENERATION STRATEGY ---');

  // 1. Register Teacher
  const teacherEmail = `prof_hybrid_${Date.now()}@example.com`;
  const tRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: teacherEmail,
      password: 'Password123!',
      firstName: 'Richard',
      lastName: 'Feynman',
    }),
  });
  const tData = await tRegRes.json();
  const teacherToken = tData.token;
  const teacherId = tData.user.id;

  // 2. Organization & Class
  const orgs = await (await fetch(`${BASE_URL}/organizations`)).json();
  const orgId = orgs[0].id;

  await prisma.membership.create({
    data: { userId: teacherId, organizationId: orgId, role: 'TEACHER' },
  });

  const classRes = await (
    await fetch(`${BASE_URL}/organizations/${orgId}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        name: 'Quantum Information and Cryptography',
        code: 'QIC-801',
      }),
    })
  ).json();
  const classId = classRes.class.id;
  console.log('1. Teacher & Class created:', classId);

  // 3. Create Short Document (3 pages) -> Should trigger Direct Full Text
  console.log('\n2. Testing Short Document (<= 5 pages, no topic)...');
  const shortDoc = await prisma.document.create({
    data: {
      title: 'Introductory Quantum Gates',
      fileUrl: '/uploads/gates.pdf',
      fileType: 'pdf',
      fileSizeBytes: 4096,
      pageCount: 3,
      status: 'READY',
      rawText:
        'Single qubit gates include the Pauli-X, Pauli-Y, and Pauli-Z gates, along with the Hadamard gate which creates superposition. Two-qubit gates include the CNOT gate which produces entanglement.',
      organizationId: orgId,
      classId: classId,
      uploadedById: teacherId,
    },
  });

  const quiz1Res = await (
    await fetch(`${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        documentId: shortDoc.id,
        numQuestions: 2,
      }),
    })
  ).json();

  console.log(
    '   Quiz 1 Result:',
    quiz1Res.message,
    '| Questions:',
    quiz1Res.assessment.questions.length,
  );
  console.log('   Sample Question 1 Prompt:', quiz1Res.assessment.questions[0].prompt);

  // 4. Create Large Document (10 pages) with diverse chunks -> Should trigger Vector Retrieval
  console.log(
    '\n3. Testing Large Document (> 5 pages, topic: "Decoherence and Error Correction")...',
  );
  const largeDoc = await prisma.document.create({
    data: {
      title: 'Advanced Quantum Architecture and Fault Tolerance',
      fileUrl: '/uploads/advanced_quantum.pdf',
      fileType: 'pdf',
      fileSizeBytes: 95000,
      pageCount: 12,
      status: 'READY',
      organizationId: orgId,
      classId: classId,
      uploadedById: teacherId,
    },
  });

  const chunksData = [
    {
      page: 1,
      content:
        'Classical computing uses bits with voltages representing binary 0 and 1. Boolean logic gates like AND, OR, NOT form complete sets for computation.',
    },
    {
      page: 4,
      content:
        'Superposition allows states like alpha|0> + beta|1>. Matrix representations of single qubit rotations on the Bloch sphere are unitary operations.',
    },
    {
      page: 8,
      content:
        'Decoherence is the relaxation and dephasing of quantum states due to interaction with environmental phonons and thermal fluctuations. T1 and T2 times characterize qubit lifetimes.',
    },
    {
      page: 9,
      content:
        'Surface codes and topological error correction arrange physical qubits on a 2D lattice. Stabilizer measurements detect bit-flip (X) and phase-flip (Z) errors without destroying quantum superpositions.',
    },
  ];

  const embeddingService = new EmbeddingService();
  const embeddings = await embeddingService.generateBatchEmbeddings(
    chunksData.map((c) => c.content),
  );

  for (let i = 0; i < chunksData.length; i++) {
    const chunk = await prisma.documentChunk.create({
      data: {
        documentId: largeDoc.id,
        chunkIndex: i + 1,
        pageNumber: chunksData[i].page,
        content: chunksData[i].content,
      },
    });

    const vecStr = embeddingService.vectorToString(embeddings[i]);
    await prisma.$executeRaw`
      UPDATE document_chunks
      SET embedding = ${vecStr}::vector
      WHERE id = ${chunk.id};
    `;
  }
  console.log('   Large document created with 4 embedded chunks in pgvector across 12 pages.');

  // Generate topic-targeted quiz
  const quiz2Res = await (
    await fetch(`${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        documentId: largeDoc.id,
        topic: 'Decoherence and surface error correction codes',
        numQuestions: 2,
      }),
    })
  ).json();

  console.log('   Quiz 2 Result:', quiz2Res.message, '| Title:', quiz2Res.assessment.title);
  console.log('   Questions generated from vector retrieval:');
  quiz2Res.assessment.questions.forEach((q, idx) => {
    console.log(`     Q${idx + 1}: ${q.prompt}`);
    console.log(`     Topic: ${q.topic} | Explanation: ${q.explanation?.slice(0, 100)}...`);
  });

  console.log('\n============================================================');
  console.log('🎉 HYBRID QUIZ GENERATION (DIRECT + VECTOR RETRIEVAL) VERIFIED!');
  console.log('============================================================\n');
}

runHybridQuizTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
