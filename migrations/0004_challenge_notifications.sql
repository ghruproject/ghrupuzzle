CREATE TABLE challenge_notification_subscription (
  id TEXT PRIMARY KEY NOT NULL,
  challenge_slug TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  subscribed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reminder_sent_at TEXT,
  reminder_message_id TEXT,
  UNIQUE (challenge_slug, email)
);

CREATE INDEX challenge_notification_pending_idx
  ON challenge_notification_subscription(challenge_slug, reminder_sent_at);
