UPDATE user
   SET name = CASE
     WHEN instr(email, '@') > 1 THEN substr(email, 1, instr(email, '@') - 1)
     ELSE email
   END,
       updatedAt = unixepoch()
 WHERE trim(name) = '';

UPDATE assessment_round
   SET title = 'Challenge 1',
       updated_at = CURRENT_TIMESTAMP
 WHERE slug = 'ghru-challenge-2026'
   AND title = 'GHRU Challenge 2026';
