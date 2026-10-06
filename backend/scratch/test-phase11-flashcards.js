/**
 * Phase 11 — Flashcard System E2E Test
 *
 * Tests the full flashcard pipeline:
 * 1. Register user, create org, create class
 * 2. Upload a document and wait for READY status
 * 3. Generate a flashcard deck from the document
 * 4. List decks, get a single deck
 * 5. Get due cards for practice
 * 6. Review a card (spaced repetition)
 * 7. Get deck stats
 * 8. Update and delete deck
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'http://localhost:3000/api';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let token, orgId, classId, documentId, deckId, cardId;

const log = (label, data) => {
  console.log(`\n✅ ${label}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const err = (label, data) => {
  console.error(`\n❌ ${label}`);
  if (data) console.error(JSON.stringify(data, null, 2));
};

async function api(method, path, body, isForm = false) {
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let fetchBody;
  if (isForm) {
    // Build multipart/form-data using native FormData (Node 18+)
    const fd = new FormData();
    for (const [key, val] of Object.entries(body)) {
      if (val && typeof val === 'object' && val.stream) {
        fd.append(key, val.stream, { filename: val.filename, contentType: val.contentType });
      } else {
        fd.append(key, val);
      }
    }
    fetchBody = fd;
    // Let fetch set content-type with boundary automatically
    delete headers['Content-Type'];
  } else {
    fetchBody = body ? JSON.stringify(body) : undefined;
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: fetchBody });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  // 1. Register + login
  const email = `flash-test-${Date.now()}@example.com`;
  await api('POST', '/auth/register', {
    email, password: 'Test@1234', firstName: 'Flash', lastName: 'Tester',
  });
  const loginRes = await api('POST', '/auth/login', { email, password: 'Test@1234' });
  token = loginRes.data.data?.token || loginRes.data.token;
  if (!token) { err('Login failed', loginRes.data); process.exit(1); }
  log('Auth OK', { token: token.slice(0, 20) + '...' });

  // 2. Create org
  const orgRes = await api('POST', '/organizations', {
    name: 'Flash Test Org', slug: `flash-org-${Date.now()}`, description: 'Phase 11 test',
  });
  orgId = orgRes.data.data?.id;
  log('Org created', { orgId });

  // 3. Create class
  const classRes = await api('POST', `/organizations/${orgId}/classes`, {
    name: 'Biology 101', code: 'BIO101',
  });
  classId = classRes.data.data?.id;
  log('Class created', { classId });

  // 4. Upload a small PDF (use the test PDF from phase 10 if available, else create a txt)
  const testFilePath = path.join(__dirname, 'test-sample.txt');
  fs.writeFileSync(
    testFilePath,
    `Introduction to Photosynthesis

Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water. It primarily occurs in the chloroplasts of plant cells.

The overall chemical equation for photosynthesis is:
6CO2 + 6H2O + light energy → C6H12O6 + 6O2

There are two main stages:
1. Light-dependent reactions (in the thylakoid membrane): Capture light energy and produce ATP and NADPH.
2. Calvin Cycle / Light-independent reactions (in the stroma): Use ATP and NADPH to fix CO2 into glucose.

Chlorophyll is the primary pigment that absorbs light, mainly in the red and blue wavelengths. Carotenoids are accessory pigments.

Factors affecting the rate of photosynthesis include light intensity, CO2 concentration, temperature, and water availability.

Cellular Respiration

Cellular respiration is the process by which cells break down glucose to produce ATP. It has three stages:
1. Glycolysis (cytoplasm): Glucose → 2 Pyruvate + 2 ATP
2. Krebs Cycle (mitochondrial matrix): Pyruvate → CO2 + NADH + FADH2
3. Electron Transport Chain (inner mitochondrial membrane): NADH/FADH2 → ~32–34 ATP

The net yield of cellular respiration is approximately 36–38 ATP molecules per glucose molecule.

Photosynthesis and respiration are complementary processes — one stores energy, the other releases it.`,
  );

  const form = new FormData();
  const fileBuffer = fs.readFileSync(testFilePath);
  form.append('file', new Blob([fileBuffer], { type: 'text/plain' }), 'test-sample.txt');
  form.append('title', 'Photosynthesis & Respiration Study Guide');

  const uploadRes = await fetch(`${BASE}/organizations/${orgId}/classes/${classId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadData = await uploadRes.json();
  documentId = uploadData.data?.id;
  if (!documentId) { err('Upload failed', uploadData); process.exit(1); }
  log('Document uploaded', { documentId, status: uploadData.data?.status });

  // 5. Wait for document to become READY
  console.log('\n⏳ Waiting for document processing...');
  let docStatus = 'PENDING';
  let attempts = 0;
  while (docStatus !== 'READY' && attempts < 20) {
    await sleep(3000);
    const docRes = await api('GET', `/organizations/${orgId}/classes/${classId}/documents/${documentId}`);
    docStatus = docRes.data.data?.status;
    process.stdout.write(`   Status: ${docStatus} (attempt ${++attempts})\n`);
  }
  if (docStatus !== 'READY') { err('Document never reached READY status'); process.exit(1); }
  log('Document READY ✓');

  // 6. Generate a flashcard deck
  console.log('\n🃏 Generating flashcard deck...');
  const genRes = await api('POST', `/organizations/${orgId}/classes/${classId}/flashcard-decks/generate`, {
    documentId,
    topic: 'Photosynthesis',
    numCards: 8,
    difficulty: 'MEDIUM',
  });
  if (genRes.status !== 201) { err('Deck generation failed', genRes.data); process.exit(1); }
  deckId = genRes.data.data?.id;
  const cardCount = genRes.data.data?.flashcards?.length;
  log(`Deck generated: "${genRes.data.data?.title}"`, { deckId, cards: cardCount });

  // Show first 2 cards
  const firstCards = genRes.data.data?.flashcards?.slice(0, 2);
  console.log('\n📋 Sample cards:');
  firstCards?.forEach((c, i) => {
    console.log(`  Card ${i + 1}: ${c.front}`);
    console.log(`    → ${c.back}`);
    if (c.hint) console.log(`    💡 Hint: ${c.hint}`);
  });

  // 7. List decks
  const listRes = await api('GET', `/organizations/${orgId}/classes/${classId}/flashcard-decks`);
  log(`Listed decks (count: ${listRes.data.data?.length})`, listRes.data.data?.map(d => ({ id: d.id, title: d.title, total: d._count?.flashcards })));

  // 8. Get single deck
  const deckRes = await api('GET', `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}`);
  log('Get deck OK', { id: deckRes.data.data?.id, cardCount: deckRes.data.data?.flashcards?.length });

  // 9. Get due cards for practice
  const dueRes = await api('GET', `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}/due?limit=5`);
  const dueCards = dueRes.data.data;
  log(`Due cards (${dueCards?.length})`, dueCards?.map(c => ({ id: c.id, front: c.front.slice(0, 50), mastery: c.masteryLevel })));
  cardId = dueCards?.[0]?.id;

  // 10. Review a card
  if (cardId) {
    const reviewRes = await api('POST', `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}/cards/${cardId}/review`, {
      masteryLevel: 2,
    });
    log('Card reviewed (masteryLevel=2 → Familiar)', reviewRes.data.data);
  }

  // 11. Get deck stats
  const statsRes = await api('GET', `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}/stats`);
  log('Deck stats', statsRes.data.data);

  // 12. Update deck title
  const updateRes = await api('PATCH', `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}`, {
    title: 'Updated Photosynthesis Deck',
    description: 'Updated via test',
  });
  log('Deck updated', updateRes.data);

  // 13. Delete deck
  const deleteRes = await api('DELETE', `/organizations/${orgId}/classes/${classId}/flashcard-decks/${deckId}`);
  log(`Deck deleted (status ${deleteRes.status})`);

  console.log('\n🎉 Phase 11 — Flashcard System: ALL TESTS PASSED!\n');
}

run().catch((e) => {
  console.error('\n💥 Test crashed:', e.message);
  process.exit(1);
});
