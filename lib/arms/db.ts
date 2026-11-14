import { pbkdf2Sync, randomBytes, createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { State, User } from './model.ts';
import { initialSeedState, sampleFiles } from './seed.ts';

export interface StoredFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  data: Buffer;
  uploadedBy: string;
  uploadedAt: string;
}

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
  files: Map<string, StoredFile>; // key: fileId
}

declare global {
  // eslint-disable-next-line no-var
  var __arms_store__: DbStore | undefined;
  var __arms_d1_initialized__: boolean | undefined;
}

export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}



interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ success?: boolean }>;
}

interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
}

export async function getD1(): Promise<D1DatabaseBinding | null> {
  if (process.env.ARMS_TEST_ISOLATED === "1") return null;
  try {
    const cf = await import("cloudflare:workers");
    return (cf.env as { DB?: D1DatabaseBinding })?.DB || null;
  } catch {
    return null;
  }
}

export async function ensureInitialized(): Promise<void> {
  if (globalThis.__arms_d1_initialized__) return;
  const store = getStore();
  const db = await getD1();
  if (db) {
    try {
      const row = await db.prepare("SELECT version, data FROM arms_state WHERE id = 1").first();
      if (row && typeof row.version === "number" && typeof row.data === "string") {
        store.version = row.version;
        store.state = JSON.parse(row.data);
      } else {
        await db.prepare("INSERT OR REPLACE INTO arms_state (id, version, data) VALUES (1, ?, ?)")
          .bind(store.version, JSON.stringify(store.state))
          .run();
      }

      const { results } = await db.prepare("SELECT * FROM arms_files").all();
      if (Array.isArray(results)) {
        for (const f of results) {
          if (f.id && f.name && f.data) {
            store.files.set(f.id as string, {
              id: f.id as string,
              name: f.name as string,
              mime: (f.mime as string) || "application/octet-stream",
              size: Number(f.size) || 0,
              data: Buffer.from(f.data as string, "base64"),
              uploadedBy: (f.uploaded_by as string) || "unknown",
              uploadedAt: (f.uploaded_at as string) || new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to initialize state from local D1 database:", err);
    }
  }
  globalThis.__arms_d1_initialized__ = true;
}

function getDataDir(): string {
  if (process.env.ARMS_TEST_ISOLATED === '1') {
    return path.join(process.cwd(), '.data_test_isolated');
  }
  return path.join(process.cwd(), '.data');
}

function trySaveSnapshot(state: State, version: number) {
  if (process.cwd() === '/bundle') return;
  const dir = getDataDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, 'arms_state.json'), JSON.stringify({ version, state }, null, 2));
  } catch (err) {
    console.error("SAVE SNAPSHOT FAILED: dir=" + dir + ", cwd=" + process.cwd(), err);
    // In restricted execution sandboxes without disk writes, state remains in memory
  }
}

function tryLoadSnapshot(): { version: number; state: State } | null {
  try {
    const filePath = path.join(getDataDir(), 'arms_state.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Continue with seed state if read fails
  }
  return null;
}

function trySaveFiles(filesMap: Map<string, StoredFile>) {
  if (process.cwd() === '/bundle') return;
  const dir = getDataDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const serialized = Array.from(filesMap.values()).map((f) => ({
      id: f.id,
      name: f.name,
      mime: f.mime,
      size: f.size,
      data: f.data.toString('base64'),
      uploadedBy: f.uploadedBy,
      uploadedAt: f.uploadedAt,
    }));
    fs.writeFileSync(path.join(dir, 'arms_files.json'), JSON.stringify(serialized));
  } catch {
    // In restricted execution sandboxes without disk writes, files remain in memory
  }
}

function tryLoadFiles(): StoredFile[] {
  try {
    const filePath = path.join(getDataDir(), 'arms_files.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content) as Array<{
        id: string;
        name: string;
        mime: string;
        size: number;
        data: string;
        uploadedBy: string;
        uploadedAt: string;
      }>;
      return parsed.map((item) => ({
        id: item.id,
        name: item.name,
        mime: item.mime,
        size: item.size,
        data: Buffer.from(item.data, 'base64'),
        uploadedBy: item.uploadedBy,
        uploadedAt: item.uploadedAt,
      }));
    }
  } catch {
    // Return empty on load error
  }
  return [];
}

function initStore(): DbStore {
  const seed = initialSeedState();
  const loaded = tryLoadSnapshot();

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
  const persistedFiles = tryLoadFiles();
  for (const f of persistedFiles) {
    files.set(f.id, f);
  }

  return {
    version,
    state,
    credentials,
    sessions,
    files,
  };
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

export async function saveState(state: State, expectedVersion: number): Promise<number> {
  const store = getStore();
  if (store.version !== expectedVersion) {
    throw new Error("VERSION_CONFLICT");
  }
  const nextVersion = expectedVersion + 1;
  store.version = nextVersion;
  store.state = structuredClone(state);
  trySaveSnapshot(store.state, nextVersion);

  const db = await getD1();
  if (db) {
    try {
      await db.prepare("INSERT OR REPLACE INTO arms_state (id, version, data) VALUES (1, ?, ?)")
        .bind(nextVersion, JSON.stringify(store.state))
        .run();
    } catch (err) {
      console.error("D1 saveState error:", err);
      throw new Error("Failed to persist record update to local database.");
    }
  }

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
  const store = getStore();
  const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
  store.files.set(file.id, {
    id: file.id,
    name: file.name,
    mime: file.mime,
    size: file.size,
    data: dataBuf,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt,
  });
  trySaveFiles(store.files);

  const db = await getD1();
  if (db) {
    try {
      await db.prepare("INSERT OR REPLACE INTO arms_files (id, name, mime, size, data, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(file.id, file.name, file.mime, file.size, dataBuf.toString("base64"), file.uploadedBy, file.uploadedAt)
        .run();
    } catch (err) {
      console.error("D1 saveFile error:", err);
      throw new Error("Failed to persist uploaded file to local database.");
    }
  }
}

export function getFile(fileId: string): StoredFile | null {
  const store = getStore();
  const file = store.files.get(fileId);
  return file || null;
}

export function verifyCredentials(email: string, password: string): User | null {
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
  const user = store.state.users.find((u) => u.id === session.userId && u.active);
  return user ? structuredClone(user) : null;
}

export function deleteSession(token: string) {
  if (!token) return;
  const store = getStore();
  const th = tokenHash(token);
  store.sessions.delete(th);
}

export async function resetDatabase() {
  try {
    const dir = getDataDir();
    const stateFile = path.join(dir, "arms_state.json");
    const filesFile = path.join(dir, "arms_files.json");
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
    if (fs.existsSync(filesFile)) fs.unlinkSync(filesFile);
  } catch {
    // Continue in-memory
  }
  globalThis.__arms_store__ = initStore();
  trySaveSnapshot(globalThis.__arms_store__.state, globalThis.__arms_store__.version);

  const db = await getD1();
  if (db) {
    try {
      await db.prepare("DELETE FROM arms_state").run();
      await db.prepare("DELETE FROM arms_files").run();
      await db.prepare("INSERT INTO arms_state (id, version, data) VALUES (1, ?, ?)")
        .bind(globalThis.__arms_store__.version, JSON.stringify(globalThis.__arms_store__.state))
        .run();
    } catch (err) {
      console.error("D1 resetDatabase error:", err);
    }
  }
}

// Compatibility helper
export function getDb() {
  return {
    prepare: () => ({
      get: () => ({ id: 1, version: getStore().version, data: JSON.stringify(getStore().state) }),
      run: () => ({ changes: 1 }),
    }),
    exec: () => {},
  };
}
