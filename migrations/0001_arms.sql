CREATE TABLE IF NOT EXISTS arms_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data))
);
CREATE TABLE IF NOT EXISTS arms_credentials (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS arms_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES arms_credentials(user_id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS arms_sessions_expiry ON arms_sessions(expires_at);
