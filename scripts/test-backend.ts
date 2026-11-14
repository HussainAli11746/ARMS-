process.env.ARMS_TEST_ISOLATED = '1';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getState, resetDatabase, createSession, verifyCredentials, getUserBySession, getFile, saveFile } from '../lib/arms/db.ts';
import { applyCommand, publicSnapshot, authorizedFile } from '../lib/arms/service.ts';
import { validateFileBytes } from '../lib/arms/upload.ts';

void test('ARMS Backend Test Suite', async (t) => {
  await resetDatabase();

  await t.test('1. Authentication & Demo Accounts', () => {
    // Valid login
    const somik = verifyCredentials('somik@arms.test', 'ArmsDemo2026!');
    assert.ok(somik, 'Somik should be verified');
    assert.equal(somik?.role, 'student');
    assert.equal(somik?.name, 'Somik Jain');

    // Invalid password
    const invalid = verifyCredentials('somik@arms.test', 'WrongPassword');
    assert.equal(invalid, null);

    // Session token
    const token = createSession(somik.id);
    const sessionUser = getUserBySession(token);
    assert.equal(sessionUser?.id, 'somik');

    // Aman
    const aman = verifyCredentials('aman@arms.test', 'ArmsDemo2026!');
    assert.ok(aman);
    assert.equal(aman?.id, 'aman');

    // Squad & Committee
    const squad = verifyCredentials('squad@arms.test', 'ArmsDemo2026!');
    assert.equal(squad?.role, 'squad');
    const committee = verifyCredentials('committee@arms.test', 'ArmsDemo2026!');
    assert.equal(committee?.role, 'committee');
    const admin = verifyCredentials('admin@arms.test', 'ArmsDemo2026!');
    assert.equal(admin?.role, 'administrator');
  });

  await t.test('2. UC-003 Report Submission (Acting user derived from session, never hardcoded)', () => {
    const { state } = getState();
    const aman = state.users.find(u => u.id === 'aman')!;

    // Wrong role rejection (Squad member cannot file report)
    const squad = state.users.find(u => u.id === 'squad')!;
    assert.throws(() => {
      applyCommand(state, squad, {
        action: 'report',
        requestKey: 'req-wrong-role',
        category: 'Verbal harassment',
        description: 'Squad filing report',
        confirmed: true,
      });
    }, /not permitted/);

    // Aman files a named report
    const caseId = applyCommand(state, aman, {
      action: 'report',
      requestKey: 'req-aman-01',
      category: 'Physical intimidation',
      description: 'Confrontation in cafeteria',
      incidentDate: '2026-09-19',
      incidentTime: '13:00',
      location: 'Cafeteria',
      people: 'Senior student',
      confirmed: true,
      mode: 'named',
    });

    const created = state.cases.find(c => c.id === caseId);
    assert.ok(created, 'Case should be created');
    assert.equal(created?.reporterId, 'aman', 'Reporter MUST be Aman, not hardcoded Somik');
    assert.equal(created?.status, 'Acknowledged');
    assert.equal(created?.initialBody, 'Anti-Ragging Squad');
    assert.equal(created?.assignedBody, 'Anti-Ragging Squad');

    // Idempotency: duplicate submission returns existing caseId
    const dupCaseId = applyCommand(state, aman, {
      action: 'report',
      requestKey: 'req-aman-01',
      category: 'Physical intimidation',
      description: 'Confrontation in cafeteria duplicate',
      confirmed: true,
      mode: 'named',
    });
    assert.equal(dupCaseId, caseId, 'Duplicate requestKey must return existing case ID');

    // Anonymous report
    const anonCaseId = applyCommand(state, aman, {
      action: 'report',
      requestKey: 'req-anon-01',
      category: 'Online harassment',
      description: 'Anonymous report of cyber harassment',
      confirmed: true,
      mode: 'anonymous',
    });
    const anonCase = state.cases.find(c => c.id === anonCaseId);
    assert.ok(anonCase);
    assert.equal(anonCase?.reporterId, null, 'Anonymous report MUST have null reporterId');
    assert.equal(anonCase?.reportMode, 'anonymous');
    assert.equal(anonCase?.initialBody, 'Anti-Ragging Committee', 'Online harassment routes to Committee');
    assert.equal(anonCase?.assignedBody, 'Anti-Ragging Committee');
  });

  await t.test('3. Optional Incident Details Validation', () => {
    const { state } = getState();
    const somik = state.users.find(u => u.id === 'somik')!;

    // Optional date, time, location omitted is valid
    const caseId = applyCommand(state, somik, {
      action: 'report',
      requestKey: 'req-optional-test',
      category: 'Verbal harassment',
      description: 'Details unknown except description',
      incidentDate: '',
      incidentTime: '',
      location: '',
      people: '',
      confirmed: true,
      mode: 'named',
    });
    const c = state.cases.find(c => c.id === caseId);
    assert.ok(c);
    assert.equal(c?.incidentDate, '');
    assert.equal(c?.location, '');

    // Future date rejected
    assert.throws(() => {
      applyCommand(state, somik, {
        action: 'report',
        requestKey: 'req-future-date',
        category: 'Verbal harassment',
        description: 'Future date test',
        incidentDate: '2030-01-01',
        confirmed: true,
      });
    }, /cannot be dated in the future/);
  });

  await t.test('4. Evidence Magic Byte & Size Validation', () => {
    // Valid PDF
    const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\nxref\ntrailer\n<<>>\nstartxref\n0\n%%EOF');
    const pdfRes = validateFileBytes('test.pdf', validPdf);
    assert.equal(pdfRes.mime, 'application/pdf');

    // Valid PNG
    const validPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d400000000049454e44ae426082', 'hex');
    const pngRes = validateFileBytes('test.png', validPng);
    assert.equal(pngRes.mime, 'image/png');

    // Invalid file (e.g. text/exe pretending to be PDF)
    const fakePdf = Buffer.from('This is not a pdf file at all');
    assert.throws(() => {
      validateFileBytes('fake.pdf', fakePdf);
    }, /Invalid file format/);

    // Truncated 4-byte fake PDF without %%EOF
    const truncatedPdf = Buffer.from('%PDF');
    assert.throws(() => {
      validateFileBytes('truncated.pdf', truncatedPdf);
    }, /truncated or empty/);

    // Header-only PDF missing %%EOF
    const missingEofPdf = Buffer.from('%PDF-1.4 header without trailer or eof marker');
    assert.throws(() => {
      validateFileBytes('corrupt.pdf', missingEofPdf);
    }, /truncated or corrupted/);

    // Oversized file (> 10MB)
    const oversized = Buffer.alloc(11 * 1024 * 1024);
    assert.throws(() => {
      validateFileBytes('large.pdf', oversized);
    }, /exceeds maximum permitted size/);
  });

  await t.test('5. Complete Case Workflow & Role Transitions', () => {
    const { state } = getState();
    const somik = state.users.find(u => u.id === 'somik')!;
    const squad = state.users.find(u => u.id === 'squad')!;
    const committee = state.users.find(u => u.id === 'committee')!;

    // Create a new Squad case
    const caseId = applyCommand(state, somik, {
      action: 'report',
      requestKey: 'req-workflow-test',
      category: 'Physical intimidation',
      description: 'Hostel corridor incident',
      confirmed: true,
      mode: 'named',
    });
    const c = state.cases.find(c => c.id === caseId)!;
    assert.equal(c.status, 'Acknowledged');

    // Squad advances: Acknowledged -> Under Investigation
    applyCommand(state, squad, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Under Investigation',
      note: 'Squad began witness enquiries.',
    });
    assert.equal(c.status, 'Under Investigation');

    // Handler attaches additional evidence during investigation
    applyCommand(state, squad, {
      action: 'evidence',
      caseId,
      version: c.version,
      note: 'Corridor CCTV still attached',
    }, {
      id: 'file-cctv-still',
      name: 'cctv_still.png',
      mime: 'image/png',
      size: 500,
      uploadedBy: squad.id,
      uploadedAt: new Date().toISOString(),
    });
    assert.equal(c.evidence.length, 1);
    assert.equal(c.status, 'Under Investigation', 'Evidence addition stays in Under Investigation');

    // Squad advances: Under Investigation -> Findings Recorded
    applyCommand(state, squad, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Findings Recorded',
      note: 'Findings logged: Senior student admitted involvement.',
    });
    assert.equal(c.status, 'Findings Recorded');

    // Squad member cannot close the case
    assert.throws(() => {
      applyCommand(state, squad, {
        action: 'status',
        caseId,
        version: c.version,
        nextStatus: 'Closed',
        note: 'Squad attempting closure',
      });
    }, /transition is not permitted/);

    // Squad advances: Findings Recorded -> Escalated to Committee
    applyCommand(state, squad, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Escalated to Committee',
      note: 'Escalating to Committee for formal disciplinary decision.',
    });
    assert.equal(c.status, 'Escalated to Committee');
    assert.equal(c.assignedBody, 'Anti-Ragging Committee');
    assert.equal(c.initialBody, 'Anti-Ragging Squad', 'Initial body preserved separately');

    // Committee advances: Escalated to Committee -> Committee Decision Recorded
    applyCommand(state, committee, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Committee Decision Recorded',
      note: 'Committee decision: Written reprimand and mandatory counselling.',
    });
    assert.equal(c.status, 'Committee Decision Recorded');

    // Committee advances: Committee Decision Recorded -> Action Taken
    applyCommand(state, committee, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Action Taken',
      note: 'Reprimand letter issued and counseling completed.',
    });
    assert.equal(c.status, 'Action Taken');

    // Committee advances: Action Taken -> Closed
    applyCommand(state, committee, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Closed',
      note: 'Case formally closed with all actions complete.',
    });
    assert.equal(c.status, 'Closed');

    // Attempting normal status update on closed case must fail
    assert.throws(() => {
      applyCommand(state, committee, {
        action: 'status',
        caseId,
        version: c.version,
        nextStatus: 'Under Investigation',
        note: 'Updating closed case',
      });
    }, /Reopen the case before making further changes/);

    // Reopening with reason: Closed -> Under Investigation
    const preReopenHistoryLen = c.history.length;
    applyCommand(state, committee, {
      action: 'reopen',
      caseId,
      version: c.version,
      note: 'New retaliatory incident reported; reopening for inquiry.',
    });
    assert.equal(c.status, 'Under Investigation');
    assert.equal(c.history.length, preReopenHistoryLen + 1);
    assert.match(c.history.at(-1)!.note, /New retaliatory incident reported/);
  });

  await t.test('6. Committee Handling of Online Harassment (Direct Assignment)', () => {
    const { state } = getState();
    const somik = state.users.find(u => u.id === 'somik')!;
    const committee = state.users.find(u => u.id === 'committee')!;

    // Online harassment routes directly to Committee
    const caseId = applyCommand(state, somik, {
      action: 'report',
      requestKey: 'req-online-test',
      category: 'Online harassment',
      description: 'Hostile Discord server messages',
      confirmed: true,
      mode: 'named',
    });
    const c = state.cases.find(c => c.id === caseId)!;
    assert.equal(c.assignedBody, 'Anti-Ragging Committee');
    assert.equal(c.status, 'Acknowledged');

    // Committee investigates directly: Acknowledged -> Under Investigation
    applyCommand(state, committee, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Under Investigation',
      note: 'Committee begins digital analysis.',
    });
    assert.equal(c.status, 'Under Investigation');

    // Under Investigation -> Findings Recorded
    applyCommand(state, committee, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Findings Recorded',
      note: 'Discord handle matched to enrolled student.',
    });
    assert.equal(c.status, 'Findings Recorded');

    // Findings Recorded -> Committee Decision Recorded (Direct since already at Committee!)
    applyCommand(state, committee, {
      action: 'status',
      caseId,
      version: c.version,
      nextStatus: 'Committee Decision Recorded',
      note: 'Committee decision logged.',
    });
    assert.equal(c.status, 'Committee Decision Recorded');
  });

  await t.test('7. Undertaking Submission, Rejection & Resubmission History', () => {
    const { state } = getState();
    const somik = state.users.find(u => u.id === 'somik')!;
    const admin = state.users.find(u => u.id === 'admin')!;

    // Somik submits undertaking for 2026-27
    const utId = applyCommand(state, somik, {
      action: 'undertaking',
      session: '2026-27',
      guardianName: 'R. Jain',
      confirmed: true,
    }, {
      id: 'file-ut-somik-1',
      name: 'somik_ut_v1.pdf',
      mime: 'application/pdf',
      size: 500,
      uploadedBy: somik.id,
      uploadedAt: new Date().toISOString(),
    });
    const ut = state.undertakings.find(u => u.id === utId)!;
    assert.equal(ut.status, 'Pending Verification');
    assert.equal(ut.submissions.length, 1);

    // Administrator rejects with reason
    applyCommand(state, admin, {
      action: 'review',
      undertakingId: ut.id,
      version: ut.version,
      decision: 'Rejected',
      reason: 'Guardian signature missing on page 2.',
    });
    assert.equal(ut.status, 'Rejected');
    assert.equal(ut.reviews.length, 1);
    assert.equal(ut.reviews[0].reason, 'Guardian signature missing on page 2.');

    // Somik resubmits corrected PDF
    applyCommand(state, somik, {
      action: 'undertaking',
      session: '2026-27',
      guardianName: 'R. Jain',
      confirmed: true,
      version: ut.version,
    }, {
      id: 'file-ut-somik-2',
      name: 'somik_ut_v2_signed.pdf',
      mime: 'application/pdf',
      size: 600,
      uploadedBy: somik.id,
      uploadedAt: new Date().toISOString(),
    });
    assert.equal(ut.status, 'Pending Verification', 'Resubmission returns status to Pending Verification');
    assert.equal(ut.submissions.length, 2, 'Previous submission preserved');
    assert.equal(ut.reviews.length, 1, 'Previous rejection review preserved');

    // Administrator accepts verified
    applyCommand(state, admin, {
      action: 'review',
      undertakingId: ut.id,
      version: ut.version,
      decision: 'Accepted/Verified',
      reason: 'All signatures verified.',
    });
    assert.equal(ut.status, 'Accepted/Verified');
    assert.equal(ut.reviews.length, 2);

    // Cannot submit duplicate once accepted
    assert.throws(() => {
      applyCommand(state, somik, {
        action: 'undertaking',
        session: '2026-27',
        guardianName: 'R. Jain',
        confirmed: true,
      }, {
        id: 'file-ut-somik-3',
        name: 'somik_ut_v3.pdf',
        mime: 'application/pdf',
        size: 500,
        uploadedBy: somik.id,
        uploadedAt: new Date().toISOString(),
      });
    }, /already has an accepted undertaking/);
  });

  await t.test('8. Authorization on Direct File Access', () => {
    const { state } = getState();
    const somik = state.users.find(u => u.id === 'somik')!;
    const aman = state.users.find(u => u.id === 'aman')!;
    const squad = state.users.find(u => u.id === 'squad')!;

    // Case ARMS-2026-0151 evidence file-evidence-151
    // Squad handler can access
    const allowed = authorizedFile(state, squad, 'file-evidence-151');
    assert.equal(allowed.id, 'file-evidence-151');

    // Unrelated student (Aman) cannot access
    assert.throws(() => {
      authorizedFile(state, aman, 'file-evidence-151');
    }, /restricted to authorized case handlers/);

    // Even submitting student Somik cannot access internal evidence file via file endpoint
    assert.throws(() => {
      authorizedFile(state, somik, 'file-evidence-151');
    }, /restricted to authorized case handlers/);
  });

  await t.test('9. Directory Management & User Role Administration', () => {
    const { state } = getState();
    const admin = state.users.find(u => u.id === 'admin')!;
    const somik = state.users.find(u => u.id === 'somik')!;

    // Non-admin cannot modify directory
    assert.throws(() => {
      applyCommand(state, somik, {
        action: 'directory',
        member: 'Hacker',
        body: 'Anti-Ragging Squad',
        designation: 'Fake',
        contact: 'fake@arms.test',
      });
    }, /not permitted/);

    // Admin adds directory entry
    const dirId = applyCommand(state, admin, {
      action: 'directory',
      member: 'Dr. New Faculty',
      body: 'Anti-Ragging Squad',
      userId: 'squad2',
      designation: 'Assistant Warden',
      contact: 'new@arms.test',
      active: true,
    });
    const entry = state.directory.find(d => d.id === dirId);
    assert.ok(entry);
    assert.equal(entry?.member, 'Dr. New Faculty');

    // Admin edits directory entry
    applyCommand(state, admin, {
      action: 'directory',
      id: dirId,
      member: 'Dr. New Faculty Updated',
      body: 'Anti-Ragging Squad',
      userId: 'squad2',
      designation: 'Chief Warden',
      contact: 'new_updated@arms.test',
      active: true,
    });
    const updated = state.directory.find(d => d.id === dirId);
    assert.equal(updated?.member, 'Dr. New Faculty Updated');

    // Admin changes role
    applyCommand(state, admin, {
      action: 'role',
      userId: 'aman',
      role: 'squad',
      active: true,
    });
    const updatedAman = state.users.find(u => u.id === 'aman');
    assert.equal(updatedAman?.role, 'squad');

    // Revert Aman back to student
    applyCommand(state, admin, {
      action: 'role',
      userId: 'aman',
      role: 'student',
      active: true,
    });
    assert.equal(updatedAman?.role, 'student');
  });

  await t.test('10. Audit History Beyond 20 Entries', () => {
    const { state } = getState();
    const admin = state.users.find(u => u.id === 'admin')!;
    const snapshot = publicSnapshot(state, admin, 1);
    assert.ok(snapshot.audit.length >= 22, `Audit trail should exceed 20 entries (actual: ${snapshot.audit.length})`);
  });

  
  await t.test('11. Unique IDs, State Immutability & File Persistence', async () => {
    // 1. Guaranteed Unique Sequential IDs
    const { state: s1 } = getState();
    const somik = s1.users.find(u => u.id === 'somik')!;
    const id1 = applyCommand(s1, somik, {
      action: 'report',
      requestKey: 'req-seq-1',
      category: 'Physical intimidation',
      description: 'Sequential ID test 1',
      confirmed: true,
      mode: 'named',
    });
    const id2 = applyCommand(s1, somik, {
      action: 'report',
      requestKey: 'req-seq-2',
      category: 'Physical intimidation',
      description: 'Sequential ID test 2',
      confirmed: true,
      mode: 'named',
    });
    assert.notEqual(id1, id2, 'Case IDs must be unique');
    assert.match(id1, /^ARMS-\d{4}-\d{4}$/);
    assert.match(id2, /^ARMS-\d{4}-\d{4}$/);

    // 2. State Mutation Isolation (getState returns deep clone)
    const { state: readState, version: vBefore } = getState();
    const caseCountBefore = readState.cases.length;
    // Mutate the local copy without calling saveState
    readState.cases.push({ id: 'dummy-case' } as unknown as (typeof readState.cases)[0]);
    const { state: freshState, version: vAfter } = getState();
    assert.equal(freshState.cases.length, caseCountBefore, 'getState must return isolated state; mutations cannot leak without saveState');
    assert.equal(vBefore, vAfter);

    // 3. User File Persistence Across Reload
    const testFileId = 'file-test-persist-1';
    const testBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\nstartxref\n0\n%%EOF');
    await saveFile({
      id: testFileId,
      name: 'persisted_doc.pdf',
      mime: 'application/pdf',
      size: testBuffer.length,
      data: testBuffer,
      uploadedBy: 'somik',
      uploadedAt: new Date().toISOString(),
    });
    const retrieved = getFile(testFileId);
    assert.ok(retrieved, 'Uploaded file must be retrievable');
    assert.equal(retrieved?.name, 'persisted_doc.pdf');
    assert.equal(retrieved?.data.toString('utf-8'), testBuffer.toString('utf-8'));
  });

  console.log('✅ ALL BACKEND AND BUSINESS LOGIC TESTS PASSED!');
});

// Clean up isolated test scratch directory
try {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const testDir = path.join(process.cwd(), '.data_test_isolated');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
} catch {}
