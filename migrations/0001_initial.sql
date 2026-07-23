PRAGMA foreign_keys = ON;

-- Better Auth core schema.
CREATE TABLE user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX session_user_id_idx ON session(userId);

CREATE TABLE account (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX account_user_id_idx ON account(userId);
CREATE UNIQUE INDEX account_provider_idx ON account(providerId, accountId);

CREATE TABLE verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER
);
CREATE INDEX verification_identifier_idx ON verification(identifier);

-- Assessment domain schema.
CREATE TABLE assessment_round (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  registration_mode TEXT NOT NULL CHECK (registration_mode IN ('open', 'invite')),
  registration_opens_at TEXT,
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  answers_release_at TEXT,
  grace_seconds INTEGER NOT NULL DEFAULT 0 CHECK (grace_seconds >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (opens_at < closes_at)
);

CREATE TABLE dataset_release (
  id TEXT PRIMARY KEY NOT NULL,
  release_id TEXT NOT NULL,
  exercise TEXT NOT NULL CHECK (exercise IN ('typing', 'assembly', 'hybrid', 'outbreak')),
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'challenge')),
  manifest_key TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  round_id TEXT REFERENCES assessment_round(id) ON DELETE RESTRICT,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (release_id, exercise, mode),
  CHECK ((mode = 'practice' AND round_id IS NULL) OR (mode = 'challenge' AND round_id IS NOT NULL))
);

CREATE TABLE invitation (
  id TEXT PRIMARY KEY NOT NULL,
  round_id TEXT NOT NULL REFERENCES assessment_round(id) ON DELETE CASCADE,
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT,
  accepted_by TEXT REFERENCES user(id) ON DELETE SET NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (round_id, email)
);

CREATE TABLE enrolment (
  id TEXT PRIMARY KEY NOT NULL,
  round_id TEXT NOT NULL REFERENCES assessment_round(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'withdrawn', 'suspended')),
  enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (round_id, user_id)
);

CREATE TABLE user_role (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('participant', 'reviewer', 'administrator')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE submission (
  id TEXT PRIMARY KEY NOT NULL,
  release_id TEXT NOT NULL REFERENCES dataset_release(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'invalid', 'scored', 'flagged', 'reviewed')),
  structural_errors_json TEXT NOT NULL DEFAULT '[]',
  UNIQUE (release_id, user_id, attempt_number)
);
CREATE INDEX submission_user_idx ON submission(user_id, submitted_at);

CREATE TABLE score (
  id TEXT PRIMARY KEY NOT NULL,
  submission_id TEXT NOT NULL UNIQUE REFERENCES submission(id) ON DELETE CASCADE,
  scorer_version TEXT NOT NULL,
  earned REAL NOT NULL,
  possible REAL NOT NULL CHECK (possible > 0),
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  provisional INTEGER NOT NULL DEFAULT 1 CHECK (provisional IN (0, 1)),
  details_json TEXT NOT NULL,
  scored_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review (
  id TEXT PRIMARY KEY NOT NULL,
  submission_id TEXT NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  assigned_to TEXT REFERENCES user(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'in_review', 'upheld', 'overruled', 'closed')),
  resolution TEXT,
  score_before_json TEXT,
  score_after_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);
CREATE INDEX review_queue_idx ON review(status, created_at);

CREATE TABLE certificate (
  id TEXT PRIMARY KEY NOT NULL,
  public_code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  round_id TEXT NOT NULL REFERENCES assessment_round(id) ON DELETE RESTRICT,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  revocation_reason TEXT,
  supersedes_id TEXT REFERENCES certificate(id) ON DELETE SET NULL,
  pdf_object_key TEXT NOT NULL UNIQUE,
  snapshot_json TEXT NOT NULL,
  UNIQUE (user_id, round_id, issued_at)
);

CREATE TABLE audit_event (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_target_idx ON audit_event(target_type, target_id, created_at);
