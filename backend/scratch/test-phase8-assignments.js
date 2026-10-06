const BASE_URL = 'http://localhost:3000/api';

async function runPhase8Test() {
  console.log('--- STARTING PHASE 8 ASSESSMENT SCHEDULING, ATTEMPTS & AUTO-GRADING TEST ---');

  // 1. Register Teacher
  const teacherEmail = `prof_schedule_${Date.now()}@example.com`;
  const tRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: teacherEmail,
      password: 'Password123!',
      firstName: 'Edsger',
      lastName: 'Dijkstra',
    }),
  });
  const tData = await tRegRes.json();
  const teacherToken = tData.token;
  const teacherId = tData.user.id;
  console.log('1. Teacher registered:', teacherEmail);

  // 2. Register Student
  const studentEmail = `student_tester_${Date.now()}@example.com`;
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

  // 3. Organization & Memberships
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
  await prisma.membership.create({
    data: {
      userId: studentId,
      organizationId: orgId,
      role: 'STUDENT',
      isActive: true,
    },
  });
  console.log('3. Memberships created for Teacher and Student in org:', orgId);

  // 4. Create Class
  const classRes = await fetch(`${BASE_URL}/organizations/${orgId}/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      name: 'Network Routing & Graph Algorithms',
      code: `NET-${Date.now().toString().slice(-4)}`,
    }),
  });
  const classData = await classRes.json();
  const classId = classData.class.id;
  console.log('4. Class created:', classId);

  // 5. Enroll Student in Class
  await prisma.enrollment.create({
    data: {
      userId: studentId,
      classId,
    },
  });
  console.log('5. Student enrolled in class.');

  // 6. Create Published Assessment
  const assessmentRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        title: 'Shortest Path Algorithms Quiz',
        description: 'Testing Dijkstra and Bellman-Ford properties.',
        timeLimitMins: 20,
        passingScore: 60,
        questions: [
          {
            prompt:
              'Which algorithm finds the single-source shortest path with non-negative edge weights?',
            questionType: 'MULTIPLE_CHOICE',
            marks: 2.0,
            topic: 'Graph Theory',
            explanation:
              "Dijkstra's algorithm assumes all edge weights are non-negative to guarantee greedy optimality.",
            options: [
              { text: "Dijkstra's Algorithm", isCorrect: true },
              { text: 'Bellman-Ford Algorithm', isCorrect: false },
              { text: 'Kruskal Algorithm', isCorrect: false },
              { text: 'Prim Algorithm', isCorrect: false },
            ],
          },
          {
            prompt: 'Bellman-Ford algorithm can detect negative cycles in a directed graph.',
            questionType: 'TRUE_FALSE',
            marks: 1.0,
            topic: 'Graph Theory',
            explanation:
              'Running a |V|-th relaxation iteration and detecting further decrease indicates a negative cycle.',
            options: [
              { text: 'True', isCorrect: true },
              { text: 'False', isCorrect: false },
            ],
          },
        ],
      }),
    },
  );
  const assessmentData = await assessmentRes.json();
  const assessmentId = assessmentData.assessment.id;
  console.log('6. Assessment created in DRAFT:', assessmentId);

  // Publish assessment
  await fetch(`${BASE_URL}/organizations/${orgId}/classes/${classId}/assessments/${assessmentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
  console.log('6b. Assessment status updated to PUBLISHED.');

  // 7. Teacher schedules the assessment (Creates Assignment)
  console.log('7. Scheduling assessment assignment for the class...');
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
        maxAttempts: 2,
        revealScores: true,
        revealAnswers: true,
      }),
    },
  );
  const scheduleData = await scheduleRes.json();
  console.log('Schedule response status:', scheduleRes.status);
  const assignmentId = scheduleData.assignment.id;
  console.log(
    'Assignment scheduled:',
    assignmentId,
    'Max attempts:',
    scheduleData.assignment.maxAttempts,
  );

  // 8. Student starts test attempt #1
  console.log('8. Student starting test attempt #1...');
  const startRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    },
  );
  const startData = await startRes.json();
  console.log('Start attempt status:', startRes.status);
  const attempt = startData.attempt;
  console.log('Attempt started:', {
    attemptId: attempt.attemptId,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    questionsCount: attempt.questions.length,
  });

  // Verify answer security: No isCorrect or explanation leaked in test-taking view
  const q1 = attempt.questions[0];
  const q2 = attempt.questions[1];
  const leakedSecurity =
    q1.options.some((o) => o.isCorrect !== undefined) || q1.explanation !== undefined;
  if (leakedSecurity) {
    throw new Error(
      'SECURITY VIOLATION: Correct answers or explanations were leaked to test taker!',
    );
  }
  console.log('Test security verified: Answers and explanations properly masked from student.');

  // 9. Student submits answers: Q1 correct, Q2 wrong
  console.log('9. Student submitting test answers...');
  // Find correct option for Q1 from the test questions
  const q1CorrectOpt = assessmentData.assessment.questions[0].options.find((o) => o.isCorrect);
  // Choose incorrect option for Q2 ("False")
  const q2WrongOpt = assessmentData.assessment.questions[1].options.find((o) => !o.isCorrect);

  const submitRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts/${attempt.attemptId}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        responses: [
          {
            questionId: q1.id,
            selectedOptionId: q1CorrectOpt.id,
            timeSpentSecs: 35,
          },
          {
            questionId: q2.id,
            selectedOptionId: q2WrongOpt.id,
            timeSpentSecs: 15,
          },
        ],
      }),
    },
  );

  const submitData = await submitRes.json();
  console.log('Submit response status:', submitRes.status);
  const result = submitData.result;
  console.log('Auto-grading evaluation result:', {
    attemptId: result.id,
    status: result.status,
    scoreAchieved: result.scoreAchieved,
    scorePercent: result.scorePercent,
    scoresRevealed: result.scoresRevealed,
    answersRevealed: result.answersRevealed,
  });

  // Verify expected score: Q1 (2 marks) + Q2 (0 marks) = 2.0 / 3.0 = 66.67%
  if (result.scoreAchieved !== 2.0 || Math.round(result.scorePercent) !== 67) {
    throw new Error(
      `Auto-grading mismatch! Expected 2/3 (66.67%), got ${result.scoreAchieved} (${result.scorePercent}%)`,
    );
  }
  console.log('Auto-grading score calculation verified accurately: 2.0 / 3.0 (66.67%)');

  // 10. Student starts attempt #2 (allowed because maxAttempts = 2)
  console.log('10. Student starting attempt #2...');
  const start2Res = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    },
  );
  const start2Data = await start2Res.json();
  console.log('Attempt #2 started with attemptNumber:', start2Data.attempt.attemptNumber);

  // Submit attempt #2 (all correct this time)
  const q2CorrectOpt = assessmentData.assessment.questions[1].options.find((o) => o.isCorrect);
  const submit2Res = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts/${start2Data.attempt.attemptId}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        responses: [
          { questionId: q1.id, selectedOptionId: q1CorrectOpt.id },
          { questionId: q2.id, selectedOptionId: q2CorrectOpt.id },
        ],
      }),
    },
  );
  const submit2Data = await submit2Res.json();
  console.log('Attempt #2 result:', {
    scoreAchieved: submit2Data.result.scoreAchieved,
    scorePercent: submit2Data.result.scorePercent,
  });

  // 11. Student attempts to start attempt #3 (should be BLOCKED with 403)
  console.log('11. Student attempting attempt #3 (should exceed limit)...');
  const start3Res = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    },
  );
  console.log('Attempt #3 status code (expected 403):', start3Res.status);
  const start3Data = await start3Res.json();
  console.log('Attempt limit error message:', start3Data.message);

  if (start3Res.status !== 403) {
    throw new Error(`Expected 403 for attempt limit exceeded, got ${start3Res.status}`);
  }

  // 12. View Results (Student and Teacher)
  console.log('12. Viewing attempt results...');
  const viewRes = await fetch(
    `${BASE_URL}/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/attempts/${start2Data.attempt.attemptId}`,
    {
      headers: { Authorization: `Bearer ${studentToken}` },
    },
  );
  const viewData = await viewRes.json();
  console.log('Result view summary:', {
    attemptId: viewData.id,
    scorePercent: viewData.scorePercent,
    responsesCount: viewData.responses.length,
    firstResponse: {
      prompt: viewData.responses[0].prompt,
      marksAwarded: viewData.responses[0].marksAwarded,
      isCorrect: viewData.responses[0].isCorrect,
      explanation: viewData.responses[0].explanation,
    },
  });

  console.log('--- PHASE 8 ASSESSMENT SCHEDULING & AUTO-GRADING TEST PASSED 100%! ---');
}

runPhase8Test().catch((err) => {
  console.error('Phase 8 Test failed:', err);
  process.exit(1);
});
