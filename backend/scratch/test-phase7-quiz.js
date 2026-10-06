const BASE_URL = 'http://localhost:3000/api';

async function runPhase7Test() {
  console.log('--- STARTING PHASE 7 AI QUIZ GENERATION & ASSESSMENT TEST ---');

  // 1. Register a teacher
  const email = `prof_quiz_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Password123!',
      firstName: 'Barbara',
      lastName: 'Liskov',
    }),
  });
  const regData = await regRes.json();
  const token = regData.token;
  const teacherId = regData.user.id;
  console.log('1. Registered teacher:', email, 'ID:', teacherId);

  // 2. Fetch existing organization and grant TEACHER role
  const orgsRes = await fetch(`${BASE_URL}/organizations`);
  const orgs = await orgsRes.json();
  const orgId = orgs[0].id;

  const { prisma } = await import('../src/lib/prismaClient.js');
  await prisma.membership.create({
    data: {
      userId: teacherId,
      organizationId: orgId,
      role: 'TEACHER',
      isActive: true,
    },
  });
  console.log('2. Associated TEACHER with organization:', orgId);

  // 3. Create a class
  const classRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Distributed Systems & Fault Tolerance',
      code: `CS602-${Date.now().toString().slice(-4)}`,
      description: 'Consensus protocols, Raft, Paxos, and replication.',
    }),
  });
  const classData = await classRes.json();
  const classId = classData.class.id;
  console.log('3. Class created:', classId, classData.class.name);

  // 4. Upload a study document
  const studyNotes = `
Raft is a consensus algorithm designed as an alternative to Paxos. It was created to enhance understandability and formal verification.

Raft achieves consensus via an elected leader. The leader node accepts log entries from clients, replicates them across other servers, and tells servers when it is safe to apply log entries to their state machines.

Key Roles in Raft:
1. Leader: Handles all client requests, manages log replication, and maintains consistency.
2. Follower: Passive state, responds only to requests from leaders and candidates.
3. Candidate: Used during leader election to collect votes from peers.

Leader Election:
When followers stop receiving periodic heartbeats from the leader, an election timeout triggers. A follower transitions to Candidate, increments the term counter, votes for itself, and sends RequestVote RPCs to all other nodes. If it gains a majority of votes, it becomes the new Leader.

Log Replication:
The leader appends client commands as new entries in its log, then sends AppendEntries RPCs to replicate the entries across followers. An entry is committed once a majority of nodes have written it to their logs.
  `.trim();

  const formData = new FormData();
  const blob = new Blob([studyNotes], { type: 'text/plain' });
  formData.append('file', blob, 'raft-consensus.txt');
  formData.append('title', 'Raft Consensus Protocol Study Notes');

  const uploadRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes/${classId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const uploadData = await uploadRes.json();
  const docId = uploadData.document.id;
  console.log('4. Document uploaded:', docId, 'Waiting for BullMQ extraction...');

  // Wait for document to reach READY
  let attempts = 0;
  let docReady = false;
  while (attempts < 15) {
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
    const checkDoc = await fetch(
      `${BASE_URL}/organizations/${orgId}/classes/${classId}/documents/${docId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const docData = await checkDoc.json();
    if (docData.status === 'READY') {
      docReady = true;
      console.log(`Document ready on attempt ${attempts}.`);
      break;
    }
  }

  if (!docReady) {
    throw new Error('Document processing timed out.');
  }

  // 5. Generate Quiz via Groq AI
  console.log('5. Calling AI Quiz Generation endpoint with Groq...');
  const genRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        documentId: docId,
        numQuestions: 3,
        questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE'],
        difficulty: 'MEDIUM',
        timeLimitMins: 15,
        passingScore: 70,
        customPrompt: 'Focus on leader election and log replication conditions.',
      }),
    },
  );

  const genData = await genRes.json();
  console.log('Generation response status:', genRes.status);
  console.log('Generated assessment:', {
    id: genData.assessment?.id,
    title: genData.assessment?.title,
    status: genData.assessment?.status,
    type: genData.assessment?.type,
    totalMarks: genData.assessment?.totalMarks,
    questionsCount: genData.assessment?.questions?.length,
  });

  const assessmentId = genData.assessment.id;
  const firstQuestion = genData.assessment.questions[0];
  console.log('Sample generated question #1:', {
    prompt: firstQuestion.prompt,
    type: firstQuestion.questionType,
    marks: firstQuestion.marks,
    topic: firstQuestion.topic?.name,
    options: firstQuestion.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    explanation: firstQuestion.explanation,
  });

  // 6. Review: Update Question #1 marks and prompt (Teacher editing)
  console.log('6. Teacher reviewing and updating question #1...');
  const updateQRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments/${assessmentId}/questions/${firstQuestion.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt: `${firstQuestion.prompt} [Reviewed by Instructor]`,
        marks: 2.0,
      }),
    },
  );
  const updatedQData = await updateQRes.json();
  console.log('Updated question marks:', updatedQData.question.marks);

  // 7. Approve & Publish Assessment (DRAFT -> PUBLISHED)
  console.log('7. Approving & publishing assessment...');
  const publishRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments/${assessmentId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'PUBLISHED',
      }),
    },
  );
  const publishData = await publishRes.json();
  console.log('Published assessment status:', publishData.assessment.status);

  // 8. Test Manual Assessment Creation (TEACHER_CREATED)
  console.log('8. Testing manual assessment creation...');
  const manualRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Midterm Quiz: Byzantine Faults',
        description: 'Manual quiz on Lamport timestamps and PBFT.',
        timeLimitMins: 30,
        passingScore: 60,
        questions: [
          {
            prompt: 'In PBFT, what fraction of nodes can be faulty?',
            questionType: 'MULTIPLE_CHOICE',
            marks: 3.0,
            topic: 'Byzantine Fault Tolerance',
            explanation: 'PBFT requires 3f + 1 total nodes to tolerate f faulty nodes (< 1/3).',
            options: [
              { text: 'Strictly less than 1/3', isCorrect: true },
              { text: 'Strictly less than 1/2', isCorrect: false },
              { text: 'Exactly 2/3', isCorrect: false },
              { text: 'Zero', isCorrect: false },
            ],
          },
        ],
      }),
    },
  );
  const manualData = await manualRes.json();
  console.log('Manual assessment created:', manualData.assessment.id, manualData.assessment.type);

  // 9. List assessments in class with status filter
  console.log('9. Listing PUBLISHED assessments in class...');
  const listRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments?status=PUBLISHED`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const listData = await listRes.json();
  console.log(
    `Found ${listData.assessments.length} published assessments. Total: ${listData.pagination.total}`,
  );

  // 10. Soft-delete assessment
  console.log('10. Soft-deleting manual assessment...');
  const delRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments/${manualData.assessment.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const delData = await delRes.json();
  console.log('Delete response:', delData.message);

  console.log('--- PHASE 7 AI QUIZ GENERATION & ASSESSMENT TEST PASSED 100%! ---');
}

runPhase7Test().catch((err) => {
  console.error('Phase 7 Test failed:', err);
  process.exit(1);
});
