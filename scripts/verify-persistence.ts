/* eslint-disable */
import assert from 'node:assert/strict';

const BASE_URL = process.env.ARMS_URL || 'http://localhost:3000';
const CASE_ID = process.env.CHECK_CASE_ID || 'ARMS-2026-0169';
const EVIDENCE_ID = process.env.CHECK_EVIDENCE_ID || 'file-c1fd2a55-fb29-4ac8-b3ba-84a42e252b83';
const UT_ID = process.env.CHECK_UT_ID || 'a8e1a2f9-8439-496a-b10c-a0a05fa51f57';

async function login(userId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoUserId: userId }),
  });
  assert.equal(res.status, 200, `Login for ${userId} must return 200`);
  const data = (await res.json()) as any;
  return data.token;
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`  ARMS Post-Restart Persistence Verification Check    `);
  console.log(`  Verifying records survived server restart           `);
  console.log(`======================================================\n`);

  // 1. Verify Case survived restart
  const somikToken = await login('somik');
  const snapRes = await fetch(`${BASE_URL}/api/arms/snapshot`, {
    headers: { Authorization: `Bearer ${somikToken}` },
  });
  assert.equal(snapRes.status, 200, 'Snapshot must return 200');
  const snap = ((await snapRes.json()) as any).snapshot;
  const persistedCase = snap.cases.find((c: any) => c.id === CASE_ID);
  assert.ok(persistedCase, `Case ${CASE_ID} must survive server restart`);
  assert.equal(persistedCase.status, 'Under Investigation', `Case status must be preserved as Under Investigation`);
  console.log(`✔ Case record ${CASE_ID} successfully preserved across restart with status: ${persistedCase.status}`);

  // 2. Verify Evidence file survived restart and is downloadable
  const committeeToken = await login('committee');
  const fileRes = await fetch(`${BASE_URL}/api/files/${EVIDENCE_ID}`, {
    headers: { Authorization: `Bearer ${committeeToken}` },
  });
  assert.equal(fileRes.status, 200, `Evidence file ${EVIDENCE_ID} must be downloadable after restart`);
  const fileBytes = Buffer.from(await fileRes.arrayBuffer());
  assert.ok(fileBytes.length > 20, 'File bytes must be intact');
  assert.equal(fileBytes.subarray(0, 5).toString('latin1'), '%PDF-', 'File magic bytes must be preserved');
  console.log(`✔ Evidence file ${EVIDENCE_ID} (${fileBytes.length} bytes) successfully downloaded and verified intact`);

  // 3. Verify Undertaking record survived restart
  const adminToken = await login('admin');
  const adminSnapRes = await fetch(`${BASE_URL}/api/arms/snapshot`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminSnap = ((await adminSnapRes.json()) as any).snapshot;
  const persistedUt = adminSnap.undertakings.find((u: any) => u.id === UT_ID);
  assert.ok(persistedUt, `Undertaking ${UT_ID} must survive restart`);
  assert.equal(persistedUt.status, 'Accepted/Verified', 'Undertaking status must remain Accepted/Verified');
  assert.equal(persistedUt.submissions.length, 2, 'Both submissions must be preserved');
  assert.equal(persistedUt.reviews.length, 2, 'Both reviews must be preserved');
  console.log(`✔ Undertaking ${UT_ID} (status: ${persistedUt.status}, submissions: ${persistedUt.submissions.length}, reviews: ${persistedUt.reviews.length}) successfully verified`);

  console.log(`\n======================================================`);
  console.log(`  SERVER RESTART PERSISTENCE VERIFICATION: PASSED!    `);
  console.log(`======================================================\n`);
}

run().catch((err) => {
  console.error('\n❌ PERSISTENCE CHECK FAILED:', err);
  process.exit(1);
});
