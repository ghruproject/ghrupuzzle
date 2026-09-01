ALTER TABLE certificate ADD COLUMN email_status TEXT NOT NULL DEFAULT 'not_sent'
  CHECK (email_status IN ('not_sent', 'sending', 'sent', 'delivered', 'bounced', 'complaint', 'failed'));
ALTER TABLE certificate ADD COLUMN email_message_id TEXT;
ALTER TABLE certificate ADD COLUMN email_sent_at TEXT;
ALTER TABLE certificate ADD COLUMN email_error TEXT;

CREATE INDEX certificate_email_message_idx
  ON certificate(email_message_id)
  WHERE email_message_id IS NOT NULL;
