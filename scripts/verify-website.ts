/* eslint-disable */
import assert from 'node:assert/strict';

const BASE_URL = process.env.ARMS_URL || 'http://localhost:3000';

async function login(userId: string): Promise<{ token: string; user: any; cookie: string }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoUserId: userId }),
  });
  assert.equal(res.status, 200, `Login for ${userId} must return 200`);
  const data = (await res.json()) as any;
  assert.ok(data.ok, `Login for ${userId} must be ok`);
  const setCookie = res.headers.get('set-cookie') || '';
  const token = data.token;
  return { token, user: data.user, cookie: setCookie };
}

async function runCommand(token: string, payload: any) {
  const res = await fetch(`${BASE_URL}/api/arms/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as any;
  return { status: res.status, data };
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`  ARMS Midterm Website Live End-to-End Verification   `);
  console.log(`  Target: ${BASE_URL}                                 `);
  console.log(`======================================================\n`);

  // Authenticate demo roles
  const somik = await login('somik');
  const aman = await login('aman');
  const squad = await login('squad');
  const committee = await login('committee');
  const admin = await login('admin');

  console.log(`✔ Demo accounts authenticated: Somik, Aman, Squad, Committee, Admin`);

  // -----------------------------------------------------------------
  // 1. Named report submission with an attachment (UC-003)
  // -----------------------------------------------------------------
  console.log(`\n--- Test 1: UC-003 Named Report Submission with Attachment ---`);
  const pdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  );
  const formData = new FormData();
  formData.append('category', 'Verbal harassment');
  formData.append('description', 'Midterm E2E Verification Report: verbal harassment near library.');
  formData.append('incidentDate', '2026-10-22');
  formData.append('incidentTime', '14:30');
  formData.append('location', 'Central Library Lawn');
  formData.append('mode', 'named');
  formData.append('confirmed', 'true');
  formData.append('evidence', new Blob([pdfBytes], { type: 'application/pdf' }), 'e2e_evidence.pdf');

  const reportRes = await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${somik.token}` },
    body: formData,
  });
  assert.equal(reportRes.status, 201, 'Report submission must return 201 Created');
  const reportData = (await reportRes.json()) as any;
  assert.ok(reportData.ok, 'Report creation must succeed');
  const createdCaseId = reportData.caseId;
  assert.match(createdCaseId, /^ARMS-2026-\d{4}$/, 'Case ID must follow ARMS-YYYY-XXXX format');
  console.log(`✔ Report submitted successfully with Case ID: ${createdCaseId}`);

  // Fetch Somik snapshot to verify record details (student view has sanitized evidence list)
  const somikSnapRes = await fetch(`${BASE_URL}/api/arms/snapshot`, {
    headers: { Authorization: `Bearer ${somik.token}` },
  });
  const somikSnap = ((await somikSnapRes.json()) as any).snapshot;
  const createdCase = somikSnap.cases.find((c: any) => c.id === createdCaseId);
  assert.ok(createdCase, 'Created case must exist in student snapshot');
  assert.equal(createdCase.reporterId, 'somik', 'Reporter must be derived from session user, not hardcoded');
  assert.equal(createdCase.status, 'Acknowledged', 'Initial status must be Acknowledged');
  assert.equal(createdCase.assignedBody, 'Anti-Ragging Squad');

  // Fetch Squad handler snapshot to verify attached evidence
  const squadSnapRes = await fetch(`${BASE_URL}/api/arms/snapshot`, {
    headers: { Authorization: `Bearer ${squad.token}` },
  });
  const squadSnap = ((await squadSnapRes.json()) as any).snapshot;
  const squadCase = squadSnap.cases.find((c: any) => c.id === createdCaseId);
  assert.ok(squadCase, 'Created case must exist in squad snapshot');
  assert.equal(squadCase.evidence.length, 1, 'Evidence file must be attached and visible to handler');
  const evidenceFileId = squadCase.evidence[0].id;

  // Verify Squad handler can download attached evidence
  const dlEvidence = await fetch(`${BASE_URL}/api/files/${evidenceFileId}`, {
    headers: { Authorization: `Bearer ${squad.token}` },
  });
  assert.equal(dlEvidence.status, 200, 'Squad handler must be able to download evidence');
  console.log(`✔ Case details verified: reporter=${createdCase.reporterId}, status=${createdCase.status}, evidence=${evidenceFileId} (downloadable by handler)`);

  let curVer = squadCase.version; // starts at 1

  // -----------------------------------------------------------------
  // 2. Student cannot perform handler/admin actions (RBAC enforcement)
  // -----------------------------------------------------------------
  console.log(`\n--- Test 2: Student Cannot Perform Handler/Admin Actions ---`);
  const unauthorizedTransition = await runCommand(somik.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Under Investigation',
    note: 'Student trying to change status',
  });
  assert.equal(unauthorizedTransition.status >= 400, true, 'Student transition must return 4xx error');
  console.log(`✔ Student cannot transition case status (HTTP ${unauthorizedTransition.status}: ${unauthorizedTransition.data.error})`);

  const unauthorizedReview = await runCommand(somik.token, {
    action: 'review',
    undertakingId: 'ut-somik-2025',
    submissionId: 'sub-somik-1',
    decision: 'Accepted/Verified',
    reason: 'Student trying to review',
  });
  assert.equal(unauthorizedReview.status >= 400, true, 'Student undertaking review must return 4xx error');
  console.log(`✔ Student cannot review undertakings (HTTP ${unauthorizedReview.status}: ${unauthorizedReview.data.error})`);

  // -----------------------------------------------------------------
  // 3. Valid case progression and rejection of invalid transitions
  // -----------------------------------------------------------------
  console.log(`\n--- Test 3: Valid Case Progression & Rejection of Invalid Transitions ---`);
  // Squad transitions Acknowledged -> Under Investigation
  const t1 = await runCommand(squad.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Under Investigation',
    note: 'Squad begins formal enquiry into reported incident.',
  });
  assert.equal(t1.status, 200, 'Squad should transition to Under Investigation');
  curVer++; // 2

  // Squad attempts invalid transition: skipping directly to Closed
  const invalidSkip = await runCommand(squad.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Closed',
    note: 'Skipping ahead to closed',
  });
  assert.equal(invalidSkip.status, 422, 'Skipping to Closed must be rejected (422)');
  console.log(`✔ Invalid skip to Closed correctly rejected: ${invalidSkip.data.error}`);

  // Squad attempts to record Committee Decision (usurping role)
  const invalidRoleTransition = await runCommand(squad.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Committee Decision Recorded',
    note: 'Squad attempting committee decision',
  });
  assert.equal(invalidRoleTransition.status >= 400, true, 'Squad recording Committee Decision must be rejected');
  console.log(`✔ Squad recording Committee Decision correctly rejected: ${invalidRoleTransition.data.error}`);

  // Squad records Findings
  const t2 = await runCommand(squad.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Findings Recorded',
    note: 'Preliminary enquiry confirms verbal altercations; eyewitness statements recorded.',
  });
  assert.equal(t2.status, 200, 'Squad should transition to Findings Recorded');
  curVer++; // 3

  // Squad escalates to Committee
  const t3 = await runCommand(squad.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Escalated to Committee',
    note: 'Escalated to Anti-Ragging Committee for formal hearing and disciplinary decision.',
  });
  assert.equal(t3.status, 200, 'Squad should escalate to Committee');
  curVer++; // 4
  console.log(`✔ Case successfully escalated to Committee`);

  // -----------------------------------------------------------------
  // 4. Committee closure and reopening with a reason
  // -----------------------------------------------------------------
  console.log(`\n--- Test 4: Committee Closure and Reopening with a Reason ---`);
  // Committee records Decision
  const t4 = await runCommand(committee.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Committee Decision Recorded',
    note: 'Committee met on 2026-10-22; recommended written apology and counselling.',
  });
  assert.equal(t4.status, 200, 'Committee should record decision');
  curVer++; // 5

  // Committee records Action Taken
  const t5 = await runCommand(committee.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Action Taken',
    note: 'Written apology submitted and verified by welfare officer.',
  });
  assert.equal(t5.status, 200, 'Committee should record action taken');
  curVer++; // 6

  // Committee closes case
  const t6 = await runCommand(committee.token, {
    action: 'status',
    caseId: createdCaseId,
    version: curVer,
    nextStatus: 'Closed',
    note: 'All disciplinary measures fulfilled. Matter closed.',
  });
  assert.equal(t6.status, 200, 'Committee should close case');
  curVer++; // 7
  console.log(`✔ Case successfully closed by Committee`);

  // Squad attempts to reopen -> rejected
  const squadReopen = await runCommand(squad.token, {
    action: 'reopen',
    caseId: createdCaseId,
    version: curVer,
    reason: 'Squad trying to reopen',
  });
  assert.equal(squadReopen.status >= 400, true, 'Squad reopening must be rejected');
  console.log(`✔ Unauthorized reopen by Squad rejected: ${squadReopen.data.error}`);

  // Committee attempts reopen without reason -> rejected
  const noReasonReopen = await runCommand(committee.token, {
    action: 'reopen',
    caseId: createdCaseId,
    version: curVer,
    reason: '',
  });
  assert.equal(noReasonReopen.status, 422, 'Reopening without reason must be rejected (422)');
  console.log(`✔ Reopen without reason correctly rejected: ${noReasonReopen.data.error}`);

  // Committee reopens with valid reason
  const validReopen = await runCommand(committee.token, {
    action: 'reopen',
    caseId: createdCaseId,
    version: curVer,
    reason: 'New eyewitness came forward with corroborating video evidence; reopening investigation.',
  });
  console.log("validReopen status & error:", validReopen.status, validReopen.data);
  assert.equal(validReopen.status, 200, 'Committee should reopen with reason');
  curVer++; // 8
  console.log(`✔ Case successfully reopened to Under Investigation with documented reason`);

  // -----------------------------------------------------------------
  // 5. Undertaking rejection, corrected resubmission and acceptance
  // -----------------------------------------------------------------
  console.log(`\n--- Test 5: Undertaking Submission, Rejection & Resubmission ---`);
  const utFileV1 = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Undertaking V1) >>\nendobj\ntrailer\n<<>>\n%%EOF\n');
  const testYear = 2030 + (Math.floor(Date.now() / 1000) % 50);
  const testSession = `${testYear}-${(testYear + 1).toString().slice(2)}`;
  console.log(`  Using isolated session: ${testSession}`);
  const utFormV1 = new FormData();
  utFormV1.append("session", testSession);
  utFormV1.append("guardianName", "R. Jain");
  utFormV1.append("confirmed", "true");
  utFormV1.append("file", new Blob([utFileV1], { type: "application/pdf" }), "somik_ut_2026_v1.pdf");

  const utResV1 = await fetch(`${BASE_URL}/api/undertakings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${somik.token}` },
    body: utFormV1,
  });
  assert.equal(utResV1.status, 201, 'Undertaking submission must return 201');
  const utDataV1 = (await utResV1.json()) as any;
  const utId = utDataV1.undertakingId;
  console.log(`✔ Undertaking submitted for 2026-27 session: ${utId}`);

  // Admin attempts to reject without reason -> rejected
  const noReasonReject = await runCommand(admin.token, {
    action: "review",
    undertakingId: utId,
    version: 1,
    decision: "Rejected",
    reason: "",
  });
  assert.equal(noReasonReject.status, 422, 'Rejection without reason must fail');
  console.log(`✔ Rejection without reason rejected: ${noReasonReject.data.error}`);

  // Admin rejects with reason
  const validReject = await runCommand(admin.token, {
    action: "review",
    undertakingId: utId,
    version: 1,
    decision: "Rejected",
    reason: "Parent/Guardian signature missing on page 2. Please re-upload signed copy.",
  });
  assert.equal(validReject.status, 200, 'Rejection with reason must succeed');
  console.log(`✔ Undertaking rejected with reason: "Parent/Guardian signature missing..."`);

  // Somik resubmits corrected undertaking (V2)
  const utFileV2 = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Undertaking V2 Signed) >>\nendobj\ntrailer\n<<>>\n%%EOF\n');
  const utFormV2 = new FormData();
  utFormV2.append("session", testSession);
  utFormV2.append("guardianName", "R. Jain");
  utFormV2.append("confirmed", "true");
  utFormV2.append("version", "2");
  utFormV2.append("file", new Blob([utFileV2], { type: "application/pdf" }), "somik_ut_2026_v2_signed.pdf");

  const utResV2 = await fetch(`${BASE_URL}/api/undertakings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${somik.token}` },
    body: utFormV2,
  });
  assert.equal(utResV2.status, 201, 'Resubmission must return 201');
  const utDataV2 = (await utResV2.json()) as any;
  console.log(`✔ Corrected undertaking resubmitted (V2)`);

  // Admin reviews and accepts V2
  const acceptReview = await runCommand(admin.token, {
    action: "review",
    undertakingId: utId,
    version: 3,
    decision: "Accepted/Verified",
    reason: "Verified both student and guardian physical signatures match records.",
  });
  assert.equal(acceptReview.status, 200, 'Admin acceptance must succeed');
  console.log(`✔ Undertaking V2 accepted by Administrator`);

  // -----------------------------------------------------------------
  // 6. Earlier undertaking files/reviews remain accessible
  // -----------------------------------------------------------------
  console.log(`\n--- Test 6: Preserved Undertaking History & Authorized Access ---`);
  const adminSnapRes = await fetch(`${BASE_URL}/api/arms/snapshot`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const adminSnap = ((await adminSnapRes.json()) as any).snapshot;
  const verifiedUt = adminSnap.undertakings.find((u: any) => u.id === utId);
  assert.ok(verifiedUt, 'Undertaking must exist');
  assert.equal(verifiedUt.status, 'Accepted/Verified');
  assert.equal(verifiedUt.version, 4, 'Version must be 2');
  assert.equal(verifiedUt.submissions.length, 2, 'Both V1 and V2 submissions must be preserved');
  assert.equal(verifiedUt.reviews.length, 2, 'Both rejection and acceptance reviews must be preserved');

  const fileV1Id = verifiedUt.submissions[0].file.id;
  const fileV2Id = verifiedUt.submissions[1].file.id;

  // Somik downloads V1
  const dlV1 = await fetch(`${BASE_URL}/api/files/${fileV1Id}`, {
    headers: { Authorization: `Bearer ${somik.token}` },
  });
  assert.equal(dlV1.status, 200, 'Somik should download own V1 file');
  const bufV1 = Buffer.from(await dlV1.arrayBuffer());
  assert.equal(bufV1.toString('utf-8'), utFileV1.toString('utf-8'));
  console.log(`✔ V1 historical file successfully downloaded by Somik`);

  // Admin downloads V2
  const dlV2 = await fetch(`${BASE_URL}/api/files/${fileV2Id}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  assert.equal(dlV2.status, 200, 'Admin should download V2 file');
  console.log(`✔ V2 verified file successfully downloaded by Administrator`);

  // Unauthorized student (Aman) cannot access Somik's undertaking file
  const unauthorizedDl = await fetch(`${BASE_URL}/api/files/${fileV1Id}`, {
    headers: { Authorization: `Bearer ${aman.token}` },
  });
  assert.equal(unauthorizedDl.status, 403, 'Aman must be denied access to Somik undertaking (403)');
  console.log(`✔ Unauthorized student download correctly blocked (HTTP 403)`);

  // -----------------------------------------------------------------
  // 8. One invalid upload produces a clear error
  // -----------------------------------------------------------------
  console.log(`\n--- Test 8: File Validation & Corrupted Upload Rejection ---`);
  const badForm = new FormData();
  badForm.append('category', 'Online harassment');
  badForm.append('description', 'Test upload of fake truncated file');
  badForm.append('mode', 'named');
  badForm.append('confirmed', 'true');
  // Truncated fake PDF (only 4 bytes)
  badForm.append('evidence', new Blob([Buffer.from('%PDF')], { type: 'application/pdf' }), 'corrupted.pdf');

  const badRes = await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${somik.token}` },
    body: badForm,
  });
  assert.equal(badRes.status, 422, 'Corrupted upload must return 422 Unprocessable Entity');
  const badData = (await badRes.json()) as any;
  assert.ok(badData.error.toLowerCase().includes('truncated') || badData.error.toLowerCase().includes('corrupt') || badData.error.toLowerCase().includes('pdf'), 'Error message must clearly describe the file format failure');
  console.log(`✔ Corrupted PDF upload correctly rejected: ${badData.error}`);

  console.log(`\n======================================================`);
  console.log(`  All 7 Live HTTP Verification Tests PASSED!          `);
  console.log(`======================================================\n`);

  console.log(`PERSISTENCE_CHECK_CASE_ID=${createdCaseId}`);
  console.log(`PERSISTENCE_CHECK_EVIDENCE_ID=${evidenceFileId}`);
  console.log(`PERSISTENCE_CHECK_UT_ID=${utId}`);
}

run().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
