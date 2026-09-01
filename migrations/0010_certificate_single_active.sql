CREATE UNIQUE INDEX IF NOT EXISTS certificate_one_active_per_user_round
  ON certificate(user_id, round_id)
  WHERE revoked_at IS NULL;
