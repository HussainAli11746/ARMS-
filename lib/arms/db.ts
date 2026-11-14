import { pbkdf2Sync, randomBytes, createHash } from 'node:crypto';
import {
  readState,
  writeState,
  readFile,
  writeFile,
  clearSavedData,
  readLegacyJson,
} from './storage.ts';
import type { StoredFile } from './storage.ts';
export type { StoredFile } from './storage.ts';
import type { State, User } from './model.ts';
import { initialSeedState, sampleFiles } from './seed.ts';

interface Credential {
  userId: string;
  email: string;
  salt: string;
  passwordHash: string;
}

interface DbStore {
  version: number;
  state: State;
  credentials: Map<string, Credential>; // key: user_id and email.toLowerCase()
  sessions: Map<string, { userId: string; expiresAt: number }>; // key: tokenHash
}

declare global {
  // eslint-disable-next-line no-var
  var __arms_store__: DbStore | undefined;
}

export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function initStore(reset = false): DbStore {
  const seed = initialSeedState();
  // Import the earlier local JSON data only when the SQLite database is new.
  const savedDatabase = reset ? null : readState();
  const loaded = reset
    ? null
    : (savedDatabase ?? readLegacyJson('arms_state.json'));

  const state: State = loaded?.state ?? seed.state;
  const version: number = loaded?.version ?? 1;

  const credentials = new Map<string, Credential>();
  for (const user of state.users) {
    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword('ArmsDemo2026!', salt);
    const cred: Credential = {
      userId: user.id,
      email: user.email.toLowerCase().trim(),
      salt,
      passwordHash,
    };
    credentials.set(user.id, cred);
    credentials.set(user.email.toLowerCase().trim(), cred);
  }

  const sessions = new Map<string, { userId: string; expiresAt: number }>();
  const files = new Map<string, StoredFile>();

  // Baseline sample files
  for (const f of sampleFiles()) {
    files.set(f.id, {
      id: f.id,
      name: f.name,
      mime: f.mime,
      size: f.size,
      data: Buffer.isBuffer(f.buffer) ? f.buffer : Buffer.from(f.buffer),
      uploadedBy: f.uploadedBy,
      uploadedAt: f.uploadedAt,
    });
  }

  // Restore persisted user uploads across restart
  const legacyFiles =
    reset || savedDatabase ? [] : (readLegacyJson('arms_files.json') ?? []);
  const persistedFiles: StoredFile[] = legacyFiles.map((file: StoredFile) => ({
    ...file,
    data: Buffer.from(file.data as unknown as string, 'base64'),
  }));
  for (const f of persistedFiles) {
    files.set(f.id, f);
  }

  // Initialize/migrate once. Do not overwrite existing SQLite uploads on restart.
  if (reset || !savedDatabase)
    writeState(state, version, Array.from(files.values()));
  return { version, state, credentials, sessions };
}

function getStore(): DbStore {
  if (!globalThis.__arms_store__) {
    globalThis.__arms_store__ = initStore();
  }
  return globalThis.__arms_store__;
}

export function getState(): { state: State; version: number } {
  const store = getStore();
  return {
    version: store.version,
    // Return deep clone so in-memory mutations prior to saveState cannot leak
    state: structuredClone(store.state),
  };
}

export async function saveState(
  state: State,
  expectedVersion: number,
  pendingFile?: StoredFile,
): Promise<number> {
  const store = getStore();
  if (store.version !== expectedVersion) {
    throw new Error('VERSION_CONFLICT');
  }
  const nextVersion = expectedVersion + 1;
  writeState(state, nextVersion, pendingFile ? [pendingFile] : []);
  store.version = nextVersion;
  store.state = structuredClone(state);

  return nextVersion;
}

export async function saveFile(file: {
  id: string;
  name: string;
  mime: string;
  size: number;
  data: Buffer | Uint8Array;
  uploadedBy: string;
  uploadedAt: string;
}): Promise<void> {
  getStore();
  writeFile({ ...file, data: Buffer.from(file.data) });
}

export function getFile(fileId: string): StoredFile | null {
  getStore();
  return readFile(fileId);
}

export function verifyCredentials(
  email: string,
  password: string,
): User | null {
  const store = getStore();
  const cred = store.credentials.get(email.toLowerCase().trim());
  if (!cred) return null;
  const hash = hashPassword(password, cred.salt);
  if (hash !== cred.passwordHash) return null;

  const user = store.state.users.find((u) => u.id === cred.userId && u.active);
  return user ? structuredClone(user) : null;
}

export function createSession(userId: string, hours = 24): string {
  const store = getStore();
  const token = randomBytes(32).toString('hex');
  const th = tokenHash(token);
  const expiresAt = Date.now() + hours * 3600 * 1000;
  store.sessions.set(th, { userId, expiresAt });
  return token;
}

export function getUserBySession(token: string): User | null {
  if (!token) return null;
  const store = getStore();
  const th = tokenHash(token);
  const session = store.sessions.get(th);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    store.sessions.delete(th);
    return null;
  }
  const user = store.state.users.find(
    (u) => u.id === session.userId && u.active,
  );
  return user ? structuredClone(user) : null;
}

export function deleteSession(token: string) {
  if (!token) return;
  const store = getStore();
  const th = tokenHash(token);
  store.sessions.delete(th);
}

export async function resetDatabase() {
  clearSavedData();
  globalThis.__arms_store__ = initStore(true);
}
