# GHRU Puzzles Assessment Platform Plan

Status: accepted implementation plan
Last updated: 2026-07-23

Dataset execution rule: computationally heavy biological generation and
analysis belongs on SLURM in the sibling `genomepuzzle` repository. The web
application never performs assemblies, read simulation, Kleborate batches,
phylogenetics, or dataset-wide QC during a request.

## Implementation status

- [x] Record the cross-repository assessment plan.
- [x] Disable broad bucket cleanup in the legacy publisher.
- [x] Stop new legacy uploads from publishing answer sheets.
- [x] Remove discoverable answer URLs from checked-in public manifests.
- [x] Add a manifest-driven, checksum-validating publisher with dry-run default.
- [x] Add publication safety and contract tests.
- [ ] Exercise a real namespaced R2 upload with the new publisher.
- [x] Add and verify the OpenNext build configuration.
- [x] Add D1 migrations and protected data access.
- [x] Add Better Auth, OAuth providers, Postmark magic links, and rate limits.
- [x] Add enrolment, timed challenges, submissions, scoring, and review.
- [x] Add certificate PDF generation, QR verification, reissue, and revocation.
- [ ] Provision production Cloudflare resources and deploy.
- [ ] Run OAuth/Postmark/R2 integration tests with production credentials.
- [ ] Run biological scorer calibration and a participant pilot.

## Purpose

`ghrupuzzle` is the delivery and assessment side of the GHRU Puzzles platform.
It publishes datasets produced by
[`genomepuzzle`](https://github.com/happykhan/genomepuzzle), accepts participant
submissions, calculates provisional results, supports manual review, and
issues verifiable certificates.

`genomepuzzle` remains responsible for simulation, implanted problems,
biological truth, provenance, and release validation. This repository must
consume its versioned release packages without recalculating identities or
inferring biological truth.

## Product model

The platform contains four exercises:

1. Kleborate-based genotyping
2. Short-read de novo assembly
3. Hybrid assembly
4. Outbreak investigation, including phylogenetic reconstruction

Anyone with an account may use the practice exercises. Challenge
releases are available only within configured time windows. Challenge
eligibility may be open self-enrolment or invitation-only on a per-round
basis.

## Participant journey

### Practice

1. Create an email-and-password account, or sign in using an existing password,
   Google, Microsoft, or an email magic link.
2. Open a permanently available practice exercise.
3. Download the public practice files and sample sheet.
4. Submit a completed result file.
5. Receive immediate structural validation and a provisional score.
6. See detailed feedback and practice answers.
7. Repeat the exercise where the configured attempt policy allows it.

Practice completion does not initially issue the formal proficiency
certificate. A non-credentialed completion badge can be added later.

### Challenge

1. Register or accept an invitation for a challenge round.
2. Wait for the configured opening time.
3. Download challenge assets through short-lived private links.
4. Submit results before the closing time.
5. Receive a provisional status according to the round policy.
6. Request review if the automatic assessment appears incorrect.
7. Receive a final result after automatic and manual review.
8. Receive a verifiable certificate after meeting the certificate criteria.

Challenge opening and closing must be enforced on the server. Hiding a button
in the browser is not sufficient.

## Backend architecture

The lightweight target architecture is:

```text
Next.js on Cloudflare Workers
          |
          +-- Better Auth
          |     +-- Google OAuth
          |     +-- Microsoft OAuth
          |     +-- Postmark email magic links
          |
          +-- Cloudflare D1
          |     Users, rounds, enrolments, submissions,
          |     scores, reviews, certificates, audit events
          |
          +-- Public R2
          |     Permanently public practice assets
          |
          +-- Private R2
                Challenge assets, answer keys, submissions,
                and generated certificate PDFs
```

Cloudflare's OpenNext adapter is the intended Next.js deployment path:

- <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>

Better Auth is used as the application authentication layer, with D1-backed
sessions and accounts:

- <https://better-auth.com/docs/basic-usage>
- <https://better-auth.com/docs/plugins/magic-link>
- <https://better-auth.com/blog/1-5>

This design should remain within free usage allowances for a modest cohort,
but usage alerts must still be configured. Existing public sequence-data
storage may independently exceed R2's free storage allowance.

## Authentication

The login page presents:

```text
[ Continue with Google ]
[ Continue with Microsoft ]

---------- or ----------

Email address
[ Sign in ]

New participant? [ Create an account ]

---------- optional fallback ----------

[ Email me a sign-in link ]
```

Email-and-password registration is the primary public route and does not rely
on email delivery. OAuth covers participants with Google or Microsoft
identities when configured. The email magic-link option remains an optional
fallback for functioning email addresses. Administrator-issued setup codes
support imported, existing passwordless and recovery accounts.

Postmark is called through its HTTP API rather than an SMTP socket. The
Postmark server token is stored as a Worker secret.

Authentication policy:

- magic links are cryptographically random and single-use;
- magic links expire after approximately 10 to 15 minutes;
- login sessions last approximately 30 days;
- public password registration is limited to new, non-reserved addresses;
- administrator and imported invitation addresses are protected from public
  account claiming;
- unconfirmed public accounts cannot accept invitation-only access or gain
  administrator privileges;
- authentication responses do not reveal whether an email is registered;
- login requests are rate-limited;
- magic-link tokens and complete login URLs are never logged;
- account linking is allowed only through provider-verified email addresses;
- an internal user UUID, not an email address, owns submissions; and
- authorization is repeated in every protected server action and route.

Postmark delivery webhooks should record delivery failures and bounces so an
administrator can help participants who cannot receive a login link.

## Registration, enrolment, and roles

Authentication proves identity. Enrolment controls assessment access.

An assessment round has one of two registration modes:

- `open`: any verified user may self-enrol while registration is open;
- `invite`: the verified email must match an imported invitation or be
  approved by an administrator.

Invitation imports use a simple format:

```csv
email,name,round,role
participant@example.com,Jane Smith,2026-round-1,participant
```

Roles:

- `participant`: assigned datasets, own submissions, own results, and
  released feedback;
- `reviewer`: flagged submissions, expected answers, and review controls;
- `administrator`: users, rounds, releases, answer policies, reviewers, and
  certificate management.

Permissions are enforced in the data-access layer and on each mutation, not
only in page layouts.

## Practice and challenge availability

Practice releases:

- remain permanently available;
- may use public R2 objects;
- permit repeated attempts according to configuration;
- return immediate feedback; and
- reveal detailed practice answers after submission.

Challenge releases:

- define `registration_opens_at`, `opens_at`, `closes_at`, and
  `answers_release_at` timestamps;
- store participant assets in private R2;
- issue short-lived signed download links only to eligible users;
- reject late submissions using server time;
- support an optional explicitly configured grace period;
- preserve already-submitted results after closing; and
- reveal answers only according to the round policy.

Timestamps are stored as ISO-8601 UTC values and displayed in the
participant's local timezone with the timezone stated explicitly.

## Dataset publishing

The publisher consumes the completed release contract produced by
`genomepuzzle`.

The replacement publisher can be validated without R2 credentials:

```bash
python3 scripts/publish_release.py \
  --release-dir ../genomepuzzle/generated/example-release \
  --public-url https://data.example.org
```

This is a dry run unless `--apply` is supplied. Applying an upload additionally
requires the existing R2 environment file:

```bash
python3 scripts/publish_release.py \
  --release-dir ../genomepuzzle/generated/example-release \
  --dotenv .r3_config.env \
  --apply
```

It must:

- publish one selected dataset at a time;
- offer a dry-run mode;
- validate schemas and checksums before upload;
- use release- and exercise-namespaced R2 keys;
- place public and private artifacts in separate locations;
- never publish private answers in browser-accessible JSON;
- make deletion opt-in and prefix-scoped;
- compare remote and local checksums;
- create download helpers from the manifest; and
- update website metadata only after every upload succeeds.

The publisher must not derive filenames from the answer sheet or reconstruct
public sample names. The existing broad bucket-deletion behaviour in
`scripts/update_dataset.py` is a release-blocking issue and must be removed
before the next production publication.

Example storage layout:

```text
public-data/
  releases/2026-round-1/assembly/practice/...

private-assessment/
  releases/2026-round-1/assembly/challenge/inputs/...
  releases/2026-round-1/assembly/challenge/answers/...
  submissions/...
  certificates/...
```

## Core data model

The initial D1 schema contains:

```text
users
auth_accounts
auth_sessions
invitations
assessment_rounds
enrolments
dataset_releases
submission_attempts
submission_files
automatic_scores
review_requests
manual_reviews
certificates
audit_events
```

Important relationships:

- a submission belongs to one user, enrolment, and dataset release;
- a score records the scorer and answer-key versions;
- a review references the immutable automatic score;
- a certificate references a final result or set of final module results; and
- audit events record all administrative and review mutations.

Original uploaded files are stored in private R2. D1 stores metadata,
normalised answers, score details, and R2 object keys.

## Submission lifecycle

```text
DRAFT -> SUBMITTED -> AUTO_SCORED -> FINAL
                          |
                          +-> REVIEW_REQUESTED -> REVIEWED -> FINAL
```

Version one accepts small result artifacts:

- CSV;
- TSV where explicitly allowed;
- Newick;
- Microreact project files; and
- short supporting comments.

Version one does not accept full assembled genomes and does not run
participant bioinformatics pipelines on the server.

Submission processing:

1. Confirm the user, enrolment, release window, and attempt allowance.
2. Validate file count, extension, size, and required columns.
3. Calculate a checksum and store the original in private R2.
4. Parse and normalise participant answers.
5. Score against the versioned private answer key.
6. Store the immutable automatic result.
7. Create a review item when a rule or participant requests it.
8. Show feedback permitted by the round's answer-release policy.

## Automatic scoring

### Genotyping

Compare normalised:

- sample ID;
- sequence type;
- species;
- K locus and capsule type;
- `wzi`;
- O locus and O type; and
- carbapenemase gene sets.

Scoring must support explicit accepted alternatives and normalise equivalent
empty, missing, and multi-value representations.

### Short-read assembly

Score:

- sample completeness;
- taxonomic classification;
- overall QC decision; and
- diagnosed troublesome condition.

Assembler choice and free-text notes are initially informational.

### Hybrid assembly

Score:

- sample completeness;
- taxonomic classification;
- overall QC decision;
- affected sequencing modality; and
- interpretation of cross-modality evidence.

Assembler and polishing details are retained for review but need not be
strictly scored in the first release.

### Outbreak and phylogeny

Score:

- expected sample membership;
- QC exclusions;
- cluster co-membership independently of arbitrary cluster labels;
- required metadata completion; and
- basic Newick sample and syntax validation.

Detailed tree topology and Microreact presentation can be flagged for manual
review.

Automatic review flags include:

- malformed submissions;
- missing, duplicate, or unknown sample IDs;
- ambiguous answers;
- inconsistent QC and diagnosis;
- unusually low or internally inconsistent results; and
- participant-requested review.

## Manual review

The reviewer view shows:

- participant identity and assessment round;
- original uploaded file;
- submitted and expected values;
- automatic comparison;
- automatic score and scorer version;
- participant review request; and
- previous review events.

A reviewer may confirm, adjust, or overrule a result. An adjustment requires a
reason.

The automatic result is immutable. A manual decision creates a separate final
result and audit event containing reviewer, timestamp, reason, and answer-key
version.

## Answer-release policy

Each round configures one policy:

- practice: detailed feedback immediately after submission;
- challenge: provisional status immediately and answers after the deadline;
- formal assessment: final status only after review;
- limited attempts: detailed answers only after the final permitted attempt.

Correcting an answer key creates a new version. Administrators may explicitly
re-score affected submissions while retaining the original result history.

## Certificates and QR verification

The initial formal credential is one certificate issued after the participant
passes all required challenge modules:

> GHRU Genomic Analysis Proficiency Certificate

The certificate contains:

- participant-confirmed certificate name;
- certificate title;
- assessment round;
- completed modules;
- issue date;
- optional expiry date;
- human-readable credential ID; and
- QR code linking to a public verification page.

Example:

```text
https://ghrupuzzles.example/verify/J7kQ2x9mV4pR8...
```

The URL token is cryptographically random and non-enumerable. The public
verification record displays:

- valid, reissued, expired, or revoked status;
- certificate name according to participant privacy preference;
- qualification and modules;
- assessment round;
- issue and optional expiry dates; and
- credential ID.

Certificate lifecycle:

```text
PASSED
  -> AWAITING_REVIEW
  -> FINAL
  -> ISSUED
       +-> REISSUED
       +-> REVOKED
```

Certificates are issued only from final results. A manual override may create
or prevent issuance. Reissue and revocation retain their complete audit
history.

PDF generation should use a repository-managed PDF template and a
Worker-compatible PDF/QR library. The completed PDF is hashed, stored in
private R2, and made available through the participant dashboard. The
verification page is public so a third party scanning the QR code does not
need an account.

Before issuance, the participant confirms the printed name and whether the
full name may appear on the public verification page. Module badges are a
later enhancement, not a first-release requirement.

## Security and privacy

- Store only the personal information needed to administer assessments.
- Do not store clinical or patient data in the assessment portal.
- Keep answer keys, challenge assets, submissions, and certificates in
  private storage.
- Use short-lived signed URLs for private downloads.
- Validate authorization on every server-side read and mutation.
- Rate-limit login, upload, submission, and verification endpoints.
- Apply strict upload size and content validation.
- Never expose Postmark, OAuth, R2, or signing secrets to client code.
- Use generic authentication and invitation responses to prevent account
  enumeration.
- Record security-relevant and administrative actions in the audit table.
- Define retention and account-deletion policies before the first live round.

## Backup and operations

At minimum, export D1:

- before opening a challenge;
- at the submission deadline; and
- after all manual reviews are complete.

Store exports in approved institutional storage or a separate private R2
backup prefix. Test restoration before the first live challenge.

Routine administration should be limited to:

- importing invitations where required;
- opening and closing rounds;
- publishing releases;
- reviewing flagged submissions;
- handling Postmark delivery failures;
- issuing or revoking certificates; and
- monitoring Workers, D1, R2, and Postmark usage.

## Implementation sequence

1. Add the shared release-manifest types and contract tests.
2. Remove public answer exposure and unsafe broad R2 deletion.
3. Replace filename inference with manifest-driven publishing.
4. Add Cloudflare Workers/OpenNext deployment configuration.
5. Add D1 migrations and the core data-access layer.
6. Add Better Auth with Google and Microsoft OAuth.
7. Add Postmark-backed email magic links and delivery webhooks.
8. Add registration, invitations, enrolments, and roles.
9. Add practice and timed-challenge access controls.
10. Add small-file submissions and immutable submission storage.
11. Add the four exercise scorers and review flags.
12. Add reviewer decisions and audit history.
13. Add answer-release controls.
14. Add certificate PDF generation and public QR verification.
15. Run an invited practice pilot before opening a challenge.

## Completion criteria

The assessment platform is ready when:

- any verified user can access and submit practice exercises;
- challenge downloads and submissions obey their server-enforced window;
- Google, Microsoft, and any-email magic-link login all work;
- private assets cannot be retrieved without authorization;
- every submission records its release, answer-key, and scorer versions;
- provisional scoring is reproducible;
- participants can request review;
- reviewer overrides retain the automatic result and a reasoned audit trail;
- answer visibility follows the configured round policy;
- passing final results can mint a PDF certificate;
- certificate QR codes resolve to non-enumerable public verification pages;
- certificates can be reissued and revoked; and
- a complete assessment round can be administered without collecting results
  through email.

## Explicit non-goals for the first release

- Running arbitrary participant bioinformatics workflows on the web server
- Accepting multi-gigabyte participant assemblies
- Live collaborative analysis
- Blockchain-backed credentials
- Four separate formal module certificates
- Building a custom email-delivery service
