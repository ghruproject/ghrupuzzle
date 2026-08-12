# Deployment and assessment operations

The application is configured for Next.js 15.5, Better Auth, OpenNext,
Cloudflare Workers, D1, two R2 data buckets, and an R2 incremental build cache.
Use Node.js 22.12 or newer for local and CI builds.

Production runs as the `ghrupuzzle` Cloudflare Worker in the
`nabil@happykhan.com` account. The D1 database and three R2 buckets named below
are provisioned and bound in `wrangler.jsonc`. Vercel proxies the Worker at the
canonical public URL, `https://ghrupuzzle.vercel.app`.

## Provision Cloudflare resources

Authenticate Wrangler, then create the resources once:

```bash
npx wrangler d1 create ghrupuzzle
npx wrangler r2 bucket create ghrupuzzle-practice
npx wrangler r2 bucket create ghrupuzzle-private
npx wrangler r2 bucket create ghrupuzzle-opennext-cache
```

Copy the returned D1 database ID into `wrangler.jsonc`, then apply migrations:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

The migrations create Better Auth tables, database-backed rate limits,
rounds, releases, invitations, enrolments, submissions, scores, reviews,
certificates, challenge-notification registrations, email-delivery events,
roles, and audit events.

## Configure secrets

Generate a Better Auth secret with at least 32 random bytes. Store production
values through `wrangler secret put`, never in `wrangler.jsonc`:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put POSTMARK_SERVER_TOKEN
npx wrangler secret put POSTMARK_WEBHOOK_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put MICROSOFT_CLIENT_ID
npx wrangler secret put MICROSOFT_CLIENT_SECRET
```

`BETTER_AUTH_URL` and `POSTMARK_FROM_EMAIL` are non-secret production
variables in `wrangler.jsonc`. For local development copy `.dev.vars.example`
to `.dev.vars`; this file is ignored by Git. Configure Postmark’s delivery and
bounce webhooks to:

```text
https://YOUR-DOMAIN/api/webhooks/postmark
Authorization: Bearer POSTMARK_WEBHOOK_SECRET
```

Postmark link and open tracking are disabled for sign-in messages.

### Google and Microsoft sign-in

Social sign-in buttons appear only when the corresponding client ID and secret
are configured. Register these exact redirect URLs with the providers:

```text
https://ghrupuzzle.vercel.app/api/auth/callback/google
https://ghrupuzzle.vercel.app/api/auth/callback/microsoft
```

For Microsoft Entra ID, set `MICROSOFT_TENANT_ID` as a non-secret Worker
variable when sign-in should be restricted to one tenant. If it is omitted,
the application uses `common`, allowing personal Microsoft accounts and
accounts from any Entra tenant supported by the app registration.

### Account access and password recovery

New public participants register themselves at `/register` using a name, email
address and password. Registration creates a session immediately and does not
send a confirmation email. These accounts can use practice exercises and
open-registration challenges. Because their email ownership has not been
proved, they cannot accept invitation-only access, receive automatic opening
reminders or gain administrator privileges until the account is confirmed.

Participants who forget their password first use `/forgot-password`. Better Auth
creates a single-use reset token that expires after one hour and Postmark sends
the branded reset link. The request response never reveals whether an address is
registered. A successful reset revokes existing sessions and confirms control of
the account email address.

If the email does not arrive, the participant contacts
`nabil.alikhan@cgps.group` for an administrator-issued one-time recovery code.
Existing magic-link accounts and imported invitees use the same code workflow.
The administrator creates the code from the participant table in `/admin` and
shares the displayed setup page, email address and code through a private
channel. The participant uses `/set-password` to create or replace their
password. Using a setup code also marks the account as administrator-confirmed
for restricted access.

Invitation imports reserve each email address by creating a passwordless
participant record. This prevents somebody from registering the invited
address publicly before the intended participant receives their setup code.
Public password registration is also blocked for administrator-reserved email
addresses. An existing unconfirmed public account must be confirmed before it
can be granted administrator access.

Setup codes expire after 24 hours, are invalidated when a replacement is
created, and are stored in D1 only as SHA-256 hashes. Using a code invalidates
the participant's other setup codes and existing sessions. Passwords are
hashed by Better Auth and are never available to administrators. The same
workflow provides a fallback when email delivery fails. Open
challenge enrolment by an unconfirmed account does not create an automatic
email reminder subscription.

## Challenge opening reminders

The public challenge page stores explicit one-off reminder registrations in
D1. The Worker has a daily `08:00 UTC` Cron Trigger. While the challenge is
open, the scheduled handler sends Postmark reminders to registrations that do
not yet have a recorded delivery attempt and records the returned Postmark
message ID. Outside the challenge window it exits without sending.

Published rounds are loaded from D1. Create a new round with a unique slug for
each future challenge so previous banner dismissals and registrations do not
carry forward. The current open round is featured automatically; otherwise the
next upcoming round is shown.

## Bootstrap the first administrator

Sign in once through the application. Look up the new internal user ID, then
grant the first role directly:

```bash
npx wrangler d1 execute ghrupuzzle --remote \
  --command "SELECT id,email FROM user"

npx wrangler d1 execute ghrupuzzle --remote \
  --command "INSERT INTO user_role(user_id,role) VALUES('USER_ID','administrator')"
```

Subsequent role changes should be made through an audited administrative
workflow.

## Publish and register a release

The publisher is always a dry run unless `--apply` is supplied. The main
credentials must point to the practice bucket for practice data and the
private bucket for challenge data. Private credentials must always point to
the private bucket:

```bash
python3 scripts/publish_release.py \
  --release-dir ../genomepuzzle/generated/2026-pilot/typing-practice \
  --dotenv .practice-r2.env \
  --private-dotenv .private-r2.env \
  --public-url https://data.example.org
```

Review every planned key, then repeat with `--apply`. The manifest is uploaded
last. Existing differing objects are refused unless `--force` is explicit,
and there is no deletion path.

Register the uploaded release through `POST /api/admin/releases`. Challenge
releases require a round ID; practice releases must omit it. Registration
loads `release.json`, `COMPLETE.json`, the public manifest, submission schema
and sample sheet from R2. It refuses missing artifacts or metadata that differ
from the request, then derives the exact private answer and scoring-policy
keys used at submission time.

Only GenomePuzzle contract v2 releases are accepted. Exercise instructions,
participant columns, scorer configuration and pass threshold come from the
release bundle; do not reproduce them in deployment configuration.

Administrators open **Release details** beneath a release name in the Dataset
releases table. The page lists the exact registered private R2 prefix, renders
the scoring policy, and provides an explicit **Reveal answers** control. The
answer key is not included in the initial page response. Private file links use
opaque hashes that the server resolves against a fresh listing of the release's
registered `/private/` prefix, so browsers never provide R2 paths.

Every details-page view, answer reveal/export, and private-file view/download
is audited. File responses use `Cache-Control: private, no-store`, a restrictive
content security policy and safe server-selected content types. Private objects
are never exposed through presigned URLs.

## Run a challenge

1. Create a UTC-timestamped round with `POST /api/admin/rounds`.
2. For invite-only rounds, import up to 1,000 addresses per request through
   `POST /api/admin/invitations`.
3. Register all four challenge releases.
4. Confirm an enrolled test account cannot download before `opens_at`.
5. Confirm downloads work after opening and submissions fail after
   `closes_at + grace_seconds`.
6. Work the `/review` queue and record a reason for every override.
7. After closing, call `POST /api/rounds/{id}/finalize`. Scores with open
   reviews remain provisional.
8. Issue certificates only when all four exercises have final passing scores.

Practice releases are available to every authenticated account and return
detailed comparison feedback. Challenge responses return totals only; private
answer details remain in D1/private R2.

## Certificate operations

`POST /api/certificates/issue` creates a PDF in private R2 and a random public
verification code. Pass `supersedesId` to reissue; the previous certificate
is retained and marked revoked as “Reissued”.

`POST /api/certificates/{id}/revoke` requires an administrator and a reason.
The QR target `/verify/{publicCode}` is deliberately public and shows current
valid/revoked state without exposing an email address.

## Verification before deployment

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run cf:build
python3 -m unittest discover -s tests -v
```

The current npm audit reports advisories inherited from the latest supported
Next.js/Better Auth dependency line for which npm does not offer a
non-breaking fixed version. Re-run the audit immediately before deployment
and upgrade when patched releases are available. The unused Fomantic UI
dependency and its vulnerable build-time dependency tree have been removed.
