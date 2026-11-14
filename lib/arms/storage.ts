// Local SQLite storage. SQL lives here; business rules stay in service.ts.
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { State } from './model.ts';

export interface StoredFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  data: Buffer;
  uploadedBy: string;
  uploadedAt: string;
}

declare global {
  var __arms_database__: DatabaseSync | undefined;
}

export function getDataDirectory(): string {
  const folder =
    process.env.ARMS_TEST_ISOLATED === '1' ? '.data_test_isolated' : '.data';
  return path.join(process.cwd(), folder);
}

function openDatabase(): DatabaseSync {
  if (globalThis.__arms_database__) return globalThis.__arms_database__;
  fs.mkdirSync(getDataDirectory(), { recursive: true });
  const db = new DatabaseSync(path.join(getDataDirectory(), 'arms.sqlite'));
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS case_history (id TEXT PRIMARY KEY, case_id TEXT REFERENCES cases(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, case_id TEXT REFERENCES cases(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS undertakings (id TEXT PRIMARY KEY, student_id TEXT REFERENCES users(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, undertaking_id TEXT REFERENCES undertakings(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, undertaking_id TEXT REFERENCES undertakings(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS directory (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS punishment_reference (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS requests (request_key TEXT, user_id TEXT, result_id TEXT, PRIMARY KEY(request_key, user_id));
    CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, metadata TEXT NOT NULL, bytes BLOB NOT NULL);
  `);
  globalThis.__arms_database__ = db;
  return db;
}

// Keep the existing TypeScript record shapes in JSON columns. Parent IDs are
// separate relational columns; histories/submissions/reviews are separate rows.
export function writeState(
  state: State,
  version: number,
  files: StoredFile[] = [],
): void {
  const db = openDatabase();
  db.exec('BEGIN TRANSACTION');
  try {
    // Delete children before their parents to satisfy foreign keys.
    db.exec(`DELETE FROM case_history; DELETE FROM evidence; DELETE FROM reviews;
      DELETE FROM submissions; DELETE FROM undertakings; DELETE FROM cases;
      DELETE FROM users; DELETE FROM directory; DELETE FROM audit;
      DELETE FROM notifications; DELETE FROM punishment_reference; DELETE FROM requests;`);
    const insertUser = db.prepare('INSERT INTO users VALUES (?, ?)');
    for (const user of state.users)
      insertUser.run(user.id, JSON.stringify(user));
    const insertCase = db.prepare('INSERT INTO cases VALUES (?, ?)');
    const insertHistory = db.prepare(
      'INSERT INTO case_history VALUES (?, ?, ?)',
    );
    const insertEvidence = db.prepare('INSERT INTO evidence VALUES (?, ?, ?)');
    for (const record of state.cases) {
      insertCase.run(
        record.id,
        JSON.stringify({ ...record, history: [], evidence: [] }),
      );
      for (const item of record.history)
        insertHistory.run(item.id, record.id, JSON.stringify(item));
      for (const item of record.evidence)
        insertEvidence.run(item.id, record.id, JSON.stringify(item));
    }
    const insertUndertaking = db.prepare(
      'INSERT INTO undertakings VALUES (?, ?, ?)',
    );
    const insertSubmission = db.prepare(
      'INSERT INTO submissions VALUES (?, ?, ?)',
    );
    const insertReview = db.prepare('INSERT INTO reviews VALUES (?, ?, ?)');
    for (const record of state.undertakings) {
      insertUndertaking.run(
        record.id,
        record.studentId,
        JSON.stringify({ ...record, submissions: [], reviews: [] }),
      );
      for (const item of record.submissions)
        insertSubmission.run(item.id, record.id, JSON.stringify(item));
      for (const item of record.reviews)
        insertReview.run(item.id, record.id, JSON.stringify(item));
    }
    const insertDirectory = db.prepare('INSERT INTO directory VALUES (?, ?)');
    for (const item of state.directory)
      insertDirectory.run(item.id, JSON.stringify(item));
    const insertAudit = db.prepare('INSERT INTO audit VALUES (?, ?)');
    for (const item of state.audit)
      insertAudit.run(item.id, JSON.stringify(item));
    const insertNotification = db.prepare(
      'INSERT INTO notifications VALUES (?, ?)',
    );
    for (const item of state.notifications)
      insertNotification.run(item.id, JSON.stringify(item));
    const insertReference = db.prepare(
      'INSERT INTO punishment_reference VALUES (?, ?)',
    );
    for (const item of state.references)
      insertReference.run(item.id, JSON.stringify(item));
    const insertRequest = db.prepare('INSERT INTO requests VALUES (?, ?, ?)');
    for (const item of state.requests)
      insertRequest.run(item.key, item.userId, item.resultId);
    for (const file of files) writeFile(file);
    db.prepare("INSERT OR REPLACE INTO settings VALUES ('version', ?)").run(
      version,
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Table names below are internal constants, never request input.
function readRows<T>(table: string): T[] {
  return openDatabase()
    .prepare(`SELECT data FROM ${table} ORDER BY rowid`)
    .all()
    .map((row) => JSON.parse(row.data as string) as T);
}

export function readState(): { state: State; version: number } | null {
  const db = openDatabase();
  const saved = db
    .prepare("SELECT value FROM settings WHERE name = 'version'")
    .get();
  if (!saved) return null;
  const cases = readRows<State['cases'][number]>('cases');
  for (const record of cases) {
    record.history = db
      .prepare('SELECT data FROM case_history WHERE case_id = ? ORDER BY rowid')
      .all(record.id)
      .map((row) => JSON.parse(row.data as string));
    record.evidence = db
      .prepare('SELECT data FROM evidence WHERE case_id = ? ORDER BY rowid')
      .all(record.id)
      .map((row) => JSON.parse(row.data as string));
  }
  const undertakings = readRows<State['undertakings'][number]>('undertakings');
  for (const record of undertakings) {
    record.submissions = db
      .prepare(
        'SELECT data FROM submissions WHERE undertaking_id = ? ORDER BY rowid',
      )
      .all(record.id)
      .map((row) => JSON.parse(row.data as string));
    record.reviews = db
      .prepare(
        'SELECT data FROM reviews WHERE undertaking_id = ? ORDER BY rowid',
      )
      .all(record.id)
      .map((row) => JSON.parse(row.data as string));
  }
  const requests = db
    .prepare('SELECT request_key, user_id, result_id FROM requests')
    .all()
    .map((row) => ({
      key: row.request_key as string,
      userId: row.user_id as string,
      resultId: row.result_id as string,
    }));
  return {
    version: Number(saved.value),
    state: {
      users: readRows('users'),
      cases,
      undertakings,
      requests,
      directory: readRows('directory'),
      audit: readRows('audit'),
      notifications: readRows('notifications'),
      references: readRows('punishment_reference'),
    },
  };
}

export function writeFile(file: StoredFile): void {
  const { data, ...metadata } = file;
  openDatabase()
    .prepare('INSERT OR REPLACE INTO files VALUES (?, ?, ?)')
    .run(file.id, JSON.stringify(metadata), data);
}

export function readFile(id: string): StoredFile | null {
  const row = openDatabase()
    .prepare('SELECT metadata, bytes FROM files WHERE id = ?')
    .get(id);
  if (!row) return null;
  return {
    ...JSON.parse(row.metadata as string),
    data: Buffer.from(row.bytes as Uint8Array),
  };
}

export function clearSavedData(): void {
  // Keep the schema; the next initialization restores seed records.
  openDatabase().exec('DELETE FROM settings; DELETE FROM files;');
}

export function closeDatabase(): void {
  globalThis.__arms_database__?.close();
  globalThis.__arms_database__ = undefined;
}

export function readLegacyJson(filename: string) {
  const file = path.join(getDataDirectory(), filename);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
