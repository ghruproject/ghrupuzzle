CREATE TABLE administrator_email (
  email TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
  added_by TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO administrator_email (email)
VALUES ('nabil@happykhan.com');
