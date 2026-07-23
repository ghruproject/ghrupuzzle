# GenomePuzzle release consumption

GHRUPuzzles treats a completed GenomePuzzle v2 directory as an immutable
content release. The website does not generate reads, run biological tools or
maintain a second answer-column definition.

The publisher:

1. verifies `COMPLETE.json` and the full content digest;
2. verifies every participant file checksum;
3. requires the sample sheet, submission schema and instructions;
4. uploads public and private artifacts with separate credentials;
5. preserves nested private analyses and logs; and
6. uploads the public manifest last.

The registration API then verifies the uploaded contract in R2 before
inserting the D1 release record.

At runtime:

- the exercise API renders title, description, instructions and columns from
  the release;
- stable file roles become authenticated download URLs;
- the submission API loads `answer_key.json` and `scoring_policy.json`;
- aliases, weights, pass threshold and unexpected-sample handling come from
  that policy; and
- challenge answers remain private while practice submissions may receive
  detailed provisional feedback.

The server implements only the allowed scorer types: exact string,
order-independent list, and label-independent partition comparison. Generated
content cannot execute code.
