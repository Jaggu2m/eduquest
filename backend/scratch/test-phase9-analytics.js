const BASE_URL = 'http://localhost:3000/api';

async function runPhase9Test() {
  console.log('--- STARTING PHASE 9 LEARNING ANALYTICS FOUNDATION TEST ---');

  // 1. Register Teacher
  const teacherEmail = `prof_analytics_${Date.now()}@example.com`;
  const tRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: teacherEmail,
      password: 'Password123!',
      firstName: 'Ada',
      lastName: 'Lovelace',
    }),
  });
  const tData = await tRegRes.json();
  const teacherToken = tData.token;
  const teacherId = tData.user.id;
  console.log('1. Teacher registered:', teacherEmail);

  // 2. Register Student A & Student B
  const sARes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `student_a_${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'Alice',
      lastName: 'Smith',
    }),
  });
  const sAData = await sARes.json();
  const studentAToken = sAData.token;
  const studentAId = sAData.user.id;

  const sBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `student_b_${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'Bob',
      lastName: 'Jones',
    }),
  });
  const sBData = await sBRes.json();
  const studentBToken = sBData.token;
  const studentBId = sBData.user.id;
  console.log('2. Registered Student A and Student B.');

  // 3. Memberships
  const orgsRes = await fetch(`${BASE_URL}/organizations`);
  const orgs = await orgsRes.json();
  const orgId = orgs[0].id;

  const { prisma } = await import('../src/lib/prismaClient.js');
  await prisma.membership.createMany({
    data: [
      { userId: teacherId, organizationId: orgId, role: 'TEACHER', isActive: true },
      { userId: studentAId, organizationId: orgId, role: 'STUDENT', isActive: true },
      { userId: studentBId, organizationId: orgId, role: 'STUDENT', isActive: true },
    ],
  });
  console.log('3. Organization memberships assigned.');

  // 4. Create Class
  const classRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      name: 'Modern Database Architectures',
      code: `DB-${Date.now().toString().slice(-4)}`,
    }),
  });
  const classData = await classRes.json();
  const classId = classData.class.id;
  console.log('4. Class created:', classId);

  // 5. Enroll Students
  await prisma.enrollment.createMany({
    data: [
      { userId: studentAId, classId },
      { userId: studentBId, classId },
    ],
  });
  console.log('5. Both students enrolled in class.');

  // 6. Create & Publish Assessment with 2 distinct topics
  const assessmentRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        title: 'SQL vs NoSQL Mastery Quiz',
        description: 'Testing ACID, B-Trees, and CAP theorem.',
        timeLimitMins: 15,
        passingScore: 50,
        questions: [
          {
            prompt:
              'In relational databases, which property guarantees that transactions are all-or-nothing?',
            questionType: 'MULTIPLE_CHOICE',
            marks: 2.0,
            topic: 'Relational Databases',
            options: [
              { text: 'Atomicity', isCorrect: true },
              { text: 'Consistency', isCorrect: false },
              { text: 'Isolation', isCorrect: false },
              { text: 'Durability', isCorrect: false },
            ],
          },
          {
            prompt: 'Foreign key constraints are strictly enforced in core relational databases.',
            questionType: 'TRUE_FALSE',
            marks: 1.0,
            topic: 'Relational Databases',
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: false },
            ],
          },
          {
            prompt:
              'Which NoSQL data model organizes data as key-value pairs grouped into column families?',
            questionType: 'MULTIPLE_CHOICE',
            marks: 2.0,
            topic: 'NoSQL Architecture',
            options: [
              { text: 'Wide-Column Stores (e.g. Cassandra)', isCorrect: true },
              { text: 'Graph Databases (e.g. Neo4j)', isCorrect: false },
              { text: 'Document Stores (e.g. MongoDB)', isCorrect: false },
              { text: 'Relational Tables', isCorrect: false },
            ],
          },
        ],
      }),
    },
  );
  const assessmentData = await assessmentRes.json();
  const assessmentId = assessmentData.assessment.id;
  const questions = assessmentData.assessment.questions;
  const q1 = questions[0];
  const q2 = questions[1];
  const q3 = questions[2];

  // Publish assessment
  await fetch(`${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments/${assessmentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
  console.log('6. Assessment created with 3 questions across 2 topics and PUBLISHED.');

  // 7. Schedule Assignment
  const scheduleRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        assessmentId,
        maxAttempts: 1,
        revealScores: true,
        revealAnswers: true,
      }),
    },
  );
  const scheduleData = await scheduleRes.json();
  const assignmentId = scheduleData.assignment.id;
  console.log('7. Assignment scheduled:', assignmentId);

  // Helper option finders
  const getCorrectOpt = (q) => q.options.find((o) => o.isCorrect);
  const getWrongOpt = (q) => q.options.find((o) => !o.isCorrect);

  // 8. Student A attempts test
  // Answers: Q1 Correct, Q2 Correct, Q3 Incorrect
  // Relational: 100% (3/3 marks), NoSQL: 0% (0/2 marks) -> Total: 3.0 / 5.0 (60.0%)
  console.log('8. Student A starting and submitting test...');
  const aStartRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAToken}` },
    },
  );
  const aStartData = await aStartRes.json();
  const aAttemptId = aStartData.attempt.attemptId;

  const aSubmitRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts/${aAttemptId}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentAToken}`,
      },
      body: JSON.stringify({
        responses: [
          { questionId: q1.id, selectedOptionId: getCorrectOpt(q1).id, timeSpentSecs: 20 },
          { questionId: q2.id, selectedOptionId: getCorrectOpt(q2).id, timeSpentSecs: 10 },
          { questionId: q3.id, selectedOptionId: getWrongOpt(q3).id, timeSpentSecs: 30 },
        ],
      }),
    },
  );
  const aSubmitData = await aSubmitRes.json();
  console.log('Student A submitted: Score =', aSubmitData.result.scorePercent + '%');

  // 9. Student B attempts test
  // Answers: Q1 Correct, Q2 Incorrect, Q3 Correct
  // Relational: 50% (2/3 marks), NoSQL: 100% (2/2 marks) -> Total: 4.0 / 5.0 (80.0%)
  console.log('9. Student B starting and submitting test...');
  const bStartRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentBToken}` },
    },
  );
  const bStartData = await bStartRes.json();
  const bAttemptId = bStartData.attempt.attemptId;

  const bSubmitRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts/${bAttemptId}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentBToken}`,
      },
      body: JSON.stringify({
        responses: [
          { questionId: q1.id, selectedOptionId: getCorrectOpt(q1).id, timeSpentSecs: 25 },
          { questionId: q2.id, selectedOptionId: getWrongOpt(q2).id, timeSpentSecs: 15 },
          { questionId: q3.id, selectedOptionId: getCorrectOpt(q3).id, timeSpentSecs: 20 },
        ],
      }),
    },
  );
  const bSubmitData = await bSubmitRes.json();
  console.log('Student B submitted: Score =', bSubmitData.result.scorePercent + '%');

  // 10. Test Class Overview Analytics
  console.log('10. Testing GET /analytics/overview...');
  const overviewRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/analytics/overview`,
    {
      headers: { Authorization: `Bearer ${teacherToken}` },
    },
  );
  const overviewData = await overviewRes.json();
  console.log('Class Overview:', overviewData);

  if (overviewData.averageScorePercent !== 70) {
    throw new Error(`Expected class average 70%, got ${overviewData.averageScorePercent}%`);
  }
  if (overviewData.participationRate !== 100) {
    throw new Error(`Expected participation 100%, got ${overviewData.participationRate}%`);
  }

  // 11. Test Topic Mastery Analytics & Weak Topic Detection
  console.log('11. Testing GET /analytics/topics...');
  const topicsRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/analytics/topics?threshold=60`,
    {
      headers: { Authorization: `Bearer ${teacherToken}` },
    },
  );
  const topicsData = await topicsRes.json();
  console.log('Topic Mastery Summary:', {
    totalTopics: topicsData.topicsCount,
    weakTopicsCount: topicsData.weakTopicsCount,
    weakTopics: topicsData.weakTopics.map((t) => ({
      name: t.topicName,
      accuracy: t.accuracyPercent + '%',
      isAtRisk: t.isAtRisk,
    })),
    allTopics: topicsData.allTopics.map((t) => ({
      name: t.topicName,
      accuracy: t.accuracyPercent + '%',
    })),
  });

  const nosqlTopic = topicsData.allTopics.find((t) => t.topicName === 'NoSQL Architecture');
  if (nosqlTopic.accuracyPercent !== 50 || !nosqlTopic.isAtRisk) {
    throw new Error(
      `Expected NoSQL Architecture to be at risk with 50% accuracy! Got: ${nosqlTopic.accuracyPercent}%`,
    );
  }

  const rdbTopic = topicsData.allTopics.find((t) => t.topicName === 'Relational Databases');
  if (rdbTopic.accuracyPercent !== 75) {
    throw new Error(
      `Expected Relational Databases to have 75% accuracy (3/4)! Got: ${rdbTopic.accuracyPercent}%`,
    );
  }
  console.log('Topic Mastery & Weak Topic Detection verified accurately!');

  // 12. Test Question Difficulty Analysis
  console.log('12. Testing GET /analytics/questions...');
  const questionsRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/analytics/questions`,
    {
      headers: { Authorization: `Bearer ${teacherToken}` },
    },
  );
  const questionsData = await questionsRes.json();
  console.log(
    'Question Difficulty Indices:',
    questionsData.map((q) => ({
      prompt: q.prompt.slice(0, 45) + '...',
      difficultyIndex: q.difficultyIndex,
      category: q.difficultyCategory,
      avgTime: q.averageTimeSpentSecs + 's',
    })),
  );

  const item1 = questionsData.find((q) => q.questionId === q1.id);
  if (item1.difficultyIndex !== 1.0 || item1.difficultyCategory !== 'EASY') {
    throw new Error(
      `Expected Q1 difficultyIndex 1.0 (EASY), got ${item1.difficultyIndex} (${item1.difficultyCategory})`,
    );
  }

  // 13. Test Student A Personal Analytics
  console.log('13. Testing GET /analytics/students/:studentAId...');
  const sAReportRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/analytics/students/${studentAId}`,
    {
      headers: { Authorization: `Bearer ${studentAToken}` },
    },
  );
  const sAReport = await sAReportRes.json();
  console.log('Student A Personal Analytics:', {
    averageScore: sAReport.averageScorePercent + '%',
    strengths: sAReport.strengths.map((s) => s.topicName),
    weaknesses: sAReport.weaknesses.map((w) => w.topicName),
    topicMastery: sAReport.topicMastery,
  });

  if (!sAReport.strengths.some((s) => s.topicName === 'Relational Databases')) {
    throw new Error('Expected Relational Databases to be listed under Student A strengths!');
  }
  if (!sAReport.weaknesses.some((w) => w.topicName === 'NoSQL Architecture')) {
    throw new Error('Expected NoSQL Architecture to be listed under Student A weaknesses!');
  }

  // 14. Access Guard: Student B cannot view Student A analytics
  console.log('14. Testing security: Student B viewing Student A report (expected 403)...');
  const guardRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/analytics/students/${studentAId}`,
    {
      headers: { Authorization: `Bearer ${studentBToken}` },
    },
  );
  console.log('Guard response status (expected 403):', guardRes.status);
  if (guardRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden, got ${guardRes.status}`);
  }

  console.log('--- PHASE 9 LEARNING ANALYTICS FOUNDATION TEST PASSED 100%! ---');
}

runPhase9Test().catch((err) => {
  console.error('Phase 9 Test failed:', err);
  process.exit(1);
});
