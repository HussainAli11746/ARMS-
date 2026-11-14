import assert from 'node:assert/strict';
const base = process.env.ARMS_URL || 'http://127.0.0.1:3000';

async function login(id: string): Promise<string> {
  const response = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoUserId: id }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}

const form = new FormData();
form.set('mode', 'anonymous');
form.set('category', 'Other ragging-related incident');
form.set(
  'description',
  'Synthetic anonymous report for local contract testing.',
);
form.set('confirmed', 'true');
const submitted = await fetch(base + '/api/cases', {
  method: 'POST',
  body: form,
});
assert.equal(submitted.status, 201);
assert.equal(submitted.headers.get('set-cookie'), null);
const result = await submitted.json();
assert.equal(result.snapshot.cases.length, 0);
assert.equal(result.snapshot.users.length, 0);
const forbidden = await fetch(base + '/api/cases/' + result.caseId);
assert.equal(forbidden.status, 401);
form.set('mode', 'named');
assert.equal(
  (await fetch(base + '/api/cases', { method: 'POST', body: form })).status,
  401,
);
console.log(
  'PASS: login-free anonymous report, no session, and protected record access denied.',
);

const admin = await login('admin');
const headers = { Authorization: 'Bearer ' + admin };
const recordResponse = await fetch(base + '/api/cases/' + result.caseId, {
  headers,
});
assert.equal(recordResponse.status, 200);
const record = (await recordResponse.json()).case;
assert.equal(record.reporterId, null);
assert.equal(record.assignedBody, 'Administrator review');
assert.equal(record.evidence.length, 0);
const transitions = await fetch(
  base + `/api/cases/${result.caseId}/transitions`,
  { headers },
);
assert.equal(transitions.status, 200);
assert.deepEqual((await transitions.json()).allowedStatuses, []);
for (const endpoint of [
  '/api/session',
  '/api/directory',
  '/api/notifications',
  '/api/oversight/summary',
]) {
  assert.equal(
    (await fetch(base + endpoint, { headers })).status,
    200,
    endpoint,
  );
  assert.equal(
    (await fetch(base + endpoint)).status,
    401,
    endpoint + ' must require sign-in',
  );
}
for (const role of ['squad', 'committee', 'oversight']) {
  const token = await login(role);
  const response = await fetch(
    base + '/api/undertakings/not-a-record/reviews',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ decision: 'accept', expectedVersion: 1 }),
    },
  );
  assert.equal(response.status, 403, role + ': ' + (await response.text()));
}
console.log(
  'PASS: named read APIs, correct anonymous routing and administrator-only verification.',
);
