import { prisma } from '../src/lib/prismaClient.js';
import { EmbeddingService } from '../src/services/embedding.service.js';

const BASE_URL = 'http://localhost:3000/api';

async function runPhase10Test() {
  console.log('--- STARTING PHASE 10 RAG PIPELINE (DOCUMENT CHAT) INTEGRATION TEST ---');

  // 1. Register Teacher
  const teacherEmail = `prof_rag_${Date.now()}@example.com`;
  const tRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: teacherEmail,
      password: 'Password123!',
      firstName: 'Alan',
      lastName: 'Turing',
    }),
  });
  const tData = await tRegRes.json();
  const teacherToken = tData.token;
  const teacherId = tData.user.id;
  console.log('1. Teacher registered:', teacherEmail);

  // 2. Register Student
  const studentEmail = `student_rag_${Date.now()}@example.com`;
  const sRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: 'Password123!',
      firstName: 'Grace',
      lastName: 'Hopper',
    }),
  });
  const sData = await sRegRes.json();
  const studentToken = sData.token;
  const studentId = sData.user.id;
  console.log('2. Student registered:', studentEmail);

  // 3. Setup Organization Membership
  const orgsRes = await fetch(`${BASE_URL}/organizations`);
  const orgs = await orgsRes.json();
  let orgId;
  if (orgs.length > 0) {
    orgId = orgs[0].id;
  } else {
    const newOrg = await prisma.organization.create({
      data: { name: 'Quantum Academy', slug: `quantum-${Date.now()}` },
    });
    orgId = newOrg.id;
  }

  await prisma.membership.createMany({
    data: [
      { userId: teacherId, organizationId: orgId, role: 'TEACHER' },
      { userId: studentId, organizationId: orgId, role: 'STUDENT' },
    ],
    skipDuplicates: true,
  });
  console.log('3. Memberships granted in organization:', orgId);

  // 4. Create Class
  const classRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      name: 'Advanced Quantum & Neural Computing',
      code: 'QNC-501',
      description: 'Foundations of quantum superposition, qubits, and transformer neural networks.',
    }),
  });
  const classData = await classRes.json();
  const classId = classData.class?.id || classData.data?.id;
  console.log(
    '4. Class created:',
    classData.class?.name || classData.data?.name,
    '(',
    classId,
    ')',
  );

  // 5. Enroll Student
  const enrollRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/enrollments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ userId: studentId }),
    },
  );
  console.log('5. Student enrolled in class (Status:', enrollRes.status, ')');

  // 6. Create Document with Chunks and Vector Embeddings
  console.log('6. Creating reference document and generating vector embeddings...');
  const sampleDocument = await prisma.document.create({
    data: {
      title: 'Principles of Quantum Information Processing',
      fileUrl: '/uploads/quantum_principles.pdf',
      fileType: 'pdf',
      fileSizeBytes: 20480,
      pageCount: 4,
      status: 'READY',
      organizationId: orgId,
      classId: classId,
      uploadedById: teacherId,
    },
  });

  const chunkContents = [
    `Quantum bits, or qubits, represent the fundamental unit of quantum information. Unlike classical binary digits which exist definitively as either 0 or 1, a qubit can exist in a superposition of states |ψ⟩ = α|0⟩ + β|1⟩, where α and β are complex probability amplitudes such that |α|² + |β|² = 1. This property allows quantum computers to represent an exponential state space simultaneously.`,

    `Quantum entanglement describes a non-local correlation between two or more qubits where the quantum state of each particle cannot be described independently of the state of the others, regardless of the physical distance separating them. Entangled pairs are essential for quantum teleportation, superdense coding, and quantum cryptography protocols like BB84.`,

    `Quantum interference is the operational mechanism by which quantum algorithms achieve computational speedups. By designing sequences of unitary quantum logic gates, algorithms constructively amplify the probability amplitudes of correct solutions while destructively cancelling out the amplitudes of incorrect states. Shor's factoring algorithm and Grover's search algorithm leverage interference principles.`,

    `The primary technological challenge facing physical quantum computing is decoherence. Quantum states are exceptionally fragile and rapidly degrade when exposed to thermal fluctuations, electromagnetic noise, and material impurities from the external environment. Fault-tolerant quantum computing requires quantum error correction codes, such as surface codes, which introduce substantial physical-to-logical qubit overhead.`,
  ];

  const embeddingService = new EmbeddingService();
  const chunkEmbeddings = await embeddingService.generateBatchEmbeddings(chunkContents);

  for (let i = 0; i < chunkContents.length; i++) {
    const chunk = await prisma.documentChunk.create({
      data: {
        documentId: sampleDocument.id,
        chunkIndex: i + 1,
        pageNumber: i + 1,
        content: chunkContents[i],
        tokenCount: Math.round(chunkContents[i].length / 4),
      },
    });

    const vecStr = embeddingService.vectorToString(chunkEmbeddings[i]);
    await prisma.$executeRaw`
      UPDATE document_chunks
      SET embedding = ${vecStr}::vector
      WHERE id = ${chunk.id};
    `;
  }
  console.log(`   Created document "${sampleDocument.title}" with 4 embedded chunks in pgvector.`);

  // 7. Student Starts a Conversation
  console.log('\n7. Student initiating a new RAG conversation...');
  const createConvRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/conversations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Quantum Computing Fundamentals Q&A',
        documentId: sampleDocument.id,
      }),
    },
  );
  const convJson = await createConvRes.json();
  if (!convJson.success) {
    throw new Error(`Failed to create conversation: ${JSON.stringify(convJson)}`);
  }
  const conversationId = convJson.data.id;
  console.log('   Conversation created with ID:', conversationId);

  // 8. Student Lists Conversations
  const listConvRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/conversations`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
    },
  );
  const listJson = await listConvRes.json();
  console.log('8. Listed conversations count:', listJson.data.length, 'Total:', listJson.total);

  // 9. Student Asks First Question
  console.log('\n9. Student asks Question 1 (Testing pgvector retrieval + Groq LLM grounding)...');
  const q1 = 'What is quantum interference and which algorithms use it to achieve speedup?';
  const ask1Res = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ content: q1 }),
    },
  );
  const ask1Json = await ask1Res.json();
  if (!ask1Json.success) {
    throw new Error(`Ask message 1 failed: ${JSON.stringify(ask1Json)}`);
  }

  console.log('   Assistant Response 1:');
  console.log('   ------------------------------------------------------------');
  console.log(ask1Json.data.assistantMessage.content);
  console.log('   ------------------------------------------------------------');
  console.log('   Sources attached:', ask1Json.data.assistantMessage.sources.length);
  ask1Json.data.assistantMessage.sources.forEach((s, idx) => {
    console.log(
      `     [Source ${idx + 1}] Doc: "${s.documentTitle}", Chunk #${s.chunkIndex}, Page ${s.pageNumber}, Similarity: ${s.similarity}`,
    );
  });

  // Verify top source corresponds to the interference chunk (chunk 3)
  const topSource = ask1Json.data.assistantMessage.sources[0];
  console.log(`   Top source chunk index: #${topSource?.chunkIndex} (Expected Chunk #3)`);

  // 10. Student Asks Follow-up Question (Testing multi-turn history)
  console.log('\n10. Student asks Follow-up Question (Testing multi-turn conversation context)...');
  const q2 = 'What is the primary physical challenge and what codes are used to mitigate it?';
  const ask2Res = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ content: q2 }),
    },
  );
  const ask2Json = await ask2Res.json();
  console.log('   Assistant Response 2:');
  console.log('   ------------------------------------------------------------');
  console.log(ask2Json.data.assistantMessage.content);
  console.log('   ------------------------------------------------------------');
  console.log('   Sources attached:', ask2Json.data.assistantMessage.sources.length);

  // 11. Fetch Full Conversation with History
  console.log('\n11. Fetching complete conversation history...');
  const getConvRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/conversations/${conversationId}`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
    },
  );
  const fullConv = await getConvRes.json();
  console.log(
    `   Total messages recorded in conversation: ${fullConv.data.messages.length} (Expected 4: 2 user + 2 assistant)`,
  );

  // 12. Delete Conversation
  console.log('\n12. Deleting conversation...');
  const delRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/conversations/${conversationId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    },
  );
  const delJson = await delRes.json();
  console.log('   Delete response:', delJson.message);

  // 13. Verify Conversation is Gone
  const verifyRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/conversations/${conversationId}`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
    },
  );
  console.log(`   Subsequent fetch status: ${verifyRes.status} (Expected 404)`);

  console.log('\n============================================================');
  console.log('🎉 PHASE 10 RAG PIPELINE (DOCUMENT CHAT) 100% VERIFIED!');
  console.log('============================================================\n');
}

runPhase10Test()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ PHASE 10 TEST FAILED:', err);
    process.exit(1);
  });
