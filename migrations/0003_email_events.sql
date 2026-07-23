CREATE TABLE email_event (
  id TEXT PRIMARY KEY NOT NULL,
  message_id TEXT,
  event_type TEXT NOT NULL,
  recipient TEXT,
  details_json TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX email_event_message_idx ON email_event(message_id, received_at);
