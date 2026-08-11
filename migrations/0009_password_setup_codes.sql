CREATE TABLE password_setup_code (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_by TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX password_setup_code_user_idx
  ON password_setup_code(user_id, created_at DESC);
CREATE INDEX password_setup_code_expiry_idx
  ON password_setup_code(expires_at, used_at);
