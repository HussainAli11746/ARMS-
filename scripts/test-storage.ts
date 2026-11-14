// Run with: node --experimental-strip-types scripts/test-storage.ts
// Uses a temporary folder, never the demonstration database.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getState, getFile, saveState } from '../lib/arms/db.ts';
import { closeDatabase } from '../lib/arms/storage.ts';
import { initialSeedState } from '../lib/arms/seed.ts';
import { applyCommand, publicSnapshot } from '../lib/arms/service.ts';

const originalDirectory = process.cwd();
const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'arms-storage-'));
process.chdir(testDirectory);
try {
  fs.mkdirSync('.data');
  const seed = initialSeedState().state;
  seed.cases[0].description = 'Record imported from the previous JSON version';
  fs.writeFileSync(
    '.data/arms_state.json',
    JSON.stringify({ state: seed, version: 8 }),
  );
  const imported = getState();
  assert.equal(imported.version, 8);
  assert.equal(imported.state.cases[0].description, seed.cases[0].description);

  const file = {
    id: 'storage-check',
    name: 'demo.pdf',
    mime: 'application/pdf',
    size: 4,
    data: Buffer.from('demo'),
    uploadedBy: 'somik',
    uploadedAt: new Date().toISOString(),
  };
  imported.state.cases[0].description = 'Record saved in SQLite';
  await saveState(imported.state, imported.version, file);
  closeDatabase();
  globalThis.__arms_store__ = undefined;
  assert.equal(getState().state.cases[0].description, 'Record saved in SQLite');
  assert.equal(getFile(file.id)?.data.toString(), 'demo');
  console.log(
    'PASS: JSON import and SQLite reopen preserve records and file bytes.',
  );

  const before = getState();
  const invalidState = structuredClone(before.state);
  invalidState.cases[0].description = 'This transaction must roll back';
  invalidState.undertakings.push({
    id: 'bad-link',
    studentId: 'missing-student',
    session: '2026-27',
    guardianName: '',
    status: 'Pending Verification',
    version: 1,
    submissions: [],
    reviews: [],
  });
  await assert.rejects(
    saveState(invalidState, before.version, { ...file, id: 'must-not-save' }),
  );
  closeDatabase();
  globalThis.__arms_store__ = undefined;
  assert.equal(getState().version, before.version);
  assert.equal(getState().state.cases[0].description, 'Record saved in SQLite');
  assert.equal(getFile('must-not-save'), null);
  console.log(
    'PASS: failed transaction preserves the previous records and rejects the new file.',
  );

  const state = getState().state;
  for (const role of ['squad', 'committee', 'oversight']) {
    const actor = state.users.find((user) => user.role === role)!;
    assert.throws(
      () => applyCommand(state, actor, { action: 'review' }),
      /not permitted/,
    );
    assert.equal(publicSnapshot(state, actor, 1).undertakings.length, 0);
  }
  const admin = state.users.find((user) => user.role === 'administrator')!;
  assert.ok(publicSnapshot(state, admin, 1).undertakings.length > 0);
  console.log(
    'PASS: undertaking verification is limited to the administrator.',
  );
} finally {
  closeDatabase();
  globalThis.__arms_store__ = undefined;
  process.chdir(originalDirectory);
  fs.rmSync(testDirectory, { recursive: true, force: true });
}
