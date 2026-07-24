-- Replace the original placeholder round with the first fully published
-- private challenge release set. The advertised dates remain unchanged.
UPDATE challenge_notification_subscription
   SET challenge_slug = 'challenge-2',
       updated_at = CURRENT_TIMESTAMP
 WHERE challenge_slug = 'ghru-challenge-2026';

UPDATE assessment_round
   SET slug = 'challenge-2',
       title = 'Challenge 2',
       updated_at = CURRENT_TIMESTAMP
 WHERE slug = 'ghru-challenge-2026';

-- Ensure a clean database receives the same round even when it never had the
-- original placeholder record.
INSERT OR IGNORE INTO assessment_round
  (id, slug, title, registration_mode, registration_opens_at, opens_at,
   closes_at, answers_release_at, grace_seconds, status)
VALUES
  ('challenge-2-round-2026', 'challenge-2', 'Challenge 2', 'open',
   '2026-07-23T00:00:00Z', '2026-08-16T23:00:00Z',
   '2026-08-31T22:59:59Z', '2026-09-07T09:00:00Z', 900, 'published');

INSERT OR IGNORE INTO dataset_release
  (id, release_id, exercise, mode, manifest_key, answer_key, round_id,
   schema_version, published_at)
SELECT
  'c967893b-0c40-47a2-9194-4fec34dbe547',
  'challenge-2-typing',
  'typing',
  'challenge',
  'releases/challenge-2-typing/typing/challenge/dataset_manifest.json',
  'releases/challenge-2-typing/typing/challenge/private/answer_key.json',
  id,
  '2.0',
  CURRENT_TIMESTAMP
FROM assessment_round
WHERE slug = 'challenge-2';

INSERT OR IGNORE INTO dataset_release
  (id, release_id, exercise, mode, manifest_key, answer_key, round_id,
   schema_version, published_at)
SELECT
  'daf0475f-b52e-425a-be51-6f5fabde21b1',
  'challenge-2-assembly',
  'assembly',
  'challenge',
  'releases/challenge-2-assembly/assembly/challenge/dataset_manifest.json',
  'releases/challenge-2-assembly/assembly/challenge/private/answer_key.json',
  id,
  '2.0',
  CURRENT_TIMESTAMP
FROM assessment_round
WHERE slug = 'challenge-2';

INSERT OR IGNORE INTO dataset_release
  (id, release_id, exercise, mode, manifest_key, answer_key, round_id,
   schema_version, published_at)
SELECT
  'ce3c1237-4315-4307-8855-78171b1c6d39',
  'challenge-2-hybrid',
  'hybrid',
  'challenge',
  'releases/challenge-2-hybrid/hybrid/challenge/dataset_manifest.json',
  'releases/challenge-2-hybrid/hybrid/challenge/private/answer_key.json',
  id,
  '2.0',
  CURRENT_TIMESTAMP
FROM assessment_round
WHERE slug = 'challenge-2';

INSERT OR IGNORE INTO dataset_release
  (id, release_id, exercise, mode, manifest_key, answer_key, round_id,
   schema_version, published_at)
SELECT
  '59a8fd3c-a400-4451-a088-474cc0ad87b0',
  'challenge-2-outbreak',
  'outbreak',
  'challenge',
  'releases/challenge-2-outbreak/outbreak/challenge/dataset_manifest.json',
  'releases/challenge-2-outbreak/outbreak/challenge/private/answer_key.json',
  id,
  '2.0',
  CURRENT_TIMESTAMP
FROM assessment_round
WHERE slug = 'challenge-2';

INSERT INTO audit_event
  (id, action, target_type, target_id, before_json, after_json)
SELECT
  '014de332-ae2f-4b85-b1b1-cb7992909924',
  'assessment_round.replaced',
  'assessment_round',
  id,
  '{"slug":"ghru-challenge-2026","title":"Challenge 1"}',
  '{"slug":"challenge-2","title":"Challenge 2","releaseCount":4}'
FROM assessment_round
WHERE slug = 'challenge-2';

INSERT INTO audit_event
  (id, action, target_type, target_id, after_json)
VALUES
  ('914bbcae-c331-43be-8d55-aa6eb485867a', 'release.registered',
   'dataset_release', 'c967893b-0c40-47a2-9194-4fec34dbe547',
   '{"releaseId":"challenge-2-typing","exercise":"typing","mode":"challenge"}'),
  ('701d3237-aa37-4d4e-88b4-9a8c35f6efa4', 'release.registered',
   'dataset_release', 'daf0475f-b52e-425a-be51-6f5fabde21b1',
   '{"releaseId":"challenge-2-assembly","exercise":"assembly","mode":"challenge"}'),
  ('5dc6c9e1-9625-4d7a-9b00-714d07751fb5', 'release.registered',
   'dataset_release', 'ce3c1237-4315-4307-8855-78171b1c6d39',
   '{"releaseId":"challenge-2-hybrid","exercise":"hybrid","mode":"challenge"}'),
  ('5094f443-91ea-4452-a57f-d5ffb9ec43ab', 'release.registered',
   'dataset_release', '59a8fd3c-a400-4451-a088-474cc0ad87b0',
   '{"releaseId":"challenge-2-outbreak","exercise":"outbreak","mode":"challenge"}');
