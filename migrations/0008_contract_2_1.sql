-- The uploaded GenomePuzzle contract release set is schema 2.1. Keep the
-- existing stable database identifiers while updating their registered
-- contract version.
UPDATE dataset_release
   SET schema_version = '2.1'
 WHERE release_id IN (
   '2026-website-typing-practice',
   '2026-website-assembly-practice',
   '2026-website-hybrid-practice',
   '2026-website-outbreak-practice',
   'challenge-2-typing',
   'challenge-2-assembly',
   'challenge-2-hybrid',
   'challenge-2-outbreak'
 );
