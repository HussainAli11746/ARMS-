import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialState } from '../lib/arms/seed.ts';

// Local classroom accounts only. This script never connects to a hosted database.
const state = initialState();
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const sql = [`INSERT OR IGNORE INTO arms_state (id, version, data) VALUES (1, 1, ${quote(JSON.stringify(state))});`];
for (const user of state.users) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync('ArmsDemo2026!', salt, 100000, 32, 'sha256').toString('hex');
  sql.push(`INSERT OR IGNORE INTO arms_credentials (user_id,email,salt,password_hash) VALUES (${quote(user.id)},${quote(user.email)},${quote(salt)},${quote(hash)});`);
}
const folder = mkdtempSync(join(tmpdir(), 'arms-seed-'));
try {
  const file = join(folder, 'seed.sql');
  writeFileSync(file, sql.join('\n'));
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', '--config', 'wrangler.local.json', '--file', file], { stdio: 'inherit' });
} finally { rmSync(folder, { recursive: true }); }
