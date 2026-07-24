-- Register the four public practice datasets. Participant files are read from
-- PRACTICE_ASSETS; answer keys and scoring policies remain in PRIVATE_ASSETS
-- under the corresponding private/ prefix.
INSERT OR IGNORE INTO dataset_release
  (id, release_id, exercise, mode, manifest_key, answer_key, round_id,
   schema_version, published_at)
VALUES
  (
    '56c574c6-d923-42f7-8d4b-8c2349fb2c72',
    '2026-website-typing-practice',
    'typing',
    'practice',
    'releases/2026-website-typing-practice/typing/practice/dataset_manifest.json',
    'releases/2026-website-typing-practice/typing/practice/private/answer_key.json',
    NULL,
    '2.0',
    CURRENT_TIMESTAMP
  ),
  (
    '6342e4e4-2896-4107-a215-667334e170ca',
    '2026-website-assembly-practice',
    'assembly',
    'practice',
    'releases/2026-website-assembly-practice/assembly/practice/dataset_manifest.json',
    'releases/2026-website-assembly-practice/assembly/practice/private/answer_key.json',
    NULL,
    '2.0',
    CURRENT_TIMESTAMP
  ),
  (
    '5b3838ac-bb49-4628-b719-f2fdc9768937',
    '2026-website-hybrid-practice',
    'hybrid',
    'practice',
    'releases/2026-website-hybrid-practice/hybrid/practice/dataset_manifest.json',
    'releases/2026-website-hybrid-practice/hybrid/practice/private/answer_key.json',
    NULL,
    '2.0',
    CURRENT_TIMESTAMP
  ),
  (
    'c98265bc-c851-4542-987c-85d90f99ab47',
    '2026-website-outbreak-practice',
    'outbreak',
    'practice',
    'releases/2026-website-outbreak-practice/outbreak/practice/dataset_manifest.json',
    'releases/2026-website-outbreak-practice/outbreak/practice/private/answer_key.json',
    NULL,
    '2.0',
    CURRENT_TIMESTAMP
  );
