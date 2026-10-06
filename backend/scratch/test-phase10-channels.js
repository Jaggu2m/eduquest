/**
 * Phase 10 — Enterprise Discussion Platform E2E Test
 *
 * Tests the full channel/messaging pipeline:
 * 1. Register teacher + student, create org + class
 * 2. Teacher creates a channel
 * 3. Teacher adds student as channel member
 * 4. Teacher posts a message
 * 5. Student reads message history (cursor-based)
 * 6. Student replies to the message (threaded)
 * 7. Teacher edits their message
 * 8. Student marks message as read
 * 9. Teacher soft-deletes their message
 * 10. Teacher deletes the channel
 *
 * Run: node scratch/test-phase10-channels.js
 * (Requires backend running on localhost:3000)
 */

import { prisma } from '../src/lib/prismaClient.js';

const BASE = 'http://localhost:3000/api';

let teacherToken, studentToken;
let orgId, classId, channelId, messageId, replyId;

const log = (label, data) => {
  console.log(`\n✅ ${label}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const fail = (label, data) => {
  console.error(`\n❌ ${label}`);
  if (data) console.error(JSON.stringify(data, null, 2));
  process.exit(1);
};

async function api(method, path, body, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function assertOk({ status, data }, label) {
  if (status >= 400) fail(`${label} — HTTP ${status}`, data);
}

const uid = Date.now();
const teacherEmail = `teacher-${uid}@test.com`;
const teacherPass = 'Password123!';

async function setup() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' Phase 10 — Discussion Platform E2E Test');
  console.log('══════════════════════════════════════════════');

  // 1. Register teacher
  let r = await api('POST', '/auth/register', {
    email: teacherEmail,
    password: teacherPass,
    firstName: 'Dr.',
    lastName: 'Smith',
  });
  assertOk(r, 'Register teacher');
  const teacherId = r.data.data?.user?.id || r.data.user?.id;
  log('Teacher registered', { email: teacherEmail });

  // 1b. Promote teacher to platform admin directly via Prisma
  await prisma.user.update({
    where: { id: teacherId },
    data: { isPlatformAdmin: true },
  });
  log('Teacher promoted to platform admin');

  // 1c. Re-login to get a fresh JWT with isPlatformAdmin: true
  r = await api('POST', '/auth/login', { email: teacherEmail, password: teacherPass });
  assertOk(r, 'Teacher login');
  teacherToken = r.data.data?.token || r.data.token;
  log('Teacher logged in with admin JWT');

  // 2. Register student
  r = await api('POST', '/auth/register', {
    email: `student-${uid}@test.com`,
    password: 'Password123!',
    firstName: 'Alice',
    lastName: 'Johnson',
  });
  assertOk(r, 'Register student');
  studentToken = r.data.data?.token || r.data.token;
  const studentId = r.data.data?.user?.id || r.data.user?.id;
  log('Student registered', { email: `student-${uid}@test.com`, studentId });

  // 3. Create organization
  r = await api('POST', '/organizations', {
    name: `Test Org ${uid}`,
    slug: `test-org-${uid}`,
  }, teacherToken);
  assertOk(r, 'Create organization');
  orgId = r.data.data?.id || r.data.id;
  log('Organization created', { orgId });

  // 4. Create class
  r = await api('POST', `/organizations/${orgId}/classes`, {
    name: `Physics 101 ${uid}`,
    code: 'PHY-101',
  }, teacherToken);
  assertOk(r, 'Create class');
  classId = r.data.class?.id || r.data.data?.id || r.data.id;
  log('Class created', { classId });

  // 5. Add student as org member
  r = await api('POST', `/organizations/${orgId}/members`, {
    userId: studentId,
    role: 'STUDENT',
  }, teacherToken);
  assertOk(r, 'Add student to org');
  log('Student added to organization');

  // 6. Enroll student in class
  r = await api('POST', `/organizations/${orgId}/classes/${classId}/enrollments`, {
    userId: studentId,
  }, teacherToken);
  assertOk(r, 'Enroll student');
  log('Student enrolled in class');

  return studentId;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testCreateChannel() {
  console.log('\n── Test 1: Teacher creates a channel ──');
  const r = await api(
    'POST',
    `/organizations/${orgId}/classes/${classId}/channels`,
    { name: 'General Discussion', description: 'Open channel for all questions' },
    teacherToken,
  );
  assertOk(r, 'Create channel');
  channelId = r.data.data?.id;
  if (!channelId) fail('No channelId returned', r.data);
  log('Channel created', { channelId, name: r.data.data?.name });
}

async function testListChannels() {
  console.log('\n── Test 2: Teacher lists channels ──');
  const r = await api('GET', `/organizations/${orgId}/classes/${classId}/channels`, null, teacherToken);
  assertOk(r, 'List channels');
  const channels = r.data.data;
  if (!Array.isArray(channels) || channels.length === 0) fail('Expected at least 1 channel', r.data);
  log(`Found ${channels.length} channel(s)`, channels.map(c => ({ id: c.id, name: c.name })));
}

async function testAddStudentToChannel(studentId) {
  console.log('\n── Test 3: Teacher adds student to channel ──');
  const r = await api(
    'POST',
    `/organizations/${orgId}/classes/${classId}/channels/${channelId}/members`,
    { userId: studentId },
    teacherToken,
  );
  assertOk(r, 'Add student to channel');
  log('Student added to channel', r.data.data);
}

async function testPostMessage() {
  console.log('\n── Test 4: Teacher posts a message ──');
  const r = await api(
    'POST',
    `/organizations/${orgId}/classes/${classId}/channels/${channelId}/messages`,
    { content: 'Welcome to the General Discussion channel! Feel free to ask any questions.' },
    teacherToken,
  );
  assertOk(r, 'Post message');
  messageId = r.data.data?.id;
  if (!messageId) fail('No messageId returned', r.data);
  log('Message posted', { messageId, content: r.data.data?.content, sender: r.data.data?.sender });
}

async function testGetMessageHistory() {
  console.log('\n── Test 5: Student reads message history ──');
  const r = await api(
    'GET',
    `/organizations/${orgId}/classes/${classId}/channels/${channelId}/messages`,
    null,
    studentToken,
  );
  assertOk(r, 'Get message history');
  const messages = r.data.data;
  if (!Array.isArray(messages) || messages.length === 0) fail('Expected messages in history', r.data);
  log(`Got ${messages.length} message(s)`, messages.map(m => ({
    id: m.id,
    content: m.content,
    sender: m.sender?.firstName,
    replies: m.replies?.length ?? 0,
  })));
  console.log('  nextCursor:', r.data.nextCursor);
}

async function testThreadedReply() {
  console.log('\n── Test 6: Student posts a threaded reply ──');
  const r = await api(
    'POST',
    `/organizations/${orgId}/classes/${classId}/channels/${channelId}/messages`,
    { content: 'Thank you! I have a question about Newton\'s laws.', parentId: messageId },
    studentToken,
  );
  assertOk(r, 'Post threaded reply');
  replyId = r.data.data?.id;
  if (!replyId) fail('No replyId returned', r.data);
  log('Threaded reply posted', {
    replyId,
    parentId: r.data.data?.parentId,
    sender: r.data.data?.sender?.firstName,
  });
}

async function testEditMessage() {
  console.log('\n── Test 7: Teacher edits their message ──');
  const r = await api(
    'PATCH',
    `/organizations/${orgId}/classes/${classId}/channels/${channelId}/messages/${messageId}`,
    { content: 'Welcome to the General Discussion channel! Feel free to ask any questions. 🎓' },
    teacherToken,
  );
  assertOk(r, 'Edit message');
  log('Message edited', r.data.data);
}

async function testMarkRead() {
  console.log('\n── Test 8: Student marks message as read ──');
  const r = await api(
    'POST',
    `/organizations/${orgId}/classes/${classId}/channels/${channelId}/messages/${messageId}/read`,
    null,
    studentToken,
  );
  if (r.status !== 204 && r.status !== 200) fail(`Expected 204 got ${r.status}`, r.data);
  log('Message marked as read ✓');
}

async function testDeleteMessage() {
  console.log('\n── Test 9: Teacher soft-deletes their message ──');
  const r = await api(
    'DELETE',
    `/organizations/${orgId}/classes/${classId}/channels/${channelId}/messages/${messageId}`,
    null,
    teacherToken,
  );
  assertOk(r, 'Soft-delete message');
  log('Message soft-deleted', r.data.data);
}

async function testDeleteChannel() {
  console.log('\n── Test 10: Teacher deletes the channel ──');
  const r = await api(
    'DELETE',
    `/organizations/${orgId}/classes/${classId}/channels/${channelId}`,
    null,
    teacherToken,
  );
  if (r.status !== 204 && r.status !== 200) fail(`Expected 204 got ${r.status}`, r.data);
  log('Channel deleted ✓');
}

async function testStudentCannotCreateChannel() {
  console.log('\n── Test 11: Student CANNOT create a channel (403 expected) ──');
  // First create a new channel as teacher
  const c = await api(
    'POST',
    `/organizations/${orgId}/classes/${classId}/channels`,
    { name: 'Announcements' },
    teacherToken,
  );
  assertOk(c, 'Pre-test create channel');

  // Attempt as student
  const r = await api(
    'POST',
    `/organizations/${orgId}/classes/${classId}/channels`,
    { name: 'Hacked Channel' },
    studentToken,
  );
  if (r.status !== 403) fail(`Expected 403 but got ${r.status}`, r.data);
  log('Student correctly blocked from creating channels (403) ✓');
}

// ── Run all ───────────────────────────────────────────────────────────────────

async function run() {
  try {
    const studentId = await setup();
    await testCreateChannel();
    await testListChannels();
    await testAddStudentToChannel(studentId);
    await testPostMessage();
    await testGetMessageHistory();
    await testThreadedReply();
    await testEditMessage();
    await testMarkRead();
    await testDeleteMessage();
    await testDeleteChannel();
    await testStudentCannotCreateChannel();

    console.log('\n══════════════════════════════════════════════');
    console.log(' ✅ All Phase 10 tests passed!');
    console.log('══════════════════════════════════════════════\n');
  } catch (e) {
    console.error('\n💥 Unexpected error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

